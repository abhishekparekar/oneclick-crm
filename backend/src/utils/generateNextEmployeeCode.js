const Employee = require("../models/Employee");

const generateNextEmployeeCode = async (companyId) => {
  const employees = await Employee.find({ companyId }).select("employeeCode").lean();

  let max = 0;
  for (const e of employees) {
    const m = /^EMP-(\d+)$/i.exec(e.employeeCode || "");
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }

  const next = max + 1;
  return `EMP-${String(next).padStart(4, "0")}`;
};

module.exports = generateNextEmployeeCode;
