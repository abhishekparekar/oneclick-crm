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
const TEAL_INACTIVE = "#64748B";

// ── Custom HR Tab Bar ──────────────────────────────────────────
const HRCustomTabBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();

  const icons = {
    HRDashboard:    ["grid",         "grid-outline"],
    LeadsEngine:    ["magnet",       "magnet-outline"],
    HRTaskBoard:    ["albums",       "albums-outline"],
    // HRProjects:     ["folder-open",  "folder-open-outline"],
    HRLeaveRequests: ["calendar-clear", "calendar-clear-outline"],
    HRAttendance:   ["time",         "time-outline"],
  };

  const labels = {
    HRDashboard:    "Dashboard",
    LeadsEngine:    "Leads",
    HRTaskBoard:    "Tasks",
    // HRProjects:     "Projects",
    HRLeaveRequests: "Leaves",
    HRAttendance:   "Attendance",
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
  const { user } = useAuth();
  
  // Always show all tabs — backend blocks API calls if plan is inactive

  return (
    <Tab.Navigator
      tabBar={(props) => <HRCustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="HRDashboard"    component={HRDashboardScreen} />
      <Tab.Screen name="LeadsEngine"    component={HRLeadsScreen} />
      <Tab.Screen name="HRTaskBoard"    component={HRTaskBoardScreen} />
      <Tab.Screen name="HRLeaveRequests" component={HRLeaveRequestsScreen} />
      <Tab.Screen name="HRAttendance"   component={HRAttendanceScreen} />
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
    backgroundColor: "#071A2F",
    borderTopWidth: 1,
    borderTopColor: "#1C3554",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 12,
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
    backgroundColor: "rgba(47, 139, 255, 0.18)",
  },
  label: {
    fontSize: 10,
    fontFamily: FONTS.bodyMedium,
    color: "#94A3B8",
  },
  labelActive: {
    color: "#2F8BFF",
    fontFamily: FONTS.bodyBold,
  },
});

export default HRNavigator;
