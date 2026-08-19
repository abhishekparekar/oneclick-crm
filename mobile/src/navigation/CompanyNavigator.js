import React from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import CompanyDrawerContent from "./CompanyDrawerContent";
import { LayoutProvider } from "../context/LayoutContext";
import CompanyAdminLayout from "../components/CompanyAdminLayout";

// Screens
import CompanyDashboard from "../screens/company/CompanyDashboard";
import CompanyProfileScreen from "../screens/company/CompanyProfileScreen";
import DepartmentListScreen from "../screens/company/DepartmentListScreen";
import AddEditDepartmentScreen from "../screens/company/AddEditDepartmentScreen";
import DesignationListScreen from "../screens/company/DesignationListScreen";
import AddEditDesignationScreen from "../screens/company/AddEditDesignationScreen";
import BranchListScreen from "../screens/company/BranchListScreen";
import AddEditBranchScreen from "../screens/company/AddEditBranchScreen";
import EmployeeListScreen from "../screens/company/EmployeeListScreen";
import AddEmployeeScreen from "../screens/company/AddEmployeeScreen";
import EditEmployeeScreen from "../screens/company/EditEmployeeScreen";
import EmployeeDetailsScreen from "../screens/company/EmployeeDetailsScreen";
import MyAttendanceScreen from "../screens/attendance/MyAttendanceScreen";
import HRManageAttendanceScreen from "../screens/hr/HRManageAttendanceScreen";
import EmployeeAttendanceCalendarScreen from "../screens/hr/EmployeeAttendanceCalendarScreen";
import EmployeeDailyAttendanceScreen from "../screens/hr/EmployeeDailyAttendanceScreen";
import AttendanceDetailsScreen from "../screens/attendance/AttendanceDetailsScreen";
import RegularizationApprovalScreen from "../screens/attendance/RegularizationApprovalScreen";
import LeaveRequestsScreen from "../screens/company/LeaveRequestsScreen";
import LeaveBalanceScreen from "../screens/company/LeaveBalanceScreen";
import HolidayListScreen from "../screens/company/HolidayListScreen";
import ProjectListScreen from "../screens/company/ProjectListScreen";
import CompanyProjectDetailsScreen from "../screens/company/CompanyProjectDetailsScreen";
import TaskBoardScreen from "../screens/company/TaskBoardScreen";
import CompanyTaskDetailsScreen from "../screens/company/CompanyTaskDetailsScreen";
import CompanyCreateTaskScreen from "../screens/company/CompanyCreateTaskScreen";
import CompanyCreateProjectScreen from "../screens/company/CompanyCreateProjectScreen";
import SalaryStructureScreen from "../screens/company/SalaryStructureScreen";
import PayrollListScreen from "../screens/company/PayrollListScreen";
import CompanyAnnouncementsScreen from "../screens/company/CompanyAnnouncementsScreen";
import CompanySettingsScreen from "../screens/company/CompanySettingsScreen";
import AttendanceSettingsScreen from "../screens/company/AttendanceSettingsScreen";
import CompanyAuditLogsScreen from "../screens/company/CompanyAuditLogsScreen";
import CompanyReportsDashboardScreen from "../screens/company/CompanyReportsDashboardScreen";
import ReportsDashboardScreen from "../screens/reports/ReportsDashboardScreen";
import AttendanceReportScreen from "../screens/reports/AttendanceReportScreen";
import LeaveReportScreen from "../screens/reports/LeaveReportScreen";
import PayrollReportScreen from "../screens/reports/PayrollReportScreen";
import TaskReportScreen from "../screens/reports/TaskReportScreen";
import EmployeeReportScreen from "../screens/reports/EmployeeReportScreen";
import ProjectReportScreen from "../screens/reports/ProjectReportScreen";
import PerformanceReportScreen from "../screens/reports/PerformanceReportScreen";
import NotificationsScreen from "../screens/notifications/NotificationsScreen";
import AccessControlScreen from "../screens/company/AccessControlScreen";
import EmployeeDocumentsScreen from "../screens/employee/EmployeeDocumentsScreen";
import UploadDocumentScreen from "../screens/company/UploadDocumentScreen";
import CompanyRequestsScreen from "../screens/common/CompanyRequestsScreen";

import LeadsNavigator from "./LeadsNavigator";

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

const DashboardStack = () => (
  <Stack.Navigator
    initialRouteName="CompanyDashboard"
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="CompanyDashboard" component={CompanyDashboard} />
    <Stack.Screen name="CompanyRequests" component={CompanyRequestsScreen} />
    <Stack.Screen name="LeadsEngine" component={LeadsNavigator} />
    <Stack.Screen name="CompanyProfile" component={CompanyProfileScreen} />
    <Stack.Screen name="DepartmentList" component={DepartmentListScreen} />
    <Stack.Screen name="AddEditDepartment" component={AddEditDepartmentScreen} />
    <Stack.Screen name="DesignationList" component={DesignationListScreen} />
    <Stack.Screen name="AddEditDesignation" component={AddEditDesignationScreen} />
    <Stack.Screen name="BranchList" component={BranchListScreen} />
    <Stack.Screen name="AddEditBranch" component={AddEditBranchScreen} />
    <Stack.Screen name="EmployeeList" component={EmployeeListScreen} />
    <Stack.Screen name="AddEmployee" component={AddEmployeeScreen} />
    <Stack.Screen name="EditEmployee" component={EditEmployeeScreen} />
    <Stack.Screen name="EmployeeDetails" component={EmployeeDetailsScreen} />
    <Stack.Screen name="Attendance" component={MyAttendanceScreen} />
    <Stack.Screen name="CompanyAttendance" component={HRManageAttendanceScreen} />
    <Stack.Screen name="EmployeeAttendanceCalendar" component={EmployeeAttendanceCalendarScreen} />
    <Stack.Screen name="EmployeeDailyAttendance" component={EmployeeDailyAttendanceScreen} />
    <Stack.Screen name="AttendanceDetails" component={AttendanceDetailsScreen} />
    <Stack.Screen name="RegularizationApproval" component={RegularizationApprovalScreen} />
    <Stack.Screen name="LeaveRequests" component={LeaveRequestsScreen} />
    <Stack.Screen name="LeaveBalance" component={LeaveBalanceScreen} />
    <Stack.Screen name="HolidayList" component={HolidayListScreen} />
    <Stack.Screen name="ProjectList" component={ProjectListScreen} />
    <Stack.Screen name="CompanyProjectDetails" component={CompanyProjectDetailsScreen} />
    <Stack.Screen name="CompanyCreateProject" component={CompanyCreateProjectScreen} />
    <Stack.Screen name="TaskBoard" component={TaskBoardScreen} />
    <Stack.Screen name="CompanyTaskDetails" component={CompanyTaskDetailsScreen} />
    <Stack.Screen name="CompanyCreateTask" component={CompanyCreateTaskScreen} />
    <Stack.Screen name="EmployeeCreateTask" component={CompanyCreateTaskScreen} />
    <Stack.Screen name="SalaryStructureList" component={SalaryStructureScreen} />
    <Stack.Screen name="PayrollList" component={PayrollListScreen} initialParams={{ activeTab: "history" }} />
    <Stack.Screen name="GeneratePayroll" component={PayrollListScreen} initialParams={{ activeTab: "generate" }} />
    <Stack.Screen name="CompanyAnnouncements" component={CompanyAnnouncementsScreen} />
    <Stack.Screen name="CompanySettings" component={CompanySettingsScreen} />
    <Stack.Screen name="AttendanceSettings" component={AttendanceSettingsScreen} />
    <Stack.Screen name="CompanyAuditLogs" component={CompanyAuditLogsScreen} />
    <Stack.Screen name="AccessControl" component={AccessControlScreen} />
    <Stack.Screen name="ReportsDashboard" component={ReportsDashboardScreen} />
    <Stack.Screen name="CompanyReportsDashboard" component={CompanyReportsDashboardScreen} />
    <Stack.Screen name="AttendanceReport" component={AttendanceReportScreen} />
    <Stack.Screen name="LeaveReport" component={LeaveReportScreen} />
    <Stack.Screen name="PayrollReport" component={PayrollReportScreen} />
    <Stack.Screen name="TaskReport" component={TaskReportScreen} />
    <Stack.Screen name="EmployeeReport" component={EmployeeReportScreen} />
    <Stack.Screen name="ProjectReport" component={ProjectReportScreen} />
    <Stack.Screen name="PerformanceReport" component={PerformanceReportScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="EmployeeDocuments" component={EmployeeDocumentsScreen} />
    <Stack.Screen name="UploadDocument" component={UploadDocumentScreen} />
  </Stack.Navigator>
);

const DummyLogoutScreen = () => null;

const CompanyNavigator = () => {
  const { logout } = useAuth();

  return (
    <LayoutProvider>
      <Drawer.Navigator
        initialRouteName="DashboardStack"
        drawerContent={(props) => <CompanyDrawerContent {...props} />}
        screenOptions={{
          headerShown: false,
          drawerStyle: {
            width: "75%",
          },
        }}
      >
        <Drawer.Screen
          name="DashboardStack"
          component={DashboardStack}
          options={{ headerShown: false }}
        />
      </Drawer.Navigator>
    </LayoutProvider>
  );
};

export default CompanyNavigator;
