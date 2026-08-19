import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ScrollView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import SuperAdminLayout from "../../components/SuperAdminLayout";
import Loader from "../../components/Loader";
import AppInput from "../../components/AppInput";
import AppCard from "../../components/AppCard";
import AppButton from "../../components/AppButton";
import { getPaymentsApi } from "../../api/superAdminService";

const STATUS_FILTERS = [
  { label: "All Statuses", value: "" },
  { label: "Paid", value: "paid" },
  { label: "Pending", value: "pending" },
  { label: "Failed", value: "failed" },
  { label: "Refunded", value: "refunded" },
];

const PaymentsScreen = ({ route, navigation }) => {
  const initialSearch = route.params?.search || "";
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState("");

  const fetchPayments = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const { data } = await getPaymentsApi(params);
      setPayments(data.payments || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load payment history");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPayments();
    }, [search, statusFilter])
  );

  const handleDownloadInvoice = (item) => {
    const invUrl = item.invoiceUrl || `https://icoded-hrms.com/invoices/INV-${item._id?.slice(-6).toUpperCase()}`;
    Alert.alert(
      "Invoice Action",
      `Invoice URL: ${invUrl}\n\nInvoice PDF download has been simulated successfully. In production, this opens a web browser to view/print the official receipt.`,
      [{ text: "OK" }]
    );
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case "paid":
        return styles.paidBadge;
      case "pending":
        return styles.pendingBadge;
      case "failed":
        return styles.failedBadge;
      case "refunded":
        return styles.refundedBadge;
      default:
        return styles.defaultBadge;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderItem = ({ item }) => {
    return (
      <AppCard style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>
              {item.companyId?.companyName || "No Company"}
            </Text>
            <Text style={styles.transactionId}>TXN: {item.transactionId || item._id}</Text>
          </View>
          <View style={[styles.badge, getStatusBadgeStyle(item.status)]}>
            <Text style={styles.badgeText}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.amountCol}>
            <Text style={styles.lbl}>Amount Paid</Text>
            <Text style={styles.val}>₹{item.amount}</Text>
          </View>
          <View style={styles.modeCol}>
            <Text style={styles.lbl}>Payment Mode</Text>
            <Text style={styles.val}>{item.paymentMode || "Razorpay"}</Text>
          </View>
        </View>

        <View style={styles.footerRow}>
          <View style={styles.dateCol}>
            <Text style={styles.lbl}>Payment Date</Text>
            <Text style={styles.dateVal}>{formatDate(item.paidAt || item.createdAt)}</Text>
          </View>
          <TouchableOpacity
            style={styles.invoiceBtn}
            onPress={() => handleDownloadInvoice(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="document-text-outline" size={16} color="#2563eb" />
            <Text style={styles.invoiceBtnText}>Invoice</Text>
          </TouchableOpacity>
        </View>
      </AppCard>
    );
  };

  return (
    <SuperAdminLayout navigation={navigation} activeTab="Payments">
      <View style={styles.container}>
        {/* Filters and Search */}
        <View style={styles.filterCard}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color="#9ca3af" style={styles.searchIcon} />
            <AppInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by company or transaction ID..."
              style={styles.searchInput}
              containerStyle={styles.searchWrapper}
            />
          </View>

          {/* Status filter tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterTabs}
          >
            {STATUS_FILTERS.map((filter) => {
              const isActive = statusFilter === filter.value;
              return (
                <TouchableOpacity
                  key={filter.label}
                  onPress={() => setStatusFilter(filter.value)}
                  style={[styles.filterTab, isActive && styles.filterTabActive]}
                >
                  <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {loading && payments.length === 0 ? (
          <Loader />
        ) : (
          <FlatList
            data={payments}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => fetchPayments(true)} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="cash-outline" size={48} color="#9ca3af" />
                <Text style={styles.emptyText}>No payment history records found.</Text>
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
  filterTabs: { paddingVertical: 4 },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: "#f3f4f6",
    marginRight: 8,
  },
  filterTabActive: { backgroundColor: "#2563eb" },
  filterTabText: { fontSize: 12, fontWeight: "500", color: "#4b5563" },
  filterTabTextActive: { color: "#fff", fontWeight: "600" },
  listContainer: { padding: 16, paddingBottom: 40 },
  card: { marginBottom: 16, padding: 16, borderRadius: 12 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 8,
  },
  companyInfo: { flex: 1, marginRight: 8 },
  companyName: { fontSize: 15, fontWeight: "700", color: "#1e293b" },
  transactionId: { fontSize: 11, color: "#64748b", marginTop: 2, fontWeight: "500" },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  paidBadge: { backgroundColor: "#dcfce7" },
  pendingBadge: { backgroundColor: "#fef3c7" },
  failedBadge: { backgroundColor: "#fee2e2" },
  refundedBadge: { backgroundColor: "#e2e8f0" },
  defaultBadge: { backgroundColor: "#f1f5f9" },
  badgeText: { fontSize: 11, fontWeight: "600", textTransform: "capitalize", color: "#1e293b" },
  detailsRow: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  amountCol: { flex: 1 },
  modeCol: { flex: 1, alignItems: "flex-end" },
  lbl: { fontSize: 11, color: "#64748b" },
  val: { fontSize: 14, fontWeight: "700", color: "#1e293b", marginTop: 2 },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 10,
  },
  dateCol: { flex: 1 },
  dateVal: { fontSize: 12, color: "#334155", fontWeight: "500", marginTop: 2 },
  invoiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  invoiceBtnText: { fontSize: 12, fontWeight: "600", color: "#2563eb", marginLeft: 4 },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: { fontSize: 14, color: "#6b7280", marginTop: 12 },
  errorText: { color: "#ef4444", padding: 12, textAlign: "center" },
});

export default PaymentsScreen;
