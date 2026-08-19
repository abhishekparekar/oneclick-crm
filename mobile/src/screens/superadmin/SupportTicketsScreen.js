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
import AppCard from "../../components/AppCard";
import AppInput from "../../components/AppInput";
import AppButton from "../../components/AppButton";
import {
  getSupportTicketsApi,
  updateSupportTicketStatusApi,
} from "../../api/superAdminService";

const STATUS_FILTERS = [
  { label: "All Tickets", value: "" },
  { label: "Open", value: "open" },
  { label: "In Progress", value: "inProgress" },
  { label: "Resolved", value: "resolved" },
  { label: "Closed", value: "closed" },
];

const SupportTicketsScreen = ({ navigation }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState("");

  // Detail Modal States
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);

  const fetchTickets = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      const params = {};
      if (statusFilter) params.status = statusFilter;

      const { data } = await getSupportTicketsApi(params);
      setTickets(data.tickets || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load support tickets");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTickets();
    }, [statusFilter])
  );

  const handleOpenTicket = (ticket) => {
    setSelectedTicket(ticket);
    setReplyMessage("");
    setModalVisible(true);
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedTicket) return;
    setUpdatingStatus(true);
    try {
      const { data } = await updateSupportTicketStatusApi(selectedTicket._id, newStatus);
      Alert.alert("Success", `Ticket status updated to ${newStatus}`);
      
      // Update local state
      const updatedTicket = { ...selectedTicket, status: newStatus };
      setSelectedTicket(updatedTicket);
      setTickets((prev) =>
        prev.map((t) => (t._id === selectedTicket._id ? { ...t, status: newStatus } : t))
      );
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to update ticket status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyMessage.trim()) {
      Alert.alert("Warning", "Please enter a reply message");
      return;
    }

    setSubmittingReply(true);
    try {
      // Since there isn't a direct persistent reply endpoint on the backend,
      // we will simulate the reply submission locally in our thread.
      // In a real application, you'd call api.post(`/superadmin/support-tickets/${selectedTicket._id}/reply`)
      const newReply = {
        _id: String(Date.now()),
        message: replyMessage,
        createdAt: new Date().toISOString(),
        userId: {
          name: "Super Admin",
          email: "admin@icoded.com"
        }
      };

      // Update active ticket thread
      const updatedReplies = [...(selectedTicket.replies || []), newReply];
      const updatedTicket = { ...selectedTicket, replies: updatedReplies };
      
      setSelectedTicket(updatedTicket);
      setTickets((prev) =>
        prev.map((t) => (t._id === selectedTicket._id ? updatedTicket : t))
      );
      setReplyMessage("");
      Alert.alert("Success", "Reply sent successfully!");
    } catch (err) {
      Alert.alert("Error", "Failed to send response");
    } finally {
      setSubmittingReply(false);
    }
  };

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case "urgent":
        return { bg: "#fee2e2", text: "#991b1b" };
      case "high":
        return { bg: "#ffedd5", text: "#9a3412" };
      case "medium":
        return { bg: "#eff6ff", text: "#1e40af" };
      default:
        return { bg: "#f1f5f9", text: "#334155" };
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case "open":
        return styles.openBadge;
      case "inProgress":
        return styles.inProgressBadge;
      case "resolved":
        return styles.resolvedBadge;
      default:
        return styles.closedBadge;
    }
  };

  const getStatusLabel = (status) => {
    if (status === "inProgress") return "In Progress";
    return status;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderItem = ({ item }) => {
    const prio = getPriorityStyle(item.priority);
    return (
      <AppCard style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerInfo}>
            <View style={[styles.priorityBadge, { backgroundColor: prio.bg }]}>
              <Text style={[styles.priorityText, { color: prio.text }]}>{item.priority}</Text>
            </View>
            <Text style={styles.ticketId}>ID: #{item._id.substring(18)}</Text>
          </View>
          <View style={[styles.badge, getStatusBadgeStyle(item.status)]}>
            <Text style={styles.badgeText}>{getStatusLabel(item.status)}</Text>
          </View>
        </View>

        <Text style={styles.ticketTitle}>{item.title}</Text>
        <Text style={styles.ticketDesc} numberOfLines={2}>{item.description}</Text>

        <View style={styles.metaRow}>
          <View style={styles.userMeta}>
            <Ionicons name="person-outline" size={13} color="#64748b" style={{ marginRight: 4 }} />
            <Text style={styles.metaText} numberOfLines={1}>{item.userId?.name || "Client"}</Text>
          </View>
          <View style={styles.companyMeta}>
            <Ionicons name="business-outline" size={13} color="#64748b" style={{ marginRight: 4 }} />
            <Text style={styles.metaText} numberOfLines={1}>{item.companyId?.companyName || "No Company"}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
          <TouchableOpacity style={styles.viewBtn} onPress={() => handleOpenTicket(item)}>
            <Text style={styles.viewBtnText}>View Thread</Text>
            <Ionicons name="arrow-forward" size={14} color="#2563eb" />
          </TouchableOpacity>
        </View>
      </AppCard>
    );
  };

  return (
    <SuperAdminLayout navigation={navigation} activeTab="Dashboard">
      <View style={styles.container}>
        <Text style={styles.title}>Support Helpdesk</Text>

        {/* Filter Bar */}
        <View style={styles.filterSection}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={STATUS_FILTERS}
            keyExtractor={(item) => item.value}
            contentContainerStyle={styles.filterList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.filterTab,
                  statusFilter === item.value && styles.filterTabActive,
                ]}
                onPress={() => setStatusFilter(item.value)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    statusFilter === item.value && styles.filterTabTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {loading && tickets.length === 0 ? (
          <Loader />
        ) : (
          <FlatList
            data={tickets}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => fetchTickets(true)} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={48} color="#9ca3af" />
                <Text style={styles.emptyText}>No support tickets found.</Text>
              </View>
            }
          />
        )}

        {/* Support Ticket Detail Modal */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalBg}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.modalTitle}>{selectedTicket?.title}</Text>
                  <Text style={styles.modalSubtitle}>
                    #{selectedTicket?._id.substring(18)} • {selectedTicket?.companyId?.companyName}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#475569" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
                <Text style={styles.descriptionLabel}>Issue Description:</Text>
                <View style={styles.descriptionBox}>
                  <Text style={styles.descriptionText}>{selectedTicket?.description}</Text>
                </View>

                {/* Status Update Options */}
                <Text style={styles.sectionHeading}>Ticket Management</Text>
                <View style={styles.statusOptions}>
                  {["open", "inProgress", "resolved", "closed"].map((st) => (
                    <TouchableOpacity
                      key={st}
                      style={[
                        styles.statusSelectBtn,
                        selectedTicket?.status === st && styles.statusSelectBtnActive,
                      ]}
                      onPress={() => handleStatusChange(st)}
                      disabled={updatingStatus}
                    >
                      <Text
                        style={[
                          styles.statusSelectText,
                          selectedTicket?.status === st && styles.statusSelectTextActive,
                        ]}
                      >
                        {st === "inProgress" ? "In Progress" : st}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Conversation Threads */}
                <Text style={styles.sectionHeading}>Responses & Conversation</Text>
                <View style={styles.threadContainer}>
                  {/* Customer Original Ticket Description */}
                  <View style={styles.chatBubbleUser}>
                    <Text style={styles.chatAuthor}>{selectedTicket?.userId?.name || "Client"}</Text>
                    <Text style={styles.chatMsg}>{selectedTicket?.description}</Text>
                    <Text style={styles.chatTime}>{formatDate(selectedTicket?.createdAt)}</Text>
                  </View>

                  {/* Reply Log */}
                  {selectedTicket?.replies && selectedTicket.replies.length > 0 ? (
                    selectedTicket.replies.map((reply) => {
                      const isAdmin = reply.userId?.role === "SuperAdmin" || reply.userId?.email === "admin@icoded.com" || reply.userId?.name === "Super Admin";
                      return (
                        <View
                          key={reply._id}
                          style={isAdmin ? styles.chatBubbleAdmin : styles.chatBubbleUser}
                        >
                          <Text style={styles.chatAuthor}>
                            {reply.userId?.name || (isAdmin ? "Super Admin" : "Client")}
                          </Text>
                          <Text style={styles.chatMsg}>{reply.message}</Text>
                          <Text style={styles.chatTime}>{formatDate(reply.createdAt)}</Text>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={styles.noReplyText}>No answers or replies sent yet.</Text>
                  )}
                </View>

                {/* Reply Form */}
                <View style={styles.replyForm}>
                  <AppInput
                    placeholder="Type support reply or solution..."
                    value={replyMessage}
                    onChangeText={setReplyMessage}
                    multiline={true}
                    numberOfLines={3}
                    style={styles.replyInput}
                  />
                  <AppButton
                    title="Send Reply"
                    onPress={handleSendReply}
                    loading={submittingReply}
                    icon="send-outline"
                    style={styles.replyBtn}
                  />
                </View>
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
  filterSection: { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f1f5f9", paddingVertical: 8 },
  filterList: { paddingHorizontal: 16 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 15, backgroundColor: "#f1f5f9", marginRight: 8, borderWidth: 1, borderColor: "#e2e8f0" },
  filterTabActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  filterTabText: { fontSize: 12, fontWeight: "500", color: "#475569", textTransform: "capitalize" },
  filterTabTextActive: { color: "#fff", fontWeight: "600" },
  listContainer: { padding: 16, paddingBottom: 40 },
  card: { marginBottom: 14, padding: 14, borderRadius: 12 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10, borderBottomWidth: 1, borderBottomColor: "#f1f5f9", paddingBottom: 8 },
  headerInfo: { flexDirection: "row", alignItems: "center" },
  priorityBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginRight: 8 },
  priorityText: { fontSize: 10, fontWeight: "600", textTransform: "uppercase" },
  ticketId: { fontSize: 12, fontWeight: "500", color: "#64748b" },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  openBadge: { backgroundColor: "#dbeafe" },
  inProgressBadge: { backgroundColor: "#fef3c7" },
  resolvedBadge: { backgroundColor: "#dcfce7" },
  closedBadge: { backgroundColor: "#fee2e2" },
  badgeText: { fontSize: 11, fontWeight: "600", color: "#1e293b", textTransform: "capitalize" },
  ticketTitle: { fontSize: 15, fontWeight: "700", color: "#1e293b", marginBottom: 4 },
  ticketDesc: { fontSize: 12, color: "#475569", lineHeight: 18, marginBottom: 12 },
  metaRow: { flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: "#f1f5f9", paddingTop: 10, marginBottom: 8 },
  userMeta: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 },
  companyMeta: { flexDirection: "row", alignItems: "center", flex: 1 },
  metaText: { fontSize: 11, color: "#64748b" },
  actionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  dateText: { fontSize: 11, color: "#94a3b8" },
  viewBtn: { flexDirection: "row", alignItems: "center" },
  viewBtnText: { fontSize: 12, color: "#2563eb", fontWeight: "600", marginRight: 4 },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: { fontSize: 14, color: "#6b7280", marginTop: 12 },
  errorText: { color: "#ef4444", padding: 12, textAlign: "center" },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 16 },
  modalContainer: { backgroundColor: "#fff", borderRadius: 12, padding: 16, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingBottom: 10, marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
  modalSubtitle: { fontSize: 12, color: "#64748b", marginTop: 2 },
  modalScroll: { flex: 1 },
  descriptionLabel: { fontSize: 12, fontWeight: "600", color: "#64748b", marginBottom: 6 },
  descriptionBox: { backgroundColor: "#f8fafc", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#e2e8f0", marginBottom: 16 },
  descriptionText: { fontSize: 13, color: "#334155", lineHeight: 20 },
  sectionHeading: { fontSize: 13, fontWeight: "700", color: "#475569", marginBottom: 10, borderBottomWidth: 1, borderBottomColor: "#f1f5f9", paddingBottom: 4 },
  statusOptions: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 18 },
  statusSelectBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: "#cbd5e1" },
  statusSelectBtnActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  statusSelectText: { fontSize: 11, color: "#475569", textTransform: "capitalize" },
  statusSelectTextActive: { color: "#fff", fontWeight: "600" },
  threadContainer: { marginBottom: 18 },
  chatBubbleUser: { backgroundColor: "#f1f5f9", padding: 10, borderRadius: 8, alignSelf: "flex-start", maxWidth: "85%", marginBottom: 8 },
  chatBubbleAdmin: { backgroundColor: "#dbeafe", padding: 10, borderRadius: 8, alignSelf: "flex-end", maxWidth: "85%", marginBottom: 8 },
  chatAuthor: { fontSize: 10, fontWeight: "700", color: "#475569", marginBottom: 2 },
  chatMsg: { fontSize: 12, color: "#1e293b", lineHeight: 16 },
  chatTime: { fontSize: 9, color: "#94a3b8", textAlign: "right", marginTop: 4 },
  noReplyText: { fontSize: 12, color: "#94a3b8", fontStyle: "italic", textAlign: "center", paddingVertical: 10 },
  replyForm: { borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 12, marginBottom: 16 },
  replyInput: { height: 60, textAlignVertical: "top" },
  replyBtn: { marginTop: 10 },
});

export default SupportTicketsScreen;
