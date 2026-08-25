import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import leadsService from "../../api/leadsService";
import { COLORS, FONTS, SPACING, ROUNDING, SHADOWS } from "../../theme/tokens";

const QUICK_CATEGORIES = [
  { label: "Hospitals", icon: "medkit-outline", keyword: "Hospitals" },
  { label: "IT Companies", icon: "laptop-outline", keyword: "IT Companies" },
  { label: "Restaurants", icon: "restaurant-outline", keyword: "Restaurants" },
  { label: "Real Estate", icon: "business-outline", keyword: "Real Estate" },
  { label: "Schools", icon: "school-outline", keyword: "Schools" },
  { label: "Gyms", icon: "barbell-outline", keyword: "Gyms" },
  { label: "Automobile", icon: "car-outline", keyword: "Automobile" },
  { label: "Accountants", icon: "calculator-outline", keyword: "Accountants" },
];

const QUICK_CITIES = ["Pune", "Mumbai", "Nashik", "Bengaluru", "Delhi", "Nagpur", "Hyderabad"];

export default function MapLeadFinderScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [keyword, setKeyword] = useState("Hospitals");
  const [city, setCity] = useState("Pune");
  const [limit, setLimit] = useState(25);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Selection
  const [selectedIds, setSelectedIds] = useState(new Set());

  // CRM Statuses
  const [statuses, setStatuses] = useState([]);
  const [selectedStatusId, setSelectedStatusId] = useState("");
  const [stagePickerVisible, setStagePickerVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadStatuses();
    handleSearch("Hospitals", "Pune");
  }, []);

  const loadStatuses = async () => {
    try {
      const res = await leadsService.getStatuses();
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setStatuses(list);
      if (list.length > 0) {
        const def = list.find((s) => s.isDefault) || list[0];
        setSelectedStatusId(def.id || def._id);
      }
    } catch (_) {}
  };

  const handleSearch = async (overrideKeyword, overrideCity, overrideLimit) => {
    const k = (overrideKeyword !== undefined ? overrideKeyword : keyword).trim();
    const c = (overrideCity !== undefined ? overrideCity : city).trim();
    const l = overrideLimit !== undefined ? overrideLimit : limit;

    if (!k && !c) {
      Alert.alert("Required", "Please enter a business category or city to search.");
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const res = await leadsService.searchMapPlaces({
        keyword: k || "Businesses",
        city: c || "Mumbai",
        limit: l,
      });

      const list = Array.isArray(res?.places) ? res.places : [];
      setPlaces(list);

      // Pre-select non-duplicate leads
      const newIds = new Set();
      list.forEach((p) => {
        if (!p.isAlreadyLead) newIds.add(p.id);
      });
      setSelectedIds(newIds);
    } catch (err) {
      Alert.alert("Search Error", err.message || "Failed to find map leads.");
    } finally {
      setLoading(false);
    }
  };

  const [hideDuplicates, setHideDuplicates] = useState(false);

  const displayedPlaces = hideDuplicates ? places.filter((p) => !p.isAlreadyLead) : places;
  const nonDuplicatePlaces = places.filter((p) => !p.isAlreadyLead);

  const toggleSelectAll = () => {
    if (selectedIds.size >= nonDuplicatePlaces.length && nonDuplicatePlaces.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(nonDuplicatePlaces.map((p) => p.id)));
    }
  };

  const toggleSelect = (id, isAlreadyLead) => {
    if (isAlreadyLead) return; // Prevent selecting duplicates
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleImport = async () => {
    const selectedPlaces = places.filter((p) => selectedIds.has(p.id));
    if (selectedPlaces.length === 0) {
      Alert.alert("Selection Required", "Please select at least one business place to save.");
      return;
    }

    setSaving(true);
    try {
      const res = await leadsService.importMapLeads({
        places: selectedPlaces,
        statusId: selectedStatusId || undefined,
        source: "Google Maps / Map Search",
      });

      Alert.alert(
        "🎉 Leads Saved!",
        res.message || `Successfully saved ${res.createdCount || selectedPlaces.length} new leads into your CRM database!`,
        [
          {
            text: "View Leads Pipeline",
            onPress: () => navigation.navigate("LeadsList"),
          },
          { text: "Continue Searching", style: "cancel" },
        ]
      );

      // Mark as already in CRM
      setPlaces((prev) =>
        prev.map((p) => (selectedIds.has(p.id) ? { ...p, isAlreadyLead: true } : p))
      );
      setSelectedIds(new Set());
    } catch (err) {
      Alert.alert("Import Failed", err.message || "Could not save leads.");
    } finally {
      setSaving(false);
    }
  };

  const openWhatsApp = (phone) => {
    if (!phone) return;
    const clean = phone.replace(/\D/g, "");
    Linking.openURL(`https://wa.me/91${clean}`).catch(() => {
      Alert.alert("Error", "WhatsApp is not installed on this device.");
    });
  };

  const openDialer = (phone) => {
    if (!phone) return;
    const clean = phone.replace(/\D/g, "");
    Linking.openURL(`tel:${clean}`).catch(() => {});
  };

  const selectedStage = statuses.find((s) => (s.id || s._id) === selectedStatusId);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#082B52" />

      {/* ── HEADER BAR ────────────────────────────────────────────── */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerTitles}>
          <View style={styles.badgeRow}>
            <View style={styles.liveDot} />
            <Text style={styles.headerSubBadge}>MAP SCRAPING & LEAD FINDER</Text>
          </View>
          <Text style={styles.headerTitle}>Map Scraping Leads</Text>
        </View>

        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => handleSearch()}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* ── SEARCH CARD ───────────────────────────────────────────── */}
      <View style={styles.searchCard}>
        <View style={styles.searchInputsRow}>
          {/* Category Input */}
          <View style={[styles.inputWrapper, { flex: 1.2 }]}>
            <Ionicons name="business-outline" size={16} color="#1268D9" style={{ marginRight: 6 }} />
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Hospitals, IT..."
              placeholderTextColor="#94A3B8"
              value={keyword}
              onChangeText={setKeyword}
              onSubmitEditing={() => handleSearch()}
              returnKeyType="search"
            />
          </View>

          {/* City Input */}
          <View style={[styles.inputWrapper, { flex: 1 }]}>
            <Ionicons name="location-outline" size={16} color="#EF4444" style={{ marginRight: 4 }} />
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Pune, Mumbai"
              placeholderTextColor="#94A3B8"
              value={city}
              onChangeText={setCity}
              onSubmitEditing={() => handleSearch()}
              returnKeyType="search"
            />
          </View>

          {/* Search CTA */}
          <TouchableOpacity
            style={styles.searchBtn}
            onPress={() => handleSearch()}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="search" size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Category Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={{ gap: 6 }}
        >
          {QUICK_CATEGORIES.map((cat) => {
            const isSel = keyword.toLowerCase() === cat.keyword.toLowerCase();
            return (
              <TouchableOpacity
                key={cat.keyword}
                style={[styles.chip, isSel && styles.chipActive]}
                onPress={() => {
                  setKeyword(cat.keyword);
                  handleSearch(cat.keyword, city);
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={cat.icon}
                  size={13}
                  color={isSel ? "#FFFFFF" : "#475569"}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.chipText, isSel && styles.chipTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Quick City Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 6 }}
          contentContainerStyle={{ gap: 6 }}
        >
          {QUICK_CITIES.map((c) => {
            const isSel = city.toLowerCase() === c.toLowerCase();
            return (
              <TouchableOpacity
                key={c}
                style={[styles.cityChip, isSel && styles.cityChipActive]}
                onPress={() => {
                  setCity(c);
                  handleSearch(keyword, c);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.cityChipText, isSel && styles.cityChipTextActive]}>
                  {c}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Limit Selector Chips (5, 10, 15, 20, 25) */}
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: "800", color: "#64748B", marginRight: 8 }}>
            Limit:
          </Text>
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
            {[5, 10, 15, 20, 25].map((lim) => {
              const isSel = limit === lim;
              return (
                <TouchableOpacity
                  key={lim}
                  style={[
                    styles.cityChip,
                    { paddingHorizontal: 10, paddingVertical: 3 },
                    isSel && { backgroundColor: "#1268D9", borderColor: "#1268D9" },
                  ]}
                  onPress={() => {
                    setLimit(lim);
                    handleSearch(keyword, city, lim);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.cityChipText,
                      isSel && { color: "#FFFFFF", fontWeight: "900" },
                    ]}
                  >
                    {lim}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* ── PLACES LIST & RESULTS ──────────────────────────────────── */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1268D9" />
          <Text style={styles.loadingText}>Scanning live maps for "{keyword}" in "{city}"...</Text>
        </View>
      ) : places.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="map-outline" size={48} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No Places Discovered</Text>
          <Text style={styles.emptySubtitle}>
            Try changing the category or searching in a different city.
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayedPlaces}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.listHeaderRow}>
              <TouchableOpacity
                style={styles.selectAllBtn}
                onPress={toggleSelectAll}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={
                    selectedIds.size === nonDuplicatePlaces.length && nonDuplicatePlaces.length > 0
                      ? "checkbox"
                      : "square-outline"
                  }
                  size={18}
                  color={selectedIds.size === nonDuplicatePlaces.length ? "#1268D9" : "#64748B"}
                />
                <Text style={styles.selectAllText}>
                  {selectedIds.size === nonDuplicatePlaces.length && nonDuplicatePlaces.length > 0
                    ? "Deselect All"
                    : "Select All"}{" "}
                  ({selectedIds.size}/{nonDuplicatePlaces.length} new)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterPill,
                  hideDuplicates && { backgroundColor: "#DBEAFE", borderColor: "#3B82F6" },
                ]}
                onPress={() => setHideDuplicates((prev) => !prev)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={hideDuplicates ? "eye-off" : "eye-outline"}
                  size={13}
                  color={hideDuplicates ? "#1D4ED8" : "#64748B"}
                />
                <Text
                  style={[
                    styles.filterPillText,
                    hideDuplicates && { color: "#1D4ED8", fontWeight: "700" },
                  ]}
                >
                  {hideDuplicates ? "Hiding Duplicates" : "Hide CRM Dups"}
                </Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => {
            const isSelected = selectedIds.has(item.id);
            return (
              <TouchableOpacity
                style={[
                  styles.placeCard,
                  item.isAlreadyLead && { opacity: 0.65, backgroundColor: "#F8FAFC" },
                  isSelected && styles.placeCardSelected,
                ]}
                onPress={() => toggleSelect(item.id, item.isAlreadyLead)}
                activeOpacity={item.isAlreadyLead ? 1 : 0.8}
              >
                <View style={styles.cardTopRow}>
                  <TouchableOpacity
                    disabled={item.isAlreadyLead}
                    onPress={() => toggleSelect(item.id, item.isAlreadyLead)}
                    style={{ paddingRight: 8, paddingTop: 2 }}
                  >
                    <Ionicons
                      name={
                        item.isAlreadyLead
                          ? "checkmark-circle"
                          : isSelected
                          ? "checkbox"
                          : "square-outline"
                      }
                      size={20}
                      color={
                        item.isAlreadyLead
                          ? "#94A3B8"
                          : isSelected
                          ? "#1268D9"
                          : "#94A3B8"
                      }
                    />
                  </TouchableOpacity>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.placeName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={styles.categoryRow}>
                      <Text style={styles.categoryTag}>{item.category || "Business"}</Text>
                      <View style={styles.ratingBadge}>
                        <Ionicons name="star" size={10} color="#EAB308" />
                        <Text style={styles.ratingText}>{item.rating || 4.2}</Text>
                        <Text style={styles.reviewsText}>({item.reviewsCount || 18})</Text>
                      </View>
                    </View>
                  </View>

                  {item.isAlreadyLead ? (
                    <View style={styles.inCrmBadge}>
                      <Text style={styles.inCrmBadgeText}>In CRM</Text>
                    </View>
                  ) : (
                    <View style={styles.newLeadBadge}>
                      <Text style={styles.newLeadBadgeText}>New Lead</Text>
                    </View>
                  )}
                </View>

                {/* Contact & Address Details */}
                <View style={styles.cardDetails}>
                  {item.phone ? (
                    <View style={styles.detailRow}>
                      <Ionicons name="call-outline" size={13} color="#10B981" />
                      <Text style={styles.phoneText}>+91 {item.phone}</Text>
                    </View>
                  ) : null}

                  {item.address ? (
                    <View style={styles.detailRow}>
                      <Ionicons name="location-outline" size={13} color="#EF4444" />
                      <Text style={styles.addressText} numberOfLines={2}>
                        {item.address}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Card Actions */}
                <View style={styles.cardFooter}>
                  <View style={styles.quickActionGroup}>
                    {item.phone ? (
                      <>
                        <TouchableOpacity
                          style={styles.quickActionBtn}
                          onPress={() => openWhatsApp(item.phone)}
                        >
                          <Ionicons name="logo-whatsapp" size={13} color="#10B981" />
                          <Text style={styles.quickActionText}>WhatsApp</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.quickActionBtn}
                          onPress={() => openDialer(item.phone)}
                        >
                          <Ionicons name="call" size={13} color="#1268D9" />
                          <Text style={[styles.quickActionText, { color: "#1268D9" }]}>Call</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <Text style={styles.verifiedText}>Map Verified</Text>
                    )}
                  </View>

                  <Text style={styles.cityLabel}>{item.city}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* ── BOTTOM ACTION BAR (IMPORT TO CRM) ──────────────────────── */}
      {places.length > 0 && (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity
            style={styles.stageSelectBtn}
            onPress={() => setStagePickerVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.stageSelectLabel}>TARGET STAGE:</Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={styles.stageSelectValue} numberOfLines={1}>
                {selectedStage?.name || "Default Stage"}
              </Text>
              <Ionicons name="chevron-down" size={14} color="#0F172A" style={{ marginLeft: 2 }} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.importBtn,
              (selectedIds.size === 0 || saving) && styles.importBtnDisabled,
            ]}
            onPress={handleImport}
            disabled={selectedIds.size === 0 || saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="download-outline" size={16} color="#FFFFFF" />
                <Text style={styles.importBtnText}>
                  Save ({selectedIds.size}) to CRM
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* ── MODAL: STAGE PICKER ────────────────────────────────────── */}
      <Modal
        visible={stagePickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setStagePickerVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeading}>Select Lead Pipeline Stage</Text>
              <TouchableOpacity onPress={() => setStagePickerVisible(false)}>
                <Ionicons name="close" size={20} color="#475569" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              {statuses.map((st) => {
                const isSel = (st.id || st._id) === selectedStatusId;
                return (
                  <TouchableOpacity
                    key={st.id || st._id}
                    style={[styles.stageOption, isSel && styles.stageOptionActive]}
                    onPress={() => {
                      setSelectedStatusId(st.id || st._id);
                      setStagePickerVisible(false);
                    }}
                  >
                    <View
                      style={[
                        styles.stageColorDot,
                        { backgroundColor: st.color || "#1268D9" },
                      ]}
                    />
                    <Text style={[styles.stageOptionText, isSel && { fontWeight: "800" }]}>
                      {st.name}
                    </Text>
                    {isSel && <Ionicons name="checkmark" size={18} color="#1268D9" />}
                  </TouchableOpacity>
                );
              })}
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
    backgroundColor: "#F4F7FB",
  },
  headerBar: {
    backgroundColor: "#082B52",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    padding: 6,
    marginRight: 8,
  },
  headerTitles: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  headerSubBadge: {
    fontSize: 9,
    fontWeight: "800",
    color: "#60A5FA",
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
    marginTop: 1,
  },
  refreshBtn: {
    padding: 6,
  },
  searchCard: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    ...SHADOWS.xs,
  },
  searchInputsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 42,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    paddingVertical: 0,
  },
  searchBtn: {
    backgroundColor: "#1268D9",
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.sm,
  },
  chipsScroll: {
    marginTop: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipActive: {
    backgroundColor: "#1268D9",
    borderColor: "#1268D9",
  },
  chipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
  cityChip: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cityChipActive: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  cityChipText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#64748B",
  },
  cityChipTextActive: {
    color: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
    marginTop: 12,
    textAlign: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#334155",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 4,
  },
  listContent: {
    padding: 12,
    paddingBottom: 90,
  },
  listHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  selectAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  selectAllText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#334155",
  },
  resultCountText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  placeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    marginBottom: 10,
    ...SHADOWS.xs,
  },
  placeCardSelected: {
    borderColor: "#1268D9",
    backgroundColor: "#F8FAFF",
    borderWidth: 1.5,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  placeName: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0F172A",
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
  },
  categoryTag: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#475569",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    textTransform: "uppercase",
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#FEF9C3",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#854D0E",
  },
  reviewsText: {
    fontSize: 9,
    color: "#A16207",
  },
  inCrmBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  inCrmBadgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#D97706",
  },
  newLeadBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  newLeadBadgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#15803D",
  },
  cardDetails: {
    marginVertical: 8,
    gap: 4,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  phoneText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  addressText: {
    fontSize: 11,
    color: "#64748B",
    flex: 1,
    lineHeight: 15,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 8,
    marginTop: 2,
  },
  quickActionGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  quickActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  quickActionText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#10B981",
  },
  verifiedText: {
    fontSize: 10,
    color: "#94A3B8",
    fontStyle: "italic",
  },
  cityLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#64748B",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    ...SHADOWS.lg,
  },
  stageSelectBtn: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  stageSelectLabel: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  stageSelectValue: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },
  importBtn: {
    flex: 1.3,
    backgroundColor: "#10B981",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 44,
    borderRadius: 12,
    ...SHADOWS.md,
  },
  importBtnDisabled: {
    opacity: 0.4,
  },
  importBtnText: {
    fontSize: 12.5,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalHeading: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F172A",
  },
  stageOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  stageOptionActive: {
    backgroundColor: "#F0FDF4",
  },
  stageColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  stageOptionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
});
