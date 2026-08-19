import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import ProtectedRoute from "../components/layout/ProtectedRoute";
import RoleRoute from "../components/layout/RoleRoute";
import DashboardLayout from "../components/layout/DashboardLayout";

// Auth
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import LandingPage from "../pages/LandingPage";
import FeaturesPage from "../pages/FeaturesPage";
import ManagerLogin from "../pages/manager/ManagerLogin";

// Manager
import ManagerDashboard from "../pages/manager/ManagerDashboard";
import ManagerMyTasks from "../pages/manager/ManagerMyTasks";
import ManagerTeamTasks from "../pages/manager/ManagerTeamTasks";
import ManagerTeamMembers from "../pages/manager/ManagerTeamMembers";
import ManagerAttendance from "../pages/manager/ManagerAttendance";
import ManagerTeamLeaves from "../pages/manager/ManagerTeamLeaves";
import ManagerMyLeave from "../pages/manager/ManagerMyLeave";
import ManagerProjects from "../pages/manager/ManagerProjects";
import ManagerProjectDetails from "../pages/manager/ManagerProjectDetails";
import ManagerReports from "../pages/manager/ManagerReports";
import ManagerAnnouncements from "../pages/manager/ManagerAnnouncements";
import ManagerProfile from "../pages/manager/ManagerProfile";
import ManagerSettings from "../pages/manager/ManagerSettings";

// Employee
import EmployeeDashboard from "../pages/employee/EmployeeDashboard";
import EmployeeLeads from "../pages/employee/EmployeeLeads";
import EmployeeMyTasks from "../pages/employee/EmployeeMyTasks";
import EmployeeAttendance from "../pages/employee/EmployeeAttendance";
import EmployeeAttendanceDetail from "../pages/employee/EmployeeAttendanceDetail";
import EmployeeLeaves from "../pages/employee/EmployeeLeaves";
import EmployeeProjects from "../pages/employee/EmployeeProjects";
import EmployeePayslips from "../pages/employee/EmployeePayslips";
import EmployeeAnnouncements from "../pages/employee/EmployeeAnnouncements";
import EmployeeProfile from "../pages/employee/EmployeeProfile";
import EmployeeDocuments from "../pages/employee/EmployeeDocuments";

import EmployeeNotifications from "../pages/employee/EmployeeNotifications";
import EmployeeSettings from "../pages/employee/EmployeeSettings";
import EmployeeTaskDetails from "../pages/employee/EmployeeTaskDetails";
import EmployeeActivities from "../pages/employee/EmployeeActivities";

// SuperAdmin
import SuperAdminDashboard from "../pages/superadmin/SuperAdminDashboard";
import SuperAdminCompanies from "../pages/superadmin/SuperAdminCompanies";
import SuperAdminAddCompany from "../pages/superadmin/SuperAdminAddCompany";
import SuperAdminCompanyDetails from "../pages/superadmin/SuperAdminCompanyDetails";
import SuperAdminRequests from "../pages/superadmin/SuperAdminRequests";
import SuperAdminCompanyRequests from "../pages/superadmin/SuperAdminCompanyRequests";
import SuperAdminCompanyAdmins from "../pages/superadmin/SuperAdminCompanyAdmins";
import SuperAdminSubscriptions from "../pages/superadmin/SuperAdminSubscriptions";
import SuperAdminPlans from "../pages/superadmin/SuperAdminPlans";
import SuperAdminPayments from "../pages/superadmin/SuperAdminPayments";
import SuperAdminUsers from "../pages/superadmin/SuperAdminUsers";
import SuperAdminAnnouncements from "../pages/superadmin/SuperAdminAnnouncements";
import SuperAdminSupport from "../pages/superadmin/SuperAdminSupport";
import SuperAdminReports from "../pages/superadmin/SuperAdminReports";
import SuperAdminActivityLogs from "../pages/superadmin/SuperAdminActivityLogs";
import SuperAdminSettings from "../pages/superadmin/SuperAdminSettings";
import SuperAdminProfile from "../pages/superadmin/SuperAdminProfile";

// HR — Dashboard & Leads
import HRDashboard from "../pages/hr/HRDashboard";
import HRLeads from "../pages/hr/HRLeads";

// Company Requests & Query Hub
import CompanyRequestsPage from "../pages/common/CompanyRequestsPage";

// Company Admin — Dashboard
import CompanyDashboard from "../pages/companyadmin/CompanyDashboard";

// Company Admin — Organization
import Employees from "../pages/companyadmin/Employees";
import UploadDocument from "../pages/companyadmin/UploadDocument";
import AddEmployee from "../pages/companyadmin/AddEmployee";
import EditEmployee from "../pages/companyadmin/EditEmployee";
import Departments from "../pages/companyadmin/Departments";
import Designations from "../pages/companyadmin/Designations";
import Branches from "../pages/companyadmin/Branches";
import CompanyProfile from "../pages/companyadmin/CompanyProfile";
import Settings from "../pages/companyadmin/Settings";
import SubscriptionDetails from "../pages/companyadmin/SubscriptionDetails";

// Company Admin — Attendance & Time Off
import CompanyAttendance from "../pages/companyadmin/CompanyAttendance";
import RegularizationApprovals from "../pages/companyadmin/RegularizationApprovals";
import LeaveRequests from "../pages/companyadmin/LeaveRequests";
import LeaveBalance from "../pages/companyadmin/LeaveBalance";
import Holidays from "../pages/companyadmin/Holidays";
import CompanyAttendanceSettings from "../pages/companyadmin/CompanyAttendanceSettings";

// Company Admin — Work
import TaskBoard from "../pages/companyadmin/TaskBoard";
import TaskDetailsPage from "../pages/companyadmin/TaskDetailsPage";
import TaskStatuses from "../pages/companyadmin/TaskStatuses";
import Projects from "../pages/companyadmin/Projects";
import Announcements from "../pages/companyadmin/Announcements";

// Company Admin — Payroll
import PayrollHistory from "../pages/companyadmin/PayrollHistory";
import GeneratePayroll from "../pages/companyadmin/GeneratePayroll";
import SalaryStructurePage from "../pages/companyadmin/SalaryStructurePage";
import PayrollSettingsPage from "../pages/companyadmin/PayrollSettingsPage";
import AttendanceSummaryPage from "../pages/companyadmin/AttendanceSummaryPage";
import SalaryAdvancesPage from "../pages/companyadmin/SalaryAdvancesPage";

// Company Admin — Logs & Reports
import AuditLogs from "../pages/companyadmin/AuditLogs";
import Reports from "../pages/companyadmin/Reports";
import Performance from "../pages/companyadmin/Performance";
import AccessControl from "../pages/companyadmin/AccessControl";

// Lead Engine & WhatsApp Automations
import Leads from "../pages/leads/Leads";
import Flows from "../pages/leads/Flows";
import Campaigns from "../pages/leads/Campaigns";
import Reminders from "../pages/leads/Reminders";
import LeadSettings from "../pages/leads/LeadSettings";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/manager/login" element={<Navigate to="/login" replace />} />
      <Route path="/features" element={<FeaturesPage />} />
      <Route path="/" element={<LandingPage />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>

        {/* SuperAdmin Routes */}
        <Route element={<RoleRoute allowedRoles={["SuperAdmin"]} />}>
          <Route path="/superadmin" element={<DashboardLayout><Outlet /></DashboardLayout>}>
            <Route index element={<Navigate to="dashboard" replace />} />

            {/* Super Admin Module Routes */}
            <Route path="dashboard" element={<SuperAdminDashboard />} />
            <Route path="companies" element={<SuperAdminCompanies />} />
            <Route path="companies/add" element={<SuperAdminAddCompany />} />
            <Route path="companies/:id" element={<SuperAdminCompanyDetails />} />
            <Route path="company-requests" element={<SuperAdminCompanyRequests />} />
            <Route path="requests" element={<SuperAdminRequests />} />
            <Route path="company-admins" element={<SuperAdminCompanyAdmins />} />
            <Route path="subscriptions" element={<SuperAdminSubscriptions />} />
            <Route path="plans" element={<SuperAdminPlans />} />
            <Route path="payments" element={<SuperAdminPayments />} />
            <Route path="users" element={<SuperAdminUsers />} />
            <Route path="announcements" element={<SuperAdminAnnouncements />} />
            <Route path="support-tickets" element={<SuperAdminSupport />} />
            <Route path="reports" element={<SuperAdminReports />} />
            <Route path="activity-logs" element={<SuperAdminActivityLogs />} />
            <Route path="settings" element={<SuperAdminSettings />} />
            <Route path="profile" element={<SuperAdminProfile />} />
          </Route>
        </Route>

        {/* CompanyAdmin Routes */}
        <Route element={<RoleRoute allowedRoles={["CompanyAdmin"]} />}>
          <Route path="/company" element={<DashboardLayout><Outlet /></DashboardLayout>}>
            <Route index element={<Navigate to="dashboard" replace />} />

            {/* Core */}
            <Route path="dashboard" element={<CompanyDashboard />} />
            <Route path="profile" element={<CompanyProfile />} />

            {/* Attendance */}
            <Route path="attendance" element={<CompanyAttendance />} />
            <Route path="regularization" element={<RegularizationApprovals />} />
            <Route path="attendance-settings" element={<CompanyAttendanceSettings />} />

            {/* Organization Setup */}
            <Route path="departments" element={<Departments />} />
            <Route path="designations" element={<Designations />} />
            <Route path="branches" element={<Branches />} />

            {/* Staff Management */}
            <Route path="employees" element={<Employees />} />
            <Route path="upload-document" element={<UploadDocument />} />
            <Route path="employees/add" element={<AddEmployee />} />
            <Route path="employees/edit/:id" element={<EditEmployee />} />

            {/* Time Off */}
            <Route path="leaves" element={<LeaveRequests />} />
            <Route path="leave-balance" element={<LeaveBalance />} />
            <Route path="holidays" element={<Holidays />} />

            {/* Work */}
            <Route path="tasks" element={<TaskBoard />} />
            <Route path="tasks/:id" element={<TaskDetailsPage />} />
            <Route path="tasks/statuses" element={<TaskStatuses />} />
            <Route path="projects" element={<Projects />} />
            <Route path="announcements" element={<Announcements />} />

            {/* Payroll */}
            <Route path="payroll/settings" element={<PayrollSettingsPage />} />
            <Route path="payroll/salary" element={<SalaryStructurePage />} />
            <Route path="payroll/generate" element={<GeneratePayroll />} />
            <Route path="payroll/history" element={<PayrollHistory />} />
            <Route path="payroll/advances" element={<SalaryAdvancesPage />} />
            <Route path="payroll/attendance-summary" element={<AttendanceSummaryPage />} />

            {/* Logs & Reports */}
            <Route path="settings" element={<Settings />} />
            <Route path="access-control" element={<AccessControl />} />
            <Route path="audit-logs" element={<AuditLogs />} />
            <Route path="subscription" element={<SubscriptionDetails />} />
            <Route path="reports/attendance" element={<Reports />} />
            <Route path="reports/leave" element={<Reports />} />
            <Route path="reports/payroll" element={<Reports />} />
            <Route path="reports/employee" element={<Reports />} />
            <Route path="reports/performance" element={<Reports />} />
            <Route path="performance" element={<Performance />} />

            {/* Lead Engine & WhatsApp Automations */}
            <Route path="leads" element={<Leads />} />
            <Route path="leads/automation" element={<Flows />} />
            <Route path="leads/campaigns" element={<Campaigns />} />
            <Route path="leads/reminders" element={<Reminders />} />
            <Route path="leads/settings" element={<LeadSettings />} />

            {/* Company Requests & Query Hub */}
            <Route path="requests" element={<CompanyRequestsPage role="admin" />} />
          </Route>
        </Route>

        {/* HR Routes */}
        <Route element={<RoleRoute allowedRoles={["HR", "CompanyAdmin"]} />}>
          <Route path="/hr" element={<DashboardLayout><Outlet /></DashboardLayout>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<HRDashboard />} />
            
            {/* Staff Management */}
            <Route path="employees" element={<Employees />} />
            <Route path="upload-document" element={<UploadDocument />} />
            <Route path="employees/add" element={<AddEmployee />} />
            <Route path="employees/edit/:id" element={<EditEmployee />} />
            <Route path="departments" element={<Departments />} />

            {/* Attendance & Time-Off */}
            <Route path="attendance" element={<CompanyAttendance />} />
            <Route path="regularization" element={<RegularizationApprovals />} />
            <Route path="leaves" element={<LeaveRequests />} />
            <Route path="leave-balance" element={<LeaveBalance />} />
            <Route path="holidays" element={<Holidays />} />

            {/* Work & Tasks */}
            <Route path="tasks" element={<TaskBoard />} />
            <Route path="tasks/:id" element={<TaskDetailsPage />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="requests" element={<CompanyRequestsPage role="hr" />} />

            {/* Payroll */}
            <Route path="payroll/salary" element={<SalaryStructurePage />} />
            <Route path="payroll/generate" element={<GeneratePayroll />} />
            <Route path="payroll/history" element={<PayrollHistory />} />
            <Route path="payroll/advances" element={<SalaryAdvancesPage />} />
            <Route path="payslips" element={<EmployeePayslips />} />

            {/* Reports & Profile */}
            <Route path="reports" element={<Reports />} />
            <Route path="performance" element={<Performance />} />
            <Route path="profile" element={<ManagerProfile />} />
            <Route path="settings" element={<Settings />} />

            {/* Lead CRM */}
            <Route path="leads" element={<HRLeads />} />
          </Route>
        </Route>

        {/* Manager Routes */}
        <Route element={<RoleRoute allowedRoles={["Manager"]} />}>
          <Route path="/manager" element={<DashboardLayout><Outlet /></DashboardLayout>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<ManagerDashboard />} />
            <Route path="my-tasks" element={<ManagerMyTasks />} />
            <Route path="team-tasks" element={<ManagerTeamTasks />} />
            <Route path="tasks/:id" element={<TaskDetailsPage />} />
            <Route path="team" element={<ManagerTeamMembers />} />
            <Route path="attendance" element={<ManagerAttendance />} />
            <Route path="team-attendance" element={<ManagerAttendance />} />
            <Route path="team-leaves" element={<ManagerTeamLeaves />} />
            <Route path="my-leave" element={<ManagerMyLeave />} />
            <Route path="payslips" element={<EmployeePayslips />} />
            <Route path="projects" element={<ManagerProjects />} />
            <Route path="projects/:id" element={<ManagerProjectDetails />} />
            <Route path="reports" element={<ManagerReports />} />
            <Route path="announcements" element={<ManagerAnnouncements />} />
            <Route path="requests" element={<CompanyRequestsPage role="manager" />} />
            <Route path="profile" element={<ManagerProfile />} />
            <Route path="settings" element={<ManagerSettings />} />

            {/* Lead Engine & WhatsApp CRM */}
            <Route path="leads" element={<Leads />} />
            <Route path="leads/automation" element={<Flows />} />
            <Route path="leads/campaigns" element={<Campaigns />} />
            <Route path="leads/reminders" element={<Reminders />} />
            <Route path="leads/settings" element={<LeadSettings />} />
          </Route>
        </Route>

        {/* Employee Routes */}
        <Route element={<RoleRoute allowedRoles={["Employee"]} />}>
          <Route path="/employee" element={<DashboardLayout><Outlet /></DashboardLayout>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<EmployeeDashboard />} />
            <Route path="profile" element={<ManagerProfile />} />
            <Route path="documents" element={<EmployeeDocuments />} />
            
            <Route path="attendance" element={<EmployeeAttendance />} />
            <Route path="attendance/detail" element={<EmployeeAttendanceDetail />} />
            <Route path="my-tasks" element={<EmployeeMyTasks />} />
            <Route path="tasks/:id" element={<EmployeeTaskDetails />} />
            <Route path="leaves" element={<EmployeeLeaves />} />
            <Route path="payslips" element={<EmployeePayslips />} />
            <Route path="payroll" element={<EmployeePayslips />} />

            <Route path="notifications" element={<EmployeeNotifications />} />
            <Route path="announcements" element={<EmployeeAnnouncements />} />
            <Route path="requests" element={<CompanyRequestsPage role="employee" />} />
            <Route path="settings" element={<EmployeeSettings />} />
            <Route path="projects" element={<EmployeeProjects />} />
            <Route path="activities" element={<EmployeeActivities />} />

            {/* Lead CRM */}
            <Route path="leads" element={<EmployeeLeads />} />
          </Route>
        </Route>
      </Route>

      {/* Catch-all fallback: Redirect to Landing Page */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
// HMR re-trigger