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
  StatusBar,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import HRHeader from "../../components/HRHeader";
import leadsService from "../../api/leadsService";
import { useAuth } from "../../context/AuthContext";
import { COLORS, FONTS } from "../../theme/tokens";

const { width } = Dimensions.get("window");

const THEME = {
  primary: "#EA580C",
  primaryHover: "#C2410C",
  darkNavy: "#0F172A",
  navyCard: "#1E293B",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  borderLight: "#F1F5F9",
  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  emerald: "#10B981", emeraldBg: "#ECFDF5",
  blue: "#3B82F6", blueBg: "#EFF6FF",
  indigo: "#6366F1", indigoBg: "#EEF2FF",
  amber: "#F59E0B", amberBg: "#FEF3C7",
  rose: "#EF4444", roseBg: "#FEE2E2",
};

const STATUS_COLORS = {
  New: "#06B6D4",
  Contacted: "#8B5CF6",
  Qualified: "#3B82F6",
  Proposal: "#EAB308",
  Negotiation: "#F97316",
  Won: "#10B981",
  Lost: "#EF4444",
};

const DEFAULT_SOURCES = [
  "Walk-in",
  "Website Form",
  "WhatsApp Chat",
  "Client Referral",
  "Facebook Ad",
  "Google Search",
];

export default function HRLeadsScreen({ navigation, route }) {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [sources, setSources] = useState(DEFAULT_SOURCES);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Modal
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [savingLead, setSavingLead] = useState(false);

  const currentUserId = user?._id || user?.id || "";

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
    assignedTo: user?._id || user?.id || "",
    estimatedValue: "",
    nextFollowUpDate: "",
    notes: "",
  });

  useEffect(() => {
    if (currentUserId && !form.assignedTo) {
      setForm((p) => ({ ...p, assignedTo: currentUserId }));
    }
  }, [currentUserId]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [leadsRes, statusesRes, assignableUsersRes, sourcesRes, prodsRes] = await Promise.all([
        leadsService.getLeads({ limit: 250 }),
        leadsService.getStatuses(),
        leadsService.getAssignableUsers(),
        leadsService.getSources().catch(() => DEFAULT_SOURCES),
        leadsService.getProducts(),
      ]);

      const leadList = Array.isArray(leadsRes?.data) ? leadsRes.data : Array.isArray(leadsRes) ? leadsRes : [];
      setLeads(leadList);

      const statusList = Array.isArray(statusesRes) ? statusesRes : [];
      setStatuses(statusList);

      const empList = Array.isArray(assignableUsersRes) ? assignableUsersRes : [];
      setEmployees(empList);

      if (Array.isArray(sourcesRes) && sourcesRes.length > 0) {
        setSources(sourcesRes.map((s) => (typeof s === "string" ? s : s.name)));
      }
      if (Array.isArray(prodsRes) && prodsRes.length > 0) {
        setProducts(prodsRes);
      }
    } catch (err) {
      console.warn("[HRLeadsScreen] Fetch error:", err?.message || err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (route?.params?.openAddModal) {
      setAddModalVisible(true);
      navigation.setParams({ openAddModal: undefined });
    }
  }, [route?.params?.openAddModal]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((item) => {
      const name = (item.name || "").toLowerCase();
      const phone = (item.whatsappPhone || item.phone || "").toLowerCase();
      const company = (item.company || "").toLowerCase();
      const req = (item.productService || "").toLowerCase();
      const query = searchQuery.toLowerCase().trim();

      const matchesSearch = !query || name.includes(query) || phone.includes(query) || company.includes(query) || req.includes(query);

      if (!matchesSearch) return false;
      if (selectedStatus === "all") return true;

      const itemStatusId = item.statusId || item.status?.id || item.status?._id;
      return itemStatusId === selectedStatus;
    });
  }, [leads, searchQuery, selectedStatus]);

  // Metrics
  const metrics = useMemo(() => {
    const total = leads.length;
    const won = leads.filter((l) => (l.status?.name || "").toLowerCase().includes("won")).length;
    const lost = leads.filter((l) => (l.status?.name || "").toLowerCase().includes("lost")).length;
    const active = total - (won + lost);
    const totalVal = leads.reduce((sum, l) => sum + (Number(l.estimatedValue) || 0), 0);
    const convRate = total > 0 ? Math.round((won / total) * 100) : 0;
    return { total, active, won, totalVal, convRate };
  }, [leads]);

  // Create Lead Handler
  const handleCreateLead = async () => {
    if (!form.name.trim() || !form.whatsappPhone.trim()) {
      Alert.alert("Required Fields", "Please enter contact name and WhatsApp phone number.");
      return;
    }

    try {
      setSavingLead(true);
      const payload = {
        ...form,
        productService: isCustomProduct ? customProductText : (form.productService || "").trim(),
        source: form.source || "Direct / Walk-in",
        statusId: form.statusId || (statuses[0]?.id || statuses[0]?._id || undefined),
        assignedTo: form.assignedTo || undefined,
        estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : undefined,
      };

      await leadsService.createLead(payload);
      Alert.alert("Success", "Lead registered in CRM successfully!");
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
        source: "Direct / Walk-in",
        statusId: "",
        assignedTo: currentUserId,
        estimatedValue: "",
        nextFollowUpDate: "",
        notes: "",
      });
      loadData();
    } catch (err) {
      Alert.alert("Creation Error", err?.response?.data?.message || err?.message || "Failed to create lead.");
    } finally {
      setSavingLead(false);
    }
  };

  // WhatsApp & Call Actions
  const handleWhatsApp = (phoneNumber, leadName) => {
    if (!phoneNumber) return;
    let cleanNum = phoneNumber.replace(/[^0-9]/g, "");
    if (cleanNum.length === 10) cleanNum = `91${cleanNum}`;
    const msg = `Hello ${leadName || ""}, thank you for contacting us!`;
    const url = `whatsapp://send?phone=${cleanNum}&text=${encodeURIComponent(msg)}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) return Linking.openURL(url);
        return Linking.openURL(`https://wa.me/${cleanNum}?text=${encodeURIComponent(msg)}`);
      })
      .catch(() => {
        Linking.openURL(`https://wa.me/${cleanNum}?text=${encodeURIComponent(msg)}`).catch(() => {
          Alert.alert("Error", "Could not open WhatsApp.");
        });
      });
  };

  const handleCall = (phoneNumber) => {
    if (!phoneNumber) return;
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert("Error", "Could not make phone call.");
    });
  };

  const openLeadDetails = (lead) => {
    navigation.navigate("LeadDetails", {
      leadId: lead.id || lead._id,
      lead,
    });
  };

  // Render Compact High-Density Lead Card
  const renderLeadCard = ({ item }) => {
    const statusName = item.status?.name || "New";
    const statusColor = item.status?.color || STATUS_COLORS[statusName] || THEME.primary;
    const assignedName = item.assignedTo?.name;
    const assignedDept = item.assignedTo?.departmentId?.name || item.assignedTo?.department;
    const isSelfAssigned = (item.assignedTo?._id || item.assignedTo?.id || item.assignedTo) === currentUserId;

    const initials = (item.name || "L")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    return (
      <TouchableOpacity
        style={styles.compactCard}
        activeOpacity={0.75}
        onPress={() => openLeadDetails(item)}
      >
        {/* Left Status Color Accent Bar */}
        <View style={[styles.cardLeftAccent, { backgroundColor: statusColor }]} />

        <View style={styles.cardMainContent}>
          {/* Card Top: Client Info & Status Badge */}
          <View style={styles.cardHeaderRow}>
            <View style={[styles.avatarCircle, { backgroundColor: `${statusColor}18`, borderColor: `${statusColor}40` }]}>
              <Text style={[styles.avatarInitials, { color: statusColor }]}>{initials}</Text>
            </View>

            <View style={styles.headerInfoCol}>
              <Text style={styles.clientName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.companySourceLine} numberOfLines={1}>
                {item.company ? `${item.company} • ` : ""}{item.source || "Direct Lead"}
              </Text>
            </View>

            <View style={[styles.statusBadgePill, { backgroundColor: `${statusColor}14`, borderColor: `${statusColor}35` }]}>
              <View style={[styles.statusDotMini, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusName}</Text>
            </View>
          </View>

          {/* Requirement Tag & Deal Valuation */}
          {(item.productService || item.estimatedValue) ? (
            <View style={styles.middleMetaRow}>
              {item.productService ? (
                <View style={styles.requirementPill}>
                  <Ionicons name="pricetag-outline" size={11} color={THEME.textSecondary} />
                  <Text style={styles.requirementText} numberOfLines={1}>
                    {item.productService}
                  </Text>
                </View>
              ) : null}

              {item.estimatedValue ? (
                <Text style={styles.dealAmountText}>
                  ₹{Number(item.estimatedValue).toLocaleString("en-IN")}
                </Text>
              ) : null}
            </View>
          ) : null}

          {/* Card Bottom: Assigned Representative & Quick Direct Actions */}
          <View style={styles.cardBottomRow}>
            {/* Representative Badge */}
            <View style={[styles.repBadge, isSelfAssigned ? styles.repBadgeSelf : null]}>
              <Ionicons
                name={isSelfAssigned ? "star" : "person-outline"}
                size={11}
                color={isSelfAssigned ? "#D97706" : "#4F46E5"}
              />
              <Text style={[styles.repText, isSelfAssigned ? { color: "#92400E" } : null]} numberOfLines={1}>
                {isSelfAssigned
                  ? "Assigned to Myself (HR)"
                  : assignedName
                  ? `${assignedName}${assignedDept ? ` (${assignedDept})` : ""}`
                  : "Unassigned"}
              </Text>
            </View>

            {/* Quick Contact Buttons */}
            <View style={styles.quickActionIcons}>
              {item.whatsappPhone ? (
                <TouchableOpacity
                  style={[styles.miniActionBtn, { backgroundColor: "#ECFDF5" }]}
                  onPress={() => handleWhatsApp(item.whatsappPhone, item.name)}
                >
                  <Ionicons name="logo-whatsapp" size={14} color="#10B981" />
                </TouchableOpacity>
              ) : null}

              {(item.whatsappPhone || item.phone) ? (
                <TouchableOpacity
                  style={[styles.miniActionBtn, { backgroundColor: "#EFF6FF" }]}
                  onPress={() => handleCall(item.whatsappPhone || item.phone)}
                >
                  <Ionicons name="call" size={12} color="#3B82F6" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <HRHeader title="Leads & CRM Pipeline" />

      {/* ══════════ 1. COMPACT KPI DASHBOARD HERO ══════════ */}
      <LinearGradient colors={["#0F172A", "#1E293B"]} style={styles.kpiHeroBanner}>
        <View style={styles.kpiGrid}>
          {/* Total Leads */}
          <TouchableOpacity
            style={[styles.kpiCard, selectedStatus === "all" && styles.kpiCardActive]}
            onPress={() => setSelectedStatus("all")}
            activeOpacity={0.8}
          >
            <Text style={styles.kpiNumber}>{metrics.total}</Text>
            <Text style={styles.kpiTitle}>TOTAL LEADS</Text>
          </TouchableOpacity>

          {/* Active Deals */}
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiNumber, { color: "#38BDF8" }]}>{metrics.active}</Text>
            <Text style={styles.kpiTitle}>ACTIVE DEALS</Text>
          </View>

          {/* Deals Won */}
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiNumber, { color: "#34D399" }]}>{metrics.won}</Text>
            <Text style={styles.kpiTitle}>DEALS WON ({metrics.convRate}%)</Text>
          </View>

          {/* Pipeline Value */}
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiNumber, { color: "#FB923C" }]}>
              ₹{metrics.totalVal >= 100000 ? `${(metrics.totalVal / 100000).toFixed(1)}L` : metrics.totalVal.toLocaleString()}
            </Text>
            <Text style={styles.kpiTitle}>VALUATION</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ══════════ 2. SEARCH BAR ══════════ */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInnerBox}>
          <Ionicons name="search-outline" size={17} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search leads by name, phone, company..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={17} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* ══════════ 3. PIPELINE STAGE CHIPS STRIP ══════════ */}
      <View style={styles.stageFilterStrip}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stageFilterContent}
        >
          <TouchableOpacity
            style={[styles.stageChip, selectedStatus === "all" && styles.stageChipActive]}
            onPress={() => setSelectedStatus("all")}
            activeOpacity={0.75}
          >
            <Text style={[styles.stageChipText, selectedStatus === "all" && styles.stageChipTextActive]}>
              All ({leads.length})
            </Text>
          </TouchableOpacity>

          {statuses.map((st) => {
            const stId = st.id || st._id;
            const isSelected = selectedStatus === stId;
            const count = leads.filter((l) => (l.statusId || l.status?.id || l.status?._id) === stId).length;
            const color = st.color || THEME.primary;
            return (
              <TouchableOpacity
                key={stId}
                style={[styles.stageChip, isSelected && { backgroundColor: `${color}18`, borderColor: color }]}
                onPress={() => setSelectedStatus(stId)}
                activeOpacity={0.75}
              >
                <View style={[styles.stageDotSmall, { backgroundColor: color }]} />
                <Text style={[styles.stageChipText, isSelected && { color: color, fontFamily: FONTS.bodyBold }]}>
                  {st.name} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ══════════ 4. LEADS LIST ══════════ */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={styles.loadingText}>Loading CRM Pipeline...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredLeads}
          keyExtractor={(item, idx) => item.id || item._id || String(idx)}
          renderItem={renderLeadCard}
          contentContainerStyle={styles.listContentPadding}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="magnet-outline" size={38} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>No Leads Found</Text>
              <Text style={styles.emptySub}>
                {searchQuery ? "No matching leads found for your search." : "No leads in this pipeline stage yet."}
              </Text>
            </View>
          }
        />
      )}

      {/* ══════════ 5. FLOATING ACTION BUTTON ══════════ */}
      <TouchableOpacity
        style={styles.floatingAddBtn}
        activeOpacity={0.85}
        onPress={() => setAddModalVisible(true)}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* ══════════ MODAL: ADD NEW LEAD (Exact Match to Web Design) ══════════ */}
      <Modal visible={addModalVisible} animationType="slide" transparent onRequestClose={() => setAddModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheetContainer}>
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
            <ScrollView style={styles.modalBodyScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
                    const color = st.color || "#1268D9";
                    return (
                      <TouchableOpacity
                        key={stId}
                        style={[styles.choiceChip, isSel && styles.choiceChipActive]}
                        onPress={() => setForm((p) => ({ ...p, statusId: stId }))}
                      >
                        <View style={[styles.pillDot, { backgroundColor: color }]} />
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

                <Text style={styles.fieldLabel}>ASSIGN TO SALES / STAFF</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 2, marginBottom: 10 }} keyboardShouldPersistTaps="handled">
                  {currentUserId ? (
                    <TouchableOpacity
                      style={[styles.choiceChip, form.assignedTo === currentUserId && styles.choiceChipActive]}
                      onPress={() => setForm((p) => ({ ...p, assignedTo: currentUserId }))}
                    >
                      <Ionicons
                        name="person-circle"
                        size={12}
                        color={form.assignedTo === currentUserId ? "#FFF" : "#1268D9"}
                        style={{ marginRight: 3 }}
                      />
                      <Text style={[styles.choiceChipText, form.assignedTo === currentUserId && styles.choiceChipTextActive]}>
                        ⭐ Myself ({user?.name || "HR"})
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity
                    style={[styles.choiceChip, !form.assignedTo && styles.choiceChipActive]}
                    onPress={() => setForm((p) => ({ ...p, assignedTo: "" }))}
                  >
                    <Text style={[styles.choiceChipText, !form.assignedTo && styles.choiceChipTextActive]}>
                      Unassigned
                    </Text>
                  </TouchableOpacity>

                  {employees
                    .filter((emp) => (emp.id || emp._id) !== currentUserId)
                    .map((emp) => {
                      const empId = emp.id || emp._id;
                      const isSelected = form.assignedTo === empId;
                      return (
                        <TouchableOpacity
                          key={empId}
                          style={[styles.choiceChip, isSelected && styles.choiceChipActive]}
                          onPress={() => setForm((p) => ({ ...p, assignedTo: empId }))}
                        >
                          <Ionicons name="person" size={11} color={isSelected ? "#FFF" : "#1268D9"} style={{ marginRight: 3 }} />
                          <Text style={[styles.choiceChipText, isSelected && styles.choiceChipTextActive]}>
                            {emp.label || `${emp.name} (${emp.department || emp.role || "Staff"})`}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                </ScrollView>

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
                  onPress={handleCreateLead}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
  },

  // 1. KPI Hero Banner
  kpiHeroBanner: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  kpiGrid: {
    flexDirection: "row",
    gap: 6,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  kpiCardActive: {
    borderColor: THEME.primary,
    backgroundColor: "rgba(234, 88, 12, 0.18)",
  },
  kpiNumber: {
    fontSize: 14,
    fontFamily: FONTS.displayBold,
    color: "#FFFFFF",
  },
  kpiTitle: {
    fontSize: 8.5,
    fontFamily: FONTS.bodyBold,
    color: "#94A3B8",
    marginTop: 2,
    letterSpacing: 0.2,
  },

  // 2. Search Box
  searchContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  searchInnerBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 36,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: FONTS.body,
    color: THEME.textPrimary,
    padding: 0,
  },

  // 3. Stage Filters Strip
  stageFilterStrip: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  stageFilterContent: {
    paddingHorizontal: 12,
    gap: 6,
  },
  stageChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 5,
  },
  stageChipActive: {
    backgroundColor: "rgba(234, 88, 12, 0.15)",
    borderColor: THEME.primary,
  },
  stageChipText: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: "#64748B",
  },
  stageChipTextActive: {
    color: THEME.primary,
    fontFamily: FONTS.bodyBold,
  },
  stageDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // 4. Compact High-Density Lead Cards
  listContentPadding: {
    padding: 10,
    paddingBottom: 90,
  },
  compactCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
    overflow: "hidden",
  },
  cardLeftAccent: {
    width: 4,
  },
  cardMainContent: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  avatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginRight: 8,
  },
  avatarInitials: {
    fontSize: 11,
    fontFamily: FONTS.displayBold,
  },
  headerInfoCol: {
    flex: 1,
    marginRight: 6,
  },
  clientName: {
    fontSize: 13,
    fontFamily: FONTS.displayBold,
    color: THEME.textPrimary,
  },
  companySourceLine: {
    fontSize: 10.5,
    color: THEME.textMuted,
    fontFamily: FONTS.bodyMedium,
    marginTop: 0.5,
  },
  statusBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  statusDotMini: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
  },
  middleMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 3,
  },
  requirementPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
    maxWidth: "65%",
  },
  requirementText: {
    fontSize: 10.5,
    color: THEME.textSecondary,
    fontFamily: FONTS.body,
  },
  dealAmountText: {
    fontSize: 11.5,
    fontFamily: FONTS.displayBold,
    color: "#10B981",
  },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#F8FAFC",
  },
  repBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    gap: 3.5,
    maxWidth: "70%",
  },
  repBadgeSelf: {
    backgroundColor: "#FEF3C7",
  },
  repText: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    color: "#4F46E5",
  },
  quickActionIcons: {
    flexDirection: "row",
    gap: 5,
  },
  miniActionBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  // 5. Floating Button
  floatingAddBtn: {
    position: "absolute",
    bottom: 20,
    right: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: THEME.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    zIndex: 999,
  },

  // Empty & Center states
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12,
    color: THEME.textMuted,
    fontFamily: FONTS.bodyMedium,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
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
    marginTop: 2,
    maxWidth: 220,
  },

  // Modal Sheet
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalSheetContainer: {
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
  modalBodyScroll: {
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
});
