import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CompanyAdminLayout from "../../components/CompanyAdminLayout";
import AppButton from "../../components/AppButton";
import {
  getLeaveBalanceApi,
  updateLeaveBalanceApi,
} from "../../api/companyService";
import { COLORS, FONTS, SHADOWS, ROUNDING, SPACING } from "../../theme/tokens";

const LeaveBalanceScreen = ({ navigation }) => {
  const { user } = useAuth();
  const isHR = user?.role === "HR";
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  // Edit balance Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [casual, setCasual] = useState("12");
  const [sick, setSick] = useState("10");
  const [annual, setAnnual] = useState("15");
  const [lop, setLop] = useState("0");
  const [submitting, setSubmitting] = useState(false);

  const fetchBalances = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const { data } = await getLeaveBalanceApi();
      if (data && data.balances) {
        setBalances(data.balances);
      }
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to load leave balances");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, []);

  const handleEditPress = (item) => {
    setSelectedEmployee(item.employeeId);
    setCasual(String(item.casual ?? 12));
    setSick(String(item.sick ?? 10));
    setAnnual(String(item.annual ?? 15));
    setLop(String(item.lop ?? 0));
    setModalVisible(true);
  };

  const submitEdit = async () => {
    if (!selectedEmployee) return;
    try {
      setSubmitting(true);
      const data = {
        casual: parseInt(casual) || 0,
        sick: parseInt(sick) || 0,
        annual: parseInt(annual) || 0,
        lop: parseInt(lop) || 0,
      };
      await updateLeaveBalanceApi(selectedEmployee._id, data);
      Alert.alert("Success", "Leave balances updated successfully");
      setModalVisible(false);
      fetchBalances();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to update leave balance");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredBalances = balances.filter((item) => {
    const fullName = `${item.employeeId?.firstName || ""} ${item.employeeId?.lastName || ""}`.toLowerCase();
    return fullName.includes(search.toLowerCase()) || 
      (item.employeeId?.employeeCode || "").toLowerCase().includes(search.toLowerCase());
  });

  const renderBalanceItem = ({ item }) => {
    const employeeName = item.employeeId
      ? `${item.employeeId.firstName || ""} ${item.employeeId.lastName || ""}`.trim() || "Employee"
      : "Unknown Employee";
    const employeeCode = item.employeeId?.employeeCode || "N/A";
    const deptName = item.employeeId?.departmentId?.name || item.employeeId?.department || "General";

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>
                {((item.employeeId?.firstName || "E")[0] + ((item.employeeId?.lastName || "")[0] || "")).toUpperCase()}
              </Text>
            </View>
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.employeeName} numberOfLines={1}>{employeeName}</Text>
              <Text style={styles.employeeCode}>Code: {employeeCode} • {deptName}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => handleEditPress(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={14} color="#1268D9" />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.gridContainer}>
          <View style={[styles.gridCell, styles.casualBg]}>
            <Text style={styles.cellLabel}>Casual</Text>
            <Text style={[styles.cellValue, styles.casualText]}>{item.casual ?? 0} <Text style={styles.unitText}>days</Text></Text>
          </View>
          <View style={[styles.gridCell, styles.sickBg]}>
            <Text style={styles.cellLabel}>Sick</Text>
            <Text style={[styles.cellValue, styles.sickText]}>{item.sick ?? 0} <Text style={styles.unitText}>days</Text></Text>
          </View>
          <View style={[styles.gridCell, styles.annualBg]}>
            <Text style={styles.cellLabel}>Annual</Text>
            <Text style={[styles.cellValue, styles.annualText]}>{item.annual ?? 0} <Text style={styles.unitText}>days</Text></Text>
          </View>
          <View style={[styles.gridCell, styles.lopBg]}>
            <Text style={styles.cellLabel}>LOP (Unpaid)</Text>
            <Text style={[styles.cellValue, styles.lopText]}>{item.lop ?? 0} <Text style={styles.unitText}>days</Text></Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <CompanyAdminLayout
      navigation={navigation}
      activeTab="Leaves"
      hideBottomNav={isHR}
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search employee name or code..."
    >
      <View style={styles.screenHeader}>
        <Text style={styles.title}>Employee Leave Balances</Text>
        <Text style={styles.subtitle}>Allocated yearly limits per employee</Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Fetching leave balances...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBalances}
          keyExtractor={(item) => item._id}
          renderItem={renderBalanceItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchBalances(true)} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="hourglass-outline" size={64} color="#94a3b8" />
              <Text style={styles.emptyText}>No leave balances found</Text>
            </View>
          }
        />
      )}

      {/* Edit Balance Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Edit Balance: {selectedEmployee ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}` : ""}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text.muted} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Casual Leave Balance</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={casual}
                onChangeText={setCasual}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Sick Leave Balance</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={sick}
                onChangeText={setSick}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Annual Leave Balance</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={annual}
                onChangeText={setAnnual}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>LOP (Unpaid Leave Count)</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={lop}
                onChangeText={setLop}
              />
            </View>

            <View style={styles.modalActions}>
              <AppButton
                title="Cancel"
                variant="outline"
                style={styles.modalBtn}
                onPress={() => setModalVisible(false)}
              />
              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={submitEdit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.submitBtnText}>Save Balance</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </CompanyAdminLayout>
  );
};

const styles = StyleSheet.create({
  screenHeader: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  title: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    color: COLORS.text.dark,
  },
  subtitle: {
    fontSize: 12.5,
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: ROUNDING.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  employeeName: {
    fontSize: 15,
    fontFamily: FONTS.displayBold,
    color: COLORS.text.dark,
  },
  employeeCode: {
    fontSize: 12,
    color: COLORS.text.light,
    fontFamily: FONTS.body,
    marginTop: 1,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1268D9",
  },
  unitText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
  },
  editBtnText: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: "#1268D9",
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 12,
  },
  gridContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  gridCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: ROUNDING.sm,
    marginHorizontal: 3,
  },
  cellLabel: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    color: COLORS.text.muted,
    textTransform: "uppercase",
  },
  cellValue: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    marginTop: 4,
  },
  casualBg: { backgroundColor: "#fffbeb" },
  casualText: { color: "#d97706" },
  sickBg: { backgroundColor: "#fef2f2" },
  sickText: { color: COLORS.danger },
  annualBg: { backgroundColor: "#f0fdfa" },
  annualText: { color: COLORS.success },
  lopBg: { backgroundColor: "#f8fafc" },
  lopText: { color: COLORS.text.muted },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.text.muted,
    fontFamily: FONTS.bodyMedium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: ROUNDING.lg,
    padding: 20,
    ...SHADOWS.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 15,
    fontFamily: FONTS.displayBold,
    color: COLORS.text.dark,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.text.muted,
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: FONTS.body,
    color: COLORS.text.dark,
    backgroundColor: "#f8fafc",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
  },
  modalBtn: {
    width: 100,
    marginRight: 8,
  },
  submitBtn: {
    backgroundColor: "#1268D9",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    width: 120,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
  },
});

export default LeaveBalanceScreen;
