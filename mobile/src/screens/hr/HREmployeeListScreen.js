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
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import HRHeader from "../../components/HRHeader";
import { getHREmployeesApi, patchHREmployeeStatusApi } from "../../api/hrService";
import AppButton from "../../components/AppButton";
import { useAuth } from "../../context/AuthContext";

const HREmployeeListScreen = ({ navigation }) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");
  
  // Status confirm modal
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchEmployees = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await getHREmployeesApi();
      if (response.data && response.data.employees) {
        // Exclude currently logged-in user
        const cleanList = (response.data.employees || []).filter((emp) => emp.userId !== user?._id && emp._id !== user?.employeeId);
        setEmployees(cleanList);
        applyFilters(cleanList, searchText);
      } else {
        setEmployees([]);
        setFilteredEmployees([]);
      }
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to load employee list");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchEmployees();
    }, [])
  );

  const applyFilters = (list, text) => {
    if (!text) {
      setFilteredEmployees(list);
      return;
    }
    const cleanText = text.toLowerCase().trim();
    const filtered = list.filter((emp) => {
      const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
      const code = (emp.employeeCode || "").toLowerCase();
      const dept = emp.departmentId?.name ? emp.departmentId.name.toLowerCase() : "";
      return fullName.includes(cleanText) || code.includes(cleanText) || dept.includes(cleanText);
    });
    setFilteredEmployees(filtered);
  };

  const handleSearchChange = (text) => {
    setSearchText(text);
    applyFilters(employees, text);
  };

  const handleToggleStatus = (emp) => {
    setSelectedEmp(emp);
    setStatusModalVisible(true);
  };

  const confirmStatusChange = async () => {
    if (!selectedEmp) return;
    const newStatus = selectedEmp.status === "active" ? "inactive" : "active";

    try {
      setUpdatingStatus(true);
      await patchHREmployeeStatusApi(selectedEmp._id, newStatus);
      Alert.alert("Success", `Employee status updated to ${newStatus}`);
      setStatusModalVisible(false);
      fetchEmployees(true);
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to update status");
    } finally {
      setUpdatingStatus(false);
      setSelectedEmp(null);
    }
  };

  const getStatusBadge = (status) => {
    const isAct = status === "active";
    return (
      <View style={[styles.badge, isAct ? styles.badgeGreen : styles.badgeRed]}>
        <Text style={[styles.badgeText, { color: isAct ? "#16a34a" : "#dc2626" }]}>
          {status.toUpperCase()}
        </Text>
      </View>
    );
  };

  const renderEmployeeCard = ({ item }) => {
    const empName = `${item.firstName} ${item.lastName}`;
    const code = item.employeeCode || "N/A";
    const deptName = item.departmentId?.name || "No Department";
    const desigName = (item.role === "CompanyAdmin" || item.userId?.role === "CompanyAdmin") ? "" : (item.designationId?.name || "No Designation");

    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardContent}
          onPress={() => navigation.navigate("HREmployeeDetails", { employeeId: item._id })}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.firstName[0].toUpperCase()}
                {item.lastName[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.empInfo}>
              <Text style={styles.empName}>{empName}</Text>
              <Text style={styles.empCode}>Code: {code} • {item.employmentType}</Text>
            </View>
            {getStatusBadge(item.status)}
          </View>

          <View style={styles.divider} />

          <View style={styles.detailsRow}>
            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>Department</Text>
              <Text style={styles.detailVal} numberOfLines={1}>{deptName}</Text>
            </View>
            {desigName !== "" ? (
              <View style={styles.detailCol}>
                <Text style={styles.detailLabel}>Designation</Text>
                <Text style={styles.detailVal} numberOfLines={1}>{desigName}</Text>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate("HREditEmployee", { employeeId: item._id })}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={16} color="#1268D9" />
            <Text style={[styles.actionBtnText, { color: "#1268D9" }]}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleToggleStatus(item)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={item.status === "active" ? "lock-closed-outline" : "lock-open-outline"}
              size={16}
              color={item.status === "active" ? "#dc2626" : "#16a34a"}
            />
            <Text style={[styles.actionBtnText, { color: item.status === "active" ? "#dc2626" : "#16a34a" }]}>
              {item.status === "active" ? "Deactivate" : "Activate"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <HRHeader title="Team Members" />
      
      {/* Search Header Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, code, department..."
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
          <ActivityIndicator size="large" color="#1268D9" />
          <Text style={styles.loadingText}>Loading employee roster...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredEmployees}
          keyExtractor={(item) => item._id}
          renderItem={renderEmployeeCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchEmployees(true)} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#cbd5e1" />
              <Text style={styles.emptyText}>No employees matching search criteria</Text>
            </View>
          }
        />
      )}

      {/* Floating Add Button */}
      <TouchableOpacity
        style={[styles.fab, { bottom: Math.max(20, insets.bottom + 20) }]}
        onPress={() => navigation.navigate("HRAddEmployee")}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={30} color="#ffffff" />
      </TouchableOpacity>

      {/* Confirm Deactivation Status Modal */}
      <Modal visible={statusModalVisible} transparent animationType="fade">
        <View style={styles.modalBgDim}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons
                name="alert-circle-outline"
                size={40}
                color={selectedEmp?.status === "active" ? "#dc2626" : "#16a34a"}
              />
              <Text style={styles.modalTitle}>Confirm Action</Text>
            </View>
            <Text style={styles.modalMessage}>
              Are you sure you want to {selectedEmp?.status === "active" ? "DEACTIVATE" : "ACTIVATE"}{" "}
              employee <Text style={{ fontWeight: "700" }}>{selectedEmp?.firstName} {selectedEmp?.lastName}</Text>?
              {selectedEmp?.status === "active"
                ? " This will disable their login access immediately."
                : " This will restore their system login access."}
            </Text>
            <View style={styles.modalActions}>
              <AppButton
                title="Cancel"
                style={styles.cancelBtn}
                textStyle={{ color: "#475569" }}
                onPress={() => setStatusModalVisible(false)}
              />
              <AppButton
                title={updatingStatus ? "Processing..." : selectedEmp?.status === "active" ? "Deactivate" : "Activate"}
                style={[styles.confirmBtn, { backgroundColor: selectedEmp?.status === "active" ? "#dc2626" : "#16a34a" }]}
                loading={updatingStatus}
                onPress={confirmStatusChange}
              />
            </View>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 100,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    overflow: "hidden",
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  avatarText: {
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "700",
  },
  empInfo: {
    marginLeft: 12,
    flex: 1,
  },
  empName: {
    fontSize: 14.5,
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
  badgeGreen: {
    backgroundColor: "#dcfce7",
  },
  badgeRed: {
    backgroundColor: "#fef2f2",
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
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailCol: {
    width: "48%",
  },
  detailLabel: {
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  detailVal: {
    fontSize: 12.5,
    color: "#334155",
    marginTop: 2,
    fontWeight: "600",
  },
  cardActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    backgroundColor: "#f8fafc",
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: "#f1f5f9",
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
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
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    backgroundColor: "#1268D9",
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#1268D9",
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
  modalBgDim: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    width: "90%",
    alignItems: "center",
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1e293b",
    marginTop: 8,
  },
  modalMessage: {
    fontSize: 13,
    color: "#475569",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  cancelBtn: {
    backgroundColor: "#f1f5f9",
    width: "48%",
    height: 44,
  },
  confirmBtn: {
    width: "48%",
    height: 44,
  },
});

export default HREmployeeListScreen;
