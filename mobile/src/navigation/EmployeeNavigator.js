import React from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LayoutProvider } from "../context/LayoutContext";
import { useAuth } from "../context/AuthContext";
import EmployeeDrawerContent from "./EmployeeDrawerContent";
import { FONTS } from "../theme/tokens";

// Screens
import EmployeeDashboard from "../screens/employee/EmployeeDashboard";
import EmployeeProfileScreen from "../screens/employee/EmployeeProfileScreen";
import EmployeeAttendanceScreen from "../screens/attendance/EmployeeAttendanceScreen";
import EmployeePunchScreen from "../screens/attendance/EmployeePunchScreen";
import EmployeeMonthlyAttendanceScreen from "../screens/attendance/EmployeeMonthlyAttendanceScreen";
import EmployeeAttendanceDetailsScreen from "../screens/attendance/EmployeeAttendanceDetailsScreen";
import EmployeeRegularizationRequestScreen from "../screens/attendance/EmployeeRegularizationRequestScreen";
import NotificationsScreen from "../screens/notifications/NotificationsScreen";
import SettingsScreen from "../screens/employee/SettingsScreen";

// New Screens
import MyTasksScreen from "../screens/employee/MyTasksScreen";
import MyProjectsScreen from "../screens/employee/MyProjectsScreen";
import MyLeavesScreen from "../screens/employee/MyLeavesScreen";
import WorkTrackerScreen from "../screens/employee/WorkTrackerScreen";
import TimesheetScreen from "../screens/employee/TimesheetScreen";
import MyPayslipsScreen from "../screens/employee/MyPayslipsScreen";
import AnnouncementsScreen from "../screens/employee/AnnouncementsScreen";

// Task & Projects Screens
import EmployeeTaskBoardScreen from "../screens/employee/EmployeeTaskBoardScreen";
import EmployeeTaskDetailsScreen from "../screens/employee/EmployeeTaskDetailsScreen";
import EmployeeCreateTaskScreen from "../screens/employee/EmployeeCreateTaskScreen";
import EmployeeProjectDetailsScreen from "../screens/employee/EmployeeProjectDetailsScreen";
import EmployeeProjectTasksScreen from "../screens/employee/EmployeeProjectTasksScreen";
import EmployeeProjectActivityScreen from "../screens/employee/EmployeeProjectActivityScreen";

// Leave, Payslips, Notifications & Announcements Extra Screens
import EmployeeApplyLeaveScreen from "../screens/employee/EmployeeApplyLeaveScreen";
import EmployeeLeaveDetailsScreen from "../screens/employee/EmployeeLeaveDetailsScreen";
import EmployeeLeaveBalanceScreen from "../screens/employee/EmployeeLeaveBalanceScreen";
import EmployeeHolidayCalendarScreen from "../screens/employee/EmployeeHolidayCalendarScreen";
import EmployeeHolidayDetailsScreen from "../screens/employee/EmployeeHolidayDetailsScreen";
import EmployeePayslipDetailsScreen from "../screens/employee/EmployeePayslipDetailsScreen";
import EmployeeNotificationDetailsScreen from "../screens/employee/EmployeeNotificationDetailsScreen";
import EmployeeAnnouncementDetailsScreen from "../screens/employee/EmployeeAnnouncementDetailsScreen";

// Profile Stepper & Edit Profile Screens
import CompleteProfileScreen from "../screens/employee/CompleteProfileScreen";
import EmployeeEditProfileScreen from "../screens/employee/EmployeeEditProfileScreen";
import EmployeeDocumentsScreen from "../screens/employee/EmployeeDocumentsScreen";
import EmployeeLeadsScreen from "../screens/employee/EmployeeLeadsScreen";
import EmployeeLeadDetailsScreen from "../screens/employee/EmployeeLeadDetailsScreen";
import CompanyRequestsScreen from "../screens/common/CompanyRequestsScreen";

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// 1. Employee Bottom Tab Navigator
const EmployeeBottomTabs = () => {
  const insets = useSafeAreaInsets();
  const { user, hasPermission } = useAuth();
  const canAccessLeads = hasPermission("leads", "view") || hasPermission("leads");

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#C2410C",
        tabBarInactiveTintColor: "#64748b",
        tabBarStyle: {
          height: (Platform.OS === "ios" ? 88 : 68) + insets.bottom,
          paddingBottom: (Platform.OS === "ios" ? 30 : 12) + insets.bottom,
          paddingTop: 8,
          backgroundColor: "#ffffff",
          borderTopWidth: 1,
          borderTopColor: "#e2e8f0",
          elevation: 8,
          shadowColor: "#000",
          shadowOpacity: 0.06,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: -2 },
        },
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontFamily: FONTS.bodyMedium,
        },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName;

          if (route.name === "EmployeeDashboard") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "LeadsEngine") {
            iconName = focused ? "magnet" : "magnet-outline";
          } else if (route.name === "Tasks") {
            iconName = focused ? "list" : "list-outline";
          } else if (route.name === "Leave") {
            iconName = focused ? "calendar-clear" : "calendar-clear-outline";
          } else if (route.name === "EmployeeProfile") {
            iconName = focused ? "grid" : "grid-outline";
          } else if (route.name === "Attendance") {
            iconName = "leaf";
          }

          if (route.name === "Attendance") {
            return (
              <View style={styles.customTabButtonContainer}>
                <View style={styles.customTabButton}>
                  <Ionicons name="leaf" size={24} color="#ffffff" />
                </View>
              </View>
            );
          }

          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="EmployeeDashboard"
        component={EmployeeDashboard}
        options={{ tabBarLabel: "Dashboard", headerShown: false }}
      />
      {canAccessLeads ? (
        <Tab.Screen
          name="LeadsEngine"
          component={EmployeeLeadsScreen}
          options={{ tabBarLabel: "Leads", headerShown: false }}
        />
      ) : (
        <Tab.Screen
          name="Tasks"
          component={MyTasksScreen}
          options={{ tabBarLabel: "Tasks", headerShown: false }}
        />
      )}
      <Tab.Screen
        name="Attendance"
        component={EmployeeMonthlyAttendanceScreen}
        options={{
          tabBarLabel: () => null,
        }}
      />
      {canAccessLeads ? (
        <Tab.Screen
          name="Tasks"
          component={MyTasksScreen}
          options={{ tabBarLabel: "Tasks", headerShown: false }}
        />
      ) : (
        <Tab.Screen
          name="Leave"
          component={MyLeavesScreen}
          options={{ tabBarLabel: "Leaves", headerShown: false }}
        />
      )}
      <Tab.Screen
        name="EmployeeProfile"
        component={EmployeeProfileScreen}
        options={{ tabBarLabel: "More", headerShown: false }}
      />

    </Tab.Navigator>
  );
};

// 2. Main Stack Navigator
const EmployeeStackScreen = () => {
  return (
    <Stack.Navigator
      initialRouteName="MainTabs"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MainTabs" component={EmployeeBottomTabs} options={{ headerShown: false }} />
      <Stack.Screen name="LeadsEngine" component={EmployeeLeadsScreen} />
      <Stack.Screen name="EmployeeLeads" component={EmployeeLeadsScreen} />

      {/* Secondary Screens */}
      <Stack.Screen name="CheckInCheckOut" component={EmployeePunchScreen} />
      <Stack.Screen name="RegularizationRequest" component={EmployeeRegularizationRequestScreen} />
      <Stack.Screen name="AttendanceDetails" component={EmployeeAttendanceDetailsScreen} />
      <Stack.Screen name="EmployeeMonthlyAttendance" component={EmployeeMonthlyAttendanceScreen} />
      <Stack.Screen name="Leave" component={MyLeavesScreen} />
      <Stack.Screen name="EmployeeApplyLeave" component={EmployeeApplyLeaveScreen} />
      <Stack.Screen name="EmployeeLeaveDetails" component={EmployeeLeaveDetailsScreen} />

      {/* Hidden Sidebar Screens that now hide bottom tabs */}
      <Stack.Screen name="WorkTracker" component={WorkTrackerScreen} />
      <Stack.Screen name="Timesheet" component={TimesheetScreen} />
      <Stack.Screen name="Payslips" component={MyPayslipsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Announcements" component={AnnouncementsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="EmployeeLeaveBalance" component={EmployeeLeaveBalanceScreen} />
      <Stack.Screen name="EmployeeHolidayCalendar" component={EmployeeHolidayCalendarScreen} />
      <Stack.Screen name="EmployeeHolidayDetails" component={EmployeeHolidayDetailsScreen} />
      <Stack.Screen name="EmployeePayslipDetails" component={EmployeePayslipDetailsScreen} />
      <Stack.Screen name="EmployeeNotificationDetails" component={EmployeeNotificationDetailsScreen} />
      <Stack.Screen name="EmployeeAnnouncementDetails" component={EmployeeAnnouncementDetailsScreen} />
      <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
      <Stack.Screen name="EmployeeEditProfile" component={EmployeeEditProfileScreen} />
      <Stack.Screen name="EmployeeDocuments" component={EmployeeDocumentsScreen} />
      <Stack.Screen name="LeadDetails" component={EmployeeLeadDetailsScreen} />
      <Stack.Screen name="LeadDetailsScreen" component={EmployeeLeadDetailsScreen} />
      <Stack.Screen name="EmployeeLeadDetails" component={EmployeeLeadDetailsScreen} />

      {/* Task & Project Secondary Screens */}
      <Stack.Screen name="EmployeeTaskBoard" component={EmployeeTaskBoardScreen} />
      <Stack.Screen name="EmployeeTaskDetails" component={EmployeeTaskDetailsScreen} />
      <Stack.Screen name="EmployeeCreateTask" component={EmployeeCreateTaskScreen} />
      <Stack.Screen name="Projects" component={MyProjectsScreen} />
      <Stack.Screen name="EmployeeProjectDetails" component={EmployeeProjectDetailsScreen} />
      <Stack.Screen name="EmployeeProjectTasks" component={EmployeeProjectTasksScreen} />
      <Stack.Screen name="EmployeeProjectActivity" component={EmployeeProjectActivityScreen} />
      <Stack.Screen name="CompanyRequests" component={CompanyRequestsScreen} />
    </Stack.Navigator>
  );
};

// 3. Root Employee Navigator wrapping in LayoutProvider and Drawer
const EmployeeNavigator = () => {
  return (
    <LayoutProvider>
      <Drawer.Navigator
        initialRouteName="EmployeeStack"
        drawerContent={(props) => <EmployeeDrawerContent {...props} />}
        screenOptions={{
          headerShown: false,
          drawerStyle: {
            width: "75%",
          },
        }}
      >
        <Drawer.Screen name="EmployeeStack" component={EmployeeStackScreen} options={{ headerShown: false }} />
      </Drawer.Navigator>
    </LayoutProvider>
  );
};

const styles = StyleSheet.create({
  customTabButtonContainer: {
    top: -12,
    justifyContent: "center",
    alignItems: "center",
  },
  customTabButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#C2410C",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#C2410C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
});

export default EmployeeNavigator;
