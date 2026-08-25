import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import ManagerLayout from "../../components/ManagerLayout";
import EmployeeLayout from "../../components/EmployeeLayout";
import { useAuth } from "../../context/AuthContext";
import leadsService from "../../api/leadsService";

const THEME = {
  primary: "#1268D9",
  primaryDark: "#082B52",
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

const AVATAR_COLORS = ["#1E293B", "#3B82F6", "#10B981", "#8B5CF6", "#1268D9", "#06B6D4"];

export default function LeadsListScreen({ navigation, route }) {
  const { user } = useAuth();
  const userRole = (user?.role || "").toLowerCase();
  const isManager = userRole === "manager";
  const isEmployee = userRole === "employee" || userRole === "team member";
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
  const [bulkStaffSearch, setBulkStaffSearch] = useState("");
  const [bulkSelectedDept, setBulkSelectedDept] = useState("all");

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Staff Picker Modal for Add Lead
  const [staffPickerModal, setStaffPickerModal] = useState(false);
  const [staffSearch, setStaffSearch] = useState("");
  const [selectedStaffDept, setSelectedStaffDept] = useState("all");

  // Stage Picker Dropdown Modal
  const [stagePickerModal, setStagePickerModal] = useState(false);

  // Add Lead Modal State
  const [modalVisible, setModalVisible] = useState(route.params?.openAddModal || false);
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState([]);
  const [isCustomProduct, setIsCustomProduct] = useState(false);
  const [customProductText, setCustomProductText] = useState("");
  const [form, setForm] = useState({
    name: "",
    whatsappPhone: "",
    email: "",
    company: "",
    productService: "",
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

      let stList = Array.isArray(statusesRes) && statusesRes.length > 0 ? statusesRes : [];
      if (stList.length === 0) {
        stList = [
          { id: "st-new", _id: "st-new", name: "New Prospect", color: "#3B82F6", isDefault: true, order: 1 },
          { id: "st-contacted", _id: "st-contacted", name: "Contacted / Pitch", color: "#8B5CF6", isDefault: false, order: 2 },
          { id: "st-qualified", _id: "st-qualified", name: "Qualified / Demo", color: "#06B6D4", isDefault: false, order: 3 },
          { id: "st-proposal", _id: "st-proposal", name: "Proposal Sent", color: "#EAB308", isDefault: false, order: 4 },
          { id: "st-negotiation", _id: "st-negotiation", name: "Negotiation", color: "#F97316", isDefault: false, order: 5 },
          { id: "st-won", _id: "st-won", name: "Won / Closed", color: "#10B981", isDefault: false, order: 6 },
          { id: "st-lost", _id: "st-lost", name: "Lost / Dropped", color: "#EF4444", isDefault: false, order: 7 },
        ];
      }
      setStatuses(stList);
      if (stList.length > 0 && !form.statusId) {
        const def = stList.find((s) => s.isDefault) || stList[0];
        setForm((prev) => ({ ...prev, statusId: def.id || def._id }));
      }

      setSources(Array.isArray(sourcesRes) ? sourcesRes : []);

      // Fetch employees, products and departments for assignment
      try {
        const [assignable, prods, depts] = await Promise.all([
          leadsService.getAssignableUsers(),
          leadsService.getProducts(),
          leadsService.getDepartments(),
        ]);
        setEmployees(Array.isArray(assignable) ? assignable : []);
        setProducts(Array.isArray(prods) ? prods : []);
        setDepartments(Array.isArray(depts) ? depts : []);
      } catch (_) {}
    } catch (err) {
      console.warn("[LeadsList] Fetch note:", err?.message || err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Department tabs computed for Staff Selection
  const departmentTabs = useMemo(() => {
    const map = new Map();
    departments.forEach((d) => {
      const name = d.name || d;
      const id = d._id || d.id || name;
      if (name) map.set(name, { id, name });
    });
    employees.forEach((e) => {
      const name = e.department || e.departmentId?.name;
      if (name && !map.has(name)) {
        map.set(name, { id: name, name });
      }
    });
    return Array.from(map.values());
  }, [departments, employees]);

  // Filtered employees for Add Lead modal
  const filteredEmployeesForModal = useMemo(() => {
    let list = employees;
    if (selectedStaffDept && selectedStaffDept !== "all") {
      list = list.filter((e) => {
        const dName = e.department || e.departmentId?.name || "";
        const dId = e.departmentId?._id || e.departmentId || "";
        return dName === selectedStaffDept || dId === selectedStaffDept;
      });
    }
    if (staffSearch.trim()) {
      const q = staffSearch.toLowerCase();
      list = list.filter((e) =>
        (e.name || "").toLowerCase().includes(q) ||
        (e.department || "").toLowerCase().includes(q) ||
        (e.role || "").toLowerCase().includes(q) ||
        (e.phone || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [employees, selectedStaffDept, staffSearch]);

  // Filtered employees for Bulk Assign modal
  const filteredEmployeesForBulk = useMemo(() => {
    let list = employees;
    if (bulkSelectedDept && bulkSelectedDept !== "all") {
      list = list.filter((e) => {
        const dName = e.department || e.departmentId?.name || "";
        const dId = e.departmentId?._id || e.departmentId || "";
        return dName === bulkSelectedDept || dId === bulkSelectedDept;
      });
    }
    if (bulkStaffSearch.trim()) {
      const q = bulkStaffSearch.toLowerCase();
      list = list.filter((e) =>
        (e.name || "").toLowerCase().includes(q) ||
        (e.department || "").toLowerCase().includes(q) ||
        (e.role || "").toLowerCase().includes(q) ||
        (e.phone || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [employees, bulkSelectedDept, bulkStaffSearch]);

  // Selected Employee Object in Add Lead Form
  const selectedEmployeeObj = useMemo(() => {
    if (!form.assignedTo) return null;
    return employees.find((e) => (e.id || e._id) === form.assignedTo) || null;
  }, [form.assignedTo, employees]);

  // Selected Stage Object in Add Lead Form
  const selectedStageObj = useMemo(() => {
    return statuses.find((s) => (s.id || s._id) === form.statusId) || statuses[0] || null;
  }, [form.statusId, statuses]);

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
    if (!form.name.trim()) return Alert.alert("Required", "Client full name is required");
    if (!form.whatsappPhone.trim()) return Alert.alert("Required", "Phone / WhatsApp number is required");

    try {
      setSubmitting(true);
      const leadPayload = {
        ...form,
        phone: form.whatsappPhone,
        productService: isCustomProduct ? customProductText : form.productService,
      };
      await leadsService.createLead(leadPayload);
      setModalVisible(false);
      setIsCustomProduct(false);
      setCustomProductText("");
      setForm({
        name: "",
        whatsappPhone: "",
        email: "",
        company: "",
        productService: "",
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

  const Layout = isManager ? ManagerLayout : (isEmployee ? EmployeeLayout : CompanyAdminLayout);
  const layoutProps = isManager 
    ? { navigation, title: "Lead CRM Directory", activeTabOverride: "Leads" }
    : (isEmployee 
        ? { navigation, title: "Lead CRM Directory" } 
        : { navigation, activeTab: "Leads", headerTitle: "Lead CRM Directory", showSearch: false });

  return (
    <Layout
      {...layoutProps}
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

        {/* ── MODAL: ADD LEAD (Exact Match to Web Design) ── */}
        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContainer}>
              {/* Dark Top Banner */}
              <View style={styles.modalHeaderBanner}>
                <View style={styles.modalIconBadge}>
                  <Ionicons name="magnet" size={20} color="#FF5E00" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.modalHeadingText}>NEW PROSPECTIVE CLIENT / LEAD</Text>
                  <Text style={styles.modalSubheadingText}>Record client inquiry, assigned product and next follow-up date</Text>
                </View>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={16} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              {/* Scrollable Form Body */}
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollBody}>
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
                      onChangeText={(v) => setForm((p) => ({ ...p, whatsappPhone: v }))}
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
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6, marginBottom: 8 }}>
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
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 2, marginBottom: 4 }}>
                    {(sources.length > 0 ? sources : [
                      { id: "s1", name: "Direct / Walk-in" },
                      { id: "s2", name: "Website Inquiry" },
                      { id: "s3", name: "WhatsApp Chat" },
                      { id: "s4", name: "Client Referral" },
                      { id: "s5", name: "Social Media Ads" },
                    ]).map((src) => {
                      const srcName = src.name || src;
                      const isSel = form.source === srcName;
                      return (
                        <TouchableOpacity
                          key={src.id || src._id || srcName}
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

                  <Text style={styles.fieldLabel}>
                    PIPELINE STAGE <Text style={{ color: "#EF4444" }}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={styles.dropdownSelectorBox}
                    onPress={() => setStagePickerModal(true)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.dropdownStageDot,
                        { backgroundColor: selectedStageObj?.color || "#1268D9" }
                      ]}
                    />
                    <Text style={styles.dropdownSelectedValText} numberOfLines={1}>
                      {selectedStageObj ? selectedStageObj.name : "Select Pipeline Stage"}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color="#64748B" style={{ marginLeft: "auto" }} />
                  </TouchableOpacity>

                  <Text style={styles.fieldLabel}>ASSIGN TO SALES / STAFF</Text>
                  <TouchableOpacity
                    style={styles.assignedStaffSelectorBox}
                    onPress={() => {
                      setStaffSearch("");
                      setSelectedStaffDept("all");
                      setStaffPickerModal(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.assignedStaffAvatar, selectedEmployeeObj && { backgroundColor: "#DBEAFE" }]}>
                      <Ionicons
                        name={selectedEmployeeObj ? "person" : "person-add-outline"}
                        size={17}
                        color={selectedEmployeeObj ? "#1D4ED8" : "#64748B"}
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.assignedStaffNameText} numberOfLines={1}>
                        {selectedEmployeeObj ? selectedEmployeeObj.name : "Tap to Select Staff / Sales Person"}
                      </Text>
                      <Text style={styles.assignedStaffMetaText} numberOfLines={1}>
                        {selectedEmployeeObj
                          ? `${selectedEmployeeObj.department || "General"} • ${selectedEmployeeObj.role || "Staff"}`
                          : "Filter by department & search employee"}
                      </Text>
                    </View>
                    <View style={styles.staffChangeBtnPill}>
                      <Text style={styles.staffChangeBtnText}>
                        {selectedEmployeeObj ? "Change" : "Select"}
                      </Text>
                      <Ionicons name="chevron-forward" size={13} color="#1D4ED8" />
                    </View>
                  </TouchableOpacity>

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
              </ScrollView>

              {/* Modal Footer Actions */}
              <View style={styles.modalFooterRow}>
                <TouchableOpacity
                  style={styles.cancelModalBtn}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelModalBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveModalBtn}
                  onPress={handleCreateLead}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Ionicons name="sparkles" size={14} color="#FFF" />
                      <Text style={styles.saveModalBtnText}>Save & Create Lead</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── MODAL: PIPELINE STAGE DROPDOWN PICKER ── */}
        <Modal
          visible={stagePickerModal}
          animationType="slide"
          transparent
          onRequestClose={() => setStagePickerModal(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheetContainer}>
              <View style={styles.dragHandle} />
              <View style={styles.modalHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalHeading}>Select Pipeline Stage</Text>
                  <Text style={styles.modalSubheading}>Choose stage for this prospective client</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setStagePickerModal(false)}
                  style={styles.modalCloseIconBtn}
                >
                  <Ionicons name="close" size={18} color="#475569" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 380, marginTop: 6 }} showsVerticalScrollIndicator={false}>
                {statuses.map((st, idx) => {
                  const stId = st.id || st._id;
                  const isSel = form.statusId === stId;
                  const stageColor = st.color || "#1268D9";
                  return (
                    <TouchableOpacity
                      key={stId}
                      style={[
                        styles.stagePickerRow,
                        isSel && { borderColor: stageColor, backgroundColor: stageColor + "14" }
                      ]}
                      onPress={() => {
                        setForm((p) => ({ ...p, statusId: stId }));
                        setStagePickerModal(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.stagePickerDot, { backgroundColor: stageColor }]} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={[styles.stagePickerName, isSel && { color: "#0F172A", fontWeight: "800" }]}>
                          {st.name}
                        </Text>
                        <Text style={styles.stagePickerOrder}>
                          Stage {idx + 1} of {statuses.length}
                        </Text>
                      </View>
                      {isSel && (
                        <Ionicons name="checkmark-circle" size={20} color={stageColor} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ── MODAL: ASSIGN STAFF PICKER (FOR ADD LEAD) ── */}
        <Modal
          visible={staffPickerModal}
          animationType="slide"
          transparent
          onRequestClose={() => setStaffPickerModal(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheetContainer}>
              <View style={styles.dragHandle} />
              {/* Header */}
              <View style={styles.modalHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalHeading}>Assign Sales / Staff</Text>
                  <Text style={styles.modalSubheading}>
                    {employees.length} team member(s) available
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setStaffPickerModal(false)}
                  style={styles.modalCloseIconBtn}
                >
                  <Ionicons name="close" size={18} color="#475569" />
                </TouchableOpacity>
              </View>

              {/* Search Bar */}
              <View style={styles.staffSearchBox}>
                <Ionicons name="search" size={16} color="#64748B" style={{ marginRight: 6 }} />
                <TextInput
                  style={styles.staffSearchInput}
                  placeholder="Search staff by name, department, role..."
                  placeholderTextColor="#94A3B8"
                  value={staffSearch}
                  onChangeText={setStaffSearch}
                  autoCorrect={false}
                />
                {staffSearch ? (
                  <TouchableOpacity onPress={() => setStaffSearch("")}>
                    <Ionicons name="close-circle" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Department Filter Tabs */}
              <View style={styles.staffDeptBar}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 2 }}>
                  <TouchableOpacity
                    style={[
                      styles.staffDeptTab,
                      selectedStaffDept === "all" && styles.staffDeptTabActive
                    ]}
                    onPress={() => setSelectedStaffDept("all")}
                  >
                    <Text
                      style={[
                        styles.staffDeptTabText,
                        selectedStaffDept === "all" && styles.staffDeptTabTextActive
                      ]}
                    >
                      All ({employees.length})
                    </Text>
                  </TouchableOpacity>

                  {departmentTabs.map((d) => {
                    const count = employees.filter(
                      (e) => (e.department || e.departmentId?.name) === d.name
                    ).length;
                    const isSel = selectedStaffDept === d.name || selectedStaffDept === d.id;
                    return (
                      <TouchableOpacity
                        key={d.id || d.name}
                        style={[styles.staffDeptTab, isSel && styles.staffDeptTabActive]}
                        onPress={() => setSelectedStaffDept(d.name)}
                      >
                        <Text
                          style={[
                            styles.staffDeptTabText,
                            isSel && styles.staffDeptTabTextActive
                          ]}
                        >
                          {d.name} ({count})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Staff Scroll List */}
              <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                {/* Option: Leave Unassigned */}
                <TouchableOpacity
                  style={[
                    styles.staffCardRow,
                    !form.assignedTo && styles.staffCardRowSelected
                  ]}
                  onPress={() => {
                    setForm((p) => ({ ...p, assignedTo: "" }));
                    setStaffPickerModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.staffAvatarCircle, { backgroundColor: "#F1F5F9" }]}>
                    <Ionicons name="person-remove-outline" size={16} color="#64748B" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.staffCardName, !form.assignedTo && { color: "#1D4ED8" }]}>
                      -- Leave Unassigned --
                    </Text>
                    <Text style={styles.staffCardMeta}>Lead will remain in open pool</Text>
                  </View>
                  {!form.assignedTo && (
                    <Ionicons name="checkmark-circle" size={20} color="#1D4ED8" />
                  )}
                </TouchableOpacity>

                {/* Filtered Employees */}
                {filteredEmployeesForModal.length === 0 ? (
                  <View style={styles.staffEmptyWrap}>
                    <Ionicons name="people-outline" size={28} color="#94A3B8" />
                    <Text style={styles.staffEmptyText}>No staff members found</Text>
                  </View>
                ) : (
                  filteredEmployeesForModal.map((emp) => {
                    const empId = emp.id || emp._id;
                    const isSelected = form.assignedTo === empId;
                    const initials = ((emp.name || "S")[0] || "S").toUpperCase();
                    return (
                      <TouchableOpacity
                        key={empId}
                        style={[
                          styles.staffCardRow,
                          isSelected && styles.staffCardRowSelected
                        ]}
                        onPress={() => {
                          setForm((p) => ({ ...p, assignedTo: empId }));
                          setStaffPickerModal(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.staffAvatarCircle, isSelected && { backgroundColor: "#DBEAFE" }]}>
                          <Text style={[styles.staffAvatarInitials, isSelected && { color: "#1D4ED8" }]}>
                            {initials}
                          </Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Text style={[styles.staffCardName, isSelected && { color: "#1D4ED8" }]}>
                              {emp.name}
                            </Text>
                            {emp.department ? (
                              <View style={styles.staffDeptBadge}>
                                <Text style={styles.staffDeptBadgeText}>
                                  {emp.department}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                          <Text style={styles.staffCardMeta} numberOfLines={1}>
                            {emp.role || emp.designation || "Staff Member"}
                            {emp.phone ? ` • ${emp.phone}` : ""}
                          </Text>
                        </View>
                        {isSelected ? (
                          <Ionicons name="checkmark-circle" size={20} color="#1D4ED8" />
                        ) : (
                          <View style={styles.radioEmptyCircle} />
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ── MODAL: BULK ASSIGN TO EMPLOYEE (WITH DEPT & SEARCH) ── */}
        <Modal
          visible={bulkAssignModal}
          animationType="slide"
          transparent
          onRequestClose={() => setBulkAssignModal(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheetContainer}>
              <View style={styles.dragHandle} />
              <View style={styles.modalHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalHeading}>Assign {selectedLeadIds.length} Lead(s)</Text>
                  <Text style={styles.modalSubheading}>Select sales representative or staff</Text>
                </View>
                <TouchableOpacity onPress={() => setBulkAssignModal(false)} style={styles.modalCloseIconBtn}>
                  <Ionicons name="close" size={18} color="#475569" />
                </TouchableOpacity>
              </View>

              {/* Bulk Search Bar */}
              <View style={styles.staffSearchBox}>
                <Ionicons name="search" size={16} color="#64748B" style={{ marginRight: 6 }} />
                <TextInput
                  style={styles.staffSearchInput}
                  placeholder="Search staff by name, department, role..."
                  placeholderTextColor="#94A3B8"
                  value={bulkStaffSearch}
                  onChangeText={setBulkStaffSearch}
                  autoCorrect={false}
                />
                {bulkStaffSearch ? (
                  <TouchableOpacity onPress={() => setBulkStaffSearch("")}>
                    <Ionicons name="close-circle" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Bulk Department Filter Tabs */}
              <View style={styles.staffDeptBar}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 2 }}>
                  <TouchableOpacity
                    style={[
                      styles.staffDeptTab,
                      bulkSelectedDept === "all" && styles.staffDeptTabActive
                    ]}
                    onPress={() => setBulkSelectedDept("all")}
                  >
                    <Text
                      style={[
                        styles.staffDeptTabText,
                        bulkSelectedDept === "all" && styles.staffDeptTabTextActive
                      ]}
                    >
                      All ({employees.length})
                    </Text>
                  </TouchableOpacity>

                  {departmentTabs.map((d) => {
                    const count = employees.filter(
                      (e) => (e.department || e.departmentId?.name) === d.name
                    ).length;
                    const isSel = bulkSelectedDept === d.name || bulkSelectedDept === d.id;
                    return (
                      <TouchableOpacity
                        key={d.id || d.name}
                        style={[styles.staffDeptTab, isSel && styles.staffDeptTabActive]}
                        onPress={() => setBulkSelectedDept(d.name)}
                      >
                        <Text
                          style={[
                            styles.staffDeptTabText,
                            isSel && styles.staffDeptTabTextActive
                          ]}
                        >
                          {d.name} ({count})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
                <TouchableOpacity
                  style={styles.staffCardRow}
                  onPress={() => handleBulkAssign(null, "Unassigned")}
                  activeOpacity={0.7}
                >
                  <View style={[styles.staffAvatarCircle, { backgroundColor: "#F1F5F9" }]}>
                    <Ionicons name="person-remove-outline" size={16} color="#64748B" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.staffCardName}>-- Leave Unassigned --</Text>
                    <Text style={styles.staffCardMeta}>Unassign selected leads</Text>
                  </View>
                </TouchableOpacity>

                {filteredEmployeesForBulk.length === 0 ? (
                  <View style={styles.staffEmptyWrap}>
                    <Ionicons name="people-outline" size={28} color="#94A3B8" />
                    <Text style={styles.staffEmptyText}>No staff members found</Text>
                  </View>
                ) : (
                  filteredEmployeesForBulk.map((emp) => {
                    const initials = ((emp.name || "S")[0] || "S").toUpperCase();
                    return (
                      <TouchableOpacity
                        key={emp.id || emp._id}
                        style={styles.staffCardRow}
                        onPress={() => handleBulkAssign(emp.id || emp._id, emp.name)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.staffAvatarCircle}>
                          <Text style={styles.staffAvatarInitials}>{initials}</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Text style={styles.staffCardName}>{emp.name}</Text>
                            {emp.department ? (
                              <View style={styles.staffDeptBadge}>
                                <Text style={styles.staffDeptBadgeText}>{emp.department}</Text>
                              </View>
                            ) : null}
                          </View>
                          <Text style={styles.staffCardMeta} numberOfLines={1}>
                            {emp.role || emp.designation || "Staff Member"}
                            {emp.phone ? ` • ${emp.phone}` : ""}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                      </TouchableOpacity>
                    );
                  })
                )}
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
    </Layout>
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
  quickActionsGroup: {
    flexDirection: "row",
    gap: 5,
  },
  actionIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
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
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContainer: {
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
  modalScrollBody: {
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
    color: "#0F4499",
    letterSpacing: 0.5,
  },
  fieldLabel: {
    fontSize: 10.5,
    fontWeight: "900",
    color: "#1E293B",
    marginBottom: 5,
    marginTop: 8,
    letterSpacing: 0.3,
  },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
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
    fontWeight: "900",
    color: "#334155",
    marginRight: 8,
  },
  fieldInnerInput: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0F172A",
    padding: 0,
  },
  choiceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E2E8F0",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginRight: 6,
  },
  choiceChipActive: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  choiceChipText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#1E293B",
  },
  choiceChipTextActive: {
    color: "#FFFFFF",
  },
  modalFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#CBD5E1",
  },
  cancelModalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#E2E8F0",
  },
  cancelModalBtnText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#0F172A",
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
    fontSize: 12.5,
    fontWeight: "900",
    color: "#FFFFFF",
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
  // ── Pipeline Stage Dropdown Selector & Modal ──
  dropdownSelectorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#94A3B8",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 6,
  },
  dropdownStageDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  dropdownSelectedValText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0F172A",
    flex: 1,
  },
  stagePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    marginBottom: 8,
  },
  stagePickerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stagePickerName: {
    fontSize: 13.5,
    fontWeight: "900",
    color: "#0F172A",
  },
  stagePickerOrder: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
    marginTop: 2,
  },

  // ── Assigned Staff Selector Box ──
  assignedStaffSelectorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#94A3B8",
    borderRadius: 10,
    padding: 10,
    marginTop: 2,
    marginBottom: 6,
  },
  assignedStaffAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  assignedStaffNameText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0F172A",
  },
  assignedStaffMetaText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
    marginTop: 2,
  },
  staffChangeBtnPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1D4ED8",
    borderWidth: 1,
    borderColor: "#1E40AF",
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  staffChangeBtnText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  // ── Bottom Sheet Container & Header Styling ──
  modalSheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    maxHeight: "90%",
    overflow: "hidden",
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#94A3B8",
    alignSelf: "center",
    marginBottom: 12,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  modalHeading: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: 0.3,
  },
  modalSubheading: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
    marginTop: 2,
  },
  modalCloseIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  staffSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#94A3B8",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 42,
    marginTop: 4,
    marginBottom: 10,
  },
  staffSearchInput: {
    flex: 1,
    fontSize: 12.5,
    color: "#0F172A",
    fontWeight: "700",
    padding: 0,
  },
  staffDeptBar: {
    marginBottom: 10,
  },
  staffDeptTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#E2E8F0",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    marginRight: 6,
  },
  staffDeptTabActive: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  staffDeptTabText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1E293B",
  },
  staffDeptTabTextActive: {
    color: "#FFFFFF",
  },
  staffCardRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 11,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    marginBottom: 7,
  },
  staffCardRowSelected: {
    borderColor: "#0F4499",
    backgroundColor: "#EFF6FF",
  },
  staffAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  staffAvatarInitials: {
    fontSize: 13.5,
    fontWeight: "900",
    color: "#0F172A",
  },
  staffCardName: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0F172A",
  },
  staffDeptBadge: {
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  staffDeptBadgeText: {
    fontSize: 9.5,
    fontWeight: "900",
    color: "#0F172A",
  },
  staffCardMeta: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
    marginTop: 2,
  },
  radioEmptyCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "#94A3B8",
  },
  staffEmptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
  },
  staffEmptyText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "700",
    marginTop: 6,
  },
});
