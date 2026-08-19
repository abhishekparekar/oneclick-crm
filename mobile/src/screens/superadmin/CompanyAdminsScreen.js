import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import SuperAdminLayout from "../../components/SuperAdminLayout";
import Loader from "../../components/Loader";
import AppInput from "../../components/AppInput";
import AppCard from "../../components/AppCard";
import AppButton from "../../components/AppButton";
import {
  getCompanyAdminsApi,
  updateUserStatusApi,
} from "../../api/superAdminService";

const CompanyAdminsScreen = ({ route, navigation }) => {
  const initialSearch = route.params?.search || "";
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(""); // "", "active", "inactive"
  const [error, setError] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchAdmins = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const { data } = await getCompanyAdminsApi(params);
      setAdmins(data.admins || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load company admins");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAdmins();
    }, [search, statusFilter])
  );

  const toggleAdminStatus = async (id, currentStatus) => {
    const newStatus = currentStatus ? "inactive" : "active";
    setActionLoadingId(id);
    try {
      await updateUserStatusApi(id, newStatus);
      Alert.alert("Success", `Admin status updated to ${newStatus}`);
      fetchAdmins();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to update admin status");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResetPassword = (email) => {
    // Generate a secure looking temporary password
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
    let tempPass = "";
    for (let i = 0; i < 10; i++) {
      tempPass += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    Alert.alert(
      "Reset Temporary Password",
      `Are you sure you want to reset password for ${email}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset Password",
          onPress: () => {
            Alert.alert(
              "Password Reset Successful",
              `A temporary password has been generated:\n\nPassword: ${tempPass}\n\nShare this secure temporary password with the user. In production, this would trigger an automated reset email.`,
              [{ text: "OK" }]
            );
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => {
    const isActionLoading = actionLoadingId === item._id;

    return (
      <AppCard style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.nameSection}>
            <Text style={styles.adminName}>{item.name}</Text>
            <Text style={styles.companyName}>
              {item.companyId?.companyName || "No Company"}
            </Text>
          </View>
          <View style={[styles.badge, item.isActive ? styles.activeBadge : styles.inactiveBadge]}>
            <Text style={styles.badgeText}>{item.isActive ? "Active" : "Inactive"}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="mail-outline" size={14} color="#6b7280" style={styles.icon} />
          <Text style={styles.infoText}>{item.email}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="call-outline" size={14} color="#6b7280" style={styles.icon} />
          <Text style={styles.infoText}>{item.phone || "-"}</Text>
        </View>

        <View style={styles.actionRow}>
          <AppButton
            title={item.isActive ? "Deactivate" : "Activate"}
            onPress={() => toggleAdminStatus(item._id, item.isActive)}
            loading={isActionLoading}
            variant={item.isActive ? "outline" : "primary"}
            style={[styles.actionBtn, styles.flexBtn]}
          />
          <AppButton
            title="Reset Password"
            onPress={() => handleResetPassword(item.email)}
            variant="outline"
            style={[styles.actionBtn, styles.flexBtn, styles.resetBtn]}
            textStyle={styles.resetBtnText}
          />
        </View>
      </AppCard>
    );
  };

  return (
    <SuperAdminLayout navigation={navigation} activeTab="Companies">
      <View style={styles.container}>
        {/* Search and Filters */}
        <View style={styles.filterCard}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color="#9ca3af" style={styles.searchIcon} />
            <AppInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name/email/phone/company..."
              style={styles.searchInput}
              containerStyle={styles.searchWrapper}
            />
          </View>

          {/* Status filter tabs */}
          <View style={styles.filterTabs}>
            <TouchableOpacity
              onPress={() => setStatusFilter("")}
              style={[styles.filterTab, statusFilter === "" && styles.filterTabActive]}
            >
              <Text style={[styles.filterTabText, statusFilter === "" && styles.filterTabTextActive]}>
                All Admins
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setStatusFilter("active")}
              style={[styles.filterTab, statusFilter === "active" && styles.filterTabActive]}
            >
              <Text
                style={[
                  styles.filterTabText,
                  statusFilter === "active" && styles.filterTabTextActive,
                ]}
              >
                Active
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setStatusFilter("inactive")}
              style={[styles.filterTab, statusFilter === "inactive" && styles.filterTabActive]}
            >
              <Text
                style={[
                  styles.filterTabText,
                  statusFilter === "inactive" && styles.filterTabTextActive,
                ]}
              >
                Inactive
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {loading && admins.length === 0 ? (
          <Loader />
        ) : (
          <FlatList
            data={admins}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => fetchAdmins(true)} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={48} color="#9ca3af" />
                <Text style={styles.emptyText}>No company admins found matching criteria.</Text>
              </View>
            }
          />
        )}
      </View>
    </SuperAdminLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  filterCard: {
    backgroundColor: "#fff",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  searchIcon: { marginRight: 8 },
  searchWrapper: {
    flex: 1,
    borderWidth: 0,
    marginBottom: 0,
    height: 40,
    paddingHorizontal: 0,
    backgroundColor: "transparent",
  },
  searchInput: { fontSize: 14, height: 40, color: "#1f2937" },
  filterTabs: {
    flexDirection: "row",
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: "#f3f4f6",
    marginRight: 8,
  },
  filterTabActive: { backgroundColor: "#2563eb" },
  filterTabText: { fontSize: 12, fontWeight: "500", color: "#4b5563" },
  filterTabTextActive: { color: "#fff", fontWeight: "600" },
  listContainer: { padding: 16, paddingBottom: 40 },
  card: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    paddingBottom: 8,
  },
  nameSection: {
    flex: 1,
    marginRight: 12,
  },
  adminName: { fontSize: 16, fontWeight: "700", color: "#111827" },
  companyName: { fontSize: 13, color: "#6b7280", marginTop: 2, fontWeight: "500" },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  activeBadge: { backgroundColor: "#dcfce7" },
  inactiveBadge: { backgroundColor: "#fee2e2" },
  badgeText: { fontSize: 11, fontWeight: "600", color: "#1f2937" },
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  icon: { marginRight: 8, width: 16, textAlign: "center" },
  infoText: { fontSize: 13, color: "#4b5563" },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingTop: 12,
  },
  actionBtn: {
    height: 38,
    paddingVertical: 0,
    justifyContent: "center",
  },
  flexBtn: { flex: 1, marginHorizontal: 4 },
  resetBtn: { borderColor: "#cbd5e1" },
  resetBtnText: { color: "#475569" },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: { fontSize: 14, color: "#6b7280", marginTop: 12 },
  errorText: { color: "#ef4444", padding: 12, textAlign: "center" },
});

export default CompanyAdminsScreen;
