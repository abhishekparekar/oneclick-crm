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
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import {
  getLiveEmployeeLocationsApi,
  getEmployeeLocationTrailApi,
} from "../../api/locationService";
import { COLORS } from "../../theme/tokens";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const EmployeeLocationTrackingScreen = ({ navigation }) => {
  const webViewRef = useRef(null);

  // Mode: "live" (all fleet) or "trail" (selected employee route)
  const [viewMode, setViewMode] = useState("live");
  const [mapType, setMapType] = useState("satellite"); // satellite or streets
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loadingLive, setLoadingLive] = useState(true);
  const [loadingTrail, setLoadingTrail] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Trail state
  const [trailData, setTrailData] = useState({
    trail: [],
    distanceKm: 0,
    totalPoints: 0,
  });
  const [selectedDateFilter, setSelectedDateFilter] = useState("today"); // today, yesterday

  // Helper to post messages into the Leaflet WebView
  const postToMap = (data) => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify(data));
    }
  };

  // Sync state to WebView when map is ready or employees change
  useEffect(() => {
    if (!mapReady) return;

    if (viewMode === "live") {
      postToMap({
        type: "UPDATE_EMPLOYEES",
        employees: employees,
        selectedId: selectedEmployee?._id,
      });
    } else if (viewMode === "trail" && trailData.trail) {
      postToMap({
        type: "UPDATE_TRAIL",
        trail: trailData.trail,
        employeeName: selectedEmployee?.name,
      });
    }
  }, [mapReady, employees, selectedEmployee, viewMode, trailData]);

  // Fetch live employee locations
  const fetchLiveLocations = async (silent = false) => {
    try {
      if (!silent) setLoadingLive(true);
      else setRefreshing(true);

      const res = await getLiveEmployeeLocationsApi();
      const list = res.data?.data || res.data || [];
      const validList = Array.isArray(list) ? list : [];
      setEmployees(validList);

      if (mapReady && viewMode === "live") {
        postToMap({
          type: "UPDATE_EMPLOYEES",
          employees: validList,
          selectedId: selectedEmployee?._id,
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
      }, 15000); // 15s auto-refresh
      return () => clearInterval(interval);
    }, [mapReady, viewMode])
  );

  const getDateValue = (filter) => {
    const d = new Date();
    if (filter === "yesterday") {
      d.setDate(d.getDate() - 1);
    }
    return d.toISOString().split("T")[0];
  };

  // Fetch route trail when employee & date selected
  const fetchTrailHistory = async (empId, dateStr) => {
    if (!empId) return;
    try {
      setLoadingTrail(true);
      const res = await getEmployeeLocationTrailApi(empId, dateStr);
      const data = res.data?.data || { trail: [], distanceKm: 0, totalPoints: 0 };
      setTrailData(data);

      if (mapReady) {
        postToMap({
          type: "UPDATE_TRAIL",
          trail: data.trail || [],
          employeeName: selectedEmployee?.name,
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
    if (emp.latitude && emp.longitude) {
      postToMap({
        type: "CENTER_COORDS",
        latitude: emp.latitude,
        longitude: emp.longitude,
        zoom: 17,
      });
    }
    if (viewMode === "trail") {
      fetchTrailHistory(emp._id, getDateValue(selectedDateFilter));
    }
  };

  const handleModeSwitch = (mode) => {
    setViewMode(mode);
    if (mode === "trail") {
      const target = selectedEmployee || employees[0];
      if (target) {
        setSelectedEmployee(target);
        fetchTrailHistory(target._id, getDateValue(selectedDateFilter));
      }
    } else if (mode === "live") {
      fetchLiveLocations();
    }
  };

  const handleDateChange = (filter) => {
    setSelectedDateFilter(filter);
    if (selectedEmployee) {
      fetchTrailHistory(selectedEmployee._id, getDateValue(filter));
    }
  };

  const handleRecenter = () => {
    if (selectedEmployee && selectedEmployee.latitude) {
      postToMap({
        type: "CENTER_COORDS",
        latitude: selectedEmployee.latitude,
        longitude: selectedEmployee.longitude,
        zoom: 17,
      });
    } else {
      const validCoords = employees
        .filter((e) => e.latitude && e.longitude)
        .map((e) => [e.latitude, e.longitude]);
      if (validCoords.length > 0) {
        postToMap({
          type: "FIT_BOUNDS",
          bounds: validCoords,
        });
      }
    }
  };

  const toggleMapType = () => {
    const nextType = mapType === "satellite" ? "streets" : "satellite";
    setMapType(nextType);
    postToMap({
      type: "TOGGLE_MAP_TYPE",
      mapType: nextType,
    });
  };

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "MAP_READY") {
        setMapReady(true);
        postToMap({
          type: "UPDATE_EMPLOYEES",
          employees: employees,
          selectedId: selectedEmployee?._id,
        });
      } else if (data.type === "SELECT_EMPLOYEE") {
        const found = employees.find((e) => e._id === data.employeeId);
        if (found) {
          setSelectedEmployee(found);
          if (viewMode === "trail") {
            fetchTrailHistory(found._id, getDateValue(selectedDateFilter));
          }
        }
      }
    } catch (e) {
      console.warn("[LocationTracking] WebView message parsing error:", e);
    }
  };

  const liveTrackedCount = employees.filter((e) => e.isOnline && e.latitude).length;

  const getLeafletHTML = () => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
          html, body, #map {
            height: 100%;
            margin: 0;
            padding: 0;
            background-color: #0F172A;
          }
          .custom-leaflet-marker {
            background: transparent;
            border: none;
          }
          .avatar-bubble {
            position: relative;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: #0F172A;
            border: 3.5px solid #10B981;
            box-shadow: 0 4px 14px rgba(0,0,0,0.55);
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            cursor: pointer;
          }
          .avatar-bubble.offline {
            border-color: #94A3B8;
            opacity: 0.85;
          }
          .avatar-bubble.selected {
            border-color: #F59E0B;
            border-width: 4px;
            transform: scale(1.15);
          }
          .avatar-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .avatar-initials {
            color: #FFFFFF;
            font-size: 13px;
            font-weight: 800;
            font-family: sans-serif;
          }
          .status-dot {
            position: absolute;
            bottom: 0;
            right: 0;
            width: 13px;
            height: 13px;
            border-radius: 50%;
            border: 2.5px solid #FFFFFF;
            background: #10B981;
          }
          .status-dot.offline {
            background: #94A3B8;
          }
          .endpoint-marker {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #FFFFFF;
            font-weight: 800;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            border: 2.5px solid #FFFFFF;
          }
          .leaflet-popup-content-wrapper {
            background: #0F172A;
            color: #FFFFFF;
            border-radius: 12px;
            padding: 4px 6px;
            box-shadow: 0 6px 22px rgba(0,0,0,0.5);
          }
          .leaflet-popup-tip {
            background: #0F172A;
          }
          .popup-name {
            font-size: 13.5px;
            font-weight: 800;
            color: #FFFFFF;
          }
          .popup-sub {
            font-size: 11px;
            color: #94A3B8;
            margin-top: 1px;
          }
          .popup-speed {
            font-size: 11px;
            font-weight: 800;
            color: #10B981;
            margin-top: 4px;
          }
          .popup-time {
            font-size: 10px;
            color: #64748B;
            margin-top: 2px;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map;
          var tileLayer;
          var markersLayer = L.layerGroup();
          var trailLayer = L.layerGroup();
          var currentMapType = 'satellite';

          map = L.map('map', {
            zoomControl: false,
            attributionControl: false
          }).setView([18.5204, 73.8567], 15);

          setTiles('satellite');
          markersLayer.addTo(map);
          trailLayer.addTo(map);

          function setTiles(type) {
            currentMapType = type;
            if (tileLayer) map.removeLayer(tileLayer);
            if (type === 'satellite') {
              tileLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
                maxZoom: 20
              }).addTo(map);
            } else {
              tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19
              }).addTo(map);
            }
          }

          function createAvatarIcon(emp, isSelected) {
            var isOnline = emp.isOnline;
            var initials = (emp.name || 'E').slice(0, 2).toUpperCase();
            var avatarHtml = emp.avatar 
              ? '<img src="' + emp.avatar + '" class="avatar-img" />'
              : '<span class="avatar-initials">' + initials + '</span>';
            
            var bubbleClass = 'avatar-bubble' + (isOnline ? '' : ' offline') + (isSelected ? ' selected' : '');
            var dotClass = 'status-dot' + (isOnline ? '' : ' offline');

            var html = '<div class="' + bubbleClass + '">' + avatarHtml + '<div class="' + dotClass + '"></div></div>';

            return L.divIcon({
              className: 'custom-leaflet-marker',
              html: html,
              iconSize: [44, 44],
              iconAnchor: [22, 22],
              popupAnchor: [0, -24]
            });
          }

          function renderEmployees(employees, selectedId) {
            markersLayer.clearLayers();
            var bounds = [];

            (employees || []).forEach(function(emp) {
              if (!emp.latitude || !emp.longitude) return;
              var isSelected = selectedId === emp._id;
              var icon = createAvatarIcon(emp, isSelected);
              var marker = L.marker([emp.latitude, emp.longitude], { icon: icon });

              var popup = '<div style="font-family:sans-serif; padding:4px 2px;">' +
                '<div class="popup-name">' + (emp.name || 'Employee') + '</div>' +
                '<div class="popup-sub">' + (emp.designation || emp.department || 'Staff') + '</div>' +
                (emp.speed > 0 ? '<div class="popup-speed">⚡ Speed: ' + emp.speed + ' km/h</div>' : '') +
                '<div class="popup-time">⏱️ ' + (emp.lastUpdated ? new Date(emp.lastUpdated).toLocaleTimeString() : 'Recent') + '</div>' +
              '</div>';

              marker.bindPopup(popup);
              marker.on('click', function() {
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'SELECT_EMPLOYEE',
                    employeeId: emp._id
                  }));
                }
              });

              markersLayer.addLayer(marker);
              bounds.push([emp.latitude, emp.longitude]);
            });

            if (bounds.length > 0 && !selectedId) {
              map.fitBounds(bounds, { padding: [70, 70], maxZoom: 17 });
            }
          }

          function renderTrail(trail, employeeName) {
            trailLayer.clearLayers();
            markersLayer.clearLayers();
            if (!trail || trail.length === 0) return;

            var latlngs = trail.map(function(pt) {
              return [pt.latitude, pt.longitude];
            });

            var polyline = L.polyline(latlngs, {
              color: '#3B82F6',
              weight: 5,
              opacity: 0.95
            });
            trailLayer.addLayer(polyline);

            // Start marker
            var startPt = trail[0];
            var startIcon = L.divIcon({
              className: 'custom-leaflet-marker',
              html: '<div class="endpoint-marker" style="background:#10B981;">🏁</div>',
              iconSize: [32, 32],
              iconAnchor: [16, 16]
            });
            var startMarker = L.marker([startPt.latitude, startPt.longitude], { icon: startIcon });
            startMarker.bindPopup('<b style="color:#10B981;">Route Start</b><br/>' + (startPt.timestamp ? new Date(startPt.timestamp).toLocaleTimeString() : ''));
            trailLayer.addLayer(startMarker);

            // End marker
            if (trail.length > 1) {
              var endPt = trail[trail.length - 1];
              var endIcon = L.divIcon({
                className: 'custom-leaflet-marker',
                html: '<div class="endpoint-marker" style="background:#EF4444;">📍</div>',
                iconSize: [32, 32],
                iconAnchor: [16, 16]
              });
              var endMarker = L.marker([endPt.latitude, endPt.longitude], { icon: endIcon });
              endMarker.bindPopup('<b style="color:#EF4444;">Current Position</b><br/>' + (endPt.timestamp ? new Date(endPt.timestamp).toLocaleTimeString() : ''));
              trailLayer.addLayer(endMarker);
            }

            map.fitBounds(latlngs, { padding: [80, 80], maxZoom: 17 });
          }

          window.addEventListener('message', function(e) { handleMessage(e.data); });
          document.addEventListener('message', function(e) { handleMessage(e.data); });

          function handleMessage(raw) {
            try {
              var data = typeof raw === 'string' ? JSON.parse(raw) : raw;
              if (data.type === 'UPDATE_EMPLOYEES') {
                renderEmployees(data.employees || [], data.selectedId);
              } else if (data.type === 'UPDATE_TRAIL') {
                renderTrail(data.trail || [], data.employeeName);
              } else if (data.type === 'CENTER_COORDS') {
                map.flyTo([data.latitude, data.longitude], data.zoom || 17, { duration: 0.8 });
              } else if (data.type === 'FIT_BOUNDS') {
                if (data.bounds && data.bounds.length > 0) {
                  map.fitBounds(data.bounds, { padding: [70, 70], maxZoom: 17 });
                }
              } else if (data.type === 'TOGGLE_MAP_TYPE') {
                setTiles(data.mapType);
              }
            } catch (err) {
              console.error(err);
            }
          }

          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
          }
        </script>
      </body>
      </html>
    `;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Main Leaflet Satellite Map View (WebView) ────────────────────── */}
      <WebView
        ref={webViewRef}
        style={styles.map}
        originWhitelist={["*"]}
        source={{ html: getLeafletHTML() }}
        onMessage={handleWebViewMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.mapLoadingOverlay}>
            <ActivityIndicator size="large" color="#1268D9" />
            <Text style={styles.mapLoadingText}>Loading Satellite Radar...</Text>
          </View>
        )}
      />

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

      {/* ── Floating Action Buttons (Recenter & Satellite Toggle) ────────── */}
      <View style={styles.mapFloatingActions}>
        <TouchableOpacity
          style={styles.floatActionBtn}
          onPress={toggleMapType}
          activeOpacity={0.8}
        >
          <Ionicons
            name={mapType === "satellite" ? "map-outline" : "globe-outline"}
            size={20}
            color="#1268D9"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.floatActionBtn}
          onPress={handleRecenter}
          activeOpacity={0.8}
        >
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
          {viewMode === "live"
            ? "ACTIVE FIELD EMPLOYEES"
            : `TRAIL: ${selectedEmployee ? selectedEmployee.name : "SELECT EMPLOYEE"}`}
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
    backgroundColor: "#0F172A",
  },
  map: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: "#0F172A",
  },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  mapLoadingText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
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
    alignItems: "center",
    justifyContent: "space-between",
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
});

export default EmployeeLocationTrackingScreen;
