const Employee = require("../models/Employee");
const SalaryStructure = require("../models/SalaryStructure");
const PayrollSettings = require("../models/PayrollSettings");
const { getPayrollAttendanceSummary } = require("./payrollAttendanceService");

const numberToWords = (num) => {
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const numVal = Math.round(Number(num));
  if (isNaN(numVal) || numVal === 0) return "Zero Rupees Only";
  const convert = (n) => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : "");
    if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " and " + convert(n % 100) : "");
    if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + convert(n % 1000) : "");
    if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 !== 0 ? " " + convert(n % 100000) : "");
    return convert(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 !== 0 ? " " + convert(n % 10000000) : "");
  };
  return convert(numVal) + " Rupees Only";
};

const calculateEmployeePayroll = async (employeeId, month, year, companyId, overrides = {}) => {
  const round = (val) => Math.round((val || 0) * 100) / 100;

  // 1. Employee
  const emp = await Employee.findOne({ _id: employeeId, companyId })
    .populate("departmentId designationId branchId")
    .populate("userId", "role profileImage");
  if (!emp) throw new Error("Employee not found");

  // 2. Salary Structure — fallback to legacy salaryDetails
  let ss = await SalaryStructure.findOne({ employeeId, companyId, status: "active" });
  if (!ss) {
    const sd = emp.salaryDetails;
    if (sd && (sd.basic || sd.ctc)) {
      const basicSalary = sd.basic || 0;
      const hra = sd.hra || 0;
      const specialAllowance = sd.specialAllowance || 0;
      const grossSalary = basicSalary + hra + specialAllowance;
      ss = {
        monthlyCTC: sd.ctc || grossSalary,
        basicSalary, hra,
        conveyanceAllowance: 0,
        medicalAllowance: 0,
        specialAllowance,
        otherAllowance: 0,
        grossSalary,
        pf: sd.pf || 0,
        esi: sd.esi || 0,
        professionalTax: 0,
        tds: sd.tds || 0,
        otherDeductions: 0,
        isLegacy: true,
      };
    } else {
      throw new Error(`No salary structure found for ${emp.firstName}. Please set up their salary in Salary Structures.`);
    }
  }

  // 3. Payroll Settings
  let settings = await PayrollSettings.findOne({ companyId });
  if (!settings) {
    settings = {
      salaryCalculationMode: "working_days",
      payableMonthDays: 0,
      includeWeeklyOffAsPaid: true,
      includeHolidayAsPaid: true,
      pfEnabled: true,
      esiEnabled: true,
      professionalTaxEnabled: true,
      tdsEnabled: true,
    };
  }

  // 4. Attendance Summary
  const attendance = await getPayrollAttendanceSummary(employeeId, month, year, companyId);

  // 5. Salary Divisor
  //
  // Priority:
  // (a) Admin manually set payableMonthDays > 0  → use that (Formula: Salary / admin_days × emp_payable_days)
  // (b) calendar_days mode                        → use totalCalendarDays
  // (c) working_days mode (default)               → workingDays + [weeklyOff if paid] + [holidays if paid]
  //
  let salaryDivisor;
  const adminPayableDays = settings.payableMonthDays || 0;

  if (adminPayableDays > 0) {
    // Admin override — exactly what was specified
    salaryDivisor = adminPayableDays;
  } else if (settings.salaryCalculationMode === "calendar_days") {
    salaryDivisor = attendance.totalCalendarDays;
  } else {
    // working_days mode: count workingDays + any paid offs
    salaryDivisor = attendance.workingDays;
    if (settings.includeWeeklyOffAsPaid) salaryDivisor += attendance.weeklyOffDays;
    if (settings.includeHolidayAsPaid) salaryDivisor += attendance.holidayDays;
  }

  if (salaryDivisor <= 0) salaryDivisor = attendance.totalCalendarDays || 30;

  // 6. Per Day Salary
  const perDaySalary = ss.grossSalary / salaryDivisor;

  // 7. Earning Multiplier based on Payable Days vs Salary Divisor
  const earningMultiplier = salaryDivisor > 0 ? Math.min(attendance.payableDays / salaryDivisor, 1) : 0;

  // 8. LOP Deduction is what they didn't earn from their gross
  const lopDeduction = ss.grossSalary * (1 - earningMultiplier);

  const earnedBasic = (ss.basicSalary || 0) * earningMultiplier;
  const earnedHRA = (ss.hra || 0) * earningMultiplier;
  const earnedConveyance = (ss.conveyanceAllowance || 0) * earningMultiplier;
  const earnedMedical = (ss.medicalAllowance || 0) * earningMultiplier;
  const earnedSpecial = (ss.specialAllowance || 0) * earningMultiplier;
  const earnedOther = (ss.otherAllowance || 0) * earningMultiplier;

  // One-time bonus/incentive added during generation
  const bonus = overrides.bonus || 0;
  const incentive = overrides.incentive || 0;
  const grossEarnings = earnedBasic + earnedHRA + earnedConveyance + earnedMedical + earnedSpecial + earnedOther + bonus + incentive;

  // 9. Statutory Deductions (fixed from salary structure)
  const pf = (settings.pfEnabled !== false && ss.pf > 0) ? ss.pf : 0;
  const esi = (settings.esiEnabled !== false && ss.esi > 0) ? ss.esi : 0;
  const professionalTax = (settings.professionalTaxEnabled !== false && ss.professionalTax > 0) ? ss.professionalTax : 0;
  const tds = (settings.tdsEnabled !== false && ss.tds > 0) ? ss.tds : 0;
  const otherDeductions = ss.otherDeductions || 0;
  const advanceDeduction = overrides.advanceDeduction || 0; // one-time advance recovery

  const statutoryDeductions = pf + esi + professionalTax + tds + otherDeductions + advanceDeduction;
  const totalDeductions = round(statutoryDeductions);

  // 10. Net Salary = grossEarnings - statutoryDeductions - LOP is already baked into grossEarnings via earningMultiplier
  let netSalary = grossEarnings - statutoryDeductions;
  if (netSalary < 0) netSalary = 0;

  // 11. Employee Snapshot
  const snapshot = {
    employeeCode: emp.employeeCode,
    employeeName: `${emp.firstName} ${emp.lastName}`,
    photo: emp.photo || emp.documents?.photo || emp.userId?.profileImage || "",
    department: emp.departmentId?.name || "N/A",
    designation: emp.designationId?.name || "N/A",
    branch: emp.branchId?.branchName || "N/A",
    joiningDate: emp.joiningDate,
    panNumber: emp.panNumber || "",
    bankName: emp.bankDetails?.bankName || "",
    accountNumber: emp.bankDetails?.accountNumber || "",
    ifscCode: emp.bankDetails?.ifscCode || "",
    aadhaarNumber: emp.aadhaarNumber ? emp.aadhaarNumber.slice(-4) : "",
  };

  return {
    employeeId: emp._id,
    employeeSnapshot: snapshot,
    attendanceSummary: attendance,
    salaryDivisor,
    adminPayableDays: adminPayableDays > 0 ? adminPayableDays : null,
    perDaySalary: round(perDaySalary),
    earnings: {
      basicSalary: round(earnedBasic),
      hra: round(earnedHRA),
      conveyanceAllowance: round(earnedConveyance),
      medicalAllowance: round(earnedMedical),
      specialAllowance: round(earnedSpecial),
      otherAllowance: round(earnedOther),
      bonus: round(bonus),
      incentive: round(incentive),
      grossEarnings: round(grossEarnings),
    },
    deductions: {
      pf: round(pf),
      esi: round(esi),
      professionalTax: round(professionalTax),
      tds: round(tds),
      otherDeductions: round(otherDeductions),
      advanceDeduction: round(advanceDeduction),
      lopDeduction: round(lopDeduction),
      totalDeductions,
    },
    grossSalary: ss.grossSalary,
    netSalary: Math.round(netSalary),
    amountInWords: numberToWords(Math.round(netSalary)),
  };
};

module.exports = { calculateEmployeePayroll };
