import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import ManagerLayout from "../../components/ManagerLayout";
import AppCard from "../../components/AppCard";
import useManagerController from "../../controllers/managerController";
import { useAuth } from "../../context/AuthContext";

const TEAL = "#C2410C";
const TEAL_LIGHT = "#f0fdfa";
const BORDER = "#e2e8f0";

const StatusBadge = ({ status }) => {
  const map = {
    present: { bg: "#dcfce7", text: "#16a34a" },
    late: { bg: "#ffedd5", text: "#ea580c" },
    absent: { bg: "#fee2e2", text: "#dc2626" },
    half_day: { bg: "#fef3c7", text: "#d97706" },
    "half-day": { bg: "#fef3c7", text: "#d97706" },
    paid_leave: { bg: "#eff6ff", text: "#2563eb" },
    unpaid_leave: { bg: "#fdf2f8", text: "#db2777" },
    holiday: { bg: "#f8fafc", text: "#475569" },
    weekly_off: { bg: "#f8fafc", text: "#475569" },
  };
  const style = map[status?.toLowerCase()] || { bg: "#f1f5f9", text: "#64748b" };
  const text = status ? status.replace(/_/g, " ").toUpperCase() : "NO RECORD";
  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <Text style={[styles.badgeText, { color: style.text }]}>{text}</Text>
    </View>
  );
};

const ManagerTeamScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const {
    teamData,
    teamSummary,
    loadingTeam,
    fetchTeam,
    refreshTeam,
  } = useManagerController();
  const { hasPermission, refreshUserProfile } = useAuth();
  const canAddMember = hasPermission && hasPermission("teamMembers", "add");
  const canEdit = hasPermission && hasPermission("teamMembers", "edit");

  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch with params
  useFocusEffect(
    useCallback(() => {
      fetchTeam(false, { search: debouncedSearch });
    }, [debouncedSearch])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    if (refreshUserProfile) {
      await refreshUserProfile();
    }
    await fetchTeam(true, { search: debouncedSearch });
    setRefreshing(false);
  };

  const getInitials = (name) => {
    if (!name) return "EMP";
    const parts = name.split(" ");
    if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() =>
        navigation.navigate("ManagerStack", {
          screen: "ManagerTeamMemberDetails",
          params: { employeeId: item._id },
        })
      }
    >
      <AppCard style={styles.card}>
        <View style={styles.cardHeader}>
          {item.photo ? (
            <Image source={{ uri: item.photo }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarFallbackText}>
                {getInitials(item.fullName)}
              </Text>
            </View>
          )}
          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.fullName}
            </Text>
            <Text style={styles.cardSub}>
              {item.designationId?.name || "Team Member"} ·{" "}
              {item.departmentId?.name || ""}
            </Text>
            <View style={styles.codeRow}>
              <Ionicons name="pricetag-outline" size={12} color="#64748b" />
              <Text style={styles.codeText}> {item.employeeCode || "—"}</Text>
            </View>
          </View>
          <View style={styles.statusCol}>
            <StatusBadge status={item.todayAttendance?.status} />
            {canEdit && (
              <TouchableOpacity
                style={styles.cardEditBtn}
                onPress={() =>
                  navigation.navigate("ManagerStack", {
                    screen: "ManagerEditEmployee",
                    params: { employeeId: item._id },
                  })
                }
                activeOpacity={0.7}
              >
                <Ionicons name="pencil-outline" size={16} color={TEAL} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.contactRow}>
            <Ionicons name="mail-outline" size={14} color="#64748b" />
            <Text style={styles.contactText} numberOfLines={1}>
              {" "}
              {item.email || "—"}
            </Text>
          </View>
          <View style={styles.contactRow}>
            <Ionicons name="call-outline" size={14} color="#64748b" />
            <Text style={styles.contactText}> {item.phone || "—"}</Text>
          </View>
        </View>

        <View style={styles.taskStrip}>
          <View style={styles.taskItem}>
            <Ionicons name="albums" size={14} color={TEAL} />
            <Text style={styles.taskText}>
              {item.activeTaskCount || 0} active task(s)
            </Text>
          </View>
          {item.overdueTaskCount > 0 && (
            <View style={[styles.taskItem, { marginLeft: 16 }]}>
              <Ionicons name="warning" size={14} color="#dc2626" />
              <Text style={[styles.taskText, { color: "#dc2626" }]}>
                {item.overdueTaskCount} overdue
              </Text>
            </View>
          )}
        </View>
      </AppCard>
    </TouchableOpacity>
  );

  return (
    <ManagerLayout navigation={navigation} title="My Team">
      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchWrap}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search name, code, email, phone..."
              placeholderTextColor="#94a3b8"
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={18} color="#cbd5e1" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.orgBtn}
            onPress={() =>
              navigation.navigate("ManagerStack", { screen: "ManagerTeamOrgView" })
            }
          >
            <Ionicons name="git-network-outline" size={20} color={TEAL} />
          </TouchableOpacity>
        </View>

        {/* Summary Strip */}
        {!loadingTeam && teamSummary && (
          <View style={styles.summaryStrip}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryVal}>{teamSummary.totalTeamMembers}</Text>
              <Text style={styles.summaryLab}>Total</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryVal, { color: "#16a34a" }]}>{teamSummary.presentToday}</Text>
              <Text style={styles.summaryLab}>Present</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryVal, { color: "#dc2626" }]}>
                {teamSummary.absentToday}
              </Text>
              <Text style={styles.summaryLab}>Absent</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryVal, { color: TEAL }]}>
                {teamSummary.pendingTasks}
              </Text>
              <Text style={styles.summaryLab}>Tasks</Text>
            </View>
          </View>
        )}

        {loadingTeam && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={TEAL} />
            <Text style={styles.loadingText}>Loading team...</Text>
          </View>
        ) : teamData.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No Team Members Found</Text>
            <Text style={styles.emptySub}>
              {search
                ? "Try adjusting your search criteria."
                : "You don't have any direct reports assigned yet."}
            </Text>
            {search.length > 0 && (
              <TouchableOpacity
                style={styles.clearSearchBtn}
                onPress={() => setSearch("")}
              >
                <Text style={styles.clearSearchText}>Clear Search</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={teamData}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={TEAL}
                colors={[TEAL]}
              />
            }
          />
        )}

        {canAddMember && (
          <TouchableOpacity
            style={[styles.fab, { bottom: Math.max(24, insets.bottom + 20) }]}
            onPress={() => navigation.navigate("ManagerStack", { screen: "ManagerAddEmployee" })}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={28} color="#ffffff" />
          </TouchableOpacity>
        )}
      </View>
    </ManagerLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 12, color: "#64748b", fontWeight: "600" },

  searchWrap: {
    flexDirection: "row",
    padding: 16,
    paddingBottom: 8,
    alignItems: "center",
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#0f172a",
  },
  clearBtn: { padding: 4 },
  orgBtn: {
    width: 44,
    height: 44,
    backgroundColor: TEAL_LIGHT,
    borderWidth: 1,
    borderColor: "#ccfbf1",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  summaryStrip: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 12,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "#f1f5f9",
  },
  summaryVal: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  summaryLab: { fontSize: 10, fontWeight: "600", color: "#64748b", marginTop: 2, textTransform: "uppercase" },

  listContent: { padding: 16, paddingBottom: 40 },

  card: { padding: 0, marginBottom: 14, borderRadius: 12, overflow: "hidden" },
  cardHeader: {
    flexDirection: "row",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: TEAL_LIGHT,
    marginRight: 12,
  },
  avatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: TEAL_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#ccfbf1",
  },
  avatarFallbackText: { color: TEAL, fontSize: 16, fontWeight: "800" },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: "750", color: "#0f172a" },
  cardSub: { fontSize: 12, color: "#475569", marginTop: 2 },
  codeRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  codeText: { fontSize: 11, color: "#64748b", fontWeight: "600" },
  statusCol: { alignItems: "flex-end", marginLeft: 8 },

  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.3 },

  cardFooter: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#f8fafc",
  },
  contactRow: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 },
  contactText: { fontSize: 11, color: "#475569", fontWeight: "500" },

  taskStrip: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  taskItem: { flexDirection: "row", alignItems: "center" },
  taskText: { fontSize: 11, color: TEAL, fontWeight: "600", marginLeft: 4 },

  emptyCard: {
    margin: 16,
    alignItems: "center",
    padding: 32,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#1e293b", marginTop: 12 },
  emptySub: { fontSize: 13, color: "#64748b", textAlign: "center", marginTop: 6, lineHeight: 19 },
  clearSearchBtn: {
    marginTop: 16,
    backgroundColor: TEAL_LIGHT,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccfbf1",
  },
  clearSearchText: { color: TEAL, fontWeight: "700", fontSize: 13 },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: TEAL,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cardEditBtn: {
    marginTop: 8,
    padding: 6,
    borderRadius: 6,
    backgroundColor: TEAL_LIGHT,
    borderWidth: 1,
    borderColor: "#ccfbf1",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default ManagerTeamScreen;
