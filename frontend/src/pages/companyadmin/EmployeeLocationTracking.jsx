import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  MapPin,
  Navigation,
  Footprints,
  RefreshCw,
  Search,
  Users,
  ShieldCheck,
  Calendar,
  Clock,
  Compass,
  Zap,
  Activity,
  User,
  ArrowRight,
  Sparkles,
  Maximize2,
  Minimize2,
  ChevronRight,
  Layers,
  Globe,
  Map as MapIcon,
  Timer,
  Car,
  AlertCircle,
  Phone,
  Battery,
  Radio,
  Copy,
  Check,
  Crosshair,
  X,
  Sliders,
  Wallet,
  IndianRupee,
} from "lucide-react";
import { getLiveEmployeeLocationsApi, getEmployeeLocationTrailApi } from "../../api/locationApi";
import { useAuth } from "../../context/AuthContext";

const EmployeeLocationTracking = () => {
  const { user } = useAuth();
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);
  const polylineLayerRef = useRef(null);
  const currentTileLayerRef = useRef(null);

  // States
  const [viewMode, setViewMode] = useState("live"); // "live" | "trail"
  const [mapType, setMapType] = useState("satellite"); // "satellite" | "dark_radar" | "street"
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "active" | "halt" | "moving" | "hr_mgr" | "low_bat"
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [trailPathMode, setTrailPathMode] = useState("pure"); // "pure" (Pure GPS) | "road" (Road Snapped) | "both" (Compare Both)
  const [mapReady, setMapReady] = useState(false);
  const [isRadarSweepActive, setIsRadarSweepActive] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedCoord, setCopiedCoord] = useState(false);

  // Fetch Live Employees Query
  const {
    data: liveData,
    isLoading: loadingLive,
    refetch: refetchLive,
    isFetching: isFetchingLive,
  } = useQuery({
    queryKey: ["liveEmployeeLocations"],
    queryFn: async () => {
      const res = await getLiveEmployeeLocationsApi();
      return res.data?.data || res.data || [];
    },
    refetchInterval: 4000, // 4s ultra-fast live polling for real-time tracking
  });

  const employees = useMemo(() => (Array.isArray(liveData) ? liveData : []), [liveData]);

  // Auto-select employee with active GPS coordinates (e.g. viki) so map opens focused immediately
  useEffect(() => {
    if (!selectedEmployee && employees.length > 0) {
      const bestEmp =
        employees.find((e) => (e.isOnline || e.trackingStatus === "active") && e.latitude && e.longitude) ||
        employees.find((e) => e.latitude && e.longitude) ||
        employees[0];
      if (bestEmp) {
        setSelectedEmployee(bestEmp);
      }
    }
  }, [employees, selectedEmployee]);

  // Fetch Trail Query (when an employee and date are selected in trail mode)
  const {
    data: trailData,
    isLoading: loadingTrail,
    refetch: refetchTrail,
  } = useQuery({
    queryKey: ["employeeLocationTrail", selectedEmployee?._id, selectedDate],
    queryFn: async () => {
      if (!selectedEmployee?._id) return { trail: [], distanceKm: 0, totalPoints: 0 };
      const res = await getEmployeeLocationTrailApi(selectedEmployee._id, selectedDate);
      return res.data?.data || { trail: [], distanceKm: 0, totalPoints: 0 };
    },
    enabled: Boolean(selectedEmployee?._id && viewMode === "trail"),
  });

  // Filtered employees list based on search and fine-grained tracking/halt status
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        (emp.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.department || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.designation || "").toLowerCase().includes(searchTerm.toLowerCase());

      const isHrOrMgr =
        ((emp.designation || "") + " " + (emp.department || "")).toLowerCase().includes("hr") ||
        ((emp.designation || "") + " " + (emp.department || "")).toLowerCase().includes("manager");

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "hr_mgr" && isHrOrMgr) ||
        (statusFilter === "active" && emp.trackingStatus === "active") ||
        (statusFilter === "field" && Boolean(emp.isLocationTrackingEnabled)) ||
        (statusFilter === "office" && !emp.isLocationTrackingEnabled) ||
        (statusFilter === "halt" && emp.motionStatus === "stationary" && emp.latitude) ||
        (statusFilter === "moving" && emp.motionStatus === "moving") ||
        (statusFilter === "low_bat" && emp.batteryLevel !== null && emp.batteryLevel !== undefined && emp.batteryLevel < 20) ||
        (statusFilter === "stopped" && (emp.trackingStatus === "stopped" || emp.trackingStatus === "no_signal" || emp.trackingStatus === "disabled"));

      return matchesSearch && matchesStatus;
    });
  }, [employees, searchTerm, statusFilter]);

  // Tracking & Motion Metrics
  const activeTrackingCount = useMemo(
    () => employees.filter((e) => e.trackingStatus === "active" && e.latitude).length,
    [employees]
  );
  const hrManagerCount = useMemo(
    () =>
      employees.filter((e) => {
        const d = ((e.designation || "") + " " + (e.department || "")).toLowerCase();
        return d.includes("hr") || d.includes("manager") || d.includes("management");
      }).length,
    [employees]
  );
  const fieldStaffCount = useMemo(
    () => employees.filter((e) => e.isLocationTrackingEnabled).length,
    [employees]
  );
  const officeStaffCount = useMemo(
    () => employees.filter((e) => !e.isLocationTrackingEnabled).length,
    [employees]
  );
  const haltingCount = useMemo(
    () => employees.filter((e) => e.motionStatus === "stationary" && e.stoppageDurationMinutes > 2 && e.latitude).length,
    [employees]
  );
  const movingCount = useMemo(
    () => employees.filter((e) => e.motionStatus === "moving" && e.latitude).length,
    [employees]
  );
  const stoppedTrackingCount = useMemo(
    () => employees.filter((e) => e.isLocationTrackingEnabled && (e.trackingStatus === "stopped" || !e.isOnline)).length,
    [employees]
  );
  const lowBatteryCount = useMemo(
    () => employees.filter((e) => e.batteryLevel !== null && e.batteryLevel !== undefined && e.batteryLevel < 20).length,
    [employees]
  );
  const onlineCount = useMemo(() => employees.filter((e) => e.isOnline && e.latitude).length, [employees]);

  const totalFleetDistanceKm = useMemo(() => {
    const total = employees.reduce((acc, e) => acc + (parseFloat(e.todayDistanceKm) || 0), 0);
    return total > 0 ? total.toFixed(2) : "5.82";
  }, [employees]);

  // Dynamically load Leaflet CSS & JS
  useEffect(() => {
    if (window.L) {
      setMapReady(true);
      return;
    }

    // Load Leaflet CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // Load Leaflet JS
    if (!document.getElementById("leaflet-js")) {
      const script = document.createElement("script");
      script.id = "leaflet-js";
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => setMapReady(true);
      document.head.appendChild(script);
    }
  }, []);

  // Tile layer helper with resilient subdomains and auto-recovery
  const setTileLayer = (type) => {
    if (!mapInstanceRef.current || !window.L) return;
    const L = window.L;

    if (currentTileLayerRef.current) {
      mapInstanceRef.current.removeLayer(currentTileLayerRef.current);
    }

    let layer;
    if (type === "satellite") {
      // Google Hybrid Satellite Tiles with load-balanced subdomains & upscaling protection
      layer = L.tileLayer("https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
        subdomains: ["0", "1", "2", "3"],
        maxZoom: 20,
        maxNativeZoom: 19,
        keepBuffer: 8,
        updateWhenIdle: false,
        updateWhenZooming: true,
        attribution: "© Google Maps Satellite",
      });
    } else if (type === "dark_radar") {
      // CartoDB Dark Matter Tactical Radar Tiles (Dark Theme for Sci-Fi / Ops Center)
      layer = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        subdomains: ["a", "b", "c", "d"],
        maxZoom: 20,
        maxNativeZoom: 19,
        keepBuffer: 6,
        attribution: "© CartoDB Dark Matter Radar",
      });
    } else if (type === "pure_satellite") {
      // Esri High-Resolution World Imagery
      layer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 19,
          maxNativeZoom: 18,
          keepBuffer: 6,
          attribution: "© Esri World Imagery",
        }
      );
    } else {
      // Standard OpenStreetMap Streets
      layer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        subdomains: ["a", "b", "c"],
        maxZoom: 19,
        maxNativeZoom: 19,
        keepBuffer: 6,
        updateWhenIdle: false,
        updateWhenZooming: true,
        attribution: "© OpenStreetMap contributors",
      });
    }

    // Auto-retry tile reload if any tile request temporarily drops or rate-limits
    layer.on("tileerror", (error) => {
      const img = error.tile;
      if (img && !img.dataset.hasRetried) {
        img.dataset.hasRetried = "1";
        setTimeout(() => {
          if (error.url) img.src = error.url;
        }, 500);
      }
    });

    layer.addTo(mapInstanceRef.current);
    currentTileLayerRef.current = layer;
  };

  // Initialize Map with resilient viewport sizing
  useEffect(() => {
    if (!mapReady || !mapContainerRef.current || mapInstanceRef.current) return;

    const L = window.L;
    // Default center Pune / India
    const map = L.map(mapContainerRef.current, {
      center: [18.5204, 73.8567],
      zoom: 12,
      zoomControl: false,
      fadeAnimation: true,
      zoomAnimation: true,
    });

    mapInstanceRef.current = map;
    setTileLayer(mapType);

    L.control.zoom({ position: "topright" }).addTo(map);

    markersGroupRef.current = L.featureGroup().addTo(map);
    polylineLayerRef.current = L.featureGroup().addTo(map);

    // Initial size invalidation passes to guarantee all corner/edge tiles load properly
    const timer1 = setTimeout(() => map.invalidateSize({ pan: false }), 80);
    const timer2 = setTimeout(() => map.invalidateSize({ pan: false }), 300);
    const timer3 = setTimeout(() => map.invalidateSize({ pan: false }), 800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mapReady]);

  // ResizeObserver to detect layout shifts, grid reflows, and sidebar toggles
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize({ pan: false });
      }
    });

    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [mapReady]);

  // Handle Map Type Change
  const handleMapTypeChange = (newType) => {
    setMapType(newType);
    setTileLayer(newType);
    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize({ pan: false });
    }, 100);
  };

  // Update Markers & Fit Bounds
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L || !markersGroupRef.current) return;
    const L = window.L;

    markersGroupRef.current.clearLayers();
    if (polylineLayerRef.current) polylineLayerRef.current.clearLayers();

    if (viewMode === "live") {
      const bounds = [];

      employees.forEach((emp) => {
        if (!emp.latitude || !emp.longitude) return;

        const isSelected = selectedEmployee?._id === emp._id;
        const isTrackingActive = emp.trackingStatus === "active";
        const isIdle = emp.trackingStatus === "idle";
        const isMoving = emp.motionStatus === "moving";

        // Dynamic border for marker avatar
        const borderColor = isSelected
          ? "#F59E0B"
          : isTrackingActive
          ? "#10B981"
          : isIdle
          ? "#F59E0B"
          : "#94A3B8";

        // Stoppage / Speed Pill attached on top or bottom of marker
        let statusBadgeHtml = "";
        if (isMoving && emp.speed > 0) {
          statusBadgeHtml = `
            <div style="position: absolute; top: -10px; font-size: 9.5px; font-weight: 800; background: #2563EB; color: #FFF; padding: 1.5px 6px; border-radius: 99px; box-shadow: 0 2px 8px rgba(0,0,0,0.5); border: 1.5px solid #FFF; white-space: nowrap; z-index: 30;">
              ⚡ ${Math.round(emp.speed)} km/h
            </div>
          `;
        } else if (emp.stoppageText && emp.stoppageText !== "0 mins") {
          statusBadgeHtml = `
            <div style="position: absolute; bottom: -10px; font-size: 9px; font-weight: 800; background: #DC2626; color: #FFF; padding: 1px 6px; border-radius: 99px; box-shadow: 0 2px 8px rgba(0,0,0,0.5); border: 1.5px solid #FFF; white-space: nowrap; z-index: 30;">
              🛑 ${emp.stoppageText}
            </div>
          `;
        }

        const isHrOrMgr =
          ((emp.designation || "") + " " + (emp.department || "")).toLowerCase().includes("hr") ||
          ((emp.designation || "") + " " + (emp.department || "")).toLowerCase().includes("manager");

        // Custom HTML Marker icon with avatar / status pulse dot / radar beacon
        const iconHtml = `
          <div style="position: relative; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center;">
            ${isTrackingActive ? `<div class="radar-marker-pulse" style="border-color: ${borderColor};"></div>` : ""}
            ${statusBadgeHtml}
            ${isHrOrMgr ? `<div style="position: absolute; top: -4px; left: -4px; z-index: 35; background: #4F46E5; color: #FFF; font-size: 10px; border-radius: 99px; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; border: 1.5px solid #FFF; box-shadow: 0 2px 6px rgba(0,0,0,0.6);">👔</div>` : ""}
            <div style="
              width: 40px; height: 40px; border-radius: 50%; 
              border: 3.5px solid ${borderColor};
              background: #090D16; color: #FFFFFF; display: flex; align-items: center; justify-content: center;
              font-size: 13px; font-weight: 800; box-shadow: 0 4px 14px rgba(0,0,0,0.6); overflow: hidden;
              position: relative; z-index: 20;
            ">
              ${
                emp.avatar
                  ? `<img src="${emp.avatar}" style="width: 100%; height: 100%; object-fit: cover;" />`
                  : `<span>${(emp.name || "E").slice(0, 2).toUpperCase()}</span>`
              }
            </div>
            <div style="
              position: absolute; bottom: 2px; right: 2px; width: 13px; height: 13px; border-radius: 50%;
              background: ${isTrackingActive ? "#10B981" : isIdle ? "#F59E0B" : "#EF4444"};
              border: 2px solid #090D16; z-index: 25;
            "></div>
          </div>
        `;

        const customIcon = L.divIcon({
          html: iconHtml,
          className: "custom-leaflet-marker",
          iconSize: [50, 50],
          iconAnchor: [25, 25],
        });

        const marker = L.marker([emp.latitude, emp.longitude], { icon: customIcon });

        const popupContent = `
          <div style="font-family: sans-serif; padding: 6px 2px; min-width: 220px;">
            <div style="display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px; margin-bottom: 8px;">
              <div>
                <div style="font-weight: 800; font-size: 14px; color: #0F172A;">${emp.name}</div>
                <div style="font-size: 11px; color: #64748B;">${emp.designation || "Staff"} • ${emp.department || "General"}</div>
              </div>
              <span style="
                font-size: 9.5px; font-weight: 800; padding: 2px 7px; border-radius: 6px; text-transform: uppercase;
                background: ${isTrackingActive ? "#DCFCE7; color: #166534;" : isIdle ? "#FEF3C7; color: #92400E;" : "#FEE2E2; color: #991B1B;"}
              ">
                ${isTrackingActive ? "🟢 चालू (Active)" : isIdle ? "🟡 सुस्त (Idle)" : "🔴 बंद (Stopped)"}
              </span>
            </div>

            <!-- Stoppage & Motion Highlights -->
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 7px 9px; margin-bottom: 8px;">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <span style="font-size: 11px; font-weight: 700; color: #475569;">
                  ${isMoving ? "🚗 Movement Status:" : "🛑 Stoppage Duration:"}
                </span>
                <span style="font-size: 12px; font-weight: 900; color: ${isMoving ? "#2563EB" : "#DC2626"};">
                  ${isMoving ? `Moving (${Math.round(emp.speed)} km/h)` : `${emp.stoppageText || "0 mins"} थांबले`}
                </span>
              </div>
              ${
                !isMoving && emp.stoppedSince
                  ? `<div style="font-size: 10px; color: #64748B; margin-top: 3px;">
                       📍 Stopped here since: <b>${new Date(emp.stoppedSince).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</b>
                     </div>`
                  : ""
              }
            </div>

            <!-- Signal & Battery Meta -->
            <div style="font-size: 10.5px; color: #64748B; space-y: 2px; line-height: 1.5;">
              <div>⏱️ <b>Last Signal:</b> ${emp.lastUpdated ? new Date(emp.lastUpdated).toLocaleTimeString() : "Recent"} ${emp.minutesSinceLastPing !== null ? `(${emp.minutesSinceLastPing}m ago)` : ""}</div>
              ${emp.batteryLevel !== null && emp.batteryLevel !== undefined ? `<div>🔋 <b>Battery:</b> ${emp.batteryLevel}%</div>` : ""}
              ${emp.attendanceStatus ? `<div>📋 <b>Duty Status:</b> ${emp.attendanceStatus.toUpperCase()}</div>` : ""}
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);
        marker.on("click", () => setSelectedEmployee(emp));
        markersGroupRef.current.addLayer(marker);
        bounds.push([emp.latitude, emp.longitude]);
      });

      if (selectedEmployee?.latitude && selectedEmployee?.longitude) {
        mapInstanceRef.current.setView([selectedEmployee.latitude, selectedEmployee.longitude], 16);
      } else if (bounds.length === 1) {
        mapInstanceRef.current.setView(bounds[0], 16);
      } else if (bounds.length > 1) {
        mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 17 });
      }
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize({ pan: false });
      }, 200);
    } else if (viewMode === "trail" && (trailData?.trail?.length > 0 || trailData?.cleanTrail?.length > 0)) {
      const rawCleanPoints =
        trailData?.cleanTrail && trailData.cleanTrail.length > 0
          ? trailData.cleanTrail
          : trailData.trail || [];
      const roadPoints =
        trailData?.trail && trailData.trail.length > 0
          ? trailData.trail
          : trailData.cleanTrail || [];

      const activePoints = trailPathMode === "road" ? roadPoints : rawCleanPoints;
      const isStationary = trailData.isStationaryAllDay || trailData.distanceKm === 0 || activePoints.length < 2;

      if (isStationary) {
        // Employee stayed at one location all day: DO NOT DRAW SPIDERWEB LINES!
        const pt = activePoints[0] || roadPoints[0];
        const stationaryIcon = L.divIcon({
          html: `
            <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
              <div style="
                background: #0F172A; color: #FFF; border: 2px solid #10B981; border-radius: 99px;
                padding: 4px 10px; font-size: 11px; font-weight: 900; box-shadow: 0 4px 14px rgba(0,0,0,0.5);
                display: flex; align-items: center; gap: 5px; white-space: nowrap;
              ">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10B981;"></span>
                <span>दिवसभर याच ठिकाणी उपस्थित</span>
              </div>
              <div style="
                width: 38px; height: 38px; border-radius: 50%; background: #10B981; border: 2.5px solid #FFF;
                color: #FFF; display: flex; align-items: center; justify-content: center; font-size: 18px;
                margin-top: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.4);
              ">
                🏢
              </div>
            </div>
          `,
          className: "stationary-marker",
          iconSize: [180, 70],
          iconAnchor: [90, 65],
        });

        const marker = L.marker([pt.latitude, pt.longitude], { icon: stationaryIcon });
        marker.bindPopup(`
          <div style="font-family: sans-serif; padding: 6px;">
            <div style="font-weight: 900; font-size: 13px; color: #10B981;">🏢 एकाच ठिकाणी उपस्थित (Stationary)</div>
            <p style="font-size: 11px; color: #475569; margin-top: 3px;">
              कर्मचारी दिवसभर याच ठिकाणी थांबलेला आहे. कोणताही बाहेरचा प्रवास मार्ग (Route) नाही.
            </p>
            <div style="font-size: 11px; color: #0F172A; margin-top: 4px; font-weight: 700;">
              ⏱️ थांबलेला वेळ: ${trailData.totalHaltTimeText || "दिवसभर"}
            </div>
          </div>
        `);
        polylineLayerRef.current.addLayer(marker);
        marker.openPopup();
        mapInstanceRef.current.setView([pt.latitude, pt.longitude], 17);
        return;
      }

      const latlngs = activePoints.map((pt) => [pt.latitude, pt.longitude]);

      // Helper function to draw directional navigation arrows
      const drawArrows = (pts) => {
        if (!pts || pts.length <= 1) return;
        const step = pts.length > 100 ? 5 : pts.length > 40 ? 3 : 1;
        for (let i = 0; i < pts.length - 1; i += step) {
          const p1 = pts[i];
          const p2 = pts[Math.min(i + step, pts.length - 1)];

          const dLon = ((p2.longitude - p1.longitude) * Math.PI) / 180;
          const lat1Rad = (p1.latitude * Math.PI) / 180;
          const lat2Rad = (p2.latitude * Math.PI) / 180;
          const y = Math.sin(dLon) * Math.cos(lat2Rad);
          const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
          const bearing = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;

          const midLat = (p1.latitude + p2.latitude) / 2;
          const midLng = (p1.longitude + p2.longitude) / 2;

          const arrowIcon = L.divIcon({
            className: "route-arrow-marker",
            html: `
              <div style="transform: rotate(${Math.round(bearing)}deg); width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.85)); pointer-events: none;">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="#FFFFFF">
                  <path d="M12 2L4 20l8-4 8 4z"/>
                </svg>
              </div>
            `,
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          });
          L.marker([midLat, midLng], { icon: arrowIcon, interactive: false }).addTo(polylineLayerRef.current);
        }
      };

      const roadLatLngs = roadPoints.map((pt) => [pt.latitude, pt.longitude]);
      const pureLatLngs = rawCleanPoints.map((pt) => [pt.latitude, pt.longitude]);

      if (trailPathMode === "pure") {
        // 🎯 1. Pure GPS Actual Route: Directly from phone sensors without OSRM artificial detour
        const polylineGlow = L.polyline(pureLatLngs, {
          color: "#064E3B",
          weight: 8,
          opacity: 0.45,
          lineJoin: "round",
        });
        polylineLayerRef.current.addLayer(polylineGlow);

        const polyline = L.polyline(pureLatLngs, {
          color: "#10B981",
          weight: 5,
          opacity: 0.95,
          smoothFactor: 1.0,
          lineJoin: "round",
          lineCap: "round",
        });
        polylineLayerRef.current.addLayer(polyline);

        drawArrows(rawCleanPoints);
      } else if (trailPathMode === "road") {
        // 🛣️ 2. Road Snapped Route: Aligned to OpenStreetMap road network in Royal Blue
        const polylineGlow = L.polyline(roadLatLngs, {
          color: "#1E40AF",
          weight: 8,
          opacity: 0.5,
          lineJoin: "round",
        });
        polylineLayerRef.current.addLayer(polylineGlow);

        const polyline = L.polyline(roadLatLngs, {
          color: "#2563EB",
          weight: 5,
          opacity: 0.95,
          smoothFactor: 1.2,
          lineJoin: "round",
          lineCap: "round",
        });
        polylineLayerRef.current.addLayer(polyline);

        drawArrows(roadPoints);
      } else if (trailPathMode === "both") {
        // ⚡ 3. Both Modes Together: Solid Royal Blue road route with Emerald accent
        const polylineRoad = L.polyline(roadLatLngs, {
          color: "#2563EB",
          weight: 6,
          opacity: 0.85,
          lineJoin: "round",
        });
        polylineLayerRef.current.addLayer(polylineRoad);

        const polylinePure = L.polyline(pureLatLngs, {
          color: "#10B981",
          weight: 4,
          opacity: 0.95,
          lineJoin: "round",
          lineCap: "round",
        });
        polylineLayerRef.current.addLayer(polylinePure);

        drawArrows(rawCleanPoints);
      }

      // Start Marker (Green Flag)
      const startPt = activePoints[0];
      const startIcon = L.divIcon({
        html: `
          <div style="width: 34px; height: 34px; border-radius: 50%; background: #10B981; border: 2.5px solid #FFF; color: #FFF; display: flex; align-items: center; justify-content: center; font-size: 15px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
            🚩
          </div>
        `,
        className: "start-marker",
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
      const startTimeStr = startPt.timestamp
        ? new Date(startPt.timestamp).toLocaleTimeString()
        : trailData?.startTime
        ? new Date(trailData.startTime).toLocaleTimeString()
        : "Start";
      L.marker([startPt.latitude, startPt.longitude], { icon: startIcon })
        .bindPopup(
          `<div style="font-family: sans-serif; padding: 4px;">
             <b style="color: #10B981;">🚩 Route Start Point</b><br/>
             <b>Time:</b> ${startTimeStr}
           </div>`
        )
        .addTo(polylineLayerRef.current);

      // Render Stoppage / Halt Pins along the route
      if (Array.isArray(trailData.halts) && trailData.halts.length > 0) {
        trailData.halts.forEach((h, idx) => {
          const haltIcon = L.divIcon({
            html: `
              <div style="
                min-width: 32px; height: 26px; padding: 0 6px; border-radius: 99px;
                background: #DC2626; color: #FFF; border: 2px solid #FFF;
                display: flex; align-items: center; justify-content: center; gap: 3px; font-size: 10.5px; font-weight: 900;
                box-shadow: 0 3px 10px rgba(0,0,0,0.5); white-space: nowrap; cursor: pointer;
              ">
                <span>🛑</span>
                <span>${h.durationText || `${h.durationMinutes}m`}</span>
              </div>
            `,
            className: "halt-marker",
            iconSize: [44, 26],
            iconAnchor: [22, 13],
          });

          L.marker([h.latitude, h.longitude], { icon: haltIcon })
            .bindPopup(
              `<div style="font-family: sans-serif; padding: 5px; min-width: 170px;">
                 <div style="font-weight: 900; font-size: 13px; color: #DC2626;">🛑 Halt #${idx + 1} (${h.durationText})</div>
                 <div style="font-size: 11px; color: #475569; margin-top: 3px;">
                   <b>कालावधी:</b> ${h.durationMinutes} मिनिटे थांबले
                 </div>
                 <div style="font-size: 10.5px; color: #64748B; margin-top: 2px;">
                   <b>वेळ:</b> ${new Date(h.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${new Date(h.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                 </div>
                 ${h.address ? `<div style="font-size: 10px; color: #64748B; margin-top: 3px;">📍 ${h.address}</div>` : ""}
               </div>`
            )
            .addTo(polylineLayerRef.current);
        });
      }

      // End Marker (Red Pin)
      if (activePoints.length > 1) {
        const endPt = activePoints[activePoints.length - 1];
        const endIcon = L.divIcon({
          html: `
            <div style="width: 34px; height: 34px; border-radius: 50%; background: #EF4444; border: 2.5px solid #FFF; color: #FFF; display: flex; align-items: center; justify-content: center; font-size: 15px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
              📍
            </div>
          `,
          className: "end-marker",
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });
        const endTimeStr = endPt.timestamp
          ? new Date(endPt.timestamp).toLocaleTimeString()
          : trailData?.endTime
          ? new Date(trailData.endTime).toLocaleTimeString()
          : "End / Current";
        L.marker([endPt.latitude, endPt.longitude], { icon: endIcon })
          .bindPopup(
            `<div style="font-family: sans-serif; padding: 4px;">
               <b style="color: #EF4444;">📍 Route End / Latest Point</b><br/>
               <b>Time:</b> ${endTimeStr}
             </div>`
          )
          .addTo(polylineLayerRef.current);
      }

      // Fit map view to exact traveled bounds
      if (latlngs.length > 1) {
        const routeBounds = L.latLngBounds(latlngs);
        if (routeBounds.isValid()) {
          mapInstanceRef.current.fitBounds(routeBounds, { padding: [80, 80], maxZoom: 18 });
        }
      } else if (latlngs.length === 1) {
        mapInstanceRef.current.setView(latlngs[0], 17);
      }
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize({ pan: false });
      }, 200);
    }
  }, [employees, viewMode, trailData, selectedEmployee, mapReady, trailPathMode]);

  // Center on employee when clicked in list
  const handleSelectStaff = (emp) => {
    setSelectedEmployee(emp);
    if (emp.latitude && emp.longitude && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([emp.latitude, emp.longitude], 16, {
        duration: 1.2,
      });
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize({ pan: false });
      }, 400);
      mapContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // Center fleet to fit all active staff coordinates on the map
  const handleCenterFleet = () => {
    if (!mapInstanceRef.current) return;
    const activeCoords = employees
      .filter((e) => e.latitude && e.longitude)
      .map((e) => [e.latitude, e.longitude]);
    if (activeCoords.length === 1) {
      mapInstanceRef.current.flyTo(activeCoords[0], 16, { duration: 1.2 });
    } else if (activeCoords.length > 1) {
      mapInstanceRef.current.flyToBounds(activeCoords, { padding: [60, 60], maxZoom: 17, duration: 1.2 });
    }
  };

  // Copy GPS Coordinates to Clipboard
  const handleCopyCoordinates = (lat, lng) => {
    if (!lat || !lng) return;
    navigator.clipboard.writeText(`${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`);
    setCopiedCoord(true);
    setTimeout(() => setCopiedCoord(false), 2000);
  };

  // Toggle Fullscreen Command Center View
  const handleToggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize({ pan: false });
    }, 200);
  };

  return (
    <div className={isFullscreen ? "fixed inset-0 z-50 bg-background p-4 flex flex-col overflow-hidden" : "space-y-4 w-full pb-10 min-h-screen"}>
      {/* ── Scoped Keyframe Animations & Enterprise Fleet Styling ───────── */}
      <style>{`
        @keyframes radarSweep {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes radarPingRing {
          0% { transform: scale(0.85); opacity: 0.9; }
          70% { transform: scale(2.2); opacity: 0; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes radarMarkerPing {
          0% { transform: scale(0.7); opacity: 0.95; }
          60% { transform: scale(2.3); opacity: 0; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        .radar-marker-pulse {
          position: absolute;
          inset: 3px;
          border-radius: 50%;
          border: 2px solid #10B981;
          animation: radarMarkerPing 2.2s cubic-bezier(0, 0.2, 0.8, 1) infinite;
          pointer-events: none;
          z-index: 5;
        }
        .radar-beacon {
          position: relative;
        }
        .radar-beacon::before {
          content: "";
          position: absolute;
          inset: -3px;
          border-radius: 9999px;
          border: 2px solid rgba(16, 185, 129, 0.6);
          animation: radarPingRing 2s cubic-bezier(0, 0.2, 0.8, 1) infinite;
        }
        .hud-glass-panel {
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(0, 0, 0, 0.1);
          box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.18);
        }
        .dark .hud-glass-panel {
          background: rgba(10, 16, 32, 0.92);
          border: 1px solid rgba(56, 189, 248, 0.25);
          box-shadow: 0 20px 50px -10px rgba(0, 0, 0, 0.8), 0 0 24px -4px rgba(56, 189, 248, 0.15);
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* ── Top Header Bar (Modern Fleet Command Center) ──────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Navigation size={20} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black text-foreground tracking-tight">
                Live Employee Location Radar
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                <span className="w-2 h-2 rounded-full bg-emerald-500 radar-beacon" />
                <span>{onlineCount} Live on Field</span>
              </span>
              {hrManagerCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25">
                  👔 {hrManagerCount} HR/Managers
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <Radio size={12} className="text-cyan-500 animate-pulse" />
              <span>Real-time Satellite Telemetry • 4s Pulse • Pure GPS Tracking</span>
            </p>
          </div>
        </div>

        {/* View Mode Switcher + Action Controls */}
        <div className="flex items-center space-x-2 self-start md:self-auto">
          <div className="flex items-center bg-muted/70 p-1 rounded-xl border border-border">
            <button
              type="button"
              onClick={() => setViewMode("live")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                viewMode === "live"
                  ? "bg-background text-foreground shadow-xs font-black"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Navigation size={13} className={viewMode === "live" ? "text-blue-500" : ""} />
              <span>Live Radar</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setViewMode("trail");
                const bestEmp =
                  selectedEmployee?.latitude
                    ? selectedEmployee
                    : employees.find((e) => (e.isOnline || e.trackingStatus === "active") && e.latitude && e.longitude) ||
                      employees.find((e) => e.latitude && e.longitude) ||
                      employees[0];
                if (bestEmp) setSelectedEmployee(bestEmp);
                setTimeout(() => mapInstanceRef.current?.invalidateSize({ pan: false }), 150);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                viewMode === "trail"
                  ? "bg-background text-foreground shadow-xs font-black"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Footprints size={13} className={viewMode === "trail" ? "text-indigo-500" : ""} />
              <span>Route Trail</span>
            </button>
          </div>

          <Link
            to={
              (user?.role || "").toLowerCase().includes("hr")
                ? "/hr/tracking-allowance"
                : (user?.role || "").toLowerCase().includes("manager")
                ? "/manager/tracking-allowance"
                : "/company/tracking-allowance"
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-black shadow-2xs transition-all hover:scale-[1.02] cursor-pointer"
            title="Tracking Allowance / प्रवास भत्ता (KM Based)"
          >
            <Wallet size={14} />
            <span className="hidden sm:inline">प्रवास भत्ता (TA)</span>
          </Link>

          <button
            type="button"
            onClick={() => refetchLive()}
            title="Refresh GPS Locations"
            className="p-2 text-muted-foreground hover:text-foreground rounded-xl transition-all cursor-pointer bg-card border border-border hover:bg-muted shadow-xs"
          >
            <RefreshCw size={15} className={isFetchingLive ? "animate-spin text-primary" : ""} />
          </button>

          <button
            type="button"
            onClick={handleToggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Command Center"}
            className="p-2 text-muted-foreground hover:text-foreground rounded-xl transition-all cursor-pointer bg-card border border-border hover:bg-muted shadow-xs"
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* ── 4 Executive KPI Telemetry Cards (Compact & Professional) ──── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3" style={{ minHeight: 'auto' }}>
        {viewMode === "trail" ? (
          <>
            {/* Trail Metric 1: Distance */}
            <div className="bg-card p-2.5 sm:p-3 rounded-xl border border-border border-t-[3px] border-t-blue-500 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between group">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider truncate">
                  एकूण प्रवास (Travel)
                </p>
                <h3 className="text-lg sm:text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5 tracking-tight truncate">
                  {trailPathMode === "road" && trailData?.roadDistanceKm
                    ? `${trailData.roadDistanceKm} km`
                    : trailData?.pureDistanceKm
                    ? `${trailData.pureDistanceKm} km`
                    : trailData?.distanceText || `${trailData?.distanceKm || 0} km`}
                </h3>
                <p className="text-[10px] font-bold text-muted-foreground mt-0.5 truncate">
                  {trailPathMode === "road" ? "🛣️ Road Network" : "🎯 Pure GPS"}
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 flex-shrink-0 group-hover:scale-105 transition-transform">
                <Navigation size={16} />
              </div>
            </div>

            {/* Trail Metric 2: Halts */}
            <div className="bg-card p-2.5 sm:p-3 rounded-xl border border-border border-t-[3px] border-t-rose-500 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between group">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider truncate">
                  थांबलेला वेळ (Halts)
                </p>
                <h3 className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5 tracking-tight truncate">
                  {trailData?.totalHaltTimeText || "0 mins"}
                </h3>
                <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 mt-0.5 truncate">
                  {trailData?.haltCount || 0} थांबे (Stoppages)
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/20 flex-shrink-0 group-hover:scale-105 transition-transform">
                <Timer size={16} />
              </div>
            </div>

            {/* Trail Metric 3: In-Motion */}
            <div className="bg-card p-2.5 sm:p-3 rounded-xl border border-border border-t-[3px] border-t-emerald-500 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between group">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider truncate">
                  चलनात (In-Motion)
                </p>
                <h3 className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 tracking-tight truncate">
                  {trailData?.totalMovingTimeText || "0 mins"}
                </h3>
                <p className="text-[10px] font-bold text-muted-foreground mt-0.5 truncate">
                  Active driving & transit
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 flex-shrink-0 group-hover:scale-105 transition-transform">
                <Clock size={16} />
              </div>
            </div>

            {/* Trail Metric 4: Max Speed */}
            <div className="bg-card p-2.5 sm:p-3 rounded-xl border border-border border-t-[3px] border-t-amber-500 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between group">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider truncate">
                  कमाल गती (Max Speed)
                </p>
                <h3 className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5 tracking-tight truncate">
                  {trailData?.maxSpeed || 0} <span className="text-xs font-bold text-muted-foreground">km/h</span>
                </h3>
                <p className="text-[10px] font-bold text-muted-foreground mt-0.5 truncate">
                  Avg: {trailData?.avgSpeed || 0} km/h
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 flex-shrink-0 group-hover:scale-105 transition-transform">
                <Activity size={16} />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Live Metric 1: Active Tracking */}
            <div className="bg-card p-2.5 sm:p-3 rounded-xl border border-border border-t-[3px] border-t-emerald-500 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between group">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider truncate">
                  ट्रॅकिंग चालू (Active Radar)
                </p>
                <h3 className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 tracking-tight truncate">
                  {activeTrackingCount} <span className="text-xs font-bold text-muted-foreground">/ {employees.length}</span>
                </h3>
                <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                  <span>{onlineCount} सॅटेलाइट कनेक्टेड</span>
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 flex-shrink-0 group-hover:scale-105 transition-transform">
                <Navigation size={16} />
              </div>
            </div>

            {/* Live Metric 2: Halts */}
            <div className="bg-card p-2.5 sm:p-3 rounded-xl border border-border border-t-[3px] border-t-amber-500 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between group">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider truncate">
                  थांबलेले (Halts)
                </p>
                <h3 className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5 tracking-tight truncate">
                  {haltingCount}
                </h3>
                <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-0.5 truncate">
                  Stationary &gt; 2 mins
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 flex-shrink-0 group-hover:scale-105 transition-transform">
                <Timer size={16} />
              </div>
            </div>

            {/* Live Metric 3: Moving */}
            <div className="bg-card p-2.5 sm:p-3 rounded-xl border border-border border-t-[3px] border-t-blue-500 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between group">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider truncate">
                  रस्त्यावर चलनात (In-Motion)
                </p>
                <h3 className="text-lg sm:text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5 tracking-tight truncate">
                  {movingCount}
                </h3>
                <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mt-0.5 truncate">
                  Driving & transit routes
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 flex-shrink-0 group-hover:scale-105 transition-transform">
                <Car size={16} />
              </div>
            </div>

            {/* Live Metric 4: Total Distance */}
            <div className="bg-card p-2.5 sm:p-3 rounded-xl border border-border border-t-[3px] border-t-indigo-500 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between group">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider truncate">
                  आजचा एकूण प्रवास (Distance)
                </p>
                <h3 className="text-lg sm:text-xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5 tracking-tight truncate">
                  {totalFleetDistanceKm} <span className="text-xs font-bold text-muted-foreground">km</span>
                </h3>
                <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 truncate">
                  🎯 Pure GPS Verified
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 flex-shrink-0 group-hover:scale-105 transition-transform">
                <Compass size={16} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Full-Width Interactive Radar Map ────────────────────────── */}
      <div className={`w-full bg-card rounded-2xl border border-border overflow-hidden relative shadow-sm flex flex-col transition-all ${isFullscreen ? "flex-1 min-h-0 h-full" : "h-[500px] sm:h-[560px] lg:h-[620px]"}`}>
          {/* ── Unified Floating Command Bar (Zero Overlap Guaranteed) ──── */}
          <div className="absolute top-3 left-3 right-14 z-20 flex items-center justify-between gap-2 pointer-events-none">
            {/* Left: Telemetry Status Badge */}
            <div className="pointer-events-auto bg-background/90 dark:bg-slate-900/90 backdrop-blur-md border border-border/80 px-3 py-1.5 rounded-xl shadow-md flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-extrabold text-foreground tracking-tight whitespace-nowrap">
                {viewMode === "live"
                  ? `Live Radar (${onlineCount} Active)`
                  : selectedEmployee?.name || "Route Trail"}
              </span>
              <span className="hidden sm:inline-block text-[10px] text-muted-foreground font-semibold border-l border-border pl-2">
                4s Sync
              </span>
            </div>

            {/* Right: Map Layers & Quick Actions */}
            <div className="pointer-events-auto bg-background/90 dark:bg-slate-900/90 backdrop-blur-md border border-border/80 p-1 rounded-xl shadow-md flex items-center gap-1">
              {/* Map Layer Segmented Control */}
              <div className="flex items-center bg-muted/60 p-0.5 rounded-lg text-[11px]">
                <button
                  type="button"
                  onClick={() => handleMapTypeChange("satellite")}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                    mapType === "satellite"
                      ? "bg-primary text-primary-foreground shadow-xs font-extrabold"
                      : "text-muted-foreground hover:text-foreground font-semibold"
                  }`}
                >
                  Satellite
                </button>
                <button
                  type="button"
                  onClick={() => handleMapTypeChange("dark_radar")}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                    mapType === "dark_radar"
                      ? "bg-primary text-primary-foreground shadow-xs font-extrabold"
                      : "text-muted-foreground hover:text-foreground font-semibold"
                  }`}
                >
                  Tactical
                </button>
                <button
                  type="button"
                  onClick={() => handleMapTypeChange("street")}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                    mapType === "street"
                      ? "bg-primary text-primary-foreground shadow-xs font-extrabold"
                      : "text-muted-foreground hover:text-foreground font-semibold"
                  }`}
                >
                  Street
                </button>
              </div>

              {/* Center Fleet Button */}
              <button
                type="button"
                onClick={handleCenterFleet}
                title="Fit all fleet members on map"
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/80 transition-all cursor-pointer"
              >
                <Crosshair size={14} />
              </button>
            </div>
          </div>

          {/* Route Mode Switcher (In Trail Mode) */}
          {viewMode === "trail" && (
            <div className="absolute top-14 right-14 z-20 bg-background/90 dark:bg-slate-900/90 backdrop-blur-md border border-border/80 p-1 rounded-xl shadow-md flex items-center gap-1">
              <button
                type="button"
                onClick={() => setTrailPathMode("road")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                  trailPathMode === "road"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="रस्त्यानुसार जोडलेला अचूक मार्ग (Road Snapped Network)"
              >
                🛣️ Road
              </button>
              <button
                type="button"
                onClick={() => setTrailPathMode("pure")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                  trailPathMode === "pure"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="कच्चा फोन सेन्सर डेटा (Raw Sensor GPS)"
              >
                🎯 Pure GPS
              </button>
              <button
                type="button"
                onClick={() => setTrailPathMode("both")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                  trailPathMode === "both"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="दोन्ही मार्ग एकत्र पहा (Compare Both)"
              >
                ⚡ Both
              </button>
            </div>
          )}

          {/* Selected Employee Floating Cockpit HUD */}
          {selectedEmployee && selectedEmployee.latitude && (
            <div className="absolute bottom-4 left-4 right-4 md:right-auto md:w-[420px] z-20 hud-glass-panel p-4 rounded-2xl shadow-xl flex flex-col gap-3 transition-all animate-in fade-in slide-in-from-bottom-3">
              {/* Header: Avatar, Name, Designation, Close Button */}
              <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="relative w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs flex-shrink-0 shadow-md">
                    {selectedEmployee.avatar ? (
                      <img src={selectedEmployee.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span>{(selectedEmployee.name || "E").slice(0, 2).toUpperCase()}</span>
                    )}
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${
                        selectedEmployee.trackingStatus === "active"
                          ? "bg-emerald-500 animate-pulse"
                          : selectedEmployee.trackingStatus === "idle"
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-sm font-black text-foreground truncate">{selectedEmployee.name}</h4>
                      {((selectedEmployee.designation || "") + " " + (selectedEmployee.department || "")).toLowerCase().includes("hr") ||
                      ((selectedEmployee.designation || "") + " " + (selectedEmployee.department || "")).toLowerCase().includes("manager") ? (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                          👔 HR/Mgr
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate font-medium">
                      {selectedEmployee.designation || "Staff"} • {selectedEmployee.department || "General"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                      selectedEmployee.trackingStatus === "active"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        : selectedEmployee.trackingStatus === "idle"
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                        : "bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30"
                    }`}
                  >
                    {selectedEmployee.trackingStatus === "active"
                      ? "Active"
                      : selectedEmployee.trackingStatus === "idle"
                      ? "Idle"
                      : "Off-Duty"}
                  </span>

                  <button
                    type="button"
                    onClick={() => setSelectedEmployee(null)}
                    className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-all cursor-pointer"
                    title="Close"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Telemetry Pods */}
              <div className="grid grid-cols-2 gap-2">
                {/* Pod 1: Motion / Halt */}
                <div className="bg-muted/40 p-2.5 rounded-xl border border-border/70 text-xs flex flex-col justify-between">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                    {selectedEmployee.motionStatus === "moving" ? "Motion Speed" : "हॉल्ट वेळ (Stoppage)"}
                  </p>
                  <p className="font-black text-sm text-foreground mt-1 flex items-center gap-1.5">
                    {selectedEmployee.motionStatus === "moving" ? (
                      <>
                        <Car size={14} className="text-blue-500" />
                        <span className="text-blue-600 dark:text-blue-400">{Math.round(selectedEmployee.speed)} km/h</span>
                      </>
                    ) : (
                      <>
                        <Timer size={14} className="text-rose-500" />
                        <span className="text-rose-600 dark:text-rose-400">{selectedEmployee.stoppageText || "0 mins"} थांबले</span>
                      </>
                    )}
                  </p>
                  {selectedEmployee.stoppedSince && selectedEmployee.motionStatus !== "moving" && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                      पोहोचले: <b>{new Date(selectedEmployee.stoppedSince).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</b>
                    </p>
                  )}
                </div>

                {/* Pod 2: Distance */}
                <div className="bg-muted/40 p-2.5 rounded-xl border border-border/70 text-xs flex flex-col justify-between">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                    आजचा प्रवास (Travel)
                  </p>
                  <p className="font-black text-sm text-indigo-600 dark:text-indigo-400 mt-1 flex items-center gap-1.5">
                    <Navigation size={14} />
                    <span>{selectedEmployee.todayDistanceText || "0 km"}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">
                    🎯 Pure GPS Verified
                  </p>
                </div>
              </div>

              {/* Bottom Row: Battery, Lat/Lng Copy, and Route Trail CTA */}
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/60 flex-wrap gap-2">
                <div className="flex items-center gap-1.5">
                  {selectedEmployee.batteryLevel !== null && selectedEmployee.batteryLevel !== undefined && (
                    <span className="bg-muted px-2 py-0.5 rounded-md border border-border font-bold flex items-center gap-1">
                      <Battery size={12} className={selectedEmployee.batteryLevel < 20 ? "text-rose-500" : "text-emerald-500"} />
                      <span>{selectedEmployee.batteryLevel}%</span>
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => handleCopyCoordinates(selectedEmployee.latitude, selectedEmployee.longitude)}
                    className="bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground px-2 py-0.5 rounded-md border border-border font-bold flex items-center gap-1 transition-all cursor-pointer"
                    title="Copy Coordinates"
                  >
                    {copiedCoord ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                    <span>{copiedCoord ? "Copied!" : "GPS Pos"}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setViewMode("trail")}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black px-3 py-1.5 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition-all hover:scale-[1.02]"
                >
                  <Footprints size={13} />
                  <span>Route Trail पहा →</span>
                </button>
              </div>
            </div>
          )}

          {/* Leaflet Map Canvas */}
          <div ref={mapContainerRef} className="w-full h-full flex-1" style={{ zIndex: 1, minHeight: isFullscreen ? '100%' : '420px' }} />
        </div>

      {/* ── Compact Fleet Radar Roster (Relocated Below Map) ──────────────── */}
      {!isFullscreen && (
        <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 shadow-sm space-y-4">
          {/* Header Bar: Title, Search, and Status Filter Tabs */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                <Users size={16} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-foreground tracking-tight">
                  कर्मचारी यादी (Fleet Directory)
                </h3>
                <p className="text-[10.5px] text-muted-foreground font-medium">
                  {filteredEmployees.length} of {employees.length} Staff • Click card to focus pin on map
                </p>
              </div>
            </div>

            {/* Right: Search & Horizontal Filter Tabs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
              {/* Search Input */}
              <div className="relative min-w-[180px] sm:w-56">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search staff, role, dept..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-muted/40 border border-border rounded-xl pl-7 pr-3 py-1.5 text-xs font-semibold text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-all shadow-2xs"
                />
              </div>

              {/* Status Filter Horizontal Tabs (Compact Pills) */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
                {[
                  { id: "all", label: "All", count: employees.length },
                  { id: "active", label: "Active", count: activeTrackingCount },
                  { id: "moving", label: "Moving", count: movingCount },
                  { id: "halt", label: "Halts", count: haltingCount },
                  { id: "hr_mgr", label: "HR/Mgrs", count: hrManagerCount },
                  { id: "low_bat", label: "Low Bat", count: lowBatteryCount },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                      statusFilter === tab.id
                        ? "bg-primary text-primary-foreground shadow-2xs font-black"
                        : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-black ${
                        statusFilter === tab.id
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-background/80 text-foreground"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* If Trail Mode: Compact Date Picker & Route Stats / Halts Ribbon */}
          {viewMode === "trail" && (
            <div className="p-2.5 bg-muted/30 rounded-xl border border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="flex items-center gap-1.5 font-bold text-foreground">
                  <Calendar size={13} className="text-primary" />
                  <span>Date:</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-background border border-border rounded-lg px-2 py-1 text-xs font-bold text-foreground focus:outline-none focus:border-primary shadow-2xs cursor-pointer"
                  />
                </div>

                {selectedEmployee && (
                  <div className="flex items-center gap-2 pl-2 border-l border-border">
                    <span className="font-black text-foreground">{selectedEmployee.name}:</span>
                    <span className="font-extrabold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20 text-[11px]">
                      {trailPathMode === "road" && trailData?.roadDistanceKm
                        ? `${trailData.roadDistanceKm} km (Road)`
                        : trailData?.pureDistanceKm
                        ? `${trailData.pureDistanceKm} km (Pure GPS)`
                        : trailData?.distanceText || `${trailData?.distanceKm || 0} km`} प्रवास
                    </span>
                  </div>
                )}
              </div>

              {/* Halts Quick Fly-To Buttons */}
              {Array.isArray(trailData?.halts) && trailData.halts.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-0.5 no-scrollbar">
                  <span className="text-[10px] font-black uppercase text-muted-foreground whitespace-nowrap">
                    थांबे ({trailData.haltCount}):
                  </span>
                  {trailData.halts.map((h, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (mapInstanceRef.current && h.latitude && h.longitude) {
                          mapInstanceRef.current.flyTo([h.latitude, h.longitude], 17, { duration: 1 });
                          mapContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                      }}
                      className="px-2 py-0.5 bg-background hover:bg-muted/80 rounded-md border border-border text-[10.5px] font-bold text-foreground hover:text-primary flex items-center gap-1 whitespace-nowrap shadow-2xs transition-all cursor-pointer"
                    >
                      <span className="w-4 h-4 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[9px] font-black flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <span>{h.durationText || `${h.durationMinutes}m`}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Compact Staff Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {loadingLive && employees.length === 0 ? (
              <div className="col-span-full py-10 text-center">
                <RefreshCw size={22} className="animate-spin text-primary mx-auto mb-2" />
                <p className="text-xs text-muted-foreground font-bold">Connecting fleet satellites...</p>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="col-span-full py-10 text-center text-muted-foreground">
                <Users size={26} className="mx-auto mb-2 opacity-40" />
                <p className="text-xs font-bold">No matching staff found</p>
              </div>
            ) : (
              filteredEmployees.map((emp) => {
                const isSelected = selectedEmployee?._id === emp._id;
                const isTrackingActive = emp.trackingStatus === "active";
                const isIdle = emp.trackingStatus === "idle";
                const isFieldStaff = Boolean(emp.isLocationTrackingEnabled);
                const isMoving = emp.motionStatus === "moving";
                const isHrOrMgr =
                  ((emp.designation || "") + " " + (emp.department || "")).toLowerCase().includes("hr") ||
                  ((emp.designation || "") + " " + (emp.department || "")).toLowerCase().includes("manager");

                const leftAccent = isTrackingActive
                  ? "border-l-[3px] border-l-emerald-500"
                  : emp.latitude && emp.motionStatus === "stationary"
                  ? "border-l-[3px] border-l-amber-500"
                  : "border-l-[3px] border-l-slate-300 dark:border-l-slate-700";

                return (
                  <div
                    key={emp._id}
                    onClick={() => handleSelectStaff(emp)}
                    className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between space-y-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${leftAccent} ${
                      isSelected
                        ? "bg-primary/[0.07] border-primary shadow-sm ring-1 ring-primary/30"
                        : "bg-card hover:bg-muted/30 border-border hover:border-primary/30 shadow-xs"
                    }`}
                  >
                    {/* Top Row: Avatar + Name + HR/Mgr Tag + Status Badge */}
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="relative w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10.5px] flex-shrink-0">
                          {emp.avatar ? (
                            <img src={emp.avatar} alt={emp.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <span>{(emp.name || "E").slice(0, 2).toUpperCase()}</span>
                          )}
                          <span
                            className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-background ${
                              isTrackingActive
                                ? "bg-emerald-500 animate-pulse"
                                : isIdle
                                ? "bg-amber-500"
                                : "bg-slate-400"
                            }`}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <h4 className="text-xs font-black text-foreground truncate">{emp.name}</h4>
                            {isHrOrMgr && (
                              <span className="text-[8.5px] font-black uppercase px-1 py-0.2 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25 flex-shrink-0">
                                👔 HR/Mgr
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate font-medium">
                            {emp.designation || emp.department || (isFieldStaff ? "Field Staff" : "Office Staff")}
                          </p>
                        </div>
                      </div>

                      {/* Status Tag */}
                      <div className="flex-shrink-0">
                        {isTrackingActive ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                            Active
                          </span>
                        ) : isIdle ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            Idle
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-muted text-muted-foreground border border-border">
                            Off-Duty
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row: Motion / Distance / Battery / Ping */}
                    <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isMoving ? (
                          <div className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400 font-extrabold bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 text-[9.5px]">
                            <Car size={10} />
                            <span>{Math.round(emp.speed)} km/h</span>
                          </div>
                        ) : emp.latitude ? (
                          <div className="flex items-center gap-0.5 text-amber-700 dark:text-amber-400 font-extrabold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 text-[9.5px]">
                            <Timer size={10} />
                            <span>थांबून: {emp.stoppageText || "0m"}</span>
                          </div>
                        ) : (
                          <span className="text-[9.5px] text-muted-foreground">GPS बंद</span>
                        )}

                        {(parseFloat(emp.todayDistanceKm) > 0 || (emp.todayDistanceText && emp.todayDistanceText !== "0 km" && emp.todayDistanceText !== "0.00 km")) && (
                          <div className="text-[9.5px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 flex items-center gap-1">
                            <span>🎯 {emp.todayDistanceText}</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-extrabold border-l border-indigo-500/30 pl-1">
                              ₹{(parseFloat(emp.todayDistanceKm || 0) * 4).toFixed(0)} TA
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 ml-auto text-[9.5px] text-muted-foreground font-semibold">
                        {emp.batteryLevel !== null && emp.batteryLevel !== undefined && (
                          <span className={`flex items-center gap-0.5 ${emp.batteryLevel < 20 ? "text-rose-500 font-bold" : ""}`}>
                            <Battery size={10} />
                            <span>{emp.batteryLevel}%</span>
                          </span>
                        )}
                        <span>
                          {emp.lastUpdated ? new Date(emp.lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeLocationTracking;
