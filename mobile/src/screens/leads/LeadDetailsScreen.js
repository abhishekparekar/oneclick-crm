import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Dimensions,
  RefreshControl,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import CompanyAdminLayout from "../../components/CompanyAdminLayout";
import leadsService from "../../api/leadsService";
import { useAuth } from "../../context/AuthContext";

const { width } = Dimensions.get("window");

const THEME = {
  primary: "#F97316",
  primaryDark: "#EA580C",
  darkNavy: "#0F172A",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  borderLight: "#F1F5F9",
  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  emerald: "#10B981", emeraldBg: "#ECFDF5", emeraldBorder: "#A7F3D0",
  blue: "#3B82F6", blueBg: "#EFF6FF", blueBorder: "#BFDBFE",
  amber: "#F59E0B", amberBg: "#FEF3C7", amberBorder: "#FDE68A",
  violet: "#8B5CF6", violetBg: "#F5F3FF", violetBorder: "#DDD6FE",
  rose: "#EF4444", roseBg: "#FEE2E2", roseBorder: "#FECACA",
};

const DEFAULT_TEMPLATES = [
  {
    title: "Introductory Greeting",
    text: "Hello {name}, thank you for contacting OneClick HRMS! How can we assist with your requirements today?",
  },
  {
    title: "Schedule Follow-up Call",
    text: "Hi {name}, would you be available for a brief 10-minute call tomorrow to discuss your team setup?",
  },
  {
    title: "Product Pricing & Enterprise Demo",
    text: "Hello {name}, I have prepared our enterprise package details for you. Please let me know when you'd like to review it.",
  },
];

export default function LeadDetailsScreen({ route, navigation }) {
  const { leadId } = route.params || {};
  const { user } = useAuth();
  const currentUserId = user?._id || user?.id || "";
  const [lead, setLead] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Default to 'notes' (Timeline & Notes) as requested!
  const [activeTab, setActiveTab] = useState("notes"); // 'notes' | 'overview' | 'whatsapp'

  // Inline Fast Note Input
  const [inlineNote, setInlineNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // Status Change Modal
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Reminder Modal
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderNotes, setReminderNotes] = useState("");

  // Edit Lead Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [editForm, setEditForm] = useState({
    name: "",
    whatsappPhone: "",
    email: "",
    company: "",
    estimatedValue: "",
    assignedTo: "",
    notes: "",
  });

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const [leadData, statusList] = await Promise.all([
        leadsService.getLeadById(leadId),
        leadsService.getStatuses(),
      ]);

      setLead(leadData);
      setStatuses(Array.isArray(statusList) ? statusList : []);

      if (leadData) {
        setEditForm({
          name: leadData.name || "",
          whatsappPhone: leadData.whatsappPhone || "",
          email: leadData.email || "",
          company: leadData.company || "",
          estimatedValue: leadData.estimatedValue ? String(leadData.estimatedValue) : "",
          assignedTo: leadData.assignedTo?._id || leadData.assignedTo?.id || leadData.assignedTo || "",
          notes: leadData.notes || "",
        });
      }

      // Fetch employees
      try {
        const assignable = await leadsService.getAssignableUsers();
        setEmployees(Array.isArray(assignable) ? assignable : []);
      } catch (_) {}
    } catch (err) {
      console.warn("[LeadDetails] Fetch note:", err?.message || err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (leadId) fetchDetails();
  }, [leadId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDetails();
  }, [leadId]);

  // ── Quick Status Change ─────────────────────────────────────
  const handleStatusChange = async (newStatusId) => {
    try {
      setUpdating(true);
      const updated = await leadsService.updateLead(leadId, { statusId: newStatusId });
      const newStatusObj = statuses.find((s) => (s.id || s._id) === newStatusId);
      setLead((prev) => ({
        ...prev,
        statusId: newStatusId,
        status: newStatusObj || updated?.status || prev?.status,
      }));
      setStatusModalVisible(false);
      Alert.alert("Updated", "Pipeline stage updated!");
      fetchDetails();
    } catch (err) {
      Alert.alert("Error", "Failed to update stage.");
    } finally {
      setUpdating(false);
    }
  };

  // ── Fast Inline Add Note ────────────────────────────────────
  const handleAddInlineNote = async () => {
    if (!inlineNote.trim()) return Alert.alert("Required", "Note content cannot be empty.");
    try {
      setAddingNote(true);
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ", " + new Date().toLocaleDateString();
      const currentNotes = lead?.notes
        ? `• [${timestamp}] ${inlineNote.trim()}\n${lead.notes}`
        : `• [${timestamp}] ${inlineNote.trim()}`;

      await leadsService.updateLead(leadId, { notes: currentNotes });
      setInlineNote("");
      setLead((prev) => ({ ...prev, notes: currentNotes }));
      Alert.alert("Saved", "Note added to timeline!");
    } catch (err) {
      Alert.alert("Error", "Failed to add note.");
    } finally {
      setAddingNote(false);
    }
  };

  // ── Save Lead Profile Edits ─────────────────────────────────
  const handleSaveEdits = async () => {
    try {
      setUpdating(true);
      await leadsService.updateLead(leadId, editForm);
      setEditModalVisible(false);
      fetchDetails();
      Alert.alert("Saved", "Lead profile updated successfully.");
    } catch (err) {
      Alert.alert("Error", "Failed to save updates.");
    } finally {
      setUpdating(false);
    }
  };

  // ── Schedule Reminder ───────────────────────────────────────
  const handleAddReminder = async () => {
    if (!reminderTitle.trim()) return Alert.alert("Required", "Reminder title is required.");
    try {
      setUpdating(true);
      await leadsService.createReminder({
        title: reminderTitle,
        notes: reminderNotes,
        leadId: leadId,
      });
      setReminderModalVisible(false);
      setReminderTitle("");
      setReminderNotes("");
      fetchDetails();
      Alert.alert("Success", "Follow-up reminder scheduled!");
    } catch (err) {
      Alert.alert("Error", "Failed to schedule reminder.");
    } finally {
      setUpdating(false);
    }
  };

  // ── Delete Lead ─────────────────────────────────────────────
  const handleDelete = () => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to permanently delete this lead?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await leadsService.deleteLead(leadId);
              Alert.alert("Deleted", "Lead deleted successfully.");
              navigation.goBack();
            } catch (err) {
              Alert.alert("Error", "Failed to delete lead.");
            }
          },
        },
      ]
    );
  };

  // ── Direct Communications ────────────────────────────────────
  const handleWhatsApp = (customMsg = null) => {
    if (!lead?.whatsappPhone) return Alert.alert("No Number", "WhatsApp phone not available.");
    const cleanPhone = lead.whatsappPhone.replace(/[^0-9]/g, "");
    const msg = customMsg
      ? customMsg.replace("{name}", lead.name || "Client")
      : `Hello ${lead.name || ""}, thank you for contacting OneClick HRMS!`;
    Linking.openURL(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`);
  };

  const handleCall = () => {
    if (!lead?.whatsappPhone) return Alert.alert("No Number", "Phone number not available.");
    Linking.openURL(`tel:${lead.whatsappPhone}`);
  };

  const handleEmail = () => {
    if (!lead?.email) return Alert.alert("No Email", "Email address not available.");
    Linking.openURL(`mailto:${lead.email}`);
  };

  const statusColor = lead?.status?.color || THEME.primary;

  // Split timeline notes into structured items
  const parsedNotes = lead?.notes
    ? lead.notes.split("\n").filter((n) => n.trim().length > 0)
    : [];

  return (
    <CompanyAdminLayout
      navigation={navigation}
      activeTab="Leads"
      headerTitle="Lead Profile"
      showSearch={false}
      headerRightElement={
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <TouchableOpacity
            style={{ padding: 4 }}
            onPress={() => setEditModalVisible(true)}
          >
            <Feather name="edit-2" size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={{ padding: 4 }}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={19} color="#FECACA" />
          </TouchableOpacity>
        </View>
      }
    >
      <View style={styles.container}>
        {loading && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={THEME.primary} />
          </View>
        ) : !lead ? (
          <View style={styles.center}>
            <Text style={{ color: THEME.textMuted }}>Lead not found.</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.primary]} />}
          >
            {/* ═════════ 1. COMPACT HERO SUMMARY CARD ═════════ */}
            <LinearGradient
              colors={["#0F172A", "#1E293B"]}
              style={styles.heroSummaryCard}
            >
              <View style={styles.heroTopRow}>
                <View style={styles.heroAvatarCircle}>
                  <Text style={styles.heroAvatarLetter}>
                    {(lead.name || "L").charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.heroLeadName} numberOfLines={1}>{lead.name}</Text>
                  <Text style={styles.heroMetaSubtitle} numberOfLines={1}>
                    {lead.company ? `${lead.company} • ` : ""}{lead.source || "Direct Lead"}
                  </Text>
                </View>

                {lead.estimatedValue ? (
                  <View style={styles.dealPill}>
                    <Text style={styles.dealPillLabel}>VALUATION</Text>
                    <Text style={styles.dealPillAmount}>
                      ₹{Number(lead.estimatedValue).toLocaleString()}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Stage Selector Pill */}
              <TouchableOpacity
                style={[styles.stageBadgeDropdown, { backgroundColor: statusColor + "22", borderColor: statusColor }]}
                activeOpacity={0.8}
                onPress={() => setStatusModalVisible(true)}
              >
                <View style={[styles.stageDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.stageBadgeText, { color: "#FFF" }]}>
                  Stage: {lead.status?.name || "New Prospect"}
                </Text>
                <Ionicons name="chevron-down" size={13} color="#FFF" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </LinearGradient>

            {/* ═════════ 2. DIRECT ACTION BUTTONS ═════════ */}
            <View style={styles.actionBarRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: THEME.emeraldBg, borderColor: THEME.emeraldBorder }]}
                onPress={() => handleWhatsApp()}
              >
                <Ionicons name="logo-whatsapp" size={17} color="#10B981" />
                <Text style={[styles.actionBtnLabel, { color: "#10B981" }]}>WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: THEME.blueBg, borderColor: THEME.blueBorder }]}
                onPress={handleCall}
              >
                <Ionicons name="call" size={17} color={THEME.blue} />
                <Text style={[styles.actionBtnLabel, { color: THEME.blue }]}>Call</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: THEME.amberBg, borderColor: THEME.amberBorder }]}
                onPress={handleEmail}
              >
                <Ionicons name="mail" size={17} color="#B45309" />
                <Text style={[styles.actionBtnLabel, { color: "#B45309" }]}>Email</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: THEME.violetBg, borderColor: THEME.violetBorder }]}
                onPress={() => setReminderModalVisible(true)}
              >
                <Ionicons name="alarm" size={17} color={THEME.violet} />
                <Text style={[styles.actionBtnLabel, { color: THEME.violet }]}>Reminder</Text>
              </TouchableOpacity>
            </View>

            {/* ═════════ 3. SEGMENTED TABS ═════════ */}
            <View style={styles.tabNavRow}>
              <TouchableOpacity
                style={[styles.tabNavItem, activeTab === "notes" && styles.tabNavItemActive]}
                onPress={() => setActiveTab("notes")}
              >
                <Ionicons
                  name="chatbox-ellipses-outline"
                  size={14}
                  color={activeTab === "notes" ? "#FFF" : THEME.textMuted}
                />
                <Text style={[styles.tabNavLabel, activeTab === "notes" && styles.tabNavLabelActive]}>
                  Timeline & Notes
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabNavItem, activeTab === "overview" && styles.tabNavItemActive]}
                onPress={() => setActiveTab("overview")}
              >
                <Ionicons
                  name="person-outline"
                  size={14}
                  color={activeTab === "overview" ? "#FFF" : THEME.textMuted}
                />
                <Text style={[styles.tabNavLabel, activeTab === "overview" && styles.tabNavLabelActive]}>
                  Overview
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabNavItem, activeTab === "whatsapp" && styles.tabNavItemActive]}
                onPress={() => setActiveTab("whatsapp")}
              >
                <Ionicons
                  name="logo-whatsapp"
                  size={14}
                  color={activeTab === "whatsapp" ? "#FFF" : THEME.textMuted}
                />
                <Text style={[styles.tabNavLabel, activeTab === "whatsapp" && styles.tabNavLabelActive]}>
                  Templates
                </Text>
              </TouchableOpacity>
            </View>

            {/* ═════════ TAB 1: TIMELINE & NOTES (OPEN BY DEFAULT!) ═════════ */}
            {activeTab === "notes" && (
              <View style={styles.tabContentBlock}>
                {/* Fast Inline Note Composer */}
                <View style={styles.noteComposerCard}>
                  <Text style={styles.composerHeader}>LOG DISCUSSION / ACTIVITY</Text>
                  <TextInput
                    style={styles.composerInput}
                    placeholder="Type note, call summary, or customer requirement..."
                    placeholderTextColor={THEME.textMuted}
                    multiline
                    value={inlineNote}
                    onChangeText={setInlineNote}
                  />
                  <TouchableOpacity
                    style={[styles.postNoteButton, !inlineNote.trim() && { opacity: 0.6 }]}
                    onPress={handleAddInlineNote}
                    disabled={addingNote || !inlineNote.trim()}
                  >
                    {addingNote ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="send" size={13} color="#FFF" />
                        <Text style={styles.postNoteButtonText}>Post Note</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Timeline Feed */}
                <View style={styles.timelineContainer}>
                  <Text style={styles.sectionHeaderTitle}>ACTIVITY TIMELINE</Text>

                  {parsedNotes.length === 0 ? (
                    <View style={styles.emptyTimelineWrap}>
                      <Ionicons name="chatbubbles-outline" size={32} color={THEME.textMuted} />
                      <Text style={styles.emptyTimelineText}>No notes recorded yet. Add your first note above.</Text>
                    </View>
                  ) : (
                    parsedNotes.map((noteLine, i) => (
                      <View key={i} style={styles.timelineItemRow}>
                        <View style={styles.timelineDotWrap}>
                          <View style={styles.timelineDot} />
                          {i < parsedNotes.length - 1 && <View style={styles.timelineLine} />}
                        </View>
                        <View style={styles.timelineCard}>
                          <Text style={styles.timelineNoteText}>{noteLine.replace(/^•\s*/, "")}</Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </View>
            )}

            {/* ═════════ TAB 2: OVERVIEW ═════════ */}
            {activeTab === "overview" && (
              <View style={styles.tabContentBlock}>
                <View style={styles.detailsCard}>
                  <Text style={styles.sectionHeaderTitle}>CONTACT & COMPANY DETAILS</Text>

                  <View style={styles.infoRow}>
                    <View style={[styles.infoIconWrap, { backgroundColor: '#EEF2FF' }]}>
                      <Ionicons name="person-circle" size={16} color="#4F46E5" />
                    </View>
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Assigned Representative</Text>
                      <Text style={[styles.infoValue, { color: '#4F46E5', fontWeight: '700' }]}>
                        {lead.assignedTo?.name
                          ? `${lead.assignedTo.name}${lead.assignedTo.departmentId?.name || lead.assignedTo.department ? ` (${lead.assignedTo.departmentId?.name || lead.assignedTo.department})` : ""}`
                          : "Unassigned"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <View style={[styles.infoIconWrap, { backgroundColor: THEME.emeraldBg }]}>
                      <Ionicons name="logo-whatsapp" size={15} color="#10B981" />
                    </View>
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>WhatsApp Number</Text>
                      <Text style={styles.infoValue}>{lead.whatsappPhone || "Not provided"}</Text>
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <View style={[styles.infoIconWrap, { backgroundColor: THEME.blueBg }]}>
                      <Ionicons name="mail" size={15} color={THEME.blue} />
                    </View>
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Email Address</Text>
                      <Text style={styles.infoValue}>{lead.email || "Not provided"}</Text>
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <View style={[styles.infoIconWrap, { backgroundColor: THEME.violetBg }]}>
                      <Ionicons name="business" size={15} color={THEME.violet} />
                    </View>
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Company / Org</Text>
                      <Text style={styles.infoValue}>{lead.company || "Individual Prospect"}</Text>
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <View style={[styles.infoIconWrap, { backgroundColor: THEME.amberBg }]}>
                      <Ionicons name="link" size={15} color={THEME.primary} />
                    </View>
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Acquisition Channel</Text>
                      <Text style={styles.infoValue}>{lead.source || "Direct"}</Text>
                    </View>
                  </View>

                  <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                    <View style={[styles.infoIconWrap, { backgroundColor: THEME.bg }]}>
                      <Ionicons name="calendar-outline" size={15} color={THEME.textMuted} />
                    </View>
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Registration Date</Text>
                      <Text style={styles.infoValue}>
                        {lead.createdAt ? new Date(lead.createdAt).toLocaleString() : "Recently"}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* ═════════ TAB 3: QUICK WHATSAPP TEMPLATES ═════════ */}
            {activeTab === "whatsapp" && (
              <View style={styles.tabContentBlock}>
                <Text style={styles.sectionHeaderTitle}>PRE-CRAFTED WHATSAPP MESSAGES</Text>
                <Text style={styles.templateSubGuide}>Tap any template to send instantly to {lead.name}:</Text>

                {DEFAULT_TEMPLATES.map((t, idx) => (
                  <View key={idx} style={styles.templateCard}>
                    <View style={styles.templateHeaderRow}>
                      <Text style={styles.templateTitle}>{t.title}</Text>
                      <TouchableOpacity
                        style={styles.sendWhatsAppBtn}
                        onPress={() => handleWhatsApp(t.text)}
                      >
                        <Ionicons name="logo-whatsapp" size={13} color="#FFF" />
                        <Text style={styles.sendWhatsAppBtnText}>Send</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.templateBodyText}>{t.text.replace("{name}", lead.name || "Client")}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )}

        {/* ── MODAL: STAGE SELECTION ── */}
        <Modal visible={statusModalVisible} animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalHeading}>Move to Pipeline Stage</Text>
                <TouchableOpacity onPress={() => setStatusModalVisible(false)}>
                  <Ionicons name="close" size={22} color={THEME.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={{ gap: 8, marginTop: 8 }}>
                {statuses.map((st) => (
                  <TouchableOpacity
                    key={st.id || st._id}
                    style={styles.stageChoiceRow}
                    onPress={() => handleStatusChange(st.id || st._id)}
                  >
                    <View style={[styles.stageDot, { backgroundColor: st.color || THEME.primary }]} />
                    <Text style={styles.stageChoiceText}>{st.name}</Text>
                    {(lead?.statusId === (st.id || st._id) || lead?.status?.id === (st.id || st._id)) && (
                      <Ionicons name="checkmark-circle" size={18} color={THEME.primary} style={{ marginLeft: "auto" }} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Modal>

        {/* ── MODAL: SCHEDULE REMINDER ── */}
        <Modal visible={reminderModalVisible} animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalHeading}>Schedule Reminder</Text>
                <TouchableOpacity onPress={() => setReminderModalVisible(false)}>
                  <Ionicons name="close" size={22} color={THEME.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>Reminder Title *</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="e.g. Call regarding quotation review"
                value={reminderTitle}
                onChangeText={setReminderTitle}
              />

              <Text style={styles.fieldLabel}>Notes & Instructions</Text>
              <TextInput
                style={[styles.fieldInput, { height: 65, textAlignVertical: "top" }]}
                placeholder="Details..."
                multiline
                value={reminderNotes}
                onChangeText={setReminderNotes}
              />

              <TouchableOpacity style={styles.primarySubmitBtn} onPress={handleAddReminder} disabled={updating}>
                {updating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primarySubmitBtnText}>Schedule</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ── MODAL: EDIT LEAD ── */}
        <Modal visible={editModalVisible} animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalHeading}>Edit Lead Profile</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <Ionicons name="close" size={22} color={THEME.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.fieldLabel}>Full Name</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editForm.name}
                  onChangeText={(v) => setEditForm((p) => ({ ...p, name: v }))}
                />

                <Text style={styles.fieldLabel}>WhatsApp Phone</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editForm.whatsappPhone}
                  onChangeText={(v) => setEditForm((p) => ({ ...p, whatsappPhone: v }))}
                />

                <Text style={styles.fieldLabel}>Email Address</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editForm.email}
                  onChangeText={(v) => setEditForm((p) => ({ ...p, email: v }))}
                />

                <Text style={styles.fieldLabel}>Company Name</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editForm.company}
                  onChangeText={(v) => setEditForm((p) => ({ ...p, company: v }))}
                />

                <Text style={styles.fieldLabel}>Assign To Representative</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                  {currentUserId ? (
                    <TouchableOpacity
                      style={[styles.choiceChip, editForm.assignedTo === currentUserId && styles.choiceChipActive]}
                      onPress={() => setEditForm((p) => ({ ...p, assignedTo: currentUserId }))}
                    >
                      <Ionicons
                        name="person-circle"
                        size={14}
                        color={editForm.assignedTo === currentUserId ? "#FFF" : THEME.primary}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.choiceChipText, editForm.assignedTo === currentUserId && styles.choiceChipTextActive]}>
                        Assign to Myself ({user?.name || "Me"})
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity
                    style={[styles.choiceChip, !editForm.assignedTo && styles.choiceChipActive]}
                    onPress={() => setEditForm((p) => ({ ...p, assignedTo: "" }))}
                  >
                    <Text style={[styles.choiceChipText, !editForm.assignedTo && styles.choiceChipTextActive]}>
                      Unassigned
                    </Text>
                  </TouchableOpacity>

                  {employees
                    .filter((emp) => (emp.id || emp._id) !== currentUserId)
                    .map((emp) => {
                      const empId = emp.id || emp._id;
                      const isSelected = editForm.assignedTo === empId;
                      return (
                        <TouchableOpacity
                          key={empId}
                          style={[styles.choiceChip, isSelected && styles.choiceChipActive]}
                          onPress={() => setEditForm((p) => ({ ...p, assignedTo: empId }))}
                        >
                          <Ionicons name="person" size={12} color={isSelected ? "#FFF" : THEME.primary} style={{ marginRight: 4 }} />
                          <Text style={[styles.choiceChipText, isSelected && styles.choiceChipTextActive]}>
                            {emp.label || `${emp.name} (${emp.department || emp.role || 'Staff'})`}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                </ScrollView>

                <Text style={styles.fieldLabel}>Estimated Deal Value (₹)</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editForm.estimatedValue}
                  onChangeText={(v) => setEditForm((p) => ({ ...p, estimatedValue: v }))}
                />

                <TouchableOpacity style={styles.primarySubmitBtn} onPress={handleSaveEdits} disabled={updating}>
                  {updating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primarySubmitBtnText}>Save Changes</Text>}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </CompanyAdminLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 30,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  heroSummaryCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  heroAvatarLetter: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 18,
  },
  heroLeadName: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  heroMetaSubtitle: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  dealPill: {
    alignItems: "flex-end",
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dealPillLabel: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "#FDE68A",
  },
  dealPillAmount: {
    fontSize: 12,
    fontWeight: "900",
    color: "#FFFFFF",
    marginTop: 1,
  },
  stageBadgeDropdown: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
  },
  stageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  stageBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  actionBarRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  actionBtnLabel: {
    fontSize: 10.5,
    fontWeight: "800",
  },
  tabNavRow: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 3,
    marginBottom: 10,
  },
  tabNavItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 7,
    borderRadius: 8,
  },
  tabNavItemActive: {
    backgroundColor: THEME.primary,
  },
  tabNavLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: THEME.textMuted,
  },
  tabNavLabelActive: {
    color: "#FFF",
  },
  tabContentBlock: {
    gap: 10,
  },
  noteComposerCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 12,
  },
  composerHeader: {
    fontSize: 10,
    fontWeight: "800",
    color: THEME.textMuted,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  composerInput: {
    backgroundColor: THEME.bg,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12.5,
    color: THEME.textPrimary,
    minHeight: 55,
    textAlignVertical: "top",
  },
  postNoteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: THEME.primary,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: "flex-end",
    paddingHorizontal: 14,
  },
  postNoteButtonText: {
    color: "#FFF",
    fontSize: 11.5,
    fontWeight: "800",
  },
  timelineContainer: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 12,
  },
  sectionHeaderTitle: {
    fontSize: 10.5,
    fontWeight: "800",
    color: THEME.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  emptyTimelineWrap: {
    alignItems: "center",
    paddingVertical: 18,
  },
  emptyTimelineText: {
    fontSize: 11.5,
    color: THEME.textMuted,
    marginTop: 6,
    textAlign: "center",
  },
  timelineItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  timelineDotWrap: {
    alignItems: "center",
    width: 16,
    marginRight: 8,
    marginTop: 4,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.primary,
  },
  timelineLine: {
    width: 1.5,
    flex: 1,
    minHeight: 24,
    backgroundColor: THEME.border,
    marginTop: 2,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: THEME.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.borderLight,
    padding: 9,
  },
  timelineNoteText: {
    fontSize: 12,
    color: THEME.textPrimary,
    lineHeight: 17,
  },
  detailsCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: THEME.borderLight,
  },
  infoIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  infoCol: {
    marginLeft: 10,
  },
  infoLabel: {
    fontSize: 10,
    color: THEME.textMuted,
    fontWeight: "600",
  },
  infoValue: {
    fontSize: 12.5,
    fontWeight: "800",
    color: THEME.textPrimary,
    marginTop: 1,
  },
  templateSubGuide: {
    fontSize: 11,
    color: THEME.textSecondary,
    marginBottom: 8,
  },
  templateCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 11,
    marginBottom: 8,
  },
  templateHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  templateTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  sendWhatsAppBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#10B981",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sendWhatsAppBtnText: {
    color: "#FFF",
    fontSize: 10.5,
    fontWeight: "700",
  },
  templateBodyText: {
    fontSize: 11.5,
    color: THEME.textSecondary,
    lineHeight: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: "85%",
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalHeading: {
    fontSize: 16,
    fontWeight: "900",
    color: THEME.textPrimary,
  },
  stageChoiceRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 11,
    backgroundColor: THEME.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  stageChoiceText: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: "800",
    color: THEME.textSecondary,
    marginBottom: 5,
    marginTop: 8,
  },
  fieldInput: {
    backgroundColor: THEME.bg,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12.5,
    color: THEME.textPrimary,
  },
  primarySubmitBtn: {
    backgroundColor: THEME.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 14,
  },
  primarySubmitBtnText: {
    color: "#FFF",
    fontSize: 13.5,
    fontWeight: "800",
  },
});
