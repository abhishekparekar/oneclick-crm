import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import SuperAdminLayout from "../../components/SuperAdminLayout";
import AppCard from "../../components/AppCard";
import AppButton from "../../components/AppButton";
import Loader from "../../components/Loader";
import {
  getCompanyByIdApi,
  updateCompanyStatusApi,
  deleteCompanyApi,
} from "../../api/superAdminService";

const DetailRow = ({ icon, label, value }) => (
  <View style={styles.row}>
    <View style={styles.labelRow}>
      <Ionicons name={icon} size={15} color="#4b5563" style={styles.rowIcon} />
      <Text style={styles.label}>{label}</Text>
    </View>
    <Text style={styles.value}>{value || "-"}</Text>
  </View>
);

const CompanyDetailsScreen = ({ route, navigation }) => {
  const { companyId } = route.params;
  const [company, setCompany] = useState(null);
  const [companyAdmin, setCompanyAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchCompany = async () => {
    try {
      setError("");
      const { data } = await getCompanyByIdApi(companyId);
      setCompany(data.company);
      setCompanyAdmin(data.companyAdmin);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load company");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCompany();
    }, [companyId])
  );

  const toggleStatus = (status) => {
    Alert.alert(
      "Update Company Status",
      `Set company status to ${status}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setActionLoading(true);
            try {
              const { data } = await updateCompanyStatusApi(companyId, status);
              setCompany(data.company);
              Alert.alert("Success", `Status updated to ${status}`);
            } catch (err) {
              Alert.alert("Error", err.response?.data?.message || "Failed to update status");
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Company",
      "This will delete the company and all associated users. This action CANNOT be undone. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setActionLoading(true);
            try {
              await deleteCompanyApi(companyId);
              Alert.alert("Success", "Company deleted successfully");
              navigation.navigate("Companies");
            } catch (err) {
              Alert.alert("Error", err.response?.data?.message || "Failed to delete company");
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SuperAdminLayout navigation={navigation} activeTab="Companies">
        <Loader />
      </SuperAdminLayout>
    );
  }

  if (error || !company) {
    return (
      <SuperAdminLayout navigation={navigation} activeTab="Companies">
        <View style={styles.center}>
          <Text style={styles.error}>{error || "Company not found"}</Text>
        </View>
      </SuperAdminLayout>
    );
  }

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case "active":
        return styles.activeBadge;
      case "inactive":
        return styles.inactiveBadge;
      case "suspended":
        return styles.suspendedBadge;
      default:
        return styles.defaultBadge;
    }
  };

  const formattedDate = new Date(company.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <SuperAdminLayout navigation={navigation} activeTab="Companies">
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Company Card */}
        <AppCard style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.titleWrapper}>
              <Text style={styles.title}>{company.companyName}</Text>
              <Text style={styles.industryText}>{company.industryType || "SaaS Company"}</Text>
            </View>
            <View style={[styles.badge, getStatusBadgeStyle(company.status)]}>
              <Text style={styles.badgeText}>{company.status}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Owner Details</Text>
          <DetailRow icon="person-outline" label="Owner Name" value={company.ownerName} />
          <DetailRow icon="mail-outline" label="Owner Email" value={company.ownerEmail} />
          <DetailRow icon="call-outline" label="Owner Phone" value={company.ownerPhone} />

          <Text style={styles.sectionTitle}>Business details</Text>
          <DetailRow icon="mail-outline" label="Company Email" value={company.email} />
          <DetailRow icon="call-outline" label="Company Phone" value={company.phone} />
          <DetailRow icon="pin-outline" label="Address" value={company.address} />
          <DetailRow icon="calendar-outline" label="Registration Date" value={formattedDate} />
        </AppCard>

        {/* Subscription Plan details */}
        <AppCard style={styles.card}>
          <Text style={styles.sectionTitle}>SaaS Subscription</Text>
          <DetailRow icon="card-outline" label="Active Plan" value={company.planName} />
          <DetailRow icon="people-outline" label="Employee Limit" value={`${company.employeeLimit} employees`} />
          <DetailRow icon="analytics-outline" label="Module Access" value="Managed globally via Access Control" />

          {/* Quick shortcuts */}
          <View style={styles.shortcutsRow}>
            <TouchableOpacity
              style={styles.shortcutBtn}
              onPress={() => navigation.navigate("CompanyAdmins", { search: company.companyName })}
            >
              <Ionicons name="people" size={16} color="#2563eb" />
              <Text style={styles.shortcutText}>View Admins</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shortcutBtn}
              onPress={() => navigation.navigate("Payments", { search: company.companyName })}
            >
              <Ionicons name="cash" size={16} color="#2563eb" />
              <Text style={styles.shortcutText}>View Payments</Text>
            </TouchableOpacity>
          </View>
        </AppCard>

        {/* Company Admin Account details */}
        {companyAdmin ? (
          <AppCard style={styles.card}>
            <Text style={styles.sectionTitle}>Primary Company Admin</Text>
            <DetailRow icon="person-circle-outline" label="Admin Name" value={companyAdmin.name} />
            <DetailRow icon="mail-outline" label="Admin Email" value={companyAdmin.email} />
            <DetailRow icon="call-outline" label="Admin Phone" value={companyAdmin.phone} />
            <DetailRow
              icon="checkmark-circle-outline"
              label="Account Status"
              value={companyAdmin.isActive ? "Active" : "Inactive"}
            />
          </AppCard>
        ) : null}

        {/* Actions Section */}
        <View style={styles.actionsContainer}>
          <AppButton
            title="Edit Company Profile"
            onPress={() => navigation.navigate("AddCompany", { companyId })}
            loading={actionLoading}
            variant="outline"
            style={styles.actionBtn}
          />

          <View style={styles.statusButtonsRow}>
            {company.status !== "active" && (
              <AppButton
                title="Activate"
                onPress={() => toggleStatus("active")}
                loading={actionLoading}
                style={[styles.actionBtn, styles.flexBtn, { marginRight: 4 }]}
              />
            )}
            {company.status === "active" && (
              <AppButton
                title="Deactivate"
                onPress={() => toggleStatus("inactive")}
                loading={actionLoading}
                variant="outline"
                style={[styles.actionBtn, styles.flexBtn, { marginRight: 4 }]}
              />
            )}
            {company.status !== "suspended" && (
              <AppButton
                title="Suspend"
                onPress={() => toggleStatus("suspended")}
                loading={actionLoading}
                variant="danger"
                style={[styles.actionBtn, styles.flexBtn, { marginLeft: 4 }]}
              />
            )}
          </View>

          <AppButton
            title="Delete Company"
            onPress={handleDelete}
            loading={actionLoading}
            variant="danger"
            style={styles.deleteBtn}
          />
        </View>
      </ScrollView>
    </SuperAdminLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", minHeight: 300 },
  card: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    paddingBottom: 12,
    marginBottom: 12,
  },
  titleWrapper: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
  },
  industryText: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: { backgroundColor: "#dcfce7" },
  inactiveBadge: { backgroundColor: "#fee2e2" },
  suspendedBadge: { backgroundColor: "#fef3c7" },
  defaultBadge: { backgroundColor: "#f3f4f6" },
  badgeText: { fontSize: 11, fontWeight: "600", textTransform: "capitalize", color: "#1e293b" },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    marginTop: 14,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 4,
  },
  row: {
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowIcon: {
    marginRight: 6,
    width: 18,
  },
  label: { fontSize: 13, color: "#64748b" },
  value: { fontSize: 13, color: "#1e293b", fontWeight: "500" },
  shortcutsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 12,
  },
  shortcutBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    justifyContent: "center",
    marginHorizontal: 4,
  },
  shortcutText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: "600",
    color: "#2563eb",
  },
  actionsContainer: {
    marginTop: 8,
    marginBottom: 20,
  },
  actionBtn: {
    marginBottom: 10,
  },
  statusButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  flexBtn: {
    flex: 1,
  },
  deleteBtn: {
    marginTop: 10,
  },
  error: { color: "#ef4444", textAlign: "center", fontSize: 16 },
});

export default CompanyDetailsScreen;
