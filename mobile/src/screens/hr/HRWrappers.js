import React from "react";
import { View, StyleSheet } from "react-native";
import HRHeader from "../../components/HRHeader";
import HRManageAttendanceScreen from "./HRManageAttendanceScreen";

// Import Shared Screen Components
import AddEmployeeScreen from "../company/AddEmployeeScreen";
import EditEmployeeScreen from "../company/EditEmployeeScreen";
import EmployeeDetailsScreen from "../company/EmployeeDetailsScreen";
import AttendanceDetailsScreen from "../attendance/AttendanceDetailsScreen";
import RegularizationApprovalScreen from "../attendance/RegularizationApprovalScreen";
import HolidayListScreen from "../company/HolidayListScreen";
import LeaveBalanceScreen from "../company/LeaveBalanceScreen";
import MyAttendanceScreen from "../attendance/MyAttendanceScreen";
import SettingsScreen from "../employee/SettingsScreen";
import PayrollListScreen from "../company/PayrollListScreen";
import SalaryStructureScreen from "../company/SalaryStructureScreen";
import ReportsDashboardScreen from "../reports/ReportsDashboardScreen";
import CompanyAnnouncementsScreen from "../company/CompanyAnnouncementsScreen";
import CompanyAuditLogsScreen from "../company/CompanyAuditLogsScreen";
import CompanyProfileScreen from "../company/CompanyProfileScreen";
import EmployeeProfileScreen from "../employee/EmployeeProfileScreen";
import DepartmentListScreen from "../company/DepartmentListScreen";
import DesignationListScreen from "../company/DesignationListScreen";
import BranchListScreen from "../company/BranchListScreen";
import ProjectListScreen from "../company/ProjectListScreen";
import TaskBoardScreen from "../company/TaskBoardScreen";
import CompanyProjectDetailsScreen from "../company/CompanyProjectDetailsScreen";
import CompanyTaskDetailsScreen from "../company/CompanyTaskDetailsScreen";
import CompanyCreateTaskScreen from "../company/CompanyCreateTaskScreen";
import CompanyCreateProjectScreen from "../company/CompanyCreateProjectScreen";

// Import other screens
import AddEditDepartmentScreen from "../company/AddEditDepartmentScreen";
import AddEditDesignationScreen from "../company/AddEditDesignationScreen";
import AddEditBranchScreen from "../company/AddEditBranchScreen";

// Wrappers: Only add HRHeader for screens that do NOT have their own layout
export const HRAddEmployeeScreen = (props) => <AddEmployeeScreen {...props} />;

export const HREditEmployeeScreen = (props) => <EditEmployeeScreen {...props} />;

export const HREmployeeDetailsScreen = (props) => <EmployeeDetailsScreen {...props} />;

export const HRAttendanceDetailsScreen = (props) => (
  <View style={styles.container}>
    <HRHeader title="Attendance Details" showBack={true} />
    <AttendanceDetailsScreen {...props} />
  </View>
);

export const HRRegularizationApprovalScreen = (props) => (
  <View style={styles.container}>
    <HRHeader title="Attendance Regularization" showBack={true} />
    <RegularizationApprovalScreen {...props} />
  </View>
);

export const HRHolidayListScreen = (props) => <HolidayListScreen {...props} />;

export const HRLeaveBalanceScreen = (props) => <LeaveBalanceScreen {...props} />;

export const HRPayrollListScreen = (props) => {
  const newProps = {
    ...props,
    route: {
      ...props.route,
      params: { ...props.route?.params, activeTab: "history" }
    }
  };
  return <PayrollListScreen {...newProps} />;
};

export const HRPayrollGenerateScreen = (props) => {
  const newProps = {
    ...props,
    route: {
      ...props.route,
      params: { ...props.route?.params, activeTab: "generate" }
    }
  };
  return <PayrollListScreen {...newProps} />;
};

export const HRSalaryStructureScreen = (props) => <SalaryStructureScreen {...props} />;

export const HRReportsDashboardScreen = (props) => <ReportsDashboardScreen {...props} />;

export const HRAnnouncementsScreen = (props) => <CompanyAnnouncementsScreen {...props} />;

export const HRAuditLogsScreen = (props) => <CompanyAuditLogsScreen {...props} />;

export const HRProfileScreen = (props) => (
  <View style={styles.container}>
    <HRHeader title="Profile" showBack={true} />
    <EmployeeProfileScreen {...props} />
  </View>
);

export const HRCompanyProfileScreen = (props) => <CompanyProfileScreen {...props} />;

export const HRDepartmentListScreen = (props) => <DepartmentListScreen {...props} />;

export const HRDesignationListScreen = (props) => <DesignationListScreen {...props} />;

export const HRBranchListScreen = (props) => <BranchListScreen {...props} />;

export const HRAddEditDepartmentScreen = (props) => (
  <View style={styles.container}>
    <HRHeader title="Department Form" showBack={true} />
    <AddEditDepartmentScreen {...props} />
  </View>
);

export const HRAddEditDesignationScreen = (props) => (
  <View style={styles.container}>
    <HRHeader title="Designation Form" showBack={true} />
    <AddEditDesignationScreen {...props} />
  </View>
);

export const HRAddEditBranchScreen = (props) => (
  <View style={styles.container}>
    <HRHeader title="Branch Form" showBack={true} />
    <AddEditBranchScreen {...props} />
  </View>
);

export const HRProjectListScreen = (props) => <ProjectListScreen {...props} />;

export const HRTaskBoardScreen = (props) => <TaskBoardScreen {...props} />;

export const HRAttendanceScreen = (props) => <HRManageAttendanceScreen {...props} />;

export const HRProjectDetailsScreen = (props) => <CompanyProjectDetailsScreen {...props} />;

export const HRTaskDetailsScreen = (props) => <CompanyTaskDetailsScreen {...props} />;

export const HRCreateTaskScreen = (props) => <CompanyCreateTaskScreen {...props} />;

export const HRCreateProjectScreen = (props) => <CompanyCreateProjectScreen {...props} />;

export const HRMyAttendanceScreen = (props) => (
  <View style={styles.container}>
    <HRHeader title="My Attendance" showBack={true} />
    <MyAttendanceScreen {...props} />
  </View>
);

export const HRSettingsScreen = (props) => <SettingsScreen {...props} />;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
});
