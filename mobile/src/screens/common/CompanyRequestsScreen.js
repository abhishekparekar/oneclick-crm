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
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import api from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import { COLORS, FONTS } from "../../theme/tokens";

const { width } = Dimensions.get("window");

const THEME = {
  primary: "#1268D9",
  darkNavy: "#082B52",
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

const PRIORITY_COLORS = {
  Low: "#64748B",
  Medium: "#3B82F6",
  High: "#F59E0B",
  Urgent: "#EF4444",
};

const STATUS_COLORS = {
  Open: "#06B6D4",
  "In Progress": "#F59E0B",
  Resolved: "#10B981",
  Closed: "#64748B",
};

export default function CompanyRequestsScreen({ navigation }) {
  const { user } = useAuth();
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
      return Alert.alert("Required", "Title and description are required.");
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
      Alert.alert("Error", "Failed to post reply.");
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
    const priorityColor = PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.Medium;
    const statusColor = STATUS_COLORS[item.status] || STATUS_COLORS.Open;
    const responsesCount = item.responses?.length || 0;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => {
          setSelectedRequest(item);
          setDetailsModalVisible(true);
        }}
      >
        <View style={[styles.cardLeftStrip, { backgroundColor: priorityColor }]} />

        <View style={styles.cardBody}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.codeText}>{item.requestCode}</Text>
            <View style={[styles.badge, { backgroundColor: `${priorityColor}18`, borderColor: `${priorityColor}40` }]}>
              <Text style={[styles.badgeText, { color: priorityColor }]}>{item.priority}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: `${statusColor}18`, borderColor: `${statusColor}40` }]}>
              <Text style={[styles.badgeText, { color: statusColor }]}>{item.status}</Text>
            </View>
          </View>

          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.cardDesc} numberOfLines={2}>
            {item.description}
          </Text>

          <View style={styles.cardFooter}>
            <View style={styles.targetPill}>
              <Ionicons
                name={item.targetType === "ALL_EMPLOYEES" ? "business" : "people"}
                size={11}
                color="#4F46E5"
              />
              <Text style={styles.targetPillText}>
                {item.targetType === "ALL_EMPLOYEES"
                  ? "All Company"
                  : item.targetDepartmentName || "Department"}
              </Text>
            </View>

            <View style={styles.feedbackCountWrap}>
              <Ionicons name="chatbubbles-outline" size={13} color={THEME.primary} />
              <Text style={styles.feedbackCountText}>{responsesCount} Feedback</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#082B52" />

      {/* Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.topHeaderTitle}>Company Requests & Query Hub</Text>
        <TouchableOpacity onPress={() => setCreateModalVisible(true)} style={styles.addIconBtn}>
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsStrip}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
          {[
            { id: "all", label: "All Requests" },
            { id: "sent_by_me", label: "Sent by Me" },
            { id: "assigned_to_me", label: "Received / For Me" },
            { id: "resolved", label: "Resolved" },
          ].map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.tabChip, tab === t.id && styles.tabChipActive]}
              onPress={() => setTab(t.id)}
            >
              <Text style={[styles.tabChipText, tab === t.id && styles.tabChipTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color="#94A3B8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search requests by title or code..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={16} color="#94A3B8" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* List */}
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={styles.loadingText}>Loading requests...</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="chatbox-ellipses-outline" size={40} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Requests Found</Text>
              <Text style={styles.emptySub}>Tap '+' at the top to broadcast a new company request.</Text>
            </View>
          }
        />
      )}

      {/* ── MODAL: CREATE REQUEST ── */}
      <Modal visible={createModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>New Company Request</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Request Title *</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="e.g. Q3 Sales Data & Expense Receipts"
                value={form.title}
                onChangeText={(v) => setForm((p) => ({ ...p, title: v }))}
              />

              <Text style={styles.fieldLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.chip, form.category === cat && styles.chipActive]}
                    onPress={() => setForm((p) => ({ ...p, category: cat }))}
                  >
                    <Text style={[styles.chipText, form.category === cat && styles.chipTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Priority</Text>
              <View style={{ flexDirection: "row", gap: 6, marginBottom: 8 }}>
                {PRIORITIES.map((pr) => (
                  <TouchableOpacity
                    key={pr}
                    style={[styles.chip, { flex: 1, alignItems: "center" }, form.priority === pr && styles.chipActive]}
                    onPress={() => setForm((p) => ({ ...p, priority: pr }))}
                  >
                    <Text style={[styles.chipText, form.priority === pr && styles.chipTextActive]}>{pr}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Target Audience</Text>
              <View style={{ flexDirection: "row", gap: 6, marginBottom: 8 }}>
                <TouchableOpacity
                  style={[styles.chip, { flex: 1, alignItems: "center" }, form.targetType === "ALL_EMPLOYEES" && styles.chipActive]}
                  onPress={() => setForm((p) => ({ ...p, targetType: "ALL_EMPLOYEES" }))}
                >
                  <Text style={[styles.chipText, form.targetType === "ALL_EMPLOYEES" && styles.chipTextActive]}>
                    All Company
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.chip, { flex: 1, alignItems: "center" }, form.targetType === "DEPARTMENT" && styles.chipActive]}
                  onPress={() => setForm((p) => ({ ...p, targetType: "DEPARTMENT" }))}
                >
                  <Text style={[styles.chipText, form.targetType === "DEPARTMENT" && styles.chipTextActive]}>
                    Department
                  </Text>
                </TouchableOpacity>
              </View>

              {form.targetType === "DEPARTMENT" && (
                <>
                  <Text style={styles.fieldLabel}>Select Department</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
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
                style={[styles.fieldInput, { height: 75, textAlignVertical: "top" }]}
                placeholder="Type details or what files/data you require..."
                multiline
                value={form.description}
                onChangeText={(v) => setForm((p) => ({ ...p, description: v }))}
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Broadcast Request</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL: THREADED FEEDBACK & DISCUSSION ── */}
      {selectedRequest && (
        <Modal visible={detailsModalVisible} animationType="slide" transparent>
          <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={[styles.modalContainer, { maxHeight: "90%" }]}>
              {/* Header */}
              <View style={styles.modalHeaderRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.codeText}>{selectedRequest.requestCode}</Text>
                  <Text style={styles.modalTitle} numberOfLines={1}>
                    {selectedRequest.title}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
                  <Ionicons name="close" size={22} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Chat Thread */}
              <ScrollView style={{ flex: 1, paddingVertical: 8 }} showsVerticalScrollIndicator={false}>
                {/* Main Overview */}
                <View style={styles.overviewBox}>
                  <Text style={styles.overviewDesc}>{selectedRequest.description}</Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                    <Text style={styles.metaSub}>By: {selectedRequest.requesterId?.name || "Requester"}</Text>
                    <Text style={styles.metaSub}>{selectedRequest.status}</Text>
                  </View>
                </View>

                {/* Status Quick Bar */}
                <View style={{ flexDirection: "row", gap: 6, marginVertical: 8 }}>
                  {["Open", "In Progress", "Resolved"].map((st) => (
                    <TouchableOpacity
                      key={st}
                      style={[styles.chip, { flex: 1, alignItems: "center" }, selectedRequest.status === st && styles.chipActive]}
                      onPress={() => handleUpdateStatus(st)}
                    >
                      <Text style={[styles.chipText, selectedRequest.status === st && styles.chipTextActive]}>{st}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionHeaderTitle}>
                  TEAM RESPONSES & FEEDBACK ({selectedRequest.responses?.length || 0})
                </Text>

                {(!selectedRequest.responses || selectedRequest.responses.length === 0) ? (
                  <Text style={styles.emptyNote}>No responses yet. Add your feedback below!</Text>
                ) : (
                  selectedRequest.responses.map((resp, i) => (
                    <View key={i} style={styles.bubble}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                        <Text style={styles.bubbleName}>{resp.senderName} ({resp.department || resp.senderRole || "Staff"})</Text>
                        <Text style={styles.bubbleTime}>{new Date(resp.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
                      </View>
                      <Text style={styles.bubbleText}>{resp.message}</Text>
                    </View>
                  ))
                )}
              </ScrollView>

              {/* Reply Input */}
              <View style={styles.replyBox}>
                <TextInput
                  style={styles.replyInput}
                  placeholder="Type feedback, response, or data note..."
                  placeholderTextColor="#94A3B8"
                  value={replyText}
                  onChangeText={setReplyText}
                />
                <TouchableOpacity style={styles.replySendBtn} onPress={handleSendReply} disabled={submitting || !replyText.trim()}>
                  <Ionicons name="send" size={16} color="#FFF" />
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
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#082B52",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 4,
  },
  topHeaderTitle: {
    fontSize: 14,
    fontFamily: FONTS.displayBold,
    color: "#FFF",
  },
  addIconBtn: {
    padding: 4,
  },
  tabsStrip: {
    backgroundColor: "#FFF",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  tabsContent: {
    paddingHorizontal: 12,
    gap: 6,
  },
  tabChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  tabChipActive: {
    backgroundColor: THEME.primary,
  },
  tabChipText: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: "#64748B",
  },
  tabChipTextActive: {
    color: "#FFF",
    fontFamily: FONTS.bodyBold,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    marginHorizontal: 12,
    marginVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.border,
    height: 36,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONTS.body,
    color: THEME.textPrimary,
    padding: 0,
  },
  listContent: {
    padding: 12,
    paddingBottom: 40,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: "hidden",
    elevation: 1,
  },
  cardLeftStrip: {
    width: 4,
  },
  cardBody: {
    flex: 1,
    padding: 10,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  codeText: {
    fontSize: 10.5,
    fontFamily: FONTS.bodyBold,
    color: "#64748B",
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 9.5,
    fontFamily: FONTS.bodyBold,
  },
  cardTitle: {
    fontSize: 13,
    fontFamily: FONTS.displayBold,
    color: THEME.textPrimary,
  },
  cardDesc: {
    fontSize: 11,
    color: THEME.textSecondary,
    fontFamily: FONTS.body,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: THEME.borderLight,
  },
  targetPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  targetPillText: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    color: "#4F46E5",
  },
  feedbackCountWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  feedbackCountText: {
    fontSize: 10.5,
    fontFamily: FONTS.bodyBold,
    color: THEME.primary,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: THEME.textMuted,
    fontFamily: FONTS.bodyMedium,
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: FONTS.displayBold,
    color: THEME.textPrimary,
  },
  emptySub: {
    fontSize: 11,
    color: THEME.textMuted,
    fontFamily: FONTS.body,
    textAlign: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    maxHeight: "85%",
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: {
    fontSize: 14,
    fontFamily: FONTS.displayBold,
    color: THEME.textPrimary,
  },
  fieldLabel: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    color: "#64748B",
    textTransform: "uppercase",
    marginBottom: 4,
    marginTop: 4,
  },
  fieldInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontFamily: FONTS.body,
    color: THEME.textPrimary,
    marginBottom: 6,
  },
  chip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
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
    fontSize: 10.5,
    fontFamily: FONTS.bodyMedium,
    color: "#475569",
  },
  chipTextActive: {
    color: "#FFF",
    fontFamily: FONTS.bodyBold,
  },
  submitBtn: {
    backgroundColor: THEME.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 16,
  },
  submitBtnText: {
    color: "#FFF",
    fontSize: 12.5,
    fontFamily: FONTS.displayBold,
  },
  overviewBox: {
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.borderLight,
  },
  overviewDesc: {
    fontSize: 12,
    color: THEME.textPrimary,
    fontFamily: FONTS.body,
    lineHeight: 17,
  },
  metaSub: {
    fontSize: 10,
    color: THEME.textMuted,
    fontFamily: FONTS.bodyMedium,
  },
  sectionHeaderTitle: {
    fontSize: 10.5,
    fontFamily: FONTS.bodyBold,
    color: "#64748B",
    marginTop: 10,
    marginBottom: 6,
  },
  bubble: {
    backgroundColor: "#F8FAFC",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.borderLight,
    marginBottom: 6,
  },
  bubbleName: {
    fontSize: 11,
    fontFamily: FONTS.displayBold,
    color: THEME.textPrimary,
  },
  bubbleTime: {
    fontSize: 9.5,
    color: THEME.textMuted,
    fontFamily: FONTS.body,
  },
  bubbleText: {
    fontSize: 11.5,
    fontFamily: FONTS.body,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  emptyNote: {
    fontSize: 11,
    color: THEME.textMuted,
    fontFamily: FONTS.body,
    textAlign: "center",
    paddingVertical: 12,
  },
  replyBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  replyInput: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontFamily: FONTS.body,
  },
  replySendBtn: {
    backgroundColor: THEME.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
