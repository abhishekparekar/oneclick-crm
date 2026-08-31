import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Dimensions,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import CompanyAdminLayout from "../../components/CompanyAdminLayout";
import ManagerLayout from "../../components/ManagerLayout";
import EmployeeLayout from "../../components/EmployeeLayout";
import { useAuth } from "../../context/AuthContext";
import leadsService from "../../api/leadsService";
import { COLORS, FONTS, SPACING, ROUNDING, SHADOWS } from "../../theme/tokens";

const { width } = Dimensions.get("window");

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

export default function LeadsDashboardScreen({ navigation }) {
  const { user } = useAuth();
  const userRole = (user?.role || "").toLowerCase();
  const isManager = userRole === "manager";
  const isEmployee = userRole === "employee" || userRole === "team member";
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState({
    totalLeads: 0,
    activeLeads: 0,
    newToday: 0,
    conversionRate: 0,
    dueReminders: 0,
    totalPipelineValue: 0,
  });
  const [statusCounts, setStatusCounts] = useState([]);
  const [sourcesBreakdown, setSourcesBreakdown] = useState([]);
  const [recentLeads, setRecentLeads] = useState([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [leadsRes, statusesRes, remindersRes, sourcesRes] = await Promise.all([
        leadsService.getLeads({ limit: 100 }),
        leadsService.getStatuses(),
        leadsService.getReminders(),
        leadsService.getSources().catch(() => []),
      ]);

      const leads = Array.isArray(leadsRes?.data)
        ? leadsRes.data
        : Array.isArray(leadsRes)
          ? leadsRes
          : [];
      const statuses = Array.isArray(statusesRes) ? statusesRes : [];
      const reminders = Array.isArray(remindersRes?.reminders)
        ? remindersRes.reminders
        : Array.isArray(remindersRes)
          ? remindersRes
          : [];

      const totalLeads = leads.length;
      const todayStr = new Date().toISOString().split("T")[0];
      const newToday = leads.filter((l) => l.createdAt && l.createdAt.startsWith(todayStr)).length;
      const wonCount = leads.filter((l) => l.status?.name?.toLowerCase().includes("won")).length;
      const lostCount = leads.filter((l) => l.status?.name?.toLowerCase().includes("lost")).length;
      const activeLeads = totalLeads - (wonCount + lostCount);
      const conversionRate = totalLeads ? Math.round((wonCount / totalLeads) * 100) : 0;
      const dueReminders = reminders.filter((r) => !r.isCompleted).length;
      const totalPipelineValue = leads.reduce((acc, l) => acc + (Number(l.estimatedValue) || 0), 0);

      setSummary({
        totalLeads,
        activeLeads,
        newToday,
        conversionRate,
        dueReminders,
        totalPipelineValue,
      });

      const counts = statuses.map((st) => {
        const count = leads.filter(
          (l) => l.statusId === st.id || l.statusId === st._id || l.status?.id === st.id || l.status?._id === st._id
        ).length;
        const percentage = totalLeads ? Math.round((count / totalLeads) * 100) : 0;
        return { ...st, count, percentage };
      });
      setStatusCounts(counts);

      const srcMap = {};
      leads.forEach((l) => {
        const src = l.source || "Direct / Walk-in";
        srcMap[src] = (srcMap[src] || 0) + 1;
      });
      const srcList = Object.keys(srcMap).map((k) => ({
        name: k,
        count: srcMap[k],
        percentage: totalLeads ? Math.round((srcMap[k] / totalLeads) * 100) : 0,
      }));
      setSourcesBreakdown(srcList.slice(0, 4));

      setRecentLeads(leads.slice(0, 5));
    } catch (err) {
      console.warn("[LeadsDashboard] Fetch note:", err?.message || err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const handleWhatsApp = (phone, name) => {
    if (!phone) return;
    let cleanPhone = phone.replace(/[^0-9]/g, "");
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;
    const msg = `Hello ${name || ""}, thank you for connecting with OneClick HRMS!`;
    Linking.openURL(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`).catch(() => { });
  };

  const handleCall = (phone) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  };

  const Layout = isManager ? ManagerLayout : (isEmployee ? EmployeeLayout : CompanyAdminLayout);
  const layoutProps = isManager
    ? { navigation, title: "Lead Engine", activeTabOverride: "Leads" }
    : (isEmployee
      ? { navigation, title: "Lead CRM" }
      : { navigation, activeTab: "Leads", headerTitle: "Lead Engine", showSearch: false });

  return (
    <Layout
      {...layoutProps}
      headerRightElement={
        <TouchableOpacity
          style={styles.headerSettingsBtn}
          onPress={() => navigation.navigate("LeadSettings")}
        >
          <Ionicons name="settings-outline" size={20} color="#0F172A" />
        </TouchableOpacity>
      }
    >
      <View style={styles.container}>
        {loading && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={THEME.primary} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.primary]} />}
          >
            {/* ── 1. Compact Hero Banner ── */}
            <LinearGradient
              colors={["#0F172A", "#1E293B", "#1268D9"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroBanner}
            >
              <View style={styles.heroTopRow}>
                <View>
                  <View style={styles.heroBadge}>
                    <Ionicons name="trending-up" size={12} color="#60A5FA" />
                    <Text style={styles.heroPreTitle}>PIPELINE VALUATION</Text>
                  </View>
                  <Text style={styles.heroValuationText}>
                    ₹{summary.totalPipelineValue.toLocaleString()}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.heroAddButton}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate("LeadsList", { openAddModal: true })}
                >
                  <Ionicons name="add" size={16} color="#FFF" />
                  <Text style={styles.heroAddButtonText}>+ Add Lead</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.heroStatsRow}>
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatNum}>{summary.totalLeads}</Text>
                  <Text style={styles.heroStatLbl}>Contacts</Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatNum}>{summary.activeLeads}</Text>
                  <Text style={styles.heroStatLbl}>Active Deals</Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStatItem}>
                  <Text style={[styles.heroStatNum, { color: "#34D399" }]}>{summary.conversionRate}%</Text>
                  <Text style={styles.heroStatLbl}>Win Ratio</Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStatItem}>
                  <Text style={[styles.heroStatNum, summary.dueReminders > 0 ? { color: "#F87171" } : { color: "#FFF" }]}>
                    {summary.dueReminders}
                  </Text>
                  <Text style={styles.heroStatLbl}>Due Today</Text>
                </View>
              </View>
            </LinearGradient>

            {/* ── Map Place Leads Discovery Banner ── */}
            <TouchableOpacity
              style={{
                backgroundColor: "#0284C7",
                borderRadius: 16,
                padding: 12,
                marginTop: 10,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                ...SHADOWS.sm,
              }}
              activeOpacity={0.85}
              onPress={() => navigation.navigate("MapLeadFinder")}
            >
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    backgroundColor: "rgba(255,255,255,0.2)",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 10,
                  }}
                >
                  <Ionicons name="map" size={20} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "900", color: "#FFFFFF" }}>
                    📍 Map Scraping Leads
                  </Text>
                  <Text style={{ fontSize: 10.5, color: "#E0F2FE", fontWeight: "600" }}>
                    Scrape & discover local businesses from live maps into CRM
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>

            {/* ── 2. Compact Navigation Tiles ── */}
            <View style={styles.tilesRow}>
              <TouchableOpacity
                style={styles.navTile}
                activeOpacity={0.8}
                onPress={() => navigation.navigate("LeadsList")}
              >
                <View style={[styles.tileIconCircle, { backgroundColor: "#EFF6FF" }]}>
                  <Ionicons name="grid-outline" size={17} color="#1268D9" />
                </View>
                <Text style={styles.tileTitle}>CRM Board</Text>
                <Text style={styles.tileSubtitle}>{summary.totalLeads} Leads</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navTile}
                activeOpacity={0.8}
                onPress={() => navigation.navigate("LeadReminders")}
              >
                <View style={[styles.tileIconCircle, { backgroundColor: "#F5F3FF" }]}>
                  <Ionicons name="alarm-outline" size={17} color="#8B5CF6" />
                </View>
                <Text style={styles.tileTitle}>Reminders</Text>
                <Text style={styles.tileSubtitle}>{summary.dueReminders} Due</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navTile}
                activeOpacity={0.8}
                onPress={() => navigation.navigate("LeadCampaigns")}
              >
                <View style={[styles.tileIconCircle, { backgroundColor: "#ECFDF5" }]}>
                  <Ionicons name="paper-plane-outline" size={17} color="#10B981" />
                </View>
                <Text style={styles.tileTitle}>Broadcast</Text>
                <Text style={styles.tileSubtitle}>WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navTile}
                activeOpacity={0.8}
                onPress={() => navigation.navigate("LeadSettings")}
              >
                <View style={[styles.tileIconCircle, { backgroundColor: "#FEF3C7" }]}>
                  <Ionicons name="options-outline" size={17} color="#D97706" />
                </View>
                <Text style={styles.tileTitle}>Pipeline</Text>
                <Text style={styles.tileSubtitle}>Stages</Text>
              </TouchableOpacity>
            </View>

            {/* ── 3. Pipeline Distribution ── */}
            <View style={styles.cardContainer}>
              <View style={styles.cardHeaderRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="funnel-outline" size={15} color="#1268D9" />
                  <Text style={styles.cardHeading}>Pipeline Funnel</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate("LeadsList")}>
                  <Text style={styles.linkText}>View Board →</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.segmentedDistBar}>
                {statusCounts.map((st, i) => (
                  <View
                    key={st.id || st._id || i}
                    style={{
                      flex: Math.max(st.count, 0.5),
                      backgroundColor: st.color || THEME.primary,
                      height: "100%",
                    }}
                  />
                ))}
              </View>

              <View style={styles.stagesGrid}>
                {statusCounts.map((st, i) => (
                  <TouchableOpacity
                    key={st.id || st._id || i}
                    style={styles.stagePill}
                    activeOpacity={0.75}
                    onPress={() => navigation.navigate("LeadsList", { initialStatus: st.id || st._id })}
                  >
                    <View style={[styles.stageDot, { backgroundColor: st.color || THEME.primary }]} />
                    <Text style={styles.stageName} numberOfLines={1}>{st.name}</Text>
                    <Text style={[styles.stageCount, { color: st.color || THEME.primary }]}>{st.count}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ── 4. Recent Compact Prospects ── */}
            <View style={styles.cardContainer}>
              <View style={styles.cardHeaderRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="time-outline" size={15} color="#1268D9" />
                  <Text style={styles.cardHeading}>Recent Inquiries</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate("LeadsList")}>
                  <Text style={styles.linkText}>View All ({summary.totalLeads})</Text>
                </TouchableOpacity>
              </View>

              {recentLeads.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 20 }}>
                  <Text style={{ fontSize: 12, color: "#94A3B8" }}>No recent leads recorded yet.</Text>
                </View>
              ) : (
                recentLeads.map((l, idx) => {
                  const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                  const statusColor = l.status?.color || THEME.primary;
                  return (
                    <TouchableOpacity
                      key={l.id || l._id || idx}
                      style={styles.compactLeadCard}
                      activeOpacity={0.8}
                      onPress={() => navigation.navigate("LeadDetails", { leadId: l.id || l._id })}
                    >
                      <View style={[styles.miniAvatar, { backgroundColor: avatarColor }]}>
                        <Text style={styles.miniAvatarText}>
                          {(l.name || "L").charAt(0).toUpperCase()}
                        </Text>
                      </View>

                      <View style={styles.leadInfoCol}>
                        <View style={styles.leadTitleRow}>
                          <Text style={styles.leadName} numberOfLines={1}>{l.name}</Text>
                          {l.estimatedValue ? (
                            <Text style={styles.dealPillText}>
                              ₹{Number(l.estimatedValue).toLocaleString()}
                            </Text>
                          ) : null}
                        </View>

                        <View style={styles.leadSubRow}>
                          <Text style={styles.leadSubText} numberOfLines={1}>
                            {l.company || l.source || "Direct"}
                          </Text>
                          <View style={[styles.miniStatusBadge, { backgroundColor: statusColor + "14", borderColor: statusColor + "40" }]}>
                            <View style={[styles.miniStatusDot, { backgroundColor: statusColor }]} />
                            <Text style={[styles.miniStatusText, { color: statusColor }]}>
                              {l.status?.name || "New"}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.actionButtonsCol}>
                        {l.whatsappPhone ? (
                          <TouchableOpacity
                            style={styles.compactChatBtn}
                            onPress={() => handleWhatsApp(l.whatsappPhone, l.name)}
                          >
                            <Ionicons name="logo-whatsapp" size={13} color="#10B981" />
                          </TouchableOpacity>
                        ) : null}
                        {l.whatsappPhone ? (
                          <TouchableOpacity
                            style={styles.compactCallBtn}
                            onPress={() => handleCall(l.whatsappPhone)}
                          >
                            <Ionicons name="call" size={12} color="#1268D9" />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </ScrollView>
        )}

        {/* ── FLOATING ACTION BUTTON (ADD PROSPECT) ── */}
        <TouchableOpacity
          style={styles.floatingAddBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate("LeadsList", { openAddModal: true })}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </Layout>
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
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#1268D9",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#1268D9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    zIndex: 999,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 30,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerSettingsBtn: {
    padding: 6,
    marginRight: 6,
  },
  heroBanner: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  heroPreTitle: {
    fontSize: 9,
    fontWeight: "900",
    color: "#93C5FD",
    letterSpacing: 0.6,
  },
  heroValuationText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
    marginTop: 4,
    letterSpacing: 0.3,
  },
  heroAddButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1268D9",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.35)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  heroAddButtonText: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 11.5,
  },
  heroStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    borderRadius: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  heroStatItem: {
    alignItems: "center",
  },
  heroStatNum: {
    fontSize: 14,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  heroStatLbl: {
    fontSize: 9,
    color: "#94A3B8",
    marginTop: 1,
    fontWeight: "700",
  },
  heroStatDivider: {
    width: 1,
    height: 16,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  tilesRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  navTile: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  tileIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  tileTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0F172A",
  },
  tileSubtitle: {
    fontSize: 9,
    color: "#64748B",
    marginTop: 1,
    fontWeight: "600",
  },
  cardContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardHeading: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: 0.2,
  },
  linkText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1268D9",
  },
  segmentedDistBar: {
    height: 5,
    borderRadius: 3,
    flexDirection: "row",
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
    marginBottom: 10,
  },
  stagesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  stagePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stageName: {
    fontSize: 10,
    fontWeight: "700",
    color: "#334155",
    maxWidth: 75,
  },
  stageCount: {
    fontSize: 10,
    fontWeight: "900",
  },
  compactLeadCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  miniAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  miniAvatarText: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 11.5,
  },
  leadInfoCol: {
    flex: 1,
    marginLeft: 9,
    marginRight: 6,
  },
  leadTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  leadName: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0F172A",
    flex: 1,
  },
  dealPillText: {
    fontSize: 10.5,
    fontWeight: "900",
    color: "#B45309",
  },
  leadSubRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  leadSubText: {
    fontSize: 10,
    color: "#64748B",
    flex: 1,
  },
  miniStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    marginLeft: 6,
  },
  miniStatusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  miniStatusText: {
    fontSize: 9,
    fontWeight: "800",
  },
  actionButtonsCol: {
    flexDirection: "row",
    gap: 4,
  },
  compactChatBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    alignItems: "center",
    justifyContent: "center",
  },
  compactCallBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
  },
});
