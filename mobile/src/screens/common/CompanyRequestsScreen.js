import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import api from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import { COLORS, FONTS } from "../../theme/tokens";

const { width } = Dimensions.get("window");

const THEME = {
  primary: "#1268D9",
  primaryDark: "#082B52",
  accent: "#6366F1",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  borderLight: "#F1F5F9",
  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
};

const CATEGORIES = [
  "Data Request",
  "Document Submission",
  "General Query",
  "IT Support",
  "HR Assistance",
  "Feedback & Survey",
  "Approval Request",
  "Accounts & Finance",
  "Other",
];

const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

const PRIORITY_CONFIG = {
  Low: { color: "#64748B", bg: "#F1F5F9", border: "#CBD5E1", icon: "arrow-down" },
  Medium: { color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", icon: "remove" },
  High: { color: "#D97706", bg: "#FEF3C7", border: "#FDE68A", icon: "arrow-up" },
  Urgent: { color: "#DC2626", bg: "#FEE2E2", border: "#FECACA", icon: "alert-circle" },
};

const STATUS_CONFIG = {
  Open: { color: "#0284C7", bg: "#E0F2FE", border: "#BAE6FD" },
  "In Progress": { color: "#D97706", bg: "#FEF3C7", border: "#FDE68A" },
  Resolved: { color: "#059669", bg: "#D1FAE5", border: "#A7F3D0" },
  Closed: { color: "#64748B", bg: "#F1F5F9", border: "#E2E8F0" },
};

export default function CompanyRequestsScreen({ navigation }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [requests, setRequests] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("all"); // 'all' | 'sent_by_me' | 'assigned_to_me' | 'resolved'
  const [search, setSearch] = useState("");

  // Modals
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // New Request Form
  const [form, setForm] = useState({
    title: "",
    category: "Data Request",
    priority: "Medium",
    targetType: "ALL_EMPLOYEES",
    targetDepartmentId: "",
    description: "",
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [reqRes, deptRes] = await Promise.all([
        api.get("/internal-requests", { params: { tab, search } }),
        api.get("/company/departments").catch(() => ({ data: { departments: [] } })),
      ]);

      const list = reqRes.data?.data || [];
      setRequests(Array.isArray(list) ? list : []);

      const deptList = deptRes.data?.departments || deptRes.data?.data || [];
      setDepartments(Array.isArray(deptList) ? deptList : []);
    } catch (err) {
      console.warn("[CompanyRequestsScreen] fetch error:", err?.message || err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleCreate = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      return Alert.alert("Required Fields", "Please enter request title and detailed instructions.");
    }
    try {
      setSubmitting(true);
      await api.post("/internal-requests", form);
      Alert.alert("Success", "Company request broadcasted successfully!");
      setCreateModalVisible(false);
      setForm({
        title: "",
        category: "Data Request",
        priority: "Medium",
        targetType: "ALL_EMPLOYEES",
        targetDepartmentId: "",
        description: "",
      });
      fetchData();
    } catch (err) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to create request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedRequest) return;
    try {
      setSubmitting(true);
      const res = await api.post(`/internal-requests/${selectedRequest._id}/reply`, {
        message: replyText.trim(),
      });
      setReplyText("");
      if (res.data?.data) {
        setSelectedRequest(res.data.data);
      }
      fetchData();
    } catch (err) {
      Alert.alert("Error", "Failed to post response.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedRequest) return;
    try {
      const res = await api.patch(`/internal-requests/${selectedRequest._id}/status`, {
        status: newStatus,
      });
      if (res.data?.data) {
        setSelectedRequest(res.data.data);
      }
      fetchData();
      Alert.alert("Success", `Status changed to ${newStatus}`);
    } catch (err) {
      Alert.alert("Error", "Failed to update status.");
    }
  };

  const renderItem = ({ item }) => {
    const priorityInfo = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.Medium;
    const statusInfo = STATUS_CONFIG[item.status] || STATUS_CONFIG.Open;
    const responsesCount = item.responses?.length || 0;
    const formattedDate = item.createdAt ? new Date(item.createdAt).toLocaleDateString([], { month: "short", day: "numeric" }) : "";

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        onPress={() => {
          setSelectedRequest(item);
          setDetailsModalVisible(true);
        }}
      >
        <View style={[styles.cardLeftStrip, { backgroundColor: priorityInfo.color }]} />

        <View style={styles.cardBody}>
          {/* Top Row: Code, Priority, Status */}
          <View style={styles.cardHeaderRow}>
            <View style={styles.codeBadge}>
              <Text style={styles.codeText}>{item.requestCode || "#REQ"}</Text>
            </View>

            <View style={[styles.badgePill, { backgroundColor: priorityInfo.bg, borderColor: priorityInfo.border }]}>
              <View style={[styles.statusDot, { backgroundColor: priorityInfo.color }]} />
              <Text style={[styles.badgeText, { color: priorityInfo.color }]}>{item.priority}</Text>
            </View>

            <View style={[styles.badgePill, { backgroundColor: statusInfo.bg, borderColor: statusInfo.border }]}>
              <Text style={[styles.badgeText, { color: statusInfo.color }]}>{item.status}</Text>
            </View>

            {formattedDate ? <Text style={styles.dateText}>{formattedDate}</Text> : null}
          </View>

          {/* Title & Category */}
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>

          {item.description ? (
            <Text style={styles.cardDesc} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          {/* Footer: Target, Requester & Feedback */}
          <View style={styles.cardFooter}>
            <View style={styles.targetPill}>
              <Ionicons
                name={item.targetType === "ALL_EMPLOYEES" ? "business" : "people"}
                size={12}
                color="#4338CA"
              />
              <Text style={styles.targetPillText} numberOfLines={1}>
                {item.targetType === "ALL_EMPLOYEES"
                  ? "All Company"
                  : item.targetDepartmentName || item.targetDepartmentId?.name || "Department"}
              </Text>
            </View>

            <View style={styles.feedbackPill}>
              <Ionicons name="chatbubbles-outline" size={13} color={THEME.primary} />
              <Text style={styles.feedbackCountText}>
                {responsesCount} {responsesCount === 1 ? "Reply" : "Replies"}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const topInsetPadding = Math.max(insets.top, Platform.OS === "android" ? StatusBar.currentHeight || 20 : 44);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#082B52" translucent />

      {/* ── SAFE AREA HEADER ── */}
      <LinearGradient
        colors={["#082B52", "#0F4C81", "#1268D9"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerContainer, { paddingTop: topInsetPadding + 8 }]}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerBackBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Company Requests
            </Text>
            <Text style={styles.headerSubtitle}>
              Internal Queries & Feedback Hub
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setCreateModalVisible(true)}
            style={styles.headerAddBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.headerAddBtnText}>New</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar inside Header Strip */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={17} color="#94A3B8" style={{ marginLeft: 4 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search requests by title or code..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={17} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* ── FILTER TABS STRIP ── */}
      <View style={styles.tabsStrip}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        >
          {[
            { id: "all", label: "All Requests", icon: "apps-outline" },
            { id: "sent_by_me", label: "Sent by Me", icon: "paper-plane-outline" },
            { id: "assigned_to_me", label: "Received / For Me", icon: "mail-outline" },
            { id: "resolved", label: "Resolved", icon: "checkmark-circle-outline" },
          ].map((t) => {
            const isActive = tab === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.tabChip, isActive && styles.tabChipActive]}
                onPress={() => setTab(t.id)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={t.icon}
                  size={14}
                  color={isActive ? "#FFFFFF" : "#64748B"}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.tabChipText, isActive && styles.tabChipTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── CONTENT BODY ── */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={THEME.primary} />
            <Text style={styles.loadingTitle}>Loading requests...</Text>
            <Text style={styles.loadingSub}>Fetching latest inquiries and feedback</Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item._id || String(Math.random())}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 85 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[THEME.primary]}
              tintColor={THEME.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="chatbox-ellipses-outline" size={42} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>No Requests Found</Text>
              <Text style={styles.emptySub}>
                {search
                  ? "No matching requests for your search query."
                  : "No requests found in this tab. Tap '+ New' to broadcast a company request."}
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => setCreateModalVisible(true)}
              >
                <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.emptyActionBtnText}>Create New Request</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* ── FLOATING ACTION BUTTON ── */}
      <TouchableOpacity
        style={[styles.fab, { bottom: Math.max(insets.bottom + 20, 24) }]}
        onPress={() => setCreateModalVisible(true)}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={["#1268D9", "#082B52"]}
          style={styles.fabGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
          <Text style={styles.fabText}>New Request</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* ── MODAL: CREATE REQUEST ── */}
      <Modal visible={createModalVisible} animationType="slide" transparent onRequestClose={() => setCreateModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={[styles.modalContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            {/* Header */}
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>New Company Request</Text>
                <Text style={styles.modalSubTitle}>Broadcast query, task, or data inquiry</Text>
              </View>
              <TouchableOpacity
                onPress={() => setCreateModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.fieldLabel}>Request Title *</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="e.g. Q3 Sales Data & Expense Receipts"
                placeholderTextColor="#94A3B8"
                value={form.title}
                onChangeText={(v) => setForm((p) => ({ ...p, title: v }))}
              />

              <Text style={styles.fieldLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.chip, form.category === cat && styles.chipActive]}
                    onPress={() => setForm((p) => ({ ...p, category: cat }))}
                  >
                    <Text style={[styles.chipText, form.category === cat && styles.chipTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Priority Level</Text>
              <View style={styles.rowGrid}>
                {PRIORITIES.map((pr) => {
                  const conf = PRIORITY_CONFIG[pr];
                  const isSel = form.priority === pr;
                  return (
                    <TouchableOpacity
                      key={pr}
                      style={[
                        styles.prioritySelectBtn,
                        isSel && { borderColor: conf.color, backgroundColor: conf.bg },
                      ]}
                      onPress={() => setForm((p) => ({ ...p, priority: pr }))}
                    >
                      <View style={[styles.statusDot, { backgroundColor: conf.color }]} />
                      <Text
                        style={[
                          styles.prioritySelectText,
                          isSel && { color: conf.color, fontFamily: FONTS.bodyBold },
                        ]}
                      >
                        {pr}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Target Audience</Text>
              <View style={styles.rowGrid}>
                <TouchableOpacity
                  style={[
                    styles.targetSelectBtn,
                    form.targetType === "ALL_EMPLOYEES" && styles.targetSelectBtnActive,
                  ]}
                  onPress={() => setForm((p) => ({ ...p, targetType: "ALL_EMPLOYEES" }))}
                >
                  <Ionicons
                    name="business"
                    size={16}
                    color={form.targetType === "ALL_EMPLOYEES" ? "#FFFFFF" : "#64748B"}
                  />
                  <Text
                    style={[
                      styles.targetSelectText,
                      form.targetType === "ALL_EMPLOYEES" && styles.targetSelectTextActive,
                    ]}
                  >
                    Entire Company
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.targetSelectBtn,
                    form.targetType === "DEPARTMENT" && styles.targetSelectBtnActive,
                  ]}
                  onPress={() => setForm((p) => ({ ...p, targetType: "DEPARTMENT" }))}
                >
                  <Ionicons
                    name="people"
                    size={16}
                    color={form.targetType === "DEPARTMENT" ? "#FFFFFF" : "#64748B"}
                  />
                  <Text
                    style={[
                      styles.targetSelectText,
                      form.targetType === "DEPARTMENT" && styles.targetSelectTextActive,
                    ]}
                  >
                    Department
                  </Text>
                </TouchableOpacity>
              </View>

              {form.targetType === "DEPARTMENT" && (
                <>
                  <Text style={styles.fieldLabel}>Select Target Department</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                    {departments.map((d) => {
                      const dId = d._id || d.id;
                      const isSel = form.targetDepartmentId === dId;
                      return (
                        <TouchableOpacity
                          key={dId}
                          style={[styles.chip, isSel && styles.chipActive]}
                          onPress={() => setForm((p) => ({ ...p, targetDepartmentId: dId }))}
                        >
                          <Text style={[styles.chipText, isSel && styles.chipTextActive]}>{d.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              )}

              <Text style={styles.fieldLabel}>Instructions / Details *</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldTextArea]}
                placeholder="Specify what details, attachments, or action is expected..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={4}
                value={form.description}
                onChangeText={(v) => setForm((p) => ({ ...p, description: v }))}
              />

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleCreate}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="send" size={16} color="#FFF" style={{ marginRight: 6 }} />
                    <Text style={styles.submitBtnText}>Broadcast Request</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL: THREADED FEEDBACK & DISCUSSION ── */}
      {selectedRequest && (
        <Modal
          visible={detailsModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setDetailsModalVisible(false)}
        >
          <KeyboardAvoidingView
            style={styles.modalBackdrop}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={[styles.modalContainer, { maxHeight: "92%", paddingBottom: Math.max(insets.bottom, 12) }]}>
              {/* Header */}
              <View style={styles.modalHeaderRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={styles.codeText}>{selectedRequest.requestCode}</Text>
                    <View
                      style={[
                        styles.badgePill,
                        {
                          backgroundColor: (STATUS_CONFIG[selectedRequest.status] || STATUS_CONFIG.Open).bg,
                          borderColor: (STATUS_CONFIG[selectedRequest.status] || STATUS_CONFIG.Open).border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          { color: (STATUS_CONFIG[selectedRequest.status] || STATUS_CONFIG.Open).color },
                        ]}
                      >
                        {selectedRequest.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.modalTitle} numberOfLines={1}>
                    {selectedRequest.title}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setDetailsModalVisible(false)}
                  style={styles.modalCloseBtn}
                >
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Chat & Details Scroll */}
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {/* Main Overview */}
                <View style={styles.overviewBox}>
                  <Text style={styles.overviewDesc}>{selectedRequest.description}</Text>
                  <View style={styles.overviewMetaRow}>
                    <Text style={styles.metaSub}>
                      Requested By:{" "}
                      <Text style={{ fontFamily: FONTS.bodyBold, color: THEME.textPrimary }}>
                        {selectedRequest.requesterId?.name || "Company Admin"}
                      </Text>
                    </Text>
                    <Text style={styles.metaSub}>
                      Category:{" "}
                      <Text style={{ fontFamily: FONTS.bodyBold, color: THEME.primary }}>
                        {selectedRequest.category || "General"}
                      </Text>
                    </Text>
                  </View>
                </View>

                {/* Status Quick Changer */}
                <View style={styles.statusChangerWrap}>
                  <Text style={styles.statusChangerLabel}>Change Status:</Text>
                  <View style={{ flexDirection: "row", gap: 6, flex: 1 }}>
                    {["Open", "In Progress", "Resolved"].map((st) => {
                      const isSel = selectedRequest.status === st;
                      const sConf = STATUS_CONFIG[st] || STATUS_CONFIG.Open;
                      return (
                        <TouchableOpacity
                          key={st}
                          style={[
                            styles.statusChip,
                            isSel && { backgroundColor: sConf.color, borderColor: sConf.color },
                          ]}
                          onPress={() => handleUpdateStatus(st)}
                        >
                          <Text
                            style={[
                              styles.statusChipText,
                              isSel && { color: "#FFF", fontFamily: FONTS.bodyBold },
                            ]}
                          >
                            {st}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <Text style={styles.sectionHeaderTitle}>
                  FEEDBACK & RESPONSES ({selectedRequest.responses?.length || 0})
                </Text>

                {!selectedRequest.responses || selectedRequest.responses.length === 0 ? (
                  <View style={styles.emptyRepliesWrap}>
                    <Ionicons name="chatbubbles-outline" size={28} color="#CBD5E1" />
                    <Text style={styles.emptyNote}>No responses posted yet. Be the first to reply!</Text>
                  </View>
                ) : (
                  selectedRequest.responses.map((resp, i) => (
                    <View key={i} style={styles.bubble}>
                      <View style={styles.bubbleHeaderRow}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <View style={styles.avatarMini}>
                            <Text style={styles.avatarMiniText}>
                              {(resp.senderName || "U").charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View>
                            <Text style={styles.bubbleName}>{resp.senderName || "Team Member"}</Text>
                            <Text style={styles.bubbleRole}>
                              {resp.department || resp.senderRole || "Staff"}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.bubbleTime}>
                          {resp.createdAt
                            ? new Date(resp.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </Text>
                      </View>
                      <Text style={styles.bubbleText}>{resp.message}</Text>
                    </View>
                  ))
                )}
              </ScrollView>

              {/* Reply Input Box */}
              <View style={styles.replyBox}>
                <TextInput
                  style={styles.replyInput}
                  placeholder="Type feedback, response, or data note..."
                  placeholderTextColor="#94A3B8"
                  value={replyText}
                  onChangeText={setReplyText}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.replySendBtn, !replyText.trim() && { opacity: 0.5 }]}
                  onPress={handleSendReply}
                  disabled={submitting || !replyText.trim()}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Ionicons name="send" size={16} color="#FFF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    flex: 1,
    marginHorizontal: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: FONTS.displayBold,
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 1,
  },
  headerAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    gap: 4,
  },
  headerAddBtnText: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: "#FFFFFF",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.body,
    color: THEME.textPrimary,
    paddingVertical: 0,
  },
  tabsStrip: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  tabsContent: {
    paddingHorizontal: 14,
    gap: 8,
  },
  tabChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tabChipActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  tabChipText: {
    fontSize: 11.5,
    fontFamily: FONTS.bodyMedium,
    color: "#64748B",
  },
  tabChipTextActive: {
    color: "#FFFFFF",
    fontFamily: FONTS.bodyBold,
  },
  listContent: {
    padding: 14,
    gap: 10,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardLeftStrip: {
    width: 5,
  },
  cardBody: {
    flex: 1,
    padding: 12,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
    flexWrap: "wrap",
  },
  codeBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  codeText: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    color: "#475569",
  },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
  },
  dateText: {
    marginLeft: "auto",
    fontSize: 10,
    color: THEME.textMuted,
    fontFamily: FONTS.bodyMedium,
  },
  cardTitle: {
    fontSize: 13.5,
    fontFamily: FONTS.displayBold,
    color: THEME.textPrimary,
    lineHeight: 18,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 11.5,
    color: THEME.textSecondary,
    fontFamily: FONTS.body,
    lineHeight: 16,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.borderLight,
  },
  targetPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    maxWidth: "60%",
  },
  targetPillText: {
    fontSize: 10.5,
    fontFamily: FONTS.bodyBold,
    color: "#4338CA",
  },
  feedbackPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  feedbackCountText: {
    fontSize: 10.5,
    fontFamily: FONTS.bodyBold,
    color: THEME.primary,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingBox: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  loadingTitle: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: FONTS.displayBold,
    color: THEME.textPrimary,
  },
  loadingSub: {
    marginTop: 4,
    fontSize: 11,
    color: THEME.textMuted,
    fontFamily: FONTS.body,
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: FONTS.displayBold,
    color: THEME.textPrimary,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: THEME.textMuted,
    fontFamily: FONTS.body,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
  },
  emptyActionBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
  },
  fab: {
    position: "absolute",
    right: 18,
    borderRadius: 25,
    shadowColor: "#082B52",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 6,
  },
  fabText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: FONTS.displayBold,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 16,
    maxHeight: "88%",
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
  modalTitle: {
    fontSize: 15,
    fontFamily: FONTS.displayBold,
    color: THEME.textPrimary,
  },
  modalSubTitle: {
    fontSize: 11,
    color: THEME.textMuted,
    fontFamily: FONTS.body,
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: "#475569",
    textTransform: "uppercase",
    marginBottom: 6,
    marginTop: 8,
    letterSpacing: 0.3,
  },
  fieldInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    fontFamily: FONTS.body,
    color: THEME.textPrimary,
    marginBottom: 6,
  },
  fieldTextArea: {
    height: 90,
    textAlignVertical: "top",
  },
  rowGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  prioritySelectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingVertical: 8,
    gap: 5,
  },
  prioritySelectText: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: "#64748B",
  },
  targetSelectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingVertical: 9,
    gap: 6,
  },
  targetSelectBtnActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  targetSelectText: {
    fontSize: 11.5,
    fontFamily: FONTS.bodyMedium,
    color: "#64748B",
  },
  targetSelectTextActive: {
    color: "#FFFFFF",
    fontFamily: FONTS.bodyBold,
  },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginRight: 6,
  },
  chipActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  chipText: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: "#475569",
  },
  chipTextActive: {
    color: "#FFFFFF",
    fontFamily: FONTS.bodyBold,
  },
  submitBtn: {
    flexDirection: "row",
    backgroundColor: THEME.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    marginBottom: 8,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: FONTS.displayBold,
  },
  overviewBox: {
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.borderLight,
    marginBottom: 10,
  },
  overviewDesc: {
    fontSize: 13,
    color: THEME.textPrimary,
    fontFamily: FONTS.body,
    lineHeight: 18,
  },
  overviewMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  metaSub: {
    fontSize: 11,
    color: THEME.textMuted,
    fontFamily: FONTS.bodyMedium,
  },
  statusChangerWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 12,
    gap: 8,
  },
  statusChangerLabel: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: "#475569",
  },
  statusChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statusChipText: {
    fontSize: 10.5,
    fontFamily: FONTS.bodyMedium,
    color: "#64748B",
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: "#64748B",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  emptyRepliesWrap: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 6,
  },
  emptyNote: {
    fontSize: 12,
    color: THEME.textMuted,
    fontFamily: FONTS.body,
    textAlign: "center",
  },
  bubble: {
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.borderLight,
    marginBottom: 8,
  },
  bubbleHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  avatarMini: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#E0E7FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarMiniText: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    color: "#4338CA",
  },
  bubbleName: {
    fontSize: 11.5,
    fontFamily: FONTS.displayBold,
    color: THEME.textPrimary,
  },
  bubbleRole: {
    fontSize: 9.5,
    color: THEME.textMuted,
    fontFamily: FONTS.bodyMedium,
  },
  bubbleTime: {
    fontSize: 10,
    color: THEME.textMuted,
    fontFamily: FONTS.body,
  },
  bubbleText: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: THEME.textSecondary,
    lineHeight: 17,
    marginTop: 2,
  },
  replyBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  replyInput: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12.5,
    fontFamily: FONTS.body,
    maxHeight: 70,
  },
  replySendBtn: {
    backgroundColor: THEME.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
