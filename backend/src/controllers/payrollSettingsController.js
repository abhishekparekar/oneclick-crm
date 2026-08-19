const PayrollSettings = require("../models/PayrollSettings");

const getPayrollSettings = async (req, res, next) => {
  try {
    let settings = await PayrollSettings.findOne({ companyId: req.companyId });
    if (!settings) {
      settings = await PayrollSettings.create({ companyId: req.companyId });
    }
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
};

const updatePayrollSettings = async (req, res, next) => {
  try {
    const {
      salaryCalculationMode,
      payableMonthDays,
      weeklyOffDays,
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
    } = req.body;

    let settings = await PayrollSettings.findOne({ companyId: req.companyId });
    if (!settings) {
      settings = new PayrollSettings({ companyId: req.companyId });
    }

    if (salaryCalculationMode !== undefined) settings.salaryCalculationMode = salaryCalculationMode;
    if (payableMonthDays !== undefined) settings.payableMonthDays = Number(payableMonthDays);
    if (weeklyOffDays !== undefined) settings.weeklyOffDays = weeklyOffDays;
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

    await settings.save();

    res.json({ success: true, data: settings, message: "Payroll settings updated successfully" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPayrollSettings,
  updatePayrollSettings,
};
