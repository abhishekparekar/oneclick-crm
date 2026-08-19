import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getEmployeesApi, updateEmployeeApi } from "../../api/employeeService";
import { COLORS, FONTS, SHADOWS, ROUNDING, SPACING } from "../../theme/tokens";

const AccessControlScreen = ({ navigation }) => {
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedManager, setSelectedManager] = useState(null);
  const [searchText, setSearchText] = useState("");
  
  // Temp Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [tempPermissions, setTempPermissions] = useState({
    tasks: { create: false, edit: false, shift: false, cancel: false, reopen: false },
    leaves: { approveReject: false },
    teamMembers: { add: false, edit: false, activeInactive: false },
    announcementsHolidays: false,
  });
  const [updating, setUpdating] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const empRes = await getEmployeesApi();
      const employees = empRes.data.employees || empRes.data || [];
      setManagers(employees);
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to load access control details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenEdit = (mgr) => {
    setSelectedManager(mgr);
    
    const perm = mgr.permissions || {};
    const displayRole = mgr.role || mgr.userId?.role || "Employee";
    const hasCustomized = mgr.permissions && Object.keys(mgr.permissions).length > 0;

    let defaultTasks = { create: false, edit: false, shift: false, cancel: false, reopen: false };
    let defaultLeaves = { approveReject: false };
    let defaultTeamMembers = { add: false, edit: false, activeInactive: false };
    let defaultAnnouncementsHolidays = false;

    if (!hasCustomized) {
      if (displayRole === "HR") {
        defaultTasks = { create: true, edit: true, shift: true, cancel: true, reopen: true };
        defaultLeaves = { approveReject: true };
        defaultTeamMembers = { add: true, edit: true, activeInactive: true };
        defaultAnnouncementsHolidays = true;
      } else if (displayRole === "Manager") {
        defaultTasks = { create: true, edit: true, shift: true, cancel: false, reopen: true };
        defaultLeaves = { approveReject: true };
        defaultTeamMembers = { add: false, edit: false, activeInactive: false };
        defaultAnnouncementsHolidays = false;
      }
    } else {
      defaultTasks = {
        create: perm.tasks?.create || false,
        edit: perm.tasks?.edit || false,
        shift: perm.tasks?.shift || false,
        cancel: perm.tasks?.cancel || false,
        reopen: perm.tasks?.reopen || false,
      };
      defaultLeaves = {
        approveReject: perm.leaves?.approveReject || false,
      };
      defaultTeamMembers = {
        add: perm.teamMembers?.add || false,
        edit: perm.teamMembers?.edit || false,
        activeInactive: perm.teamMembers?.activeInactive || false,
      };
      defaultAnnouncementsHolidays = perm.announcementsHolidays || false;
    }

    setTempPermissions({
      tasks: defaultTasks,
      leaves: defaultLeaves,
      teamMembers: defaultTeamMembers,
      announcementsHolidays: defaultAnnouncementsHolidays,
    });
    setModalVisible(true);
  };

  const handleTogglePerm = (category, action) => {
    setTempPermissions(prev => {
      if (action) {
        return {
          ...prev,
          [category]: {
            ...prev[category],
            [action]: !prev[category][action]
          }
        };
      } else {
        return {
          ...prev,
          [category]: !prev[category]
        };
      }
    });
  };

  const handleSave = async () => {
    if (!selectedManager) return;
    try {
      setUpdating(true);
      await updateEmployeeApi(selectedManager._id, {
        permissions: tempPermissions
      });
      setModalVisible(false);
      Alert.alert("Success", "Employee access permissions updated successfully");
      fetchData();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to update permissions");
    } finally {
      setUpdating(false);
    }
  };

  const filteredManagers = managers.filter(m => {
    const name = `${m.firstName || ""} ${m.lastName || ""}`.toLowerCase();
    const code = (m.employeeCode || "").toLowerCase();
    return name.includes(searchText.toLowerCase()) || code.includes(searchText.toLowerCase());
  });

  const renderManagerCard = ({ item }) => {
    const displayRole = item.role || item.userId?.role || "Employee";
    const formattedRole = displayRole === "CompanyAdmin" ? "Company Admin" : displayRole;
    
    // Resolve full name correctly
    const empName = item.firstName ? `${item.firstName} ${item.lastName || ""}`.trim() : (item.name || "Unnamed Employee");
    
    // Compute permission summary badges
    const perm = item.permissions || {};
    const badges = [];

    // Task badge summary
    if (perm.tasks) {
      const taskVals = Object.values(perm.tasks).filter(Boolean).length;
      if (taskVals === 5) badges.push({ text: "Full Tasks", bg: "#e0f2fe", color: "#0369a1", icon: "clipboard" });
      else if (taskVals > 0) badges.push({ text: `Tasks (${taskVals}/5)`, bg: "#f0f9ff", color: "#0284c7", icon: "clipboard-outline" });
    }
    
    // Leave badge summary
    if (perm.leaves?.approveReject) {
      badges.push({ text: "Leaves Appr.", bg: "#f3e8ff", color: "#6b21a8", icon: "calendar" });
    }

    // Team badge summary
    if (perm.teamMembers) {
      const teamVals = Object.values(perm.teamMembers).filter(Boolean).length;
      if (teamVals > 0) badges.push({ text: `Team (${teamVals}/3)`, bg: "#ecfdf5", color: "#047857", icon: "people" });
    }

    // Announcements badge summary
    if (perm.announcementsHolidays) {
      badges.push({ text: "Announcements", bg: "#fff7ed", color: "#c2410c", icon: "megaphone" });
    }

    return (
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => handleOpenEdit(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {((item.firstName?.[0] || "") + (item.lastName?.[0] || "")).toUpperCase() || "EE"}
            </Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.managerName}>{empName}</Text>
            <Text style={styles.managerDetails}>
              {item.employeeCode || "N/A"} · <Text style={styles.roleText}>{formattedRole}</Text>
            </Text>
          </View>
          <View style={styles.editBtn}>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </View>
        </View>

        {badges.length > 0 ? (
          <View style={styles.badgeRow}>
            {badges.map((b, index) => (
              <View key={index} style={[styles.badge, { backgroundColor: b.bg }]}>
                <Ionicons name={b.icon} size={10} color={b.color} style={{ marginRight: 3 }} />
                <Text style={[styles.badgeText, { color: b.color }]}>{b.text}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noPermissionsText}>No Custom Permissions (Default Applied)</Text>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0d9488" />
        <Text style={styles.loadingText}>Loading configurations...</Text>
      </View>
    );
  }

  const selectedEmpName = selectedManager 
    ? `${selectedManager.firstName} ${selectedManager.lastName || ""}`.trim()
    : "";

  return (
    <View style={styles.container}>
      {/* Premium Header */}
      <View style={styles.screenHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Access & Control</Text>
          <Text style={styles.subtitle}>Define access permissions for team members</Text>
        </View>
      </View>

      {/* Styled Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search employee by name or code..."
            placeholderTextColor="#94a3b8"
            value={searchText}
            onChangeText={setSearchText}
            style={styles.searchInput}
          />
          {searchText !== "" && (
            <TouchableOpacity onPress={() => setSearchText("")}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filteredManagers}
        renderItem={renderManagerCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="shield-outline" size={48} color="#94a3b8" />
            <Text style={styles.emptyText}>No matching employees found</Text>
          </View>
        }
      />

      {/* Grant Access Modal */}
      <Modal visible={modalVisible} transparent={true} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Grant Access & Control</Text>
                <Text style={styles.modalSubtitle}>{selectedEmpName}</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeModalBtn}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              
              {/* Section 1: Task Control */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="clipboard" size={18} color="#0d9488" />
                  <Text style={styles.sectionCardTitle}>Task Control</Text>
                </View>
                <View style={styles.checkboxGrid}>
                  {[
                    { key: "create", label: "Create Task" },
                    { key: "edit", label: "Edit Task" },
                    { key: "shift", label: "Shift Task" },
                    { key: "cancel", label: "Cancel Task" },
                    { key: "reopen", label: "Re-open Task" },
                  ].map(item => {
                    const isChecked = tempPermissions.tasks?.[item.key] || false;
                    return (
                      <TouchableOpacity
                        key={item.key}
                        onPress={() => handleTogglePerm("tasks", item.key)}
                        style={styles.checkboxRow}
                      >
                        <Ionicons 
                          name={isChecked ? "checkbox" : "square-outline"} 
                          size={20} 
                          color={isChecked ? "#0d9488" : "#cbd5e1"} 
                        />
                        <Text style={[styles.checkboxLabel, isChecked && styles.checkboxLabelActive]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Section 2: Leave Control */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="calendar" size={18} color="#8b5cf6" />
                  <Text style={styles.sectionCardTitle}>Leave Control</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleTogglePerm("leaves", "approveReject")}
                  style={styles.checkboxRowSingle}
                >
                  <Ionicons 
                    name={tempPermissions.leaves?.approveReject ? "checkbox" : "square-outline"} 
                    size={20} 
                    color={tempPermissions.leaves?.approveReject ? "#8b5cf6" : "#cbd5e1"} 
                  />
                  <Text style={[styles.checkboxLabel, tempPermissions.leaves?.approveReject && styles.checkboxLabelActive]}>
                    Approve & Reject Leaves
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Section 3: Team Management */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="people" size={18} color="#10b981" />
                  <Text style={styles.sectionCardTitle}>Team Management</Text>
                </View>
                <View style={styles.checkboxGrid}>
                  {[
                    { key: "add", label: "Add Team Member" },
                    { key: "edit", label: "Edit Team Member" },
                    { key: "activeInactive", label: "Active / Inactive Status" },
                  ].map(item => {
                    const isChecked = tempPermissions.teamMembers?.[item.key] || false;
                    return (
                      <TouchableOpacity
                        key={item.key}
                        onPress={() => handleTogglePerm("teamMembers", item.key)}
                        style={styles.checkboxRow}
                      >
                        <Ionicons 
                          name={isChecked ? "checkbox" : "square-outline"} 
                          size={20} 
                          color={isChecked ? "#10b981" : "#cbd5e1"} 
                        />
                        <Text style={[styles.checkboxLabel, isChecked && styles.checkboxLabelActive]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Section 4: Announcement & Holiday */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="megaphone" size={18} color="#f97316" />
                  <Text style={styles.sectionCardTitle}>Holidays & Announcements</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleTogglePerm("announcementsHolidays", null)}
                  style={styles.checkboxRowSingle}
                >
                  <Ionicons 
                    name={tempPermissions.announcementsHolidays ? "checkbox" : "square-outline"} 
                    size={20} 
                    color={tempPermissions.announcementsHolidays ? "#f97316" : "#cbd5e1"} 
                  />
                  <Text style={[styles.checkboxLabel, tempPermissions.announcementsHolidays && styles.checkboxLabelActive]}>
                    Grant Announcement & Holiday Access
                  </Text>
                </TouchableOpacity>
              </View>

            </ScrollView>

            {/* Modal Footer Buttons */}
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={updating}>
                {updating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc" },
  loadingText: { marginTop: 12, fontSize: 13, color: "#64748b", fontFamily: FONTS.bodyMedium },
  
  screenHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTextContainer: { flex: 1 },
  title: { fontSize: 18, fontWeight: "800", color: "#0f172a", letterSpacing: -0.5 },
  subtitle: { fontSize: 11, color: "#64748b", marginTop: 2, fontWeight: "500" },

  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#1e293b",
    height: "100%",
    padding: 0,
    fontWeight: "500",
  },

  listContainer: { padding: 16, paddingBottom: 60 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: { 
    flexDirection: "row", 
    alignItems: "center", 
  },
  avatar: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: "#ccfbf1", 
    justifyContent: "center", 
    alignItems: "center", 
    marginRight: 12 
  },
  avatarText: { 
    fontSize: 14, 
    fontWeight: "700", 
    color: "#0d9488" 
  },
  headerInfo: { flex: 1 },
  managerName: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  managerDetails: { fontSize: 11, color: "#64748b", marginTop: 2, fontWeight: "500" },
  roleText: { color: "#0d9488", fontWeight: "600" },
  editBtn: { 
    width: 28, 
    height: 28, 
    borderRadius: 14, 
    justifyContent: "center", 
    alignItems: "center" 
  },

  badgeRow: { 
    flexDirection: "row", 
    flexWrap: "wrap", 
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  badge: { 
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8, 
    paddingVertical: 3, 
    borderRadius: 6,
  },
  badgeText: { 
    fontSize: 9.5, 
    fontWeight: "700", 
  },
  noPermissionsText: {
    fontSize: 10,
    color: "#94a3b8",
    fontStyle: "italic",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },

  emptyContainer: { alignItems: "center", paddingVertical: 80 },
  emptyText: { marginTop: 12, fontSize: 13, color: "#64748b", fontWeight: "600" },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.45)", justifyContent: "flex-end" },
  modalContent: { 
    backgroundColor: "#ffffff", 
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20, 
    paddingHorizontal: 20, 
    paddingTop: 20, 
    paddingBottom: 32, 
    maxHeight: "84%" 
  },
  modalHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center",
    borderBottomWidth: 1, 
    borderBottomColor: "#f1f5f9", 
    paddingBottom: 12, 
    marginBottom: 14 
  },
  modalTitle: { fontSize: 15, fontWeight: "800", color: "#0f172a" },
  modalSubtitle: { fontSize: 12, color: "#64748b", marginTop: 2, fontWeight: "600" },
  closeModalBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBody: { marginBottom: 16 },
  
  // Custom Card for each Permission section
  sectionCard: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 6,
  },
  sectionCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  checkboxGrid: {
    gap: 8,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 8,
  },
  checkboxRowSingle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 8,
  },
  checkboxLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748b",
  },
  checkboxLabelActive: {
    color: "#0f172a",
    fontWeight: "600",
  },

  modalFooter: { flexDirection: "row", gap: 12, borderTopWidth: 1, borderTopColor: "#f1f5f9", paddingTop: 14 },
  cancelBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", backgroundColor: "#f1f5f9" },
  cancelBtnText: { fontSize: 13, fontWeight: "700", color: "#475569" },
  saveBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", backgroundColor: "#0d9488" },
  saveBtnText: { fontSize: 13, fontWeight: "700", color: "#ffffff" },
});

export default AccessControlScreen;

