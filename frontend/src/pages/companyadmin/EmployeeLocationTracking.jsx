import { useState, useEffect, useRef, useMemo } from "react";
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
  ChevronRight,
  Layers,
  Globe,
  Map as MapIcon,
  Timer,
  Car,
  AlertCircle,
  Phone,
  Battery,
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
  const [mapType, setMapType] = useState("satellite"); // "street" | "satellite"
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "active" | "halt" | "moving" | "stopped"
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [mapReady, setMapReady] = useState(false);

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

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && emp.trackingStatus === "active") ||
        (statusFilter === "field" && Boolean(emp.isLocationTrackingEnabled)) ||
        (statusFilter === "office" && !emp.isLocationTrackingEnabled) ||
        (statusFilter === "halt" && emp.motionStatus === "stationary" && emp.latitude) ||
        (statusFilter === "moving" && emp.motionStatus === "moving") ||
        (statusFilter === "stopped" && (emp.trackingStatus === "stopped" || emp.trackingStatus === "no_signal" || emp.trackingStatus === "disabled"));

      return matchesSearch && matchesStatus;
    });
  }, [employees, searchTerm, statusFilter]);

  // Tracking & Motion Metrics
  const activeTrackingCount = useMemo(
    () => employees.filter((e) => e.trackingStatus === "active" && e.latitude).length,
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
  const onlineCount = useMemo(() => employees.filter((e) => e.isOnline && e.latitude).length, [employees]);

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

        // Custom HTML Marker icon with avatar / status pulse dot
        const iconHtml = `
          <div style="position: relative; width: 46px; height: 46px; display: flex; align-items: center; justify-content: center;">
            ${statusBadgeHtml}
            <div style="
              width: 40px; height: 40px; border-radius: 50%; 
              border: 3.5px solid ${borderColor};
              background: #0F172A; color: #FFFFFF; display: flex; align-items: center; justify-content: center;
              font-size: 13px; font-weight: 800; box-shadow: 0 4px 12px rgba(0,0,0,0.5); overflow: hidden;
            ">
              ${
                emp.avatar
                  ? `<img src="${emp.avatar}" style="width: 100%; height: 100%; object-fit: cover;" />`
                  : `<span>${(emp.name || "E").slice(0, 2).toUpperCase()}</span>`
              }
            </div>
            <div style="
              position: absolute; bottom: 1px; right: 1px; width: 13px; height: 13px; border-radius: 50%;
              background: ${isTrackingActive ? "#10B981" : isIdle ? "#F59E0B" : "#EF4444"}; border: 2.5px solid #FFFFFF;
            "></div>
          </div>
        `;

        const customIcon = L.divIcon({
          html: iconHtml,
          className: "custom-leaflet-marker",
          iconSize: [46, 46],
          iconAnchor: [23, 23],
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
    } else if (viewMode === "trail" && trailData?.trail?.length > 0) {
      const activePoints = trailData.trail;
      const isStationary = trailData.isStationaryAllDay || trailData.distanceKm === 0 || activePoints.length < 2;

      if (isStationary) {
        // Employee stayed at one location all day: DO NOT DRAW SPIDERWEB LINES!
        const pt = activePoints[0];
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

      // Outer glow line for high visibility on both Satellite & Street maps
      const polylineGlow = L.polyline(latlngs, {
        color: "#1E40AF",
        weight: 8,
        opacity: 0.4,
        lineJoin: "round",
      });
      polylineLayerRef.current.addLayer(polylineGlow);

      // Draw EXACT traveled route line
      const polyline = L.polyline(latlngs, {
        color: "#2563EB",
        weight: 5,
        opacity: 0.95,
        smoothFactor: 1.2,
        lineJoin: "round",
        lineCap: "round",
      });
      polylineLayerRef.current.addLayer(polyline);

      // Directional Navigation Arrows along the route path (shows exact direction of travel)
      if (activePoints.length > 1) {
        const step = activePoints.length > 100 ? 5 : activePoints.length > 40 ? 3 : 1;
        for (let i = 0; i < activePoints.length - 1; i += step) {
          const p1 = activePoints[i];
          const p2 = activePoints[Math.min(i + step, activePoints.length - 1)];

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
  }, [employees, viewMode, trailData, selectedEmployee, mapReady]);

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
    }
  };

  return (
    <div className="space-y-4 w-full pb-8">
      {/* ── Top Header Bar ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-border">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Navigation size={18} />
            </div>
            <h1 className="text-xl font-black text-foreground tracking-tight">Live Employee Location Radar</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1.5" />
              {onlineCount} Field Staff Live
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time GPS satellite tracking, duty movement radar, and historical travel routes for on-field team members.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center space-x-2 bg-muted/60 p-1 rounded-xl border border-border">
          <button
            type="button"
            onClick={() => setViewMode("live")}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center space-x-1.5 cursor-pointer ${
              viewMode === "live"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Navigation size={13} />
            <span>Live Fleet Radar</span>
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
              if (bestEmp) {
                setSelectedEmployee(bestEmp);
              }
              setTimeout(() => {
                mapInstanceRef.current?.invalidateSize({ pan: false });
              }, 150);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center space-x-1.5 cursor-pointer ${
              viewMode === "trail"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Footprints size={13} />
            <span>Route Trail History</span>
          </button>
          <button
            type="button"
            onClick={() => refetchLive()}
            title="Refresh GPS Locations"
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition-all cursor-pointer"
          >
            <RefreshCw size={14} className={isFetchingLive ? "animate-spin text-primary" : ""} />
          </button>
        </div>
      </div>

      {/* ── 4 Top KPI Cards (Live Radar vs Route Trail Mode) ─────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {viewMode === "trail" ? (
          <>
            {/* Trail Metric 1: Actual Distance */}
            <div className="bg-card p-4 rounded-2xl border border-border shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                  एकूण प्रत्यक्ष अंतर (Actual Distance)
                </p>
                <h3 className="text-2xl font-black text-blue-600 mt-0.5">
                  {trailData?.distanceText || `${trailData?.distanceKm || 0} km`}
                </h3>
                <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">
                  GPS Jitter-filtered road path
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <Navigation size={20} />
              </div>
            </div>

            {/* Trail Metric 2: Total Stoppages Time */}
            <div className="bg-card p-4 rounded-2xl border border-border shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                  एकूण थांबलेला वेळ (Stoppages)
                </p>
                <h3 className="text-2xl font-black text-rose-600 mt-0.5">
                  {trailData?.totalHaltTimeText || "0 mins"}
                </h3>
                <p className="text-[10px] font-semibold text-rose-600 mt-0.5">
                  {trailData?.haltCount || 0} प्रवासातील थांबे (Halts)
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                <Timer size={20} />
              </div>
            </div>

            {/* Trail Metric 3: Travel Time */}
            <div className="bg-card p-4 rounded-2xl border border-border shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                  रस्त्यावरील वेळ (In-Motion)
                </p>
                <h3 className="text-2xl font-black text-emerald-600 mt-0.5">
                  {trailData?.totalMovingTimeText || "0 mins"}
                </h3>
                <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">
                  Active driving & walking time
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Clock size={20} />
              </div>
            </div>

            {/* Trail Metric 4: Max & Avg Speed */}
            <div className="bg-card p-4 rounded-2xl border border-border shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                  कमाल व सरासरी गती (Speed)
                </p>
                <h3 className="text-2xl font-black text-foreground mt-0.5">
                  {trailData?.maxSpeed || 0} <span className="text-sm font-bold text-muted-foreground">km/h max</span>
                </h3>
                <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">
                  Avg: {trailData?.avgSpeed || 0} km/h on route
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Activity size={20} />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Active Tracking Card */}
            <div className="bg-card p-4 rounded-2xl border border-border shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">ट्रॅकिंग चालू (Active)</p>
                <h3 className="text-2xl font-black text-emerald-600 mt-0.5">{activeTrackingCount}</h3>
                <p className="text-[10px] font-semibold text-emerald-600 mt-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live GPS Transmitting
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Navigation size={20} />
              </div>
            </div>

            {/* Halting / Stopped Card */}
            <div className="bg-card p-4 rounded-2xl border border-border shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">एकाच ठिकाणी थांबलेले</p>
                <h3 className="text-2xl font-black text-rose-600 mt-0.5">{haltingCount}</h3>
                <p className="text-[10px] font-semibold text-rose-600 mt-0.5">Stationary &gt; 2 mins at location</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                <Timer size={20} />
              </div>
            </div>

            {/* Moving on Route Card */}
            <div className="bg-card p-4 rounded-2xl border border-border shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">रस्त्यावर चलनात असणारे</p>
                <h3 className="text-2xl font-black text-blue-600 mt-0.5">{movingCount}</h3>
                <p className="text-[10px] font-semibold text-blue-600 mt-0.5">In Transit / Moving</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <Car size={20} />
              </div>
            </div>

            {/* Stopped / Off-Duty Card */}
            <div className="bg-card p-4 rounded-2xl border border-border shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">ट्रॅकिंग बंद (Stopped)</p>
                <h3 className="text-2xl font-black text-slate-500 mt-0.5">{stoppedTrackingCount}</h3>
                <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">Punched out / Signal off</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-500/10 text-slate-500 flex items-center justify-center">
                <AlertCircle size={20} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Main Split View (Map 72% + Staff Panel 28%) ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[630px]">
        {/* Left Interactive Map Box */}
        <div className="lg:col-span-8 bg-card rounded-2xl border border-border overflow-hidden relative shadow-xs flex flex-col min-h-[500px]">
          {/* Map Top Left Floating Info */}
          <div className="absolute top-3 left-3 z-10 bg-slate-900/90 backdrop-blur-md text-white border border-white/20 px-3.5 py-2 rounded-xl shadow-lg flex items-center space-x-2">
            <span className="text-[11.5px] font-extrabold flex items-center gap-2">
              <MapPin size={14} className="text-amber-400" />
              {viewMode === "live"
                ? `Live Radar (${onlineCount} active markers)`
                : `Route Trail: ${selectedEmployee?.name || "Select Staff"} (${selectedDate})`}
            </span>
          </div>

          {/* Map Top Right Layer Switcher Controls (Satellite / Street) */}
          <div className="absolute top-3 right-14 z-10 bg-slate-900/90 backdrop-blur-md border border-white/20 p-1 rounded-xl shadow-lg flex items-center space-x-1">
            <button
              type="button"
              onClick={() => handleMapTypeChange("satellite")}
              title="Switch to Google Satellite Map"
              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                mapType === "satellite"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <Globe size={13} />
              <span>Satellite</span>
            </button>

            <button
              type="button"
              onClick={() => handleMapTypeChange("street")}
              title="Switch to Street Map"
              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                mapType === "street"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <MapIcon size={13} />
              <span>Street</span>
            </button>
          </div>

          {/* Selected Employee Quick Focus Bottom Floating Banner */}
          {selectedEmployee && selectedEmployee.latitude && (
            <div className="absolute bottom-4 left-4 right-4 md:right-auto md:max-w-md z-20 bg-slate-950/95 backdrop-blur-md text-white border border-white/20 p-3.5 rounded-2xl shadow-2xl flex flex-col gap-2 transition-all animate-in fade-in">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-amber-400 overflow-hidden flex items-center justify-center font-bold text-xs">
                    {selectedEmployee.avatar ? (
                      <img src={selectedEmployee.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span>{(selectedEmployee.name || "E").slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white">{selectedEmployee.name}</h4>
                    <p className="text-[10px] text-slate-300">{selectedEmployee.designation || "Staff"}</p>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                    selectedEmployee.trackingStatus === "active"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : selectedEmployee.trackingStatus === "idle"
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                  }`}
                >
                  {selectedEmployee.trackingStatus === "active"
                    ? "🟢 ट्रॅकिंग चालू (Active)"
                    : selectedEmployee.trackingStatus === "idle"
                    ? "🟡 GPS सुस्त (Idle)"
                    : "🔴 ट्रॅकिंग बंद (Stopped)"}
                </span>
              </div>

              {/* Stoppage or Motion Highlights */}
              <div className="flex items-center justify-between bg-white/5 p-2 rounded-xl border border-white/10 text-xs">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">
                    {selectedEmployee.motionStatus === "moving" ? "Current Motion" : "हॉल्ट वेळ (Stoppage Duration)"}
                  </p>
                  <p className="font-extrabold text-sm text-amber-400 flex items-center gap-1.5 mt-0.5">
                    {selectedEmployee.motionStatus === "moving" ? (
                      <>
                        <Car size={14} className="text-blue-400" />
                        <span>रस्त्यावर चालू: {Math.round(selectedEmployee.speed)} km/h</span>
                      </>
                    ) : (
                      <>
                        <Timer size={14} className="text-rose-400" />
                        <span>येथे थांबून: {selectedEmployee.stoppageText || "0 mins"}</span>
                      </>
                    )}
                  </p>
                </div>

                {selectedEmployee.stoppedSince && selectedEmployee.motionStatus !== "moving" && (
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-bold">पोहोचल्याची वेळ</p>
                    <p className="text-xs font-bold text-white mt-0.5">
                      {new Date(selectedEmployee.stoppedSince).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-[10.5px] text-slate-300 pt-0.5">
                <span className="flex items-center gap-1.5 flex-wrap">
                  <span>
                    ⏱️ शेवटचे सिग्नल:{" "}
                    <b>
                      {selectedEmployee.lastUpdated
                        ? new Date(selectedEmployee.lastUpdated).toLocaleTimeString()
                        : "N/A"}
                    </b>{" "}
                    {selectedEmployee.minutesSinceLastPing !== null
                      ? `(${selectedEmployee.minutesSinceLastPing}m ago)`
                      : ""}
                  </span>
                  {selectedEmployee.todayDistanceText && (
                    <span className="bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30 font-bold">
                      🛣️ आजचा प्रवास: {selectedEmployee.todayDistanceText}
                    </span>
                  )}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setViewMode("trail");
                  }}
                  className="text-primary hover:underline text-[10px] font-black cursor-pointer flex items-center gap-1"
                >
                  <Footprints size={12} />
                  <span>Route Trail पहा</span>
                </button>
              </div>
            </div>
          )}

          {/* Map Container */}
          <div ref={mapContainerRef} className="w-full h-full flex-1 min-h-[480px]" style={{ zIndex: 1 }} />
        </div>

        {/* Right Staff List & Trail Controls */}
        <div className="lg:col-span-4 bg-card rounded-2xl border border-border p-4 flex flex-col h-full shadow-xs">
          {/* If Trail Mode: Show Date Selector & Selected Staff Route Stats */}
          {viewMode === "trail" && (
            <div className="mb-3 p-3 bg-muted/50 rounded-xl border border-border space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-foreground flex items-center gap-1">
                  <Calendar size={13} className="text-primary" /> Select Date:
                </span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-card border border-border rounded-lg px-2 py-1 text-xs font-bold text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              {selectedEmployee && (
                <div className="pt-2 border-t border-border/60 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-foreground">{selectedEmployee.name}</span>
                    <span className="font-black text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                      {trailData?.distanceText || `${trailData?.distanceKm || 0} km`} प्रत्यक्ष अंतर
                    </span>
                  </div>

                  {/* Route Halts Stoppages List */}
                  {Array.isArray(trailData?.halts) && trailData.halts.length > 0 && (
                    <div className="mt-2 space-y-1.5 pt-1.5 border-t border-border/40">
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider flex items-center justify-between">
                        <span>प्रवासातील थांबे (Stoppages):</span>
                        <span className="text-rose-600 font-bold">{trailData.haltCount} थांबे</span>
                      </p>

                      <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                        {trailData.halts.map((h, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              if (mapInstanceRef.current && h.latitude && h.longitude) {
                                mapInstanceRef.current.flyTo([h.latitude, h.longitude], 17, { duration: 1 });
                              }
                            }}
                            className="p-1.5 bg-card hover:bg-muted/80 rounded-lg border border-border/70 text-[11px] flex items-center justify-between cursor-pointer transition-all"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-rose-500/15 text-rose-600 font-black text-[9.5px] flex items-center justify-center flex-shrink-0">
                                #{idx + 1}
                              </span>
                              <div>
                                <span className="font-extrabold text-foreground">{h.durationText || `${h.durationMinutes}m`} थांबले</span>
                                <p className="text-[9.5px] text-muted-foreground">
                                  {new Date(h.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {new Date(h.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </p>
                              </div>
                            </div>
                            <span className="text-[9px] font-bold text-primary hover:underline">पहा →</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Search Bar */}
          <div className="relative mb-2.5">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search field staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-muted/40 border border-border rounded-xl pl-8 pr-3 py-1.5 text-xs font-semibold text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-all"
            />
          </div>

          {/* Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-1 mb-3">
            {[
              { id: "all", label: `All (${employees.length})` },
              { id: "active", label: `🟢 चालू (${activeTrackingCount})` },
              { id: "halt", label: `🛑 थांबलेले (${haltingCount})` },
              { id: "moving", label: `🚗 चलनात (${movingCount})` },
              { id: "field", label: `🗺️ Field Staff (${fieldStaffCount})` },
              { id: "office", label: `🏢 Office Staff (${officeStaffCount})` },
            ].map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => setStatusFilter(pill.id)}
                className={`px-2 py-1 rounded-lg text-[9.5px] font-extrabold transition-all border cursor-pointer ${
                  statusFilter === pill.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Staff Scrollable List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {loadingLive && employees.length === 0 ? (
              <div className="py-12 text-center">
                <RefreshCw size={24} className="animate-spin text-primary mx-auto mb-2" />
                <p className="text-xs text-muted-foreground font-bold">Connecting live GPS satellites...</p>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Users size={28} className="mx-auto mb-2 opacity-40" />
                <p className="text-xs font-bold">No matching staff found</p>
              </div>
            ) : (
              filteredEmployees.map((emp) => {
                const isSelected = selectedEmployee?._id === emp._id;
                const isTrackingActive = emp.trackingStatus === "active";
                const isIdle = emp.trackingStatus === "idle";
                const isFieldStaff = Boolean(emp.isLocationTrackingEnabled);

                return (
                  <div
                    key={emp._id}
                    onClick={() => handleSelectStaff(emp)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col space-y-2 ${
                      isSelected
                        ? "bg-primary/10 border-primary shadow-xs"
                        : "bg-card border-border hover:border-primary/40 hover:bg-muted/30"
                    }`}
                  >
                    {/* Top Row: Avatar + Name + Tracking Status Badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="relative w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {emp.avatar ? (
                            <img src={emp.avatar} alt={emp.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <span>{(emp.name || "E").slice(0, 2).toUpperCase()}</span>
                          )}
                          <span
                            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-card ${
                              !isFieldStaff
                                ? "bg-slate-400"
                                : isTrackingActive
                                ? "bg-emerald-500 animate-pulse"
                                : isIdle
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            }`}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-black text-foreground truncate">{emp.name}</h4>
                            {!isFieldStaff && (
                              <span className="text-[8.5px] font-black uppercase px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                                Office
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate font-medium">
                            {emp.designation || emp.department || (isFieldStaff ? "Field Staff" : "Office Staff")}
                          </p>
                        </div>
                      </div>

                      {/* Tracking State Badge */}
                      <div className="text-right flex-shrink-0 pl-1">
                        {!isFieldStaff ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30">
                            🏢 ट्रॅकिंग नाही
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                              isTrackingActive
                                ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                                : isIdle
                                ? "bg-amber-500/15 text-amber-600 border border-amber-500/30"
                                : "bg-rose-500/15 text-rose-600 border border-rose-500/30"
                            }`}
                          >
                            {isTrackingActive ? (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                                चालू (Active)
                              </>
                            ) : isIdle ? (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1" />
                                सुस्त (Idle)
                              </>
                            ) : (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1" />
                                बंद (Stopped)
                              </>
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row: Stoppage Time / Motion Speed + Today's Distance + Last Update */}
                    <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[11px] flex-wrap gap-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {emp.motionStatus === "moving" ? (
                          <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-extrabold bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20">
                            <Car size={12} />
                            <span>रस्त्यावर चालू: {Math.round(emp.speed)} km/h</span>
                          </div>
                        ) : emp.latitude ? (
                          <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-extrabold bg-rose-500/10 px-2 py-0.5 rounded-lg border border-rose-500/20">
                            <Timer size={12} />
                            <span>थांबून: {emp.stoppageText || "0 mins"}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-muted-foreground font-semibold text-[10px]">
                            <span>लोकेशन प्राप्त नाही</span>
                          </div>
                        )}

                        {emp.todayDistanceText && (
                          <div className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                            🛣️ {emp.todayDistanceText}
                          </div>
                        )}
                      </div>

                      <div className="text-[10px] text-muted-foreground font-semibold ml-auto">
                        ⏱️ {emp.lastUpdated ? new Date(emp.lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "N/A"}
                        {emp.minutesSinceLastPing !== null ? ` (${emp.minutesSinceLastPing}m)` : ""}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeLocationTracking;
