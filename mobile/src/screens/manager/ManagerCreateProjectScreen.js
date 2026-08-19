import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ManagerLayout from "../../components/ManagerLayout";
import AppDatePicker from "../../components/AppDatePicker";
import { createManagerProject, getManagerTeam } from "../../api/managerApi";
import { parseDDMMYYYYToISO } from "../../utils/dateFormatter";

const TEAL = "#C2410C";
const BORDER = "#e2e8f0";
const TEXT_MAIN = "#0f172a";
const TEXT_MUTED = "#64748b";

const PRIORITY_OPTIONS = ["low", "medium", "high", "critical"];
const STATUS_OPTIONS = ["planning", "active", "on-hold"];

const ManagerCreateProjectScreen = ({ navigation }) => {
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("planning");
  const [priority, setPriority] = useState("medium");
  const [clientName, setClientName] = useState("");
  const [estimatedWorkingDays, setEstimatedWorkingDays] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Member selection
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [memberModalVisible, setMemberModalVisible] = useState(false);

  // Submit state
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTeamMembers();
  }, []);

  const loadTeamMembers = async () => {
    try {
      setLoadingTeam(true);
      const res = await getManagerTeam();
      const members = res?.data?.teamMembers || [];
      setTeamMembers(members);
    } catch (e) {
      console.error("Failed to load team members:", e);
      setTeamMembers([]);
    } finally {
      setLoadingTeam(false);
    }
  };

  const toggleMember = (memberId) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const filteredMembers = teamMembers.filter((m) => {
    const fullName = `${m.firstName} ${m.lastName}`.toLowerCase();
    const designation = (m.designation || m.designationId?.name || "").toLowerCase();
    return (
      fullName.includes(memberSearchQuery.toLowerCase()) ||
      designation.includes(memberSearchQuery.toLowerCase())
    );
  });

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("Validation Error", "Project name is required.");
      return;
    }

    const startISO = startDate ? parseDDMMYYYYToISO(startDate) : null;
    const endISO = endDate ? parseDDMMYYYYToISO(endDate) : null;

    if (startISO && endISO && new Date(endISO) < new Date(startISO)) {
      Alert.alert("Validation Error", "End date cannot be before start date.");
      return;
    }

    try {
      setSaving(true);
      await createManagerProject({
        name: name.trim(),
        description: description.trim(),
        status,
        priority,
        clientName: clientName.trim(),
        estimatedWorkingDays: estimatedWorkingDays ? parseInt(estimatedWorkingDays) : 0,
        startDate: startISO,
        endDate: endISO,
        members: selectedMemberIds,
      });

      Alert.alert("Success", "Project created successfully.", [
        {
          text: "View Projects",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (e) {
      const msg = e?.response?.data?.message || "Failed to create project.";
      Alert.alert("Error", msg);
    } finally {
      setSaving(false);
    }
  };

  const getPriorityColor = (p) => {
    if (p === "critical") return "#ef4444";
    if (p === "high") return "#f97316";
    if (p === "medium") return "#eab308";
    return "#22c55e";
  };

  return (
    <ManagerLayout navigation={navigation} title="New Project" showBack showBackButton rightActionType="none">
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        
        {/* Project Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="folder-outline" size={16} color={TEXT_MAIN} />
            <Text style={styles.sectionTitle}>General Information</Text>
          </View>
          
          <Text style={styles.label}>Project Name <Text style={styles.req}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Website Redesign"
            placeholderTextColor="#94a3b8"
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Briefly describe the project objectives..."
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={3}
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Client Name</Text>
          <TextInput
            style={styles.input}
            value={clientName}
            onChangeText={setClientName}
            placeholder="Optional client or department name"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View style={styles.divider} />

        {/* Classification */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="pricetag-outline" size={16} color={TEXT_MAIN} />
            <Text style={styles.sectionTitle}>Classification</Text>
          </View>

          <Text style={styles.label}>Status</Text>
          <View style={styles.chipRow}>
            {STATUS_OPTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, status === s && styles.chipActive]}
                onPress={() => setStatus(s)}
              >
                <Text style={[styles.chipText, status === s && styles.chipTextActive]}>
                  {s.charAt(0).toUpperCase() + s.slice(1).replace("-", " ")}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { marginTop: 16 }]}>Priority</Text>
          <View style={styles.chipRow}>
            {PRIORITY_OPTIONS.map((p) => {
              const isActive = priority === p;
              const pColor = getPriorityColor(p);
              return (
                <TouchableOpacity
                  key={p}
                  style={[styles.chip, isActive && { backgroundColor: pColor, borderColor: pColor }]}
                  onPress={() => setPriority(p)}
                >
                  <Text style={[styles.chipText, isActive && { color: "#fff" }]}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Schedule */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar-outline" size={16} color={TEXT_MAIN} />
            <Text style={styles.sectionTitle}>Schedule</Text>
          </View>

          <View style={styles.row}>
            <View style={styles.col}>
              <AppDatePicker label="Start Date" value={startDate} onChangeText={setStartDate} placeholder="DD/MM/YYYY" />
            </View>
            <View style={styles.col}>
              <AppDatePicker label="End Date" value={endDate} onChangeText={setEndDate} placeholder="DD/MM/YYYY" />
            </View>
          </View>

          <Text style={[styles.label, { marginTop: 12 }]}>Estimated Days</Text>
          <TextInput
            style={styles.input}
            value={estimatedWorkingDays}
            onChangeText={(t) => setEstimatedWorkingDays(t.replace(/[^0-9]/g, ""))}
            placeholder="e.g. 14"
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.divider} />

        {/* Team */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderBetween}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="people-outline" size={16} color={TEXT_MAIN} />
              <Text style={styles.sectionTitle}>Team Assignment</Text>
            </View>
            <TouchableOpacity onPress={() => setMemberModalVisible(true)} style={styles.addBtn}>
              <Text style={styles.addBtnText}>+ Assign</Text>
            </TouchableOpacity>
          </View>

          {selectedMemberIds.length === 0 ? (
            <Text style={styles.mutedText}>No team members assigned yet. You will automatically be added as the Project Manager.</Text>
          ) : (
            <View style={styles.tagContainer}>
              {teamMembers.filter(m => selectedMemberIds.includes(m._id)).map(m => (
                <View key={m._id} style={styles.tag}>
                  <Text style={styles.tagText}>{m.firstName} {m.lastName}</Text>
                  <TouchableOpacity onPress={() => toggleMember(m._id)} hitSlop={{top:10,right:10,bottom:10,left:10}}>
                    <Ionicons name="close" size={14} color={TEXT_MUTED} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Submit */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Create Project</Text>}
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Member Selection Modal */}
      <Modal visible={memberModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setMemberModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Assign Members</Text>
            <TouchableOpacity onPress={() => setMemberModalVisible(false)}>
              <Text style={styles.modalDone}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalSearchContainer}>
            <Ionicons name="search" size={16} color={TEXT_MUTED} />
            <TextInput
              style={styles.modalSearch}
              placeholder="Search by name or role..."
              value={memberSearchQuery}
              onChangeText={setMemberSearchQuery}
            />
          </View>

          {loadingTeam ? (
            <ActivityIndicator size="small" color={TEAL} style={{ marginTop: 40 }} />
          ) : (
            <ScrollView style={styles.modalList}>
              {filteredMembers.map(member => {
                const isSelected = selectedMemberIds.includes(member._id);
                return (
                  <TouchableOpacity key={member._id} style={styles.modalRow} onPress={() => toggleMember(member._id)}>
                    <View style={styles.modalRowInfo}>
                      <Text style={styles.modalRowName}>{member.firstName} {member.lastName}</Text>
                      <Text style={styles.modalRowRole}>{member.designation || member.designationId?.name || "Team Member"}</Text>
                    </View>
                    <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                      {isSelected && <Ionicons name="checkmark" size={12} color="#fff" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      </Modal>

    </ManagerLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  content: { paddingBottom: 40 },
  section: { paddingHorizontal: 16, paddingVertical: 20 },
  divider: { height: 1, backgroundColor: BORDER },
  
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16 },
  sectionHeaderBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: TEXT_MAIN },
  
  label: { fontSize: 12, fontWeight: "600", color: TEXT_MAIN, marginBottom: 6 },
  req: { color: "#ef4444" },
  input: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: TEXT_MAIN,
    backgroundColor: "#fafafa"
  },
  textArea: {
    minHeight: 64,
  },
  
  row: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#ffffff",
  },
  chipActive: {
    backgroundColor: TEAL,
    borderColor: TEAL,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: TEXT_MUTED,
  },
  chipTextActive: {
    color: "#ffffff",
  },
  
  addBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, backgroundColor: TEAL + "15" },
  addBtnText: { fontSize: 12, fontWeight: "600", color: TEAL },
  mutedText: { fontSize: 12, color: TEXT_MUTED, lineHeight: 18 },
  
  tagContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6
  },
  tagText: { fontSize: 12, fontWeight: "500", color: TEXT_MAIN },
  
  footer: { paddingHorizontal: 16, paddingTop: 20 },
  submitBtn: {
    backgroundColor: TEAL,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  submitBtnText: { fontSize: 14, fontWeight: "600", color: "#ffffff" },
  
  // Modal
  modalContainer: { flex: 1, backgroundColor: "#ffffff" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: BORDER,
  },
  modalTitle: { fontSize: 16, fontWeight: "700", color: TEXT_MAIN },
  modalDone: { fontSize: 14, fontWeight: "600", color: TEAL },
  modalSearchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 6,
    height: 36,
    gap: 8,
  },
  modalSearch: { flex: 1, fontSize: 13, color: TEXT_MAIN },
  modalList: { flex: 1 },
  modalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: "#f8fafc",
  },
  modalRowInfo: { flex: 1 },
  modalRowName: { fontSize: 14, fontWeight: "500", color: TEXT_MAIN },
  modalRowRole: { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: TEAL,
    borderColor: TEAL,
  }
});

export default ManagerCreateProjectScreen;
