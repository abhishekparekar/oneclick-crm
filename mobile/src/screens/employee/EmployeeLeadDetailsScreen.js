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
import EmployeeLayout from "../../components/EmployeeLayout";
import leadsService from "../../api/leadsService";
import { useAuth } from "../../context/AuthContext";
import { COLORS, FONTS } from "../../theme/tokens";
import AppDatePicker from "../../components/AppDatePicker";
import AppTimePicker from "../../components/AppTimePicker";

const { width } = Dimensions.get("window");

const getTodayFormatted = () => {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const getTomorrowFormatted = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const getDefaultTimeFormatted = () => {
  const d = new Date();
  d.setHours(d.getHours() + 1);
  d.setMinutes(0);
  let hours = d.getHours();
  const minutes = "00";
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
};

const getStatusBadgeColors = (statusObj) => {
  if (!statusObj) {
    return { bg: "#1E3A8A", border: "#3B82F6", text: "#DBEAFE", dot: "#60A5FA" };
  }
  const name = (typeof statusObj === "string" ? statusObj : (statusObj?.name || "")).toLowerCase();
  const hex = typeof statusObj === "object" ? statusObj?.color : null;
  if (name.includes("won") || name.includes("closed") || name.includes("confirm")) {
    return { bg: "#064E3B", border: "#10B981", text: "#A7F3D0", dot: "#34D399" };
  }
  if (name.includes("lost") || name.includes("drop") || name.includes("reject")) {
    return { bg: "#4C0519", border: "#F43F5E", text: "#FECDD3", dot: "#FB7185" };
  }
  if (name.includes("negotiat") || name.includes("proposal")) {
    return { bg: "#451A03", border: "#F59E0B", text: "#FDE68A", dot: "#FBBF24" };
  }
  if (name.includes("qualif") || name.includes("demo")) {
    return { bg: "#083344", border: "#06B6D4", text: "#CFFAFE", dot: "#22D3EE" };
  }
  if (name.includes("contact") || name.includes("pitch")) {
    return { bg: "#2E1065", border: "#8B5CF6", text: "#EDE9FE", dot: "#A78BFA" };
  }
  if (hex) {
    return { bg: "#1E293B", border: hex, text: "#F8FAFC", dot: hex };
  }
  return { bg: "#1E3A8A", border: "#3B82F6", text: "#DBEAFE", dot: "#60A5FA" };
};

const formatSafeDateTime = (dateVal, includeYear = true) => {
  if (!dateVal) return "";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const day = String(d.getDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()] || "";
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    const timeStr = `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
    return includeYear ? `${day} ${month} ${year} at ${timeStr}` : `${day} ${month} at ${timeStr}`;
  } catch (_) {
    return String(dateVal || "");
  }
};

const formatValuation = (val) => {
  if (val === null || val === undefined || val === "") return "—";
  try {
    let raw = val;
    if (typeof val === "object" && val !== null) {
      raw = val.$numberDecimal || val.amount || val.value || "";
    }
    const cleaned = String(raw).replace(/[^0-9.]/g, "");
    const num = Number(cleaned);
    if (isNaN(num) || cleaned === "") return String(raw || "—");
    return `₹${num.toLocaleString("en-IN")}`;
  } catch (_) {
    return "—";
  }
};

const parseLeadNotes = (rawNotes) => {
  if (!rawNotes) return [];
  if (Array.isArray(rawNotes)) {
    return rawNotes
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const time = item.createdAt ? `[${formatSafeDateTime(item.createdAt, false)}] ` : "";
          const author = item.author || item.createdBy?.name || "";
          const noteText = item.note || item.text || item.content || item.comment || "";
          const authorStr = author ? ` (${author})` : "";
          return `${time}${noteText}${authorStr}`.trim();
        }
        return String(item || "");
      })
      .filter((n) => typeof n === "string" && n.trim().length > 0);
  }
  if (typeof rawNotes === "string") {
    return rawNotes
      .split("\n")
      .map((n) => (typeof n === "string" ? n.trim() : ""))
      .filter((n) => n.length > 0);
  }
  return [String(rawNotes)];
};

class EmployeeLeadDetailsErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.warn("[EmployeeLeadDetailsErrorBoundary] Caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <EmployeeLayout navigation={this.props.navigation} title="Lead Profile" showBack={true}>
          <View style={{ flex: 1, backgroundColor: "#F8FAFC", justifyContent: "center", alignItems: "center", padding: 24 }}>
            <Ionicons name="alert-circle-outline" size={50} color="#EF4444" style={{ marginBottom: 12 }} />
            <Text style={{ fontSize: 16, fontFamily: FONTS.displayBold, color: "#0F172A", marginBottom: 6 }}>
              Unable to display lead profile
            </Text>
            <Text style={{ fontSize: 13, fontFamily: FONTS.body, color: "#64748B", textAlign: "center", marginBottom: 20, lineHeight: 18 }}>
              An unexpected display issue occurred with this lead's data. Tap below to retry or return to Leads.
            </Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {this.props.navigation?.canGoBack() && (
                <TouchableOpacity
                  style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: "#CBD5E1" }}
                  onPress={() => this.props.navigation.goBack()}
                >
                  <Text style={{ fontFamily: FONTS.bodyBold, color: "#475569", fontSize: 13 }}>Go Back</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={{ backgroundColor: "#1268D9", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}
                onPress={() => {
                  this.setState({ hasError: false, error: null });
                  if (this.props.onRetry) this.props.onRetry();
                }}
              >
                <Text style={{ color: "#FFF", fontFamily: FONTS.bodyBold, fontSize: 13 }}>Retry</Text>
              </TouchableOpacity>
            </View>
          </View>
        </EmployeeLayout>
      );
    }
    return this.props.children;
  }
}

const buildReminderIso = (dateStr, timeStr) => {
  try {
    let year = new Date().getFullYear();
    let month = new Date().getMonth();
    let day = new Date().getDate();

    if (dateStr && dateStr.includes("/")) {
      const parts = dateStr.split("/");
      if (parts.length === 3) {
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        year = parseInt(parts[2], 10);
      }
    } else if (dateStr) {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        year = parsed.getFullYear();
        month = parsed.getMonth();
        day = parsed.getDate();
      }
    }

    let hours = 10;
    let minutes = 0;

    if (timeStr && (timeStr.includes("AM") || timeStr.includes("PM"))) {
      const isPM = timeStr.toUpperCase().includes("PM");
      const clean = timeStr.replace(/AM|PM/gi, "").trim();
      const parts = clean.split(":");
      hours = parseInt(parts[0], 10) || 12;
      minutes = parseInt(parts[1], 10) || 0;
      if (isPM && hours < 12) hours += 12;
      if (!isPM && hours === 12) hours = 0;
    } else if (timeStr && timeStr.includes(":")) {
      const parts = timeStr.split(":");
      hours = parseInt(parts[0], 10) || 0;
      minutes = parseInt(parts[1], 10) || 0;
    }

    const dt = new Date(year, month, day, hours, minutes, 0);
    return dt.toISOString();
  } catch (_) {
    return new Date().toISOString();
  }
};

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

function EmployeeLeadDetailsScreenComponent({ route, navigation }) {
  const leadId =
    route?.params?.leadId ||
    route?.params?.id ||
    route?.params?.lead?._id ||
    route?.params?.lead?.id ||
    route?.params?.params?.leadId ||
    route?.params?.params?.id ||
    route?.params?.params?.lead?._id ||
    route?.params?.params?.lead?.id ||
    "";
  const initialLead = route?.params?.lead || route?.params?.params?.lead || null;
  const { user, hasPermission } = useAuth();
  const canEdit = hasPermission("leads", "edit") || hasPermission("leads");
  const canDelete = hasPermission("leads", "delete");

  const [lead, setLead] = useState(initialLead);
  const [statuses, setStatuses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(!initialLead && !!leadId);
  const [refreshing, setRefreshing] = useState(false);

  // Tabs: 'notes' | 'overview' | 'whatsapp'
  const [activeTab, setActiveTab] = useState("notes");

  // Inline Fast Note Input
  const [inlineNote, setInlineNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // Status Change Modal
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState(null);
  const [stageFollowUpDate, setStageFollowUpDate] = useState(getTomorrowFormatted());
  const [stageFollowUpTime, setStageFollowUpTime] = useState(getDefaultTimeFormatted());
  const [includeFollowUp, setIncludeFollowUp] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [updatingStage, setUpdatingStage] = useState(false);

  // Reminder Modal & Follow-ups
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDate, setReminderDate] = useState(getTodayFormatted());
  const [reminderTime, setReminderTime] = useState(getDefaultTimeFormatted());
  const [reminderNotes, setReminderNotes] = useState("");
  const [savingReminder, setSavingReminder] = useState(false);
  const [leadReminders, setLeadReminders] = useState([]);

  // Edit Lead Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({
    name: initialLead?.name || "",
    whatsappPhone: initialLead?.whatsappPhone || "",
    email: initialLead?.email || "",
    company: initialLead?.company || "",
    productService: initialLead?.productService || "",
    source: initialLead?.source || "Walk-in",
    estimatedValue: initialLead?.estimatedValue ? String(initialLead.estimatedValue) : "",
    assignedTo: initialLead?.assignedTo?._id || initialLead?.assignedTo?.id || initialLead?.assignedTo || "",
    notes: initialLead?.notes || "",
  });

  const fetchDetails = async () => {
    try {
      if (!lead && !initialLead) setLoading(true);
      const [leadData, statusList, assignableUsers, remList] = await Promise.all([
        leadId
          ? leadsService.getLeadById(leadId).catch((err) => {
              console.warn("[EmployeeLeadDetails] getLeadById error:", err?.message || err);
              return null;
            })
          : Promise.resolve(null),
        leadsService.getStatuses().catch(() => []),
        leadsService.getAssignableUsers().catch(() => []),
        leadsService.getReminders().catch(() => []),
      ]);

      const effectiveLead = leadData || lead || initialLead;
      if (effectiveLead) {
        setLead(effectiveLead);
      }
      setStatuses(Array.isArray(statusList) ? statusList : []);
      setEmployees(Array.isArray(assignableUsers) ? assignableUsers : []);
      if (Array.isArray(remList)) {
        setLeadReminders(remList.filter((r) => String(r.leadId || r.lead?._id || r.lead) === String(leadId)));
      }

      if (effectiveLead) {
        setEditForm({
          name: effectiveLead.name || "",
          whatsappPhone: effectiveLead.whatsappPhone || "",
          email: effectiveLead.email || "",
          company: effectiveLead.company || "",
          productService: effectiveLead.productService || "",
          source: effectiveLead.source || "Walk-in",
          estimatedValue: effectiveLead.estimatedValue ? String(effectiveLead.estimatedValue) : "",
          assignedTo: effectiveLead.assignedTo?._id || effectiveLead.assignedTo?.id || effectiveLead.assignedTo || "",
          notes: effectiveLead.notes || "",
        });
      }
    } catch (err) {
      console.warn("[EmployeeLeadDetails] Fetch error:", err?.message || err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (leadId) {
      fetchDetails();
    } else if (!initialLead) {
      setLoading(false);
    }
  }, [leadId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDetails();
  }, [leadId]);

  // ── Open Stage & Follow-Up Modal ─────────────────────────
  const openStageModal = () => {
    const curStId =
      (typeof lead?.statusId === "object" ? (lead?.statusId?._id || lead?.statusId?.id) : lead?.statusId) ||
      lead?.status?._id ||
      lead?.status?.id ||
      (statuses[0]?.id || statuses[0]?._id);
    setSelectedStageId(curStId ? String(curStId) : null);

    if (lead?.nextFollowUpDate) {
      const d = new Date(lead.nextFollowUpDate);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        setStageFollowUpDate(`${day}/${month}/${year}`);
        let hours = d.getHours();
        const minutes = String(d.getMinutes()).padStart(2, "0");
        const ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12 || 12;
        setStageFollowUpTime(`${String(hours).padStart(2, "0")}:${minutes} ${ampm}`);
      } else {
        setStageFollowUpDate(getTomorrowFormatted());
        setStageFollowUpTime(getDefaultTimeFormatted());
      }
    } else {
      setStageFollowUpDate(getTomorrowFormatted());
      setStageFollowUpTime(getDefaultTimeFormatted());
    }
    setIncludeFollowUp(true);
    setStatusModalVisible(true);
  };

  // ── Save Stage and Follow-up Atomically ─────────────────────
  const handleSaveStageAndFollowUp = async () => {
    if (updatingStage) return;
    if (!selectedStageId) {
      return Alert.alert("Required", "Please select a pipeline stage.");
    }
    try {
      setUpdatingStage(true);
      const newStatusObj = statuses.find((s) => String(s.id || s._id) === String(selectedStageId));
      let followUpIso = null;
      if (includeFollowUp && stageFollowUpDate && stageFollowUpTime) {
        followUpIso = buildReminderIso(stageFollowUpDate, stageFollowUpTime);
      }

      const payload = {
        statusId: selectedStageId,
        ...(followUpIso ? { nextFollowUpDate: followUpIso } : {}),
      };

      // Optimistic UI update
      setLead((prev) => ({
        ...prev,
        statusId: selectedStageId,
        status: newStatusObj || prev?.status,
        ...(followUpIso ? { nextFollowUpDate: followUpIso } : {}),
      }));

      const updated = await leadsService.updateLead(leadId, payload);
      if (updated?.status) {
        setLead((prev) => ({
          ...prev,
          ...updated,
          status: updated.status,
        }));
      } else if (updated) {
        setLead((prev) => ({
          ...prev,
          ...updated,
          statusId: selectedStageId,
          status: newStatusObj || prev?.status,
        }));
      }

      // Also create reminder entry if follow-up scheduled so it reflects in Scheduled Reminders list
      if (followUpIso) {
        try {
          await leadsService.createReminder({
            title: `Follow-up: ${newStatusObj?.name || "Stage Review"}`,
            notes: `Stage updated to ${newStatusObj?.name || "Updated"}. Scheduled follow-up.`,
            leadId: leadId,
            dueDate: followUpIso,
            serviceDate: followUpIso,
            priority: "High",
          });
        } catch (_) {}
      }

      setStatusModalVisible(false);
      Alert.alert(
        "Stage Updated 🎉",
        `Pipeline stage updated to "${newStatusObj?.name || "Updated"}"${followUpIso ? ` with next follow-up on ${stageFollowUpDate} at ${stageFollowUpTime}.` : "!"}`,
        [
          {
            text: "OK",
            onPress: () => {
              if (navigation?.canGoBack && navigation.canGoBack()) {
                navigation.goBack();
              } else if (navigation?.navigate) {
                navigation.navigate("Leads");
              }
            },
          },
        ],
        { cancelable: false }
      );
      fetchDetails();
    } catch (err) {
      Alert.alert("Error", "Failed to update stage. Please try again.");
      fetchDetails();
    } finally {
      setUpdatingStage(false);
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
      Alert.alert(
        "Saved",
        "Lead profile updated successfully.",
        [
          {
            text: "OK",
            onPress: () => {
              if (navigation?.canGoBack && navigation.canGoBack()) {
                navigation.goBack();
              } else if (navigation?.navigate) {
                navigation.navigate("Leads");
              }
            },
          },
        ],
        { cancelable: false }
      );
    } catch (err) {
      Alert.alert("Error", "Failed to save updates.");
    } finally {
      setUpdating(false);
    }
  };

  // Schedule Reminder with Date/Time, duplicate prevention, and nextFollowUpDate sync
  const handleAddReminder = async () => {
    if (!reminderTitle.trim()) return Alert.alert("Required", "Reminder title is required.");
    if (savingReminder) return;

    try {
      setSavingReminder(true);
      const dueIso = buildReminderIso(reminderDate, reminderTime);

      const newRem = await leadsService.createReminder({
        title: reminderTitle.trim(),
        notes: reminderNotes.trim(),
        leadId: leadId,
        dueDate: dueIso,
        serviceDate: dueIso,
      });

      if (newRem) {
        setLeadReminders((prev) => [newRem, ...prev]);
      }

      // Sync nextFollowUpDate on lead so follow-up banner and push notifications stay in sync
      try {
        await leadsService.updateLead(leadId, {
          nextFollowUpDate: dueIso,
          followUpNotified: false,
        });
        setLead((prev) => ({ ...prev, nextFollowUpDate: dueIso }));
      } catch (_) {}

      // Add a note in the timeline about the scheduled reminder
      try {
        const timeFormatted = reminderTime || "";
        const dateFormatted = reminderDate || "";
        const noteStamp = `• [Scheduled Reminder] "${reminderTitle.trim()}" on ${dateFormatted} at ${timeFormatted}${reminderNotes.trim() ? ` - ${reminderNotes.trim()}` : ""}`;
        const currentNotes = lead?.notes ? `${noteStamp}\n${lead.notes}` : noteStamp;
        await leadsService.updateLead(leadId, { notes: currentNotes });
        setLead((prev) => ({ ...prev, notes: currentNotes, nextFollowUpDate: dueIso }));
      } catch (_) {}

      setReminderModalVisible(false);
      setReminderTitle("");
      setReminderNotes("");
      setReminderDate(getTodayFormatted());
      setReminderTime(getDefaultTimeFormatted());
      fetchDetails();
      Alert.alert("Success", "Follow-up reminder scheduled successfully!");
    } catch (err) {
      Alert.alert("Error", "Failed to schedule reminder. Please try again.");
    } finally {
      setSavingReminder(false);
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
    const rawPhone = lead?.whatsappPhone || lead?.phone;
    if (!rawPhone) return Alert.alert("No Number", "WhatsApp phone not available.");
    let cleanPhone = String(rawPhone).replace(/[^0-9]/g, "");
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;
    const clientName = typeof lead?.name === "string" ? lead.name : "Client";
    const msg = customMsg
      ? String(customMsg).replace("{name}", clientName)
      : `Hello ${clientName}, thank you for contacting us!`;
    Linking.openURL(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`).catch(() => {
      Alert.alert("WhatsApp Error", "Could not open WhatsApp app on this device.");
    });
  };

  const handleCall = () => {
    const rawPhone = lead?.whatsappPhone || lead?.phone;
    if (!rawPhone) return Alert.alert("No Number", "Phone number not available.");
    Linking.openURL(`tel:${rawPhone}`);
  };

  const handleEmail = () => {
    if (!lead?.email) return Alert.alert("No Email", "Email address not available.");
    Linking.openURL(`mailto:${lead.email}`);
  };

  const statusColor = lead?.status?.color || THEME.primary;
  const parsedNotes = parseLeadNotes(lead?.notes || lead?.leadNotes);

  const assignedRepName = lead?.assignedTo?.name || (typeof lead?.assignedTo === "string" ? lead.assignedTo : null);
  const assignedRepDept = lead?.assignedTo?.departmentId?.name || lead?.assignedTo?.department;

  return (
    <EmployeeLayout navigation={navigation} title="Lead Profile" showBack={true}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

        {loading && !refreshing && !lead ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={THEME.primary} />
            <Text style={styles.loadingText}>Loading lead profile...</Text>
          </View>
        ) : !lead ? (
          <View style={styles.center}>
            <Ionicons name="person-outline" size={48} color={THEME.textMuted} style={{ marginBottom: 10 }} />
            <Text style={{ color: THEME.textPrimary, fontFamily: FONTS.displayBold, fontSize: 16 }}>Lead Not Found</Text>
            <Text style={{ color: THEME.textMuted, fontSize: 12.5, marginTop: 4, textAlign: "center", paddingHorizontal: 30 }}>
              The requested lead profile could not be loaded. Please check your connection or return to leads.
            </Text>
            <TouchableOpacity
              style={{ marginTop: 16, backgroundColor: THEME.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}
              onPress={fetchDetails}
            >
              <Text style={{ color: "#FFF", fontFamily: FONTS.bodyBold, fontSize: 13 }}>Retry Loading</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.primary]} />}
          >
            {/* ═════════ 1. HERO SUMMARY CARD ═════════ */}
            <LinearGradient colors={["#0F172A", "#1E293B"]} style={styles.heroSummaryCard}>
              {/* Top Row: Avatar, Name, & Prominent Status Badge */}
              <View style={styles.heroTopRow}>
                <View style={styles.heroAvatarCircle}>
                  <Text style={styles.heroAvatarLetter}>
                    {String(lead?.name || "L").charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.heroLeadName} numberOfLines={1}>{lead?.name || "Lead Profile"}</Text>
                  <Text style={styles.heroMetaSubtitle} numberOfLines={1}>
                    {lead?.company ? `${lead.company} • ` : ""}{lead?.source || "Direct Lead"}
                  </Text>
                </View>

                {/* Highly Visible Status Badge / Chip */}
                {(() => {
                  const sBadge = getStatusBadgeColors(lead?.status);
                  return (
                    <View style={[styles.heroStatusBadge, { backgroundColor: sBadge.bg, borderColor: sBadge.border }]}>
                      <View style={[styles.heroStatusDot, { backgroundColor: sBadge.dot }]} />
                      <Text style={[styles.heroStatusText, { color: sBadge.text }]}>
                        {lead?.status?.name || (typeof lead?.status === "string" ? lead.status : "New Prospect")}
                      </Text>
                    </View>
                  );
                })()}
              </View>

              {/* Stage Selector & Action Row */}
              <View style={styles.heroActionRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.stageSectionMicroLabel}>CURRENT PIPELINE STAGE</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
                    <View style={[styles.stageDot, { backgroundColor: statusColor }]} />
                    <Text style={styles.prominentStageTitle} numberOfLines={1}>
                      {lead?.status?.name || (typeof lead?.status === "string" ? lead.status : "New Prospect")}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <TouchableOpacity
                    style={[styles.prominentStageButton, updatingStage && { opacity: 0.7 }]}
                    activeOpacity={0.8}
                    onPress={openStageModal}
                    disabled={updatingStage}
                  >
                    {updatingStage ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="swap-horizontal" size={13} color="#FFF" style={{ marginRight: 4 }} />
                        <Text style={styles.prominentStageBtnText}>Update Stage</Text>
                        <Ionicons name="chevron-down" size={12} color="#FFF" style={{ marginLeft: 3 }} />
                      </>
                    )}
                  </TouchableOpacity>

                  {canEdit && (
                    <TouchableOpacity
                      style={styles.heroCircleBtn}
                      onPress={() => setEditModalVisible(true)}
                      activeOpacity={0.7}
                    >
                      <Feather name="edit-2" size={15} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Next Follow-up Banner inside Hero if scheduled */}
              {lead?.nextFollowUpDate ? (
                <View style={styles.heroFollowUpStrip}>
                  <Ionicons name="time" size={12} color="#DDD6FE" style={{ marginRight: 5 }} />
                  <Text style={styles.heroFollowUpStripText} numberOfLines={1}>
                    Next Follow-up: <Text style={{ fontFamily: FONTS.displayBold, color: "#FFFFFF" }}>
                      {formatSafeDateTime(lead.nextFollowUpDate, true)}
                    </Text>
                  </Text>
                </View>
              ) : null}
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

            {/* ═════════ SCHEDULED REMINDERS & FOLLOW-UP CARD ═════════ */}
            <View style={styles.remindersCard}>
              <View style={styles.remindersHeaderRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="alarm" size={16} color={THEME.violet} />
                  <Text style={styles.remindersHeaderTitle}>SCHEDULED REMINDERS & FOLLOW-UP</Text>
                </View>
                <TouchableOpacity
                  style={styles.addReminderHeaderBtn}
                  onPress={() => setReminderModalVisible(true)}
                >
                  <Ionicons name="add-circle" size={14} color="#FFF" />
                  <Text style={styles.addReminderHeaderBtnText}>Schedule</Text>
                </TouchableOpacity>
              </View>

              {/* Next Follow-up banner if scheduled */}
              {lead?.nextFollowUpDate ? (
                <View style={styles.nextFollowUpBanner}>
                  <View style={styles.nextFollowUpIconWrap}>
                    <Ionicons name="time" size={16} color="#7C3AED" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.nextFollowUpLabel}>NEXT SCHEDULED FOLLOW-UP</Text>
                    <Text style={styles.nextFollowUpTime}>
                      {formatSafeDateTime(lead.nextFollowUpDate, true)}
                    </Text>
                  </View>
                  <View style={styles.nextFollowUpBadge}>
                    <Text style={styles.nextFollowUpBadgeText}>Upcoming</Text>
                  </View>
                </View>
              ) : null}

              {/* Reminders List */}
              {leadReminders.length > 0 ? (
                <View style={{ marginTop: 6, gap: 6 }}>
                  {leadReminders.map((rem, idx) => {
                    const rDate = rem.dueDate || rem.serviceDate;
                    return (
                      <View key={rem._id || rem.id || idx} style={styles.reminderItemRow}>
                        <View style={styles.reminderDot} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.reminderItemTitle}>{rem.title || rem.serviceName || "Follow-up Reminder"}</Text>
                          {rDate ? (
                            <Text style={styles.reminderItemDate}>
                              Due: {formatSafeDateTime(rDate, true)}
                            </Text>
                          ) : null}
                          {rem.notes ? (
                            <Text style={styles.reminderItemNotes} numberOfLines={2}>{rem.notes}</Text>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : !lead.nextFollowUpDate ? (
                <View style={styles.emptyRemindersRow}>
                  <Ionicons name="calendar-outline" size={18} color={THEME.textMuted} />
                  <Text style={styles.emptyRemindersText}>No follow-up reminders scheduled yet.</Text>
                </View>
              ) : null}
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

                {(!Array.isArray(lead?.documents) || lead.documents.length === 0) ? (
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
                            {doc.size ? `${doc.size} • ` : ""}{formatSafeDateTime(doc.uploadedAt, false) || "Attached"}
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
                      <Text style={styles.infoValue}>{lead?.email || "Not provided"}</Text>
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <View style={[styles.infoIconWrap, { backgroundColor: THEME.violetBg }]}>
                      <Ionicons name="business" size={15} color={THEME.violet} />
                    </View>
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Company / Org</Text>
                      <Text style={styles.infoValue}>{lead?.company || "Individual Prospect"}</Text>
                    </View>
                  </View>

                  {lead?.productService ? (
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
                      <Text style={styles.infoValue}>{lead?.source || "Direct"}</Text>
                    </View>
                  </View>

                  {/* Field: Next Follow-up */}
                  <TouchableOpacity
                    style={styles.infoRow}
                    onPress={openStageModal}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.infoIconWrap, { backgroundColor: "#F5F3FF" }]}>
                      <Ionicons name="time" size={15} color="#7C3AED" />
                    </View>
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Next Follow-up Date & Time</Text>
                      <Text
                        style={[
                          styles.infoValue,
                          {
                            color: lead?.nextFollowUpDate ? "#6D28D9" : THEME.textMuted,
                            fontFamily: lead?.nextFollowUpDate ? FONTS.displayBold : FONTS.body,
                          },
                        ]}
                      >
                        {lead?.nextFollowUpDate
                          ? formatSafeDateTime(lead.nextFollowUpDate, true)
                          : "Not scheduled (Tap to set)"}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                    <View style={[styles.infoIconWrap, { backgroundColor: THEME.bg }]}>
                      <Ionicons name="calendar-outline" size={15} color={THEME.textMuted} />
                    </View>
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Registration Date</Text>
                      <Text style={styles.infoValue}>
                        {formatSafeDateTime(lead?.createdAt, true) || "Recently"}
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
                <Text style={styles.templateSubGuide}>Tap any template to send directly to {lead?.name || "Client"}:</Text>

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
                    <Text style={styles.templateBodyText}>{String(t?.text || "").replace("{name}", typeof lead?.name === "string" ? lead.name : "Client")}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )}

        {/* ── MODALS (GUARDED TO ONLY MOUNT IF LEAD IS LOADED) ── */}
        {lead ? (
          <>
            {/* ── MODAL: STAGE SELECTION & NEXT FOLLOW-UP ── */}
            <Modal
              visible={statusModalVisible}
              animationType="fade"
              transparent
              onRequestClose={() => !updatingStage && setStatusModalVisible(false)}
            >
              <View style={styles.modalBackdrop}>
                <View style={styles.stageModalContainer}>
                  <View style={styles.modalHeaderRow}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Ionicons name="swap-horizontal" size={18} color={THEME.primary} />
                      <Text style={styles.modalHeading}>Update Stage & Follow-up</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => !updatingStage && setStatusModalVisible(false)}
                      disabled={updatingStage}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close" size={20} color={THEME.textMuted} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                    {/* 1. Current Stage Display */}
                    <View style={styles.stageCurrentBox}>
                      <Text style={styles.stageFieldMiniLabel}>CURRENT STAGE</Text>
                      <View style={styles.stageCurrentPill}>
                        <View style={[styles.stageDot, { backgroundColor: statusColor }]} />
                        <Text style={styles.stageCurrentText}>{lead?.status?.name || (typeof lead?.status === "string" ? lead.status : "New Prospect")}</Text>
                      </View>
                    </View>

                {/* 2. Select New Stage */}
                <Text style={[styles.stageFieldMiniLabel, { marginTop: 10, marginBottom: 6 }]}>SELECT NEW STAGE</Text>
                <View style={{ gap: 6 }}>
                  {statuses.map((st) => {
                    const stId = String(st.id || st._id || "");
                    const currentStId = String(
                      selectedStageId ||
                      (typeof lead?.statusId === "object" ? (lead?.statusId?._id || lead?.statusId?.id) : lead?.statusId) ||
                      lead?.status?._id ||
                      lead?.status?.id ||
                      ""
                    );
                    const isSelected = Boolean(stId && currentStId && stId === currentStId);
                    return (
                      <TouchableOpacity
                        key={st.id || st._id || st.name}
                        style={[
                          styles.stageChoiceRow,
                          isSelected && styles.stageChoiceRowSelected,
                          updatingStage && { opacity: 0.6 }
                        ]}
                        onPress={() => setSelectedStageId(st.id || st._id)}
                        disabled={updatingStage}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.stageDot, { backgroundColor: st.color || THEME.primary }]} />
                        <Text style={[styles.stageChoiceText, isSelected && { color: THEME.primary, fontFamily: FONTS.displayBold }]}>
                          {st.name}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={18} color={THEME.primary} style={{ marginLeft: "auto" }} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* 3. Next Follow-up Date & Time */}
                <View style={styles.stageFollowUpSection}>
                  <View style={styles.stageFollowUpHeader}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                      <Ionicons name="calendar-outline" size={14} color="#7C3AED" />
                      <Text style={styles.stageFollowUpTitle}>NEXT FOLLOW-UP SCHEDULE</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setIncludeFollowUp(!includeFollowUp)}
                      activeOpacity={0.7}
                      style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                    >
                      <Ionicons
                        name={includeFollowUp ? "checkbox" : "square-outline"}
                        size={16}
                        color={includeFollowUp ? "#7C3AED" : THEME.textMuted}
                      />
                      <Text style={{ fontSize: 11, fontFamily: FONTS.bodyBold, color: includeFollowUp ? "#7C3AED" : THEME.textMuted }}>
                        {includeFollowUp ? "Schedule" : "Skip"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {includeFollowUp && (
                    <View style={{ marginTop: 8 }}>
                      {/* Date & Time Row */}
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <View style={{ flex: 1.2 }}>
                          <Text style={styles.pickerSubLabel}>DATE</Text>
                          <AppDatePicker
                            value={stageFollowUpDate}
                            onChangeText={setStageFollowUpDate}
                            onChange={setStageFollowUpDate}
                            placeholder="Select Date"
                            disabled={updatingStage}
                            minDate="today"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.pickerSubLabel}>TIME</Text>
                          <AppTimePicker
                            value={stageFollowUpTime}
                            onChangeText={setStageFollowUpTime}
                            onChange={setStageFollowUpTime}
                            placeholder="Select Time"
                            disabled={updatingStage}
                          />
                        </View>
                      </View>

                      {/* Quick Preset Buttons */}
                      <View style={styles.quickDateRow}>
                        <TouchableOpacity
                          style={styles.quickDateChip}
                          onPress={() => setStageFollowUpDate(getTomorrowFormatted())}
                          disabled={updatingStage}
                        >
                          <Text style={styles.quickDateChipText}>Tomorrow</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.quickDateChip}
                          onPress={() => {
                            const d = new Date();
                            d.setDate(d.getDate() + 3);
                            setStageFollowUpDate(`${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`);
                          }}
                          disabled={updatingStage}
                        >
                          <Text style={styles.quickDateChipText}>In 3 Days</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.quickDateChip}
                          onPress={() => {
                            const d = new Date();
                            d.setDate(d.getDate() + 7);
                            setStageFollowUpDate(`${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`);
                          }}
                          disabled={updatingStage}
                        >
                          <Text style={styles.quickDateChipText}>Next Week</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              </ScrollView>

              {/* Footer Action Buttons */}
              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => !updatingStage && setStatusModalVisible(false)}
                  disabled={updatingStage}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSubmitBtn, updatingStage && { opacity: 0.6 }]}
                  onPress={handleSaveStageAndFollowUp}
                  disabled={updatingStage}
                  activeOpacity={0.8}
                >
                  {updatingStage ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <ActivityIndicator size="small" color="#FFF" />
                      <Text style={styles.modalSubmitBtnText}>Updating...</Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                      <Ionicons name="checkmark-sharp" size={15} color="#FFF" />
                      <Text style={styles.modalSubmitBtnText}>Update Stage</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── MODAL: SCHEDULE REMINDER ── */}
        <Modal
          visible={reminderModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => !savingReminder && setReminderModalVisible(false)}
        >
          <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={[styles.modalContainer, { maxWidth: 360 }]}>
              <View style={styles.modalHeaderRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="alarm" size={18} color={THEME.violet} />
                  <Text style={styles.modalHeading}>Schedule Reminder</Text>
                </View>
                <TouchableOpacity
                  onPress={() => !savingReminder && setReminderModalVisible(false)}
                  disabled={savingReminder}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={22} color={THEME.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.fieldLabel}>Reminder Title *</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g. Call client regarding proposal"
                  value={reminderTitle}
                  onChangeText={setReminderTitle}
                  editable={!savingReminder}
                />

                <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                  <View style={{ flex: 1 }}>
                    <AppDatePicker
                      label="Reminder Date *"
                      value={reminderDate}
                      onChangeText={setReminderDate}
                      onChange={setReminderDate}
                      placeholder="DD/MM/YYYY"
                      minDate="today"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppTimePicker
                      label="Reminder Time *"
                      value={reminderTime}
                      onChangeText={setReminderTime}
                      placeholder="HH:MM AM/PM"
                    />
                  </View>
                </View>

                <Text style={styles.fieldLabel}>Notes / Agenda</Text>
                <TextInput
                  style={[styles.fieldInput, { height: 65, textAlignVertical: "top" }]}
                  placeholder="Any details for this follow-up..."
                  multiline
                  value={reminderNotes}
                  onChangeText={setReminderNotes}
                  editable={!savingReminder}
                />

                <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
                  <TouchableOpacity
                    style={[styles.cancelBtn, savingReminder && { opacity: 0.6 }, { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: THEME.border }]}
                    onPress={() => setReminderModalVisible(false)}
                    disabled={savingReminder}
                  >
                    <Text style={{ fontSize: 13, fontFamily: FONTS.bodyBold, color: THEME.textSecondary }}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.primarySubmitBtn, { flex: 1.6, marginTop: 0 }, (!reminderTitle.trim() || savingReminder) && { opacity: 0.6 }]}
                    onPress={handleAddReminder}
                    disabled={!reminderTitle.trim() || savingReminder}
                  >
                    {savingReminder ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.primarySubmitBtnText}>Save Reminder</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
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

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.fieldLabel}>Full Name</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editForm.name}
                  onChangeText={(v) => setEditForm((p) => ({ ...p, name: v }))}
                  placeholder="Enter full name"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="words"
                />

                <Text style={styles.fieldLabel}>WhatsApp Phone</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editForm.whatsappPhone}
                  keyboardType="phone-pad"
                  onChangeText={(v) => setEditForm((p) => ({ ...p, whatsappPhone: v }))}
                  placeholder="e.g. 9876543210"
                  placeholderTextColor="#94A3B8"
                />

                <Text style={styles.fieldLabel}>Email Address</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editForm.email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onChangeText={(v) => setEditForm((p) => ({ ...p, email: v }))}
                  placeholder="e.g. name@example.com"
                  placeholderTextColor="#94A3B8"
                />

                <Text style={styles.fieldLabel}>Company Name</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editForm.company}
                  onChangeText={(v) => setEditForm((p) => ({ ...p, company: v }))}
                  placeholder="Company Name"
                  placeholderTextColor="#94A3B8"
                />

                <Text style={styles.fieldLabel}>Requirement / Interest</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editForm.productService}
                  onChangeText={(v) => setEditForm((p) => ({ ...p, productService: v }))}
                  placeholder="Requirement / Interest"
                  placeholderTextColor="#94A3B8"
                />

                <Text style={styles.fieldLabel}>Estimated Deal Value (₹)</Text>
                <TextInput
                  style={styles.fieldInput}
                  keyboardType="numeric"
                  value={editForm.estimatedValue}
                  onChangeText={(v) => setEditForm((p) => ({ ...p, estimatedValue: v }))}
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                />

                <TouchableOpacity style={styles.primarySubmitBtn} onPress={handleSaveEdits} disabled={updating}>
                  {updating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primarySubmitBtnText}>Save Changes</Text>}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
          </>
        ) : null}
      </View>
    </EmployeeLayout>
  );
}

export default function EmployeeLeadDetailsScreen(props) {
  return (
    <EmployeeLeadDetailsErrorBoundary navigation={props.navigation}>
      <EmployeeLeadDetailsScreenComponent {...props} />
    </EmployeeLeadDetailsErrorBoundary>
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
  remindersCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    marginHorizontal: 12,
    marginBottom: 8,
  },
  remindersHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  remindersHeaderTitle: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: "#7C3AED",
    letterSpacing: 0.5,
  },
  addReminderHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#7C3AED",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    gap: 4,
  },
  addReminderHeaderBtnText: {
    color: "#FFF",
    fontSize: 10.5,
    fontFamily: FONTS.bodyBold,
  },
  nextFollowUpBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    borderRadius: 10,
    padding: 9,
    marginBottom: 6,
  },
  nextFollowUpIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
  },
  nextFollowUpLabel: {
    fontSize: 9.5,
    fontFamily: FONTS.bodyBold,
    color: "#7C3AED",
    letterSpacing: 0.5,
  },
  nextFollowUpTime: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: "#4C1D95",
    marginTop: 1,
  },
  nextFollowUpBadge: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  nextFollowUpBadgeText: {
    color: "#FFF",
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
  },
  reminderItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  reminderDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#7C3AED",
    marginTop: 4,
  },
  reminderItemTitle: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: THEME.textPrimary,
  },
  reminderItemDate: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: "#7C3AED",
    marginTop: 1,
  },
  reminderItemNotes: {
    fontSize: 11,
    fontFamily: FONTS.body,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  emptyRemindersRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
  },
  emptyRemindersText: {
    fontSize: 11.5,
    fontFamily: FONTS.body,
    color: THEME.textMuted,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: THEME.border,
  },

  // ── Hero Status & Follow-Up Highlights ──
  heroStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  heroStatusDot: {
    width: 6.5,
    height: 6.5,
    borderRadius: 3.5,
  },
  heroStatusText: {
    fontSize: 11,
    fontFamily: FONTS.displayBold,
    letterSpacing: 0.3,
    includeFontPadding: false,
  },
  prominentStageButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.primary,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  prominentStageBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
  },
  stageSectionMicroLabel: {
    fontSize: 8.5,
    fontFamily: FONTS.displayBold,
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  prominentStageTitle: {
    fontSize: 13,
    fontFamily: FONTS.displayBold,
    color: "#FFFFFF",
  },
  heroFollowUpStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(124, 58, 237, 0.25)",
    borderWidth: 1,
    borderColor: "rgba(196, 181, 253, 0.4)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    marginTop: 8,
  },
  heroFollowUpStripText: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: "#DDD6FE",
    flex: 1,
  },

  // ── Integrated Stage & Follow-Up Modal Styles ──
  stageModalContainer: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    maxHeight: "88%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  stageCurrentBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 8,
  },
  stageFieldMiniLabel: {
    fontSize: 9.5,
    fontFamily: FONTS.displayBold,
    color: "#64748B",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  stageCurrentPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 2,
  },
  stageCurrentText: {
    fontSize: 13,
    fontFamily: FONTS.displayBold,
    color: "#0F172A",
  },
  stageChoiceRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: THEME.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  stageChoiceRowSelected: {
    backgroundColor: THEME.primaryBg,
    borderColor: THEME.primary,
  },
  stageChoiceText: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: THEME.textPrimary,
  },
  stageFollowUpSection: {
    backgroundColor: "#FBFBFE",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EDE9FE",
    padding: 10,
    marginTop: 12,
  },
  stageFollowUpHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 4,
  },
  stageFollowUpTitle: {
    fontSize: 10,
    fontFamily: FONTS.displayBold,
    color: "#7C3AED",
    letterSpacing: 0.4,
  },
  pickerSubLabel: {
    fontSize: 9,
    fontFamily: FONTS.bodyBold,
    color: "#64748B",
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  quickDateRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  quickDateChip: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    borderRadius: 6,
    paddingVertical: 4.5,
  },
  quickDateChipText: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    color: "#7C3AED",
  },
  modalActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  modalCancelBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  modalCancelBtnText: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: "#475569",
  },
  modalSubmitBtn: {
    flex: 1.6,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: THEME.primary,
  },
  modalSubmitBtnText: {
    fontSize: 12,
    fontFamily: FONTS.displayBold,
    color: "#FFFFFF",
  },
});
