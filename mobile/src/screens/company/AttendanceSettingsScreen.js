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

  // ─── Fetch saved settings on mount ───────────────────────────────────────────
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await getCompanyAttendanceSettingsApi();
      const data = res?.data || res;
      const s = data?.settings || data;

      if (s) {
        setOfficeName(s.officeName || "Main Office");
        setAllowedRadiusMeters(String(s.allowedRadiusMeters ?? 100));
        setAttendanceMode(s.attendanceMode || "office_only");
        setRequireGps(s.requireGps ?? true);
        setRequireSelfie(s.requireSelfie ?? false);
        setAllowAdminBypassGeoFencing(s.allowAdminBypassGeoFencing ?? true);
        setGracePeriodMinutes(String(s.gracePeriodMinutes ?? 15));
        setAutoHalfDayOnLate(s.autoHalfDayOnLate ?? true);
        setEarlyLeaveGracePeriodMinutes(String(s.earlyLeaveGracePeriodMinutes ?? 10));
        setAutoHalfDayOnEarlyLeave(s.autoHalfDayOnEarlyLeave ?? true);

        // If a saved location exists and is not the default (0,0), pre-load the map with it
        if (
          s.latitude !== null &&
          s.longitude !== null &&
          s.latitude !== undefined &&
          s.longitude !== undefined &&
          !(Number(s.latitude) === 0 && Number(s.longitude) === 0)
        ) {
          const latNum = Number(s.latitude);
          const lngNum = Number(s.longitude);
          setSelectedLocation({
            latitude: latNum,
            longitude: lngNum,
          });
          setLatitudeInput(String(latNum));
          setLongitudeInput(String(lngNum));
        }
      }
    } catch (err) {
      console.warn("[AttendanceSettingsScreen] Settings fetch warning:", err?.message || err);
    } finally {
      setLoading(false);
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
      Alert.alert("Required", "Office Location Name is required");
      return;
    }

    if (!selectedLocation) {
      Alert.alert("No Location Selected", "Please use 'Use My Current Location' or tap on the map to set the office location.");
      return;
    }

    try {
      setSaving(true);
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
      Alert.alert("✅ Saved", "Office location settings updated successfully!");
      fetchSettings();
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
          {/* ── MAP PICKER ──────────────────────────────────────────────── */}
          <View style={styles.mapCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="map" size={20} color="#2563eb" />
              <Text style={styles.sectionTitle}>Set Office Attendance Location</Text>
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

          {/* ── SAVE / READ-ONLY ─────────────────────────────────────────── */}
          {isAdmin ? (
            <AppButton
              title={saving ? "Saving Location Settings..." : "Save Office Location"}
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
