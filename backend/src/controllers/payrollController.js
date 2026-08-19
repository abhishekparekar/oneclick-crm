const Payroll = require("../models/Payroll");
const Employee = require("../models/Employee");
const PayrollSettings = require("../models/PayrollSettings");
const { calculateEmployeePayroll } = require("../services/payrollCalculationService");
const { getCompanyAttendanceSummary } = require("../services/payrollAttendanceService");
const { generatePayslipHTML, generatePayslipPDF } = require("../services/pdfGeneratorService");
const Company = require("../models/Company");

// ─────────────────────────────────────────────
// PREVIEW PAYROLL
// ─────────────────────────────────────────────
const previewPayroll = async (req, res, next) => {
  try {
    const { month, year, employeeIds, overrides = {} } = req.body;
    if (!month || !year || !employeeIds || !employeeIds.length) {
      return res.status(400).json({ success: false, message: "Month, year, and employeeIds are required" });
    }

    const previews = [];
    for (const empId of employeeIds) {
      try {
        const empOverrides = overrides[empId] || {};
        const result = await calculateEmployeePayroll(empId, month, year, req.companyId, empOverrides);
        previews.push({ success: true, employeeId: empId, ...result });
      } catch (err) {
        let employeeSnapshot = null;
        try {
          const empBasic = await Employee.findOne({ _id: empId, companyId: req.companyId })
            .populate("departmentId", "name").populate("designationId", "name").lean();
          if (empBasic) {
            employeeSnapshot = {
              employeeCode: empBasic.employeeCode,
              employeeName: `${empBasic.firstName} ${empBasic.lastName}`,
              department: empBasic.departmentId?.name || "N/A",
              designation: empBasic.designationId?.name || "N/A",
            };
          }
        } catch (_) {}
        previews.push({ success: false, employeeId: empId, employeeSnapshot, message: err.message });
      }
    }
    res.json({ success: true, data: previews });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// GENERATE FINAL PAYROLL
// ─────────────────────────────────────────────
const generatePayroll = async (req, res, next) => {
  try {
    const { month, year, employeeIds, overrides = {} } = req.body;
    if (!month || !year || !employeeIds || !employeeIds.length) {
      return res.status(400).json({ success: false, message: "Month, year, and employeeIds are required" });
    }

    let generatedCount = 0;
    const errors = [];

    for (const empId of employeeIds) {
      try {
        const existing = await Payroll.findOne({ employeeId: empId, month: String(month), year, companyId: req.companyId });
        if (existing && existing.status === "paid") {
          errors.push({ employeeId: empId, message: "Payroll already paid. Use recalculate to override." });
          continue;
        }

        const empOverrides = overrides[empId] || {};
        const result = await calculateEmployeePayroll(empId, month, year, req.companyId, empOverrides);

        const payload = {
          companyId: req.companyId,
          employeeId: empId,
          employeeSnapshot: result.employeeSnapshot,
          month: String(month),
          year: Number(year),
          payrollPeriod: {
            fromDate: new Date(year, month - 1, 1),
            toDate: new Date(year, month, 0),
          },
          attendanceSummary: result.attendanceSummary,
          earnings: result.earnings,
          deductions: result.deductions,
          grossSalary: result.earnings.grossEarnings,
          netSalary: result.netSalary,
          amountInWords: result.amountInWords,
          salaryDivisor: result.salaryDivisor,
          perDaySalary: result.perDaySalary,
          status: "generated",
          generatedBy: req.user._id,
          generatedAt: new Date(),
        };

        if (existing) {
          await Payroll.findByIdAndUpdate(existing._id, payload);
        } else {
          await Payroll.create(payload);
        }
        generatedCount++;
      } catch (err) {
        errors.push({ employeeId: empId, message: err.message });
      }
    }

    try {
      const { syncSalaryAdvancesWithPayrolls } = require("./salaryAdvanceController");
      await syncSalaryAdvancesWithPayrolls(req.companyId);
    } catch (syncErr) {
      console.error("[Generate Payroll Advance Sync Error]:", syncErr.message);
    }

    res.json({ success: true, message: `Successfully generated ${generatedCount} payroll records.`, errors });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// RECALCULATE (Admin can override even paid payrolls)
// ─────────────────────────────────────────────
const recalculatePayroll = async (req, res, next) => {
  try {
    const { reason, overrides = {} } = req.body;
    if (!reason) {
      return res.status(400).json({ success: false, message: "Recalculation reason is required" });
    }

    const payroll = await Payroll.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!payroll) return res.status(404).json({ success: false, message: "Payroll not found" });

    const empOverrides = overrides[payroll.employeeId] || {};
    const result = await calculateEmployeePayroll(
      payroll.employeeId, payroll.month, payroll.year, req.companyId, empOverrides
    );

    const updated = await Payroll.findByIdAndUpdate(
      payroll._id,
      {
        employeeSnapshot: result.employeeSnapshot,
        attendanceSummary: result.attendanceSummary,
        earnings: result.earnings,
        deductions: result.deductions,
        grossSalary: result.earnings.grossEarnings,
        netSalary: result.netSalary,
        amountInWords: result.amountInWords,
        salaryDivisor: result.salaryDivisor,
        perDaySalary: result.perDaySalary,
        status: "generated",
        recalculatedAt: new Date(),
        recalculatedBy: req.user._id,
        recalculationReason: reason,
      },
      { new: true }
    );

    try {
      const { syncSalaryAdvancesWithPayrolls } = require("./salaryAdvanceController");
      await syncSalaryAdvancesWithPayrolls(req.companyId);
    } catch (syncErr) {
      console.error("[Recalculate Advance Sync Error]:", syncErr.message);
    }

    res.json({ success: true, message: "Payroll recalculated successfully", data: updated });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// GET ALL PAYROLLS FOR A MONTH (Admin/HR)
// ─────────────────────────────────────────────
const getCompanyPayrolls = async (req, res, next) => {
  try {
    const { month, year, status } = req.query;
    let query = { companyId: req.companyId };
    if (month) query.month = String(month);
    if (year) query.year = Number(year);
    if (status) query.status = status;

    const payrolls = await Payroll.find(query)
      .populate({
        path: "employeeId",
        select: "firstName lastName employeeCode photo documents departmentId branchId userId",
        populate: [
          { path: "departmentId", select: "name" },
          { path: "branchId", select: "branchName" },
          { path: "userId", select: "role profileImage" }
        ]
      })
      .sort({ createdAt: -1 });

    const normalizedPayrolls = payrolls.map((p) => {
      const doc = p.toObject ? p.toObject() : { ...p };
      const resolvedPhoto =
        doc.employeeSnapshot?.photo ||
        doc.employeeId?.photo ||
        doc.employeeId?.documents?.photo ||
        doc.employeeId?.userId?.profileImage ||
        "";
      if (!doc.employeeSnapshot) doc.employeeSnapshot = {};
      doc.employeeSnapshot.photo = resolvedPhoto;
      if (doc.employeeId) {
        doc.employeeId.photo = resolvedPhoto;
      }
      return doc;
    });

    res.json({ success: true, data: normalizedPayrolls });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// GET EMPLOYEE'S OWN PAYROLLS
// ─────────────────────────────────────────────
const getEmployeePayrolls = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const employeeId = req.params.employeeId || req.user.employeeId;
    let query = { companyId: req.companyId, employeeId };
    if (month) query.month = String(month);
    if (year) query.year = Number(year);

    const payrolls = await Payroll.find(query)
      .populate({
        path: "employeeId",
        select: "firstName lastName employeeCode photo documents departmentId branchId userId",
        populate: [
          { path: "departmentId", select: "name" },
          { path: "userId", select: "role profileImage" }
        ]
      })
      .sort({ year: -1, month: -1 });

    const normalizedPayrolls = payrolls.map((p) => {
      const doc = p.toObject ? p.toObject() : { ...p };
      const resolvedPhoto =
        doc.employeeSnapshot?.photo ||
        doc.employeeId?.photo ||
        doc.employeeId?.documents?.photo ||
        doc.employeeId?.userId?.profileImage ||
        "";
      if (!doc.employeeSnapshot) doc.employeeSnapshot = {};
      doc.employeeSnapshot.photo = resolvedPhoto;
      if (doc.employeeId) {
        doc.employeeId.photo = resolvedPhoto;
      }
      return doc;
    });

    res.json({ success: true, data: normalizedPayrolls });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// ATTENDANCE SUMMARY (all employees, one month)
// ─────────────────────────────────────────────
const getAttendanceSummary = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({ success: false, message: "month and year are required" });
    }
    const summaries = await getCompanyAttendanceSummary(month, year, req.companyId);
    res.json({ success: true, data: summaries, month, year });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// PAYSLIP PREVIEW (HTML)
// ─────────────────────────────────────────────
const getPayslipDetails = async (req, res, next) => {
  try {
    const payroll = await Payroll.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!payroll) return res.status(404).json({ success: false, message: "Payroll not found" });
    if (req.user.role === "Employee" || req.user.role === "Manager") {
      if (payroll.employeeId.toString() !== req.user.employeeId?.toString()) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
    }
    res.json({ success: true, payslip: payroll });
  } catch (err) {
    next(err);
  }
};

const getPayslipPreview = async (req, res, next) => {
  try {
    const payroll = await Payroll.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!payroll) return res.status(404).json({ success: false, message: "Payroll not found" });
    const company = await Company.findById(req.companyId);
    const settings = await PayrollSettings.findOne({ companyId: req.companyId });
    const html = generatePayslipHTML(payroll, company, settings || {});
    res.send(html);
  } catch (err) {
    next(err);
  }
};

const downloadPayslipPDF = async (req, res, next) => {
  try {
    const payroll = await Payroll.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!payroll) return res.status(404).json({ success: false, message: "Payroll not found" });
    const company = await Company.findById(req.companyId);
    const settings = await PayrollSettings.findOne({ companyId: req.companyId });
    const html = generatePayslipHTML(payroll, company, settings || {});
    const pdfBuffer = await generatePayslipPDF(html);
    const code = payroll.employeeSnapshot?.employeeCode || "EMP";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Payslip_${code}_${payroll.month}_${payroll.year}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// SEND PAYSLIP (To individual employee)
// ─────────────────────────────────────────────
const sendPayslip = async (req, res, next) => {
  try {
    const payroll = await Payroll.findOneAndUpdate(
      { _id: req.params.id, companyId: req.companyId },
      { sentToEmployee: true, sentAt: new Date() },
      { new: true }
    );
    if (!payroll) return res.status(404).json({ success: false, message: "Payroll not found" });

    try {
      const { sendNotificationToEmployees } = require("../utils/notificationHelper");
      await sendNotificationToEmployees(
        req.companyId,
        [payroll.employeeId],
        "📄 Payslip Released",
        `Your payslip for ${payroll.month}/${payroll.year} has been released. You can now view and download it.`,
        "payroll",
        { payrollId: payroll._id.toString() }
      );
    } catch (notifErr) {
      console.error("[Payroll Send Notification Error]:", notifErr.message);
    }

    res.json({ success: true, message: "Payslip sent to employee successfully", data: payroll });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// BULK SEND PAYSLIPS (To all employees for a month)
// ─────────────────────────────────────────────
const bulkSendPayslips = async (req, res, next) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) {
      return res.status(400).json({ success: false, message: "month and year are required" });
    }

    const payrolls = await Payroll.find({
      companyId: req.companyId,
      month: String(month),
      year: Number(year),
      sentToEmployee: { $ne: true }
    });

    if (payrolls.length === 0) {
      return res.json({ success: true, message: "All payslips for this period are already sent." });
    }

    const employeeIds = payrolls.map(p => p.employeeId);

    await Payroll.updateMany(
      {
        companyId: req.companyId,
        month: String(month),
        year: Number(year)
      },
      { sentToEmployee: true, sentAt: new Date() }
    );

    try {
      const { sendNotificationToEmployees } = require("../utils/notificationHelper");
      await sendNotificationToEmployees(
        req.companyId,
        employeeIds,
        "📄 Payslip Released",
        `Your payslip for ${month}/${year} has been released. You can now view and download it.`,
        "payroll",
        {}
      );
    } catch (notifErr) {
      console.error("[Payroll Bulk Send Notification Error]:", notifErr.message);
    }

    res.json({ success: true, message: `Successfully dispatched ${payrolls.length} payslips to staff.` });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// MARK PAID
// ─────────────────────────────────────────────
const markPayrollPaid = async (req, res, next) => {
  try {
    const payroll = await Payroll.findOneAndUpdate(
      { _id: req.params.id, companyId: req.companyId },
      { status: "paid", paidBy: req.user._id, paidAt: new Date() },
      { new: true }
    );
    if (!payroll) return res.status(404).json({ success: false, message: "Payroll not found" });

    // Process advance deductions if any
    try {
      const SalaryAdvance = require("../models/SalaryAdvance");
      const advDetails = payroll.deductions?.advanceRecoveryDetails || [];
      if (advDetails.length > 0) {
        for (const item of advDetails) {
          if (item.advanceId && item.amount > 0) {
            const adv = await SalaryAdvance.findOne({ _id: item.advanceId, companyId: req.companyId });
            if (adv) {
              const alreadyRecorded = adv.recoveryHistory.some(
                (h) => h.payrollId?.toString() === payroll._id.toString()
              );
              if (!alreadyRecorded) {
                adv.totalRecovered = Math.round((adv.totalRecovered + item.amount) * 100) / 100;
                adv.remainingBalance = Math.max(0, Math.round((adv.remainingBalance - item.amount) * 100) / 100);
                if (adv.remainingBalance <= 0) {
                  adv.status = "completed";
                }
                adv.recoveryHistory.push({
                  payrollId: payroll._id,
                  month: payroll.month,
                  year: payroll.year,
                  amount: item.amount,
                  deductedAt: new Date(),
                  recoveryType: "payroll_deduction",
                  notes: `Auto-deducted in ${payroll.month}/${payroll.year} payroll`,
                  recordedBy: req.user._id,
                });
                await adv.save();
              }
            }
          }
        }
      } else if ((payroll.deductions?.advanceDeduction || 0) > 0) {
        const activeAdv = await SalaryAdvance.findOne({
          employeeId: payroll.employeeId,
          companyId: req.companyId,
          status: "active",
          remainingBalance: { $gt: 0 },
        }).sort({ createdAt: 1 });
        if (activeAdv) {
          const deduction = Math.min(payroll.deductions.advanceDeduction, activeAdv.remainingBalance);
          activeAdv.totalRecovered = Math.round((activeAdv.totalRecovered + deduction) * 100) / 100;
          activeAdv.remainingBalance = Math.max(0, Math.round((activeAdv.remainingBalance - deduction) * 100) / 100);
          if (activeAdv.remainingBalance <= 0) activeAdv.status = "completed";
          activeAdv.recoveryHistory.push({
            payrollId: payroll._id,
            month: payroll.month,
            year: payroll.year,
            amount: deduction,
            deductedAt: new Date(),
            recoveryType: "payroll_deduction",
            notes: `Auto-deducted in ${payroll.month}/${payroll.year} payroll`,
            recordedBy: req.user._id,
          });
          await activeAdv.save();
        }
      }
    } catch (advRecErr) {
      console.error("[Advance Deduction Recovery Error]:", advRecErr);
    }

    res.json({ success: true, message: "Payroll marked as paid", data: payroll });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  previewPayroll,
  generatePayroll,
  recalculatePayroll,
  getCompanyPayrolls,
  getEmployeePayrolls,
  getAttendanceSummary,
  getPayslipDetails,
  getPayslipPreview,
  downloadPayslipPDF,
  markPayrollPaid,
  sendPayslip,
  bulkSendPayslips,
};
