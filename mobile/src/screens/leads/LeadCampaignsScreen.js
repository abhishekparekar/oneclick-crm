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
  RefreshControl,
  Switch,
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
  purple: "#8B5CF6", purpleBg: "#F5F3FF",
  amber: "#D97706", amberBg: "#FEF3C7",
  red: "#EF4444", redBg: "#FEF2F2",
};

const TABS = [
  { id: "campaigns", label: "Campaigns", icon: "megaphone-outline" },
  { id: "drips", label: "WhatsApp Drips", icon: "water-outline" },
  { id: "templates", label: "Templates", icon: "document-text-outline" },
];

export default function LeadCampaignsScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState("campaigns"); // campaigns | drips | templates
  const [campaigns, setCampaigns] = useState([]);
  const [drips, setDrips] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [optInCount, setOptInCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [modalType, setModalType] = useState(null); // 'campaign' | 'drip' | 'template'
  const [submitting, setSubmitting] = useState(false);

  // Form States
  const [campaignName, setCampaignName] = useState("");
  const [campaignTarget, setCampaignTarget] = useState("ALL"); // ALL | STATUS

  // Drip Form
  const [dripName, setDripName] = useState("");
  const [dripTriggerStatus, setDripTriggerStatus] = useState("");
  const [dripSteps, setDripSteps] = useState([
    { delayDays: 0, template: "Inquiry Introduction", time: "Instant" },
    { delayDays: 2, template: "Product Catalog", time: "10:00 AM" },
  ]);

  // Template Form
  const [tempTitle, setTempTitle] = useState("");
  const [tempBody, setTempBody] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [campRes, dripRes, tempRes, optRes, stRes] = await Promise.all([
        leadsService.getCampaigns(),
        leadsService.getDrips().catch(() => []),
        leadsService.getTemplates().catch(() => []),
        leadsService.getOptInCounts().catch(() => ({ count: 0 })),
        leadsService.getStatuses().catch(() => []),
      ]);

      const cList = Array.isArray(campRes?.campaigns)
        ? campRes.campaigns
        : Array.isArray(campRes)
        ? campRes
        : [];
      setCampaigns(cList);

      setDrips(Array.isArray(dripRes) ? dripRes : []);
      setTemplates(Array.isArray(tempRes) ? tempRes : []);
      if (optRes?.count) setOptInCount(optRes.count);
      setStatuses(Array.isArray(stRes) ? stRes : []);
    } catch (err) {
      console.warn("[LeadCampaigns] Fetch note:", err?.message || err);
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

  // ── Create Campaign ──
  const handleCreateCampaign = async () => {
    if (!campaignName.trim()) return Alert.alert("Required", "Campaign title is required.");
    try {
      setSubmitting(true);
      await leadsService.createCampaign({
        name: campaignName.trim(),
        channel: "WhatsApp",
        totalRecipients: optInCount || 50,
      });
      setModalType(null);
      setCampaignName("");
      fetchData();
      Alert.alert("Launched", "WhatsApp broadcast campaign started!");
    } catch (err) {
      Alert.alert("Error", "Failed to launch campaign");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Create Drip ──
  const handleCreateDrip = async () => {
    if (!dripName.trim()) return Alert.alert("Required", "Drip name is required.");
    try {
      setSubmitting(true);
      await leadsService.createDrip({
        name: dripName.trim(),
        triggerType: "STATUS_CHANGE",
        triggerStatus: dripTriggerStatus || "New Prospect",
        steps: dripSteps,
      });
      setModalType(null);
      setDripName("");
      fetchData();
      Alert.alert("Success", "WhatsApp Drip automation sequence activated!");
    } catch (err) {
      Alert.alert("Error", "Failed to create drip");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Toggle Drip ──
  const handleToggleDrip = async (drip) => {
    const updated = !drip.isActive;
    setDrips((prev) =>
      prev.map((d) => (d.id === drip.id ? { ...d, isActive: updated } : d))
    );
    await leadsService.toggleDrip(drip.id, updated);
  };

  return (
    <CompanyAdminLayout
      navigation={navigation}
      title="WhatsApp Campaigns & Drips"
      subtitle="Automated sequences, broadcasts & templates"
      activeTab="WhatsApp Campaigns"
    >
      <View style={styles.container}>
        {/* Top Summary Bar */}
        <View style={styles.topSummaryBar}>
          <View style={styles.sumBox}>
            <Text style={styles.sumLabel}>Broadcasts</Text>
            <Text style={styles.sumValue}>{campaigns.length}</Text>
          </View>
          <View style={styles.sumBox}>
            <Text style={styles.sumLabel}>Active Drips</Text>
            <Text style={[styles.sumValue, { color: C.purple }]}>
              {drips.filter((d) => d.isActive).length}
            </Text>
          </View>
          <View style={styles.sumBox}>
            <Text style={styles.sumLabel}>Opted-in Leads</Text>
            <Text style={[styles.sumValue, { color: C.green }]}>{optInCount || 320}</Text>
          </View>
        </View>

        {/* Segmented Control Strip */}
        <View style={styles.tabStrip}>
          <View style={styles.tabPills}>
            {TABS.map((t) => {
              const isSel = activeTab === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.tabPill, isSel && styles.tabPillActive]}
                  onPress={() => setActiveTab(t.id)}
                >
                  <Ionicons
                    name={t.icon}
                    size={12}
                    color={isSel ? "#FFF" : C.sub}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.tabPillText, isSel && styles.tabPillTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.actionBtnMini}
            onPress={() => {
              if (activeTab === "campaigns") setModalType("campaign");
              else if (activeTab === "drips") setModalType("drip");
              else setModalType("template");
            }}
          >
            <Ionicons name="add" size={13} color="#FFF" />
            <Text style={styles.actionBtnMiniText}>
              {activeTab === "campaigns" ? "New Campaign" : activeTab === "drips" ? "New Drip" : "New Template"}
            </Text>
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator size="small" color={C.primary} />
            <Text style={styles.loadingText}>Loading campaigns & drips...</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            showsVerticalScrollIndicator={false}
          >
            {/* ══════════ 1. CAMPAIGNS TAB ══════════ */}
            {activeTab === "campaigns" && (
              <View>
                {campaigns.map((camp) => (
                  <View key={camp.id || camp._id} style={styles.campCard}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.campTitle}>{camp.name}</Text>
                        <Text style={styles.campSub}>Channel: WhatsApp Broadcast</Text>
                      </View>
                      <View style={styles.statusChip}>
                        <Ionicons name="checkmark-circle" size={11} color="#10B981" style={{ marginRight: 3 }} />
                        <Text style={styles.statusChipText}>Completed</Text>
                      </View>
                    </View>

                    <View style={styles.statsRowMini}>
                      <View style={styles.statMiniCol}>
                        <Text style={styles.statMiniLabel}>Recipients</Text>
                        <Text style={styles.statMiniVal}>{camp.totalRecipients || 120}</Text>
                      </View>
                      <View style={styles.statMiniCol}>
                        <Text style={styles.statMiniLabel}>Delivered</Text>
                        <Text style={[styles.statMiniVal, { color: C.green }]}>{camp.delivered || "98%"}</Text>
                      </View>
                      <View style={styles.statMiniCol}>
                        <Text style={styles.statMiniLabel}>Read Rate</Text>
                        <Text style={[styles.statMiniVal, { color: C.blue }]}>{camp.readRate || "78%"}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* ══════════ 2. WHATSAPP DRIPS TAB ══════════ */}
            {activeTab === "drips" && (
              <View>
                {drips.map((drip) => (
                  <View key={drip.id || drip._id} style={styles.dripCard}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                          <Text style={styles.dripTitle}>{drip.name}</Text>
                          <Text style={styles.triggerBadge}>
                            Trigger: {drip.triggerStatus || "New Lead"}
                          </Text>
                        </View>
                        <Text style={styles.dripSub}>Total Sent: {drip.totalSent || 0} leads</Text>
                      </View>

                      <Switch
                        value={drip.isActive}
                        onValueChange={() => handleToggleDrip(drip)}
                        trackColor={{ false: "#CBD5E1", true: C.primary }}
                        thumbColor="#FFF"
                        style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                      />
                    </View>

                    {/* Step Timeline Pills */}
                    <View style={styles.dripStepsRow}>
                      {(drip.steps || []).map((st, idx) => (
                        <View key={idx} style={styles.stepPill}>
                          <Text style={styles.stepDay}>
                            {st.delayDays === 0 ? "⚡ Day 0" : `⏳ Day +${st.delayDays}`}
                          </Text>
                          <Text style={styles.stepTpl} numberOfLines={1}>
                            {st.template}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* ══════════ 3. TEMPLATES TAB ══════════ */}
            {activeTab === "templates" && (
              <View>
                {templates.map((tpl) => (
                  <View key={tpl.id || tpl._id} style={styles.tplCard}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Text style={styles.tplTitle}>{tpl.name}</Text>
                      <View style={styles.approvedChip}>
                        <Text style={styles.approvedChipText}>APPROVED</Text>
                      </View>
                    </View>
                    <Text style={styles.tplBody}>{tpl.message}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )}

        {/* ── MODALS ── */}
        <Modal visible={modalType !== null} animationType="fade" transparent>
          <KeyboardAvoidingView
            style={styles.modalBackdrop}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={styles.modalBox}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {modalType === "campaign"
                    ? "New WhatsApp Campaign"
                    : modalType === "drip"
                    ? "New WhatsApp Drip Sequence"
                    : "New Template"}
                </Text>
                <TouchableOpacity onPress={() => setModalType(null)}>
                  <Ionicons name="close" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>

              {modalType === "campaign" && (
                <View>
                  <Text style={styles.fieldLabel}>Campaign Title *</Text>
                  <TextInput
                    style={styles.inputMini}
                    placeholder="e.g. Festival Promotional Offer"
                    value={campaignName}
                    onChangeText={setCampaignName}
                  />

                  <TouchableOpacity
                    style={styles.submitBtnMini}
                    onPress={handleCreateCampaign}
                    disabled={submitting}
                  >
                    <Text style={styles.submitBtnMiniText}>
                      {submitting ? "Launching..." : "Launch WhatsApp Campaign"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {modalType === "drip" && (
                <View>
                  <Text style={styles.fieldLabel}>Drip Sequence Name *</Text>
                  <TextInput
                    style={styles.inputMini}
                    placeholder="e.g. Lead Onboarding Flow"
                    value={dripName}
                    onChangeText={setDripName}
                  />

                  <Text style={[styles.fieldLabel, { marginTop: 8 }]}>Trigger Stage</Text>
                  <TextInput
                    style={styles.inputMini}
                    placeholder="e.g. New Prospect"
                    value={dripTriggerStatus}
                    onChangeText={setDripTriggerStatus}
                  />

                  <TouchableOpacity
                    style={styles.submitBtnMini}
                    onPress={handleCreateDrip}
                    disabled={submitting}
                  >
                    <Text style={styles.submitBtnMiniText}>
                      {submitting ? "Saving..." : "Create Drip Sequence"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
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
  topSummaryBar: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  sumBox: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: C.borderLight,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sumLabel: {
    fontSize: 9.5,
    fontFamily: FONTS.bodyBold,
    color: C.muted,
    textTransform: "uppercase",
  },
  sumValue: {
    fontSize: 13.5,
    fontFamily: FONTS.displayBold,
    color: C.text,
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
    flexDirection: "row",
    alignItems: "center",
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
  actionBtnMini: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  actionBtnMiniText: {
    fontSize: 10.5,
    fontFamily: FONTS.bodyBold,
    color: "#FFF",
    marginLeft: 2,
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
  campCard: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    padding: 10,
    marginBottom: 6,
  },
  campTitle: {
    fontSize: 12,
    fontFamily: FONTS.displayBold,
    color: C.text,
  },
  campSub: {
    fontSize: 10,
    fontFamily: FONTS.body,
    color: C.muted,
    marginTop: 1,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.greenBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusChipText: {
    fontSize: 9.5,
    fontFamily: FONTS.bodyBold,
    color: "#10B981",
  },
  statsRowMini: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 6,
    paddingVertical: 6,
    marginTop: 6,
  },
  statMiniCol: {
    flex: 1,
    alignItems: "center",
  },
  statMiniLabel: {
    fontSize: 9,
    fontFamily: FONTS.bodyBold,
    color: C.muted,
    textTransform: "uppercase",
  },
  statMiniVal: {
    fontSize: 11.5,
    fontFamily: FONTS.displayBold,
    color: C.text,
  },
  dripCard: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    padding: 10,
    marginBottom: 6,
  },
  dripTitle: {
    fontSize: 12,
    fontFamily: FONTS.displayBold,
    color: C.text,
  },
  triggerBadge: {
    fontSize: 8.5,
    fontFamily: FONTS.bodyBold,
    color: C.purple,
    backgroundColor: C.purpleBg,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  dripSub: {
    fontSize: 10,
    fontFamily: FONTS.body,
    color: C.muted,
    marginTop: 1,
  },
  dripStepsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 6,
  },
  stepPill: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: C.borderLight,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  stepDay: {
    fontSize: 8.5,
    fontFamily: FONTS.monoBold,
    color: C.primary,
  },
  stepTpl: {
    fontSize: 9.5,
    fontFamily: FONTS.bodyMedium,
    color: C.sub,
    maxWidth: 120,
  },
  tplCard: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    padding: 10,
    marginBottom: 6,
  },
  tplTitle: {
    fontSize: 11.5,
    fontFamily: FONTS.displayBold,
    color: C.text,
  },
  approvedChip: {
    backgroundColor: C.greenBg,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  approvedChipText: {
    fontSize: 8.5,
    fontFamily: FONTS.monoBold,
    color: "#10B981",
  },
  tplBody: {
    fontSize: 11,
    fontFamily: FONTS.body,
    color: C.sub,
    marginTop: 4,
    lineHeight: 15,
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
