import React, { useCallback, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Dimensions,
  StatusBar,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Loader from "../../components/Loader";
import { getBIOrganizationReportApi } from "../../api/reportService";
import { exportToExcel } from "../../utils/excelExporter";
import { FONTS } from "../../theme/tokens";

const { width } = Dimensions.get("window");

const TABS = [
  { id: "departments", label: "Departments", icon: "business-outline" },
  { id: "designations", label: "Designations", icon: "ribbon-outline" },
  { id: "holidays", label: "Holidays", icon: "calendar-outline" },
  { id: "announcements", label: "Announcements", icon: "megaphone-outline" },
];

const OrganizationReportScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState("departments");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [exportingExcel, setExportingExcel] = useState(false);

  const loadData = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      const res = await getBIOrganizationReportApi({ refresh });
      setData(res?.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load organization report");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const kpis = data?.kpis || {};

  // Filtered lists
  const filteredDepartments = useMemo(() => {
    const list = data?.departments || [];
    if (!search.trim()) return list;
    const s = search.toLowerCase();
    return list.filter((d) => d.name?.toLowerCase().includes(s));
  }, [data, search]);

  const filteredDesignations = useMemo(() => {
    const list = data?.designations || [];
    if (!search.trim()) return list;
    const s = search.toLowerCase();
    return list.filter((dg) => dg.title?.toLowerCase().includes(s));
  }, [data, search]);

  const filteredHolidays = useMemo(() => {
    const list = data?.holidays || [];
    if (!search.trim()) return list;
    const s = search.toLowerCase();
    return list.filter((h) => h.name?.toLowerCase().includes(s) || h.type?.toLowerCase().includes(s));
  }, [data, search]);

  const filteredAnnouncements = useMemo(() => {
    const list = data?.announcements || [];
    if (!search.trim()) return list;
    const s = search.toLowerCase();
    return list.filter(
      (a) => a.title?.toLowerCase().includes(s) || a.content?.toLowerCase().includes(s)
    );
  }, [data, search]);

  // Excel Export
  const handleExportExcel = async () => {
    if (exportingExcel || !data) return;
    try {
      setExportingExcel(true);
      const fileName = `Organization_Structure_Report_${new Date().toISOString().slice(0, 10)}`;

      const summaryRows = [
        ["Report", "Organization Structure & Policy Intelligence Report"],
        ["Generated Date", new Date().toLocaleString("en-IN")],
        ["Total Departments", kpis.totalDepartments || 0],
        ["Total Designations", kpis.totalDesignations || 0],
        ["Total Annual Holidays", kpis.totalHolidays || 0],
        ["Upcoming Holidays", kpis.upcomingHolidays || 0],
        ["Announcements Published", kpis.totalAnnouncements || 0],
      ];

      // Multi-sheet export
      const sheets = [
        {
          sheetName: "Departments",
          summaryRows,
          headers: ["#", "Department Name", "Description", "Total Headcount", "Active Staff"],
          rows: (data.departments || []).map((d, i) => [
            i + 1,
            d.name || "—",
            d.description || "—",
            d.totalHeadcount || 0,
            d.activeHeadcount || 0,
          ]),
        },
        {
          sheetName: "Designations",
          headers: ["#", "Designation Title", "Total Headcount"],
          rows: (data.designations || []).map((dg, i) => [
            i + 1,
            dg.title || "—",
            dg.totalHeadcount || 0,
          ]),
        },
        {
          sheetName: "Holidays",
          headers: ["#", "Holiday Name", "Date", "Type", "Days Off", "Upcoming"],
          rows: (data.holidays || []).map((h, i) => [
            i + 1,
            h.name || "—",
            h.date || "—",
            h.type || "Mandatory",
            h.days || 1,
            h.isUpcoming ? "YES" : "PAST",
          ]),
        },
        {
          sheetName: "Announcements",
          headers: ["#", "Title", "Date", "Audience", "Priority", "Content Summary"],
          rows: (data.announcements || []).map((a, i) => [
            i + 1,
            a.title || "—",
            a.date || "—",
            a.targetAudience || "All Staff",
            a.priority || "Normal",
            a.content || "—",
          ]),
        },
      ];

      await exportToExcel({
        fileName,
        sheets,
      });
    } catch (err) {
      console.warn("[OrganizationReportScreen] Export error:", err);
    } finally {
      setExportingExcel(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Organization Report</Text>
            <Text style={styles.headerSubtitle}>Departments, roles, holidays & announcements</Text>
          </View>
          <TouchableOpacity
            style={styles.exportBtn}
            onPress={handleExportExcel}
            disabled={exportingExcel}
          >
            <Ionicons name="download-outline" size={18} color="#2563EB" />
            <Text style={styles.exportText}>{exportingExcel ? "Exporting..." : "Excel"}</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabChip, isActive && styles.tabChipActive]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Ionicons
                  name={tab.icon}
                  size={15}
                  color={isActive ? "#FFFFFF" : "#64748B"}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.tabChipText, isActive && styles.tabChipTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={14} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${activeTab}...`}
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
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />}
      >
        {loading && !data ? (
          <View style={styles.loaderBox}>
            <Loader />
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Top KPIs */}
        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, { borderLeftColor: "#2563EB" }]}>
            <Text style={styles.kpiLabel}>DEPARTMENTS</Text>
            <Text style={[styles.kpiVal, { color: "#2563EB" }]}>{kpis.totalDepartments || 0}</Text>
          </View>
          <View style={[styles.kpiCard, { borderLeftColor: "#7C3AED" }]}>
            <Text style={styles.kpiLabel}>DESIGNATIONS</Text>
            <Text style={[styles.kpiVal, { color: "#7C3AED" }]}>{kpis.totalDesignations || 0}</Text>
          </View>
          <View style={[styles.kpiCard, { borderLeftColor: "#10B981" }]}>
            <Text style={styles.kpiLabel}>HOLIDAYS</Text>
            <Text style={[styles.kpiVal, { color: "#10B981" }]}>{kpis.totalHolidays || 0}</Text>
          </View>
          <View style={[styles.kpiCard, { borderLeftColor: "#F59E0B" }]}>
            <Text style={styles.kpiLabel}>ANNOUNCEMENTS</Text>
            <Text style={[styles.kpiVal, { color: "#F59E0B" }]}>{kpis.totalAnnouncements || 0}</Text>
          </View>
        </View>

        {/* Tab 1: Departments */}
        {activeTab === "departments" ? (
          <View>
            <Text style={styles.sectionTitle}>DEPARTMENT HEADCOUNT LEDGER</Text>
            {filteredDepartments.map((d, i) => (
              <View key={d._id || i} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardName}>{d.name}</Text>
                  <View style={styles.headcountBadge}>
                    <Text style={styles.headcountText}>{d.totalHeadcount || 0} Staff</Text>
                  </View>
                </View>
                {d.description ? <Text style={styles.cardDesc}>{d.description}</Text> : null}
                <View style={styles.cardFooter}>
                  <Text style={styles.footerInfo}>Active: {d.activeHeadcount || 0}</Text>
                  <Text style={styles.footerInfo}>
                    Inactive: {Math.max(0, (d.totalHeadcount || 0) - (d.activeHeadcount || 0))}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* Tab 2: Designations */}
        {activeTab === "designations" ? (
          <View>
            <Text style={styles.sectionTitle}>ROLES & DESIGNATIONS DIRECTORY</Text>
            {filteredDesignations.map((dg, i) => (
              <View key={dg._id || i} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardName}>{dg.title}</Text>
                  <View style={[styles.headcountBadge, { backgroundColor: "#EFF6FF" }]}>
                    <Text style={[styles.headcountText, { color: "#2563EB" }]}>
                      {dg.totalHeadcount || 0} Assigned
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* Tab 3: Holidays */}
        {activeTab === "holidays" ? (
          <View>
            <Text style={styles.sectionTitle}>ANNUAL HOLIDAYS SCHEDULE</Text>
            {filteredHolidays.map((h, i) => (
              <View key={h._id || i} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName}>{h.name}</Text>
                    <Text style={styles.cardDate}>Date: {h.date}</Text>
                  </View>
                  <View
                    style={[
                      styles.headcountBadge,
                      { backgroundColor: h.isUpcoming ? "#ECFDF5" : "#F1F5F9" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.headcountText,
                        { color: h.isUpcoming ? "#059669" : "#64748B" },
                      ]}
                    >
                      {h.isUpcoming ? "UPCOMING" : "PAST"}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardFooter}>
                  <Text style={styles.footerInfo}>Type: {h.type}</Text>
                  <Text style={styles.footerInfo}>Days: {h.days} Day(s)</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* Tab 4: Announcements */}
        {activeTab === "announcements" ? (
          <View>
            <Text style={styles.sectionTitle}>BULLETIN & ANNOUNCEMENTS LOG</Text>
            {filteredAnnouncements.map((a, i) => (
              <View key={a._id || i} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.cardName}>{a.title}</Text>
                    <Text style={styles.cardDate}>Published: {a.date}</Text>
                  </View>
                  <View style={[styles.headcountBadge, { backgroundColor: "#FEF3C7" }]}>
                    <Text style={[styles.headcountText, { color: "#D97706" }]}>
                      {a.priority.toUpperCase()}
                    </Text>
                  </View>
                </View>
                {a.content ? <Text style={styles.cardDesc}>{a.content}</Text> : null}
                <View style={styles.cardFooter}>
                  <Text style={styles.footerInfo}>Target: {a.targetAudience}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  backBtn: {
    padding: 6,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: "#64748B",
    marginTop: 1,
  },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    gap: 4,
  },
  exportText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: "#2563EB",
  },
  tabScroll: {
    flexDirection: "row",
    marginBottom: 10,
  },
  tabChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    marginRight: 8,
  },
  tabChipActive: {
    backgroundColor: "#0F172A",
  },
  tabChipText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: "#64748B",
  },
  tabChipTextActive: {
    color: "#FFFFFF",
    fontFamily: FONTS.bold,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.regular,
    marginLeft: 6,
    color: "#0F172A",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  loaderBox: {
    paddingVertical: 20,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    color: "#DC2626",
    marginLeft: 8,
    flex: 1,
    fontFamily: FONTS.medium,
  },
  kpiRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
    marginBottom: 16,
  },
  kpiCard: {
    width: (width - 40) / 2,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 10,
    margin: 4,
    borderLeftWidth: 3.5,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  kpiLabel: {
    fontSize: 9.5,
    fontFamily: FONTS.bold,
    color: "#64748B",
  },
  kpiVal: {
    fontSize: 17,
    fontFamily: FONTS.bold,
    marginTop: 3,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: "#475569",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardName: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: "#0F172A",
  },
  cardDate: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: "#64748B",
    marginTop: 2,
  },
  cardDesc: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: "#475569",
    marginTop: 6,
    lineHeight: 16,
  },
  headcountBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  headcountText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: "#059669",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  footerInfo: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: "#64748B",
  },
});

export default OrganizationReportScreen;
