import { useCallback, useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Image,
  Modal,
  FlatList as ModalList,
  Alert,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import CompanyAdminLayout from "../../components/CompanyAdminLayout";
import Loader from "../../components/Loader";
import AppButton from "../../components/AppButton";
import StatusBadge from "../../components/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { getDepartmentsApi } from "../../api/companyService";
import { getEmployeesApi, deleteEmployeeApi } from "../../api/employeeService";
import { COLORS, FONTS, SHADOWS, ROUNDING, SPACING } from "../../theme/tokens";

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "on_leave", label: "On Leave" },
  { value: "inactive", label: "Inactive" },
];

const EMPLOYEE_STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "terminated", label: "Terminated" },
];

const LIST_BOTTOM_PADDING = 100;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },

  // Stats Row
  statsRow: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  statCell: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 20,
    fontFamily: FONTS.displayBold,
    lineHeight: 26,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: FONTS.body,
    color: COLORS.text.light,
  },

  // Search
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    gap: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  search: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 14,
    fontFamily: FONTS.body,
    color: COLORS.text.dark,
  },
  filterIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f0fdfa",
    alignItems: "center",
    justifyContent: "center",
  },
  addIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.sm,
  },

  // Tabs
  tabsRow: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingHorizontal: 12,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 3,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginRight: 4,
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.text.muted,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontFamily: FONTS.bodyBold,
  },
  tabCount: {
    fontSize: 11,
    fontFamily: FONTS.body,
    color: COLORS.text.light,
  },
  tabCountActive: {
    color: COLORS.primary,
  },

  // List
  list: { padding: 12, gap: 8 },

  // Card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: ROUNDING.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    ...SHADOWS.sm,
  },
  cardRow: { flexDirection: "row" },
  avatar: { width: 52, height: 52, borderRadius: 26, marginRight: 12 },
  avatarPlaceholder: {
    backgroundColor: "#ccfbf1",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: COLORS.primary, fontSize: 20, fontFamily: FONTS.displayBold },
  cardBody: { flex: 1 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontSize: 15, fontFamily: FONTS.displayBold, color: COLORS.text.dark, flex: 1, marginRight: 8 },
  metaCodeRow: { flexDirection: "row", alignItems: "center", marginTop: 2, gap: 4 },
  code: { fontSize: 11, fontFamily: FONTS.bodyMedium, color: COLORS.text.light },
  metaDot: { fontSize: 11, color: COLORS.text.light },
  dept: { fontSize: 11, fontFamily: FONTS.body, color: COLORS.text.muted, flex: 1 },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 4, gap: 4 },
  meta: { fontSize: 12, fontFamily: FONTS.body, color: COLORS.text.muted },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 16,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 8,
  },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  editLink: { color: COLORS.primary, fontFamily: FONTS.bodyBold, fontSize: 12 },
  deleteLink: { color: COLORS.danger, fontFamily: FONTS.bodyBold, fontSize: 12 },

  // Empty
  emptyWrap: { alignItems: "center", paddingTop: 60, gap: 12 },
  empty: { textAlign: "center", color: COLORS.text.muted, fontFamily: FONTS.body, fontSize: 14 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "flex-end",
  },
  modalBox: {
    backgroundColor: "#fff",
    borderTopLeftRadius: ROUNDING.xl,
    borderTopRightRadius: ROUNDING.xl,
    padding: 20,
    maxHeight: "65%",
    ...SHADOWS.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontFamily: FONTS.displayBold, color: COLORS.text.dark },
  modalItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalItemText: { fontSize: 15, fontFamily: FONTS.body, color: COLORS.text.dark },
  modalItemSelectedText: { fontFamily: FONTS.bodyMedium, color: COLORS.primary },
});


const EmployeeCard = ({ item, navigation, canManage, handleDelete }) => {
  const [imgError, setImgError] = useState(false);
  const photoUrl = item.photo?.trim() || "";
  const showPlaceholder = !photoUrl || imgError;


  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("EmployeeDetails", { employeeId: item._id })}
      activeOpacity={0.75}
    >
      <View style={styles.cardRow}>
        {showPlaceholder ? (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>
              {(item.firstName?.[0] || "?").toUpperCase()}
            </Text>
          </View>
        ) : (
          <Image
            source={{ uri: photoUrl }}
            style={styles.avatar}
            onError={() => setImgError(true)}
          />
        )}
        <View style={styles.cardBody}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>
              {item.firstName} {item.lastName}
            </Text>
            <StatusBadge status={item.status} />
          </View>
          <View style={styles.metaCodeRow}>
            <Text style={styles.code}>{item.employeeCode}</Text>
            {item.designationId?.name && item.role !== "CompanyAdmin" && item.userId?.role !== "CompanyAdmin" ? (
              <>
                <Text style={styles.metaDot}>·</Text>
                <Text style={styles.dept} numberOfLines={1}>
                  {item.designationId?.name}
                </Text>
              </>
            ) : null}
          </View>
          {item.phone ? (
            <View style={styles.metaRow}>
              <Ionicons name="call-outline" size={12} color={COLORS.text.light} />
              <Text style={styles.meta}>{item.phone}</Text>
            </View>
          ) : null}
        </View>
      </View>
      {canManage ? (
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => navigation.navigate("EditEmployee", { employeeId: item._id })}
            style={styles.actionBtn}
          >
            <Ionicons name="create-outline" size={14} color={COLORS.primary} />
            <Text style={styles.editLink}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionBtn}>
            <Ionicons name="trash-outline" size={14} color={COLORS.danger} />
            <Text style={styles.deleteLink}>Delete</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

const EmployeeListScreen = ({ navigation }) => {

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canManage = user?.role === "CompanyAdmin" || user?.role === "HR";

  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [status, setStatus] = useState("");
  const [activeTab, setActiveTab] = useState("");

  const [appliedFilters, setAppliedFilters] = useState({ search: "", departmentId: "", status: "" });

  const [deptModal, setDeptModal] = useState(false);

  // Departments Query
  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await getDepartmentsApi();
      return data.departments || [];
    },
    staleTime: 1000 * 60 * 15,
  });

  // Employees Query
  const { data: employees = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["employees", appliedFilters],
    queryFn: async () => {
      const params = {};
      if (appliedFilters.search) params.search = appliedFilters.search;
      if (appliedFilters.departmentId) params.departmentId = appliedFilters.departmentId;
      if (appliedFilters.status) params.status = appliedFilters.status;
      const { data } = await getEmployeesApi(params);
      return (data.employees || []).filter(
        (emp) => emp.userId !== user?._id && emp._id !== user?.employeeId
      );
    },
  });

  const applyFilters = () => {
    setAppliedFilters({ search: search.trim(), departmentId, status });
  };

  // Stats computed from all employees (unfiltered)
  const { data: allEmployees = [] } = useQuery({
    queryKey: ["employees", { search: "", departmentId: "", status: "" }],
    queryFn: async () => {
      const { data } = await getEmployeesApi({});
      return (data.employees || []).filter(
        (emp) => emp.userId !== user?._id && emp._id !== user?.employeeId
      );
    },
    staleTime: 1000 * 60 * 5,
  });

  const stats = useMemo(() => {
    const total = allEmployees.length;
    const active = allEmployees.filter((e) => e.status === "active").length;
    const onLeave = allEmployees.filter((e) => e.status === "on_leave").length;
    const inactive = allEmployees.filter((e) => e.status === "inactive" || e.status === "terminated").length;
    return { total, active, onLeave, inactive };
  }, [allEmployees]);

  // Tab filtered employees
  const filteredByTab = useMemo(() => {
    if (!activeTab) return employees;
    if (activeTab === "inactive") {
      return employees.filter((e) => e.status === "inactive" || e.status === "terminated");
    }
    return employees.filter((e) => e.status === activeTab);
  }, [employees, activeTab]);

  const handleDelete = (item) => {
    Alert.alert("Delete Employee", `Remove ${item.firstName} ${item.lastName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteEmployeeApi(item._id);
            queryClient.invalidateQueries(["employees"]);
            queryClient.invalidateQueries(["companyDashboard"]);
          } catch (err) {
            Alert.alert("Error", err.response?.data?.message || "Failed to delete");
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => <EmployeeCard item={item} navigation={navigation} canManage={canManage} handleDelete={handleDelete} />;


  if (isLoading && employees.length === 0) {
    return <Loader />;
  }

  return (
    <CompanyAdminLayout
      navigation={navigation}
      activeTab="Team Members"
      showSearch={false}
    >
      <View style={styles.container}>
        {/* Stats Row */}
        <View style={styles.statsRow}>
          {[
            { label: "Total", value: stats.total, color: COLORS.text.dark },
            { label: "Active", value: stats.active, color: "#16a34a" },
            { label: "On Leave", value: stats.onLeave, color: "#d97706" },
            { label: "Inactive", value: stats.inactive, color: "#94a3b8" },
          ].map((s) => (
            <View key={s.label} style={styles.statCell}>
              <Ionicons
                name={
                  s.label === "Total"
                    ? "people-outline"
                    : s.label === "Active"
                    ? "checkmark-circle-outline"
                    : s.label === "On Leave"
                    ? "time-outline"
                    : "person-remove-outline"
                }
                size={18}
                color={s.color}
              />
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Search Bar */}
        <View style={styles.searchWrap}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color="#94a3b8" style={styles.searchIcon} />
            <TextInput
              style={styles.search}
              placeholder="Search employee..."
              placeholderTextColor="#94a3b8"
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={applyFilters}
              returnKeyType="search"
            />
          </View>
          <TouchableOpacity
            style={styles.filterIconBtn}
            onPress={() => setDeptModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="filter-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          {canManage && (
            <TouchableOpacity
              style={styles.addIconBtn}
              onPress={() => navigation.navigate("AddEmployee")}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={22} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Status Tabs */}
        <View style={styles.tabsRow}>
          {STATUS_TABS.map((tab) => {
            const count =
              tab.value === ""
                ? employees.length
                : tab.value === "inactive"
                ? employees.filter((e) => e.status === "inactive" || e.status === "terminated").length
                : employees.filter((e) => e.status === tab.value).length;
            const isActive = activeTab === tab.value;
            return (
              <TouchableOpacity
                key={tab.value || "all"}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setActiveTab(tab.value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.label}
                </Text>
                <Text style={[styles.tabCount, isActive && styles.tabCountActive]}>
                  ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <FlatList
          data={filteredByTab}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={true}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: canManage ? LIST_BOTTOM_PADDING : 24 },
          ]}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="people-outline" size={48} color="#cbd5e1" />
              <Text style={styles.empty}>No employees found</Text>
            </View>
          }
        />

        {/* Department Filter Modal */}
        <Modal visible={deptModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filter by Department</Text>
                <TouchableOpacity onPress={() => setDeptModal(false)}>
                  <Ionicons name="close" size={24} color={COLORS.text.muted} />
                </TouchableOpacity>
              </View>
              <ModalList
                data={[{ _id: "", name: "All Departments" }, ...departments]}
                keyExtractor={(d) => d._id || "all"}
                renderItem={({ item: d }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      setDepartmentId(d._id || "");
                      setDepartmentName(d._id ? d.name : "");
                      setDeptModal(false);
                      setAppliedFilters((f) => ({ ...f, departmentId: d._id || "" }));
                    }}
                  >
                    <Text
                      style={[
                        styles.modalItemText,
                        departmentId === d._id && styles.modalItemSelectedText,
                      ]}
                    >
                      {d.name}
                    </Text>
                    {departmentId === d._id && (
                      <Ionicons name="checkmark" size={18} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                )}
                contentContainerStyle={{ paddingBottom: 20 }}
              />
              <AppButton title="Done" onPress={() => setDeptModal(false)} />
            </View>
          </View>
        </Modal>
      </View>
    </CompanyAdminLayout>
  );
};

export default EmployeeListScreen;
