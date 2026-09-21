import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
  Dimensions,
  Linking,
  Platform,
  PermissionsAndroid,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import Geolocation from "@react-native-community/geolocation";
import CompanyAdminLayout from "../../components/CompanyAdminLayout";
import AppButton from "../../components/AppButton";
import { useAuth } from "../../context/AuthContext";
import {
  getCompanyAttendanceSettingsApi,
  updateCompanyAttendanceSettingsApi,
  getBranchesApi,
  updateBranchApi,
} from "../../api/companyService";

const AttendanceSettingsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === "CompanyAdmin" || user?.role === "HR";

  const webViewRef = useRef(null);

  // Settings loading state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // --- Map states ---
  const [selectedLocation, setSelectedLocation] = useState(null); // { latitude, longitude }
  const [latitudeInput, setLatitudeInput] = useState("");
  const [longitudeInput, setLongitudeInput] = useState("");
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [gpsAccuracy, setGpsAccuracy] = useState(null);

  // --- Branch States ---
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState("main"); // "main" or branch._id
  const [mainOfficeSettings, setMainOfficeSettings] = useState(null);

  // --- Attendance Configuration States ---
  const [officeName, setOfficeName] = useState("Main Office");
  const [allowedRadiusMeters, setAllowedRadiusMeters] = useState("100");
  const [attendanceMode, setAttendanceMode] = useState("office_only");
  const [requireGps, setRequireGps] = useState(true);
  const [requireSelfie, setRequireSelfie] = useState(false);
  const [allowAdminBypassGeoFencing, setAllowAdminBypassGeoFencing] = useState(true);
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState("15");
  const [autoHalfDayOnLate, setAutoHalfDayOnLate] = useState(true);
  const [earlyLeaveGracePeriodMinutes, setEarlyLeaveGracePeriodMinutes] = useState("10");
  const [autoHalfDayOnEarlyLeave, setAutoHalfDayOnEarlyLeave] = useState(true);

  // Derived radius number
  const radiusMeters = parseFloat(allowedRadiusMeters) || 100;

  // ─── Fetch saved settings and branches on mount ────────────────────────────
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const [settingsRes, branchesRes] = await Promise.all([
        getCompanyAttendanceSettingsApi().catch((e) => null),
        getBranchesApi().catch((e) => null),
      ]);

      const data = settingsRes?.data || settingsRes;
      const s = data?.settings || data;
      const branchList = branchesRes?.data?.branches || branchesRes?.data || [];
      setBranches(branchList);

      if (s) {
        setMainOfficeSettings(s);
        setAttendanceMode(s.attendanceMode || "office_only");
        setRequireGps(s.requireGps ?? true);
        setRequireSelfie(s.requireSelfie ?? false);
        setAllowAdminBypassGeoFencing(s.allowAdminBypassGeoFencing ?? true);
        setGracePeriodMinutes(String(s.gracePeriodMinutes ?? 15));
        setAutoHalfDayOnLate(s.autoHalfDayOnLate ?? true);
        setEarlyLeaveGracePeriodMinutes(String(s.earlyLeaveGracePeriodMinutes ?? 10));
        setAutoHalfDayOnEarlyLeave(s.autoHalfDayOnEarlyLeave ?? true);

        // If only 1 branch exists, directly configure that branch / main office
        if (branchList.length === 1) {
          const b = branchList[0];
          setSelectedBranchId(b._id);
          setOfficeName(b.branchName || s.officeName || "Main Office");
          setAllowedRadiusMeters(String(b.allowedRadiusMeters ?? s.allowedRadiusMeters ?? 100));

          const latNum = b.latitude ?? s.latitude;
          const lngNum = b.longitude ?? s.longitude;
          if (
            latNum !== null &&
            lngNum !== null &&
            latNum !== undefined &&
            lngNum !== undefined &&
            !(Number(latNum) === 0 && Number(lngNum) === 0)
          ) {
            setSelectedLocation({ latitude: Number(latNum), longitude: Number(lngNum) });
            setLatitudeInput(String(latNum));
            setLongitudeInput(String(lngNum));
          }
        } else {
          // Multiple branches or 0 branches: default to Main Office
          setSelectedBranchId("main");
          setOfficeName(s.officeName || "Main Office");
          setAllowedRadiusMeters(String(s.allowedRadiusMeters ?? 100));

          if (
            s.latitude !== null &&
            s.longitude !== null &&
            s.latitude !== undefined &&
            s.longitude !== undefined &&
            !(Number(s.latitude) === 0 && Number(s.longitude) === 0)
          ) {
            const latNum = Number(s.latitude);
            const lngNum = Number(s.longitude);
            setSelectedLocation({ latitude: latNum, longitude: lngNum });
            setLatitudeInput(String(latNum));
            setLongitudeInput(String(lngNum));
          }
        }
      }
    } catch (err) {
      console.warn("[AttendanceSettingsScreen] Settings fetch warning:", err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Switch Branch ─────────────────────────────────────────────────────────
  const handleSelectBranch = (branchId) => {
    setSelectedBranchId(branchId);
    if (branchId === "main") {
      const s = mainOfficeSettings;
      setOfficeName(s?.officeName || "Main Office");
      setAllowedRadiusMeters(String(s?.allowedRadiusMeters ?? 100));
      if (s?.latitude && s?.longitude) {
        const latNum = Number(s.latitude);
        const lngNum = Number(s.longitude);
        setSelectedLocation({ latitude: latNum, longitude: lngNum });
        setLatitudeInput(String(latNum));
        setLongitudeInput(String(lngNum));
      } else {
        setSelectedLocation(null);
        setLatitudeInput("");
        setLongitudeInput("");
      }
    } else {
      const b = branches.find((item) => item._id === branchId);
      if (b) {
        setOfficeName(b.branchName);
        setAllowedRadiusMeters(String(b.allowedRadiusMeters ?? 100));
        if (b.latitude && b.longitude) {
          const latNum = Number(b.latitude);
          const lngNum = Number(b.longitude);
          setSelectedLocation({ latitude: latNum, longitude: lngNum });
          setLatitudeInput(String(latNum));
          setLongitudeInput(String(lngNum));
        } else {
          // If branch doesn't have coordinates yet, use main office coords as reference
          if (mainOfficeSettings?.latitude && mainOfficeSettings?.longitude) {
            setSelectedLocation({
              latitude: Number(mainOfficeSettings.latitude),
              longitude: Number(mainOfficeSettings.longitude),
            });
            setLatitudeInput(String(mainOfficeSettings.latitude));
            setLongitudeInput(String(mainOfficeSettings.longitude));
          } else {
            setSelectedLocation(null);
            setLatitudeInput("");
            setLongitudeInput("");
          }
        }
      }
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // ─── Post updates to Leaflet WebView whenever selected location changes ──────
  useEffect(() => {
    if (selectedLocation && webViewRef.current) {
      const payload = JSON.stringify({
        type: "UPDATE_LOCATION",
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        radius: radiusMeters,
      });
      webViewRef.current.postMessage(payload);
    }
  }, [selectedLocation, radiusMeters]);

  // Handle messages received from Leaflet Map in WebView
  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "LOCATION_CHANGED") {
        const { latitude, longitude } = data;
        setSelectedLocation({ latitude, longitude });
        setLatitudeInput(String(latitude.toFixed(6)));
        setLongitudeInput(String(longitude.toFixed(6)));
      }
    } catch (err) {
      console.log("WebView message parsing error:", err);
    }
  };

  // ─── Use Current Location (native Geolocation) ──────────────────────────────────
  const handleUseCurrentLocation = async () => {
    try {
      setLoadingLocation(true);
      setLocationError("");

      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ]);

        const fineGranted = granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;
        const coarseGranted = granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;

        if (!fineGranted && !coarseGranted) {
          Alert.alert(
            "📍 Location Permission Required",
            "To set your office attendance location, please allow location access.",
            [
              { text: "Open Settings", onPress: () => Linking.openSettings() },
              { text: "Cancel", style: "cancel" },
            ]
          );
          setLoadingLocation(false);
          return;
        }
      }

      Geolocation.getCurrentPosition(
        (position) => {
          const lat = Number(position.coords.latitude.toFixed(6));
          const lng = Number(position.coords.longitude.toFixed(6));
          const acc = position.coords.accuracy ? Math.round(position.coords.accuracy) : null;

          setSelectedLocation({ latitude: lat, longitude: lng });
          setLatitudeInput(String(lat));
          setLongitudeInput(String(lng));
          setGpsAccuracy(acc);
          setLocationError("");
          setLoadingLocation(false);
        },
        (err) => {
          console.log("[Settings GPS Error]", err);
          setLocationError("Unable to acquire high accuracy GPS. You can tap directly on the map to pin your office.");
          setLoadingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    } catch (err) {
      console.log("[GPS Request Error]", err);
      setLocationError("Failed to request GPS position.");
      setLoadingLocation(false);
    }
  };

  // ─── Save Settings ─────────────────────────────────────────────────────────────
  const handleSaveSettings = async () => {
    if (!isAdmin) {
      Alert.alert("Denied", "Only Company Administrators can modify settings");
      return;
    }

    if (!officeName.trim()) {
      Alert.alert("Required", "Office / Branch Name is required");
      return;
    }

    if (!selectedLocation) {
      Alert.alert("No Location Selected", "Please use 'Use My Current Location' or tap on the map to set the geofence location.");
      return;
    }

    try {
      setSaving(true);

      if (selectedBranchId !== "main") {
        // Save Branch Geofence via updateBranchApi
        await updateBranchApi(selectedBranchId, {
          branchName: officeName,
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
          allowedRadiusMeters: radiusMeters,
          requireGps: true,
        });

        // Update branch in local list
        setBranches((prev) =>
          prev.map((b) =>
            b._id === selectedBranchId
              ? {
                  ...b,
                  branchName: officeName,
                  latitude: selectedLocation.latitude,
                  longitude: selectedLocation.longitude,
                  allowedRadiusMeters: radiusMeters,
                }
              : b
          )
        );

        // If only 1 branch exists, also sync with main office settings
        if (branches.length === 1) {
          await updateCompanyAttendanceSettingsApi({
            officeName,
            latitude: selectedLocation.latitude,
            longitude: selectedLocation.longitude,
            allowedRadiusMeters: radiusMeters,
            attendanceMode,
            requireGps,
            requireSelfie,
            allowAdminBypassGeoFencing,
            gracePeriodMinutes: parseInt(gracePeriodMinutes) || 0,
            autoHalfDayOnLate,
            earlyLeaveGracePeriodMinutes: parseInt(earlyLeaveGracePeriodMinutes) || 0,
            autoHalfDayOnEarlyLeave,
          }).catch(() => {});
        }

        Alert.alert("✅ Saved", `"${officeName}" branch geofence updated successfully!`);
      } else {
        // Save Main Office Geofence
        const payload = {
          officeName,
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
          allowedRadiusMeters: radiusMeters,
          attendanceMode,
          requireGps,
          requireSelfie,
          allowAdminBypassGeoFencing,
          gracePeriodMinutes: parseInt(gracePeriodMinutes) || 0,
          autoHalfDayOnLate,
          earlyLeaveGracePeriodMinutes: parseInt(earlyLeaveGracePeriodMinutes) || 0,
          autoHalfDayOnEarlyLeave,
        };

        await updateCompanyAttendanceSettingsApi(payload);
        setMainOfficeSettings((prev) => ({ ...prev, ...payload }));
        Alert.alert("✅ Saved", "Main Office geofence settings updated successfully!");
      }
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  const getLeafletHTML = () => {
    const lat = selectedLocation ? selectedLocation.latitude : 19.076;
    const lng = selectedLocation ? selectedLocation.longitude : 72.8777;
    const radius = radiusMeters;
    const hasLoc = selectedLocation ? "true" : "false";

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          html, body, #map {
            height: 100%;
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
          }
          .custom-pin svg {
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map;
          var marker;
          var circle;
          var lat = ${lat};
          var lng = ${lng};
          var radius = ${radius};
          var hasLoc = ${hasLoc};

          map = L.map('map', {
            zoomControl: false,
            attributionControl: false
          }).setView([lat, lng], hasLoc ? 16 : 5);

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
          }).addTo(map);

          var pinIcon = L.divIcon({
            html: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="width:30px; height:30px; color:#ef4444;"><path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.702 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" /></svg>',
            className: 'custom-pin',
            iconSize: [30, 30],
            iconAnchor: [15, 30]
          });

          if (hasLoc) {
            marker = L.marker([lat, lng], {
              draggable: true,
              icon: pinIcon
            }).addTo(map);

            circle = L.circle([lat, lng], {
              color: '#2563eb',
              fillColor: '#2563eb',
              fillOpacity: 0.15,
              radius: radius
            }).addTo(map);

            marker.on('dragend', function() {
              var pos = marker.getLatLng();
              circle.setLatLng(pos);
              sendLocation(pos.lat, pos.lng);
            });
          }

          map.on('click', function(e) {
            var clickLat = e.latlng.lat;
            var clickLng = e.latlng.lng;
            
            if (marker) {
              marker.setLatLng([clickLat, clickLng]);
              circle.setLatLng([clickLat, clickLng]);
            } else {
              marker = L.marker([clickLat, clickLng], {
                draggable: true,
                icon: pinIcon
              }).addTo(map);

              circle = L.circle([clickLat, clickLng], {
                color: '#2563eb',
                fillColor: '#2563eb',
                fillOpacity: 0.15,
                radius: radius
              }).addTo(map);

              marker.on('dragend', function() {
                var pos = marker.getLatLng();
                circle.setLatLng(pos);
                sendLocation(pos.lat, pos.lng);
              });
            }
            sendLocation(clickLat, clickLng);
          });

          function sendLocation(newLat, newLng) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'LOCATION_CHANGED',
              latitude: newLat,
              longitude: newLng
            }));
          }

          window.addEventListener('message', function(event) {
            try {
              var data = JSON.parse(event.data);
              if (data.type === 'UPDATE_LOCATION') {
                var updateLat = data.latitude;
                var updateLng = data.longitude;
                var updateRad = data.radius;

                map.setView([updateLat, updateLng], 16);
                if (marker) {
                  marker.setLatLng([updateLat, updateLng]);
                  circle.setLatLng([updateLat, updateLng]);
                  circle.setRadius(updateRad);
                } else {
                  marker = L.marker([updateLat, updateLng], {
                    draggable: true,
                    icon: pinIcon
                  }).addTo(map);

                  circle = L.circle([updateLat, updateLng], {
                    color: '#2563eb',
                    fillColor: '#2563eb',
                    fillOpacity: 0.15,
                    radius: updateRad
                  }).addTo(map);

                  marker.on('dragend', function() {
                    var pos = marker.getLatLng();
                    circle.setLatLng(pos);
                    sendLocation(pos.lat, pos.lng);
                  });
                }
              }
            } catch(e) {}
          });
        </script>
      </body>
      </html>
    `;
  };

  return (
    <CompanyAdminLayout navigation={navigation} activeTab="Dashboard" showSearch={false}>
      <View style={styles.screenHeader}>
        <Text style={styles.title}>Office Location Settings</Text>
        <Text style={styles.subtitle}>
          Configure company office GPS boundaries and allowed clock-in proximity parameters
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Fetching location settings...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* ── BRANCH SELECTOR (Single vs Multiple Branches) ─────────── */}
          {branches.length > 1 ? (
            <View style={styles.branchSelectCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="business" size={18} color="#2563eb" />
                <Text style={styles.sectionTitle}>Select Office / Branch to Geofence</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                Select the branch you want to set GPS coordinates and radius for:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.branchTabsRow}>
                <TouchableOpacity
                  style={[
                    styles.branchTab,
                    selectedBranchId === "main" && styles.branchTabActive,
                  ]}
                  onPress={() => handleSelectBranch("main")}
                  activeOpacity={0.8}
                >
                  <View style={[styles.branchDot, mainOfficeSettings?.latitude ? styles.branchDotActive : styles.branchDotInactive]} />
                  <Text style={[styles.branchTabText, selectedBranchId === "main" && styles.branchTabTextActive]}>
                    🏢 Main Office
                  </Text>
                </TouchableOpacity>

                {branches.map((b) => {
                  const isSelected = selectedBranchId === b._id;
                  const hasGps = b.latitude && b.longitude;
                  return (
                    <TouchableOpacity
                      key={b._id}
                      style={[styles.branchTab, isSelected && styles.branchTabActive]}
                      onPress={() => handleSelectBranch(b._id)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.branchDot, hasGps ? styles.branchDotActive : styles.branchDotInactive]} />
                      <Text style={[styles.branchTabText, isSelected && styles.branchTabTextActive]}>
                        📍 {b.branchName}
                      </Text>
                      {hasGps && (
                        <Text style={[styles.branchRadiusPill, isSelected && styles.branchRadiusPillActive]}>
                          {b.allowedRadiusMeters || 100}m
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ) : branches.length === 1 ? (
            <View style={styles.singleBranchBanner}>
              <Ionicons name="business" size={20} color="#2563eb" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.singleBranchTitle}>Branch: {branches[0].branchName}</Text>
                <Text style={styles.singleBranchSub}>
                  Configuring geofence location for your primary office.
                </Text>
              </View>
            </View>
          ) : null}

          {/* ── MAP PICKER ──────────────────────────────────────────────── */}
          <View style={styles.mapCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="map" size={20} color="#2563eb" />
              <Text style={styles.sectionTitle}>
                {selectedBranchId !== "main" ? `Set ${officeName} Geofence` : "Set Office Attendance Location"}
              </Text>
            </View>

            {locationError ? (
              <TouchableOpacity
                style={styles.errorBanner}
                onPress={() => Linking.openSettings()}
                activeOpacity={0.75}
              >
                <Ionicons name="alert-circle-outline" size={16} color="#dc2626" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.errorBannerText}>{locationError}</Text>
                  <Text style={styles.errorBannerSub}>Tap to open device Settings → Location</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color="#dc2626" />
              </TouchableOpacity>
            ) : null}

            {isAdmin && (
              <TouchableOpacity
                style={styles.currentLocationBtn}
                onPress={handleUseCurrentLocation}
                disabled={loadingLocation}
                activeOpacity={0.75}
              >
                {loadingLocation ? (
                  <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
                ) : (
                  <Ionicons name="locate" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                )}
                <Text style={styles.currentLocationBtnText}>
                  {loadingLocation ? "Acquiring GPS Signal..." : "📍 Use My Current Location"}
                </Text>
              </TouchableOpacity>
            )}

            {gpsAccuracy !== null && !loadingLocation && (
              <View
                style={[
                  styles.accuracyBadge,
                  gpsAccuracy <= 10
                    ? styles.accuracyGood
                    : gpsAccuracy <= 30
                    ? styles.accuracyOk
                    : styles.accuracyPoor,
                ]}
              >
                <Ionicons
                  name="cellular-outline"
                  size={13}
                  color={gpsAccuracy <= 10 ? "#16a34a" : gpsAccuracy <= 30 ? "#d97706" : "#dc2626"}
                  style={{ marginRight: 5 }}
                />
                <Text
                  style={[
                    styles.accuracyText,
                    { color: gpsAccuracy <= 10 ? "#16a34a" : gpsAccuracy <= 30 ? "#d97706" : "#dc2626" },
                  ]}
                >
                  GPS Accuracy: ±{gpsAccuracy}m
                  {gpsAccuracy <= 10 ? "  ✓ Excellent" : gpsAccuracy <= 30 ? "  △ Moderate" : "  ✕ Poor — move outdoors"}
                </Text>
              </View>
            )}

            {loadingLocation && (
              <View style={styles.gpsAcquiringRow}>
                <ActivityIndicator size="small" color="#2563eb" style={{ marginRight: 8 }} />
                <Text style={styles.gpsAcquiringText}>
                  Acquiring high-accuracy GPS signal... (this may take a few seconds)
                </Text>
              </View>
            )}

            <View style={styles.mapWrapper}>
              <WebView
                ref={webViewRef}
                style={styles.map}
                originWhitelist={["*"]}
                source={{ html: getLeafletHTML() }}
                onMessage={handleWebViewMessage}
                javaScriptEnabled={true}
                domStorageEnabled={true}
              />

              <View style={styles.coordsOverlay}>
                <Ionicons name="pin" size={13} color="#2563eb" style={{ marginRight: 5 }} />
                <Text style={styles.coordsOverlayText}>
                  {selectedLocation
                    ? `${selectedLocation.latitude.toFixed(6)}°, ${selectedLocation.longitude.toFixed(6)}°  ·  Radius: ${radiusMeters}m`
                    : "No Location Pinned"}
                </Text>
              </View>

              {isAdmin && (
                <Text style={styles.mapHintText}>
                  {selectedLocation
                    ? "Drag the pin or tap anywhere on the map to reposition"
                    : "Tap anywhere on the map to pin your office"}
                </Text>
              )}
            </View>
          </View>

          {/* ── OFFICE NAME ──────────────────────────────────────────────── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="business-outline" size={20} color="#2563eb" />
              <Text style={styles.sectionTitle}>Office Details</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Office Location Name *</Text>
              <TextInput
                style={[styles.input, !isAdmin && styles.inputDisabled]}
                value={officeName}
                onChangeText={setOfficeName}
                placeholder="e.g. Pune Headquarters"
                editable={isAdmin}
              />
            </View>

            <View style={styles.gridRow}>
              <View style={styles.gridCol}>
                <Text style={styles.inputLabel}>Latitude</Text>
                <TextInput
                  style={[styles.input, !isAdmin && styles.inputDisabled]}
                  value={latitudeInput}
                  onChangeText={(val) => {
                    setLatitudeInput(val);
                    const parsed = parseFloat(val);
                    if (!isNaN(parsed)) {
                      setSelectedLocation((prev) => ({
                        latitude: parsed,
                        longitude: prev ? prev.longitude : 72.8777,
                      }));
                    } else if (val === "") {
                      setSelectedLocation(null);
                    }
                  }}
                  placeholder="e.g. 18.5204"
                  keyboardType="numeric"
                  editable={isAdmin}
                />
              </View>
              <View style={styles.gridCol}>
                <Text style={styles.inputLabel}>Longitude</Text>
                <TextInput
                  style={[styles.input, !isAdmin && styles.inputDisabled]}
                  value={longitudeInput}
                  onChangeText={(val) => {
                    setLongitudeInput(val);
                    const parsed = parseFloat(val);
                    if (!isNaN(parsed)) {
                      setSelectedLocation((prev) => ({
                        latitude: prev ? prev.latitude : 18.5204,
                        longitude: parsed,
                      }));
                    } else if (val === "") {
                      setSelectedLocation(null);
                    }
                  }}
                  placeholder="e.g. 73.8567"
                  keyboardType="numeric"
                  editable={isAdmin}
                />
              </View>
            </View>
          </View>

          {/* ── RADIUS ───────────────────────────────────────────────────── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="radio-button-off-outline" size={20} color="#2563eb" />
              <Text style={styles.sectionTitle}>Authorized Attendance Radius</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Allowed Radius (Meters) *</Text>
              <TextInput
                style={[styles.input, !isAdmin && styles.inputDisabled]}
                keyboardType="numeric"
                value={allowedRadiusMeters}
                onChangeText={setAllowedRadiusMeters}
                placeholder="e.g. 100"
                editable={isAdmin}
              />
              <Text style={styles.fieldHelpText}>
                Maximum distance in meters employees can be from the office pin to clock in. Default: 100m.
              </Text>
            </View>
          </View>

          {/* ── ATTENDANCE MODES ─────────────────────────────────────────── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="navigate-outline" size={20} color="#2563eb" />
              <Text style={styles.sectionTitle}>Attendance Compliance Mode</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Select the geolocation constraint policy to apply to clock-in/out triggers:
            </Text>

            <View style={styles.modeContainer}>
              <TouchableOpacity
                style={[styles.modeChip, attendanceMode === "office_only" && styles.modeChipActive, !isAdmin && styles.modeChipDisabled]}
                onPress={() => isAdmin && setAttendanceMode("office_only")}
                activeOpacity={0.7}
              >
                <Ionicons name="business" size={16} color={attendanceMode === "office_only" ? "#2563eb" : "#64748b"} />
                <Text style={[styles.modeText, attendanceMode === "office_only" && styles.modeTextActive]}>
                  Office Only (Strict Geo-Fencing)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeChip, attendanceMode === "hybrid" && styles.modeChipActive, !isAdmin && styles.modeChipDisabled]}
                onPress={() => isAdmin && setAttendanceMode("hybrid")}
                activeOpacity={0.7}
              >
                <Ionicons name="git-compare" size={16} color={attendanceMode === "hybrid" ? "#2563eb" : "#64748b"} />
                <Text style={[styles.modeText, attendanceMode === "hybrid" && styles.modeTextActive]}>
                  Hybrid (Enforces source label: Office/Remote)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeChip, attendanceMode === "remote_allowed" && styles.modeChipActive, !isAdmin && styles.modeChipDisabled]}
                onPress={() => isAdmin && setAttendanceMode("remote_allowed")}
                activeOpacity={0.7}
              >
                <Ionicons name="airplane" size={16} color={attendanceMode === "remote_allowed" ? "#2563eb" : "#64748b"} />
                <Text style={[styles.modeText, attendanceMode === "remote_allowed" && styles.modeTextActive]}>
                  Remote Allowed (Anywhere clock-in)
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── SECURITY RULES ───────────────────────────────────────────── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="shield-checkmark" size={20} color="#2563eb" />
              <Text style={styles.sectionTitle}>Verification & Security Rules</Text>
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchCol}>
                <Text style={styles.switchLabel}>Require Active GPS Validation</Text>
                <Text style={styles.switchHelp}>Enforce foreground GPS check during clock activities.</Text>
              </View>
              <Switch
                value={requireGps}
                onValueChange={setRequireGps}
                disabled={!isAdmin}
                trackColor={{ false: "#cbd5e1", true: "#bfdbfe" }}
                thumbColor={requireGps ? "#2563eb" : "#94a3b8"}
              />
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchCol}>
                <Text style={styles.switchLabel}>Require Selfie Attachment (Selfie Lock)</Text>
                <Text style={styles.switchHelp}>Prompt user to snap a camera selfie when punching.</Text>
              </View>
              <Switch
                value={requireSelfie}
                onValueChange={setRequireSelfie}
                disabled={!isAdmin}
                trackColor={{ false: "#cbd5e1", true: "#bfdbfe" }}
                thumbColor={requireSelfie ? "#2563eb" : "#94a3b8"}
              />
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchCol}>
                <Text style={styles.switchLabel}>Allow Administrator Bypass</Text>
                <Text style={styles.switchHelp}>Grant CompanyAdmin exception rules from radial blocks.</Text>
              </View>
              <Switch
                value={allowAdminBypassGeoFencing}
                onValueChange={setAllowAdminBypassGeoFencing}
                disabled={!isAdmin}
                trackColor={{ false: "#cbd5e1", true: "#bfdbfe" }}
                thumbColor={allowAdminBypassGeoFencing ? "#2563eb" : "#94a3b8"}
              />
            </View>
          </View>

          {/* ── LATE & EARLY RULES ───────────────────────────────────────── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="time" size={20} color="#2563eb" />
              <Text style={styles.sectionTitle}>Late & Early Rules</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Late Check-In Grace Period (Minutes)</Text>
              <TextInput
                style={[styles.input, !isAdmin && styles.inputDisabled]}
                keyboardType="numeric"
                value={gracePeriodMinutes}
                onChangeText={setGracePeriodMinutes}
                placeholder="e.g. 15"
                editable={isAdmin}
              />
              <Text style={styles.fieldHelpText}>
                Minutes allowed after shift start before marked as late.
              </Text>
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchCol}>
                <Text style={styles.switchLabel}>Auto Half-Day on Late</Text>
                <Text style={styles.switchHelp}>Automatically convert attendance to Half Day if check-in is past grace period.</Text>
              </View>
              <Switch
                value={autoHalfDayOnLate}
                onValueChange={setAutoHalfDayOnLate}
                disabled={!isAdmin}
                trackColor={{ false: "#cbd5e1", true: "#bfdbfe" }}
                thumbColor={autoHalfDayOnLate ? "#2563eb" : "#94a3b8"}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Early Leave Grace Period (Minutes)</Text>
              <TextInput
                style={[styles.input, !isAdmin && styles.inputDisabled]}
                keyboardType="numeric"
                value={earlyLeaveGracePeriodMinutes}
                onChangeText={setEarlyLeaveGracePeriodMinutes}
                placeholder="e.g. 10"
                editable={isAdmin}
              />
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchCol}>
                <Text style={styles.switchLabel}>Auto Half-Day on Early Leave</Text>
                <Text style={styles.switchHelp}>Automatically convert attendance to Half Day if check-out is before shift end minus grace period.</Text>
              </View>
              <Switch
                value={autoHalfDayOnEarlyLeave}
                onValueChange={setAutoHalfDayOnEarlyLeave}
                disabled={!isAdmin}
                trackColor={{ false: "#cbd5e1", true: "#bfdbfe" }}
                thumbColor={autoHalfDayOnEarlyLeave ? "#2563eb" : "#94a3b8"}
              />
            </View>
          </View>

          {/* ── ALL BRANCHES GEOFENCE OVERVIEW ─────────────────────── */}
          {branches.length > 0 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="layers-outline" size={20} color="#2563eb" />
                <Text style={styles.sectionTitle}>Branch Geofences Status ({branches.length})</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                Employees assigned to multiple branches can punch at any of these active geofences:
              </Text>
              <View style={styles.branchListContainer}>
                {branches.map((b) => {
                  const hasGps = b.latitude && b.longitude;
                  const isCur = selectedBranchId === b._id;
                  return (
                    <View key={b._id} style={[styles.branchListItem, isCur && styles.branchListItemSelected]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.branchListItemName}>{b.branchName}</Text>
                        <Text style={styles.branchListItemMeta}>
                          {hasGps
                            ? `Lat: ${Number(b.latitude).toFixed(4)}, Lng: ${Number(b.longitude).toFixed(4)} · Radius: ${b.allowedRadiusMeters || 100}m`
                            : "No GPS coordinates configured"}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.branchEditBtn, isCur && styles.branchEditBtnActive]}
                        onPress={() => handleSelectBranch(b._id)}
                      >
                        <Text style={[styles.branchEditBtnText, isCur && styles.branchEditBtnTextActive]}>
                          {isCur ? "Editing" : "Configure"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── SAVE / READ-ONLY ─────────────────────────────────────────── */}
          {isAdmin ? (
            <AppButton
              title={saving ? "Saving Geofence..." : selectedBranchId !== "main" ? `Save ${officeName} Geofence` : "Save Office Geofence"}
              loading={saving}
              disabled={!selectedLocation}
              style={[styles.saveBtn, !selectedLocation && styles.saveBtnDisabled]}
              onPress={handleSaveSettings}
            />
          ) : (
            <View style={styles.readOnlyBanner}>
              <Ionicons name="shield-outline" size={18} color="#94a3b8" />
              <Text style={styles.readOnlyBannerText}>
                Viewing settings in Read-Only mode. Adjustments are restricted to Company Administrators.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </CompanyAdminLayout>
  );
};

const styles = StyleSheet.create({
  screenHeader: {
    padding: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
  },
  subtitle: {
    fontSize: 12.5,
    color: "#64748b",
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748b",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
  },
  mapCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  branchSelectCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    elevation: 2,
    shadowColor: "#2563eb",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  branchTabsRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  branchTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    marginRight: 8,
  },
  branchTabActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#2563eb",
  },
  branchTabText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#475569",
  },
  branchTabTextActive: {
    color: "#2563eb",
  },
  branchDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  branchDotActive: {
    backgroundColor: "#16a34a",
  },
  branchDotInactive: {
    backgroundColor: "#d97706",
  },
  branchRadiusPill: {
    fontSize: 10,
    fontWeight: "700",
    backgroundColor: "#e2e8f0",
    color: "#475569",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    marginLeft: 6,
  },
  branchRadiusPillActive: {
    backgroundColor: "#bfdbfe",
    color: "#1d4ed8",
  },
  singleBranchBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  singleBranchTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1d4ed8",
  },
  singleBranchSub: {
    fontSize: 11,
    color: "#3b82f6",
    marginTop: 1,
  },
  branchListContainer: {
    gap: 8,
    marginTop: 4,
  },
  branchListItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 8,
  },
  branchListItemSelected: {
    backgroundColor: "#eff6ff",
    borderColor: "#93c5fd",
  },
  branchListItemName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1e293b",
  },
  branchListItemMeta: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  branchEditBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  branchEditBtnActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  branchEditBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  branchEditBtnTextActive: {
    color: "#ffffff",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
    marginLeft: 8,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorBannerText: {
    fontSize: 12,
    color: "#dc2626",
    fontWeight: "600",
  },
  errorBannerSub: {
    fontSize: 10.5,
    color: "#ef4444",
    marginTop: 2,
    fontStyle: "italic",
  },
  currentLocationBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  currentLocationBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  mapWrapper: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  map: {
    width: "100%",
    height: 300,
  },
  coordsOverlay: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  coordsOverlayText: {
    color: "#f8fafc",
    fontSize: 11.5,
    fontWeight: "600",
    flex: 1,
  },
  mapHintText: {
    fontSize: 11,
    color: "#64748b",
    textAlign: "center",
    paddingVertical: 8,
    backgroundColor: "#f8fafc",
    fontStyle: "italic",
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 12,
    lineHeight: 16,
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  gridCol: {
    width: "48%",
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: "#1e293b",
    backgroundColor: "#ffffff",
  },
  inputDisabled: {
    backgroundColor: "#f1f5f9",
    color: "#64748b",
    borderColor: "#e2e8f0",
  },
  fieldHelpText: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 4,
    lineHeight: 15,
  },
  modeContainer: {
    marginTop: 4,
  },
  modeChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  modeChipActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
  },
  modeChipDisabled: {
    opacity: 0.8,
  },
  modeText: {
    fontSize: 12.5,
    color: "#475569",
    fontWeight: "600",
    marginLeft: 10,
  },
  modeTextActive: {
    color: "#2563eb",
    fontWeight: "700",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f1f5f9",
  },
  switchCol: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  switchHelp: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 2,
    lineHeight: 14,
  },
  saveBtn: {
    marginTop: 8,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  readOnlyBanner: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    marginTop: 8,
  },
  readOnlyBannerText: {
    fontSize: 12,
    color: "#64748b",
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
  accuracyBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  accuracyGood: {
    backgroundColor: "#f0fdf4",
    borderColor: "#86efac",
  },
  accuracyOk: {
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a",
  },
  accuracyPoor: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  accuracyText: {
    fontSize: 12,
    fontWeight: "700",
  },
  gpsAcquiringRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    marginBottom: 8,
  },
  gpsAcquiringText: {
    fontSize: 12,
    color: "#2563eb",
    fontStyle: "italic",
    flex: 1,
  },
});

export default AttendanceSettingsScreen;
