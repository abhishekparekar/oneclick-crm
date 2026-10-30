const Company = require("../models/Company");
const PayrollSettings = require("../models/PayrollSettings");

const DAY_MAP = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const getDerivedDays = (rawWorkingDays) => {
  const workingDays =
    Array.isArray(rawWorkingDays) && rawWorkingDays.length > 0
      ? rawWorkingDays
      : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  const workingIndices = workingDays
    .map((d) => DAY_MAP[String(d).toLowerCase().trim()])
    .filter((n) => n !== undefined);

  const weeklyOffDays = [0, 1, 2, 3, 4, 5, 6].filter((d) => !workingIndices.includes(d));
  return { workingDays, weeklyOffDays };
};

const getPayrollSettings = async (req, res, next) => {
  try {
    const company = await Company.findById(req.companyId).select("settings").lean();
    const { workingDays, weeklyOffDays } = getDerivedDays(company?.settings?.workingDays);

    let settings = await PayrollSettings.findOne({ companyId: req.companyId });
    if (!settings) {
      settings = await PayrollSettings.create({
        companyId: req.companyId,
        weeklyOffDays,
        fullDayMinHours: Number(company?.settings?.fullDayHours || 8),
        halfDayMinHours: Number(company?.settings?.halfDayHours || 4),
      });
    } else {
      // Keep weeklyOffDays strictly synchronized with Company System Settings
      settings.weeklyOffDays = weeklyOffDays;
      if (company?.settings?.fullDayHours) {
        settings.fullDayMinHours = Number(company.settings.fullDayHours);
      }
      if (company?.settings?.halfDayHours) {
        settings.halfDayMinHours = Number(company.settings.halfDayHours);
      }
      await settings.save();
    }

    const data = settings.toObject();
    data.companyWorkingDays = workingDays;
    data.weeklyOffDays = weeklyOffDays;

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const updatePayrollSettings = async (req, res, next) => {
  try {
    const company = await Company.findById(req.companyId).select("settings").lean();
    const { workingDays, weeklyOffDays } = getDerivedDays(company?.settings?.workingDays);

    const {
      salaryCalculationMode,
      payableMonthDays,
      payrollCycleStartDay,
      payrollCycleEndDay,
      includeWeeklyOffAsPaid,
      includeHolidayAsPaid,
      halfDayDeductionMode,
      fullDayMinHours,
      halfDayMinHours,
      pfEnabled,
      esiEnabled,
      professionalTaxEnabled,
      tdsEnabled,
      defaultCurrency,
      payslipPrefix,
      autoDeductLopFromSalary,
    } = req.body;

    let settings = await PayrollSettings.findOne({ companyId: req.companyId });
    if (!settings) {
      settings = new PayrollSettings({ companyId: req.companyId });
    }

    // Always synchronize weeklyOffDays from company operational working days
    settings.weeklyOffDays = weeklyOffDays;

    if (salaryCalculationMode !== undefined) settings.salaryCalculationMode = salaryCalculationMode;
    if (payableMonthDays !== undefined) settings.payableMonthDays = Number(payableMonthDays);
    if (payrollCycleStartDay !== undefined) settings.payrollCycleStartDay = payrollCycleStartDay;
    if (payrollCycleEndDay !== undefined) settings.payrollCycleEndDay = payrollCycleEndDay;
    if (includeWeeklyOffAsPaid !== undefined) settings.includeWeeklyOffAsPaid = includeWeeklyOffAsPaid;
    if (includeHolidayAsPaid !== undefined) settings.includeHolidayAsPaid = includeHolidayAsPaid;
    if (halfDayDeductionMode !== undefined) settings.halfDayDeductionMode = halfDayDeductionMode;
    if (fullDayMinHours !== undefined) settings.fullDayMinHours = Number(fullDayMinHours);
    if (halfDayMinHours !== undefined) settings.halfDayMinHours = Number(halfDayMinHours);
    if (pfEnabled !== undefined) settings.pfEnabled = pfEnabled;
    if (esiEnabled !== undefined) settings.esiEnabled = esiEnabled;
    if (professionalTaxEnabled !== undefined) settings.professionalTaxEnabled = professionalTaxEnabled;
    if (tdsEnabled !== undefined) settings.tdsEnabled = tdsEnabled;
    if (defaultCurrency !== undefined) settings.defaultCurrency = defaultCurrency;
    if (payslipPrefix !== undefined) settings.payslipPrefix = payslipPrefix;
    if (autoDeductLopFromSalary !== undefined) settings.autoDeductLopFromSalary = autoDeductLopFromSalary;

    await settings.save();

    const data = settings.toObject();
    data.companyWorkingDays = workingDays;
    data.weeklyOffDays = weeklyOffDays;

    res.json({ success: true, data, message: "Payroll settings updated successfully" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPayrollSettings,
  updatePayrollSettings,
};
