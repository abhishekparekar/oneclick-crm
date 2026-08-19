import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../../api/api";
import { useAuth } from "../../context/AuthContext";

const formatWorkingHours = (hours) => {
  if (hours === undefined || hours === null || isNaN(hours) || hours === 0) return "—";
  let hrs = Math.floor(hours);
  let mins = Math.round((hours - hrs) * 60);
  if (mins === 60) {
    hrs += 1;
    mins = 0;
  }
  return `${hrs} hr ${mins} min`;
};

const EmployeeDailyAttendanceScreen = ({ route, navigation }) => {
  const { employee, date, record } = route.params;
  const { user } = useAuth();
  const isHR = user?.role === "HR";

  // Initial Status State (Default to whatever the record has, or empty)
  const initialStatus = record?.status || "";
  const [selectedStatus, setSelectedStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);

  const displayDate = new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).replace(/ /g, ""); // e.g. 29May2026

  const handleStatusChange = async (newStatus) => {
    setSelectedStatus(newStatus);
    
    // Auto-save the override
    try {
      setLoading(true);
      const payload = {
        employeeId: employee._id,
        date: date,
        status: newStatus,
        manualReason: "Admin override from Daily Details Screen",
      };

      const endpoint = isHR ? "/hr/attendance/manual-update" : "/company/attendance/manual-update";
      
      if (record) {
        await api.patch(`${isHR ? '/hr/attendance' : '/company/attendance'}/${record._id}/manual-update`, payload);
      } else {
        await api.post(endpoint, payload);
      }
      
      Alert.alert("Success", "Attendance status updated.");
    } catch (err) {
      Alert.alert("Error", "Failed to update attendance status.");
      setSelectedStatus(initialStatus); // Revert
    } finally {
      setLoading(false);
    }
  };

  const StatusButton = ({ label, value, type }) => {
    const isSelected = selectedStatus === value;
    
    // Default Outline styles based on type
    let borderColor = "#9ca3af";
    let textColor = "#6b7280";
    let bgColor = "#fff";

    switch(type) {
      case "present":
        borderColor = "#10b981"; textColor = "#10b981";
        if (isSelected) { bgColor = "#10b981"; textColor = "#fff"; }
        break;
      case "absent":
        borderColor = "#ef4444"; textColor = "#ef4444";
        if (isSelected) { bgColor = "#fecaca"; }
        break;
      case "week_off":
        borderColor = "#9ca3af"; textColor = "#6b7280";
        if (isSelected) { bgColor = "#e5e7eb"; }
        break;
      case "holiday":
        borderColor = "#9ca3af"; textColor = "#6b7280";
        bgColor = "#e5e7eb"; // Holiday is grey filled by default in mockup
        if (isSelected) { borderColor = "#4b5563"; textColor = "#4b5563"; }
        break;
      case "half_day":
        borderColor = "#f59e0b"; textColor = "#f59e0b";
        if (isSelected) { bgColor = "#fef3c7"; }
        break;
      case "paid_leave":
        borderColor = "#3b82f6"; textColor = "#3b82f6";
        if (isSelected) { bgColor = "#dbeafe"; }
        break;
      case "unpaid_leave":
        borderColor = "#ec4899"; textColor = "#ec4899";
        if (isSelected) { bgColor = "#fce7f3"; }
        break;
    }

    return (
      <TouchableOpacity
        style={[styles.statusBtn, { borderColor, backgroundColor: bgColor }]}
        onPress={() => handleStatusChange(value)}
        disabled={loading}
      >
        <Text style={[styles.statusBtnText, { color: textColor }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
          <Text style={styles.headerTitle}>{employee.firstName}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.locationBtn}>
          <Ionicons name="location" size={14} color="#fff" />
          <Text style={styles.locationBtnText}>Location</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.dateRow}>
          <Text style={styles.dateText}>{displayDate}</Text>
          <Text style={styles.noDataText}>{!record ? "No Data Found" : ""}</Text>
        </View>

        {record && (record.punchInTime || record.punchOutTime) && (
          <View style={styles.timeInfoCard}>
            <View style={styles.timeCol}>
              <Text style={styles.timeLabel}>PUNCH IN</Text>
              <Text style={styles.timeValue}>
                {record.punchInTime ? new Date(record.punchInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}
              </Text>
            </View>
            <View style={styles.timeDivider} />
            <View style={styles.timeCol}>
              <Text style={styles.timeLabel}>PUNCH OUT</Text>
              <Text style={styles.timeValue}>
                {record.punchOutTime ? new Date(record.punchOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}
              </Text>
            </View>
            <View style={styles.timeDivider} />
            <View style={styles.timeCol}>
              <Text style={styles.timeLabel}>TOTAL</Text>
              <Text style={[styles.timeValue, { color: "#2563eb" }]}>
                {record.totalHours ? formatWorkingHours(record.totalHours) : "—"}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.btnRow}>
          <StatusButton label="Present" value="present" type="present" />
          <StatusButton label="Absent" value="absent" type="absent" />
          <StatusButton label="Week Off" value="week_off" type="week_off" />
        </View>
        <View style={styles.btnRow}>
          <StatusButton label="Holiday" value="holiday" type="holiday" />
          <StatusButton label="Half Day" value="half_day" type="half_day" />
        </View>

        <Text style={styles.sectionTitle}>Leave</Text>
        <View style={styles.btnRow}>
          <StatusButton label="Paid Leave" value="paid_leave" type="paid_leave" />
          <StatusButton label="Unpaid Leave" value="unpaid_leave" type="unpaid_leave" />
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.punchBtn, { backgroundColor: "#dcfce7" }]}>
          <Text style={[styles.punchBtnText, { color: "#16a34a" }]}>+ Add Punch In</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.punchBtn, { backgroundColor: "#fee2e2" }]}>
          <Text style={[styles.punchBtnText, { color: "#dc2626" }]}>+ Add Punch Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6f8",
  },
  header: {
    backgroundColor: "#C2410C",
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 8,
  },
  locationBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10b981",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  locationBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
    marginLeft: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  dateText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  noDataText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
  },
  timeInfoCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 20,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  timeCol: {
    flex: 1,
    alignItems: "center",
  },
  timeLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  timeDivider: {
    width: 1,
    backgroundColor: "#e2e8f0",
    marginHorizontal: 8,
  },
  btnRow: {
    flexDirection: "row",
    marginBottom: 12,
    flexWrap: "wrap",
  },
  statusBtn: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginRight: 10,
    marginBottom: 10,
    minWidth: 100,
    alignItems: "center",
  },
  statusBtnText: {
    fontWeight: "700",
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#334155",
    marginTop: 10,
    marginBottom: 16,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  punchBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 6,
  },
  punchBtnText: {
    fontWeight: "700",
    fontSize: 14,
  },
});

export default EmployeeDailyAttendanceScreen;
