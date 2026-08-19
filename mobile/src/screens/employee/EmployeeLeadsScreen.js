import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Linking,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import EmployeeLayout from "../../components/EmployeeLayout";
import { leadsService } from "../../api/leadsService";
import { useAuth } from "../../context/AuthContext";
import { COLORS, FONTS, SHADOWS, ROUNDING } from "../../theme/tokens";

const { width } = Dimensions.get("window");

const STATUS_COLORS = {
  "New": "#06B6D4",
  "Contacted": "#8B5CF6",
  "Qualified": "#3B82F6",
  "Proposal": "#EAB308",
  "Negotiation": "#F97316",
  "Won": "#10B981",
  "Lost": "#EF4444",
};

const DEFAULT_SOURCES = [
  "Walk-in",
  "Website Form",
  "WhatsApp Chat",
  "Client Referral",
  "Facebook Ad",
  "Google Search",
];

export default function EmployeeLeadsScreen({ navigation, route }) {
  const { user, hasPermission } = useAuth();
  const [leads, setLeads] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [sources, setSources] = useState(DEFAULT_SOURCES);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Modal States
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [statusPickerVisible, setStatusPickerVisible] = useState(false);
  const [leadForStatusChange, setLeadForStatusChange] = useState(null);
  const [savingLead, setSavingLead] = useState(false);

  // New Lead Form State
  const [form, setForm] = useState({
    name: "",
    whatsappPhone: "",
    phone: "",
    email: "",
    company: "",
    productService: "",
    source: "Walk-in",
    statusId: "",
    estimatedValue: "",
    notes: "",
  });

  useEffect(() => {
    if (route?.params?.openAddModal) {
      setAddModalVisible(true);
      navigation.setParams({ openAddModal: undefined, timestamp: undefined });
    }
  }, [route?.params?.openAddModal, route?.params?.timestamp]);

  const canCreate = hasPermission("leads", "create") || hasPermission("leads");
  const canEdit = hasPermission("leads", "edit") || hasPermission("leads");
  const canDelete = hasPermission("leads", "delete");

  const loadData = useCallback(async () => {
    try {
      const [leadsData, statusesData, sourcesData] = await Promise.all([
        leadsService.getLeads(),
        leadsService.getStatuses(),
        leadsService.getSources(),
      ]);

      const leadList = Array.isArray(leadsData) ? leadsData : leadsData?.data || [];
      setLeads(leadList);

      if (Array.isArray(statusesData) && statusesData.length > 0) {
        const cleanStatuses = statusesData.filter((s) => s?.name && s.name.trim().toLowerCase() !== "aa" && s.isActive !== false);
        setStatuses(cleanStatuses);
        if (!form.statusId && cleanStatuses[0]) {
          setForm((prev) => ({ ...prev, statusId: cleanStatuses[0].id || cleanStatuses[0]._id }));
        }
      }
      if (Array.isArray(sourcesData) && sourcesData.length > 0) {
        const sourceNames = sourcesData.map((s) => (typeof s === "string" ? s : s.name));
        setSources(sourceNames);
      }
    } catch (err) {
      console.warn("[EmployeeLeads] Load data error:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [form.statusId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      if (route?.params?.openAddModal) {
        setAddModalVisible(true);
        navigation.setParams({ openAddModal: undefined, timestamp: undefined });
      }
    }, [loadData, route?.params?.openAddModal, route?.params?.timestamp])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Stats Calculation
  const stats = useMemo(() => {
    const total = leads.length;
    let won = 0;
    let contacted = 0;
    let inProgress = 0;

    leads.forEach((l) => {
      const sName = (l.status?.name || "").toLowerCase();
      if (sName.includes("won") || sName.includes("closed")) won++;
      else if (sName.includes("contact") || sName.includes("pitch")) contacted++;
      else if (sName.includes("proposal") || sName.includes("qualified") || sName.includes("negotiation") || sName.includes("progress")) inProgress++;
    });

    return { total, contacted, inProgress, won };
  }, [leads]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        l.name?.toLowerCase().includes(q) ||
        l.phone?.includes(q) ||
        l.whatsappPhone?.includes(q) ||
        l.company?.toLowerCase().includes(q) ||
        l.productService?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q);

      const statusKey = l.statusId || l.status?.id || l.status?._id || "";
      const matchesStatus =
        selectedStatus === "all" ||
        statusKey === selectedStatus ||
        l.status?.name?.toLowerCase() === selectedStatus.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [leads, searchQuery, selectedStatus]);

  // Action Handlers
  const handleCall = (phone) => {
    if (!phone) {
      Alert.alert("No Phone", "No phone number available for this lead.");
      return;
    }
    const cleanPhone = phone.replace(/[^0-9+]/g, "");
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert("Error", "Unable to open dialer.");
    });
  };

  const handleWhatsApp = (phone, name = "") => {
    if (!phone) {
      Alert.alert("No Phone", "No WhatsApp number available for this lead.");
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const text = encodeURIComponent(`Hello ${name ? name : ""}, connecting regarding your inquiry.`);
    Linking.openURL(`https://wa.me/${cleanPhone}?text=${text}`).catch(() => {
      Alert.alert("Error", "Unable to open WhatsApp.");
    });
  };

  const handleSaveNewLead = async () => {
    const trimmedName = (form.name || "").trim();
    const phoneInput = (form.whatsappPhone || form.phone || "").trim();

    if (!trimmedName) {
      Alert.alert("Required", "Please enter the lead name.");
      return;
    }
    if (!phoneInput) {
      Alert.alert("Required", "Please enter a phone or WhatsApp number.");
      return;
    }

    setSavingLead(true);
    try {
      const activeStatusId = form.statusId || (statuses[0] ? (statuses[0].id || statuses[0]._id) : undefined);
      const leadPayload = {
        name: trimmedName,
        whatsappPhone: phoneInput,
        phone: phoneInput,
        email: (form.email || "").trim(),
        company: (form.company || "").trim(),
        productService: (form.productService || "").trim(),
        source: form.source || "Walk-in",
        statusId: activeStatusId,
        estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : undefined,
        notes: (form.notes || "").trim(),
        whatsappOptIn: true,
      };

      const created = await leadsService.createLead(leadPayload);
      if (created) {
        setLeads((prev) => [created, ...prev.filter((l) => (l.id || l._id) !== (created.id || created._id))]);
      }
      setAddModalVisible(false);
      setForm({
        name: "",
        whatsappPhone: "",
        phone: "",
        email: "",
        company: "",
        productService: "",
        source: sources[0] || "Walk-in",
        statusId: statuses[0] ? (statuses[0].id || statuses[0]._id) : "",
        estimatedValue: "",
        notes: "",
      });
      loadData();
      Alert.alert("Success", "Lead added successfully!");
    } catch (err) {
      console.warn("[handleSaveNewLead] error:", err.message);
      Alert.alert("Error", err.message || "Failed to create lead.");
    } finally {
      setSavingLead(false);
    }
  };

  const handleQuickStatusChange = async (newStatusId) => {
    if (!leadForStatusChange) return;
    try {
      const leadId = leadForStatusChange.id || leadForStatusChange._id;
      await leadsService.updateLead(leadId, { statusId: newStatusId });
      setStatusPickerVisible(false);
      setLeadForStatusChange(null);
      loadData();
    } catch (err) {
      Alert.alert("Error", "Failed to update status.");
    }
  };

  const handleDeleteLead = (lead) => {
    const leadId = lead.id || lead._id;
    Alert.alert("Delete Lead", `Are you sure you want to delete "${lead.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await leadsService.deleteLead(leadId);
            loadData();
          } catch (_) {
            Alert.alert("Error", "Could not delete lead.");
          }
        },
      },
    ]);
  };

  const getStatusColor = (statusObj) => {
    if (statusObj?.color) return statusObj.color;
    const name = statusObj?.name || "";
    return STATUS_COLORS[name] || "#3B82F6";
  };

  const renderLeadCard = ({ item }) => {
    const statusName = item.status?.name || "New";
    const statusColor = getStatusColor(item.status);
    const phone = item.whatsappPhone || item.phone || "";
    const initials = (item.name || "LD")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        onPress={() => {
          navigation.navigate("LeadDetails", { leadId: item.id || item._id, lead: item });
        }}
      >
        {/* Left Status Strip */}
        <View style={[styles.cardStatusStrip, { backgroundColor: statusColor }]} />

        <View style={styles.cardMain}>
          {/* Header Row */}
          <View style={styles.cardHeader}>
            <View style={[styles.avatarCircle, { backgroundColor: `${statusColor}14`, borderColor: `${statusColor}35` }]}>
              <Text style={[styles.avatarText, { color: statusColor }]}>{initials}</Text>
            </View>

            <View style={styles.cardTitleBox}>
              <Text style={styles.leadName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.companyName} numberOfLines={1}>
                {item.company ? item.company : (item.productService || "Prospect")}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.statusBadge, { backgroundColor: `${statusColor}12`, borderColor: `${statusColor}30` }]}
              onPress={() => {
                setLeadForStatusChange(item);
                setStatusPickerVisible(true);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusName}</Text>
              <Ionicons name="chevron-down" size={11} color={statusColor} style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          </View>

          {/* Info Tags Row */}
          <View style={styles.infoRow}>
            {item.productService ? (
              <View style={styles.tagPill}>
                <Ionicons name="pricetag" size={10} color="#64748B" style={{ marginRight: 3 }} />
                <Text style={styles.tagText} numberOfLines={1}>{item.productService}</Text>
              </View>
            ) : null}
            {item.source ? (
              <View style={styles.tagPill}>
                <Ionicons name="globe-outline" size={10} color="#64748B" style={{ marginRight: 3 }} />
                <Text style={styles.tagText} numberOfLines={1}>{item.source}</Text>
              </View>
            ) : null}
            {item.estimatedValue ? (
              <View style={[styles.tagPill, { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }]}>
                <Ionicons name="cash" size={11} color="#059669" style={{ marginRight: 3 }} />
                <Text style={[styles.tagText, { color: "#059669", fontFamily: FONTS.headerBold }]}>
                  ₹{Number(item.estimatedValue).toLocaleString("en-IN")}
                </Text>
              </View>
            ) : null}
          </View>

          {item.notes ? (
            <View style={styles.notesContainer}>
              <Ionicons name="chatbox-outline" size={11} color="#94A3B8" style={{ marginRight: 4, marginTop: 1 }} />
              <Text style={styles.notesText} numberOfLines={1}>
                {item.notes}
              </Text>
            </View>
          ) : null}

          {/* Action Row */}
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.waBtn]}
              onPress={() => handleWhatsApp(phone, item.name)}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-whatsapp" size={14} color="#ffffff" />
              <Text style={styles.waBtnText}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.callBtn]}
              onPress={() => handleCall(phone)}
              activeOpacity={0.8}
            >
              <Ionicons name="call" size={13} color="#2563EB" />
              <Text style={styles.callBtnText}>Call</Text>
            </TouchableOpacity>

            {canDelete && (
              <TouchableOpacity
                style={styles.deleteIconBtn}
                onPress={() => handleDeleteLead(item)}
                activeOpacity={0.6}
              >
                <Ionicons name="trash-outline" size={14} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <EmployeeLayout
      navigation={navigation}
      title="Lead Management"
      rightActionType="none"
      onAddLeadPress={() => setAddModalVisible(true)}
    >
      <View style={styles.container}>
        {/* Top Summary Bar - Clean Bright KPI Cards */}
        <View style={styles.summaryBar}>
          <TouchableOpacity
            style={[styles.kpiCard, { backgroundColor: "#FFF7ED", borderColor: "#FFEDD5" }, selectedStatus === "all" && styles.kpiCardActiveOrange]}
            onPress={() => setSelectedStatus("all")}
            activeOpacity={0.75}
          >
            <View style={styles.kpiTopRow}>
              <Text style={[styles.kpiLabel, { color: "#C2410C" }]}>Total</Text>
              <View style={[styles.kpiDot, { backgroundColor: "#F97316" }]} />
            </View>
            <Text style={[styles.kpiValue, { color: "#EA580C" }]}>{stats.total}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.kpiCard, { backgroundColor: "#F5F3FF", borderColor: "#DDD6FE" }, selectedStatus === "Contacted" && styles.kpiCardActivePurple]}
            onPress={() => setSelectedStatus("Contacted")}
            activeOpacity={0.75}
          >
            <View style={styles.kpiTopRow}>
              <Text style={[styles.kpiLabel, { color: "#6D28D9" }]}>Contacted</Text>
              <View style={[styles.kpiDot, { backgroundColor: "#8B5CF6" }]} />
            </View>
            <Text style={[styles.kpiValue, { color: "#7C3AED" }]}>{stats.contacted}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.kpiCard, { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }, selectedStatus === "In Progress" && styles.kpiCardActiveAmber]}
            onPress={() => setSelectedStatus("In Progress")}
            activeOpacity={0.75}
          >
            <View style={styles.kpiTopRow}>
              <Text style={[styles.kpiLabel, { color: "#B45309" }]}>In Progress</Text>
              <View style={[styles.kpiDot, { backgroundColor: "#F59E0B" }]} />
            </View>
            <Text style={[styles.kpiValue, { color: "#D97706" }]}>{stats.inProgress}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.kpiCard, { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }, selectedStatus === "Won" && styles.kpiCardActiveEmerald]}
            onPress={() => setSelectedStatus("Won")}
            activeOpacity={0.75}
          >
            <View style={styles.kpiTopRow}>
              <Text style={[styles.kpiLabel, { color: "#047857" }]}>Won</Text>
              <View style={[styles.kpiDot, { backgroundColor: "#10B981" }]} />
            </View>
            <Text style={[styles.kpiValue, { color: "#059669" }]}>{stats.won}</Text>
          </TouchableOpacity>
        </View>

        {/* Search & Add Header */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={16} color="#94A3B8" style={{ marginRight: 6 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, company, phone..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={15} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>

          {canCreate && (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setAddModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color="#ffffff" />
              <Text style={styles.addBtnText}>Add Lead</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Status Filter Tabs */}
        <View style={styles.filterScrollWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabsContent}>
            <TouchableOpacity
              style={[styles.filterPill, selectedStatus === "all" && styles.filterPillActive]}
              onPress={() => setSelectedStatus("all")}
            >
              <Text style={[styles.filterPillText, selectedStatus === "all" && styles.filterPillTextActive]}>
                All ({leads.length})
              </Text>
            </TouchableOpacity>

            {statuses.map((s) => {
              const sId = s.id || s._id;
              const count = leads.filter((l) => (l.statusId === sId || l.status?.id === sId || l.status?._id === sId)).length;
              const isSelected = selectedStatus === sId || selectedStatus === s.name;
              return (
                <TouchableOpacity
                  key={sId}
                  style={[styles.filterPill, isSelected && styles.filterPillActive]}
                  onPress={() => setSelectedStatus(sId)}
                >
                  <View style={[styles.filterDot, { backgroundColor: getStatusColor(s) }]} />
                  <Text style={[styles.filterPillText, isSelected && styles.filterPillTextActive]}>
                    {s.name} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Leads List */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading leads...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredLeads}
            keyExtractor={(item) => item.id || item._id || String(Math.random())}
            renderItem={renderLeadCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            initialNumToRender={8}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={Platform.OS === "android"}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="magnet-outline" size={54} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>No Leads Found</Text>
                <Text style={styles.emptySub}>
                  {searchQuery ? "No leads matching your search criteria." : "No leads in this status pipeline yet."}
                </Text>
                {canCreate && !searchQuery && (
                  <TouchableOpacity
                    style={styles.emptyAddBtn}
                    onPress={() => setAddModalVisible(true)}
                  >
                    <Ionicons name="person-add" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.emptyAddBtnText}>Add First Lead</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
          />
        )}

        {/* ── Add New Lead Modal ── */}
        <Modal visible={addModalVisible} animationType="slide" transparent onRequestClose={() => setAddModalVisible(false)}>
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New Lead</Text>
                <TouchableOpacity onPress={() => setAddModalVisible(false)} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={22} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.inputLabel}>Full Name *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Rahul Sharma"
                  placeholderTextColor="#94A3B8"
                  value={form.name}
                  onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
                />

                <Text style={styles.inputLabel}>WhatsApp / Phone Number *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. 9876543210"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  value={form.whatsappPhone}
                  onChangeText={(v) => setForm((p) => ({ ...p, whatsappPhone: v, phone: v }))}
                />

                <Text style={styles.inputLabel}>Company / Business Name</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Sharma Enterprises"
                  placeholderTextColor="#94A3B8"
                  value={form.company}
                  onChangeText={(v) => setForm((p) => ({ ...p, company: v }))}
                />

                <Text style={styles.inputLabel}>Product / Service Requirement</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. HRMS Software, Website"
                  placeholderTextColor="#94A3B8"
                  value={form.productService}
                  onChangeText={(v) => setForm((p) => ({ ...p, productService: v }))}
                />

                <Text style={styles.inputLabel}>Lead Source</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillSelector} keyboardShouldPersistTaps="handled">
                  {sources.map((src) => (
                    <TouchableOpacity
                      key={src}
                      style={[styles.choicePill, form.source === src && styles.choicePillActive]}
                      onPress={() => setForm((p) => ({ ...p, source: src }))}
                    >
                      <Text style={[styles.choicePillText, form.source === src && styles.choicePillTextActive]}>
                        {src}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.inputLabel}>Status</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillSelector} keyboardShouldPersistTaps="handled">
                  {statuses.map((st) => {
                    const stId = st.id || st._id;
                    const isSelected = form.statusId === stId;
                    return (
                      <TouchableOpacity
                        key={stId}
                        style={[styles.choicePill, isSelected && styles.choicePillActive]}
                        onPress={() => setForm((p) => ({ ...p, statusId: stId }))}
                      >
                        <View style={[styles.filterDot, { backgroundColor: getStatusColor(st) }]} />
                        <Text style={[styles.choicePillText, isSelected && styles.choicePillTextActive]}>
                          {st.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <Text style={styles.inputLabel}>Estimated Deal Value (₹)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. 50000"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={form.estimatedValue}
                  onChangeText={(v) => setForm((p) => ({ ...p, estimatedValue: v }))}
                />

                <Text style={styles.inputLabel}>Notes / Requirement Details</Text>
                <TextInput
                  style={[styles.modalInput, styles.textArea]}
                  placeholder="Add meeting notes or client request..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                  value={form.notes}
                  onChangeText={(v) => setForm((p) => ({ ...p, notes: v }))}
                />

                <TouchableOpacity
                  style={[styles.submitBtn, savingLead && { opacity: 0.7 }]}
                  onPress={handleSaveNewLead}
                  disabled={savingLead}
                  activeOpacity={0.8}
                >
                  {savingLead ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#ffffff" style={{ marginRight: 6 }} />
                      <Text style={styles.submitBtnText}>Save Lead</Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* ── Status Picker Bottom Sheet Modal ── */}
        <Modal
          visible={statusPickerVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setStatusPickerVisible(false)}
        >
          <TouchableOpacity
            style={styles.bottomSheetOverlay}
            activeOpacity={1}
            onPress={() => setStatusPickerVisible(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={styles.statusBottomSheet}
              onPress={(e) => e?.stopPropagation && e.stopPropagation()}
            >
              {/* Drag Handle Bar */}
              <View style={styles.dragHandle} />

              <View style={styles.statusSheetHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statusSheetTitle}>Change Lead Status</Text>
                  {leadForStatusChange && (
                    <Text style={styles.statusSheetSubtitle} numberOfLines={1}>
                      For: {leadForStatusChange.name}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => setStatusPickerVisible(false)}
                  style={styles.modalCloseCircle}
                >
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.statusOptionsList} showsVerticalScrollIndicator={false}>
                {statuses.map((s) => {
                  const sId = s.id || s._id;
                  const color = getStatusColor(s);
                  const currentStatusId =
                    leadForStatusChange?.statusId ||
                    leadForStatusChange?.status?.id ||
                    leadForStatusChange?.status?._id;
                  const isCurrent = currentStatusId === sId;

                  return (
                    <TouchableOpacity
                      key={sId}
                      style={[
                        styles.statusOptionItem,
                        isCurrent && { backgroundColor: `${color}12`, borderColor: color },
                      ]}
                      onPress={() => handleQuickStatusChange(sId)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.statusOptionLeft}>
                        <View style={[styles.statusOptionDot, { backgroundColor: color }]} />
                        <Text style={[styles.statusOptionText, isCurrent && { color: color, fontFamily: FONTS.headerBold }]}>
                          {s.name}
                        </Text>
                      </View>

                      {isCurrent ? (
                        <Ionicons name="checkmark-circle" size={22} color={color} />
                      ) : (
                        <Ionicons name="radio-button-off" size={20} color="#CBD5E1" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* ── Lead Details View Modal ── */}
        <Modal visible={detailsModalVisible} animationType="slide" transparent onRequestClose={() => setDetailsModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Lead Details</Text>
                <TouchableOpacity onPress={() => setDetailsModalVisible(false)} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={22} color="#64748B" />
                </TouchableOpacity>
              </View>

              {selectedLead && (
                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  <View style={styles.detailHero}>
                    <Text style={styles.detailName}>{selectedLead.name}</Text>
                    <Text style={styles.detailCompany}>{selectedLead.company || "No company name"}</Text>
                    <View style={[styles.statusBadge, { alignSelf: "flex-start", marginTop: 8 }]}>
                      <Text style={{ color: getStatusColor(selectedLead.status), fontFamily: FONTS.bodySemiBold }}>
                        {selectedLead.status?.name || "New"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Contact Information</Text>
                    <View style={styles.detailRow}>
                      <Ionicons name="call-outline" size={18} color="#64748B" />
                      <Text style={styles.detailValue}>{selectedLead.whatsappPhone || selectedLead.phone || "N/A"}</Text>
                    </View>
                    {selectedLead.email ? (
                      <View style={styles.detailRow}>
                        <Ionicons name="mail-outline" size={18} color="#64748B" />
                        <Text style={styles.detailValue}>{selectedLead.email}</Text>
                      </View>
                    ) : null}
                  </View>

                  {selectedLead.productService ? (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Product / Requirement</Text>
                      <Text style={styles.detailText}>{selectedLead.productService}</Text>
                    </View>
                  ) : null}

                  {selectedLead.notes ? (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Notes</Text>
                      <Text style={styles.detailText}>{selectedLead.notes}</Text>
                    </View>
                  ) : null}

                  <View style={styles.detailActionsRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.waBtn, { flex: 1, marginRight: 8 }]}
                      onPress={() => handleWhatsApp(selectedLead.whatsappPhone || selectedLead.phone, selectedLead.name)}
                    >
                      <Ionicons name="logo-whatsapp" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                      <Text style={styles.waBtnText}>Chat on WhatsApp</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, styles.callBtn, { flex: 1 }]}
                      onPress={() => handleCall(selectedLead.whatsappPhone || selectedLead.phone)}
                    >
                      <Ionicons name="call-outline" size={18} color="#1E293B" style={{ marginRight: 6 }} />
                      <Text style={styles.callBtnText}>Call Lead</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* ── FLOATING ACTION BUTTON (ADD PROSPECT) ── */}
        {canCreate && (
          <TouchableOpacity
            style={styles.floatingAddBtn}
            activeOpacity={0.85}
            onPress={() => setAddModalVisible(true)}
          >
            <Ionicons name="add" size={30} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    </EmployeeLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  floatingAddBtn: {
    position: "absolute",
    bottom: 22,
    right: 18,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    zIndex: 999,
  },
  summaryBar: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  kpiCard: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 52,
    justifyContent: "space-between",
  },
  kpiCardActiveOrange: {
    borderColor: "#EA580C",
    borderWidth: 1.5,
  },
  kpiCardActivePurple: {
    borderColor: "#7C3AED",
    borderWidth: 1.5,
  },
  kpiCardActiveAmber: {
    borderColor: "#D97706",
    borderWidth: 1.5,
  },
  kpiCardActiveEmerald: {
    borderColor: "#059669",
    borderWidth: 1.5,
  },
  kpiTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  kpiLabel: {
    fontSize: 9.5,
    fontFamily: FONTS.headerBold,
    textTransform: "uppercase",
    letterSpacing: 0.2,
  },
  kpiDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  kpiValue: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    marginTop: 2,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 6,
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: "#0F172A",
    fontFamily: FONTS.bodyRegular,
    paddingVertical: 0,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F97316",
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 8,
    justifyContent: "center",
    ...SHADOWS.primary,
  },
  addBtnText: {
    color: "#ffffff",
    fontFamily: FONTS.headerBold,
    fontSize: 12.5,
    marginLeft: 3,
  },
  filterScrollWrapper: {
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  filterTabsContent: {
    paddingHorizontal: 14,
    gap: 6,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterPillActive: {
    backgroundColor: "#F97316",
    borderColor: "#F97316",
  },
  filterPillText: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: "#475569",
  },
  filterPillTextActive: {
    color: "#FFFFFF",
    fontFamily: FONTS.headerBold,
  },
  filterDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 5,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 8,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    overflow: "hidden",
    ...SHADOWS.subtle,
  },
  cardStatusStrip: {
    width: 4,
  },
  cardMain: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginRight: 8,
  },
  avatarText: {
    fontSize: 11.5,
    fontFamily: FONTS.headerBold,
  },
  cardTitleBox: {
    flex: 1,
    marginRight: 6,
  },
  leadName: {
    fontSize: 14,
    fontFamily: FONTS.headerBold,
    color: "#0F172A",
  },
  companyName: {
    fontSize: 11,
    fontFamily: FONTS.bodyRegular,
    color: "#64748B",
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 3,
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.headerSemiBold,
  },
  infoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 7,
  },
  tagPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tagText: {
    fontSize: 10.5,
    color: "#475569",
    fontFamily: FONTS.bodyMedium,
  },
  notesContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  notesText: {
    fontSize: 11,
    color: "#64748B",
    fontFamily: FONTS.bodyRegular,
    flex: 1,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    gap: 6,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    height: 30,
    flex: 1,
  },
  waBtn: {
    backgroundColor: "#25D366",
  },
  waBtnText: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontFamily: FONTS.headerBold,
    marginLeft: 4,
  },
  callBtn: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  callBtnText: {
    color: "#2563EB",
    fontSize: 11.5,
    fontFamily: FONTS.headerBold,
    marginLeft: 4,
  },
  deleteIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: "#64748B",
    fontFamily: FONTS.bodyMedium,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: FONTS.headerBold,
    color: "#334155",
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    fontFamily: FONTS.bodyRegular,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F97316",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  emptyAddBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: FONTS.headerBold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: FONTS.headerBold,
    color: "#0F172A",
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: FONTS.headerSemiBold,
    color: "#334155",
    marginBottom: 6,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#0F172A",
    fontFamily: FONTS.bodyRegular,
  },
  textArea: {
    height: 70,
    textAlignVertical: "top",
  },
  pillSelector: {
    flexDirection: "row",
    marginBottom: 6,
  },
  choicePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  choicePillActive: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  choicePillText: {
    fontSize: 12,
    color: "#475569",
    fontFamily: FONTS.bodyMedium,
  },
  choicePillTextActive: {
    color: "#FFFFFF",
    fontFamily: FONTS.headerBold,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F97316",
    paddingVertical: 13,
    borderRadius: 10,
    marginTop: 18,
    marginBottom: 20,
    ...SHADOWS.primary,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: FONTS.headerBold,
  },
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  statusBottomSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    width: "100%",
    maxHeight: "75%",
    ...SHADOWS.elevated,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#CBD5E1",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },
  statusSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginBottom: 10,
  },
  statusSheetTitle: {
    fontSize: 17,
    fontFamily: FONTS.headerBold,
    color: "#0F172A",
  },
  statusSheetSubtitle: {
    fontSize: 12,
    fontFamily: FONTS.bodyRegular,
    color: "#64748B",
    marginTop: 2,
  },
  modalCloseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  statusOptionsList: {
    marginTop: 4,
  },
  statusOptionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statusOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusOptionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  statusOptionText: {
    fontSize: 14,
    fontFamily: FONTS.headerSemiBold,
    color: "#1E293B",
  },
  detailHero: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginBottom: 12,
  },
  detailName: {
    fontSize: 18,
    fontFamily: FONTS.headerBold,
    color: "#0F172A",
  },
  detailCompany: {
    fontSize: 13,
    fontFamily: FONTS.bodyRegular,
    color: "#64748B",
    marginTop: 2,
  },
  detailSection: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 11,
    fontFamily: FONTS.headerSemiBold,
    color: "#94A3B8",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 8,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: FONTS.bodyMedium,
    color: "#1E293B",
  },
  detailText: {
    fontSize: 13,
    fontFamily: FONTS.bodyRegular,
    color: "#334155",
    lineHeight: 18,
  },
  detailActionsRow: {
    flexDirection: "row",
    marginTop: 16,
    marginBottom: 20,
  },
});
