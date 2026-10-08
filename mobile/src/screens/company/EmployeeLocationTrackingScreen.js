import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  Modal,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import {
  getLiveEmployeeLocationsApi,
  getEmployeeLocationTrailApi,
} from "../../api/locationService";
import { useAuth } from "../../context/AuthContext";
import { useAppData } from "../../context/AppDataContext";
import { COLORS } from "../../theme/tokens";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const EmployeeLocationTrackingScreen = ({ navigation, route }) => {
  const webViewRef = useRef(null);
  const { user, hasPermission } = useAuth();
  const appData = useAppData ? useAppData() : null;
  const employeeData = appData?.employeeDashboard?.employee || user?.employee;
  const roleLower = (user?.role || "").toLowerCase();
  const isEmployee = roleLower === "employee" || roleLower === "team member";

  // Strict permission check
  const canAccessLocationTracking =
    !isEmployee ||
    hasPermission("locationTracking") ||
    hasPermission("location_tracking") ||
    hasPermission("location") ||
    Boolean(
      user?.isLocationTrackingEnabled ||
      user?.employee?.isLocationTrackingEnabled ||
      employeeData?.isLocationTrackingEnabled ||
      employeeData?.locationTrackingEnabled
    );

  // Authenticated Employee ID for self-only scope
  const myEmployeeId = employeeData?._id || user?.employeeId || user?.employee?._id || user?._id;

  // Mode: "live" (all fleet) or "trail" (selected employee route)
  const [viewMode, setViewMode] = useState("live");
  const [mapType, setMapType] = useState("satellite"); // satellite or streets
  const [employees, setEmployees] = useState([]);
  const [officeLocation, setOfficeLocation] = useState(null);
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
  const [selectedDateFilter, setSelectedDateFilter] = useState("today"); // today, yesterday, or YYYY-MM-DD
  const [statusTab, setStatusTab] = useState("all"); // "all" | "active" | "inactive"
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [serverStats, setServerStats] = useState({ total: 0, activeTracked: 0, inactive: 0 });

  const activeTrackedCount = employees.filter((e) => e.isTrackingActive).length;
  const inactiveCount = employees.filter((e) => !e.isTrackingActive).length;

  const filteredEmployees = employees.filter((emp) => {
    if (statusTab === "active") return Boolean(emp.isTrackingActive);
    if (statusTab === "inactive") return !emp.isTrackingActive;
    return true;
  });

  const pastDaysList = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;
      let label = "";
      if (i === 0) label = "Today";
      else if (i === 1) label = "Yesterday";
      else label = `${i} days ago`;
      const formatted = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      days.push({ key: i === 0 ? "today" : i === 1 ? "yesterday" : dateStr, dateStr, label, formatted });
    }
    return days;
  }, []);

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
        officeLocation: officeLocation,
        selectedId: selectedEmployee?._id,
      });
      const activeTrail = (trailData.roadTrail && trailData.roadTrail.length > 0)
        ? trailData.roadTrail
        : (trailData.cleanTrail && trailData.cleanTrail.length > 0)
        ? trailData.cleanTrail
        : trailData.trail;
      const isStationary = Boolean(
        trailData.isStationaryAllDay ||
        trailData.distanceKm === 0 ||
        (trailData.distanceMeters !== undefined && trailData.distanceMeters === 0) ||
        !activeTrail ||
        activeTrail.length <= 1
      );
      postToMap({
        type: "UPDATE_TRAIL",
        trail: activeTrail,
        halts: trailData.halts || [],
        employeeName: selectedEmployee?.name,
        startTime: trailData.startTime,
        endTime: trailData.endTime,
        isStationary: isStationary,
        officeLocation: officeLocation,
      });
    }
  }, [mapReady, employees, selectedEmployee, viewMode, trailData, officeLocation]);


  // Fetch live employee locations with date awareness
  const fetchLiveLocations = async (silent = false, customDate = null) => {
    try {
      if (!silent) setLoadingLive(true);
      else setRefreshing(true);

      const targetDate = customDate || getDateValue(selectedDateFilter);
      const res = await getLiveEmployeeLocationsApi({ date: targetDate });
      const list = res.data?.data || res.data || [];
      let validList = Array.isArray(list) ? list : [];
      const office = res.data?.officeLocation || list?.[0]?.officeLocation || null;
      if (office) setOfficeLocation(office);
      if (res.data?.stats) setServerStats(res.data.stats);

      // Strict self-only handling for Employee role
      if (isEmployee) {
        if (validList.length > 0) {
          const myEmp = validList[0];
          setSelectedEmployee(myEmp);
          setEmployees([myEmp]);
          fetchTrailHistory(myEmp._id, targetDate);

          if (mapReady) {
            postToMap({
              type: "UPDATE_EMPLOYEES",
              employees: [myEmp],
              officeLocation: office,
              selectedId: myEmp._id,
            });
            if (myEmp.latitude && myEmp.longitude) {
              postToMap({
                type: "CENTER_COORDS",
                latitude: myEmp.latitude,
                longitude: myEmp.longitude,
                zoom: 17,
              });
            } else if (office?.latitude && office?.longitude) {
              postToMap({
                type: "CENTER_COORDS",
                latitude: office.latitude,
                longitude: office.longitude,
                zoom: 16,
              });
            }
          }
          return;
        } else if (user) {
          const fallbackEmp = {
            _id: myEmployeeId,
            name: user.name || "My Location",
            email: user.email,
            department: user.departmentName || "General",
            designation: user.designationName || user.employee?.designation || "Staff",
            avatar: user.photo || user.avatar || user.profileImage || "",
            isOnline: false,
            isTrackingActive: false,
            trackingStatus: "inactive",
            latitude: null,
            longitude: null,
          };
          validList = [fallbackEmp];
        }
      }

      setEmployees(validList);

      if (!selectedEmployee && validList.length > 0) {
        const bestEmp =
          validList.find((e) => e.isTrackingActive && e.latitude && e.longitude) ||
          validList.find((e) => e.isTrackingActive) ||
          validList.find((e) => (e.isOnline || e.trackingStatus === "active") && e.latitude && e.longitude) ||
          validList.find((e) => e.latitude && e.longitude) ||
          validList[0];
        if (bestEmp) {
          setSelectedEmployee(bestEmp);
          if (viewMode === "trail" || selectedDateFilter !== "today") {
            fetchTrailHistory(bestEmp._id, targetDate);
          }
        }
      } else if (selectedEmployee && validList.length > 0) {
        const updated = validList.find((e) => String(e._id) === String(selectedEmployee._id));
        if (updated) {
          const isTargetPastDate = targetDate !== getDateValue("today");
          if (isTargetPastDate && !updated.isTrackingActive && !isEmployee) {
            const firstActive =
              validList.find((e) => e.isTrackingActive && e.latitude && e.longitude) ||
              validList.find((e) => e.isTrackingActive);
            if (firstActive) {
              setSelectedEmployee(firstActive);
              if (viewMode === "trail" || isTargetPastDate) {
                fetchTrailHistory(firstActive._id, targetDate);
              }
              return;
            }
          }
          setSelectedEmployee(updated);
          if (viewMode === "trail" || isTargetPastDate) {
            fetchTrailHistory(updated._id, targetDate);
          }
        }
      }

      if (mapReady && viewMode === "live") {
        postToMap({
          type: "UPDATE_EMPLOYEES",
          employees: validList,
          officeLocation: office,
          selectedId: selectedEmployee?._id || validList[0]?._id,
        });
      }
    } catch (err) {
      console.warn("[LocationTracking] Failed to fetch live locations:", err.message);
    } finally {
      setLoadingLive(false);
      setRefreshing(false);
    }
  };

  const getDateValue = (filter) => {
    if (filter && typeof filter === "string" && /^\d{4}-\d{2}-\d{2}$/.test(filter)) {
      return filter;
    }
    const d = new Date();
    if (filter === "yesterday") {
      d.setDate(d.getDate() - 1);
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getDisplayDateTitle = () => {
    const val = getDateValue(selectedDateFilter);
    const todayStr = getDateValue("today");
    if (selectedDateFilter === "today" || val === todayStr) return "Today";

    const yDate = new Date();
    yDate.setDate(yDate.getDate() - 1);
    const yStr = `${yDate.getFullYear()}-${String(yDate.getMonth() + 1).padStart(2, "0")}-${String(yDate.getDate()).padStart(2, "0")}`;
    if (selectedDateFilter === "yesterday" || val === yStr) return "Yesterday";

    const [y, m, d] = val.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    const now = new Date();
    const diffDays = Math.round(
      (new Date(now.getFullYear(), now.getMonth(), now.getDate()) - dateObj) / (24 * 60 * 60 * 1000)
    );
    const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
    return diffDays > 0 ? `${dayName} (${diffDays}d ago)` : dayName;
  };

  const stepDate = (dayOffset) => {
    const curVal = getDateValue(selectedDateFilter);
    const [y, m, d] = curVal.split("-").map(Number);
    const curDate = new Date(y, m - 1, d);
    curDate.setDate(curDate.getDate() + dayOffset);

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (curDate > today) return;

    const nextY = curDate.getFullYear();
    const nextM = String(curDate.getMonth() + 1).padStart(2, "0");
    const nextD = String(curDate.getDate()).padStart(2, "0");
    const nextStr = `${nextY}-${nextM}-${nextD}`;

    const todayStr = getDateValue("today");
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, "0")}-${String(yesterdayDate.getDate()).padStart(2, "0")}`;

    if (nextStr === todayStr) {
      handleDateChange("today");
    } else if (nextStr === yesterdayStr) {
      handleDateChange("yesterday");
    } else {
      handleDateChange(nextStr);
    }
  };

  // Fetch route trail when employee & date selected
  const fetchTrailHistory = async (empId, dateStr) => {
    const safeEmpId = isEmployee ? myEmployeeId : empId;
    if (!safeEmpId) return;
    try {
      setLoadingTrail(true);
      const res = await getEmployeeLocationTrailApi(safeEmpId, dateStr);
      const data = res.data?.data || { trail: [], distanceKm: 0, totalPoints: 0 };
      const office = res.data?.officeLocation || officeLocation;
      if (office && !officeLocation) setOfficeLocation(office);
      setTrailData(data);

      if (mapReady) {
        const activeTrail = (data.roadTrail && data.roadTrail.length > 0)
          ? data.roadTrail
          : (data.cleanTrail && data.cleanTrail.length > 0)
          ? data.cleanTrail
          : (data.trail || []);
        postToMap({
          type: "UPDATE_TRAIL",
          trail: activeTrail,
          halts: data.halts || [],
          employeeName: isEmployee ? (user?.name || "My Route") : selectedEmployee?.name,
          startTime: data.startTime,
          endTime: data.endTime,
          officeLocation: office,
        });
      }
    } catch (err) {
      console.warn("[LocationTracking] Trail fetch error:", err.message);
    } finally {
      setLoadingTrail(false);
      setRefreshing(false);
    }
  };

  // Manual refresh only - no auto interval polling
  const handleManualRefresh = () => {
    const targetDate = getDateValue(selectedDateFilter);
    fetchLiveLocations(true, targetDate);
    if (isEmployee) {
      if (viewMode === "trail" || selectedDateFilter !== "today") {
        fetchTrailHistory(myEmployeeId, targetDate);
      }
    } else if ((viewMode === "trail" || selectedDateFilter !== "today") && selectedEmployee?._id) {
      fetchTrailHistory(selectedEmployee._id, targetDate);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (isEmployee) {
        const targetDate = route?.params?.date || "today";
        setSelectedDateFilter(targetDate);
        fetchLiveLocations(true, getDateValue(targetDate));
      } else {
        const params = route?.params;
        if (params?.employeeId) {
          setViewMode("trail");
          const empId = typeof params.employeeId === "object" ? params.employeeId._id : params.employeeId;
          const targetDate = params.date || "today";
          setSelectedDateFilter(targetDate);
          const empName = params.employeeName || "Employee";
          setSelectedEmployee({ _id: empId, name: empName });
          fetchLiveLocations(true, getDateValue(targetDate));
          fetchTrailHistory(empId, getDateValue(targetDate));
        } else {
          fetchLiveLocations(false, getDateValue(selectedDateFilter));
        }
      }
      // Manual refresh only: NO setInterval auto-refresh
    }, [route?.params, isEmployee, myEmployeeId, user?.name])
  );

  const handleSelectEmployee = (emp) => {
    if (isEmployee && String(emp._id) !== String(myEmployeeId)) return;
    setSelectedEmployee(emp);
    const targetDate = getDateValue(selectedDateFilter);
    if (selectedDateFilter !== "today" && viewMode !== "trail") {
      setViewMode("trail");
    }
    if (viewMode === "trail" || selectedDateFilter !== "today") {
      fetchTrailHistory(emp._id, targetDate);
    }
    if (emp.latitude && emp.longitude) {
      postToMap({
        type: "CENTER_COORDS",
        latitude: emp.latitude,
        longitude: emp.longitude,
        zoom: 17,
      });
    } else if (officeLocation?.latitude && officeLocation?.longitude) {
      postToMap({
        type: "CENTER_COORDS",
        latitude: officeLocation.latitude,
        longitude: officeLocation.longitude,
        zoom: 16,
      });
    }
  };

  const handleModeSwitch = (mode) => {
    setViewMode(mode);
    const targetDate = getDateValue(selectedDateFilter);
    if (mode === "trail") {
      if (isEmployee) {
        fetchTrailHistory(myEmployeeId, targetDate);
      } else {
        const target =
          selectedEmployee?.latitude
            ? selectedEmployee
            : employees.find((e) => (e.isOnline || e.isTrackingActive) && e.latitude && e.longitude) ||
              employees.find((e) => e.latitude && e.longitude) ||
              employees[0];
        if (target) {
          setSelectedEmployee(target);
          fetchTrailHistory(target._id, targetDate);
        }
      }
    } else if (mode === "live") {
      fetchLiveLocations(false, targetDate);
    }
  };

  const handleDateChange = (filter) => {
    setSelectedDateFilter(filter);
    const targetDate = getDateValue(filter);
    const isToday = filter === "today" || targetDate === getDateValue("today");
    if (!isToday && viewMode !== "trail") {
      setViewMode("trail");
    }
    fetchLiveLocations(false, targetDate);
    const targetId = isEmployee ? myEmployeeId : selectedEmployee?._id;
    if (targetId) {
      fetchTrailHistory(targetId, targetDate);
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
        if (isEmployee && String(data.employeeId) !== String(myEmployeeId)) return;
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
          }).setView([20.5937, 78.9629], 5);

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
            var isOnline = Boolean(emp.isOnline || emp.isTrackingActive);
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

          function renderEmployees(employees, selectedId, officeLocation) {
            markersLayer.clearLayers();
            var bounds = [];

            if (officeLocation && officeLocation.latitude && officeLocation.longitude) {
              var offHtml = '<div style="background:#4F46E5; color:#fff; border-radius:50%; width:36px; height:36px; display:flex; align-items:center; justify-content:center; font-size:18px; border:2.5px solid #fff; box-shadow:0 3px 8px rgba(0,0,0,0.4);">🏢</div>';
              var offIcon = L.divIcon({ className: 'custom-leaflet-marker', html: offHtml, iconSize: [36, 36], iconAnchor: [18, 18] });
              var offMarker = L.marker([officeLocation.latitude, officeLocation.longitude], { icon: offIcon })
                .bindPopup('<b>🏢 ' + (officeLocation.name || 'Company Office') + '</b><br/>' + (officeLocation.address || 'Office Location'));
              markersLayer.addLayer(offMarker);
            }

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
            } else if (officeLocation && officeLocation.latitude && officeLocation.longitude) {
              map.setView([officeLocation.latitude, officeLocation.longitude], 16);
            } else {
              map.setView([20.5937, 78.9629], 5);
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

          function renderTrail(trail, employeeName, halts, startTime, endTime, isStationary, officeLocation) {
            trailLayer.clearLayers();
            if (!trail || trail.length === 0) {
              if (officeLocation && officeLocation.latitude && officeLocation.longitude) {
                var offHtml = '<div style="background:#4F46E5; color:#fff; border-radius:50%; width:36px; height:36px; display:flex; align-items:center; justify-content:center; font-size:18px; border:2.5px solid #fff; box-shadow:0 3px 8px rgba(0,0,0,0.4);">🏢</div>';
                var offIcon = L.divIcon({ className: 'custom-leaflet-marker', html: offHtml, iconSize: [36, 36], iconAnchor: [18, 18] });
                var offMarker = L.marker([officeLocation.latitude, officeLocation.longitude], { icon: offIcon })
                  .bindPopup('<b>🏢 ' + (officeLocation.name || 'Company Office') + '</b><br/>No route trail for selected date - Office Location');
                trailLayer.addLayer(offMarker);
                map.setView([officeLocation.latitude, officeLocation.longitude], 16);
              } else {
                map.setView([20.5937, 78.9629], 5);
              }
              return;
            }


            if (trail.length === 1 || isStationary) {
              var pt = trail[0];
              var stationaryMarker = L.marker([pt.latitude, pt.longitude], {
                icon: L.divIcon({
                  className: 'custom-leaflet-marker',
                  html: '<div style="background:#10B981; color:#fff; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; font-size:16px; font-weight:bold; border:2.5px solid #fff; box-shadow:0 3px 8px rgba(0,0,0,0.35);">🏢</div>',
                  iconSize: [32, 32],
                  iconAnchor: [16, 16]
                })
              }).bindPopup('<b>' + (employeeName || 'Employee') + '</b><br/>एकाच ठिकाणी उपस्थित (Stationary)');
              trailLayer.addLayer(stationaryMarker);
              map.setView([pt.latitude, pt.longitude], 16);
              return;
            }

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
                renderEmployees(data.employees || [], data.selectedId, data.officeLocation);
              } else if (data.type === 'UPDATE_TRAIL') {
                renderTrail(data.trail || [], data.employeeName, data.halts || [], data.startTime, data.endTime, data.isStationary, data.officeLocation);
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

  // Access Denied guard for Employee when location tracking is not enabled
  if (isEmployee && !canAccessLocationTracking) {
    return (
      <View style={styles.accessDeniedContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#071A2F" />
        <View style={styles.accessDeniedCard}>
          <View style={styles.accessDeniedIconBox}>
            <Ionicons name="lock-closed" size={32} color="#EF4444" />
          </View>
          <Text style={styles.accessDeniedTitle}>Location Tracking Disabled</Text>
          <Text style={styles.accessDeniedSubtitle}>
            Live route and GPS tracking has not been enabled for your employee account. If your role requires field tracking, please contact your administrator.
          </Text>
          <TouchableOpacity
            style={styles.accessDeniedBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.accessDeniedBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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

      {/* ── Top Floating Navigation & Date Stepper ─────────────────────── */}
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
            <Text style={styles.headerTitle}>
              {isEmployee ? "My Location Trail" : "Field Location Radar"}
            </Text>
            <View style={styles.liveIndicatorRow}>
              <View
                style={[
                  styles.livePulseDot,
                  {
                    backgroundColor: isEmployee
                      ? (selectedEmployee?.isTrackingActive ? "#10B981" : "#94A3B8")
                      : (activeTrackedCount > 0 ? "#10B981" : "#94A3B8"),
                  },
                ]}
              />
              <Text
                style={[
                  styles.liveIndicatorText,
                  {
                    color: isEmployee
                      ? (selectedEmployee?.isTrackingActive ? "#10B981" : "#64748B")
                      : (activeTrackedCount > 0 ? "#10B981" : "#64748B"),
                  },
                ]}
              >
                {isEmployee
                  ? (selectedEmployee?.isTrackingActive ? "Tracking Active" : "No GPS Record")
                  : `${activeTrackedCount} Active • ${inactiveCount} Standby`}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.iconCircleBtn}
            onPress={handleManualRefresh}
            activeOpacity={0.7}
          >
            {refreshing || loadingTrail || loadingLive ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : (
              <Ionicons name="refresh" size={19} color="#2563EB" />
            )}
          </TouchableOpacity>
        </View>

        {/* Date Stepper Row */}
        <View style={styles.topDateStepperRow}>
          <TouchableOpacity
            style={styles.dateStepBtn}
            onPress={() => stepDate(-1)}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={17} color="#2563EB" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dateSelectorCenterBtn}
            onPress={() => setShowDatePickerModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar-outline" size={14} color="#2563EB" style={{ marginRight: 6 }} />
            <Text style={styles.dateSelectorCenterText}>{getDisplayDateTitle()}</Text>
            <Ionicons name="chevron-down" size={13} color="#64748B" style={{ marginLeft: 5 }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.dateStepBtn,
              (selectedDateFilter === "today" || getDateValue(selectedDateFilter) === getDateValue("today")) && styles.dateStepBtnDisabled,
            ]}
            onPress={() => stepDate(1)}
            disabled={selectedDateFilter === "today" || getDateValue(selectedDateFilter) === getDateValue("today")}
            activeOpacity={0.7}
          >
            <Ionicons
              name="chevron-forward"
              size={17}
              color={(selectedDateFilter === "today" || getDateValue(selectedDateFilter) === getDateValue("today")) ? "#CBD5E1" : "#2563EB"}
            />
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
              size={13}
              color={viewMode === "live" ? "#FFFFFF" : "#64748B"}
              style={{ marginRight: 5 }}
            />
            <Text
              style={[
                styles.segmentText,
                viewMode === "live" && styles.segmentTextActive,
              ]}
            >
              {isEmployee ? "Live Radar" : "Live Fleet"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, viewMode === "trail" && styles.segmentBtnActive]}
            onPress={() => handleModeSwitch("trail")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="footsteps"
              size={13}
              color={viewMode === "trail" ? "#FFFFFF" : "#64748B"}
              style={{ marginRight: 5 }}
            />
            <Text
              style={[
                styles.segmentText,
                viewMode === "trail" && styles.segmentTextActive,
              ]}
            >
              Route Trail ({getDisplayDateTitle()})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Floating Action Buttons (Recenter & Satellite Toggle) ────────── */}
      <View style={[styles.mapFloatingActions, { top: topInset + 160 }]}>
        <TouchableOpacity
          style={styles.floatActionBtn}
          onPress={toggleMapType}
          activeOpacity={0.8}
        >
          <Ionicons
            name={mapType === "satellite" ? "map-outline" : "globe-outline"}
            size={20}
            color="#2563EB"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.floatActionBtn}
          onPress={handleRecenter}
          activeOpacity={0.8}
        >
          <Ionicons name="locate" size={20} color="#2563EB" />
        </TouchableOpacity>
      </View>

      {/* ── Compact Bottom Sheet Panel ─────────────────────────────────── */}
      <View style={styles.bottomSheetCard}>
        <View style={styles.sheetHandle} />

        {isEmployee ? (
          <View style={styles.personalTrackingCard}>
            <View style={styles.personalCardTop}>
              <View style={styles.personalAvatarBox}>
                {user?.photo || user?.avatar || user?.profileImage ? (
                  <Image source={{ uri: user.photo || user.avatar || user.profileImage }} style={styles.personalAvatar} />
                ) : (
                  <Text style={styles.personalInitials}>
                    {(user?.name || "ME").slice(0, 2).toUpperCase()}
                  </Text>
                )}
                <View
                  style={[
                    styles.onlineDotBadge,
                    {
                      backgroundColor: selectedEmployee?.isTrackingActive
                        ? "#10B981"
                        : "#94A3B8",
                    },
                  ]}
                />
              </View>

              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.personalEmpName} numberOfLines={1}>
                  {user?.name || "My Location"}
                </Text>
                <Text style={styles.personalEmpSub} numberOfLines={1}>
                  {user?.designationName || user?.employee?.designation || user?.departmentName || "Field Staff"}
                </Text>
              </View>

              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: selectedEmployee?.isTrackingActive
                      ? "rgba(16, 185, 129, 0.12)"
                      : "rgba(100, 116, 139, 0.1)",
                  },
                ]}
              >
                <View
                  style={[
                    styles.statusDotSmall,
                    {
                      backgroundColor: selectedEmployee?.isTrackingActive ? "#10B981" : "#94A3B8",
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.statusPillText,
                    {
                      color: selectedEmployee?.isTrackingActive ? "#059669" : "#64748B",
                    },
                  ]}
                >
                  {selectedEmployee?.isTrackingActive ? "Tracking Active" : "No GPS Record"}
                </Text>
              </View>
            </View>

            <View style={styles.personalMetaGrid}>
              <View style={styles.personalMetaItem}>
                <Ionicons name="speedometer-outline" size={14} color="#3B82F6" />
                <Text style={styles.personalMetaLabel}>Distance</Text>
                <Text style={styles.personalMetaValue}>
                  {trailData.distanceKm ? `${trailData.distanceKm} km` : selectedEmployee?.todayDistanceText || "0 km"}
                </Text>
              </View>

              <View style={styles.personalMetaItem}>
                <Ionicons name="pause-circle-outline" size={14} color="#F59E0B" />
                <Text style={styles.personalMetaLabel}>Halts</Text>
                <Text style={styles.personalMetaValue}>
                  {trailData.halts?.length || 0} stops
                </Text>
              </View>

              <View style={styles.personalMetaItem}>
                <Ionicons name="pin-outline" size={14} color="#10B981" />
                <Text style={styles.personalMetaLabel}>GPS Points</Text>
                <Text style={styles.personalMetaValue}>
                  {trailData.totalPoints || 0} pings
                </Text>
              </View>

              <View style={styles.personalMetaItem}>
                <Ionicons name="navigate-circle-outline" size={14} color="#8B5CF6" />
                <Text style={styles.personalMetaLabel}>Status</Text>
                <Text style={styles.personalMetaValue}>
                  {selectedEmployee?.isTrackingActive ? "Recorded" : "Standby"}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <>
            {/* Selected Employee Quick HUD */}
            {selectedEmployee && (
              <View style={styles.selectedEmpStrip}>
                <View style={styles.stripLeft}>
                  <View style={styles.stripAvatarBox}>
                    {selectedEmployee.avatar ? (
                      <Image source={{ uri: selectedEmployee.avatar }} style={styles.stripAvatar} />
                    ) : (
                      <Text style={styles.stripInitials}>
                        {(selectedEmployee.name || "E").slice(0, 2).toUpperCase()}
                      </Text>
                    )}
                    <View
                      style={[
                        styles.stripDot,
                        {
                          backgroundColor: selectedEmployee.isTrackingActive
                            ? "#10B981"
                            : "#94A3B8",
                        },
                      ]}
                    />
                  </View>

                  <View style={{ flex: 1, marginLeft: 9 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                      <Text style={styles.stripName} numberOfLines={1}>
                        {formatName(selectedEmployee.name)}
                      </Text>
                      <View
                        style={[
                          styles.stripTrackingBadge,
                          selectedEmployee.isTrackingActive
                            ? styles.stripTrackingActive
                            : styles.stripTrackingInactive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.stripTrackingBadgeText,
                            selectedEmployee.isTrackingActive
                              ? styles.stripTrackingActiveText
                              : styles.stripTrackingInactiveText,
                          ]}
                        >
                          {selectedEmployee.isTrackingActive ? "Tracked" : "Standby"}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.stripSub} numberOfLines={1}>
                      {selectedEmployee.latitude && selectedEmployee.longitude
                        ? `${selectedEmployee.designation || "Staff"} • ${selectedEmployee.department || "General"}`
                        : `🏢 ${selectedEmployee.branchName || officeLocation?.name || "Main Branch"}: ${selectedEmployee.branchAddress || officeLocation?.address || "Branch Office"}`}
                    </Text>
                  </View>
                </View>

                {/* Metrics on Right */}
                <View style={styles.stripMetricsRow}>
                  <View style={styles.stripMetricPill}>
                    <Text style={styles.stripMetricVal}>
                      {viewMode === "trail" && trailData?.distanceKm
                        ? `${trailData.distanceKm} km`
                        : selectedEmployee.todayDistanceText || "0 km"}
                    </Text>
                    <Text style={styles.stripMetricLbl}>Route</Text>
                  </View>

                  <View style={styles.stripMetricPill}>
                    <Text style={styles.stripMetricVal}>
                      {viewMode === "trail"
                        ? `${trailData?.halts?.length || 0}`
                        : selectedEmployee.motionStatus === "moving"
                        ? `${Math.round(selectedEmployee.speed || 0)}`
                        : selectedEmployee.motionStatus === "stationary" && selectedEmployee.stoppageDurationMinutes > 2
                        ? `${selectedEmployee.stoppageDurationMinutes}m`
                        : "0"}
                    </Text>
                    <Text style={styles.stripMetricLbl}>
                      {viewMode === "trail" ? "Halts" : "Speed"}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.stripFocusBtn}
                    onPress={() => {
                      if (selectedEmployee.latitude && selectedEmployee.longitude) {
                        postToMap({
                          type: "CENTER_COORDS",
                          latitude: selectedEmployee.latitude,
                          longitude: selectedEmployee.longitude,
                          zoom: 17,
                        });
                      } else if (trailData?.trail?.length > 0) {
                        postToMap({ type: "FIT_TRAIL" });
                      } else {
                        handleRecenter();
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="locate" size={15} color="#2563EB" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Filter Tabs Row */}
            <View style={styles.filterTabsRow}>
              <TouchableOpacity
                style={[styles.filterTabBtn, statusTab === "all" && styles.filterTabBtnActive]}
                onPress={() => setStatusTab("all")}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.filterTabText, statusTab === "all" && styles.filterTabTextActive]}
                >
                  All ({employees.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterTabBtn, statusTab === "active" && styles.filterTabBtnActive]}
                onPress={() => setStatusTab("active")}
                activeOpacity={0.7}
              >
                <View style={[styles.filterTabDot, { backgroundColor: "#10B981" }]} />
                <Text
                  style={[styles.filterTabText, statusTab === "active" && styles.filterTabTextActive]}
                >
                  Active ({activeTrackedCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterTabBtn, statusTab === "inactive" && styles.filterTabBtnActive]}
                onPress={() => setStatusTab("inactive")}
                activeOpacity={0.7}
              >
                <View style={[styles.filterTabDot, { backgroundColor: "#94A3B8" }]} />
                <Text
                  style={[styles.filterTabText, statusTab === "inactive" && styles.filterTabTextActive]}
                >
                  Inactive ({inactiveCount})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Compact Staff Carousel */}
            {loadingLive && employees.length === 0 ? (
              <View style={styles.loadingCarousel}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.loadingCarouselText}>Loading employee GPS records...</Text>
              </View>
            ) : filteredEmployees.length === 0 ? (
              <View style={styles.emptyCarousel}>
                <Ionicons name="location-outline" size={22} color="#94A3B8" />
                <Text style={styles.emptyCarouselText}>
                  No {statusTab !== "all" ? statusTab : ""} staff records for {getDisplayDateTitle()}.
                </Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.compactCarouselScroll}
              >
                {filteredEmployees.map((emp) => {
                  const isSelected = selectedEmployee?._id === emp._id;
                  const isTracked = Boolean(emp.isTrackingActive);

                  return (
                    <TouchableOpacity
                      key={emp._id}
                      style={[
                        styles.compactEmpCard,
                        isSelected && styles.compactEmpCardSelected,
                        isTracked ? styles.compactEmpCardTracked : styles.compactEmpCardUntracked,
                      ]}
                      onPress={() => handleSelectEmployee(emp)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.compactCardTop}>
                        <View style={styles.compactAvatarBox}>
                          {emp.avatar ? (
                            <Image source={{ uri: emp.avatar }} style={styles.compactAvatar} />
                          ) : (
                            <Text style={styles.compactInitials}>
                              {(emp.name || "E").slice(0, 2).toUpperCase()}
                            </Text>
                          )}
                          <View
                            style={[
                              styles.compactStatusDot,
                              {
                                backgroundColor: isTracked
                                  ? emp.motionStatus === "moving"
                                    ? "#3B82F6"
                                    : "#10B981"
                                  : "#94A3B8",
                              },
                            ]}
                          />
                        </View>

                        <View style={{ flex: 1, marginLeft: 7 }}>
                          <Text style={styles.compactEmpName} numberOfLines={1}>
                            {formatName(emp.name)}
                          </Text>
                          <Text style={styles.compactEmpRole} numberOfLines={1}>
                            {emp.designation || emp.department || "Staff"}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.compactCardBottom}>
                        <View
                          style={[
                            styles.compactStatusBadge,
                            isTracked ? styles.compactStatusBadgeActive : styles.compactStatusBadgeInactive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.compactStatusBadgeText,
                              isTracked ? styles.compactStatusBadgeTextActive : styles.compactStatusBadgeTextInactive,
                            ]}
                            numberOfLines={1}
                          >
                            {isTracked
                              ? emp.motionStatus === "moving"
                                ? `🚗 ${Math.round(emp.speed || 0)}km/h`
                                : emp.todayDistanceText
                                ? `📍 ${emp.todayDistanceText}`
                                : "🟢 Active"
                              : `🏢 ${emp.branchName || "Branch"}`}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </>
        )}
      </View>

      {/* ── 14-Day Date Picker Modal ────────────────────────────────────── */}
      <Modal
        visible={showDatePickerModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDatePickerModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowDatePickerModal(false)}
        >
          <View style={styles.modalContentCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="calendar" size={18} color="#2563EB" />
                <Text style={styles.modalTitle}>Select Tracking Date</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowDatePickerModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {pastDaysList.map((item) => {
                const isSelected =
                  (item.key === "today" && (selectedDateFilter === "today" || getDateValue(selectedDateFilter) === getDateValue("today"))) ||
                  (item.key === "yesterday" && (selectedDateFilter === "yesterday" || getDateValue(selectedDateFilter) === getDateValue("yesterday"))) ||
                  selectedDateFilter === item.dateStr;

                return (
                  <TouchableOpacity
                    key={item.dateStr}
                    style={[styles.modalDateItem, isSelected && styles.modalDateItemSelected]}
                    onPress={() => {
                      handleDateChange(item.key);
                      setShowDatePickerModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View>
                      <Text style={[styles.modalDateLabel, isSelected && styles.modalDateTextActive]}>
                        {item.label}
                      </Text>
                      <Text style={styles.modalDateSub}>{item.formatted}</Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color="#2563EB" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
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
  topDateStepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 9,
    gap: 8,
  },
  dateStepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  dateStepBtnDisabled: {
    backgroundColor: "#F1F5F9",
    borderColor: "#E2E8F0",
  },
  dateSelectorCenterBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  dateSelectorCenterText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  modeSegment: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    padding: 3.5,
    marginTop: 9,
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
  // Selected Employee Quick Strip HUD
  selectedEmpStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  stripLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 6,
  },
  stripAvatarBox: {
    position: "relative",
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  stripAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 17,
  },
  stripInitials: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "800",
  },
  stripDot: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  stripName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    maxWidth: 110,
  },
  stripSub: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 1,
  },
  stripTrackingBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  stripTrackingActive: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
  },
  stripTrackingInactive: {
    backgroundColor: "rgba(100, 116, 139, 0.1)",
  },
  stripTrackingBadgeText: {
    fontSize: 9,
    fontWeight: "800",
  },
  stripTrackingActiveText: {
    color: "#059669",
  },
  stripTrackingInactiveText: {
    color: "#64748B",
  },
  stripMetricsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stripMetricPill: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    minWidth: 42,
  },
  stripMetricVal: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0F172A",
  },
  stripMetricLbl: {
    fontSize: 8.5,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
  },
  stripFocusBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },

  // Filter Tabs
  filterTabsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  filterTabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 9,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterTabBtnActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#93C5FD",
  },
  filterTabDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  filterTabText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#64748B",
  },
  filterTabTextActive: {
    color: "#2563EB",
    fontWeight: "800",
  },

  // Compact Employee Carousel Cards
  compactCarouselScroll: {
    gap: 8,
    paddingRight: 8,
  },
  compactEmpCard: {
    width: 150,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: "#E2E8F0",
    padding: 8,
    gap: 6,
  },
  compactEmpCardSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  compactEmpCardTracked: {
    borderLeftWidth: 3,
    borderLeftColor: "#10B981",
  },
  compactEmpCardUntracked: {
    borderLeftWidth: 3,
    borderLeftColor: "#CBD5E1",
  },
  compactCardTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  compactAvatarBox: {
    position: "relative",
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  compactAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
  },
  compactInitials: {
    color: "#FFFFFF",
    fontSize: 10.5,
    fontWeight: "800",
  },
  compactStatusDot: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  compactEmpName: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  compactEmpRole: {
    fontSize: 9.5,
    fontWeight: "600",
    color: "#64748B",
  },
  compactCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  compactStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    flex: 1,
    alignItems: "center",
  },
  compactStatusBadgeActive: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
  },
  compactStatusBadgeInactive: {
    backgroundColor: "rgba(100, 116, 139, 0.1)",
  },
  compactStatusBadgeText: {
    fontSize: 9.5,
    fontWeight: "800",
  },
  compactStatusBadgeTextActive: {
    color: "#059669",
  },
  compactStatusBadgeTextInactive: {
    color: "#64748B",
  },

  // 14-Day Date Picker Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },
  modalContentCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    maxHeight: 480,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 20,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalDateItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  modalDateItemSelected: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  modalDateLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalDateTextActive: {
    color: "#2563EB",
  },
  modalDateSub: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "600",
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
  accessDeniedContainer: {
    flex: 1,
    backgroundColor: "#071A2F",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  accessDeniedCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#0F243E",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
  },
  accessDeniedIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  accessDeniedTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 8,
    textAlign: "center",
  },
  accessDeniedSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 24,
  },
  accessDeniedBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1268D9",
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 12,
  },
  accessDeniedBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  personalTrackingCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  personalCardTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  personalAvatarBox: {
    position: "relative",
    width: 44,
    height: 44,
  },
  personalAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#2563EB",
  },
  personalInitials: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1E293B",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 40,
    fontSize: 15,
    fontWeight: "800",
    borderWidth: 2,
    borderColor: "#2563EB",
  },
  personalEmpName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  personalEmpSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
    fontWeight: "500",
  },
  personalMetaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#EDF2F7",
  },
  personalMetaItem: {
    width: "25%",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  personalMetaLabel: {
    fontSize: 9.5,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 3,
  },
  personalMetaValue: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 1,
  },
});

export default EmployeeLocationTrackingScreen;
