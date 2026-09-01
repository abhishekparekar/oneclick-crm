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
import leadsService from "../../api/leadsService";
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
  const [selectedSource, setSelectedSource] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState("all");
  const [selectedTimeframe, setSelectedTimeframe] = useState("all");

  // Modal States
  const [addModalVisible, setAddModalVisible] = useState(route?.params?.openAddModal || false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [statusPickerVisible, setStatusPickerVisible] = useState(false);
  const [leadForStatusChange, setLeadForStatusChange] = useState(null);
  const [savingLead, setSavingLead] = useState(false);

  // New Lead Form State
  const [products, setProducts] = useState([]);
  const [isCustomProduct, setIsCustomProduct] = useState(false);
  const [customProductText, setCustomProductText] = useState("");
  const [form, setForm] = useState({
    name: "",
    whatsappPhone: "",
    phone: "",
    email: "",
    company: "",
    productService: "",
    source: "Direct / Walk-in",
    statusId: "",
    estimatedValue: "",
    nextFollowUpDate: "",
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
      const [leadsData, statusesData, sourcesData, prodsData] = await Promise.all([
        leadsService.getLeads(),
        leadsService.getStatuses(),
        leadsService.getSources(),
        leadsService.getProducts(),
      ]);

      const leadList = Array.isArray(leadsData)
        ? leadsData
        : Array.isArray(leadsData?.data)
        ? leadsData.data
        : Array.isArray(leadsData?.leads)
        ? leadsData.leads
        : [];
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
      if (Array.isArray(prodsData) && prodsData.length > 0) {
        setProducts(prodsData);
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
      if (!matchesSearch) return false;

      const statusKey = l.statusId || l.status?.id || l.status?._id || "";
      const matchesStatus =
        selectedStatus === "all" ||
        statusKey === selectedStatus ||
        l.status?.name?.toLowerCase() === selectedStatus.toLowerCase();
      if (!matchesStatus) return false;

      if (selectedSource !== "all") {
        const src = (l.source || "").toLowerCase();
        if (!src.includes(selectedSource.toLowerCase())) return false;
      }

      if (selectedProduct !== "all") {
        const prod = (l.productService || "").toLowerCase();
        if (!prod.includes(selectedProduct.toLowerCase())) return false;
      }

      if (selectedTimeframe !== "all") {
        if (!l.createdAt) return false;
        const created = new Date(l.createdAt);
        if (isNaN(created.getTime())) return false;
        const now = new Date();
        if (selectedTimeframe === "today") {
          const s = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          if (created < s) return false;
        } else if (selectedTimeframe === "yesterday") {
          const s = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
          const e = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          if (created < s || created >= e) return false;
        } else if (selectedTimeframe === "this_week") {
          const s = new Date(now);
          s.setDate(now.getDate() - now.getDay());
          s.setHours(0, 0, 0, 0);
          if (created < s) return false;
        } else if (selectedTimeframe === "this_month") {
          const s = new Date(now.getFullYear(), now.getMonth(), 1);
          if (created < s) return false;
        }
      }

      return true;
    });
  }, [leads, searchQuery, selectedStatus, selectedSource, selectedProduct, selectedTimeframe]);

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
        productService: isCustomProduct ? customProductText : (form.productService || "").trim(),
        source: form.source || "Direct / Walk-in",
        statusId: activeStatusId,
        estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : undefined,
        nextFollowUpDate: form.nextFollowUpDate,
        notes: (form.notes || "").trim(),
        whatsappOptIn: true,
      };

      const created = await leadsService.createLead(leadPayload);
      if (created) {
        setLeads((prev) => [created, ...prev.filter((l) => (l.id || l._id) !== (created.id || created._id))]);
      }
      setAddModalVisible(false);
      setIsCustomProduct(false);
      setCustomProductText("");
      setForm({
        name: "",
        whatsappPhone: "",
        phone: "",
        email: "",
        company: "",
        productService: "",
        source: sources[0] || "Direct / Walk-in",
        statusId: statuses[0] ? (statuses[0].id || statuses[0]._id) : "",
        estimatedValue: "",
        nextFollowUpDate: "",
        notes: "",
      });
      loadData();
      Alert.alert("Success", "Lead registered in CRM successfully!");
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
      hideFab={true}
    >
      <View style={styles.container}>
        {/* Top Summary Bar - Clean Bright KPI Cards */}
        <View style={styles.summaryBar}>
          <TouchableOpacity
            style={[styles.kpiCard, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }, selectedStatus === "all" && styles.kpiCardActiveBlue]}
            onPress={() => setSelectedStatus("all")}
            activeOpacity={0.75}
          >
            <View style={styles.kpiTopRow}>
              <Text style={[styles.kpiLabel, { color: "#1D4ED8" }]}>Total</Text>
              <View style={[styles.kpiDot, { backgroundColor: "#1268D9" }]} />
            </View>
            <Text style={[styles.kpiValue, { color: "#1268D9" }]}>{stats.total}</Text>
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

        {/* Timeframe Quick Filter Tabs */}
        <View style={[styles.filterScrollWrapper, { paddingTop: 4, paddingBottom: 2 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabsContent}>
            {[
              { id: "all", label: "All Time" },
              { id: "today", label: "Today" },
              { id: "this_week", label: "This Week" },
              { id: "this_month", label: "This Month" },
            ].map((tf) => {
              const isSel = selectedTimeframe === tf.id;
              return (
                <TouchableOpacity
                  key={tf.id}
                  style={[
                    styles.filterPill,
                    isSel && { backgroundColor: "#1268D9", borderColor: "#1268D9" }
                  ]}
                  onPress={() => setSelectedTimeframe(tf.id)}
                >
                  <Text style={[styles.filterPillText, isSel && { color: "#FFFFFF", fontWeight: "700" }]}>
                    {tf.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
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

        {/* ── Add New Lead Modal (Exact Match to Web Design) ── */}
        <Modal visible={addModalVisible} animationType="slide" transparent onRequestClose={() => setAddModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              {/* Dark Top Banner */}
              <View style={styles.modalHeaderBanner}>
                <View style={styles.modalIconBadge}>
                  <Ionicons name="magnet" size={20} color="#FF5E00" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.modalHeadingText}>NEW PROSPECTIVE CLIENT / LEAD</Text>
                  <Text style={styles.modalSubheadingText}>Record client inquiry, assigned product and next follow-up date</Text>
                </View>
                <TouchableOpacity onPress={() => setAddModalVisible(false)} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={16} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              {/* Scrollable Form Body */}
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* ── Section 1: Client & Contact Information ── */}
                <View style={styles.formSectionBox}>
                  <View style={styles.sectionHeaderRow}>
                    <Ionicons name="person-outline" size={13} color="#1268D9" />
                    <Text style={styles.sectionHeaderText}>CLIENT & CONTACT INFORMATION</Text>
                  </View>

                  <Text style={styles.fieldLabel}>
                    CLIENT FULL NAME <Text style={{ color: "#EF4444" }}>*</Text>
                  </Text>
                  <View style={styles.inputWithIcon}>
                    <Ionicons name="person-outline" size={15} color="#94A3B8" style={styles.inputIconPrefix} />
                    <TextInput
                      style={styles.fieldInnerInput}
                      placeholder="e.g. Rameshwar Shinde"
                      placeholderTextColor="#94A3B8"
                      value={form.name}
                      onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
                    />
                  </View>

                  <Text style={styles.fieldLabel}>
                    PHONE / WHATSAPP <Text style={{ color: "#EF4444" }}>*</Text>
                  </Text>
                  <View style={styles.inputWithIcon}>
                    <Ionicons name="call-outline" size={15} color="#94A3B8" style={styles.inputIconPrefix} />
                    <TextInput
                      style={styles.fieldInnerInput}
                      placeholder="e.g. 9689119006"
                      placeholderTextColor="#94A3B8"
                      keyboardType="phone-pad"
                      value={form.whatsappPhone}
                      onChangeText={(v) => setForm((p) => ({ ...p, whatsappPhone: v, phone: v }))}
                    />
                  </View>

                  <Text style={styles.fieldLabel}>EMAIL ADDRESS (OPTIONAL)</Text>
                  <View style={styles.inputWithIcon}>
                    <Ionicons name="mail-outline" size={15} color="#94A3B8" style={styles.inputIconPrefix} />
                    <TextInput
                      style={styles.fieldInnerInput}
                      placeholder="client@gmail.com"
                      placeholderTextColor="#94A3B8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={form.email}
                      onChangeText={(v) => setForm((p) => ({ ...p, email: v }))}
                    />
                  </View>

                  <Text style={styles.fieldLabel}>COMPANY / ORGANIZATION</Text>
                  <View style={styles.inputWithIcon}>
                    <Ionicons name="business-outline" size={15} color="#94A3B8" style={styles.inputIconPrefix} />
                    <TextInput
                      style={styles.fieldInnerInput}
                      placeholder="Easy Business Ltd / Freelance"
                      placeholderTextColor="#94A3B8"
                      value={form.company}
                      onChangeText={(v) => setForm((p) => ({ ...p, company: v }))}
                    />
                  </View>
                </View>

                {/* ── Section 2: Product Requirement & Valuation ── */}
                <View style={styles.formSectionBox}>
                  <View style={styles.sectionHeaderRow}>
                    <Ionicons name="pricetag-outline" size={13} color="#1268D9" />
                    <Text style={styles.sectionHeaderText}>PRODUCT REQUIREMENT & VALUATION</Text>
                  </View>

                  <Text style={styles.fieldLabel}>PRODUCT / SERVICE REQUIRED</Text>
                  <View style={styles.inputWithIcon}>
                    <Ionicons name="pricetag-outline" size={15} color="#94A3B8" style={styles.inputIconPrefix} />
                    <TextInput
                      style={styles.fieldInnerInput}
                      placeholder="-- Select or type product / service --"
                      placeholderTextColor="#94A3B8"
                      value={isCustomProduct ? customProductText : form.productService}
                      onChangeText={(v) => {
                        if (isCustomProduct) setCustomProductText(v);
                        setForm((p) => ({ ...p, productService: v }));
                      }}
                    />
                  </View>

                  {/* Horizontal Product Chips */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6, marginBottom: 8 }} keyboardShouldPersistTaps="handled">
                    {products.map((p) => {
                      const isSel = !isCustomProduct && form.productService === p.name;
                      return (
                        <TouchableOpacity
                          key={p._id || p.id}
                          style={[styles.choiceChip, isSel && styles.choiceChipActive]}
                          onPress={() => {
                            setIsCustomProduct(false);
                            setForm((prev) => ({
                              ...prev,
                              productService: p.name,
                              estimatedValue: p.price ? String(p.price) : prev.estimatedValue,
                            }));
                          }}
                        >
                          <Text style={[styles.choiceChipText, isSel && styles.choiceChipTextActive]}>
                            {p.name} {p.price ? `(₹${Number(p.price).toLocaleString()})` : ""}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    <TouchableOpacity
                      style={[styles.choiceChip, isCustomProduct && styles.choiceChipActive]}
                      onPress={() => {
                        setIsCustomProduct(true);
                        setForm((prev) => ({ ...prev, productService: customProductText }));
                      }}
                    >
                      <Ionicons name="create-outline" size={12} color={isCustomProduct ? "#FFF" : "#1268D9"} />
                      <Text style={[styles.choiceChipText, isCustomProduct && styles.choiceChipTextActive]}>
                        Custom Requirement
                      </Text>
                    </TouchableOpacity>
                  </ScrollView>

                  <Text style={styles.fieldLabel}>EST. DEAL VALUE (₹)</Text>
                  <View style={styles.inputWithIcon}>
                    <Text style={styles.currencyPrefix}>₹</Text>
                    <TextInput
                      style={styles.fieldInnerInput}
                      placeholder="e.g. 50000"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      value={form.estimatedValue}
                      onChangeText={(v) => setForm((p) => ({ ...p, estimatedValue: v }))}
                    />
                  </View>

                  <Text style={styles.fieldLabel}>LEAD SOURCE CHANNEL</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 2, marginBottom: 4 }} keyboardShouldPersistTaps="handled">
                    {(sources.length > 0 ? sources : [
                      "Direct / Walk-in",
                      "Website Inquiry",
                      "WhatsApp Chat",
                      "Client Referral",
                      "Social Media Ads",
                    ]).map((src) => {
                      const srcName = typeof src === "string" ? src : (src.name || String(src));
                      const isSel = form.source === srcName;
                      return (
                        <TouchableOpacity
                          key={srcName}
                          style={[styles.choiceChip, isSel && styles.choiceChipActive]}
                          onPress={() => setForm((p) => ({ ...p, source: srcName }))}
                        >
                          <Text style={[styles.choiceChipText, isSel && styles.choiceChipTextActive]}>
                            {srcName}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* ── Section 3: Pipeline Stage & Next Follow-Up ── */}
                <View style={styles.formSectionBox}>
                  <View style={styles.sectionHeaderRow}>
                    <Ionicons name="layers-outline" size={13} color="#1268D9" />
                    <Text style={styles.sectionHeaderText}>PIPELINE STAGE & NEXT FOLLOW-UP</Text>
                  </View>

                  <Text style={styles.fieldLabel}>PIPELINE STAGE</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 2, marginBottom: 10 }} keyboardShouldPersistTaps="handled">
                    {statuses.map((st) => {
                      const stId = st.id || st._id;
                      const isSel = form.statusId === stId;
                      return (
                        <TouchableOpacity
                          key={stId}
                          style={[styles.choiceChip, isSel && styles.choiceChipActive]}
                          onPress={() => setForm((p) => ({ ...p, statusId: stId }))}
                        >
                          <View style={[styles.pillDot, { backgroundColor: getStatusColor(st) }]} />
                          <Text style={[styles.choiceChipText, isSel && styles.choiceChipTextActive]}>
                            {st.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  <Text style={styles.fieldLabel}>NEXT FOLLOW-UP DATE & TIME</Text>
                  <View style={styles.inputWithIcon}>
                    <Ionicons name="calendar-outline" size={15} color="#94A3B8" style={styles.inputIconPrefix} />
                    <TextInput
                      style={styles.fieldInnerInput}
                      placeholder="mm/dd/yyyy --:-- --"
                      placeholderTextColor="#94A3B8"
                      value={form.nextFollowUpDate}
                      onChangeText={(v) => setForm((p) => ({ ...p, nextFollowUpDate: v }))}
                    />
                    <Ionicons name="calendar" size={15} color="#94A3B8" />
                  </View>

                  <Text style={styles.fieldLabel}>INITIAL NOTES / INQUIRY DETAILS</Text>
                  <View style={[styles.inputWithIcon, { alignItems: "flex-start", paddingTop: 8, minHeight: 70 }]}>
                    <Ionicons name="document-text-outline" size={15} color="#94A3B8" style={[styles.inputIconPrefix, { marginTop: 2 }]} />
                    <TextInput
                      style={[styles.fieldInnerInput, { height: 55, textAlignVertical: "top" }]}
                      placeholder="Enter client background, specific expectations or requirement notes..."
                      placeholderTextColor="#94A3B8"
                      multiline
                      numberOfLines={3}
                      value={form.notes}
                      onChangeText={(v) => setForm((p) => ({ ...p, notes: v }))}
                    />
                  </View>
                </View>

                {/* Modal Footer Actions */}
                <View style={styles.modalFooterRow}>
                  <TouchableOpacity
                    style={styles.cancelModalBtn}
                    onPress={() => setAddModalVisible(false)}
                  >
                    <Text style={styles.cancelModalBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.saveModalBtn}
                    onPress={handleSaveNewLead}
                    disabled={savingLead}
                  >
                    {savingLead ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Ionicons name="sparkles" size={14} color="#FFF" />
                        <Text style={styles.saveModalBtnText}>Save & Create Lead</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
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
  kpiCardActiveBlue: {
    borderColor: "#1268D9",
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
    backgroundColor: "#1268D9",
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
    backgroundColor: "#1268D9",
    borderColor: "#1268D9",
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
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: "92%",
    overflow: "hidden",
  },
  modalHeaderBanner: {
    backgroundColor: "#0F172A",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 94, 0, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 94, 0, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalHeadingText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.4,
  },
  modalSubheadingText: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: {
    padding: 14,
    paddingBottom: 20,
  },
  formSectionBox: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  sectionHeaderText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#1268D9",
    letterSpacing: 0.5,
  },
  fieldLabel: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#475569",
    marginBottom: 5,
    marginTop: 8,
    letterSpacing: 0.3,
  },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 2,
  },
  inputIconPrefix: {
    marginRight: 8,
  },
  currencyPrefix: {
    fontSize: 13,
    fontWeight: "800",
    color: "#94A3B8",
    marginRight: 8,
  },
  fieldInnerInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#0F172A",
    padding: 0,
  },
  choiceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginRight: 6,
  },
  choiceChipActive: {
    backgroundColor: "#1268D9",
    borderColor: "#1268D9",
  },
  choiceChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
  },
  choiceChipTextActive: {
    color: "#FFFFFF",
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 2,
  },
  modalFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    paddingTop: 10,
    paddingBottom: 24,
  },
  cancelModalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  cancelModalBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#475569",
  },
  saveModalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: "#1268D9",
    shadowColor: "#1268D9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  saveModalBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
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
