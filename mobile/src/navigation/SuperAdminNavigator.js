import { createDrawerNavigator } from "@react-navigation/drawer";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import SuperAdminDrawerContent from "./SuperAdminDrawerContent";
import { LayoutProvider } from "../context/LayoutContext";
import SuperAdminLayout from "../components/SuperAdminLayout";
import SuperAdminDashboard from "../screens/superadmin/SuperAdminDashboard";
import CompaniesScreen from "../screens/superadmin/CompaniesScreen";
import AddCompanyScreen from "../screens/superadmin/AddCompanyScreen";
import CompanyDetailsScreen from "../screens/superadmin/CompanyDetailsScreen";
import CompanyAdminsScreen from "../screens/superadmin/CompanyAdminsScreen";
import SubscriptionPlansScreen from "../screens/superadmin/SubscriptionPlansScreen";
import CompanySubscriptionsScreen from "../screens/superadmin/CompanySubscriptionsScreen";
import PaymentsScreen from "../screens/superadmin/PaymentsScreen";
import ModuleAccessControlScreen from "../screens/superadmin/ModuleAccessControlScreen";
import GlobalUsersScreen from "../screens/superadmin/GlobalUsersScreen";
import SupportTicketsScreen from "../screens/superadmin/SupportTicketsScreen";
import AnnouncementsScreen from "../screens/superadmin/AnnouncementsScreen";
import AuditLogsScreen from "../screens/superadmin/AuditLogsScreen";
import LoginHistoryScreen from "../screens/superadmin/LoginHistoryScreen";
import SystemSettingsScreen from "../screens/superadmin/SystemSettingsScreen";
import BackupLogsScreen from "../screens/superadmin/BackupLogsScreen";
import SuperAdminProfileScreen from "../screens/superadmin/SuperAdminProfileScreen";
import NotificationsScreen from "../screens/notifications/NotificationsScreen";
import ReportsDashboardScreen from "../screens/reports/ReportsDashboardScreen";
import AttendanceReportScreen from "../screens/reports/AttendanceReportScreen";
import LeaveReportScreen from "../screens/reports/LeaveReportScreen";
import PayrollReportScreen from "../screens/reports/PayrollReportScreen";
import TaskReportScreen from "../screens/reports/TaskReportScreen";
import EmployeeReportScreen from "../screens/reports/EmployeeReportScreen";
import ProjectReportScreen from "../screens/reports/ProjectReportScreen";
import PerformanceReportScreen from "../screens/reports/PerformanceReportScreen";
import CompanyTaskDetailsScreen from "../screens/company/CompanyTaskDetailsScreen";
import CompanyCreateTaskScreen from "../screens/company/CompanyCreateTaskScreen";
import CompanyProjectDetailsScreen from "../screens/company/CompanyProjectDetailsScreen";
import CompanyCreateProjectScreen from "../screens/company/CompanyCreateProjectScreen";

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

const DashboardStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen
      name="SuperAdminDashboard"
      component={SuperAdminDashboard}
      options={{ title: "Super Admin" }}
    />
    <Stack.Screen
      name="Companies"
      component={CompaniesScreen}
      options={{ title: "Companies" }}
    />
    <Stack.Screen
      name="AddCompany"
      component={AddCompanyScreen}
      options={{ title: "Add Company" }}
    />
    <Stack.Screen
      name="CompanyDetails"
      component={CompanyDetailsScreen}
      options={{ title: "Company Details" }}
    />
    <Stack.Screen
      name="CompanyAdmins"
      component={CompanyAdminsScreen}
      options={{ title: "Company Admins" }}
    />
    <Stack.Screen
      name="SubscriptionPlans"
      component={SubscriptionPlansScreen}
      options={{ title: "Subscription Plans" }}
    />
    <Stack.Screen
      name="CompanySubscriptions"
      component={CompanySubscriptionsScreen}
      options={{ title: "Company Subscriptions" }}
    />
    <Stack.Screen
      name="Payments"
      component={PaymentsScreen}
      options={{ title: "Payments" }}
    />
    <Stack.Screen
      name="ModuleAccessControl"
      component={ModuleAccessControlScreen}
      options={{ title: "Module Access Control" }}
    />
    <Stack.Screen
      name="GlobalUsers"
      component={GlobalUsersScreen}
      options={{ title: "Global Users" }}
    />
    <Stack.Screen
      name="SupportTickets"
      component={SupportTicketsScreen}
      options={{ title: "Support Tickets" }}
    />
    <Stack.Screen
      name="Announcements"
      component={AnnouncementsScreen}
      options={{ title: "Announcements" }}
    />
    <Stack.Screen
      name="AuditLogs"
      component={AuditLogsScreen}
      options={{ title: "Audit Logs" }}
    />
    <Stack.Screen
      name="LoginHistory"
      component={LoginHistoryScreen}
      options={{ title: "Login History" }}
    />
    <Stack.Screen
      name="SystemSettings"
      component={SystemSettingsScreen}
      options={{ title: "System Settings" }}
    />
    <Stack.Screen
      name="BackupLogs"
      component={BackupLogsScreen}
      options={{ title: "Backup & Logs" }}
    />
    <Stack.Screen
      name="SuperAdminProfile"
      component={SuperAdminProfileScreen}
      options={{ title: "Profile" }}
    />
    <Stack.Screen
      name="ReportsDashboard"
      component={ReportsDashboardScreen}
      options={{ title: "Reports" }}
    />
    <Stack.Screen
      name="AttendanceReport"
      component={AttendanceReportScreen}
      options={{ title: "Attendance Report" }}
    />
    <Stack.Screen
      name="LeaveReport"
      component={LeaveReportScreen}
      options={{ title: "Leave Report" }}
    />
    <Stack.Screen
      name="PayrollReport"
      component={PayrollReportScreen}
      options={{ title: "Payroll Report" }}
    />
    <Stack.Screen
      name="TaskReport"
      component={TaskReportScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="EmployeeReport"
      component={EmployeeReportScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="ProjectReport"
      component={ProjectReportScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="PerformanceReport"
      component={PerformanceReportScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="CompanyTaskDetails"
      component={CompanyTaskDetailsScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="CompanyCreateTask"
      component={CompanyCreateTaskScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="CompanyProjectDetails"
      component={CompanyProjectDetailsScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="CompanyCreateProject"
      component={CompanyCreateProjectScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="Notifications"
      component={NotificationsScreen}
      options={{ title: "Notifications" }}
    />
  </Stack.Navigator>
);

const DummyLogoutScreen = () => null;

const SuperAdminNavigator = () => {
  const { logout } = useAuth();
  return (
    <LayoutProvider>
      <Drawer.Navigator
        initialRouteName="DashboardStack"
        drawerContent={(props) => <SuperAdminDrawerContent {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Drawer.Screen name="DashboardStack" options={{ headerShown: false }}>
          {(props) => (
            <SuperAdminLayout isOuterShell={true} navigation={props.navigation}>
              <DashboardStack />
            </SuperAdminLayout>
          )}
        </Drawer.Screen>
      </Drawer.Navigator>
    </LayoutProvider>
  );
};

export default SuperAdminNavigator;
