import { View, Text, StyleSheet } from "react-native";
import AppButton from "../../components/AppButton";
import { useAuth } from "../../context/AuthContext";
import { isEmployeeRole } from "../../utils/roleHelpers";

const AttendanceScreen = ({ navigation }) => {
  const { user } = useAuth();
  const isAdminHr = user?.role === "CompanyAdmin" || user?.role === "HR";
  const isManager = user?.role === "Manager";
  const isEmployee = isEmployeeRole(user?.role);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Attendance</Text>
      <Text style={styles.subtitle}>Role: {user?.role}</Text>

      {isEmployee && (
        <AppButton
          title="My Attendance"
          onPress={() => navigation.navigate("EmployeeMonthlyAttendance")}
          style={styles.btn}
        />
      )}

      {isEmployee && (
        <AppButton
          title="Check In / Check Out"
          onPress={() => navigation.navigate("CheckInCheckOut")}
          style={styles.btn}
        />
      )}

      {isEmployee && (
        <AppButton
          title="Request Regularization"
          onPress={() => navigation.navigate("RegularizationRequest")}
          variant="outline"
          style={styles.btn}
        />
      )}

      {(isAdminHr || isManager) && (
        <AppButton
          title="Company Attendance"
          onPress={() => navigation.navigate("CompanyAttendance")}
          style={styles.btn}
        />
      )}

      {isAdminHr && (
        <AppButton
          title="Regularization Approval"
          onPress={() => navigation.navigate("RegularizationApproval")}
          variant="outline"
          style={styles.btn}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f3f4f6" },
  title: { fontSize: 24, fontWeight: "700", color: "#111827", marginBottom: 4 },
  subtitle: { color: "#6b7280", marginBottom: 16 },
  btn: { marginTop: 10 },
});

export default AttendanceScreen;
