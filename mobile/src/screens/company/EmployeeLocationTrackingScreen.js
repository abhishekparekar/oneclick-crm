import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions,
  Platform,
  StatusBar,
  Alert,
} from "react-native";
import MapView, { Marker, Polyline, Callout, PROVIDER_GOOGLE } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import { getLiveEmployeeLocationsApi, getEmployeeLocationTrailApi } from "../../api/locationService";
import { FONTS, COLORS } from "../../theme/tokens";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Default initial region (India central fallback)
const DEFAULT_REGION = {
  latitude: 18.5204,
  longitude: 73.8567,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const EmployeeLocationTrackingScreen = ({ navigation }) => {
  const mapRef = useRef(null);

  // Mode: "live" (all fleet) or "trail" (selected employee route)
  const [viewMode, setViewMode] = useState("live");
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loadingLive, setLoadingLive] = useState(true);
  const [loadingTrail, setLoadingTrail] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Trail state
  const [trailData, setTrailData] = useState({
    trail: [],
    distanceKm: 0,
    totalPoints: 0,
  });
  const [selectedDateFilter, setSelectedDateFilter] = useState("today"); // today, yesterday

  // Fetch live employee locations
  const fetchLiveLocations = async (silent = false) => {
    try {
      if (!silent) setLoadingLive(true);
      else setRefreshing(true);

      const res = await getLiveEmployeeLocationsApi();
      const list = res.data?.data || res.data || [];
      const validList = Array.isArray(list) ? list : [];
      setEmployees(validList);

      // If we have valid coordinates and no employee selected, fit map
      const activeCoords = validList
        .filter((e) => e.latitude && e.longitude)
        .map((e) => ({ latitude: e.latitude, longitude: e.longitude }));

      if (activeCoords.length > 0 && mapRef.current && !selectedEmployee) {
        mapRef.current.fitToCoordinates(activeCoords, {
          edgePadding: { top: 80, right: 50, bottom: 220, left: 50 },
          animated: true,
        });
      }
    } catch (err) {
      console.warn("[LocationTracking] Failed to fetch live locations:", err.message);
    } finally {
      setLoadingLive(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchLiveLocations();
      const interval = setInterval(() => {
        fetchLiveLocations(true);
      }, 20000); // 20s auto-refresh
      return () => clearInterval(interval);
    }, [])
  );

  // Fetch route trail when employee & date selected
  const fetchTrailHistory = async (empId, dateStr) => {
    if (!empId) return;
    try {
      setLoadingTrail(true);
      const res = await getEmployeeLocationTrailApi(empId, dateStr);
      const data = res.data?.data || { trail: [], distanceKm: 0, totalPoints: 0 };
      setTrailData(data);

      if (data.trail && data.trail.length > 0 && mapRef.current) {
        const coords = data.trail.map((pt) => ({
          latitude: pt.latitude,
          longitude: pt.longitude,
        }));
        mapRef.current.fitToCoordinates(coords, {
          edgePadding: { top: 90, right: 60, bottom: 240, left: 60 },
          animated: true,
        });
      }
    } catch (err) {
      console.warn("[LocationTracking] Trail fetch error:", err.message);
    } finally {
      setLoadingTrail(false);
    }
  };

  const handleSelectEmployee = (emp) => {
    setSelectedEmployee(emp);
    if (emp.latitude && emp.longitude && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: emp.latitude,
          longitude: emp.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        },
        800
      );
    }
    if (viewMode === "trail") {
      fetchTrailHistory(emp._id, getDateValue(selectedDateFilter));
    }
  };

  const handleModeSwitch = (mode) => {
    setViewMode(mode);
    if (mode === "trail" && selectedEmployee) {
      fetchTrailHistory(selectedEmployee._id, getDateValue(selectedDateFilter));
    } else if (mode === "live") {
      fetchLiveLocations();
    }
  };

  const getDateValue = (filter) => {
    const d = new Date();
    if (filter === "yesterday") {
      d.setDate(d.getDate() - 1);
    }
    return d.toISOString().split("T")[0];
  };

  const handleDateChange = (filter) => {
    setSelectedDateFilter(filter);
    if (selectedEmployee) {
      fetchTrailHistory(selectedEmployee._id, getDateValue(filter));
    }
  };

  const handleRecenter = () => {
    if (selectedEmployee && selectedEmployee.latitude) {
      mapRef.current?.animateToRegion(
        {
          latitude: selectedEmployee.latitude,
          longitude: selectedEmployee.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        },
        600
      );
    } else {
      const activeCoords = employees
        .filter((e) => e.latitude && e.longitude)
        .map((e) => ({ latitude: e.latitude, longitude: e.longitude }));

      if (activeCoords.length > 0) {
        mapRef.current?.fitToCoordinates(activeCoords, {
          edgePadding: { top: 80, right: 50, bottom: 220, left: 50 },
          animated: true,
        });
      }
    }
  };

  const liveTrackedCount = employees.filter((e) => e.isOnline && e.latitude).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Main Map View ───────────────────────────────────────────────── */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={DEFAULT_REGION}
        showsUserLocation={false}
        showsCompass={true}
        showsScale={true}
      >
        {/* Render Live Employee Markers */}
        {viewMode === "live" &&
          employees.map((emp) => {
            if (!emp.latitude || !emp.longitude) return null;
            const isSelected = selectedEmployee?._id === emp._id;
            const isOnline = emp.isOnline;

            return (
              <Marker
                key={emp._id}
                coordinate={{ latitude: emp.latitude, longitude: emp.longitude }}
                onPress={() => handleSelectEmployee(emp)}
                tracksViewChanges={false}
              >
                <View style={styles.markerWrapper}>
                  <View
                    style={[
                      styles.markerBubble,
                      isOnline ? styles.markerBubbleActive : styles.markerBubbleOffline,
                      isSelected && styles.markerBubbleSelected,
                    ]}
                  >
                    {emp.avatar ? (
                      <Image source={{ uri: emp.avatar }} style={styles.markerAvatar} />
                    ) : (
                      <Text style={styles.markerInitials}>
                        {(emp.name || "E").slice(0, 2).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View
                    style={[
                      styles.markerDot,
                      { backgroundColor: isOnline ? "#10B981" : "#94A3B8" },
                    ]}
                  />
                </View>

                <Callout tooltip>
                  <View style={styles.calloutCard}>
                    <Text style={styles.calloutName}>{emp.name}</Text>
                    <Text style={styles.calloutRole}>{emp.designation || emp.department}</Text>
                    {emp.speed > 0 ? (
                      <Text style={styles.calloutSpeed}>Speed: {emp.speed} km/h</Text>
                    ) : null}
                    <Text style={styles.calloutTime}>
                      {emp.lastUpdated ? new Date(emp.lastUpdated).toLocaleTimeString() : "Recent"}
                    </Text>
                  </View>
                </Callout>
              </Marker>
            );
          })}

        {/* Render Route Trail Polyline & Checkpoints */}
        {viewMode === "trail" && trailData.trail && trailData.trail.length > 0 && (
          <>
            <Polyline
              coordinates={trailData.trail.map((pt) => ({
                latitude: pt.latitude,
                longitude: pt.longitude,
              }))}
              strokeColor="#1268D9"
              strokeWidth={4}
              lineDashPattern={null}
            />

            {/* Start Marker */}
            {trailData.trail[0] && (
              <Marker
                coordinate={{
                  latitude: trailData.trail[0].latitude,
                  longitude: trailData.trail[0].longitude,
                }}
                title="Route Start"
              >
                <View style={[styles.endpointBadge, { backgroundColor: "#10B981" }]}>
                  <Ionicons name="flag" size={12} color="#FFFFFF" />
                </View>
              </Marker>
            )}

            {/* End Marker */}
            {trailData.trail.length > 1 && (
              <Marker
                coordinate={{
                  latitude: trailData.trail[trailData.trail.length - 1].latitude,
                  longitude: trailData.trail[trailData.trail.length - 1].longitude,
                }}
                title="Current / End Point"
              >
                <View style={[styles.endpointBadge, { backgroundColor: "#EF4444" }]}>
                  <Ionicons name="location" size={12} color="#FFFFFF" />
                </View>
              </Marker>
            )}
          </>
        )}
      </MapView>

      {/* ── Top Floating Navigation & Mode Bar ──────────────────────────── */}
      <View style={styles.topFloatHeader}>
        <View style={styles.topHeaderRow}>
          <TouchableOpacity
            style={styles.iconCircleBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>

          <View style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>Live Location Radar</Text>
            <View style={styles.liveIndicatorRow}>
              <View style={styles.livePulseDot} />
              <Text style={styles.liveIndicatorText}>
                {liveTrackedCount} Active Staff Online
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.iconCircleBtn}
            onPress={() => fetchLiveLocations(true)}
            activeOpacity={0.8}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#1268D9" />
            ) : (
              <Ionicons name="refresh" size={19} color="#1268D9" />
            )}
          </TouchableOpacity>
        </View>

        {/* Mode Segment Switch */}
        <View style={styles.modeSegment}>
          <TouchableOpacity
            style={[styles.segmentBtn, viewMode === "live" && styles.segmentBtnActive]}
            onPress={() => handleModeSwitch("live")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="navigate"
              size={14}
              color={viewMode === "live" ? "#FFFFFF" : "#64748B"}
              style={{ marginRight: 5 }}
            />
            <Text
              style={[
                styles.segmentText,
                viewMode === "live" && styles.segmentTextActive,
              ]}
            >
              Live Fleet View
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, viewMode === "trail" && styles.segmentBtnActive]}
            onPress={() => handleModeSwitch("trail")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="footsteps"
              size={14}
              color={viewMode === "trail" ? "#FFFFFF" : "#64748B"}
              style={{ marginRight: 5 }}
            />
            <Text
              style={[
                styles.segmentText,
                viewMode === "trail" && styles.segmentTextActive,
              ]}
            >
              Route Trail History
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Floating Map Action Buttons ─────────────────────────────────── */}
      <View style={styles.mapFloatingActions}>
        <TouchableOpacity style={styles.floatActionBtn} onPress={handleRecenter} activeOpacity={0.8}>
          <Ionicons name="locate" size={20} color="#1268D9" />
        </TouchableOpacity>
      </View>

      {/* ── Bottom Floating Card / Carousel ─────────────────────────────── */}
      <View style={styles.bottomSheetCard}>
        {viewMode === "trail" && (
          <View style={styles.trailControlRow}>
            <View style={styles.trailDateChips}>
              <TouchableOpacity
                style={[
                  styles.dateChip,
                  selectedDateFilter === "today" && styles.dateChipActive,
                ]}
                onPress={() => handleDateChange("today")}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.dateChipText,
                    selectedDateFilter === "today" && styles.dateChipTextActive,
                  ]}
                >
                  Today
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.dateChip,
                  selectedDateFilter === "yesterday" && styles.dateChipActive,
                ]}
                onPress={() => handleDateChange("yesterday")}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.dateChipText,
                    selectedDateFilter === "yesterday" && styles.dateChipTextActive,
                  ]}
                >
                  Yesterday
                </Text>
              </TouchableOpacity>
            </View>

            {/* Trail Metrics */}
            <View style={styles.trailMetricsBox}>
              <View style={styles.metricItem}>
                <Text style={styles.metricVal}>{trailData.distanceKm} km</Text>
                <Text style={styles.metricLbl}>Distance</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={styles.metricVal}>{trailData.totalPoints}</Text>
                <Text style={styles.metricLbl}>Pings</Text>
              </View>
            </View>
          </View>
        )}

        {/* Employee Carousel */}
        <Text style={styles.carouselSectionTitle}>
          {viewMode === "live" ? "ACTIVE FIELD EMPLOYEES" : "SELECT EMPLOYEE TO VIEW TRAIL"}
        </Text>

        {loadingLive && employees.length === 0 ? (
          <View style={styles.loadingCarousel}>
            <ActivityIndicator size="small" color="#1268D9" />
            <Text style={styles.loadingCarouselText}>Detecting field locations...</Text>
          </View>
        ) : employees.length === 0 ? (
          <View style={styles.emptyCarousel}>
            <Ionicons name="location-outline" size={24} color="#94A3B8" />
            <Text style={styles.emptyCarouselText}>No live staff tracked at this moment.</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselScroll}
          >
            {employees.map((emp) => {
              const isSelected = selectedEmployee?._id === emp._id;
              const isOnline = emp.isOnline;

              return (
                <TouchableOpacity
                  key={emp._id}
                  style={[
                    styles.employeeCard,
                    isSelected && styles.employeeCardSelected,
                  ]}
                  onPress={() => handleSelectEmployee(emp)}
                  activeOpacity={0.85}
                >
                  <View style={styles.empCardTop}>
                    <View style={styles.empAvatarBox}>
                      {emp.avatar ? (
                        <Image source={{ uri: emp.avatar }} style={styles.empAvatar} />
                      ) : (
                        <Text style={styles.empInitials}>
                          {(emp.name || "E").slice(0, 2).toUpperCase()}
                        </Text>
                      )}
                      <View
                        style={[
                          styles.onlineDotBadge,
                          { backgroundColor: isOnline ? "#10B981" : "#94A3B8" },
                        ]}
                      />
                    </View>

                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.empName} numberOfLines={1}>
                        {emp.name}
                      </Text>
                      <Text style={styles.empRole} numberOfLines={1}>
                        {emp.designation || emp.department || "Staff"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.empCardBottom}>
                    <View style={styles.statusPill}>
                      <Ionicons
                        name={isOnline ? "navigate" : "time-outline"}
                        size={11}
                        color={isOnline ? "#10B981" : "#64748B"}
                      />
                      <Text
                        style={[
                          styles.statusPillText,
                          { color: isOnline ? "#10B981" : "#64748B" },
                        ]}
                      >
                        {isOnline ? "Active" : "Idle / Offline"}
                      </Text>
                    </View>
                    {emp.speed > 0 ? (
                      <Text style={styles.empSpeedText}>{emp.speed} km/h</Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7FB",
  },
  map: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  topFloatHeader: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 25,
    left: 14,
    right: 14,
    zIndex: 10,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 18,
    padding: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  topHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleBox: {
    alignItems: "center",
    flex: 1,
  },
  headerTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  liveIndicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    gap: 5,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  liveIndicatorText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#10B981",
  },
  modeSegment: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 3,
    marginTop: 10,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    borderRadius: 9,
  },
  segmentBtnActive: {
    backgroundColor: "#1268D9",
    shadowColor: "#1268D9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#64748B",
  },
  segmentTextActive: {
    color: "#FFFFFF",
  },
  mapFloatingActions: {
    position: "absolute",
    right: 16,
    top: Platform.OS === "ios" ? 170 : 145,
    zIndex: 9,
    gap: 10,
  },
  floatActionBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  bottomSheetCard: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 24 : 14,
    left: 12,
    right: 12,
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderRadius: 20,
    padding: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  trailControlRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  trailDateChips: {
    flexDirection: "row",
    gap: 6,
  },
  dateChip: {
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  dateChipActive: {
    backgroundColor: "rgba(18, 104, 217, 0.12)",
    borderColor: "rgba(18, 104, 217, 0.4)",
  },
  dateChipText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#64748B",
  },
  dateChipTextActive: {
    color: "#1268D9",
  },
  trailMetricsBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metricItem: {
    alignItems: "center",
  },
  metricVal: {
    fontSize: 12.5,
    fontWeight: "900",
    color: "#0F172A",
  },
  metricLbl: {
    fontSize: 9,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
  },
  metricDivider: {
    width: 1,
    height: 16,
    backgroundColor: "#E2E8F0",
  },
  carouselSectionTitle: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 2,
  },
  carouselScroll: {
    gap: 10,
  },
  employeeCard: {
    width: 175,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 10,
    gap: 6,
  },
  employeeCardSelected: {
    borderColor: "#1268D9",
    backgroundColor: "#EFF6FF",
  },
  empCardTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  empAvatarBox: {
    position: "relative",
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1268D9",
    alignItems: "center",
    justifyContent: "center",
  },
  empAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  empInitials: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  onlineDotBadge: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  empName: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },
  empRole: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
  },
  empCardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  statusPillText: {
    fontSize: 9.5,
    fontWeight: "700",
  },
  empSpeedText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#1268D9",
  },
  loadingCarousel: {
    paddingVertical: 20,
    alignItems: "center",
    gap: 6,
  },
  loadingCarouselText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  emptyCarousel: {
    paddingVertical: 16,
    alignItems: "center",
    gap: 4,
  },
  emptyCarouselText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },
  markerWrapper: {
    alignItems: "center",
  },
  markerBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    backgroundColor: "#1268D9",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  markerBubbleActive: {
    borderColor: "#10B981",
  },
  markerBubbleOffline: {
    borderColor: "#94A3B8",
  },
  markerBubbleSelected: {
    borderColor: "#F59E0B",
    borderWidth: 3,
  },
  markerAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 19,
  },
  markerInitials: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  markerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: -2,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  calloutCard: {
    backgroundColor: "#0F172A",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
    minWidth: 110,
  },
  calloutName: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "800",
  },
  calloutRole: {
    color: "#94A3B8",
    fontSize: 9.5,
    fontWeight: "600",
  },
  calloutSpeed: {
    color: "#10B981",
    fontSize: 9.5,
    fontWeight: "700",
    marginTop: 2,
  },
  calloutTime: {
    color: "#64748B",
    fontSize: 8.5,
    marginTop: 2,
  },
  endpointBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
});

export default EmployeeLocationTrackingScreen;
