import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Linking,
  RefreshControl,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CompanyAdminLayout from "../../components/CompanyAdminLayout";
import leadsService from "../../api/leadsService";
import { FONTS } from "../../theme/tokens";

const C = {
  primary: "#1268D9",
  primaryLight: "#EFF6FF",
  primaryBorder: "#DBEAFE",
  darkNavy: "#0F172A",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  borderLight: "#F1F5F9",
  text: "#0F172A",
  sub: "#475569",
  muted: "#94A3B8",
  green: "#10B981", greenBg: "#ECFDF5", greenBorder: "#A7F3D0",
  blue: "#3B82F6", blueBg: "#EFF6FF",
  amber: "#D97706", amberBg: "#FEF3C7",
  purple: "#8B5CF6", purpleBg: "#F5F3FF",
  red: "#EF4444", redBg: "#FEF2F2",
};

export default function LeadRemindersScreen({ navigation }) {
  const [reminders, setReminders] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters: 'due' | 'all' | 'recurring'
  const [activeTab, setActiveTab] = useState("due");
  const [search, setSearch] = useState("");

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leadSearch, setLeadSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState(null);
  const [serviceName, setServiceName] = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [repeatType, setRepeatType] = useState("NONE"); // NONE | MONTHLY | YEARLY
  const [notes, setNotes] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [remRes, leadsRes] = await Promise.all([
        leadsService.getReminders(),
        leadsService.getLeads({ limit: 150 }).catch(() => []),
      ]);

      const rList = Array.isArray(remRes?.reminders)
        ? remRes.reminders
        : Array.isArray(remRes)
        ? remRes
        : [];
      setReminders(rList);

      const lList = Array.isArray(leadsRes?.data)
        ? leadsRes.data
        : Array.isArray(leadsRes)
        ? leadsRes
        : [];
      setLeads(lList);
    } catch (err) {
      console.warn("[LeadReminders] Fetch note:", err?.message || err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const handleCreate = async () => {
    if (!serviceName.trim()) return Alert.alert("Required", "Service title / reminder name is required.");
    try {
      setSubmitting(true);
      await leadsService.createReminder({
        title: serviceName.trim(),
        serviceName: serviceName.trim(),
        serviceDate: serviceDate || new Date().toISOString().split("T")[0],
        repeatType,
        notes: notes.trim(),
        leadId: selectedLead?.id || selectedLead?._id || undefined,
        leadName: selectedLead?.name || "Client",
        leadPhone: selectedLead?.whatsappPhone || selectedLead?.phone || "",
      });

      setModalVisible(false);
      setSelectedLead(null);
      setServiceName("");
      setServiceDate("");
      setRepeatType("NONE");
      setNotes("");
      fetchData();
      Alert.alert("Success", "Service reminder created!");
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to create reminder");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id, name) => {
    Alert.alert("Delete", `Delete "${name || 'reminder'}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await leadsService.deleteReminder(id);
            fetchData();
          } catch (err) {
            Alert.alert("Error", "Could not delete");
          }
        },
      },
    ]);
  };

  const handleSendWhatsApp = (item) => {
    const phone = item.leadPhone || item.lead?.whatsappPhone || item.lead?.phone;
    if (!phone) return Alert.alert("No Phone", "No WhatsApp phone available for this lead.");
    const clean = phone.replace(/[^0-9+]/g, "");
    const text = encodeURIComponent(
      `Hello ${item.leadName || item.lead?.name || "Customer"}, reminder from One Click regarding ${item.serviceName || item.title || "service renewal"}. Due Date: ${item.serviceDate || item.dueDate || "Today"}.`
    );
    Linking.openURL(`whatsapp://send?phone=${clean}&text=${text}`).catch(() => {
      Alert.alert("Error", "WhatsApp is not installed on this device.");
    });
  };

  // Filtered Reminders
  const filteredReminders = reminders.filter((r) => {
    if (activeTab === "due" && r.isCompleted) return false;
    if (activeTab === "recurring" && (!r.repeatType || r.repeatType === "NONE")) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = (r.title || r.serviceName || "").toLowerCase().includes(q);
      const matchLead = (r.leadName || r.lead?.name || "").toLowerCase().includes(q);
      return matchTitle || matchLead;
    }
    return true;
  });

  const dueCount = reminders.filter((r) => !r.isCompleted).length;
  const recurringCount = reminders.filter((r) => r.repeatType && r.repeatType !== "NONE").length;

  return (
    <CompanyAdminLayout
      navigation={navigation}
      title="Service Reminders"
      subtitle="Automated service & renewal notifications"
      activeTab="Service Reminders"
    >
      <View style={styles.container}>
        {/* Top Micro Metrics */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Total</Text>
            <Text style={styles.kpiValue}>{reminders.length}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Due / Active</Text>
            <Text style={[styles.kpiValue, { color: C.amber }]}>{dueCount}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Recurring</Text>
            <Text style={[styles.kpiValue, { color: C.blue }]}>{recurringCount}</Text>
          </View>
          <TouchableOpacity
            style={styles.newReminderBtn}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add" size={14} color="#FFF" />
            <Text style={styles.newReminderBtnText}>New</Text>
          </TouchableOpacity>
        </View>

        {/* Tab & Search Strip */}
        <View style={styles.tabStrip}>
          <View style={styles.tabPills}>
            {[
              { id: "due", label: `Due (${dueCount})` },
              { id: "all", label: `All (${reminders.length})` },
              { id: "recurring", label: `Recurring (${recurringCount})` },
            ].map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.tabPill, activeTab === t.id && styles.tabPillActive]}
                onPress={() => setActiveTab(t.id)}
              >
                <Text style={[styles.tabPillText, activeTab === t.id && styles.tabPillTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search" size={12} color={C.muted} style={{ marginRight: 4 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search service, client..."
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        {loading && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator size="small" color={C.primary} />
            <Text style={styles.loadingText}>Loading reminders...</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            showsVerticalScrollIndicator={false}
          >
            {filteredReminders.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="alarm-outline" size={28} color={C.muted} />
                <Text style={styles.emptyTitle}>No Reminders Found</Text>
                <Text style={styles.emptySub}>Add automated renewal or service follow-ups.</Text>
                <TouchableOpacity
                  style={styles.emptyAddBtn}
                  onPress={() => setModalVisible(true)}
                >
                  <Text style={styles.emptyAddBtnText}>+ Add Reminder</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filteredReminders.map((item) => {
                const leadName = item.leadName || item.lead?.name || "Client";
                const phone = item.leadPhone || item.lead?.whatsappPhone || item.lead?.phone;
                const rep = item.repeatType || "NONE";

                return (
                  <View key={item.id || item._id} style={styles.remCard}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                        <Text style={styles.remTitle} numberOfLines={1}>
                          {item.serviceName || item.title}
                        </Text>
                        {rep !== "NONE" && (
                          <Text style={styles.repBadge}>
                            {rep === "MONTHLY" ? "Monthly" : "Yearly"}
                          </Text>
                        )}
                      </View>

                      <Text style={styles.remLeadText} numberOfLines={1}>
                        👤 {leadName} {phone ? `• ${phone}` : ""}
                      </Text>

                      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4, gap: 8 }}>
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <Ionicons name="calendar-outline" size={11} color={C.muted} style={{ marginRight: 3 }} />
                          <Text style={styles.remDateText}>
                            {item.serviceDate || (item.dueDate ? new Date(item.dueDate).toLocaleDateString() : "Today")}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      {phone && (
                        <TouchableOpacity
                          style={styles.waBtnMini}
                          onPress={() => handleSendWhatsApp(item)}
                        >
                          <Ionicons name="logo-whatsapp" size={13} color="#10B981" />
                          <Text style={styles.waBtnMiniText}>Send</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={styles.trashMini}
                        onPress={() => handleDelete(item.id || item._id, item.serviceName || item.title)}
                      >
                        <Ionicons name="trash-outline" size={13} color={C.red} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        {/* ── MODAL: CREATE REMINDER ── */}
        <Modal visible={modalVisible} animationType="fade" transparent>
          <KeyboardAvoidingView
            style={styles.modalBackdrop}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={styles.modalBox}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New Service Reminder</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Service Title */}
              <Text style={styles.fieldLabel}>Service / Renewal Name *</Text>
              <TextInput
                style={styles.inputMini}
                placeholder="e.g. Annual AMC Renewal, Filter Replacement"
                value={serviceName}
                onChangeText={setServiceName}
              />

              {/* Lead Picker */}
              <Text style={[styles.fieldLabel, { marginTop: 8 }]}>Select Target Client / Lead</Text>
              <TextInput
                style={styles.inputMini}
                placeholder="Search lead name..."
                value={leadSearch}
                onChangeText={setLeadSearch}
              />
              <ScrollView style={{ maxHeight: 90, marginTop: 4 }}>
                {leads
                  .filter((l) => (l.name || "").toLowerCase().includes(leadSearch.toLowerCase()))
                  .slice(0, 8)
                  .map((l) => {
                    const isSel = (selectedLead?.id || selectedLead?._id) === (l.id || l._id);
                    return (
                      <TouchableOpacity
                        key={l.id || l._id}
                        style={[styles.leadPickerItem, isSel && styles.leadPickerItemActive]}
                        onPress={() => setSelectedLead(l)}
                      >
                        <Text style={[styles.leadPickerText, isSel && styles.leadPickerTextActive]}>
                          {l.name} {l.company ? `(${l.company})` : ""}
                        </Text>
                        {isSel && <Ionicons name="checkmark" size={12} color={C.primary} />}
                      </TouchableOpacity>
                    );
                  })}
              </ScrollView>

              {/* Service Date & Repeat */}
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Due Date</Text>
                  <TextInput
                    style={styles.inputMini}
                    placeholder="YYYY-MM-DD"
                    value={serviceDate}
                    onChangeText={setServiceDate}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Repeat Frequency</Text>
                  <View style={{ flexDirection: "row", gap: 3, marginTop: 2 }}>
                    {["NONE", "MONTHLY", "YEARLY"].map((r) => (
                      <TouchableOpacity
                        key={r}
                        style={[styles.repPill, repeatType === r && styles.repPillActive]}
                        onPress={() => setRepeatType(r)}
                      >
                        <Text style={[styles.repPillText, repeatType === r && styles.repPillTextActive]}>
                          {r === "NONE" ? "Once" : r === "MONTHLY" ? "Month" : "Year"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.submitBtnMini}
                onPress={handleCreate}
                disabled={submitting}
              >
                <Text style={styles.submitBtnMiniText}>
                  {submitting ? "Saving..." : "Create Reminder"}
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </CompanyAdminLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  kpiRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: C.borderLight,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  kpiLabel: {
    fontSize: 9.5,
    fontFamily: FONTS.bodyBold,
    color: C.muted,
    textTransform: "uppercase",
  },
  kpiValue: {
    fontSize: 14,
    fontFamily: FONTS.displayBold,
    color: C.text,
  },
  newReminderBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.primary,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
  },
  newReminderBtnText: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: "#FFF",
    marginLeft: 2,
  },
  tabStrip: {
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  tabPills: {
    flexDirection: "row",
    gap: 4,
  },
  tabPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
  },
  tabPillActive: {
    backgroundColor: C.primary,
  },
  tabPillText: {
    fontSize: 10.5,
    fontFamily: FONTS.bodyMedium,
    color: C.sub,
  },
  tabPillTextActive: {
    color: "#FFF",
    fontFamily: FONTS.bodyBold,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    width: 120,
  },
  searchInput: {
    fontSize: 10.5,
    fontFamily: FONTS.body,
    color: C.text,
    flex: 1,
    paddingVertical: 2,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: C.muted,
    marginTop: 6,
  },
  content: {
    padding: 10,
    paddingBottom: 30,
  },
  emptyCard: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 12.5,
    fontFamily: FONTS.displayBold,
    color: C.text,
    marginTop: 6,
  },
  emptySub: {
    fontSize: 10.5,
    fontFamily: FONTS.body,
    color: C.muted,
    marginTop: 2,
  },
  emptyAddBtn: {
    marginTop: 10,
    backgroundColor: C.primaryLight,
    borderWidth: 1,
    borderColor: C.primaryBorder,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  emptyAddBtnText: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: C.primary,
  },
  remCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
  },
  remTitle: {
    fontSize: 12,
    fontFamily: FONTS.displayBold,
    color: C.text,
  },
  repBadge: {
    fontSize: 8.5,
    fontFamily: FONTS.bodyBold,
    color: C.blue,
    backgroundColor: C.blueBg,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  remLeadText: {
    fontSize: 10.5,
    fontFamily: FONTS.body,
    color: C.sub,
    marginTop: 2,
  },
  remDateText: {
    fontSize: 10,
    fontFamily: FONTS.bodyMedium,
    color: C.muted,
  },
  waBtnMini: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.greenBg,
    borderWidth: 1,
    borderColor: C.greenBorder,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
  },
  waBtnMiniText: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    color: "#10B981",
    marginLeft: 3,
  },
  trashMini: {
    padding: 4,
  },
  fieldLabel: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    color: C.sub,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  inputMini: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 11.5,
    fontFamily: FONTS.body,
    color: C.text,
  },
  leadPickerItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  leadPickerItemActive: {
    backgroundColor: C.primaryLight,
  },
  leadPickerText: {
    fontSize: 11,
    fontFamily: FONTS.body,
    color: C.text,
  },
  leadPickerTextActive: {
    color: C.primary,
    fontFamily: FONTS.bodyBold,
  },
  repPill: {
    flex: 1,
    paddingVertical: 5,
    alignItems: "center",
    borderRadius: 5,
    backgroundColor: "#F1F5F9",
  },
  repPillActive: {
    backgroundColor: C.primary,
  },
  repPillText: {
    fontSize: 9.5,
    fontFamily: FONTS.bodyMedium,
    color: C.sub,
  },
  repPillTextActive: {
    color: "#FFF",
    fontFamily: FONTS.bodyBold,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalBox: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: {
    fontSize: 13,
    fontFamily: FONTS.displayBold,
    color: C.text,
  },
  submitBtnMini: {
    backgroundColor: C.primary,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 12,
  },
  submitBtnMiniText: {
    fontSize: 11.5,
    fontFamily: FONTS.displayBold,
    color: "#FFF",
  },
});
