import React from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LayoutProvider } from "../context/LayoutContext";
import { useAuth } from "../context/AuthContext";
import ManagerDrawerContent from "./ManagerDrawerContent";

// ── Bottom Tab Screens ─────────────────────────────────────
import ManagerDashboardScreen from "../screens/manager/ManagerDashboardScreen";
import ManagerTeamScreen from "../screens/manager/ManagerTeamScreen";
import ManagerAttendanceScreen from "../screens/manager/ManagerAttendanceScreen";
import ManagerTasksScreen from "../screens/manager/ManagerTasksScreen";
import ManagerProfileScreen from "../screens/manager/ManagerProfileScreen";

// ── Secondary Screens ──────────────────────────────────────
import ManagerTeamMemberDetailsScreen from "../screens/manager/ManagerTeamMemberDetailsScreen";
import ManagerTeamOrgViewScreen from "../screens/manager/ManagerTeamOrgViewScreen";
import ManagerMyAttendanceScreen from "../screens/manager/ManagerMyAttendanceScreen";
import ManagerTeamAttendanceScreen from "../screens/manager/ManagerTeamAttendanceScreen";
import ManagerTeamAttendanceDetailsScreen from "../screens/manager/ManagerTeamAttendanceDetailsScreen";
import ManagerRegularizationScreen from "../screens/manager/ManagerRegularizationScreen";
import ManagerTeamLeavesScreen from "../screens/manager/ManagerTeamLeavesScreen";
import ManagerTeamLeaveDetailsScreen from "../screens/manager/ManagerTeamLeaveDetailsScreen";
import ManagerMyLeaveScreen from "../screens/manager/ManagerMyLeaveScreen";
import ManagerMyTasksScreen from "../screens/manager/ManagerMyTasksScreen";
import ManagerTeamTasksScreen from "../screens/manager/ManagerTeamTasksScreen";
import ManagerTaskDetailsScreen from "../screens/manager/ManagerTaskDetailsScreen";
import ManagerCreateTaskScreen from "../screens/manager/ManagerCreateTaskScreen";
import ManagerProjectsScreen from "../screens/manager/ManagerProjectsScreen";
import ManagerProjectDetailsScreen from "../screens/manager/ManagerProjectDetailsScreen";
import ManagerCreateProjectScreen from "../screens/manager/ManagerCreateProjectScreen";
import ManagerWorkTrackerScreen from "../screens/manager/ManagerWorkTrackerScreen";
import ManagerTimesheetScreen from "../screens/manager/ManagerTimesheetScreen";
import ManagerReportsScreen from "../screens/manager/ManagerReportsScreen";
import ManagerTeamAttendanceReportScreen from "../screens/manager/ManagerTeamAttendanceReportScreen";
import ManagerTeamTaskReportScreen from "../screens/manager/ManagerTeamTaskReportScreen";
import ManagerTeamLeaveReportScreen from "../screens/manager/ManagerTeamLeaveReportScreen";
import ManagerTeamWorkReportScreen from "../screens/manager/ManagerTeamWorkReportScreen";
import ManagerNotificationsScreen from "../screens/manager/ManagerNotificationsScreen";
import ManagerNotificationDetailsScreen from "../screens/manager/ManagerNotificationDetailsScreen";
import ManagerAnnouncementsScreen from "../screens/manager/ManagerAnnouncementsScreen";
import ManagerAnnouncementDetailsScreen from "../screens/manager/ManagerAnnouncementDetailsScreen";
import ManagerSettingsScreen from "../screens/manager/ManagerSettingsScreen";
import ManagerEditProfileScreen from "../screens/manager/ManagerEditProfileScreen";
import ManagerApplyLeaveScreen from "../screens/manager/ManagerApplyLeaveScreen";
import EmployeeDocumentsScreen from "../screens/employee/EmployeeDocumentsScreen";
import CompleteProfileScreen from "../screens/employee/CompleteProfileScreen";
import EmployeeHolidayCalendarScreen from "../screens/employee/EmployeeHolidayCalendarScreen";
import EmployeeLeaveBalanceScreen from "../screens/employee/EmployeeLeaveBalanceScreen";
import EmployeePunchScreen from "../screens/attendance/EmployeePunchScreen";
import EmployeeAttendanceDetailsScreen from "../screens/attendance/EmployeeAttendanceDetailsScreen";
import CompanyRequestsScreen from "../screens/common/CompanyRequestsScreen";
import EmployeeRegularizationRequestScreen from "../screens/attendance/EmployeeRegularizationRequestScreen";
import { HRAddEmployeeScreen, HREditEmployeeScreen } from "../screens/hr/HRWrappers";
import LeadsNavigator from "./LeadsNavigator";
import EmployeeLocationTrackingScreen from "../screens/company/EmployeeLocationTrackingScreen";
import MyPayslipsScreen from "../screens/employee/MyPayslipsScreen";
import EmployeePayslipDetailsScreen from "../screens/employee/EmployeePayslipDetailsScreen";

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TEAL = "#1268D9";
const TEAL_INACTIVE = "#64748B";

// ── 1. Bottom Tab Navigator ────────────────────────────────
const ManagerBottomTabs = () => {
  const insets = useSafeAreaInsets();
  const { user, hasPermission } = useAuth();

  const canAccessTasks = hasPermission("tasks", "view") || hasPermission("tasks");
  const canAccessLeaves = hasPermission("leaves", "view") || hasPermission("leaves") || hasPermission("leave");
  const canAccessAttendance = hasPermission("attendance", "view") || hasPermission("attendance");

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: TEAL,
        tabBarInactiveTintColor: TEAL_INACTIVE,
        tabBarStyle: {
          display: "none", // ManagerLayout renders its own persistent bottom nav
        },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName;
          if (route.name === "ManagerDashboard") {
            iconName = focused ? "grid" : "grid-outline";
          } else if (route.name === "ManagerTeam") {
            iconName = focused ? "people" : "people-outline";
          } else if (route.name === "ManagerTasks") {
            iconName = focused ? "albums" : "albums-outline";
          } else if (route.name === "ManagerTeamLeaves") {
            iconName = focused ? "calendar-clear" : "calendar-clear-outline";
          } else if (route.name === "ManagerProfile") {
            iconName = focused ? "person" : "person-outline";
          }
          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="ManagerDashboard"
        component={ManagerDashboardScreen}
        options={{ tabBarLabel: "Home", headerShown: false }}
      />
      <Tab.Screen
        name="LeadsEngine"
        component={LeadsNavigator}
        options={{ tabBarLabel: "Leads", headerShown: false }}
      />
      <Tab.Screen
        name="ManagerTasks"
        component={ManagerTasksScreen}
        options={{ tabBarLabel: "Tasks", headerShown: false }}
      />
      <Tab.Screen
        name="ManagerTeamAttendance"
        component={ManagerTeamAttendanceScreen}
        options={{ tabBarLabel: "Attendance", headerShown: false }}
      />
      <Tab.Screen
        name="ManagerTeamLeaves"
        component={ManagerTeamLeavesScreen}
        options={{ tabBarLabel: "Leaves", headerShown: false }}
      />
      <Tab.Screen
        name="ManagerProjects"
        component={ManagerProjectsScreen}
        options={{ tabBarLabel: "Projects", headerShown: false }}
      />
      <Tab.Screen
        name="ManagerTeam"
        component={ManagerTeamScreen}
        options={{ tabBarLabel: "My Team", headerShown: false }}
      />
      <Tab.Screen
        name="ManagerProfile"
        component={ManagerProfileScreen}
        options={{ tabBarLabel: "Profile", headerShown: false }}
      />
    </Tab.Navigator>
  );
};

// ── 2. Stack Navigator (wraps bottom tabs + secondary screens) ─
const ManagerStackScreen = () => {
  return (
    <Stack.Navigator
      initialRouteName="ManagerTabs"
      screenOptions={{ headerShown: false }}
    >
      {/* Main Tab Host */}
      <Stack.Screen
        name="ManagerTabs"
        component={ManagerBottomTabs}
        options={{ headerShown: false }}
      />
      {/* Core Tab Screen Aliases directly in Stack for seamless top-level jumping */}
      <Stack.Screen name="ManagerDashboard" component={ManagerDashboardScreen} />
      <Stack.Screen name="ManagerTasks" component={ManagerTasksScreen} />
      <Stack.Screen name="ManagerTeam" component={ManagerTeamScreen} />
      <Stack.Screen name="ManagerProfile" component={ManagerProfileScreen} />
      <Stack.Screen name="LeadsEngine" component={LeadsNavigator} />
      <Stack.Screen name="EmployeeLocationTracking" component={EmployeeLocationTrackingScreen} />

      {/* Team */}
      <Stack.Screen name="ManagerTeamMemberDetails" component={ManagerTeamMemberDetailsScreen} />
      <Stack.Screen name="ManagerTeamOrgView" component={ManagerTeamOrgViewScreen} />

      {/* Attendance */}
      <Stack.Screen name="CheckInCheckOut" component={EmployeePunchScreen} />
      <Stack.Screen name="AttendanceDetails" component={EmployeeAttendanceDetailsScreen} />
      <Stack.Screen name="RegularizationRequest" component={EmployeeRegularizationRequestScreen} />
      <Stack.Screen name="ManagerAttendance" component={ManagerAttendanceScreen} />
      <Stack.Screen name="ManagerMyAttendance" component={ManagerMyAttendanceScreen} />
      <Stack.Screen name="ManagerTeamAttendance" component={ManagerTeamAttendanceScreen} />
      <Stack.Screen name="ManagerTeamAttendanceDetails" component={ManagerTeamAttendanceDetailsScreen} />
      <Stack.Screen name="ManagerRegularization" component={ManagerRegularizationScreen} />

      {/* Leaves */}
      <Stack.Screen name="ManagerTeamLeaves" component={ManagerTeamLeavesScreen} />
      <Stack.Screen name="ManagerTeamLeaveDetails" component={ManagerTeamLeaveDetailsScreen} />
      <Stack.Screen name="ManagerMyLeave" component={ManagerMyLeaveScreen} />
      <Stack.Screen name="ManagerApplyLeave" component={ManagerApplyLeaveScreen} />
      <Stack.Screen name="EmployeeHolidayCalendar" component={EmployeeHolidayCalendarScreen} />
      <Stack.Screen name="EmployeeLeaveBalance" component={EmployeeLeaveBalanceScreen} />

      {/* Tasks */}
      <Stack.Screen name="ManagerMyTasks" component={ManagerMyTasksScreen} />
      <Stack.Screen name="ManagerTeamTasks" component={ManagerTeamTasksScreen} />
      <Stack.Screen name="ManagerTaskDetails" component={ManagerTaskDetailsScreen} />
      <Stack.Screen name="ManagerCreateTask" component={ManagerCreateTaskScreen} />
      <Stack.Screen name="EmployeeCreateTask" component={ManagerCreateTaskScreen} />

      {/* Projects */}
      <Stack.Screen name="ManagerProjects" component={ManagerProjectsScreen} />
      <Stack.Screen name="Projects" component={ManagerProjectsScreen} />
      <Stack.Screen name="MyProjects" component={ManagerProjectsScreen} />
      <Stack.Screen name="ManagerProjectDetails" component={ManagerProjectDetailsScreen} />
      <Stack.Screen name="ManagerCreateProject" component={ManagerCreateProjectScreen} />

      {/* Other */}
      <Stack.Screen name="ManagerWorkTracker" component={ManagerWorkTrackerScreen} />
      <Stack.Screen name="ManagerTimesheet" component={ManagerTimesheetScreen} />
      {/* Reports */}
      <Stack.Screen name="ManagerReports" component={ManagerReportsScreen} />
      <Stack.Screen name="ManagerTeamAttendanceReportScreen" component={ManagerTeamAttendanceReportScreen} />
      <Stack.Screen name="ManagerTeamTaskReportScreen" component={ManagerTeamTaskReportScreen} />
      <Stack.Screen name="ManagerTeamLeaveReportScreen" component={ManagerTeamLeaveReportScreen} />
      <Stack.Screen name="ManagerTeamWorkReportScreen" component={ManagerTeamWorkReportScreen} />

      {/* Notifications & Announcements */}
      <Stack.Screen name="ManagerNotifications" component={ManagerNotificationsScreen} />
      <Stack.Screen name="ManagerNotificationDetailsScreen" component={ManagerNotificationDetailsScreen} />
      <Stack.Screen name="ManagerAnnouncements" component={ManagerAnnouncementsScreen} />
      <Stack.Screen name="ManagerAnnouncementDetailsScreen" component={ManagerAnnouncementDetailsScreen} />

      {/* Payroll / Payslips */}
      <Stack.Screen name="Payslips" component={MyPayslipsScreen} />
      <Stack.Screen name="MyPayslips" component={MyPayslipsScreen} />
      <Stack.Screen name="EmployeePayslipDetails" component={EmployeePayslipDetailsScreen} />

      {/* Settings & Profile */}
      <Stack.Screen name="ManagerSettings" component={ManagerSettingsScreen} />
      <Stack.Screen name="ManagerEditProfileScreen" component={ManagerEditProfileScreen} />
      <Stack.Screen name="EmployeeDocuments" component={EmployeeDocumentsScreen} />
      <Stack.Screen name="ManagerAddEmployee" component={HRAddEmployeeScreen} />
      <Stack.Screen name="ManagerEditEmployee" component={HREditEmployeeScreen} />
      <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
      <Stack.Screen name="CompanyRequests" component={CompanyRequestsScreen} />
    </Stack.Navigator>
  );
};

// ── 3. Root Manager Navigator (Drawer wraps the Stack) ─────
const ManagerNavigator = () => {
  return (
    <LayoutProvider>
      <Drawer.Navigator
        initialRouteName="ManagerStack"
        drawerContent={(props) => <ManagerDrawerContent {...props} />}
        screenOptions={{
          headerShown: false,
          drawerStyle: {
            width: "75%",
          },
        }}
      >
        <Drawer.Screen
          name="ManagerStack"
          component={ManagerStackScreen}
          options={{ headerShown: false }}
        />
      </Drawer.Navigator>
    </LayoutProvider>
  );
};

export default ManagerNavigator;
