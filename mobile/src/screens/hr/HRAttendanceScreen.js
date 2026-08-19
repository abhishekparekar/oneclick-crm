import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import HRHeader from "../../components/HRHeader";
import { getHRAttendanceApi } from "../../api/hrService";

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

const HRAttendanceScreen = ({ navigation }) => {
  const [attendance, setAttendance] = useState([]);
  const [filteredAttendance, setFilteredAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");

  const fetchAttendance = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await getHRAttendanceApi();
      if (response.data && response.data.attendance) {
        setAttendance(response.data.attendance);
        applyFilters(response.data.attendance, searchText);
      } else {
        setAttendance([]);
        setFilteredAttendance([]);
      }
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to load company attendance");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAttendance();
    }, [])
  );

  const applyFilters = (list, text) => {
    if (!text) {
      setFilteredAttendance(list);
      return;
    }
    const cleanText = text.toLowerCase().trim();
    const filtered = list.filter((item) => {
      const empName = item.employeeId
        ? `${item.employeeId.firstName} ${item.employeeId.lastName}`.toLowerCase()
        : "";
      const code = item.employeeId?.employeeCode ? item.employeeId.employeeCode.toLowerCase() : "";
      const date = item.date || "";
      return empName.includes(cleanText) || code.includes(cleanText) || date.includes(cleanText);
    });
    setFilteredAttendance(filtered);
  };

  const handleSearchChange = (text) => {
    setSearchText(text);
    applyFilters(attendance, text);
  };

  const getStatusBadge = (status) => {
    let color = "#16a34a";
    let bg = "#dcfce7";
    
    if (status === "late") {
      color = "#ea580c";
      bg = "#ffedd5";
    } else if (status === "half-day" || status === "half_day") {
      color = "#d97706";
      bg = "#fef3c7";
    } else if (status === "absent") {
      color = "#dc2626";
      bg = "#fee2e2";
    } else if (status === "paid_leave") {
      color = "#2563eb";
      bg = "#eff6ff";
    } else if (status === "unpaid_leave") {
      color = "#db2777";
      bg = "#fdf2f8";
    }

    return (
      <View style={[styles.badge, { backgroundColor: bg }]}>
        <Text style={[styles.badgeText, { color }]}>{status.toUpperCase()}</Text>
      </View>
    );
  };

  const renderAttendanceCard = ({ item }) => {
    const empName = item.employeeId
      ? `${item.employeeId.firstName} ${item.employeeId.lastName}`
      : "Clocked Member";
    const empCode = item.employeeId?.employeeCode || "N/A";
    const inTimeStr = item.checkInTime
      ? new Date(item.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "--:--";
    const outTimeStr = item.checkOutTime
      ? new Date(item.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "--:--";

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("HRAttendanceDetails", { item })}
        activeOpacity={0.7}
      >
        <View style={styles.cardRow}>
          <View style={styles.avatar}>
            <Ionicons name="time-outline" size={20} color="#2563eb" />
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.empName}>{empName}</Text>
            <Text style={styles.empCode}>Code: {empCode} • Date: {item.date}</Text>
          </View>
          {getStatusBadge(item.status)}
        </View>

        <View style={styles.divider} />

        <View style={styles.timeGrid}>
          <View style={styles.timeCol}>
            <Text style={styles.timeLabel}>Check In</Text>
            <Text style={styles.timeVal}>{inTimeStr}</Text>
          </View>
          <View style={styles.timeCol}>
            <Text style={styles.timeLabel}>Check Out</Text>
            <Text style={styles.timeVal}>{outTimeStr}</Text>
          </View>
          <View style={styles.timeCol}>
            <Text style={styles.timeLabel}>Total Hours</Text>
            <Text style={[styles.timeVal, { color: "#2563eb" }]}>
              {item.totalHours ? formatWorkingHours(item.totalHours) : "—"}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <HRHeader title="Attendance" />
      
      {/* Search Header Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search check-ins by employee name..."
            placeholderTextColor="#94a3b8"
            value={searchText}
            onChangeText={handleSearchChange}
          />
          {searchText ? (
            <TouchableOpacity onPress={() => handleSearchChange("")}>
              <Ionicons name="close-circle" size={18} color="#64748b" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Fetching company attendance logs...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAttendance}
          keyExtractor={(item) => item._id}
          renderItem={renderAttendanceCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchAttendance(true)} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={64} color="#cbd5e1" />
              <Text style={styles.emptyText}>No attendance records found</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  searchBarContainer: {
    backgroundColor: "#ffffff",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#1e293b",
    padding: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748b",
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  infoCol: {
    marginLeft: 12,
    flex: 1,
  },
  empName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
  },
  empCode: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
    fontWeight: "500",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: "800",
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 12,
  },
  timeGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  timeCol: {
    width: "30%",
  },
  timeLabel: {
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  timeVal: {
    fontSize: 12.5,
    color: "#334155",
    marginTop: 2,
    fontWeight: "700",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
});

export default HRAttendanceScreen;
