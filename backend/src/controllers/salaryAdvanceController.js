const SalaryAdvance = require("../models/SalaryAdvance");
const Employee = require("../models/Employee");
const User = require("../models/User");
const { sendNotificationToEmployees } = require("../utils/notificationHelper");

// ─────────────────────────────────────────────────────────────────────────────
// SYNC SALARY ADVANCES WITH PAYROLL DEDUCTIONS
// ─────────────────────────────────────────────────────────────────────────────
const syncSalaryAdvancesWithPayrolls = async (companyId, employeeId = null) => {
  try {
    const Payroll = require("../models/Payroll");
    const advQuery = { companyId };
    if (employeeId) advQuery.employeeId = employeeId;

    const advances = await SalaryAdvance.find(advQuery);
    if (!advances || !advances.length) return;

    for (const adv of advances) {
      // Find all payrolls for this employee that recorded an advance deduction
      const payrolls = await Payroll.find({
        companyId,
        employeeId: adv.employeeId,
        $or: [
          { "deductions.advanceDeduction": { $gt: 0 } },
          { "deductions.advanceRecoveryDetails": { $exists: true, $ne: [] } },
        ],
      }).sort({ year: 1, month: 1 });

      let directTotal = 0;
      const directRecoveries = (adv.recoveryHistory || []).filter(
        (h) => h.recoveryType !== "payroll_deduction"
      );
      for (const d of directRecoveries) {
        directTotal += Number(d.amount) || 0;
      }

      let payrollDeductionsTotal = 0;
      const newPayrollRecoveries = [];

      for (const p of payrolls) {
        let dedAmount = 0;
        const matchingDetail = (p.deductions?.advanceRecoveryDetails || []).find(
          (d) => String(d.advanceId) === String(adv._id)
        );

        if (matchingDetail && matchingDetail.amount > 0) {
          dedAmount = matchingDetail.amount;
        } else if ((p.deductions?.advanceDeduction || 0) > 0) {
          dedAmount = p.deductions.advanceDeduction;
        }

        if (dedAmount > 0) {
          payrollDeductionsTotal += dedAmount;
          newPayrollRecoveries.push({
            payrollId: p._id,
            month: p.month,
            year: p.year,
            amount: dedAmount,
            deductedAt: p.generatedAt || p.createdAt,
            recoveryType: "payroll_deduction",
            notes: `Auto-deducted in ${p.month}/${p.year} payroll (${p.status})`,
            recordedBy: p.generatedBy,
          });
        }
      }

      const totalRecovered = Math.round((directTotal + payrollDeductionsTotal) * 100) / 100;
      const remainingBalance = Math.max(0, Math.round((adv.amount - totalRecovered) * 100) / 100);
      const status =
        remainingBalance <= 0
          ? "completed"
          : adv.status === "cancelled"
          ? "cancelled"
          : "active";

      adv.totalRecovered = totalRecovered;
      adv.remainingBalance = remainingBalance;
      adv.status = status;
      adv.recoveryHistory = [...directRecoveries, ...newPayrollRecoveries];

      await adv.save();
    }
  } catch (err) {
    console.error("[SalaryAdvance Sync Error]:", err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL SALARY ADVANCES FOR COMPANY (Admin / HR / Manager)
// ─────────────────────────────────────────────────────────────────────────────
const getCompanySalaryAdvances = async (req, res, next) => {
  try {
    // Auto-sync advances with any generated/paid payroll records first
    await syncSalaryAdvancesWithPayrolls(req.companyId);

    const { employeeId, status, search } = req.query;
    const filter = { companyId: req.companyId };

    if (employeeId) filter.employeeId = employeeId;
    if (status) filter.status = status;

    let advances = await SalaryAdvance.find(filter)
      .populate({
        path: "employeeId",
        select: "firstName lastName employeeCode photo documents departmentId designationId userId",
        populate: [
          { path: "departmentId", select: "name" },
          { path: "designationId", select: "name" },
          { path: "userId", select: "role profileImage" },
        ],
      })
      .populate("approvedBy", "name email")
      .populate("recoveryHistory.recordedBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    // Normalize employee photos
    advances = advances.map((adv) => {
      if (adv.employeeId) {
        adv.employeeId.photo =
          adv.employeeId.photo ||
          adv.employeeId.documents?.photo ||
          adv.employeeId.userId?.profileImage ||
          "";
      }
      return adv;
    });

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      advances = advances.filter((adv) => {
        const name = `${adv.employeeId?.firstName || ""} ${adv.employeeId?.lastName || ""}`.toLowerCase();
        const code = (adv.employeeId?.employeeCode || "").toLowerCase();
        const dept = (adv.employeeId?.departmentId?.name || "").toLowerCase();
        const reason = (adv.reason || "").toLowerCase();
        return name.includes(q) || code.includes(q) || dept.includes(q) || reason.includes(q);
      });
    }

    // Summary statistics
    const totalDisbursed = advances.reduce((s, a) => s + (a.amount || 0), 0);
    const totalRecovered = advances.reduce((s, a) => s + (a.totalRecovered || 0), 0);
    const totalOutstanding = advances.reduce((s, a) => s + (a.remainingBalance || 0), 0);
    const activeCount = advances.filter((a) => a.status === "active").length;

    res.json({
      success: true,
      data: advances,
      count: advances.length,
      metrics: {
        totalDisbursed,
        totalRecovered,
        totalOutstanding,
        activeCount,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE NEW SALARY ADVANCE
// ─────────────────────────────────────────────────────────────────────────────
const createSalaryAdvance = async (req, res, next) => {
  try {
    const {
      employeeId,
      amount,
      reason,
      disbursedDate,
      disbursedMode,
      repaymentType,
      monthlyDeductionAmount,
      percentage,
      notes,
    } = req.body;

    if (!employeeId || !amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: "Employee and a valid advance amount are required." });
    }

    const employee = await Employee.findOne({ _id: employeeId, companyId: req.companyId });
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found in your organization." });
    }

    const numAmount = Number(amount);
    let finalMonthlyDeduction = 0;
    let finalPercentage = 0;

    if (repaymentType === "fixed_monthly_amount") {
      finalMonthlyDeduction = Math.max(1, Number(monthlyDeductionAmount) || Math.min(numAmount, 5000));
    } else if (repaymentType === "percentage_of_salary") {
      finalPercentage = Math.min(100, Math.max(1, Number(percentage) || 15));
    } else if (repaymentType === "full_next_month") {
      finalMonthlyDeduction = numAmount;
    }

    const advance = await SalaryAdvance.create({
      companyId: req.companyId,
      employeeId,
      amount: numAmount,
      reason: reason || "Personal Advance / Emergency",
      disbursedDate: disbursedDate ? new Date(disbursedDate) : new Date(),
      disbursedMode: disbursedMode || "bank_transfer",
      repaymentType: repaymentType || "full_next_month",
      monthlyDeductionAmount: finalMonthlyDeduction,
      percentage: finalPercentage,
      totalRecovered: 0,
      remainingBalance: numAmount,
      status: "active",
      approvedBy: req.user._id,
      notes: notes || "",
      recoveryHistory: [],
    });

    try {
      await sendNotificationToEmployees(
        req.companyId,
        [employeeId],
        "💰 Salary Advance Approved & Disbursed",
        `A salary advance of ₹${numAmount.toLocaleString("en-IN")} has been recorded. Repayment mode: ${
          repaymentType === "percentage_of_salary"
            ? `${finalPercentage}% of monthly salary`
            : repaymentType === "fixed_monthly_amount"
            ? `₹${finalMonthlyDeduction.toLocaleString("en-IN")}/month`
            : "Full next month deduction"
        }.`,
        "payroll",
        { advanceId: advance._id.toString() }
      );
    } catch (notifErr) {
      console.error("[Advance Create Notification Error]:", notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: `Salary advance of ₹${numAmount.toLocaleString("en-IN")} created successfully for ${employee.firstName} ${employee.lastName}.`,
      data: advance,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// RECORD DIRECT REPAYMENT (Cash / UPI / Direct Bank Transfer)
// ─────────────────────────────────────────────────────────────────────────────
const recordDirectRepayment = async (req, res, next) => {
  try {
    const { amount, recoveryType, notes } = req.body;
    const numAmount = Number(amount);

    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ success: false, message: "Valid repayment amount is required." });
    }

    const advance = await SalaryAdvance.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!advance) {
      return res.status(404).json({ success: false, message: "Salary advance record not found." });
    }

    if (advance.status === "completed") {
      return res.status(400).json({ success: false, message: "This advance has already been fully recovered." });
    }

    const actualRecovery = Math.min(numAmount, advance.remainingBalance);
    advance.totalRecovered = Math.round((advance.totalRecovered + actualRecovery) * 100) / 100;
    advance.remainingBalance = Math.max(0, Math.round((advance.remainingBalance - actualRecovery) * 100) / 100);

    if (advance.remainingBalance <= 0) {
      advance.status = "completed";
    }

    advance.recoveryHistory.push({
      amount: actualRecovery,
      deductedAt: new Date(),
      recoveryType: recoveryType || "direct_cash",
      notes: notes || "Direct repayment returned by employee",
      recordedBy: req.user._id,
    });

    await advance.save();

    res.json({
      success: true,
      message: `Successfully recorded repayment of ₹${actualRecovery.toLocaleString("en-IN")}. Outstanding balance: ₹${advance.remainingBalance.toLocaleString("en-IN")}.`,
      data: advance,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE SALARY ADVANCE PLAN
// ─────────────────────────────────────────────────────────────────────────────
const updateSalaryAdvance = async (req, res, next) => {
  try {
    const { repaymentType, monthlyDeductionAmount, percentage, notes, status } = req.body;

    const advance = await SalaryAdvance.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!advance) {
      return res.status(404).json({ success: false, message: "Salary advance record not found." });
    }

    if (repaymentType) advance.repaymentType = repaymentType;
    if (monthlyDeductionAmount !== undefined) advance.monthlyDeductionAmount = Math.max(0, Number(monthlyDeductionAmount));
    if (percentage !== undefined) advance.percentage = Math.min(100, Math.max(0, Number(percentage)));
    if (notes !== undefined) advance.notes = notes;
    if (status && ["active", "completed", "cancelled"].includes(status)) advance.status = status;

    await advance.save();

    res.json({
      success: true,
      message: "Salary advance updated successfully.",
      data: advance,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE / CANCEL ADVANCE
// ─────────────────────────────────────────────────────────────────────────────
const deleteSalaryAdvance = async (req, res, next) => {
  try {
    const advance = await SalaryAdvance.findOneAndDelete({
      _id: req.params.id,
      companyId: req.companyId,
      totalRecovered: 0, // Only allow hard delete if 0 has been recovered
    });

    if (!advance) {
      // If already partially recovered, mark as cancelled instead
      const cancelled = await SalaryAdvance.findOneAndUpdate(
        { _id: req.params.id, companyId: req.companyId },
        { status: "cancelled" },
        { new: true }
      );
      if (!cancelled) return res.status(404).json({ success: false, message: "Salary advance record not found." });
      return res.json({ success: true, message: "Salary advance cancelled.", data: cancelled });
    }

    res.json({ success: true, message: "Salary advance deleted successfully." });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET EMPLOYEE'S OWN SALARY ADVANCES (Employee Portal View)
// ─────────────────────────────────────────────────────────────────────────────
const getEmployeeSalaryAdvances = async (req, res, next) => {
  try {
    const employeeId = req.params.employeeId || req.user.employeeId;
    if (!employeeId) {
      return res.status(400).json({ success: false, message: "Employee ID is required." });
    }

    await syncSalaryAdvancesWithPayrolls(req.companyId, employeeId);

    const advances = await SalaryAdvance.find({
      employeeId,
      companyId: req.companyId,
    })
      .populate("approvedBy", "name")
      .sort({ createdAt: -1 })
      .lean();

    const totalDisbursed = advances.reduce((s, a) => s + (a.amount || 0), 0);
    const totalRecovered = advances.reduce((s, a) => s + (a.totalRecovered || 0), 0);
    const totalOutstanding = advances.reduce((s, a) => s + (a.remainingBalance || 0), 0);
    const activeAdvance = advances.find((a) => a.status === "active" && a.remainingBalance > 0) || null;

    res.json({
      success: true,
      data: advances,
      metrics: {
        totalDisbursed,
        totalRecovered,
        totalOutstanding,
        hasActiveAdvance: Boolean(activeAdvance),
        activeAdvance,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  syncSalaryAdvancesWithPayrolls,
  getCompanySalaryAdvances,
  createSalaryAdvance,
  recordDirectRepayment,
  updateSalaryAdvance,
  deleteSalaryAdvance,
  getEmployeeSalaryAdvances,
};
