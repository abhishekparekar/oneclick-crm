import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CompanyAdminLayout from "../../components/CompanyAdminLayout";
import AppButton from "../../components/AppButton";
import { useAuth } from "../../context/AuthContext";
import {
  getCompanyAnnouncementsApi,
  createCompanyAnnouncementApi,
} from "../../api/companyService";

const TARGET_TYPES = [
  { label: "All Employees", value: "selectedCompany" },
  { label: "Managers Only", value: "managers" },
  { label: "HR Department Only", value: "hr" },
];

const CompanyAnnouncementsScreen = ({ navigation }) => {
  const { user, hasPermission } = useAuth();
  // CompanyAdmin always can create/post; others need the announcementsHolidays permission
  const canPostAnnouncement = user?.role === "CompanyAdmin" || (hasPermission && hasPermission("announcementsHolidays"));

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetType, setTargetType] = useState("selectedCompany");
  const [showTargetPicker, setShowTargetPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchAnnouncements = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const { data } = await getCompanyAnnouncementsApi();
      if (data && data.announcements) {
        setAnnouncements(data.announcements);
      }
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to load announcements");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handlePostAnnouncement = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert("Required Fields", "Please complete the title and content body");
      return;
    }

    try {
      setSubmitting(true);
      let finalTargetType = targetType;
      let finalRoles = [];
      let finalDepartments = [];

      if (targetType === "managers") {
        finalTargetType = "roleBased";
        finalRoles = ["Manager"];
      } else if (targetType === "hr") {
        finalTargetType = "roleBased"; // Or departmentBased if HR is a department, but roles usually has HR
        finalRoles = ["HR"];
      }

      const payload = {
        title,
        message: content,
        targetType: finalTargetType,
        targetRoles: finalRoles,
        targetDepartments: finalDepartments,
      };

      await createCompanyAnnouncementApi(payload);
      Alert.alert("Success", "Announcement posted successfully");
      
      // Reset Form and fetch again
      setTitle("");
      setContent("");
      setTargetType("selectedCompany");
      setModalVisible(false);
      fetchAnnouncements();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to post announcement");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTargetBadgeStyle = (type) => {
    switch (type) {
      case "all":
        return { bg: "#eff6ff", text: "#2563eb", icon: "people" };
      case "managers":
        return { bg: "#fef3c7", text: "#d97706", icon: "ribbon" };
      case "hr":
        return { bg: "#f3e8ff", text: "#7c3aed", icon: "shield-checkmark" };
      default:
        return { bg: "#f1f5f9", text: "#475569", icon: "megaphone" };
    }
  };

  const renderAnnouncementItem = ({ item }) => {
    const badge = getTargetBadgeStyle(item.targetType);
    const creatorName = item.createdBy ? `${item.createdBy.firstName} ${item.createdBy.lastName}` : "System Admin";

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.announcementTitle}>{item.title}</Text>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Ionicons name={badge.icon} size={12} color={badge.text} style={styles.badgeIcon} />
            <Text style={[styles.badgeText, { color: badge.text }]}>
              {TARGET_TYPES.find((t) => t.value === item.targetType)?.label || "All"}
            </Text>
          </View>
        </View>

        <Text style={styles.announcementBody}>{item.message}</Text>

        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            <Ionicons name="person-circle-outline" size={14} color="#64748b" />
            <Text style={styles.footerMetaText}>Posted by: {creatorName}</Text>
          </View>
          <View style={styles.footerRight}>
            <Ionicons name="time-outline" size={13} color="#94a3b8" />
            <Text style={styles.footerMetaText}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <CompanyAdminLayout
      navigation={navigation}
      activeTab="Dashboard"
      showSearch={false}
    >
      <View style={styles.screenHeader}>
        <View style={styles.headerTitleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Company Announcements</Text>
            <Text style={styles.subtitle}>Broadcast alerts, policies and news to the corporate team</Text>
          </View>
          {canPostAnnouncement && (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setModalVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="megaphone" size={16} color="#ffffff" />
              <Text style={styles.addBtnText}>Post Alert</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Fetching announcements...</Text>
        </View>
      ) : (
        <FlatList
          data={announcements}
          keyExtractor={(item) => item._id}
          renderItem={renderAnnouncementItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchAnnouncements(true)} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="megaphone-outline" size={64} color="#94a3b8" />
              <Text style={styles.emptyText}>No announcement feeds posted yet</Text>
            </View>
          }
        />
      )}

      {/* Post New Announcement Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Broadcast Announcement</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Announcement Title *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. Server Maintenance Notice"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Broadcast Body / Description *</Text>
                <TextInput
                  style={[styles.modalInput, styles.textArea]}
                  multiline
                  numberOfLines={4}
                  value={content}
                  onChangeText={setContent}
                  placeholder="Enter full announcement details here..."
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Target Audience Department / Group</Text>
                <TouchableOpacity
                  style={styles.pickerTrigger}
                  onPress={() => setShowTargetPicker(true)}
                >
                  <Text style={styles.pickerTriggerText}>
                    {TARGET_TYPES.find((t) => t.value === targetType)?.label}
                  </Text>
                  <Ionicons name="chevron-down-outline" size={18} color="#475569" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalActions}>
                <AppButton
                  title="Cancel"
                  variant="outline"
                  style={styles.modalBtn}
                  onPress={() => setModalVisible(false)}
                />
                <TouchableOpacity
                  style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                  onPress={handlePostAnnouncement}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.submitBtnText}>Post Announcement</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>

        {/* Target Audience Dropdown Selector */}
        <Modal visible={showTargetPicker} transparent animationType="fade">
          <TouchableOpacity
            style={styles.dropdownOverlay}
            activeOpacity={1}
            onPress={() => setShowTargetPicker(false)}
          >
            <View style={styles.dropdownCard}>
              <Text style={styles.dropdownHeading}>Select Target Audience</Text>
              {TARGET_TYPES.map((target) => (
                <TouchableOpacity
                  key={target.value}
                  style={[
                    styles.dropdownOption,
                    target.value === targetType && styles.dropdownOptionActive,
                  ]}
                  onPress={() => {
                    setTargetType(target.value);
                    setShowTargetPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownOptionText,
                      target.value === targetType && styles.dropdownOptionTextActive,
                    ]}
                  >
                    {target.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </Modal>
    </CompanyAdminLayout>
  );
};

const styles = StyleSheet.create({
  screenHeader: {
    padding: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
  },
  subtitle: {
    fontSize: 12.5,
    color: "#64748b",
    marginTop: 2,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563eb",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748b",
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  announcementTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e293b",
    flex: 1,
    marginRight: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeIcon: {
    marginRight: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  announcementBody: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 19,
    marginBottom: 14,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 10,
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  footerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  footerMetaText: {
    fontSize: 11.5,
    color: "#64748b",
    marginLeft: 4,
    fontWeight: "500",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 14,
    color: "#94a3b8",
    marginTop: 12,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e293b",
  },
  formContainer: {
    paddingBottom: 8,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13.5,
    color: "#1e293b",
    backgroundColor: "#ffffff",
  },
  textArea: {
    height: 90,
    textAlignVertical: "top",
  },
  pickerTrigger: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#f8fafc",
  },
  pickerTriggerText: {
    fontSize: 13.5,
    color: "#1e293b",
    fontWeight: "500",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
  },
  modalBtn: {
    width: 100,
    marginRight: 8,
  },
  submitBtn: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    width: 160,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    width: "80%",
    elevation: 8,
  },
  dropdownHeading: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 12,
    textAlign: "center",
  },
  dropdownOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    alignItems: "center",
  },
  dropdownOptionActive: {
    backgroundColor: "#eff6ff",
  },
  dropdownOptionText: {
    fontSize: 13.5,
    color: "#475569",
  },
  dropdownOptionTextActive: {
    color: "#2563eb",
    fontWeight: "600",
  },
});

export default CompanyAnnouncementsScreen;
