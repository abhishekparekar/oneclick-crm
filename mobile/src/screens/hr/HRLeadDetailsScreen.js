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
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import HRHeader from "../../components/HRHeader";
import leadsService from "../../api/leadsService";
import { useAuth } from "../../context/AuthContext";
import { COLORS, FONTS } from "../../theme/tokens";

const { width } = Dimensions.get("window");

const THEME = {
  primary: "#EA580C",
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
    text: "Hello {name}, thank you for contacting us! How can we assist with your requirements today?",
  },
  {
    title: "Schedule Follow-up Call",
    text: "Hi {name}, would you be available for a brief 10-minute call tomorrow to discuss your requirements?",
  },
  {
    title: "Pricing & Product Proposal",
    text: "Hello {name}, I have prepared our proposal details for you. Please let me know when you'd like to review it.",
  },
];

export default function HRLeadDetailsScreen({ route, navigation }) {
  const { leadId } = route.params || {};
  const { user } = useAuth();
  const currentUserId = user?._id || user?.id || "";

  const [lead, setLead] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Tabs: 'notes' | 'overview' | 'whatsapp'
  const [activeTab, setActiveTab] = useState("notes");

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
  const [editForm, setEditForm] = useState({
    name: "",
    whatsappPhone: "",
    email: "",
    company: "",
    productService: "",
    source: "Walk-in",
    estimatedValue: "",
    assignedTo: "",
    notes: "",
  });

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const [leadData, statusList, assignableUsers] = await Promise.all([
        leadsService.getLeadById(leadId),
        leadsService.getStatuses(),
        leadsService.getAssignableUsers().catch(() => []),
      ]);

      setLead(leadData);
      setStatuses(Array.isArray(statusList) ? statusList : []);
      setEmployees(Array.isArray(assignableUsers) ? assignableUsers : []);

      if (leadData) {
        setEditForm({
          name: leadData.name || "",
          whatsappPhone: leadData.whatsappPhone || "",
          email: leadData.email || "",
          company: leadData.company || "",
          productService: leadData.productService || "",
          source: leadData.source || "Walk-in",
          estimatedValue: leadData.estimatedValue ? String(leadData.estimatedValue) : "",
          assignedTo: leadData.assignedTo?._id || leadData.assignedTo?.id || leadData.assignedTo || "",
          notes: leadData.notes || "",
        });
      }
    } catch (err) {
      console.warn("[HRLeadDetails] Fetch error:", err?.message || err);
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

  // Quick Status Change
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
      Alert.alert("Success", "Pipeline stage updated!");
      fetchDetails();
    } catch (err) {
      Alert.alert("Error", "Failed to update stage.");
    } finally {
      setUpdating(false);
    }
  };

  // Fast Inline Add Note
  const handleAddInlineNote = async () => {
    if (!inlineNote.trim()) return Alert.alert("Required", "Note content cannot be empty.");
    try {
      setAddingNote(true);
      const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + ", " + new Date().toLocaleDateString();
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

  // Save Lead Profile Edits
  const handleSaveEdits = async () => {
    try {
      setUpdating(true);
      const payload = {
        ...editForm,
        assignedTo: editForm.assignedTo || null,
        estimatedValue: editForm.estimatedValue ? Number(editForm.estimatedValue) : undefined,
      };
      await leadsService.updateLead(leadId, payload);
      setEditModalVisible(false);
      fetchDetails();
      Alert.alert("Saved", "Lead profile updated successfully.");
    } catch (err) {
      Alert.alert("Error", "Failed to save updates.");
    } finally {
      setUpdating(false);
    }
  };

  // Schedule Reminder
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

  // Delete Lead
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

  // Document Attachments
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const handleAttachDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setUploadingDoc(true);

        const docData = {
          name: file.name || "Attached Document",
          url: file.uri,
          type: file.mimeType || "application/octet-stream",
          size: file.size ? `${(file.size / 1024).toFixed(1)} KB` : "1 File",
        };

        await leadsService.addLeadDocument(leadId, docData);

        const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + ", " + new Date().toLocaleDateString();
        const docNote = `• [${timestamp}] 📎 Attached Document: "${file.name}"`;
        const updatedNotes = lead?.notes ? `${docNote}\n${lead.notes}` : docNote;
        await leadsService.updateLead(leadId, { notes: updatedNotes });

        Alert.alert("Success", `Document "${file.name}" attached successfully!`);
        fetchDetails();
      }
    } catch (err) {
      console.warn("Document pick error:", err?.message || err);
      Alert.alert("Error", "Could not attach document.");
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleOpenDocument = async (docUrl) => {
    if (!docUrl) return;
    try {
      if ((await Sharing.isAvailableAsync()) && docUrl.startsWith("file://")) {
        await Sharing.shareAsync(docUrl);
      } else {
        await Linking.openURL(docUrl);
      }
    } catch (err) {
      Linking.openURL(docUrl).catch(() => {
        Alert.alert("Notice", "Document: " + docUrl);
      });
    }
  };

  const handleDeleteDocument = async (docId, docName) => {
    Alert.alert(
      "Remove Document",
      `Are you sure you want to remove "${docName || "this document"}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await leadsService.deleteLeadDocument(leadId, docId);
              Alert.alert("Removed", "Document removed.");
              fetchDetails();
            } catch (err) {
              Alert.alert("Error", "Failed to remove document.");
            }
          },
        },
      ]
    );
  };

  // Communications
  const handleWhatsApp = (customMsg = null) => {
    if (!lead?.whatsappPhone) return Alert.alert("No Number", "WhatsApp phone not available.");
    const cleanPhone = lead.whatsappPhone.replace(/[^0-9]/g, "");
    const msg = customMsg
      ? customMsg.replace("{name}", lead.name || "Client")
      : `Hello ${lead.name || ""}, thank you for contacting us!`;
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
  const parsedNotes = lead?.notes
    ? lead.notes.split("\n").filter((n) => n.trim().length > 0)
    : [];

  const assignedRepName = lead?.assignedTo?.name;
  const assignedRepDept = lead?.assignedTo?.departmentId?.name || lead?.assignedTo?.department;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <HRHeader title="Lead Profile" showBack={true} />

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={styles.loadingText}>Loading lead profile...</Text>
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
          {/* ═════════ 1. HERO SUMMARY CARD ═════════ */}
          <LinearGradient colors={["#0F172A", "#1E293B"]} style={styles.heroSummaryCard}>
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

            {/* Stage Selector & Edit/Delete Action Row */}
            <View style={styles.heroActionRow}>
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

              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  style={styles.heroCircleBtn}
                  onPress={() => setEditModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <Feather name="edit-2" size={15} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.heroCircleBtn, { backgroundColor: "rgba(239, 68, 68, 0.25)" }]}
                  onPress={handleDelete}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={16} color="#FECACA" />
                </TouchableOpacity>
              </View>
            </View>
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

          {/* ═════════ TAB 1: TIMELINE & NOTES ═════════ */}
          {activeTab === "notes" && (
            <View style={styles.tabContentBlock}>
              {/* Note & Document Composer */}
              <View style={styles.noteComposerCard}>
                <Text style={styles.composerHeader}>LOG DISCUSSION / ACTIVITY & DOCUMENTS</Text>
                <TextInput
                  style={styles.composerInput}
                  placeholder="Type note, call summary, or customer requirement..."
                  placeholderTextColor={THEME.textMuted}
                  multiline
                  value={inlineNote}
                  onChangeText={setInlineNote}
                />
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <TouchableOpacity
                    style={styles.attachDocButton}
                    onPress={handleAttachDocument}
                    disabled={uploadingDoc}
                    activeOpacity={0.75}
                  >
                    {uploadingDoc ? (
                      <ActivityIndicator size="small" color="#4F46E5" />
                    ) : (
                      <>
                        <Ionicons name="attach" size={16} color="#4F46E5" />
                        <Text style={styles.attachDocButtonText}>Attach Document</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.postNoteButton, !inlineNote.trim() && { opacity: 0.6 }]}
                    onPress={handleAddInlineNote}
                    disabled={addingNote || !inlineNote.trim()}
                  >
                    {addingNote ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="send" size={13} color="#FFF" style={{ marginRight: 5 }} />
                        <Text style={styles.postNoteText}>Post Note</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* ── ATTACHED DOCUMENTS CARD ── */}
              <View style={styles.timelineCard}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <Text style={styles.sectionHeaderTitle}>
                    ATTACHED DOCUMENTS ({lead?.documents?.length || 0})
                  </Text>
                  <TouchableOpacity
                    style={styles.miniAttachLink}
                    onPress={handleAttachDocument}
                    disabled={uploadingDoc}
                  >
                    <Ionicons name="add-circle" size={15} color={THEME.primary} />
                    <Text style={styles.miniAttachLinkText}>Add File</Text>
                  </TouchableOpacity>
                </View>

                {(!lead?.documents || lead.documents.length === 0) ? (
                  <View style={styles.emptyDocWrap}>
                    <Ionicons name="document-text-outline" size={28} color="#CBD5E1" />
                    <Text style={styles.emptyNoteText}>No documents or proposals attached yet.</Text>
                  </View>
                ) : (
                  lead.documents.map((doc, idx) => {
                    const docId = doc._id || doc.id || String(idx);
                    const isPdf = (doc.name || "").toLowerCase().endsWith(".pdf");
                    const isImg = (doc.type || "").includes("image") || (doc.name || "").match(/\.(jpg|jpeg|png|webp)$/i);
                    return (
                      <View key={docId} style={styles.docItemRow}>
                        <View style={[styles.docIconWrap, { backgroundColor: isPdf ? "#FEE2E2" : isImg ? "#ECFDF5" : "#EFF6FF" }]}>
                          <Ionicons
                            name={isPdf ? "document-text" : isImg ? "image" : "folder-open"}
                            size={18}
                            color={isPdf ? "#EF4444" : isImg ? "#10B981" : "#3B82F6"}
                          />
                        </View>

                        <TouchableOpacity style={styles.docInfoCol} onPress={() => handleOpenDocument(doc.url)}>
                          <Text style={styles.docNameText} numberOfLines={1}>
                            {doc.name}
                          </Text>
                          <Text style={styles.docSubText}>
                            {doc.size ? `${doc.size} • ` : ""}{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : "Attached"}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.docOpenBtn}
                          onPress={() => handleOpenDocument(doc.url)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="eye-outline" size={15} color="#4F46E5" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.docDeleteBtn}
                          onPress={() => handleDeleteDocument(docId, doc.name)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="trash-outline" size={15} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )}
              </View>

              {/* Timeline Notes List */}
              <View style={styles.timelineCard}>
                <Text style={styles.sectionHeaderTitle}>COMMUNICATION HISTORY ({parsedNotes.length})</Text>
                {parsedNotes.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <Ionicons name="chatbubbles-outline" size={32} color={THEME.border} />
                    <Text style={styles.emptyNoteText}>No interaction logs recorded yet.</Text>
                  </View>
                ) : (
                  parsedNotes.map((noteItem, idx) => (
                    <View key={idx} style={styles.timelineItem}>
                      <View style={styles.timelineBulletWrap}>
                        <View style={styles.timelineBullet} />
                        {idx !== parsedNotes.length - 1 && <View style={styles.timelineLine} />}
                      </View>
                      <View style={styles.timelineTextBubble}>
                        <Text style={styles.timelineNoteText}>{noteItem}</Text>
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
                <Text style={styles.sectionHeaderTitle}>CONTACT & ASSIGNMENT DETAILS</Text>

                {/* Assigned Representative with Dept */}
                <View style={styles.infoRow}>
                  <View style={[styles.infoIconWrap, { backgroundColor: "#EEF2FF" }]}>
                    <Ionicons name="person-circle" size={16} color="#4F46E5" />
                  </View>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Assigned Representative</Text>
                    <Text style={[styles.infoValue, { color: "#4F46E5", fontFamily: FONTS.displayBold }]}>
                      {assignedRepName ? `${assignedRepName}${assignedRepDept ? ` (${assignedRepDept})` : ""}` : "Unassigned"}
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

                {lead.productService ? (
                  <View style={styles.infoRow}>
                    <View style={[styles.infoIconWrap, { backgroundColor: THEME.amberBg }]}>
                      <Ionicons name="pricetag" size={15} color={THEME.primary} />
                    </View>
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Requirement / Interest</Text>
                      <Text style={styles.infoValue}>{lead.productService}</Text>
                    </View>
                  </View>
                ) : null}

                <View style={styles.infoRow}>
                  <View style={[styles.infoIconWrap, { backgroundColor: THEME.bg }]}>
                    <Ionicons name="link" size={15} color={THEME.textSecondary} />
                  </View>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Lead Source</Text>
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

          {/* ═════════ TAB 3: WHATSAPP TEMPLATES ═════════ */}
          {activeTab === "whatsapp" && (
            <View style={styles.tabContentBlock}>
              <Text style={styles.sectionHeaderTitle}>PRE-CRAFTED WHATSAPP TEMPLATES</Text>
              <Text style={styles.templateSubGuide}>Tap any template to send directly to {lead.name}:</Text>

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

      {/* ── MODAL: STAGE SELECTOR ── */}
      <Modal visible={statusModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeading}>Select Pipeline Stage</Text>
              <TouchableOpacity onPress={() => setStatusModalVisible(false)}>
                <Ionicons name="close" size={22} color={THEME.textMuted} />
              </TouchableOpacity>
            </View>

            {statuses.map((st) => {
              const stId = st.id || st._id;
              const isSelected = (lead?.statusId || lead?.status?.id || lead?.status?._id) === stId;
              const color = st.color || THEME.primary;
              return (
                <TouchableOpacity
                  key={stId}
                  style={[styles.statusOptionRow, isSelected && { backgroundColor: color + "14", borderColor: color }]}
                  onPress={() => handleStatusChange(stId)}
                  disabled={updating}
                >
                  <View style={[styles.stageDot, { backgroundColor: color }]} />
                  <Text style={[styles.statusOptionText, isSelected && { color: color, fontFamily: FONTS.displayBold }]}>
                    {st.name}
                  </Text>
                  {isSelected && <Ionicons name="checkmark-circle" size={18} color={color} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* ── MODAL: SCHEDULE REMINDER ── */}
      <Modal visible={reminderModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
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
              placeholder="e.g. Call client regarding proposal"
              value={reminderTitle}
              onChangeText={setReminderTitle}
            />

            <Text style={styles.fieldLabel}>Notes / Agenda</Text>
            <TextInput
              style={[styles.fieldInput, { height: 60, textAlignVertical: "top" }]}
              placeholder="Any details for this follow-up..."
              multiline
              value={reminderNotes}
              onChangeText={setReminderNotes}
            />

            <TouchableOpacity style={styles.primarySubmitBtn} onPress={handleAddReminder} disabled={updating}>
              {updating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primarySubmitBtnText}>Schedule Reminder</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL: EDIT LEAD ── */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
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
                keyboardType="phone-pad"
                onChangeText={(v) => setEditForm((p) => ({ ...p, whatsappPhone: v }))}
              />

              <Text style={styles.fieldLabel}>Email Address</Text>
              <TextInput
                style={styles.fieldInput}
                value={editForm.email}
                keyboardType="email-address"
                autoCapitalize="none"
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
                          {emp.label || `${emp.name} (${emp.department || emp.role || "Staff"})`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
              </ScrollView>

              <Text style={styles.fieldLabel}>Requirement / Interest</Text>
              <TextInput
                style={styles.fieldInput}
                value={editForm.productService}
                onChangeText={(v) => setEditForm((p) => ({ ...p, productService: v }))}
              />

              <Text style={styles.fieldLabel}>Estimated Deal Value (₹)</Text>
              <TextInput
                style={styles.fieldInput}
                keyboardType="numeric"
                value={editForm.estimatedValue}
                onChangeText={(v) => setEditForm((p) => ({ ...p, estimatedValue: v }))}
              />

              <TouchableOpacity style={styles.primarySubmitBtn} onPress={handleSaveEdits} disabled={updating}>
                {updating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primarySubmitBtnText}>Save Changes</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12.5,
    fontFamily: FONTS.bodyMedium,
    color: THEME.textMuted,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 35,
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
    backgroundColor: "rgba(234, 88, 12, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: THEME.primary,
  },
  heroAvatarLetter: {
    fontSize: 18,
    fontFamily: FONTS.displayBold,
    color: "#FFF",
  },
  heroLeadName: {
    fontSize: 15,
    fontFamily: FONTS.displayBold,
    color: "#FFF",
  },
  heroMetaSubtitle: {
    fontSize: 11,
    color: "#94A3B8",
    fontFamily: FONTS.bodyMedium,
    marginTop: 2,
  },
  dealPill: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderColor: "rgba(16, 185, 129, 0.4)",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "flex-end",
  },
  dealPillLabel: {
    fontSize: 8,
    fontFamily: FONTS.bodyBold,
    color: "#10B981",
  },
  dealPillAmount: {
    fontSize: 12.5,
    fontFamily: FONTS.displayBold,
    color: "#FFF",
  },
  heroActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  stageBadgeDropdown: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4.5,
  },
  stageDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  stageBadgeText: {
    fontSize: 11.5,
    fontFamily: FONTS.bodyBold,
  },
  heroCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionBarRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    gap: 5,
  },
  actionBtnLabel: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
  },
  tabNavRow: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
  },
  tabNavItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  tabNavItemActive: {
    backgroundColor: "#0F172A",
  },
  tabNavLabel: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: "#64748B",
  },
  tabNavLabelActive: {
    color: "#FFF",
    fontFamily: FONTS.bodyBold,
  },
  tabContentBlock: {
    gap: 12,
  },
  noteComposerCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  composerHeader: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    color: THEME.textMuted,
    marginBottom: 6,
  },
  composerInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 8,
    fontSize: 12.5,
    fontFamily: FONTS.body,
    color: THEME.textPrimary,
    minHeight: 60,
    textAlignVertical: "top",
    marginBottom: 8,
  },
  postNoteButton: {
    backgroundColor: THEME.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    paddingHorizontal: 14,
  },
  postNoteText: {
    color: "#FFF",
    fontSize: 11.5,
    fontFamily: FONTS.bodyBold,
  },
  attachDocButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  attachDocButtonText: {
    color: "#4F46E5",
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
  },
  miniAttachLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(234, 88, 12, 0.1)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  miniAttachLinkText: {
    fontSize: 10.5,
    fontFamily: FONTS.bodyBold,
    color: THEME.primary,
  },
  emptyDocWrap: {
    alignItems: "center",
    paddingVertical: 12,
    gap: 4,
  },
  docItemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: THEME.borderLight,
    marginBottom: 6,
  },
  docIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  docInfoCol: {
    flex: 1,
    marginRight: 6,
  },
  docNameText: {
    fontSize: 11.5,
    fontFamily: FONTS.bodyBold,
    color: THEME.textPrimary,
  },
  docSubText: {
    fontSize: 10,
    color: THEME.textMuted,
    fontFamily: FONTS.body,
    marginTop: 1,
  },
  docOpenBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  docDeleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  timelineCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: THEME.textMuted,
    marginBottom: 10,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: 10,
  },
  timelineBulletWrap: {
    alignItems: "center",
    width: 16,
    marginRight: 6,
  },
  timelineBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.primary,
    marginTop: 4,
  },
  timelineLine: {
    width: 1.5,
    flex: 1,
    backgroundColor: "#E2E8F0",
    marginTop: 2,
  },
  timelineTextBubble: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.borderLight,
  },
  timelineNoteText: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: THEME.textPrimary,
    lineHeight: 17,
  },
  detailsCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: THEME.borderLight,
  },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    fontFamily: FONTS.bodyMedium,
    color: THEME.textMuted,
  },
  infoValue: {
    fontSize: 12.5,
    fontFamily: FONTS.bodyMedium,
    color: THEME.textPrimary,
    marginTop: 1,
  },
  templateCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 8,
  },
  templateHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  templateTitle: {
    fontSize: 12.5,
    fontFamily: FONTS.displayBold,
    color: THEME.textPrimary,
  },
  sendWhatsAppBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10B981",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    gap: 4,
  },
  sendWhatsAppBtnText: {
    color: "#FFF",
    fontSize: 10.5,
    fontFamily: FONTS.bodyBold,
  },
  templateBodyText: {
    fontSize: 11.5,
    color: THEME.textSecondary,
    fontFamily: FONTS.body,
    lineHeight: 16,
  },
  templateSubGuide: {
    fontSize: 11,
    fontFamily: FONTS.body,
    color: THEME.textMuted,
    marginBottom: 6,
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 6,
  },
  emptyNoteText: {
    fontSize: 11.5,
    color: THEME.textMuted,
    fontFamily: FONTS.body,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
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
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalHeading: {
    fontSize: 15,
    fontFamily: FONTS.displayBold,
    color: THEME.textPrimary,
  },
  statusOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 6,
  },
  statusOptionText: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.bodyMedium,
    color: THEME.textPrimary,
  },
  fieldLabel: {
    fontSize: 10.5,
    fontFamily: FONTS.bodyBold,
    color: "#64748B",
    textTransform: "uppercase",
    marginBottom: 4,
    marginTop: 6,
  },
  fieldInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12.5,
    fontFamily: FONTS.body,
    color: THEME.textPrimary,
    marginBottom: 6,
  },
  choiceChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginRight: 6,
  },
  choiceChipActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  choiceChipText: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: "#475569",
  },
  choiceChipTextActive: {
    color: "#FFFFFF",
    fontFamily: FONTS.bodyBold,
  },
  primarySubmitBtn: {
    backgroundColor: THEME.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 16,
  },
  primarySubmitBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: FONTS.displayBold,
  },
});
