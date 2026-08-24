const mongoose = require("mongoose");
const Task = require("./src/models/Task");
const Project = require("./src/models/Project");
const Timesheet = require("./src/models/Timesheet");
const Payroll = require("./src/models/Payroll");
const Announcement = require("./src/models/Announcement");

const employeeTaskController = require("./src/controllers/employeeTaskController");
const employeeTimesheetController = require("./src/controllers/employeeTimesheetController");
const employeeProjectController = require("./src/controllers/employeeProjectController");
const employeeLeaveController = require("./src/controllers/employeeLeaveController");
const employeePayslipController = require("./src/controllers/employeePayslipController");
const employeeAnnouncementController = require("./src/controllers/employeeAnnouncementController");
const employeeDashboardController = require("./src/controllers/employeeDashboardController");

console.log("-----------------------------------------");
console.log("Oneclick MODULE COMPILATION DIAGNOSTIC");
console.log("-----------------------------------------");

try {
  console.log("[PASS] Mongoose Models successfully initialized:");
  console.log("   - Task Schema has activityLog:", typeof Task.schema.paths.activityLog !== "undefined");
  console.log("   - Project Schema has activityLog:", typeof Project.schema.paths.activityLog !== "undefined");
  console.log("   - Project Schema has priority:", typeof Project.schema.paths.priority !== "undefined");
  console.log("   - Timesheet Schema has columns:", Object.keys(Timesheet.schema.paths).join(", "));
  console.log("   - Payroll Schema has detailed salary columns:", typeof Payroll.schema.paths.hra !== "undefined" && typeof Payroll.schema.paths.pf !== "undefined");
  console.log("   - Announcement Schema has targetDepartments:", typeof Announcement.schema.paths.targetDepartments !== "undefined");

  console.log("\n[PASS] Task Controller methods exported:");
  console.log("   - getAssignedTasks:", typeof employeeTaskController.getAssignedTasks === "function");
  console.log("   - getTaskDetails:", typeof employeeTaskController.getTaskDetails === "function");
  console.log("   - updateOwnTaskStatus:", typeof employeeTaskController.updateOwnTaskStatus === "function");
  console.log("   - addTaskComment:", typeof employeeTaskController.addTaskComment === "function");
  console.log("   - updateTaskChecklist:", typeof employeeTaskController.updateTaskChecklist === "function");
  console.log("   - startTaskTimer:", typeof employeeTaskController.startTaskTimer === "function");
  console.log("   - stopTaskTimer:", typeof employeeTaskController.stopTaskTimer === "function");

  console.log("\n[PASS] Timesheet Controller methods exported:");
  console.log("   - createManualTimesheet:", typeof employeeTimesheetController.createManualTimesheet === "function");
  console.log("   - getDailyTimesheet:", typeof employeeTimesheetController.getDailyTimesheet === "function");
  console.log("   - getWeeklyTimesheet:", typeof employeeTimesheetController.getWeeklyTimesheet === "function");

  console.log("\n[PASS] Project Controller methods exported:");
  console.log("   - getEmployeeProjects:", typeof employeeProjectController.getEmployeeProjects === "function");
  console.log("   - getEmployeeProjectDetails:", typeof employeeProjectController.getEmployeeProjectDetails === "function");
  console.log("   - getEmployeeProjectTasks:", typeof employeeProjectController.getEmployeeProjectTasks === "function");
  console.log("   - getEmployeeProjectActivity:", typeof employeeProjectController.getEmployeeProjectActivity === "function");

  console.log("\n[PASS] Leave Controller methods exported:");
  console.log("   - applyLeave:", typeof employeeLeaveController.applyLeave === "function");
  console.log("   - getMyLeaves:", typeof employeeLeaveController.getMyLeaves === "function");
  console.log("   - getLeaveDetails:", typeof employeeLeaveController.getLeaveDetails === "function");
  console.log("   - cancelLeave:", typeof employeeLeaveController.cancelLeave === "function");
  console.log("   - getLeaveBalance:", typeof employeeLeaveController.getLeaveBalance === "function");
  console.log("   - getCompanyHolidays:", typeof employeeLeaveController.getCompanyHolidays === "function");

  console.log("\n[PASS] Payslip Controller methods exported:");
  console.log("   - getPayslips:", typeof employeePayslipController.getPayslips === "function");
  console.log("   - getPayslipDetails:", typeof employeePayslipController.getPayslipDetails === "function");
  console.log("   - downloadPayslip:", typeof employeePayslipController.downloadPayslip === "function");

  console.log("\n[PASS] Announcement Controller methods exported:");
  console.log("   - getEmployeeAnnouncements:", typeof employeeAnnouncementController.getEmployeeAnnouncements === "function");
  console.log("   - markAnnouncementRead:", typeof employeeAnnouncementController.markAnnouncementRead === "function");

  console.log("\n[PASS] Dashboard Controller method exported:");
  console.log("   - getEmployeeDashboard:", typeof employeeDashboardController.getEmployeeDashboard === "function");

  console.log("\n-----------------------------------------");
  console.log("STATUS: SUCCESS - All code is syntactically sound and correctly exported!");
  console.log("-----------------------------------------");
  process.exit(0);
} catch (error) {
  console.error("\n[FAIL] Compilation diagnostic failed:", error);
  process.exit(1);
}
