import React, { useCallback, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Loader from "../../components/Loader";
import ReportHeader from "../../components/ReportHeader";
import { getLeadReportApi } from "../../api/reportService";
import { exportToExcel } from "../../utils/excelExporter";
import { generateAndSharePDF } from "../../utils/pdfGenerator";
import { formatDateToDDMMYYYY } from "../../utils/dateFormatter";
import { FONTS } from "../../theme/tokens";

const LeadReportScreen = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [downloading, setDownloading] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  const loadData = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError("");
      const res = await getLeadReportApi({ month, year });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load lead report");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [month, year])
  );

  const filteredLeads = useMemo(() => {
    const list = data?.records || [];
    return list.filter((l) => {
      const name = (l.name || "").toLowerCase();
      const phone = (l.phone || "").toLowerCase();
      const s = search.toLowerCase();
      const matchSearch = !s || name.includes(s) || phone.includes(s);
      const matchStatus =
        statusFilter === "all" || (l.status || "").toLowerCase() === statusFilter.toLowerCase();
      return matchSearch && matchStatus;
    });
  }, [data, search, statusFilter]);

  const kpis = data?.kpis || {
    totalLeads: 0,
    convertedLeads: 0,
    pipelineLeads: 0,
    conversionRate: 0,
    totalPipelineValue: 0,
    wonValue: 0,
    lostLeads: 0,
  };

  // Excel Export
  const handleExportExcel = async () => {
    if (exportingExcel) return;
    try {
      setExportingExcel(true);
      const fileName = `CRM_Lead_Report_${month ? `Month_${month}` : "AllMonths"}_${year || "AllYears"}`;
      const summaryRows = [
        ["Report", "CRM & Sales Leads Executive Report"],
        ["Generated On", new Date().toLocaleString("en-IN")],
        ["Total Inquiries", kpis.totalLeads],
        ["Converted Deals", kpis.convertedLeads],
        ["Conversion Rate", `${kpis.conversionRate}%`],
        ["Total Pipeline Value (INR)", `Rs. ${Number(kpis.totalPipelineValue || 0).toLocaleString("en-IN")}`],
        ["Won Value (INR)", `Rs. ${Number(kpis.wonValue || 0).toLocaleString("en-IN")}`],
        ["Active Pipeline", kpis.pipelineLeads],
      ];
      const headers = ["#", "Lead Name", "Contact", "Source", "Assigned Representative", "Status", "Estimated Value", "Created Date"];
      const rows = filteredLeads.map((l, idx) => [
        idx + 1,
        l.name || "Lead",
        l.phone || "—",
        l.source || "—",
        l.assignedTo || "Unassigned",
        (l.status || "new").toUpperCase(),
        l.value ? `Rs. ${Number(l.value).toLocaleString("en-IN")}` : "Rs. 0",
        l.formattedDate || (l.createdAt ? formatDateToDDMMYYYY(l.createdAt) : "—"),
      ]);

      await exportToExcel({
        fileName,
        sheetName: "Leads",
        summaryRows,
        headers,
        rows,
      });
    } catch (err) {
      console.warn("Excel export error:", err);
    } finally {
      setExportingExcel(false);
    }
  };

  // PDF Export
  const handleDownload = async () => {
    if (!data || !data.records || downloading) return;
    try {
      setDownloading(true);
      const rows = filteredLeads
        .map(
          (l) => `
          <tr>
            <td>${l.name}</td>
            <td>${l.phone || "—"}</td>
            <td>${l.source || "—"}</td>
            <td>${l.assignedTo || "—"}</td>
            <td>${(l.status || "").toUpperCase()}</td>
            <td>₹${Number(l.value || 0).toLocaleString("en-IN")}</td>
          </tr>
        `
        )
        .join("");

      const html = `
        <div style="font-family: Arial, sans-serif; padding: 10px;">
          <h2 style="color: #0F172A; margin-bottom: 4px;">CRM & Leads Performance Report</h2>
          <p style="color: #64748B; font-size: 11px; margin-top: 0;">Period: ${month ? month + "/" : ""}${year || "All Time"}</p>
          <div style="display: flex; gap: 8px; margin: 12px 0;">
            <div style="background: #EFF6FF; border: 1px solid #BFDBFE; padding: 8px; border-radius: 6px; flex: 1;">Total Leads: <b>${kpis.totalLeads}</b></div>
            <div style="background: #ECFDF5; border: 1px solid #A7F3D0; padding: 8px; border-radius: 6px; flex: 1; color: #059669;">Won: <b>${kpis.convertedLeads} (${kpis.conversionRate}%)</b></div>
            <div style="background: #FFFBEB; border: 1px solid #FDE68A; padding: 8px; border-radius: 6px; flex: 1; color: #D97706;">Pipeline Value: <b>₹${Number(kpis.totalPipelineValue || 0).toLocaleString("en-IN")}</b></div>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background-color: #F1F5F9; text-align: left;">
                <th style="padding: 6px; border: 1px solid #CBD5E1;">Lead Name</th>
                <th style="padding: 6px; border: 1px solid #CBD5E1;">Contact</th>
                <th style="padding: 6px; border: 1px solid #CBD5E1;">Source</th>
                <th style="padding: 6px; border: 1px solid #CBD5E1;">Assigned Rep</th>
                <th style="padding: 6px; border: 1px solid #CBD5E1;">Status</th>
                <th style="padding: 6px; border: 1px solid #CBD5E1;">Est. Value</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;

      await generateAndSharePDF(`CRM Lead Report - ${month ? month + "/" : ""}${year || "All Time"}`, html);
    } catch (err) {
      console.warn("PDF export error:", err);
    } finally {
      setDownloading(false);
    }
  };

  if (loading && !data) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
        <ReportHeader
          title="CRM & Leads Report"
          month={month}
          year={year}
          setMonth={setMonth}
          setYear={setYear}
          onDownload={() => {}}
        />
        <Loader />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ReportHeader
        title="CRM & Leads Report"
        month={month}
        year={year}
        setMonth={setMonth}
        setYear={setYear}
        onDownload={handleDownload}
        downloading={downloading}
        onExportExcel={handleExportExcel}
        exportingExcel={exportingExcel}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />}
      >
        {/* Compact KPI Deck */}
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { borderLeftColor: "#2563EB" }]}>
            <Text style={styles.kpiLabel}>TOTAL LEADS</Text>
            <Text style={[styles.kpiVal, { color: "#0F172A" }]}>{kpis.totalLeads}</Text>
          </View>

          <View style={[styles.kpiCard, { borderLeftColor: "#10B981" }]}>
            <Text style={styles.kpiLabel}>CONVERTED</Text>
            <Text style={[styles.kpiVal, { color: "#059669" }]}>{kpis.convertedLeads}</Text>
          </View>

          <View style={[styles.kpiCard, { borderLeftColor: "#F59E0B" }]}>
            <Text style={styles.kpiLabel}>CONV. RATE</Text>
            <Text style={[styles.kpiVal, { color: "#D97706" }]}>{kpis.conversionRate}%</Text>
          </View>

          <View style={[styles.kpiCard, { borderLeftColor: "#7C3AED" }]}>
            <Text style={styles.kpiLabel}>PIPELINE VAL</Text>
            <Text style={[styles.kpiVal, { color: "#7C3AED", fontSize: 13 }]}>₹{Number(kpis.totalPipelineValue || 0).toLocaleString("en-IN")}</Text>
          </View>
        </View>

        {/* Filter Card */}
        <View style={styles.filterCard}>
          <View style={styles.statusPillsRow}>
            {[
              { label: "All", value: "all" },
              { label: "Won", value: "converted" },
              { label: "New", value: "new" },
              { label: "Contacted", value: "contacted" },
              { label: "Lost", value: "lost" },
            ].map((st) => {
              const isSel = statusFilter === st.value;
              return (
                <TouchableOpacity
                  key={st.value}
                  style={[styles.statusPill, isSel && styles.statusPillActive]}
                  onPress={() => setStatusFilter(st.value)}
                >
                  <Text style={[styles.statusPillText, isSel && styles.statusPillTextActive]}>
                    {st.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.searchRow}>
            <Ionicons name="search" size={13} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by customer name or phone..."
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={14} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Leads List */}
        {filteredLeads.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={36} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Leads Found</Text>
            <Text style={styles.emptySub}>No customer inquiries match your criteria.</Text>
          </View>
        ) : (
          filteredLeads.map((l, idx) => (
            <View key={l._id || idx} style={styles.leadCard}>
              <View style={styles.leadHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.leadName}>{l.name}</Text>
                  <Text style={styles.leadPhone}>{l.phone || "No phone"} · {l.source || "Direct"}</Text>
                </View>
                <View style={styles.badgeWrapper}>
                  <Text style={[styles.badgeText, { color: l.statusColor || "#2563EB" }]}>
                    {(l.status || "New").toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.leadFooter}>
                <Text style={styles.leadMeta}>
                  Rep: <Text style={{ fontWeight: "700", color: "#334155" }}>{l.assignedTo || "Unassigned"}</Text>
                </Text>
                {l.value > 0 && (
                  <Text style={styles.leadValue}>₹{Number(l.value).toLocaleString("en-IN")}</Text>
                )}
              </View>
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    padding: 14,
  },
  kpiGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  kpiCard: {
    flex: 1,
    minWidth: "22%",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 3.5,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  kpiLabel: {
    fontSize: 9,
    fontFamily: FONTS.bodyBold,
    color: "#64748B",
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  kpiVal: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
  },
  filterCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statusPillsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  statusPillActive: {
    backgroundColor: "#F59E0B",
  },
  statusPillText: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: "#64748B",
  },
  statusPillTextActive: {
    color: "#FFFFFF",
    fontFamily: FONTS.bodyBold,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    paddingVertical: 6,
    paddingHorizontal: 6,
    color: "#0F172A",
  },
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
    color: "#334155",
    marginTop: 8,
  },
  emptySub: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  leadCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  leadHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  leadName: {
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
    color: "#0F172A",
  },
  leadPhone: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  badgeWrapper: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "#F1F5F9",
  },
  badgeText: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
  },
  leadFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 6,
    marginTop: 4,
  },
  leadMeta: {
    fontSize: 11,
    color: "#64748B",
  },
  leadValue: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: "#059669",
  },
});

export default LeadReportScreen;
