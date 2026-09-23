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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import CompanyAdminLayout from "../../components/CompanyAdminLayout";
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

class LeadDetailsErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.warn("[LeadDetailsErrorBoundary] Caught rendering error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <CompanyAdminLayout
          navigation={this.props.navigation}
          activeTab="Leads"
          headerTitle="Lead Profile"
          showSearch={false}
        >
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
        </CompanyAdminLayout>
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

function LeadDetailsScreenComponent({ route, navigation }) {
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
  const { user } = useAuth();
  const currentUserId = user?._id || user?.id || "";
  const [lead, setLead] = useState(initialLead);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(!initialLead);
  const [refreshing, setRefreshing] = useState(false);

  // Default to 'notes' (Timeline & Notes) as requested!
  const [activeTab, setActiveTab] = useState("notes"); // 'notes' | 'whatsapp'

  // Inline Fast Note Input
  const [inlineNote, setInlineNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // Status Change Modal & Update Lock
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState(null);
  const [stageFollowUpDate, setStageFollowUpDate] = useState(getTomorrowFormatted());
  const [stageFollowUpTime, setStageFollowUpTime] = useState(getDefaultTimeFormatted());
  const [includeFollowUp, setIncludeFollowUp] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [updatingStage, setUpdatingStage] = useState(false);

  // Reminder Modal & State
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDate, setReminderDate] = useState(getTodayFormatted());
  const [reminderTime, setReminderTime] = useState(getDefaultTimeFormatted());
  const [reminderNotes, setReminderNotes] = useState("");
  const [savingReminder, setSavingReminder] = useState(false);
  const [leadReminders, setLeadReminders] = useState([]);

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

      // Fetch reminders for this lead
      try {
        const allReminders = await leadsService.getReminders();
        const curLeadId = (leadData?._id || leadData?.id || leadId).toString();
        const filtered = (Array.isArray(allReminders) ? allReminders : []).filter((r) => {
          const rLeadId = r.leadId ? (r.leadId.toString ? r.leadId.toString() : r.leadId) : "";
          const rLeadObjId = r.lead?._id || r.lead?.id || "";
          return rLeadId === curLeadId || rLeadObjId.toString() === curLeadId;
        });
        setLeadReminders(filtered);
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

  // ── Open Stage & Follow-Up Modal ─────────────────────────
  const openStageModal = () => {
    const curStId = lead?.statusId || lead?.status?.id || lead?.status?._id || (statuses[0]?.id || statuses[0]?._id);
    setSelectedStageId(curStId);

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
      const newStatusObj = statuses.find((s) => (s.id || s._id) === selectedStageId);
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
      Alert.alert("Error", "Failed to update pipeline stage. Please try again.");
      fetchDetails();
    } finally {
      setUpdatingStage(false);
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

  // ── Schedule Reminder ───────────────────────────────────────
  const handleAddReminder = async () => {
    if (savingReminder) return;
    if (!reminderTitle.trim()) return Alert.alert("Required", "Reminder title is required.");
    try {
      setSavingReminder(true);
      const dueIso = buildReminderIso(reminderDate, reminderTime);
      const reminderPayload = {
        title: reminderTitle.trim(),
        notes: reminderNotes.trim(),
        leadId: leadId,
        dueDate: dueIso,
        priority: "Medium",
      };
      await leadsService.createReminder(reminderPayload);

      // Sync nextFollowUpDate to Lead so backend cron triggers notification
      try {
        await leadsService.updateLead(leadId, {
          nextFollowUpDate: dueIso,
          followUpNotified: false,
        });
      } catch (_) {}

      // Add note entry to timeline
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
      await fetchDetails();
      Alert.alert("Success", "Follow-up reminder scheduled successfully!");
    } catch (err) {
      Alert.alert("Error", "Failed to schedule reminder. Please try again.");
    } finally {
      setSavingReminder(false);
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
    const rawPhone = lead?.whatsappPhone || lead?.phone;
    if (!rawPhone) return Alert.alert("No Number", "WhatsApp phone not available.");
    let cleanPhone = String(rawPhone).replace(/[^0-9]/g, "");
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;
    const clientName = typeof lead?.name === "string" ? lead.name : "Client";
    const msg = customMsg
      ? String(customMsg).replace("{name}", clientName)
      : `Hello ${clientName}, thank you for contacting OneClick HRMS!`;
    Linking.openURL(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`).catch(() => {
      Alert.alert("WhatsApp Error", "Could not open WhatsApp app on this device.");
    });
  };

  const handleSendCloudWhatsApp = async (tpl = null) => {
    const rawPhone = lead?.whatsappPhone || lead?.phone;
    if (!rawPhone) return Alert.alert("No Number", "WhatsApp phone number is missing.");
    const targetTpl = tpl || selectedTemplate || templates[0];
    if (!targetTpl) return Alert.alert("Select Template", "Please select a template to send.");

    setSendingCloudMsg(true);
    let cleanPhone = String(rawPhone).replace(/[^0-9]/g, "");
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

    const varCount = Math.max(getTemplateVarCount(targetTpl), 1);
    const finalParams = [];
    let formattedBody = targetTpl.bodyText || targetTpl.message || "";

    const clientName = typeof lead?.name === "string" ? lead.name : "Client";
    for (let i = 1; i <= varCount; i++) {
      const val = varValues[i] !== undefined && varValues[i] !== null && String(varValues[i]).trim() !== ""
        ? String(varValues[i])
        : (i === 1 ? clientName : `Value ${i}`);
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
        mediaUrl: typeof mediaUrl === "string" ? mediaUrl.trim() : "",
        mediaType: targetTpl.headerType || "NONE",
        text: formattedBody,
      });

      // Log note on timeline
      const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + ", " + new Date().toLocaleDateString();
      const noteEntry = `• [${timestamp}] WhatsApp Template "${targetTpl.name}" sent to +${cleanPhone}`;
      const currentNotesStr = typeof lead?.notes === "string" ? lead.notes : "";
      const updatedNotes = currentNotesStr ? `${noteEntry}\n${currentNotesStr}` : noteEntry;
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
    const rawPhone = lead?.whatsappPhone || lead?.phone;
    if (!rawPhone) return Alert.alert("No Number", "Phone number not available.");
    Linking.openURL(`tel:${rawPhone}`);
  };

  const handleEmail = () => {
    if (!lead?.email) return Alert.alert("No Email", "Email address not available.");
    Linking.openURL(`mailto:${lead.email}`);
  };

  const statusColor = lead?.status?.color || THEME.primary;

  // Split timeline notes into structured items crash-proof
  const parsedNotes = parseLeadNotes(lead?.notes || lead?.leadNotes);

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
        {loading && !refreshing && !lead ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={THEME.primary} />
            <Text style={{ marginTop: 10, fontSize: 12.5, fontFamily: FONTS.bodyMedium, color: THEME.textMuted }}>
              Loading lead profile...
            </Text>
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
            {/* ═════════ 1. COMPACT HERO SUMMARY CARD ═════════ */}
            <LinearGradient
              colors={["#0F172A", "#1E293B"]}
              style={styles.heroSummaryCard}
            >
              {/* Top Row: Avatar, Name & Prominent Status Badge */}
              <View style={styles.heroTopRow}>
                <View style={styles.heroAvatarCircle}>
                  <Text style={styles.heroAvatarLetter}>
                    {(lead?.name || "L").charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={{ flex: 1, marginLeft: 8 }}>
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

              {/* Stage & Next Follow-up Bar */}
              <View style={styles.prominentStageRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.stageSectionMicroLabel}>CURRENT PIPELINE STAGE</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
                    <View style={[styles.prominentStageDot, { backgroundColor: statusColor }]} />
                    <Text style={styles.prominentStageTitle} numberOfLines={1}>
                      {lead?.status?.name || (typeof lead?.status === "string" ? lead.status : "New Prospect")}
                    </Text>
                  </View>
                </View>

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

            {/* ═════════ 3. COMPACT LEAD DETAILS GRID ═════════ */}
            <View style={styles.compactDetailsCard}>
              <View style={styles.compactDetailsHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Ionicons name="document-text-outline" size={13} color={THEME.primary} />
                  <Text style={styles.compactDetailsTitle}>LEAD DETAILS</Text>
                </View>
                <TouchableOpacity
                  style={styles.compactEditBtn}
                  onPress={() => setEditModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <Feather name="edit-2" size={11} color={THEME.primary} />
                  <Text style={styles.compactEditBtnText}>Edit</Text>
                </TouchableOpacity>
              </View>

              {/* Row 1: Contact Methods (WhatsApp, Phone/Call, Email) */}
              <View style={styles.compactGridRow}>
                {/* Field 1: WhatsApp */}
                <TouchableOpacity
                  style={[styles.compactCell, { flex: 1 }]}
                  onPress={() => handleWhatsApp()}
                  activeOpacity={0.7}
                >
                  <Text style={styles.compactCellLabel}>WHATSAPP</Text>
                  <View style={styles.compactValueRow}>
                    <Ionicons name="logo-whatsapp" size={11} color="#10B981" style={{ marginRight: 3 }} />
                    <Text style={[styles.compactCellValue, { color: "#10B981" }]} numberOfLines={1}>
                      {lead?.whatsappPhone || "—"}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Field 2: Phone / Call */}
                <TouchableOpacity
                  style={[styles.compactCell, { flex: 1 }]}
                  onPress={handleCall}
                  activeOpacity={0.7}
                >
                  <Text style={styles.compactCellLabel}>
                    {lead?.phone && lead?.phone !== lead?.whatsappPhone ? "ALT PHONE" : "PHONE"}
                  </Text>
                  <View style={styles.compactValueRow}>
                    <Ionicons name="call" size={11} color={THEME.blue} style={{ marginRight: 3 }} />
                    <Text style={[styles.compactCellValue, { color: THEME.blue }]} numberOfLines={1}>
                      {lead?.phone || lead?.whatsappPhone || "—"}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Field 3: Email */}
                <TouchableOpacity
                  style={[styles.compactCell, { flex: 1.2 }]}
                  onPress={lead?.email ? handleEmail : undefined}
                  activeOpacity={lead?.email ? 0.7 : 1}
                >
                  <Text style={styles.compactCellLabel}>EMAIL</Text>
                  <View style={styles.compactValueRow}>
                    {lead?.email ? (
                      <Ionicons name="mail" size={11} color={THEME.textSecondary} style={{ marginRight: 3 }} />
                    ) : null}
                    <Text style={[styles.compactCellValue, lead?.email && { color: THEME.textPrimary }]} numberOfLines={1}>
                      {lead?.email || "—"}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Row 2: Assignment & Organization */}
              <View style={[styles.compactGridRow, { borderTopWidth: 1, borderTopColor: "#F1F5F9" }]}>
                {/* Field 4: Assigned Representative */}
                <View style={[styles.compactCell, { flex: 1.4 }]}>
                  <Text style={styles.compactCellLabel}>ASSIGNED REP</Text>
                  <View style={styles.compactValueRow}>
                    <Ionicons name="person-outline" size={11} color="#4F46E5" style={{ marginRight: 3 }} />
                    <Text style={[styles.compactCellValue, { color: "#4F46E5" }]} numberOfLines={1}>
                      {(() => {
                        if (!lead?.assignedTo) return "Unassigned";
                        if (typeof lead.assignedTo === "string") return lead.assignedTo;
                        const repName = lead.assignedTo.name || "Employee";
                        const repDept = lead.assignedTo.departmentId?.name || lead.assignedTo.department;
                        return repDept ? `${repName} (${repDept})` : repName;
                      })()}
                    </Text>
                  </View>
                </View>

                {/* Field 5: Company / Organization */}
                <View style={[styles.compactCell, { flex: 1.2 }]}>
                  <Text style={styles.compactCellLabel}>COMPANY / ORG</Text>
                  <View style={styles.compactValueRow}>
                    <Ionicons name="business-outline" size={11} color="#64748B" style={{ marginRight: 3 }} />
                    <Text style={styles.compactCellValue} numberOfLines={1}>
                      {lead?.company || lead?.productService || "Individual"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Row 3: Pipeline & Next Follow-up */}
              <View style={[styles.compactGridRow, { borderTopWidth: 1, borderTopColor: "#F1F5F9" }]}>
                {/* Field 6: Acquisition Source */}
                <View style={[styles.compactCell, { flex: 0.9 }]}>
                  <Text style={styles.compactCellLabel}>SOURCE</Text>
                  <View style={styles.compactValueRow}>
                    <Ionicons name="link-outline" size={11} color="#D97706" style={{ marginRight: 3 }} />
                    <Text style={styles.compactCellValue} numberOfLines={1}>
                      {lead?.source || "Direct"}
                    </Text>
                  </View>
                </View>

                {/* Field 7: Estimated Valuation */}
                <View style={[styles.compactCell, { flex: 0.9 }]}>
                  <Text style={styles.compactCellLabel}>VALUATION</Text>
                  <Text style={[styles.compactCellValue, { color: lead?.estimatedValue ? THEME.success : THEME.textMuted, fontFamily: FONTS.displayBold }]} numberOfLines={1}>
                    {formatValuation(lead?.estimatedValue)}
                  </Text>
                </View>

                {/* Field 8: Next Follow-up */}
                <TouchableOpacity
                  style={[styles.compactCell, { flex: 1.3 }]}
                  onPress={openStageModal}
                  activeOpacity={0.7}
                >
                  <Text style={styles.compactCellLabel}>NEXT FOLLOW-UP</Text>
                  <View style={styles.compactValueRow}>
                    <Ionicons name="time-outline" size={11} color={lead?.nextFollowUpDate ? "#7C3AED" : THEME.textMuted} style={{ marginRight: 3 }} />
                    <Text
                      style={[
                        styles.compactCellValue,
                        {
                          color: lead?.nextFollowUpDate ? "#6D28D9" : THEME.textMuted,
                          fontFamily: lead?.nextFollowUpDate ? FONTS.bodyBold : FONTS.body,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {lead?.nextFollowUpDate
                        ? formatSafeDateTime(lead.nextFollowUpDate, false)
                        : "Tap to set"}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* ═════════ 4. SCHEDULED REMINDERS & FOLLOW-UP CARD ═════════ */}
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
              ) : !lead?.nextFollowUpDate ? (
                <View style={styles.emptyRemindersRow}>
                  <Ionicons name="calendar-outline" size={18} color={THEME.textMuted} />
                  <Text style={styles.emptyRemindersText}>No follow-up reminders scheduled yet.</Text>
                </View>
              ) : null}
            </View>

            {/* ═════════ 5. SEGMENTED TABS (NOTES & TEMPLATES ONLY) ═════════ */}
            <View style={styles.tabNavRow}>
              <TouchableOpacity
                style={[styles.tabNavItem, activeTab === "notes" && styles.tabNavItemActive]}
                onPress={() => setActiveTab("notes")}
              >
                <Ionicons
                  name="chatbox-ellipses-outline"
                  size={13}
                  color={activeTab === "notes" ? "#FFF" : THEME.textMuted}
                />
                <Text style={[styles.tabNavLabel, activeTab === "notes" && styles.tabNavLabelActive]}>
                  Notes & Timeline ({parsedNotes.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabNavItem, activeTab === "whatsapp" && styles.tabNavItemActive]}
                onPress={() => setActiveTab("whatsapp")}
              >
                <Ionicons
                  name="logo-whatsapp"
                  size={13}
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
                            {typeof mediaUrl === "string" && (mediaUrl.startsWith("http://") || mediaUrl.startsWith("https://")) ? (
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
                                {typeof mediaUrl === "string" && mediaUrl.includes("/") ? mediaUrl.split("/").pop() : "Attached Document.pdf"}
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
                      {String(t?.text || "").replace("{name}", typeof lead?.name === "string" ? lead.name : "Client")}
                    </Text>
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
                    const isSelected = (selectedStageId || lead?.statusId) === (st.id || st._id);
                    return (
                      <TouchableOpacity
                        key={st.id || st._id}
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
          animationType="fade"
          transparent
          onRequestClose={() => !savingReminder && setReminderModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalBackdrop}
          >
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
                  <Ionicons name="close" size={20} color={THEME.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 6 }}
              >
                <Text style={styles.fieldLabel}>Reminder Title *</Text>
                <TextInput
                  style={styles.modalFieldInput}
                  placeholder="e.g. Call regarding quotation"
                  placeholderTextColor={THEME.textMuted}
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

                <Text style={styles.fieldLabel}>Notes & Instructions</Text>
                <TextInput
                  style={[styles.modalFieldInput, { height: 68, textAlignVertical: "top" }]}
                  placeholder="Discussion points or instructions..."
                  placeholderTextColor={THEME.textMuted}
                  multiline
                  value={reminderNotes}
                  onChangeText={setReminderNotes}
                  editable={!savingReminder}
                />

                <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
                  <TouchableOpacity
                    style={[styles.modalCancelBtn, savingReminder && { opacity: 0.6 }]}
                    onPress={() => setReminderModalVisible(false)}
                    disabled={savingReminder}
                  >
                    <Text style={styles.modalCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modalSubmitBtn,
                      (!reminderTitle.trim() || savingReminder) && { opacity: 0.6 },
                    ]}
                    onPress={handleAddReminder}
                    disabled={!reminderTitle.trim() || savingReminder}
                  >
                    {savingReminder ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <ActivityIndicator size="small" color="#FFF" />
                        <Text style={styles.modalSubmitBtnText}>Scheduling...</Text>
                      </View>
                    ) : (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                        <Ionicons name="checkmark-circle" size={15} color="#FFF" />
                        <Text style={styles.modalSubmitBtnText}>Save Reminder</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* ── MODAL: EDIT LEAD ── */}
        <Modal
          visible={editModalVisible}
          animationType="fade"
          transparent
          onRequestClose={() => !updating && setEditModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalBackdrop}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalHeading}>Edit Lead Profile</Text>
                <TouchableOpacity
                  onPress={() => !updating && setEditModalVisible(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={20} color={THEME.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.fieldLabel}>Full Name</Text>
                <TextInput
                  style={styles.modalFieldInput}
                  value={editForm.name}
                  onChangeText={(v) => setEditForm((p) => ({ ...p, name: v }))}
                  placeholder="Enter full name"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="words"
                />

                <Text style={styles.fieldLabel}>WhatsApp Phone</Text>
                <TextInput
                  style={styles.modalFieldInput}
                  value={editForm.whatsappPhone}
                  onChangeText={(v) => setEditForm((p) => ({ ...p, whatsappPhone: v }))}
                  placeholder="e.g. 9876543210"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                />

                <Text style={styles.fieldLabel}>Email Address</Text>
                <TextInput
                  style={styles.modalFieldInput}
                  value={editForm.email}
                  onChangeText={(v) => setEditForm((p) => ({ ...p, email: v }))}
                  placeholder="e.g. name@example.com"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <Text style={styles.fieldLabel}>Company Name</Text>
                <TextInput
                  style={styles.modalFieldInput}
                  value={editForm.company}
                  onChangeText={(v) => setEditForm((p) => ({ ...p, company: v }))}
                  placeholder="Enter company name"
                  placeholderTextColor="#94A3B8"
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
                        size={12}
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
                  style={styles.modalFieldInput}
                  value={editForm.estimatedValue}
                  onChangeText={(v) => setEditForm((p) => ({ ...p, estimatedValue: v }))}
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                />

                <TouchableOpacity style={styles.primarySubmitBtnMini} onPress={handleSaveEdits} disabled={updating}>
                  {updating ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.primarySubmitBtnTextMini}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
        </>
        ) : null}
      </View>
    </CompanyAdminLayout>
  );
}

export default function LeadDetailsScreen(props) {
  return (
    <LeadDetailsErrorBoundary navigation={props.navigation}>
      <LeadDetailsScreenComponent {...props} />
    </LeadDetailsErrorBoundary>
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
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 360,
    maxHeight: "88%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalHeading: {
    fontSize: 14,
    fontFamily: FONTS.displayBold,
    color: THEME.textPrimary,
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
  fieldLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: THEME.textSecondary,
    marginBottom: 4,
    marginTop: 8,
  },
  fieldInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12.5,
    fontFamily: FONTS.bodyMedium,
    color: "#0F172A",
  },
  modalFieldInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12.5,
    fontFamily: FONTS.bodyMedium,
    color: "#0F172A",
    marginBottom: 4,
  },
  fieldInputMini: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12.5,
    fontFamily: FONTS.bodyMedium,
    color: "#0F172A",
    marginBottom: 4,
  },
  primarySubmitBtnMini: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.primary,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 14,
    marginBottom: 6,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  primarySubmitBtnTextMini: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: FONTS.displayBold,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  modalCancelBtnText: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: THEME.textSecondary,
  },
  modalSubmitBtn: {
    flex: 1.6,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.primary,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  modalSubmitBtnText: {
    fontSize: 12,
    fontFamily: FONTS.displayBold,
    color: "#FFFFFF",
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
  prominentStageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.12)",
  },
  stageSectionMicroLabel: {
    fontSize: 8.5,
    fontFamily: FONTS.displayBold,
    color: "#94A3B8",
    letterSpacing: 0.8,
  },
  prominentStageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  prominentStageTitle: {
    fontSize: 13,
    fontFamily: FONTS.displayBold,
    color: "#FFFFFF",
  },
  prominentStageButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#3B82F6",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  prominentStageBtnText: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontFamily: FONTS.displayBold,
  },
  compactDetailsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  compactDetailsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginBottom: 5,
  },
  compactDetailsTitle: {
    fontSize: 9.5,
    fontFamily: FONTS.displayBold,
    color: "#475569",
    letterSpacing: 0.5,
  },
  compactEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: THEME.primaryBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  compactEditBtnText: {
    fontSize: 9.5,
    fontFamily: FONTS.bodyBold,
    color: THEME.primary,
  },
  compactGridRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 4,
    gap: 8,
  },
  compactCell: {
    justifyContent: "center",
  },
  compactCellLabel: {
    fontSize: 9,
    fontFamily: FONTS.bodyBold,
    color: "#475569",
    letterSpacing: 0.4,
    marginBottom: 1.5,
    textTransform: "uppercase",
    includeFontPadding: false,
  },
  compactValueRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  compactCellValue: {
    fontSize: 11.5,
    fontFamily: FONTS.bodySemiBold,
    color: THEME.textPrimary,
    includeFontPadding: false,
  },
  remindersCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    padding: 10,
    marginBottom: 8,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  remindersHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F3FF",
    marginBottom: 6,
  },
  remindersHeaderTitle: {
    fontSize: 10,
    fontFamily: FONTS.displayBold,
    color: "#6D28D9",
    letterSpacing: 0.5,
  },
  addReminderHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#7C3AED",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  addReminderHeaderBtnText: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    color: "#FFFFFF",
  },
  nextFollowUpBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    borderRadius: 8,
    padding: 8,
    marginBottom: 4,
  },
  nextFollowUpIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
  },
  nextFollowUpLabel: {
    fontSize: 8.5,
    fontFamily: FONTS.displayBold,
    color: "#6D28D9",
    letterSpacing: 0.5,
  },
  nextFollowUpTime: {
    fontSize: 11.5,
    fontFamily: FONTS.bodyBold,
    color: "#4C1D95",
    marginTop: 1,
  },
  nextFollowUpBadge: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  nextFollowUpBadgeText: {
    fontSize: 9,
    fontFamily: FONTS.bodyBold,
    color: "#FFFFFF",
  },
  reminderItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FAF5FF",
    borderWidth: 1,
    borderColor: "#E9D5FF",
    borderRadius: 7,
    padding: 7,
    gap: 6,
  },
  reminderDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#8B5CF6",
    marginTop: 4,
  },
  reminderItemTitle: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: "#4C1D95",
  },
  reminderItemDate: {
    fontSize: 9.5,
    color: "#7C3AED",
    marginTop: 1,
    fontFamily: FONTS.bodyMedium,
  },
  reminderItemNotes: {
    fontSize: 9.5,
    color: "#64748B",
    marginTop: 2,
  },
  emptyRemindersRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
  },
  emptyRemindersText: {
    fontSize: 10.5,
    color: THEME.textMuted,
    fontFamily: FONTS.bodyMedium,
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
