import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Modal,
  Alert,
  ScrollView,
  RefreshControl,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import CompanyAdminLayout from "../../components/CompanyAdminLayout";
import leadsService from "../../api/leadsService";

const THEME = {
  primary: "#F97316",
  primaryDark: "#EA580C",
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

const AVATAR_COLORS = ["#1E293B", "#3B82F6", "#10B981", "#8B5CF6", "#F97316", "#06B6D4"];

export default function LeadsListScreen({ navigation, route }) {
  const [leads, setLeads] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState(route.params?.initialStatus || "all");
  const [selectedSource, setSelectedSource] = useState("all");
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Bulk Actions
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [bulkStatusModal, setBulkStatusModal] = useState(false);
  const [bulkAssignModal, setBulkAssignModal] = useState(false);
  const [employees, setEmployees] = useState([]);

  // Add Lead Modal State
  const [modalVisible, setModalVisible] = useState(route.params?.openAddModal || false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    whatsappPhone: "",
    email: "",
    company: "",
    source: "Direct / Walk-in",
    statusId: "",
    estimatedValue: "",
    assignedTo: "",
    notes: "",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = { limit: 100 };
      if (search) params.search = search;
      if (selectedStatus !== "all") params.statusId = selectedStatus;
      if (selectedSource !== "all") params.source = selectedSource;

      const [leadsRes, statusesRes, sourcesRes] = await Promise.all([
        leadsService.getLeads(params),
        leadsService.getStatuses(),
        leadsService.getSources(),
      ]);

      const data = Array.isArray(leadsRes?.data)
        ? leadsRes.data
        : Array.isArray(leadsRes)
        ? leadsRes
        : [];
      setLeads(data);

      const stList = Array.isArray(statusesRes) ? statusesRes : [];
      setStatuses(stList);
      if (stList.length > 0 && !form.statusId) {
        const def = stList.find((s) => s.isDefault) || stList[0];
        setForm((prev) => ({ ...prev, statusId: def.id || def._id }));
      }

      setSources(Array.isArray(sourcesRes) ? sourcesRes : []);

      // Fetch employees for assignment
      try {
        const assignable = await leadsService.getAssignableUsers();
        setEmployees(Array.isArray(assignable) ? assignable : []);
      } catch (_) {}
    } catch (err) {
      console.warn("[LeadsList] Fetch note:", err?.message || err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedStatus, selectedSource]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [selectedStatus, selectedSource, search]);

  const handleSearchSubmit = () => {
    fetchData();
  };

  const handleClearSearch = () => {
    setSearch("");
    fetchData();
  };

  // ── Create Lead ─────────────────────────────────────────────
  const handleCreateLead = async () => {
    if (!form.name.trim()) return Alert.alert("Required", "Lead full name is required");
    if (!form.whatsappPhone.trim()) return Alert.alert("Required", "WhatsApp phone number is required");

    try {
      setSubmitting(true);
      await leadsService.createLead(form);
      setModalVisible(false);
      setForm({
        name: "",
        whatsappPhone: "",
        email: "",
        company: "",
        source: "Direct / Walk-in",
        statusId: statuses[0]?.id || statuses[0]?._id || "",
        estimatedValue: "",
        assignedTo: "",
        notes: "",
      });
      fetchData();
      Alert.alert("Success", "New lead registered in CRM!");
    } catch (err) {
      Alert.alert("Error", "Failed to create lead.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Bulk Actions ────────────────────────────────────────────
  const toggleSelectLead = (id) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkAssign = async (employeeId, employeeName) => {
    try {
      setSubmitting(true);
      await leadsService.bulkAssign(selectedLeadIds, employeeId, { name: employeeName });
      setBulkAssignModal(false);
      setBulkMode(false);
      setSelectedLeadIds([]);
      fetchData();
      Alert.alert("Success", `Assigned ${selectedLeadIds.length} lead(s) to ${employeeName || "Employee"}!`);
    } catch (err) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to bulk assign leads");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkStatusUpdate = async (newStatusId) => {
    try {
      setSubmitting(true);
      await leadsService.bulkStatus(selectedLeadIds, newStatusId);
      setBulkStatusModal(false);
      setBulkMode(false);
      setSelectedLeadIds([]);
      fetchData();
      Alert.alert("Updated", `Updated status for ${selectedLeadIds.length} leads.`);
    } catch (err) {
      Alert.alert("Error", "Bulk update failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkDelete = () => {
    Alert.alert("Delete Leads", `Delete ${selectedLeadIds.length} selected leads?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await leadsService.bulkDelete(selectedLeadIds);
            setBulkMode(false);
            setSelectedLeadIds([]);
            fetchData();
          } catch (err) {
            Alert.alert("Error", "Failed to delete leads.");
          }
        },
      },
    ]);
  };

  // ── Direct Communications ────────────────────────────────────
  const handleWhatsApp = (phone, name) => {
    if (!phone) return;
    let cleanPhone = phone.replace(/[^0-9]/g, "");
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;
    const msg = `Hello ${name || ""}, thank you for connecting with OneClick HRMS!`;
    Linking.openURL(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`).catch(() => {});
  };

  const handleCall = (phone) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  };

  // ── Single Fast & Compact Card Layout ────────────────────────
  const renderLeadCard = ({ item, index }) => {
    const isSelected = selectedLeadIds.includes(item.id || item._id);
    const statusColor = item.status?.color || THEME.primary;
    const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];

    return (
      <TouchableOpacity
        style={[styles.leadCard, isSelected && styles.leadCardSelected]}
        activeOpacity={0.88}
        onPress={() => {
          if (bulkMode) {
            toggleSelectLead(item.id || item._id);
          } else {
            navigation.navigate("LeadDetails", { leadId: item.id || item._id });
          }
        }}
        onLongPress={() => {
          setBulkMode(true);
          toggleSelectLead(item.id || item._id);
        }}
      >
        {/* Left Status Strip */}
        <View style={[styles.cardColorStrip, { backgroundColor: statusColor }]} />

        <View style={styles.cardContent}>
          {/* Top Line: Avatar, Name, Company, Stage Badge, Deal Value */}
          <View style={styles.cardHeaderRow}>
            <View style={styles.contactRow}>
              {bulkMode ? (
                <View style={[styles.checkBox, isSelected && styles.checkBoxChecked]}>
                  {isSelected && <Ionicons name="checkmark" size={12} color="#FFF" />}
                </View>
              ) : (
                <View style={[styles.avatarCircle, { backgroundColor: avatarColor }]}>
                  <Text style={styles.avatarText}>
                    {(item.name || "L").charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.leadNameText} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.leadMetaText} numberOfLines={1}>
                  {item.company ? `${item.company} • ` : ""}{item.source || "Direct"}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                  <Ionicons name="person-outline" size={11} color="#6366F1" />
                  <Text style={{ fontSize: 10.5, color: '#4F46E5', fontWeight: '700', marginLeft: 3 }}>
                    {item.assignedTo?.name || "Unassigned"}
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ alignItems: "flex-end", gap: 3 }}>
              <View style={[styles.statusBadge, { backgroundColor: statusColor + "15", borderColor: statusColor }]}>
                <View style={[styles.miniDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                  {item.status?.name || "New"}
                </Text>
              </View>

              {item.estimatedValue ? (
                <Text style={styles.valueText}>
                  ₹{Number(item.estimatedValue).toLocaleString()}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Bottom Line: Contact Number & Direct Quick Actions */}
          <View style={styles.cardFooterRow}>
            {item.whatsappPhone ? (
              <View style={styles.phonePill}>
                <Ionicons name="call-outline" size={11} color={THEME.textSecondary} />
                <Text style={styles.phonePillText}>{item.whatsappPhone}</Text>
              </View>
            ) : (
              <Text style={styles.dateCreatedText}>
                {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}
              </Text>
            )}

            <View style={styles.quickActionsGroup}>
              {item.whatsappPhone ? (
                <TouchableOpacity
                  style={[styles.actionIconBtn, { backgroundColor: "#DCFCE7" }]}
                  onPress={() => handleWhatsApp(item.whatsappPhone, item.name)}
                >
                  <Ionicons name="logo-whatsapp" size={15} color="#16A34A" />
                </TouchableOpacity>
              ) : null}

              {item.phone || item.whatsappPhone ? (
                <TouchableOpacity
                  style={[styles.actionIconBtn, { backgroundColor: "#DBEAFE" }]}
                  onPress={() => handleCall(item.phone || item.whatsappPhone)}
                >
                  <Ionicons name="call" size={13} color="#2563EB" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <CompanyAdminLayout
      navigation={navigation}
      activeTab="Leads"
      headerTitle="Lead CRM Directory"
      showSearch={false}
      headerRightElement={
        <TouchableOpacity
          style={styles.headerAddBtn}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add-circle" size={26} color={THEME.primary} />
        </TouchableOpacity>
      }
    >
      <View style={styles.container}>
        {/* ── 1. Fast Search & Filter Bar ── */}
        <View style={styles.searchHeaderContainer}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color={THEME.textMuted} style={{ marginLeft: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, phone, company..."
              placeholderTextColor={THEME.textMuted}
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
            />
            {search ? (
              <TouchableOpacity onPress={handleClearSearch} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={16} color={THEME.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.filterButton, (selectedStatus !== "all" || selectedSource !== "all") && styles.filterButtonActive]}
            onPress={() => setFilterModalVisible(true)}
          >
            <Ionicons
              name="filter"
              size={16}
              color={selectedStatus !== "all" || selectedSource !== "all" ? "#FFF" : THEME.textPrimary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.newLeadPillBtn}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add" size={16} color="#FFF" />
            <Text style={styles.newLeadPillText}>New Lead</Text>
          </TouchableOpacity>
        </View>

        {/* ── 2. Horizontal Status Filter Carousel ── */}
        <View style={styles.filterStripContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statusFiltersScroll}
          >
            <TouchableOpacity
              style={[styles.statusChip, selectedStatus === "all" && styles.statusChipActive]}
              onPress={() => setSelectedStatus("all")}
            >
              <Text style={[styles.statusChipText, selectedStatus === "all" && styles.statusChipTextActive]}>
                All ({leads.length})
              </Text>
            </TouchableOpacity>

            {statuses.map((st) => {
              const count = leads.filter((l) => (l.statusId === st.id || l.statusId === st._id || l.status?.id === st.id || l.status?._id === st._id)).length;
              const isActive = selectedStatus === (st.id || st._id);
              return (
                <TouchableOpacity
                  key={st.id || st._id}
                  style={[styles.statusChip, isActive && styles.statusChipActive]}
                  onPress={() => setSelectedStatus(st.id || st._id)}
                >
                  <View style={[styles.pillDot, { backgroundColor: st.color || THEME.primary }]} />
                  <Text style={[styles.statusChipText, isActive && styles.statusChipTextActive]}>
                    {st.name} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── 3. Bulk Action Bar ── */}
        {bulkMode && (
          <View style={styles.bulkRow}>
            <Text style={styles.bulkCounterText}>{selectedLeadIds.length} Selected</Text>
            <View style={styles.bulkActionGroup}>
              <TouchableOpacity
                style={[styles.bulkStageBtn, { backgroundColor: THEME.primary }]}
                onPress={() => setBulkAssignModal(true)}
                disabled={selectedLeadIds.length === 0}
              >
                <Ionicons name="person-add" size={13} color="#FFF" style={{ marginRight: 3 }} />
                <Text style={[styles.bulkStageBtnText, { color: '#FFF' }]}>Assign</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.bulkStageBtn}
                onPress={() => setBulkStatusModal(true)}
                disabled={selectedLeadIds.length === 0}
              >
                <Text style={styles.bulkStageBtnText}>Stage</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.bulkDeleteBtn}
                onPress={handleBulkDelete}
                disabled={selectedLeadIds.length === 0}
              >
                <Ionicons name="trash" size={16} color={THEME.rose} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setBulkMode(false); setSelectedLeadIds([]); }}>
                <Ionicons name="close" size={18} color={THEME.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── 4. Fast & Unified Leads List ── */}
        {loading && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={THEME.primary} />
          </View>
        ) : (
          <FlatList
            data={leads}
            keyExtractor={(item, idx) => item.id || item._id || String(idx)}
            renderItem={renderLeadCard}
            contentContainerStyle={styles.leadsListPadding}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.primary]} />}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons name="search-outline" size={38} color={THEME.textMuted} />
                <Text style={styles.emptyText}>No matching leads found.</Text>
              </View>
            }
          />
        )}

        {/* ── MODAL: ADD LEAD ── */}
        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeaderRow}>
                <View>
                  <Text style={styles.modalHeading}>Register New Prospect</Text>
                  <Text style={styles.modalSubheading}>Add client inquiry to CRM</Text>
                </View>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={22} color={THEME.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 25 }}>
                <Text style={styles.fieldLabel}>Contact Name *</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g. Anand Deshmukh"
                  value={form.name}
                  onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
                />

                <Text style={styles.fieldLabel}>WhatsApp Phone *</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g. +91 9876543210"
                  keyboardType="phone-pad"
                  value={form.whatsappPhone}
                  onChangeText={(v) => setForm((p) => ({ ...p, whatsappPhone: v }))}
                />

                <Text style={styles.fieldLabel}>Email Address</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g. anand@company.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={form.email}
                  onChangeText={(v) => setForm((p) => ({ ...p, email: v }))}
                />

                <Text style={styles.fieldLabel}>Company Name</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g. TechCorp Solutions"
                  value={form.company}
                  onChangeText={(v) => setForm((p) => ({ ...p, company: v }))}
                />

                <Text style={styles.fieldLabel}>Assign To Employee / Sales Rep</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                  <TouchableOpacity
                    style={[styles.choiceChip, !form.assignedTo && styles.choiceChipActive]}
                    onPress={() => setForm((p) => ({ ...p, assignedTo: "" }))}
                  >
                    <Text style={[styles.choiceChipText, !form.assignedTo && styles.choiceChipTextActive]}>
                      Unassigned
                    </Text>
                  </TouchableOpacity>
                  {employees.map((emp) => {
                    const empId = emp.id || emp._id;
                    const isSelected = form.assignedTo === empId;
                    return (
                      <TouchableOpacity
                        key={empId}
                        style={[styles.choiceChip, isSelected && styles.choiceChipActive]}
                        onPress={() => setForm((p) => ({ ...p, assignedTo: empId }))}
                      >
                        <Ionicons name="person" size={12} color={isSelected ? "#FFF" : THEME.primary} style={{ marginRight: 4 }} />
                        <Text style={[styles.choiceChipText, isSelected && styles.choiceChipTextActive]}>
                          {emp.label || `${emp.name} (${emp.department || emp.role || 'Staff'})`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <Text style={styles.fieldLabel}>Initial Pipeline Stage</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                  {statuses.map((st) => (
                    <TouchableOpacity
                      key={st.id || st._id}
                      style={[styles.choiceChip, form.statusId === (st.id || st._id) && styles.choiceChipActive]}
                      onPress={() => setForm((p) => ({ ...p, statusId: st.id || st._id }))}
                    >
                      <View style={[styles.pillDot, { backgroundColor: st.color || THEME.primary }]} />
                      <Text style={[styles.choiceChipText, form.statusId === (st.id || st._id) && styles.choiceChipTextActive]}>
                        {st.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.fieldLabel}>Estimated Deal Value (₹)</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g. 150000"
                  keyboardType="numeric"
                  value={form.estimatedValue}
                  onChangeText={(v) => setForm((p) => ({ ...p, estimatedValue: v }))}
                />

                <TouchableOpacity
                  style={styles.primarySubmitBtn}
                  onPress={handleCreateLead}
                  disabled={submitting}
                >
                  {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primarySubmitBtnText}>Create Lead</Text>}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ── MODAL: BULK ASSIGN TO EMPLOYEE ── */}
        <Modal visible={bulkAssignModal} animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeaderRow}>
                <View>
                  <Text style={styles.modalHeading}>Assign {selectedLeadIds.length} Lead(s)</Text>
                  <Text style={styles.modalSubheading}>Select team member to assign</Text>
                </View>
                <TouchableOpacity onPress={() => setBulkAssignModal(false)}>
                  <Ionicons name="close" size={22} color={THEME.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 340, marginTop: 10 }}>
                <TouchableOpacity
                  style={[styles.stageChoiceRow, { backgroundColor: "#F3F4F6", borderColor: "#E5E7EB", borderWidth: 1 }]}
                  onPress={() => handleBulkAssign(null, "Unassigned")}
                >
                  <Ionicons name="person-remove-outline" size={18} color="#6B7280" />
                  <Text style={[styles.stageChoiceText, { color: "#374151" }]}>-- Leave Unassigned --</Text>
                </TouchableOpacity>

                {employees.map((emp) => (
                  <TouchableOpacity
                    key={emp.id || emp._id}
                    style={styles.stageChoiceRow}
                    onPress={() => handleBulkAssign(emp.id || emp._id, emp.name)}
                  >
                    <Ionicons name="person-circle" size={22} color={THEME.primary} />
                    <View style={{ marginLeft: 8 }}>
                      <Text style={styles.stageChoiceText}>{emp.name}</Text>
                      <Text style={{ fontSize: 10, color: THEME.textMuted }}>
                        {emp.department ? `${emp.department} • ${emp.role || 'Employee'}` : (emp.role || "Employee")}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ── MODAL: BULK STAGE UPDATE ── */}
        <Modal visible={bulkStatusModal} animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalHeading}>Move to Stage</Text>
                <TouchableOpacity onPress={() => setBulkStatusModal(false)}>
                  <Ionicons name="close" size={22} color={THEME.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={{ gap: 8, marginTop: 10 }}>
                {statuses.map((st) => (
                  <TouchableOpacity
                    key={st.id || st._id}
                    style={styles.stageChoiceRow}
                    onPress={() => handleBulkStatusUpdate(st.id || st._id)}
                  >
                    <View style={[styles.stageSquare, { backgroundColor: st.color || THEME.primary }]} />
                    <Text style={styles.stageChoiceText}>{st.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Modal>

        {/* ── MODAL: FILTER SHEET ── */}
        <Modal visible={filterModalVisible} animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalHeading}>Filter Leads</Text>
                <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                  <Ionicons name="close" size={22} color={THEME.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>Filter By Source Channel</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                <TouchableOpacity
                  style={[styles.choiceChip, selectedSource === "all" && styles.choiceChipActive]}
                  onPress={() => setSelectedSource("all")}
                >
                  <Text style={[styles.choiceChipText, selectedSource === "all" && styles.choiceChipTextActive]}>All Sources</Text>
                </TouchableOpacity>
                {sources.map((s, idx) => {
                  const sName = s.name || s;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.choiceChip, selectedSource === sName && styles.choiceChipActive]}
                      onPress={() => setSelectedSource(sName)}
                    >
                      <Text style={[styles.choiceChipText, selectedSource === sName && styles.choiceChipTextActive]}>{sName}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TouchableOpacity
                style={styles.primarySubmitBtn}
                onPress={() => setFilterModalVisible(false)}
              >
                <Text style={styles.primarySubmitBtnText}>Apply Filter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        {/* ── FLOATING ACTION BUTTON (ADD PROSPECT) ── */}
        {!bulkMode && (
          <TouchableOpacity
            style={styles.floatingAddBtn}
            activeOpacity={0.85}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add" size={30} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    </CompanyAdminLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  floatingAddBtn: {
    position: "absolute",
    bottom: 22,
    right: 18,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    zIndex: 999,
  },
  headerAddBtn: {
    padding: 4,
    marginRight: 4,
  },
  searchHeaderContainer: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    gap: 8,
    alignItems: "center",
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.bg,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    height: 36,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 6,
    fontSize: 12.5,
    color: THEME.textPrimary,
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: THEME.bg,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  filterButtonActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  newLeadPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: THEME.primary,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  newLeadPillText: {
    color: "#FFF",
    fontSize: 11.5,
    fontWeight: "800",
  },
  filterStripContainer: {
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  statusFiltersScroll: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: THEME.bg,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  statusChipActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  statusChipText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: THEME.textSecondary,
  },
  statusChipTextActive: {
    color: "#FFF",
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  bulkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#FFEDD5",
  },
  bulkCounterText: {
    fontSize: 12,
    fontWeight: "800",
    color: THEME.primary,
  },
  bulkActionGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bulkStageBtn: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bulkStageBtnText: {
    color: "#FFF",
    fontSize: 10.5,
    fontWeight: "800",
  },
  bulkDeleteBtn: {
    padding: 4,
  },
  leadsListPadding: {
    padding: 10,
    paddingBottom: 30,
    gap: 8,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  // Single Fast Compact Card
  leadCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1.5,
  },
  leadCardSelected: {
    borderColor: THEME.primary,
    backgroundColor: "#FFF7ED",
  },
  cardColorStrip: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 6,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 12,
  },
  checkBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: THEME.textMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  checkBoxChecked: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  leadNameText: {
    fontSize: 13,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  leadMetaText: {
    fontSize: 10.5,
    color: THEME.textMuted,
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  miniDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: "800",
  },
  valueText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#B45309",
  },
  cardFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: THEME.borderLight,
  },
  phonePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  phonePillText: {
    fontSize: 10.5,
    color: THEME.textSecondary,
    fontWeight: "600",
  },
  dateCreatedText: {
    fontSize: 9.5,
    color: THEME.textMuted,
  },
  actionGroup: {
    flexDirection: "row",
    gap: 6,
  },
  chatActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#10B981",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  chatActionBtnText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "800",
  },
  callIconBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: THEME.blueBg,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 30,
  },
  emptyText: {
    fontSize: 12,
    color: THEME.textMuted,
    marginTop: 6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
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
  },
  modalHeading: {
    fontSize: 16,
    fontWeight: "900",
    color: THEME.textPrimary,
  },
  modalSubheading: {
    fontSize: 11,
    color: THEME.textMuted,
    marginTop: 1,
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
  choiceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: THEME.bg,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 6,
  },
  choiceChipActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  choiceChipText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: THEME.textSecondary,
  },
  choiceChipTextActive: {
    color: "#FFF",
  },
  primarySubmitBtn: {
    backgroundColor: THEME.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  primarySubmitBtnText: {
    color: "#FFF",
    fontSize: 13.5,
    fontWeight: "800",
  },
  stageChoiceRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: THEME.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  stageSquare: {
    width: 12,
    height: 12,
    borderRadius: 3,
    marginRight: 8,
  },
  stageChoiceText: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
});
