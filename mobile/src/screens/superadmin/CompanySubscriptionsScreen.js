import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import SuperAdminLayout from "../../components/SuperAdminLayout";
import Loader from "../../components/Loader";
import AppInput from "../../components/AppInput";
import AppCard from "../../components/AppCard";
import AppButton from "../../components/AppButton";
import {
  getSubscriptionsApi,
  updateSubscriptionApi,
} from "../../api/superAdminService";

const CompanySubscriptionsScreen = ({ navigation }) => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Modal form states
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSub, setSelectedSub] = useState(null);
  const [form, setForm] = useState({
    billingCycle: "monthly",
    status: "active",
    paymentStatus: "paid",
    daysToExtend: "30",
  });
  const [formLoading, setFormLoading] = useState(false);

  const fetchSubscriptions = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");
      const { data } = await getSubscriptionsApi();
      setSubscriptions(data.subscriptions || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load subscriptions");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSubscriptions();
    }, [])
  );

  const openUpdateModal = (sub) => {
    setSelectedSub(sub);
    setForm({
      billingCycle: sub.billingCycle || "monthly",
      status: sub.status || "active",
      paymentStatus: sub.paymentStatus || "paid",
      daysToExtend: "30",
    });
    setModalVisible(true);
  };

  const handleUpdateSubscription = async () => {
    setFormLoading(true);
    try {
      const days = Number(form.daysToExtend) || 0;
      const updatedEndDate = new Date(selectedSub.endDate);
      updatedEndDate.setDate(updatedEndDate.getDate() + days);

      const payload = {
        billingCycle: form.billingCycle,
        status: form.status,
        paymentStatus: form.paymentStatus,
        endDate: updatedEndDate.toISOString(),
      };

      await updateSubscriptionApi(selectedSub._id, payload);
      Alert.alert("Success", "Subscription updated successfully!");
      setModalVisible(false);
      fetchSubscriptions();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to update subscription");
    } finally {
      setFormLoading(false);
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case "active":
        return styles.activeBadge;
      case "expired":
        return styles.inactiveBadge;
      case "cancelled":
        return styles.cancelledBadge;
      default:
        return styles.defaultBadge;
    }
  };

  const getPaymentStatusStyle = (status) => {
    switch (status) {
      case "paid":
        return styles.paidText;
      case "pending":
        return styles.pendingText;
      case "failed":
        return styles.failedText;
      default:
        return styles.defaultText;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const renderItem = ({ item }) => {
    const isExpired = new Date(item.endDate) < new Date();
    
    return (
      <AppCard style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.titleArea}>
            <Text style={styles.companyName}>
              {item.companyId?.companyName || "No Company"}
            </Text>
            <Text style={styles.planName}>Plan: {item.planName}</Text>
          </View>
          <View style={[styles.badge, getStatusBadgeStyle(isExpired ? "expired" : item.status)]}>
            <Text style={styles.badgeText}>{isExpired ? "expired" : item.status}</Text>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Cycle</Text>
            <Text style={styles.infoVal}>{item.billingCycle}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Payment</Text>
            <Text style={[styles.infoVal, getPaymentStatusStyle(item.paymentStatus)]}>
              {item.paymentStatus}
            </Text>
          </View>
        </View>

        <View style={styles.datesRow}>
          <View style={styles.dateCol}>
            <Text style={styles.dateLabel}>Start Date</Text>
            <Text style={styles.dateVal}>{formatDate(item.startDate)}</Text>
          </View>
          <View style={styles.dateCol}>
            <Text style={styles.dateLabel}>End Date</Text>
            <Text style={styles.dateVal}>{formatDate(item.endDate)}</Text>
          </View>
        </View>

        <AppButton
          title="Renew / Update Plan"
          onPress={() => openUpdateModal(item)}
          variant="outline"
          style={styles.renewBtn}
        />
      </AppCard>
    );
  };

  return (
    <SuperAdminLayout navigation={navigation} activeTab="Dashboard">
      <View style={styles.container}>
        <Text style={styles.title}>Company Subscriptions</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {loading && subscriptions.length === 0 ? (
          <Loader />
        ) : (
          <FlatList
            data={subscriptions}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => fetchSubscriptions(true)} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="receipt-outline" size={48} color="#9ca3af" />
                <Text style={styles.emptyText}>No subscriptions found.</Text>
              </View>
            }
          />
        )}

        {/* Modal Form */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalBg}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Update Subscription</Text>
                  <Text style={styles.modalSubtitle}>
                    {selectedSub?.companyId?.companyName} • {selectedSub?.planName}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#475569" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
                <View style={styles.tabSection}>
                  <Text style={styles.tabLabel}>Billing Cycle:</Text>
                  <View style={styles.tabsRow}>
                    {["monthly", "yearly"].map((cycle) => (
                      <TouchableOpacity
                        key={cycle}
                        onPress={() => setForm((p) => ({ ...p, billingCycle: cycle }))}
                        style={[styles.tabBtn, form.billingCycle === cycle && styles.tabBtnActive]}
                      >
                        <Text style={[styles.tabBtnText, form.billingCycle === cycle && styles.tabBtnTextActive]}>
                          {cycle}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.tabSection}>
                  <Text style={styles.tabLabel}>Subscription Status:</Text>
                  <View style={styles.tabsRow}>
                    {["active", "expired", "cancelled"].map((st) => (
                      <TouchableOpacity
                        key={st}
                        onPress={() => setForm((p) => ({ ...p, status: st }))}
                        style={[styles.tabBtn, form.status === st && styles.tabBtnActive]}
                      >
                        <Text style={[styles.tabBtnText, form.status === st && styles.tabBtnTextActive]}>
                          {st}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.tabSection}>
                  <Text style={styles.tabLabel}>Payment Status:</Text>
                  <View style={styles.tabsRow}>
                    {["paid", "pending", "failed", "refunded"].map((pay) => (
                      <TouchableOpacity
                        key={pay}
                        onPress={() => setForm((p) => ({ ...p, paymentStatus: pay }))}
                        style={[styles.tabBtn, form.paymentStatus === pay && styles.tabBtnActive]}
                      >
                        <Text style={[styles.tabBtnText, form.paymentStatus === pay && styles.tabBtnTextActive]}>
                          {pay}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <AppInput
                  label="Extend Validity (In Days)"
                  value={form.daysToExtend}
                  onChangeText={(v) => setForm((p) => ({ ...p, daysToExtend: v }))}
                  placeholder="30"
                  keyboardType="numeric"
                />

                <AppButton
                  title="Save Subscription Details"
                  onPress={handleUpdateSubscription}
                  loading={formLoading}
                  style={styles.submitBtn}
                />
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </SuperAdminLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  title: { fontSize: 18, fontWeight: "700", color: "#1e293b", padding: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
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
  titleArea: { flex: 1, marginRight: 8 },
  companyName: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
  planName: { fontSize: 12, color: "#64748b", marginTop: 2, fontWeight: "500" },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  activeBadge: { backgroundColor: "#dcfce7" },
  inactiveBadge: { backgroundColor: "#fee2e2" },
  cancelledBadge: { backgroundColor: "#e2e8f0" },
  defaultBadge: { backgroundColor: "#f1f5f9" },
  badgeText: { fontSize: 11, fontWeight: "600", textTransform: "capitalize", color: "#1e293b" },
  infoGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#f8fafc",
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  infoCol: { alignItems: "center", flex: 1 },
  infoLabel: { fontSize: 11, color: "#64748b" },
  infoVal: { fontSize: 13, fontWeight: "600", color: "#1e293b", marginTop: 2, textTransform: "uppercase" },
  paidText: { color: "#16a34a" },
  pendingText: { color: "#d97706" },
  failedText: { color: "#dc2626" },
  defaultText: { color: "#64748b" },
  datesRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  dateCol: { flex: 1 },
  dateLabel: { fontSize: 11, color: "#64748b" },
  dateVal: { fontSize: 13, color: "#334155", fontWeight: "500", marginTop: 2 },
  renewBtn: { height: 38, paddingVertical: 0, justifyContent: "center" },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 16 },
  modalContainer: { backgroundColor: "#fff", borderRadius: 12, padding: 16, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingBottom: 10, marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
  modalSubtitle: { fontSize: 12, color: "#64748b", marginTop: 2 },
  modalScroll: { flex: 1 },
  tabSection: { marginBottom: 14 },
  tabLabel: { fontSize: 13, fontWeight: "600", color: "#475569", marginBottom: 8 },
  tabsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tabBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: "#cbd5e1" },
  tabBtnActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  tabBtnText: { fontSize: 12, color: "#475569", textTransform: "capitalize" },
  tabBtnTextActive: { color: "#fff", fontWeight: "600" },
  submitBtn: { marginTop: 16, marginBottom: 20 },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: { fontSize: 14, color: "#6b7280", marginTop: 12 },
  errorText: { color: "#ef4444", padding: 12, textAlign: "center" },
});

export default CompanySubscriptionsScreen;
