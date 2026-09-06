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
        halts: trailData.halts || [],
        employeeName: selectedEmployee?.name,
        startTime: trailData.startTime,
        endTime: trailData.endTime,
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

      // Auto-focus on active staff with GPS coordinates so map opens immediately on employee
      if (!selectedEmployee && validList.length > 0) {
        const bestEmp =
          validList.find((e) => (e.isOnline || e.trackingStatus === "active") && e.latitude && e.longitude) ||
          validList.find((e) => e.latitude && e.longitude) ||
          validList[0];
        if (bestEmp) {
          setSelectedEmployee(bestEmp);
        }
      }

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
      }, 4000); // 4s auto-refresh for real-time live map
      return () => clearInterval(interval);
    }, [mapReady, viewMode])
  );

  const getDateValue = (filter) => {
    const d = new Date();
    if (filter === "yesterday") {
      d.setDate(d.getDate() - 1);
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
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
          halts: data.halts || [],
          employeeName: selectedEmployee?.name,
          startTime: data.startTime,
          endTime: data.endTime,
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
      const target =
        selectedEmployee?.latitude
          ? selectedEmployee
          : employees.find((e) => (e.isOnline || e.trackingStatus === "active") && e.latitude && e.longitude) ||
            employees.find((e) => e.latitude && e.longitude) ||
            employees[0];
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

  const formatName = (str) => {
    if (!str) return "Employee";
    return str
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  };

  const liveTrackedCount = employees.filter((e) => e.isOnline && e.latitude).length;

  const getLeafletHTML = () => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
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
            background: #1E293B;
            border: 3px solid #10B981;
            box-shadow: 0 4px 16px rgba(0,0,0,0.45);
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .avatar-bubble.online {
            border-color: #10B981;
          }
          .avatar-bubble.offline {
            border-color: #94A3B8;
            opacity: 0.9;
          }
          .avatar-bubble.selected {
            border-color: #2563EB;
            box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.4), 0 6px 20px rgba(0,0,0,0.6);
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
            letter-spacing: 0.5px;
          }
          .status-dot {
            position: absolute;
            bottom: 1px;
            right: 1px;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            border: 2px solid #FFFFFF;
            background: #10B981;
          }
          .status-dot.offline {
            background: #94A3B8;
          }
          .endpoint-marker {
            width: 34px;
            height: 34px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #FFFFFF;
            font-weight: 800;
            font-size: 14px;
            box-shadow: 0 4px 14px rgba(0,0,0,0.5);
            border: 2.5px solid #FFFFFF;
          }
          .leaflet-popup-content-wrapper {
            background: #0F172A;
            color: #FFFFFF;
            border-radius: 14px;
            padding: 6px 8px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.6);
            border: 1px solid #334155;
          }
          .leaflet-popup-tip {
            background: #0F172A;
          }
          .popup-name {
            font-size: 14px;
            font-weight: 800;
            color: #FFFFFF;
          }
          .popup-sub {
            font-size: 11px;
            color: #94A3B8;
            margin-top: 2px;
          }
          .popup-speed {
            font-size: 11.5px;
            font-weight: 800;
            color: #10B981;
            margin-top: 5px;
          }
          .popup-time {
            font-size: 10.5px;
            color: #64748B;
            margin-top: 3px;
          }
          .halt-marker {
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: #F59E0B;
            border: 2px solid #FFFFFF;
            color: #FFFFFF;
            font-size: 10px;
            font-weight: 900;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
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
            
            var bubbleClass = 'avatar-bubble ' + (isOnline ? 'online' : 'offline') + (isSelected ? ' selected' : '');
            var dotClass = 'status-dot ' + (isOnline ? 'online' : 'offline');

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

            if (bounds.length > 0) {
              var selectedEmp = (employees || []).find(function(e) { return e._id === selectedId; });
              if (selectedEmp && selectedEmp.latitude && selectedEmp.longitude) {
                map.setView([selectedEmp.latitude, selectedEmp.longitude], 16);
              } else if (bounds.length === 1) {
                map.setView(bounds[0], 16);
              } else {
                map.fitBounds(bounds, { padding: [70, 70], maxZoom: 17 });
              }
            }
          }

          function calculateBearing(lat1, lon1, lat2, lon2) {
            var dLon = (lon2 - lon1) * Math.PI / 180;
            var lat1Rad = lat1 * Math.PI / 180;
            var lat2Rad = lat2 * Math.PI / 180;
            var y = Math.sin(dLon) * Math.cos(lat2Rad);
            var x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
            var brng = Math.atan2(y, x) * 180 / Math.PI;
            return (brng + 360) % 360;
          }

          function renderTrail(trail, employeeName, halts, startTime, endTime) {
            trailLayer.clearLayers();
            if (!trail || trail.length === 0) return;

            var latlngs = trail.map(function(p) { return [p.latitude, p.longitude]; });

            var glowLine = L.polyline(latlngs, {
              color: '#3B82F6',
              weight: 8,
              opacity: 0.35,
              lineCap: 'round',
              lineJoin: 'round'
            });
            trailLayer.addLayer(glowLine);

            var polyline = L.polyline(latlngs, {
              color: '#2563EB',
              weight: 4.5,
              opacity: 0.95,
              lineCap: 'round',
              lineJoin: 'round'
            });
            trailLayer.addLayer(polyline);

            var arrowInterval = Math.max(1, Math.floor(trail.length / 15));
            for (var i = 0; i < trail.length - 1; i += arrowInterval) {
              var p1 = trail[i];
              var p2 = trail[i + 1];
              var bearing = calculateBearing(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
              var arrowIcon = L.divIcon({
                className: 'custom-leaflet-marker',
                html: '<div style="transform: rotate(' + bearing + 'deg); font-size:12px; color:#FFFFFF; text-shadow:0 1px 3px rgba(0,0,0,0.8); line-height:12px;">➤</div>',
                iconSize: [14, 14],
                iconAnchor: [7, 7]
              });
              trailLayer.addLayer(L.marker([p1.latitude, p1.longitude], { icon: arrowIcon }));
            }

            (halts || []).forEach(function(halt, idx) {
              var haltIcon = L.divIcon({
                className: 'custom-leaflet-marker',
                html: '<div class="halt-marker">H' + (idx + 1) + '</div>',
                iconSize: [22, 22],
                iconAnchor: [11, 11]
              });
              var haltMarker = L.marker([halt.latitude, halt.longitude], { icon: haltIcon });
              haltMarker.bindPopup('<b style="color:#F59E0B;">⏸️ Halt #' + (idx + 1) + '</b><br/>Duration: ' + halt.durationMinutes + ' min');
              trailLayer.addLayer(haltMarker);
            });

            var startPt = trail[0];
            var startIcon = L.divIcon({
              className: 'custom-leaflet-marker',
              html: '<div class="endpoint-marker" style="background:#10B981;">🏁</div>',
              iconSize: [34, 34],
              iconAnchor: [17, 17]
            });
            var startMarker = L.marker([startPt.latitude, startPt.longitude], { icon: startIcon });
            var startT = startPt.timestamp ? new Date(startPt.timestamp).toLocaleTimeString() : (startTime ? new Date(startTime).toLocaleTimeString() : 'Start');
            startMarker.bindPopup('<b style="color:#10B981;">🏁 Route Start Point</b><br/>⏱️ ' + startT);
            trailLayer.addLayer(startMarker);

            if (trail.length > 1) {
              var endPt = trail[trail.length - 1];
              var endIcon = L.divIcon({
                className: 'custom-leaflet-marker',
                html: '<div class="endpoint-marker" style="background:#EF4444;">📍</div>',
                iconSize: [34, 34],
                iconAnchor: [17, 17]
              });
              var endMarker = L.marker([endPt.latitude, endPt.longitude], { icon: endIcon });
              var endT = endPt.timestamp ? new Date(endPt.timestamp).toLocaleTimeString() : (endTime ? new Date(endTime).toLocaleTimeString() : 'Current');
              endMarker.bindPopup('<b style="color:#EF4444;">📍 Current Position</b><br/>⏱️ ' + endT);
              trailLayer.addLayer(endMarker);
            }

            if (latlngs.length === 1) {
              map.setView(latlngs[0], 16);
            } else if (latlngs.length > 1) {
              map.fitBounds(latlngs, { padding: [80, 80], maxZoom: 17 });
            }
          }

          window.addEventListener('message', function(e) { handleMessage(e.data); });
          document.addEventListener('message', function(e) { handleMessage(e.data); });

          function handleMessage(raw) {
            try {
              var data = typeof raw === 'string' ? JSON.parse(raw) : raw;
              if (data.type === 'UPDATE_EMPLOYEES') {
                renderEmployees(data.employees || [], data.selectedId);
              } else if (data.type === 'UPDATE_TRAIL') {
                renderTrail(data.trail || [], data.employeeName, data.halts || [], data.startTime, data.endTime);
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

          function notifyReady() {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
            } else {
              setTimeout(notifyReady, 100);
            }
          }
          notifyReady();
        </script>
      </body>
      </html>
    `;
  };

  const topInset = Platform.OS === "ios" ? 54 : (StatusBar.currentHeight || 28) + 12;

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent={true}
      />

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
        onLoadEnd={() => {
          setMapReady(true);
          if (viewMode === "live" && employees.length > 0) {
            postToMap({
              type: "UPDATE_EMPLOYEES",
              employees: employees,
              selectedId: selectedEmployee?._id,
            });
          }
        }}
        injectedJavaScript={`
          (function() {
            function tryNotify() {
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
              } else {
                setTimeout(tryNotify, 100);
              }
            }
            tryNotify();
          })();
          true;
        `}
        renderLoading={() => (
          <View style={styles.mapLoadingOverlay}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.mapLoadingText}>Loading Satellite Radar...</Text>
          </View>
        )}
      />

      {/* ── Top Floating Navigation & Mode Bar ──────────────────────────── */}
      <View style={[styles.topFloatHeader, { top: topInset }]}>
        <View style={styles.topHeaderRow}>
          <TouchableOpacity
            style={styles.iconCircleBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>

          <View style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>Live Location Radar</Text>
            <View style={styles.liveIndicatorRow}>
              <View
                style={[
                  styles.livePulseDot,
                  { backgroundColor: liveTrackedCount > 0 ? "#10B981" : "#94A3B8" },
                ]}
              />
              <Text
                style={[
                  styles.liveIndicatorText,
                  { color: liveTrackedCount > 0 ? "#10B981" : "#64748B" },
                ]}
              >
                {liveTrackedCount > 0
                  ? `${liveTrackedCount} Staff Online`
                  : `${employees.length} Staff Monitored`}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.iconCircleBtn}
            onPress={() => fetchLiveLocations(true)}
            activeOpacity={0.7}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : (
              <Ionicons name="refresh" size={19} color="#2563EB" />
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
              style={{ marginRight: 6 }}
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
              style={{ marginRight: 6 }}
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
      <View style={[styles.mapFloatingActions, { top: topInset + 120 }]}>
        <TouchableOpacity
          style={styles.floatActionBtn}
          onPress={toggleMapType}
          activeOpacity={0.8}
        >
          <Ionicons
            name={mapType === "satellite" ? "map-outline" : "globe-outline"}
            size={21}
            color="#2563EB"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.floatActionBtn}
          onPress={handleRecenter}
          activeOpacity={0.8}
        >
          <Ionicons name="locate" size={21} color="#2563EB" />
        </TouchableOpacity>
      </View>

      {/* ── Bottom Floating Card / Carousel ─────────────────────────────── */}
      <View style={styles.bottomSheetCard}>
        <View style={styles.sheetHandle} />

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
                <Text style={styles.metricVal}>{trailData.distanceText || `${trailData.distanceKm} km`}</Text>
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

        {/* Employee Carousel Header */}
        <View style={styles.sheetHeaderRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="people-outline" size={16} color="#2563EB" />
            <Text style={styles.carouselSectionTitle}>
              {viewMode === "live"
                ? "ACTIVE FIELD STAFF"
                : `TRAIL: ${selectedEmployee ? formatName(selectedEmployee.name) : "SELECT STAFF"}`}
            </Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{employees.length}</Text>
            </View>
          </View>
          {viewMode === "live" && (
            <Text style={styles.sheetHeaderSub}>Tap to focus map</Text>
          )}
        </View>

        {loadingLive && employees.length === 0 ? (
          <View style={styles.loadingCarousel}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={styles.loadingCarouselText}>Detecting field locations...</Text>
          </View>
        ) : employees.length === 0 ? (
          <View style={styles.emptyCarousel}>
            <Ionicons name="location-outline" size={24} color="#94A3B8" />
            <Text style={styles.emptyCarouselText}>No staff location tracked today yet.</Text>
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

                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.empName} numberOfLines={1}>
                        {formatName(emp.name)}
                      </Text>
                      <View style={styles.roleTag}>
                        <Text style={styles.empRole} numberOfLines={1}>
                          {emp.designation || emp.department || "Staff"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.empCardBottom}>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: isOnline
                            ? "rgba(16, 185, 129, 0.12)"
                            : "rgba(100, 116, 139, 0.1)",
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDotSmall,
                          { backgroundColor: isOnline ? "#10B981" : "#94A3B8" },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusPillText,
                          { color: isOnline ? "#059669" : "#64748B" },
                        ]}
                      >
                        {isOnline ? "Active" : "Idle / Offline"}
                      </Text>
                    </View>

                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                      {emp.todayDistanceText ? (
                        <View style={styles.todayDistanceBadge}>
                          <Text style={styles.todayDistanceText}>
                            🛣️ {emp.todayDistanceText}
                          </Text>
                        </View>
                      ) : null}
                      {emp.speed > 0 ? (
                        <Text style={styles.empSpeedText}>{emp.speed} km/h</Text>
                      ) : null}
                    </View>
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
    left: 14,
    right: 14,
    zIndex: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  topHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
    fontSize: 15.5,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  liveIndicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    gap: 6,
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#10B981",
  },
  liveIndicatorText: {
    fontSize: 11,
    fontWeight: "700",
  },
  modeSegment: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    padding: 3.5,
    marginTop: 12,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 11,
  },
  segmentBtnActive: {
    backgroundColor: "#2563EB",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  segmentTextActive: {
    color: "#FFFFFF",
  },
  mapFloatingActions: {
    position: "absolute",
    right: 16,
    zIndex: 9,
    gap: 12,
  },
  floatActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  bottomSheetCard: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 28 : 16,
    left: 14,
    right: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sheetHandle: {
    width: 38,
    height: 4.5,
    borderRadius: 2.5,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 10,
  },
  sheetHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  carouselSectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: 0.6,
  },
  countBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#2563EB",
  },
  sheetHeaderSub: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#64748B",
  },
  trailControlRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  trailDateChips: {
    flexDirection: "row",
    gap: 6,
  },
  dateChip: {
    paddingHorizontal: 12,
    paddingVertical: 5.5,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  dateChipActive: {
    backgroundColor: "rgba(37, 99, 235, 0.12)",
    borderColor: "rgba(37, 99, 235, 0.4)",
  },
  dateChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  dateChipTextActive: {
    color: "#2563EB",
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
    fontSize: 13,
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
    height: 18,
    backgroundColor: "#E2E8F0",
  },
  carouselScroll: {
    gap: 12,
    paddingRight: 10,
  },
  employeeCard: {
    width: 220,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    padding: 12,
    gap: 10,
  },
  employeeCardSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  empCardTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  empAvatarBox: {
    position: "relative",
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  empAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
  },
  empInitials: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  onlineDotBadge: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  empName: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 2,
  },
  roleTag: {
    alignSelf: "flex-start",
  },
  empRole: {
    fontSize: 10.5,
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
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  empSpeedText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#2563EB",
  },
  todayDistanceBadge: {
    backgroundColor: "rgba(37, 99, 235, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.2)",
  },
  todayDistanceText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#2563EB",
  },
  loadingCarousel: {
    paddingVertical: 22,
    alignItems: "center",
    gap: 8,
  },
  loadingCarouselText: {
    fontSize: 11.5,
    color: "#64748B",
    fontWeight: "600",
  },
  emptyCarousel: {
    paddingVertical: 18,
    alignItems: "center",
    gap: 6,
  },
  emptyCarouselText: {
    fontSize: 11.5,
    color: "#94A3B8",
    fontWeight: "600",
  },
});

export default EmployeeLocationTrackingScreen;
