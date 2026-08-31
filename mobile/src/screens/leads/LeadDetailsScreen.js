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
  Image,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import CompanyAdminLayout from "../../components/CompanyAdminLayout";
import leadsService from "../../api/leadsService";
import { useAuth } from "../../context/AuthContext";
import { COLORS, FONTS } from "../../theme/tokens";

const { width } = Dimensions.get("window");

const THEME = {
  primary: "#1268D9",
  primaryLight: "#2F8BFF",
  primaryBg: "#EFF6FF",
  accent: "#F59E0B",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  borderLight: "#F1F5F9",
  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  danger: "#EF4444",
  dangerBg: "#FEF2F2",
  success: "#10B981",
  successBg: "#ECFDF5",
  emerald: "#10B981",
  emeraldBg: "#ECFDF5",
  emeraldBorder: "#A7F3D0",
  blue: "#3B82F6",
  blueBg: "#EFF6FF",
  blueBorder: "#BFDBFE",
  violet: "#8B5CF6",
  violetBg: "#F5F3FF",
  violetBorder: "#DDD6FE",
  amber: "#D97706",
  amberBg: "#FFFBEB",
  amberBorder: "#FDE68A",
  rose: "#EF4444",
  roseBg: "#FEE2E2",
  roseBorder: "#FECACA",
};

const DEFAULT_TEMPLATES = [
  {
    title: "Intro & Welcome",
    text: "Hello {name}, thank you for your interest in our services! How can we assist you today?",
  },
  {
    title: "Product Overview",
    text: "Hi {name}, here is an overview of what we offer. Let us know if you'd like a live demo!",
  },
  {
    title: "Schedule Call",
    text: "Dear {name}, would you be available for a brief 10-minute call tomorrow?",
  },
  {
    title: "Follow-up",
    text: "Hello {name}, just following up on our previous conversation. Do you have any questions?",
  },
  {
    title: "Special Offer",
    text: "Hi {name}! We have an exclusive limited-time offer for you. Reply YES to know more!",
  },
];

export default function LeadDetailsScreen({ route, navigation }) {
  const leadId =
    route?.params?.leadId ||
    route?.params?.id ||
    route?.params?.lead?._id ||
    route?.params?.lead?.id ||
    "";
  const initialLead = route?.params?.lead || null;
  const { user } = useAuth();
  const currentUserId = user?._id || user?.id || "";
  const [lead, setLead] = useState(initialLead);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(!initialLead);
  const [refreshing, setRefreshing] = useState(false);

  // Default to 'notes' (Timeline & Notes) as requested!
  const [activeTab, setActiveTab] = useState("whatsapp"); // 'notes' | 'overview' | 'whatsapp'

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

  // WhatsApp Templates & Cloud Messaging State
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [varValues, setVarValues] = useState({ 1: "", 2: "", 3: "" });
  const [mediaUrl, setMediaUrl] = useState("");
  const [sendingCloudMsg, setSendingCloudMsg] = useState(false);

  const getTemplateVarCount = (tpl) => {
    if (!tpl) return 0;
    const matches = (tpl.bodyText || tpl.message || "").match(/\{\{\d+\}\}/g) || [];
    const numbers = matches.map((m) => parseInt(m.replace(/\D/g, ""), 10)).filter((n) => !isNaN(n));
    return numbers.length > 0 ? Math.max(...numbers) : (tpl.variablesJson?.length || 0);
  };

  const getTemplateVarLabel = (index) => {
    switch (index) {
      case 1:
        return "Customer Name";
      case 2:
        return "Company / Service";
      case 3:
        return "Contact / Phone";
      case 4:
        return "Order / Reference ID";
      case 5:
        return "Status / Stage";
      case 6:
        return "Tracking / Link";
      default:
        return `Variable {{${index}}}`;
    }
  };

  const initVariablesForTemplate = (tpl, leadData) => {
    if (!tpl) return;
    const count = Math.max(getTemplateVarCount(tpl), 3);
    const l = leadData || lead;
    const newVars = {};
    for (let i = 1; i <= count; i++) {
      if (i === 1) newVars[1] = l?.name || "Client";
      else if (i === 2) newVars[2] = l?.company || l?.productService || "Business Services";
      else if (i === 3) newVars[3] = l?.whatsappPhone || l?.phone || "+91 9689119006";
      else if (i === 4) newVars[4] = "ORD-" + Math.floor(100000 + Math.random() * 900000);
      else if (i === 5) newVars[5] = l?.status?.name || "Active";
      else if (i === 6) newVars[6] = "https://wa.me/919689119006";
      else newVars[i] = `Value ${i}`;
    }
    setVarValues(newVars);

    // Initialize media header URL if template has image/video/document header
    const defaultMedia =
      tpl.headerContent ||
      (tpl.headerType === "IMAGE"
        ? "https://images.unsplash.com/photo-1579389083078-4e7018379f7e?w=800"
        : tpl.headerType === "DOCUMENT"
          ? "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
          : tpl.headerType === "VIDEO"
            ? "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
            : "");
    setMediaUrl(defaultMedia);
  };

  const fetchDetails = async () => {
    if (!leadId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      if (!lead) setLoading(true);
      const [leadData, statusList, tplList] = await Promise.all([
        leadsService.getLeadById(leadId).catch((err) => {
          console.warn("[LeadDetails] getLeadById error:", err?.message || err);
          return initialLead || null;
        }),
        leadsService.getStatuses().catch(() => []),
        leadsService.getTemplates().catch(() => []),
      ]);

      if (leadData) {
        setLead(leadData);
      }
      setStatuses(Array.isArray(statusList) ? statusList : []);
      if (Array.isArray(tplList) && tplList.length > 0) {
        setTemplates(tplList);
        setSelectedTemplate(tplList[0]);
        initVariablesForTemplate(tplList[0], leadData || lead);
      }

      const activeLead = leadData || lead;
      if (activeLead) {
        setEditForm({
          name: activeLead.name || "",
          whatsappPhone: activeLead.whatsappPhone || "",
          email: activeLead.email || "",
          company: activeLead.company || "",
          estimatedValue: activeLead.estimatedValue ? String(activeLead.estimatedValue) : "",
          assignedTo: activeLead.assignedTo?._id || activeLead.assignedTo?.id || activeLead.assignedTo || "",
          notes: activeLead.notes || "",
        });
      }

      // Fetch employees
      try {
        const assignable = await leadsService.getAssignableUsers();
        setEmployees(Array.isArray(assignable) ? assignable : []);
      } catch (_) { }
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
    let cleanPhone = lead.whatsappPhone.replace(/[^0-9]/g, "");
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;
    const msg = customMsg
      ? customMsg.replace("{name}", lead.name || "Client")
      : `Hello ${lead.name || ""}, thank you for contacting OneClick HRMS!`;
    Linking.openURL(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`).catch(() => {
      Alert.alert("WhatsApp Error", "Could not open WhatsApp app on this device.");
    });
  };

  const handleSendCloudWhatsApp = async (tpl = null) => {
    if (!lead?.whatsappPhone) return Alert.alert("No Number", "WhatsApp phone number is missing.");
    const targetTpl = tpl || selectedTemplate || templates[0];
    if (!targetTpl) return Alert.alert("Select Template", "Please select a template to send.");

    setSendingCloudMsg(true);
    let cleanPhone = lead.whatsappPhone.replace(/[^0-9]/g, "");
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

    const varCount = Math.max(getTemplateVarCount(targetTpl), 1);
    const finalParams = [];
    let formattedBody = targetTpl.bodyText || targetTpl.message || "";

    for (let i = 1; i <= varCount; i++) {
      const val = varValues[i] !== undefined && varValues[i] !== null && String(varValues[i]).trim() !== ""
        ? String(varValues[i])
        : (i === 1 ? (lead.name || "Client") : `Value ${i}`);
      finalParams.push(val);
      formattedBody = formattedBody.replace(new RegExp(`\\{\\{${i}\\}\\}`, "g"), val);
    }

    try {
      const res = await leadsService.sendWhatsAppMessage({
        leadId: leadId,
        recipient: cleanPhone,
        templateId: targetTpl._id || targetTpl.id || targetTpl.name,
        templateName: targetTpl.name,
        params: finalParams,
        variables: varValues,
        variableValues: varValues,
        mediaUrl: mediaUrl.trim(),
        mediaType: targetTpl.headerType || "NONE",
        text: formattedBody,
      });

      // Log note on timeline
      const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + ", " + new Date().toLocaleDateString();
      const noteEntry = `• [${timestamp}] WhatsApp Template "${targetTpl.name}" sent to +${cleanPhone}`;
      const updatedNotes = lead?.notes ? `${noteEntry}\n${lead.notes}` : noteEntry;
      await leadsService.updateLead(leadId, { notes: updatedNotes });
      setLead((p) => ({ ...p, notes: updatedNotes }));

      Alert.alert(
        "Delivered! ⚡",
        `Template "${targetTpl.name}" dispatched successfully to +${cleanPhone} via Cloud Gateway! Message queued for delivery.`
      );
      fetchDetails();
    } catch (err) {
      const errMsg =
        err?.response?.data?.metaError ||
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err.message ||
        "Failed to send message via Cloud Gateway";
      Alert.alert("Gateway Notice ⚠️", errMsg);
    } finally {
      setSendingCloudMsg(false);
    }
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

                <View style={{ flex: 1, marginLeft: 8 }}>
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

              {/* Compact Stage Selector Pill or Locked Won/Lost Badge */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" }}>
                {(() => {
                  const sName = (lead.status?.name || "").toLowerCase();
                  const isWonLead = sName.includes("won") || sName.includes("converted") || sName.includes("selected");
                  const isLostLead = sName.includes("lost") || sName.includes("dropped") || sName.includes("rejected") || sName.includes("closed");

                  if (isWonLead || isLostLead) {
                    return (
                      <View style={[styles.stageBadgeDropdown, { backgroundColor: isWonLead ? "#064E3B" : "#881337", borderColor: isWonLead ? "#10B981" : "#F43F5E" }]}>
                        <Ionicons name={isWonLead ? "checkmark-circle" : "close-circle"} size={12} color="#FFF" style={{ marginRight: 4 }} />
                        <Text style={[styles.stageBadgeText, { color: "#FFF", fontWeight: "800" }]}>
                          Stage: {lead.status?.name || (isWonLead ? "Won" : "Closed")} (Locked)
                        </Text>
                      </View>
                    );
                  }

                  return (
                    <TouchableOpacity
                      style={[styles.stageBadgeDropdown, { backgroundColor: statusColor + "22", borderColor: statusColor }]}
                      activeOpacity={0.8}
                      onPress={() => setStatusModalVisible(true)}
                    >
                      <View style={[styles.stageDot, { backgroundColor: statusColor }]} />
                      <Text style={[styles.stageBadgeText, { color: "#FFF" }]}>
                        Stage: {lead.status?.name || "New Prospect"}
                      </Text>
                      <Ionicons name="chevron-down" size={11} color="#FFF" style={{ marginLeft: 3 }} />
                    </TouchableOpacity>
                  );
                })()}

                <Text style={{ fontSize: 9.5, color: "#94A3B8" }}>
                  {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : "Active"}
                </Text>
              </View>
            </LinearGradient>

            {/* ═════════ 2. COMPACT ACTION BAR ═════════ */}
            <View style={styles.actionBarRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: THEME.emeraldBg, borderColor: THEME.emeraldBorder }]}
                onPress={() => handleWhatsApp()}
              >
                <Ionicons name="logo-whatsapp" size={14} color="#10B981" />
                <Text style={[styles.actionBtnLabel, { color: "#10B981" }]}>WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: THEME.blueBg, borderColor: THEME.blueBorder }]}
                onPress={handleCall}
              >
                <Ionicons name="call" size={14} color={THEME.blue} />
                <Text style={[styles.actionBtnLabel, { color: THEME.blue }]}>Call</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: THEME.amberBg, borderColor: THEME.amberBorder }]}
                onPress={handleEmail}
              >
                <Ionicons name="mail" size={14} color="#B45309" />
                <Text style={[styles.actionBtnLabel, { color: "#B45309" }]}>Email</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: THEME.violetBg, borderColor: THEME.violetBorder }]}
                onPress={() => setReminderModalVisible(true)}
              >
                <Ionicons name="alarm" size={14} color={THEME.violet} />
                <Text style={[styles.actionBtnLabel, { color: THEME.violet }]}>Reminder</Text>
              </TouchableOpacity>
            </View>

            {/* ═════════ 3. COMPACT SEGMENTED TABS ═════════ */}
            <View style={styles.tabNavRow}>
              <TouchableOpacity
                style={[styles.tabNavItem, activeTab === "notes" && styles.tabNavItemActive]}
                onPress={() => setActiveTab("notes")}
              >
                <Ionicons
                  name="chatbox-ellipses-outline"
                  size={12}
                  color={activeTab === "notes" ? "#FFF" : THEME.textMuted}
                />
                <Text style={[styles.tabNavLabel, activeTab === "notes" && styles.tabNavLabelActive]}>
                  Notes ({parsedNotes.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabNavItem, activeTab === "overview" && styles.tabNavItemActive]}
                onPress={() => setActiveTab("overview")}
              >
                <Ionicons
                  name="person-outline"
                  size={12}
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
                  size={12}
                  color={activeTab === "whatsapp" ? "#FFF" : THEME.textMuted}
                />
                <Text style={[styles.tabNavLabel, activeTab === "whatsapp" && styles.tabNavLabelActive]}>
                  Templates ({templates.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* ═════════ TAB 1: COMPACT TIMELINE & NOTES ═════════ */}
            {activeTab === "notes" && (
              <View style={styles.tabContentBlock}>
                {/* Fast Inline Note Composer */}
                <View style={styles.noteComposerCard}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={styles.composerHeader}>LOG NOTE / CALL SUMMARY</Text>
                    <Text style={{ fontSize: 9, color: THEME.textMuted }}>Saves to timeline</Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    <TextInput
                      style={[styles.composerInput, { flex: 1 }]}
                      placeholder="Type quick discussion or requirement..."
                      placeholderTextColor={THEME.textMuted}
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
                          <Ionicons name="send" size={11} color="#FFF" />
                          <Text style={styles.postNoteButtonText}>Post</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Compact Timeline Feed */}
                <View style={styles.timelineContainer}>
                  <Text style={styles.sectionHeaderTitle}>COMMUNICATION TIMELINE</Text>

                  {parsedNotes.length === 0 ? (
                    <View style={styles.emptyTimelineWrap}>
                      <Ionicons name="chatbubbles-outline" size={24} color={THEME.textMuted} />
                      <Text style={styles.emptyTimelineText}>No notes recorded yet.</Text>
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

            {/* ═════════ TAB 2: COMPACT OVERVIEW ═════════ */}
            {activeTab === "overview" && (
              <View style={styles.tabContentBlock}>
                <View style={styles.detailsCard}>
                  <Text style={styles.sectionHeaderTitle}>CONTACT & ASSIGNMENT DETAILS</Text>

                  <View style={styles.infoRow}>
                    <View style={[styles.infoIconWrap, { backgroundColor: '#EEF2FF' }]}>
                      <Ionicons name="person-circle" size={14} color="#4F46E5" />
                    </View>
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Assigned Representative</Text>
                      <Text style={[styles.infoValue, { color: '#4F46E5' }]}>
                        {lead.assignedTo?.name
                          ? `${lead.assignedTo.name}${lead.assignedTo.departmentId?.name || lead.assignedTo.department ? ` (${lead.assignedTo.departmentId?.name || lead.assignedTo.department})` : ""}`
                          : "Unassigned"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <View style={[styles.infoIconWrap, { backgroundColor: THEME.emeraldBg }]}>
                      <Ionicons name="logo-whatsapp" size={14} color="#10B981" />
                    </View>
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>WhatsApp Number</Text>
                      <Text style={styles.infoValue}>{lead.whatsappPhone || "Not provided"}</Text>
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <View style={[styles.infoIconWrap, { backgroundColor: THEME.blueBg }]}>
                      <Ionicons name="mail" size={14} color={THEME.blue} />
                    </View>
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Email Address</Text>
                      <Text style={styles.infoValue}>{lead.email || "Not provided"}</Text>
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <View style={[styles.infoIconWrap, { backgroundColor: THEME.violetBg }]}>
                      <Ionicons name="business" size={14} color={THEME.violet} />
                    </View>
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Company / Org</Text>
                      <Text style={styles.infoValue}>{lead.company || "Individual Prospect"}</Text>
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <View style={[styles.infoIconWrap, { backgroundColor: THEME.amberBg }]}>
                      <Ionicons name="link" size={14} color={THEME.primary} />
                    </View>
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Acquisition Channel</Text>
                      <Text style={styles.infoValue}>{lead.source || "Direct"}</Text>
                    </View>
                  </View>

                  <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                    <View style={[styles.infoIconWrap, { backgroundColor: THEME.bg }]}>
                      <Ionicons name="calendar-outline" size={14} color={THEME.textMuted} />
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

            {/* ═════════ TAB 3: NATIVE COMPACT WHATSAPP TEMPLATES ═════════ */}
            {activeTab === "whatsapp" && (
              <View style={styles.tabContentBlock}>
                {/* Meta Verified Header Strip */}
                <View style={styles.waNativeHeaderStrip}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <Ionicons name="logo-whatsapp" size={13} color="#25D366" />
                    <Text style={styles.waNativeHeaderTitle}>META CLOUD TEMPLATES</Text>
                  </View>
                  <View style={styles.waNativeLivePill}>
                    <View style={styles.waNativeDot} />
                    <Text style={styles.waNativeLiveText}>GATEWAY LIVE</Text>
                  </View>
                </View>

                {/* Horizontal Synced Template Selector */}
                {templates.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 2 }}>
                    {templates.map((tpl, i) => {
                      const isSel = (selectedTemplate?.name || selectedTemplate?.id) === (tpl.name || tpl.id);
                      return (
                        <TouchableOpacity
                          key={tpl.id || tpl._id || i}
                          style={[
                            styles.nativeTplPill,
                            isSel && styles.nativeTplPillActive,
                          ]}
                          onPress={() => {
                            setSelectedTemplate(tpl);
                            initVariablesForTemplate(tpl, lead);
                          }}
                        >
                          <Ionicons
                            name={isSel ? "checkmark-circle" : "document-text-outline"}
                            size={11}
                            color={isSel ? "#FFF" : THEME.textMuted}
                          />
                          <Text
                            style={[
                              styles.nativeTplPillText,
                              isSel && styles.nativeTplPillTextActive,
                            ]}
                            numberOfLines={1}
                          >
                            {tpl.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                {/* Selected Template Live Preview & Variables */}
                {selectedTemplate ? (
                  <View style={styles.nativePreviewCard}>
                    {/* Header Row */}
                    <View style={styles.nativeCardHead}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
                        <View style={styles.nativeTplIconWrap}>
                          <Ionicons name="logo-whatsapp" size={13} color="#25D366" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.nativeCardTitle} numberOfLines={1}>
                            {selectedTemplate.name}
                          </Text>
                          <Text style={styles.nativeCardSubtitle}>
                            {selectedTemplate.language === "mr" ? "Marathi (mr)" : selectedTemplate.language || "English"} • {selectedTemplate.headerType || "Standard"}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.nativeCatBadge}>
                        <Text style={styles.nativeCatBadgeText}>
                          {selectedTemplate.category || "UTILITY"}
                        </Text>
                      </View>
                    </View>

                    {/* Inline Dynamic Parameter Fields in 2-Column Grid */}
                    {(() => {
                      const count = getTemplateVarCount(selectedTemplate);
                      if (count === 0) return null;
                      const indices = Array.from({ length: count }, (_, i) => i + 1);
                      return (
                        <View style={styles.varsContainer}>
                          <View style={styles.varsHeaderRow}>
                            <Ionicons name="options-outline" size={12} color={THEME.primary} />
                            <Text style={styles.varsHeaderTitle}>
                              CUSTOMIZE VARIABLES ({count})
                            </Text>
                          </View>
                          <View style={styles.nativeParamGridWrap}>
                            {indices.map((idx) => {
                              const isFullWidth = count % 2 !== 0 && idx === count;
                              return (
                                <View
                                  key={idx}
                                  style={[
                                    styles.nativeParamCol2Col,
                                    isFullWidth && { width: "100%" },
                                  ]}
                                >
                                  <View style={styles.paramLabelRow}>
                                    <View style={styles.paramBadge}>
                                      <Text style={styles.paramBadgeText}>{`{{${idx}}}`}</Text>
                                    </View>
                                    <Text style={styles.nativeParamLabelText} numberOfLines={1}>
                                      {getTemplateVarLabel(idx)}
                                    </Text>
                                  </View>
                                  <TextInput
                                    style={styles.nativeParamInputModern}
                                    value={varValues[idx] || ""}
                                    placeholder={`Enter ${getTemplateVarLabel(idx)}...`}
                                    placeholderTextColor="#94A3B8"
                                    onChangeText={(v) => setVarValues((p) => ({ ...p, [idx]: v }))}
                                  />
                                </View>
                              );
                            })}
                          </View>
                        </View>
                      );
                    })()}

                    {/* Header Media URL Input if Template has IMAGE / DOCUMENT / VIDEO header */}
                    {selectedTemplate?.headerType &&
                      selectedTemplate.headerType !== "NONE" &&
                      selectedTemplate.headerType !== "TEXT" && (
                        <View style={styles.mediaHeaderCard}>
                          <View style={styles.mediaHeaderLabelRow}>
                            <Ionicons
                              name={
                                selectedTemplate.headerType === "IMAGE"
                                  ? "image"
                                  : selectedTemplate.headerType === "DOCUMENT"
                                    ? "document-attach"
                                    : "videocam"
                              }
                              size={13}
                              color="#059669"
                            />
                            <Text style={styles.mediaHeaderLabelText}>
                              {`HEADER ${selectedTemplate.headerType} URL`}
                            </Text>
                            <View style={styles.mediaTypeBadge}>
                              <Text style={styles.mediaTypeBadgeText}>{selectedTemplate.headerType}</Text>
                            </View>
                          </View>
                          <TextInput
                            style={styles.mediaHeaderInputModern}
                            value={mediaUrl}
                            placeholder={`Paste ${selectedTemplate.headerType.toLowerCase()} direct URL (https://...)`}
                            placeholderTextColor="#94A3B8"
                            onChangeText={setMediaUrl}
                            autoCapitalize="none"
                            autoCorrect={false}
                          />
                        </View>
                      )}

                    {/* Authentic WhatsApp Bubble Container */}
                    <View style={styles.nativeBubbleWrapperModern}>
                      <View style={styles.nativeBubbleHeaderTag}>
                        <Ionicons name="chatbubble-ellipses" size={10} color="#059669" />
                        <Text style={styles.nativeBubbleHeaderTagText}>MESSAGE PREVIEW</Text>
                      </View>
                      <View style={styles.nativeBubbleBodyModern}>
                        {/* Render Header Media in Preview */}
                        {selectedTemplate.headerType === "IMAGE" && (
                          <View style={styles.bubbleMediaImageWrap}>
                            {mediaUrl && (mediaUrl.startsWith("http://") || mediaUrl.startsWith("https://")) ? (
                              <Image source={{ uri: mediaUrl }} style={styles.bubbleMediaImage} resizeMode="cover" />
                            ) : (
                              <View style={styles.bubbleMediaPlaceholder}>
                                <Ionicons name="image-outline" size={24} color="#059669" />
                                <Text style={styles.bubbleMediaPlaceholderText}>Image Header Attached</Text>
                              </View>
                            )}
                          </View>
                        )}
                        {selectedTemplate.headerType === "DOCUMENT" && (
                          <View style={styles.bubbleMediaDocWrap}>
                            <Ionicons name="document-text" size={20} color="#DC2626" />
                            <View style={{ flex: 1, marginLeft: 6 }}>
                              <Text style={styles.bubbleMediaDocTitle} numberOfLines={1}>
                                {mediaUrl ? mediaUrl.split("/").pop() : "Attached Document.pdf"}
                              </Text>
                              <Text style={styles.bubbleMediaDocSub}>PDF Document Header</Text>
                            </View>
                          </View>
                        )}
                        {selectedTemplate.headerType === "VIDEO" && (
                          <View style={styles.bubbleMediaVideoWrap}>
                            <Ionicons name="play-circle" size={26} color="#2563EB" />
                            <Text style={styles.bubbleMediaDocSub}>Video Header Attached</Text>
                          </View>
                        )}

                        <Text style={styles.nativeBubbleTextModern}>
                          {(() => {
                            let text = selectedTemplate.bodyText || selectedTemplate.message || "";
                            const count = Math.max(getTemplateVarCount(selectedTemplate), 6);
                            for (let i = 1; i <= count; i++) {
                              const val = varValues[i] || `{{${i}}}`;
                              text = text.replace(new RegExp(`\\{\\{${i}\\}\\}`, "g"), val);
                            }
                            return text;
                          })()}
                        </Text>
                        <View style={styles.nativeBubbleFooterModern}>
                          <Text style={styles.nativeBubbleTimestampModern}>
                            {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </Text>
                          <Ionicons name="checkmark-done" size={13} color="#34D399" />
                        </View>
                      </View>
                    </View>

                    {/* Action Triggers */}
                    <View style={styles.actionButtonsRow}>
                      <TouchableOpacity
                        style={styles.cloudSendBtnModern}
                        onPress={() => handleSendCloudWhatsApp(selectedTemplate)}
                        disabled={sendingCloudMsg}
                        activeOpacity={0.8}
                      >
                        {sendingCloudMsg ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <>
                            <Ionicons name="paper-plane" size={13} color="#FFF" style={{ marginRight: 5 }} />
                            <Text style={styles.cloudSendBtnTextModern}>Send Cloud API ⚡</Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.openAppBtnModern}
                        onPress={() => {
                          let text = selectedTemplate.bodyText || selectedTemplate.message || "";
                          const count = Math.max(getTemplateVarCount(selectedTemplate), 6);
                          for (let i = 1; i <= count; i++) {
                            const val = varValues[i] || "";
                            text = text.replace(new RegExp(`\\{\\{${i}\\}\\}`, "g"), val);
                          }
                          handleWhatsApp(text);
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="logo-whatsapp" size={13} color="#10B981" style={{ marginRight: 4 }} />
                        <Text style={styles.openAppBtnTextModern}>Open App</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}

                {/* Pre-Crafted Quick Snippets */}
                <Text style={[styles.sectionHeaderTitle, { marginTop: 6 }]}>QUICK PRE-SET MESSAGES</Text>
                {DEFAULT_TEMPLATES.map((t, idx) => (
                  <View key={idx} style={styles.nativeSnippetCard}>
                    <View style={styles.nativeSnippetHeader}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 3, flex: 1 }}>
                        <Ionicons name="chatbubble-ellipses-outline" size={10} color={THEME.primary} />
                        <Text style={styles.nativeSnippetTitle} numberOfLines={1}>{t.title}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.nativeSnippetSendBtn}
                        onPress={() => handleWhatsApp(t.text)}
                      >
                        <Ionicons name="logo-whatsapp" size={9} color="#FFF" />
                        <Text style={styles.nativeSnippetSendText}>Send</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.nativeSnippetBody} numberOfLines={2}>
                      {t.text.replace("{name}", lead.name || "Client")}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )}

        {/* ── MODAL: STAGE SELECTION ── */}
        <Modal visible={statusModalVisible} animationType="fade" transparent>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalHeading}>Move Pipeline Stage</Text>
                <TouchableOpacity onPress={() => setStatusModalVisible(false)}>
                  <Ionicons name="close" size={18} color={THEME.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={{ gap: 6, marginTop: 4 }}>
                {statuses.map((st) => (
                  <TouchableOpacity
                    key={st.id || st._id}
                    style={styles.stageChoiceRow}
                    onPress={() => handleStatusChange(st.id || st._id)}
                  >
                    <View style={[styles.stageDot, { backgroundColor: st.color || THEME.primary }]} />
                    <Text style={styles.stageChoiceText}>{st.name}</Text>
                    {(lead?.statusId === (st.id || st._id) || lead?.status?.id === (st.id || st._id)) && (
                      <Ionicons name="checkmark-circle" size={15} color={THEME.primary} style={{ marginLeft: "auto" }} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Modal>

        {/* ── MODAL: SCHEDULE REMINDER ── */}
        <Modal visible={reminderModalVisible} animationType="fade" transparent>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalHeading}>Schedule Reminder</Text>
                <TouchableOpacity onPress={() => setReminderModalVisible(false)}>
                  <Ionicons name="close" size={18} color={THEME.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>Reminder Title *</Text>
              <TextInput
                style={styles.fieldInputMini}
                placeholder="e.g. Call regarding quotation"
                value={reminderTitle}
                onChangeText={setReminderTitle}
              />

              <Text style={styles.fieldLabel}>Notes & Instructions</Text>
              <TextInput
                style={[styles.fieldInputMini, { height: 50, textAlignVertical: "top" }]}
                placeholder="Details..."
                multiline
                value={reminderNotes}
                onChangeText={setReminderNotes}
              />

              <TouchableOpacity style={styles.primarySubmitBtnMini} onPress={handleAddReminder} disabled={updating}>
                {updating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primarySubmitBtnTextMini}>Schedule</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ── MODAL: EDIT LEAD ── */}
        <Modal visible={editModalVisible} animationType="fade" transparent>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalHeading}>Edit Lead Profile</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <Ionicons name="close" size={18} color={THEME.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.fieldLabel}>Full Name</Text>
                <TextInput
                  style={styles.fieldInputMini}
                  value={editForm.name}
                  onChangeText={(v) => setEditForm((p) => ({ ...p, name: v }))}
                />

                <Text style={styles.fieldLabel}>WhatsApp Phone</Text>
                <TextInput
                  style={styles.fieldInputMini}
                  value={editForm.whatsappPhone}
                  onChangeText={(v) => setEditForm((p) => ({ ...p, whatsappPhone: v }))}
                />

                <Text style={styles.fieldLabel}>Email Address</Text>
                <TextInput
                  style={styles.fieldInputMini}
                  value={editForm.email}
                  onChangeText={(v) => setEditForm((p) => ({ ...p, email: v }))}
                />

                <Text style={styles.fieldLabel}>Company Name</Text>
                <TextInput
                  style={styles.fieldInputMini}
                  value={editForm.company}
                  onChangeText={(v) => setEditForm((p) => ({ ...p, company: v }))}
                />

                <Text style={styles.fieldLabel}>Assign To Representative</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
                  {currentUserId ? (
                    <TouchableOpacity
                      style={[styles.choiceChip, editForm.assignedTo === currentUserId && styles.choiceChipActive]}
                      onPress={() => setEditForm((p) => ({ ...p, assignedTo: currentUserId }))}
                    >
                      <Ionicons
                        name="person-circle"
                        size={11}
                        color={editForm.assignedTo === currentUserId ? "#FFF" : THEME.primary}
                        style={{ marginRight: 3 }}
                      />
                      <Text style={[styles.choiceChipText, editForm.assignedTo === currentUserId && styles.choiceChipTextActive]}>
                        Me (Self)
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  {employees
                    .filter((emp) => (emp._id || emp.id) !== currentUserId)
                    .map((emp) => {
                      const empId = emp._id || emp.id;
                      const isSelected = editForm.assignedTo === empId;
                      return (
                        <TouchableOpacity
                          key={empId}
                          style={[styles.choiceChip, isSelected && styles.choiceChipActive]}
                          onPress={() => setEditForm((p) => ({ ...p, assignedTo: empId }))}
                        >
                          <Ionicons name="person" size={11} color={isSelected ? "#FFF" : THEME.primary} style={{ marginRight: 3 }} />
                          <Text style={[styles.choiceChipText, isSelected && styles.choiceChipTextActive]}>
                            {emp.label || `${emp.name} (${emp.department || emp.role || 'Staff'})`}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                </ScrollView>

                <Text style={styles.fieldLabel}>Estimated Deal Value (₹)</Text>
                <TextInput
                  style={styles.fieldInputMini}
                  value={editForm.estimatedValue}
                  onChangeText={(v) => setEditForm((p) => ({ ...p, estimatedValue: v }))}
                />

                <TouchableOpacity style={styles.primarySubmitBtnMini} onPress={handleSaveEdits} disabled={updating}>
                  {updating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primarySubmitBtnTextMini}>Save Changes</Text>}
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
    padding: 8,
    paddingBottom: 24,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  heroSummaryCard: {
    borderRadius: 12,
    padding: 10,
    marginBottom: 6,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  heroAvatarLetter: {
    color: "#FFF",
    fontFamily: FONTS.displayBold,
    fontSize: 15,
  },
  heroLeadName: {
    fontSize: 14,
    fontFamily: FONTS.displayBold,
    color: "#FFFFFF",
  },
  heroMetaSubtitle: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 1,
  },
  dealPill: {
    alignItems: "flex-end",
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  dealPillLabel: {
    fontSize: 7.5,
    fontFamily: FONTS.bodyBold,
    color: "#FDE68A",
  },
  dealPillAmount: {
    fontSize: 11,
    fontFamily: FONTS.displayBold,
    color: "#FFFFFF",
  },
  stageBadgeDropdown: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  stageDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 4,
  },
  stageBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
  },
  actionBarRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 6,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 5,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  actionBtnLabel: {
    fontSize: 9.5,
    fontFamily: FONTS.bodyBold,
  },
  tabNavRow: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 2,
    marginBottom: 6,
  },
  tabNavItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: 5,
    borderRadius: 6,
  },
  tabNavItemActive: {
    backgroundColor: THEME.primary,
  },
  tabNavLabel: {
    fontSize: 10,
    fontFamily: FONTS.bodyMedium,
    color: THEME.textMuted,
  },
  tabNavLabelActive: {
    color: "#FFF",
    fontFamily: FONTS.bodyBold,
  },
  tabContentBlock: {
    gap: 6,
  },
  noteComposerCard: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 8,
  },
  composerHeader: {
    fontSize: 9,
    fontFamily: FONTS.bodyBold,
    color: THEME.textMuted,
    letterSpacing: 0.5,
  },
  composerInput: {
    backgroundColor: THEME.bg,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    color: THEME.textPrimary,
    height: 32,
  },
  postNoteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    backgroundColor: THEME.primary,
    paddingVertical: 4,
    borderRadius: 6,
    paddingHorizontal: 10,
  },
  postNoteButtonText: {
    color: "#FFF",
    fontSize: 10.5,
    fontFamily: FONTS.bodyBold,
  },
  timelineContainer: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 8,
  },
  sectionHeaderTitle: {
    fontSize: 9.5,
    fontFamily: FONTS.displayBold,
    color: THEME.textMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  emptyTimelineWrap: {
    alignItems: "center",
    paddingVertical: 12,
  },
  emptyTimelineText: {
    fontSize: 10.5,
    color: THEME.textMuted,
    marginTop: 4,
    textAlign: "center",
  },
  timelineItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 5,
  },
  timelineDotWrap: {
    alignItems: "center",
    width: 12,
    marginRight: 6,
    marginTop: 3,
  },
  timelineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.primary,
  },
  timelineLine: {
    width: 1,
    flex: 1,
    minHeight: 18,
    backgroundColor: THEME.border,
    marginTop: 2,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: THEME.bg,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.borderLight,
    padding: 6,
  },
  timelineNoteText: {
    fontSize: 10.5,
    color: THEME.textPrimary,
    lineHeight: 14,
  },
  detailsCard: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: THEME.borderLight,
  },
  infoIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  infoCol: {
    marginLeft: 8,
  },
  infoLabel: {
    fontSize: 8.5,
    color: THEME.textMuted,
    fontFamily: FONTS.bodyMedium,
  },
  infoValue: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: THEME.textPrimary,
  },
  choiceChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    marginRight: 4,
  },
  choiceChipActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  choiceChipText: {
    fontSize: 10,
    color: THEME.textSecondary,
    fontFamily: FONTS.bodyMedium,
  },
  choiceChipTextActive: {
    color: "#FFF",
    fontFamily: FONTS.bodyBold,
  },
  // ── Native Compact WhatsApp Styles ──
  waNativeHeaderStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: THEME.borderLight,
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    marginBottom: 2,
  },
  waNativeHeaderTitle: {
    fontSize: 9.5,
    fontFamily: FONTS.displayBold,
    color: "#0F172A",
    letterSpacing: 0.5,
  },
  waNativeLivePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    gap: 3,
  },
  waNativeDot: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.25,
    backgroundColor: "#10B981",
  },
  waNativeLiveText: {
    fontSize: 8,
    fontFamily: FONTS.bodyBold,
    color: "#059669",
  },
  nativeTplPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    marginRight: 4,
    gap: 3,
  },
  nativeTplPillActive: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  nativeTplPillText: {
    fontSize: 9.5,
    fontFamily: FONTS.bodyMedium,
    color: THEME.textSecondary,
  },
  nativeTplPillTextActive: {
    color: "#FFF",
    fontFamily: FONTS.bodyBold,
  },
  nativePreviewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 10,
    marginTop: 4,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  nativeCardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginBottom: 8,
  },
  nativeTplIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  nativeCardTitle: {
    fontSize: 12,
    fontFamily: FONTS.displayBold,
    color: "#0F172A",
  },
  nativeCardSubtitle: {
    fontSize: 9.5,
    fontFamily: FONTS.body,
    color: "#64748B",
    marginTop: 1,
  },
  nativeCatBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  nativeCatBadgeText: {
    fontSize: 8.5,
    fontFamily: FONTS.bodyBold,
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  varsContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  varsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  varsHeaderTitle: {
    fontSize: 9.5,
    fontFamily: FONTS.displayBold,
    color: THEME.primary,
    letterSpacing: 0.4,
  },
  nativeParamGridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 6,
  },
  nativeParamCol2Col: {
    width: "48.5%",
  },
  paramLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 3,
  },
  paramBadge: {
    backgroundColor: "#E0E7FF",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  paramBadgeText: {
    fontSize: 8,
    fontFamily: FONTS.bodyBold,
    color: "#4338CA",
  },
  nativeParamLabelText: {
    fontSize: 9,
    fontFamily: FONTS.bodyBold,
    color: "#475569",
    flex: 1,
  },
  nativeParamInputModern: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    fontSize: 11,
    color: "#0F172A",
    fontFamily: FONTS.bodyMedium,
  },
  mediaHeaderCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 10,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  mediaHeaderLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },
  mediaHeaderLabelText: {
    fontSize: 9.5,
    fontFamily: FONTS.displayBold,
    color: "#059669",
    flex: 1,
    letterSpacing: 0.3,
  },
  mediaTypeBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  mediaTypeBadgeText: {
    fontSize: 8,
    fontFamily: FONTS.bodyBold,
    color: "#047857",
  },
  mediaHeaderInputModern: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#86EFAC",
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 11,
    color: "#0F172A",
    fontFamily: FONTS.bodyMedium,
  },
  bubbleMediaImageWrap: {
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#D2F4BE",
  },
  bubbleMediaImage: {
    width: "100%",
    height: 120,
    borderRadius: 6,
  },
  bubbleMediaPlaceholder: {
    height: 60,
    backgroundColor: "#DCFCE7",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  bubbleMediaPlaceholderText: {
    fontSize: 9,
    fontFamily: FONTS.bodyBold,
    color: "#059669",
  },
  bubbleMediaDocWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 6,
    borderRadius: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  bubbleMediaDocTitle: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    color: "#0F172A",
  },
  bubbleMediaDocSub: {
    fontSize: 8.5,
    color: "#64748B",
  },
  bubbleMediaVideoWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    padding: 8,
    borderRadius: 6,
    marginBottom: 6,
    gap: 6,
  },
  nativeBubbleWrapperModern: {
    backgroundColor: "#EFEAE2",
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: "#E2D9CE",
    marginBottom: 8,
  },
  nativeBubbleHeaderTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 5,
  },
  nativeBubbleHeaderTagText: {
    fontSize: 8.5,
    fontFamily: FONTS.displayBold,
    color: "#059669",
    letterSpacing: 0.4,
  },
  nativeBubbleBodyModern: {
    backgroundColor: "#E7FFDB",
    borderRadius: 8,
    borderTopLeftRadius: 2,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 0.5,
    borderColor: "#D2F4BE",
  },
  nativeBubbleTextModern: {
    fontSize: 11,
    color: "#111827",
    lineHeight: 16,
    fontFamily: FONTS.body,
  },
  nativeBubbleFooterModern: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 4,
    gap: 3,
  },
  nativeBubbleTimestampModern: {
    fontSize: 8.5,
    color: "#64748B",
    fontFamily: FONTS.bodyMedium,
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 2,
  },
  cloudSendBtnModern: {
    flex: 1.4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#059669",
    paddingVertical: 9,
    borderRadius: 8,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  cloudSendBtnTextModern: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontFamily: FONTS.displayBold,
    letterSpacing: 0.2,
  },
  openAppBtnModern: {
    flex: 0.85,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#10B981",
    paddingVertical: 9,
    borderRadius: 8,
  },
  openAppBtnTextModern: {
    color: "#059669",
    fontSize: 11,
    fontFamily: FONTS.displayBold,
  },
  nativeSnippetCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.borderLight,
    padding: 5.5,
    marginBottom: 4,
  },
  nativeSnippetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  nativeSnippetTitle: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    color: THEME.textPrimary,
  },
  nativeSnippetSendBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#10B981",
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 3.5,
  },
  nativeSnippetSendText: {
    color: "#FFF",
    fontSize: 8.5,
    fontFamily: FONTS.bodyBold,
  },
  nativeSnippetBody: {
    fontSize: 9.5,
    color: THEME.textSecondary,
    lineHeight: 12.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 12,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalHeading: {
    fontSize: 13,
    fontFamily: FONTS.displayBold,
    color: THEME.textPrimary,
  },
  stageChoiceRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: THEME.bg,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  stageChoiceText: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
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
