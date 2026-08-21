const biReportingService = require("../services/biReportingService");

const getCompanyId = (req) => {
  if (req.user && req.user.role === "SuperAdmin") {
    return req.query.companyId || req.companyId || null;
  }
  return req.companyId || (req.user && req.user.companyId) || null;
};

// 1. Executive
const getExecutiveReport = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ message: "Company ID is required" });
    const data = await biReportingService.getExecutiveMetrics(companyId, req.query, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// 2. Workforce
const getWorkforceReport = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ message: "Company ID is required" });
    const data = await biReportingService.getWorkforceMetrics(companyId, req.query, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// 3. Attendance
const getAttendanceReport = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ message: "Company ID is required" });
    const data = await biReportingService.getAttendanceMetrics(companyId, req.query, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// 4. Leaves
const getLeaveReport = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ message: "Company ID is required" });
    const data = await biReportingService.getLeaveMetrics(companyId, req.query, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// 5. Tasks
const getTaskReport = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ message: "Company ID is required" });
    const data = await biReportingService.getTaskMetrics(companyId, req.query, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// 6. Payroll (Strict Access Check)
const getPayrollReport = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ message: "Company ID is required" });
    
    // Only CompanyAdmin and authorized roles can view payroll analytics
    if (req.user.role !== "CompanyAdmin" && req.user.role !== "SuperAdmin" && req.user.role !== "HR") {
      return res.status(403).json({ message: "Access Denied: Payroll reports are restricted to administrators." });
    }

    const data = await biReportingService.getPayrollMetrics(companyId, req.query, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// 7. Performance
const getPerformanceReport = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ message: "Company ID is required" });
    const data = await biReportingService.getPerformanceMetrics(companyId, req.query, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// 8. Audit Ledger
const getAuditReport = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ message: "Company ID is required" });
    const data = await biReportingService.getAuditLedger(companyId, req.query, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// 9. Employee Drill Down
const getEmployeeDrillDown = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;
    if (!companyId || !id) return res.status(400).json({ message: "Company ID and Employee ID are required" });
    const data = await biReportingService.getEmployeeDrillDown(companyId, id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// 10. Department Drill Down
const getDepartmentDrillDown = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;
    if (!companyId || !id) return res.status(400).json({ message: "Company ID and Department ID are required" });
    const data = await biReportingService.getDepartmentDrillDown(companyId, id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getExecutiveReport,
  getWorkforceReport,
  getAttendanceReport,
  getLeaveReport,
  getTaskReport,
  getPayrollReport,
  getPerformanceReport,
  getAuditReport,
  getEmployeeDrillDown,
  getDepartmentDrillDown,
};
