import React from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LayoutProvider } from "../context/LayoutContext";
import { useAuth } from "../context/AuthContext";
import HRDrawerContent from "./HRDrawerContent";
import LeadsNavigator from "./LeadsNavigator";
import { FONTS } from "../theme/tokens";

// Import Custom Bottom Tab Screens
import HRDashboardScreen from "../screens/hr/HRDashboardScreen";
import HRLeadsScreen from "../screens/hr/HRLeadsScreen";
import HRLeadDetailsScreen from "../screens/hr/HRLeadDetailsScreen";
import HREmployeeListScreen from "../screens/hr/HREmployeeListScreen";
import MyTasksScreen from "../screens/employee/MyTasksScreen";
import HRManageAttendanceScreen from "../screens/hr/HRManageAttendanceScreen";
import HRLeaveRequestsScreen from "../screens/hr/HRLeaveRequestsScreen";
import AttendanceSettingsScreen from "../screens/company/AttendanceSettingsScreen";
import EmployeePunchScreen from "../screens/attendance/EmployeePunchScreen";
import EmployeeAttendanceCalendarScreen from "../screens/hr/EmployeeAttendanceCalendarScreen";
import EmployeeDailyAttendanceScreen from "../screens/hr/EmployeeDailyAttendanceScreen";
import NotificationsScreen from "../screens/notifications/NotificationsScreen";
import CompanyRequestsScreen from "../screens/common/CompanyRequestsScreen";

// Import Report Screens
import AttendanceReportScreen from "../screens/reports/AttendanceReportScreen";
import LeaveReportScreen from "../screens/reports/LeaveReportScreen";
import PayrollReportScreen from "../screens/reports/PayrollReportScreen";
import TaskReportScreen from "../screens/reports/TaskReportScreen";
import EmployeeReportScreen from "../screens/reports/EmployeeReportScreen";
import ProjectReportScreen from "../screens/reports/ProjectReportScreen";
import PerformanceReportScreen from "../screens/reports/PerformanceReportScreen";

// Import Wrapper Screens
import {
  HRAddEmployeeScreen,
  HREditEmployeeScreen,
  HREmployeeDetailsScreen,
  HRAttendanceDetailsScreen,
  HRRegularizationApprovalScreen,
  HRHolidayListScreen,
  HRLeaveBalanceScreen,
  HRPayrollListScreen,
  HRPayrollGenerateScreen,
  HRSalaryStructureScreen,
  HRReportsDashboardScreen,
  HRAnnouncementsScreen,
  HRAuditLogsScreen,
  HRProfileScreen,
  HRCompanyProfileScreen,
  HRDepartmentListScreen,
  HRDesignationListScreen,
  HRBranchListScreen,
  HRAddEditDepartmentScreen,
  HRAddEditDesignationScreen,
  HRAddEditBranchScreen,
  HRProjectListScreen,
  HRTaskBoardScreen,
  HRProjectDetailsScreen,
  HRTaskDetailsScreen,
  HRCreateTaskScreen,
  HRCreateProjectScreen,
  HRMyAttendanceScreen,
  HRSettingsScreen,
  HRAttendanceScreen,
} from "../screens/hr/HRWrappers";
import EmployeeDocumentsScreen from "../screens/employee/EmployeeDocumentsScreen";
import UploadDocumentScreen from "../screens/company/UploadDocumentScreen";
import CompleteProfileScreen from "../screens/employee/CompleteProfileScreen";

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TEAL    = "#1268D9";
const INACTIVE = "#64748B";
const TEAL_INACTIVE = "#64748B";

// ── Custom HR Tab Bar ──────────────────────────────────────────
const HRCustomTabBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();

  const icons = {
    HRDashboard:     ["grid",                           "grid-outline"],
    LeadsEngine:     ["magnet",                         "magnet-outline"],
    HRTaskBoard:     ["albums",                         "albums-outline"],
    HRProjectList:   ["folder-open",                    "folder-open-outline"],
    HREmployeeList:  ["people",                         "people-outline"],
    HRAttendance:    ["time",                           "time-outline"],
    HRLeaveRequests: ["calendar-clear",                 "calendar-clear-outline"],
    CompanyRequests: ["chatbubbles",                    "chatbubbles-outline"],
    HRAnnouncements: ["megaphone",                      "megaphone-outline"],
    HRSettings:      ["ellipsis-horizontal-circle",     "ellipsis-horizontal-circle-outline"],
  };

  const labels = {
    HRDashboard:     "Dashboard",
    LeadsEngine:     "Leads",
    HRTaskBoard:     "Tasks",
    HRProjectList:   "Projects",
    HREmployeeList:  "Staff",
    HRAttendance:    "Attendance",
    HRLeaveRequests: "Leaves",
    CompanyRequests: "Requests",
    HRAnnouncements: "Updates",
    HRSettings:      "More",
  };

  return (
    <View style={[tabStyles.wrapper, { paddingBottom: insets.bottom }]}>
      <View style={tabStyles.container}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const [activeIcon, inactiveIcon] = icons[route.name] || ["ellipse", "ellipse-outline"];

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={tabStyles.tab}
              activeOpacity={0.7}
            >
              <View style={[tabStyles.iconPill, isFocused && tabStyles.iconPillActive]}>
                <Ionicons
                  name={isFocused ? activeIcon : inactiveIcon}
                  size={21}
                  color={isFocused ? TEAL : INACTIVE}
                />
              </View>
              <Text style={[tabStyles.label, isFocused && tabStyles.labelActive]}>
                {labels[route.name] || route.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// Bottom Tabs Navigator
const HRBottomTabs = () => {
  const { user, hasPermission } = useAuth();

  const canAccessLeads = hasPermission("leads", "view") || hasPermission("leads");
  const canAccessTasks = hasPermission("tasks", "view") || hasPermission("tasks");
  const canAccessAttendance = hasPermission("attendance", "view") || hasPermission("attendance");
  const canAccessLeaves = hasPermission("leaves", "view") || hasPermission("leaves") || hasPermission("leave");
  const canAccessProjects = hasPermission("projects", "view") || hasPermission("projects");

  const tabs = [];
  // 1. Dashboard
  tabs.push({ name: "HRDashboard", component: HRDashboardScreen, label: "Dashboard" });

  // 2. Work (Leads -> Tasks -> Projects -> Staff)
  if (canAccessLeads) {
    tabs.push({ name: "LeadsEngine", component: HRLeadsScreen, label: "Leads" });
  } else if (canAccessTasks) {
    tabs.push({ name: "HRTaskBoard", component: HRTaskBoardScreen, label: "Tasks" });
  } else if (canAccessProjects) {
    tabs.push({ name: "HRProjectList", component: HRProjectListScreen, label: "Projects" });
  } else {
    tabs.push({ name: "HREmployeeList", component: HREmployeeDetailsScreen, label: "Staff" });
  }

  // 3. Attendance / Leaves / Requests
  if (canAccessAttendance) {
    tabs.push({ name: "HRAttendance", component: HRAttendanceScreen, label: "Attendance" });
  } else if (canAccessLeaves) {
    tabs.push({ name: "HRLeaveRequests", component: HRLeaveRequestsScreen, label: "Leaves" });
  } else {
    tabs.push({ name: "CompanyRequests", component: CompanyRequestsScreen, label: "Requests" });
  }

  // 4. Secondary Work (Tasks -> Leaves -> Projects -> Requests -> Announcements)
  const hasLeads = tabs.some((t) => t.name === "LeadsEngine");
  const hasTasks = tabs.some((t) => t.name === "HRTaskBoard");
  const hasLeaves = tabs.some((t) => t.name === "HRLeaveRequests");
  const hasProjects = tabs.some((t) => t.name === "HRProjectList");
  const hasRequests = tabs.some((t) => t.name === "CompanyRequests");

  if (canAccessTasks && !hasTasks) {
    tabs.push({ name: "HRTaskBoard", component: HRTaskBoardScreen, label: "Tasks" });
  } else if (canAccessLeaves && !hasLeaves) {
    tabs.push({ name: "HRLeaveRequests", component: HRLeaveRequestsScreen, label: "Leaves" });
  } else if (canAccessProjects && !hasProjects) {
    tabs.push({ name: "HRProjectList", component: HRProjectListScreen, label: "Projects" });
  } else if (!hasRequests) {
    tabs.push({ name: "CompanyRequests", component: CompanyRequestsScreen, label: "Requests" });
  } else {
    tabs.push({ name: "HRAnnouncements", component: HRAnnouncementsScreen, label: "Updates" });
  }

  // 5. Settings / More
  tabs.push({ name: "HRSettings", component: HRSettingsScreen, label: "More" });

  return (
    <Tab.Navigator
      tabBar={(props) => <HRCustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {tabs.map((tab) => (
        <Tab.Screen key={tab.name} name={tab.name} component={tab.component} />
      ))}
    </Tab.Navigator>
  );
};

// Stack Navigator for Drawer/Sub-Screens
const HRStackScreen = () => {
  return (
    <Stack.Navigator initialRouteName="MainTabs" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs"                    component={HRBottomTabs} />
      <Stack.Screen name="CheckInCheckOut"             component={EmployeePunchScreen} />
      <Stack.Screen name="HRManageAttendance"          component={HRAttendanceScreen} />
      <Stack.Screen name="EmployeeAttendanceCalendar"  component={EmployeeAttendanceCalendarScreen} />
      <Stack.Screen name="EmployeeDailyAttendance"     component={EmployeeDailyAttendanceScreen} />
      <Stack.Screen name="MyAttendance"                component={HRMyAttendanceScreen} />
      <Stack.Screen name="HRMyTasks"                   component={MyTasksScreen} />
      <Stack.Screen name="HRLeaveRequests"             component={HRLeaveRequestsScreen} />
      <Stack.Screen name="HRSettings"                  component={HRSettingsScreen} />
      <Stack.Screen name="Notifications"               component={NotificationsScreen} />
      <Stack.Screen name="HRAddEmployee"               component={HRAddEmployeeScreen} />
      <Stack.Screen name="HREditEmployee"              component={HREditEmployeeScreen} />
      <Stack.Screen name="HREmployeeDetails"           component={HREmployeeDetailsScreen} />
      <Stack.Screen name="HRAttendanceDetails"         component={HRAttendanceDetailsScreen} />
      <Stack.Screen name="HRRegularizationApproval"    component={HRRegularizationApprovalScreen} />
      <Stack.Screen name="HRHolidayList"               component={HRHolidayListScreen} />
      <Stack.Screen name="HRLeaveBalance"              component={HRLeaveBalanceScreen} />
      <Stack.Screen name="HRPayrollList"               component={HRPayrollListScreen} />
      <Stack.Screen name="HRPayrollGenerate"           component={HRPayrollGenerateScreen} />
      <Stack.Screen name="HRSalaryStructure"           component={HRSalaryStructureScreen} />
      <Stack.Screen name="HRReportsDashboard"          component={HRReportsDashboardScreen} />
      <Stack.Screen name="AttendanceReport"            component={AttendanceReportScreen} />
      <Stack.Screen name="LeaveReport"                 component={LeaveReportScreen} />
      <Stack.Screen name="PayrollReport"               component={PayrollReportScreen} />
      <Stack.Screen name="TaskReport"                  component={TaskReportScreen} />
      <Stack.Screen name="EmployeeReport"              component={EmployeeReportScreen} />
      <Stack.Screen name="ProjectReport"               component={ProjectReportScreen} />
      <Stack.Screen name="PerformanceReport"           component={PerformanceReportScreen} />
      <Stack.Screen name="HRAnnouncements"             component={HRAnnouncementsScreen} />
      <Stack.Screen name="HRAuditLogs"                 component={HRAuditLogsScreen} />
      <Stack.Screen name="HRProfile"                   component={HRProfileScreen} />
      <Stack.Screen name="HRCompanyProfile"            component={HRCompanyProfileScreen} />
      <Stack.Screen name="HRLeads"                     component={HRLeadsScreen} />
      <Stack.Screen name="LeadsEngine"                 component={HRLeadsScreen} />
      <Stack.Screen name="LeadDetails"                 component={HRLeadDetailsScreen} />
      <Stack.Screen name="LeadDetailsScreen"           component={HRLeadDetailsScreen} />
      <Stack.Screen name="HRLeadDetails"               component={HRLeadDetailsScreen} />
      <Stack.Screen name="HRDepartmentList"            component={HRDepartmentListScreen} />
      <Stack.Screen name="HRDesignationList"           component={HRDesignationListScreen} />
      <Stack.Screen name="HRBranchList"                component={HRBranchListScreen} />
      <Stack.Screen name="AddEditDepartment"           component={HRAddEditDepartmentScreen} />
      <Stack.Screen name="AddEditDesignation"          component={HRAddEditDesignationScreen} />
      <Stack.Screen name="AddEditBranch"               component={HRAddEditBranchScreen} />
      <Stack.Screen name="AttendanceSettings"          component={AttendanceSettingsScreen} />
      <Stack.Screen name="HRProjectList"               component={HRProjectListScreen} />
      <Stack.Screen name="HRTaskBoard"                 component={HRTaskBoardScreen} />
      <Stack.Screen name="HRProjectDetails"            component={HRProjectDetailsScreen} />
      <Stack.Screen name="HRTaskDetails"               component={HRTaskDetailsScreen} />
      <Stack.Screen name="EmployeeTaskDetails"         component={HRTaskDetailsScreen} />
      <Stack.Screen name="TaskDetails"                 component={HRTaskDetailsScreen} />
      <Stack.Screen name="HRCreateTask"                component={HRCreateTaskScreen} />
      <Stack.Screen name="EmployeeCreateTask"          component={HRCreateTaskScreen} />
      <Stack.Screen name="HRCreateProject"             component={HRCreateProjectScreen} />
      <Stack.Screen name="CompanyTaskDetails"          component={HRTaskDetailsScreen} />
      <Stack.Screen name="CompanyCreateTask"           component={HRCreateTaskScreen} />
      <Stack.Screen name="CompanyProjectDetails"       component={HRProjectDetailsScreen} />
      <Stack.Screen name="CompanyCreateProject"        component={HRCreateProjectScreen} />
      <Stack.Screen name="EmployeeDocuments"           component={EmployeeDocumentsScreen} />
      <Stack.Screen name="UploadDocument"              component={UploadDocumentScreen} />
      <Stack.Screen name="CompleteProfile"             component={CompleteProfileScreen} />
      <Stack.Screen name="HRDashboard"                 component={HRDashboardScreen} />
      <Stack.Screen name="HREmployeeList"              component={HREmployeeListScreen} />
      <Stack.Screen name="HRAttendance"                component={HRAttendanceScreen} />
      <Stack.Screen name="CompanyRequests"             component={CompanyRequestsScreen} />
    </Stack.Navigator>
  );
};

// Main HR Navigator
const HRNavigator = () => {
  return (
    <LayoutProvider>
      <Drawer.Navigator
        initialRouteName="HRStack"
        drawerContent={(props) => <HRDrawerContent {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Drawer.Screen name="HRStack" component={HRStackScreen} options={{ headerShown: false }} />
      </Drawer.Navigator>
    </LayoutProvider>
  );
};

// ── Tab Bar Styles ─────────────────────────────────────────────
const tabStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 10,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    height: 60,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  iconPill: {
    width: 44,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  iconPillActive: {
    backgroundColor: "rgba(18, 104, 217, 0.12)",
  },
  label: {
    fontSize: 10,
    fontFamily: FONTS.bodyMedium,
    color: "#64748B",
    marginTop: 1,
  },
  labelActive: {
    color: "#1268D9",
    fontFamily: FONTS.bodyBold,
    fontWeight: "700",
  },
});

export default HRNavigator;
