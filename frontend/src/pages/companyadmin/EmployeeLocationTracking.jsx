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

const CARD_THEMES = {
  blue: {
    baseClass: "bg-blue-50/60 dark:bg-blue-950/20 border-blue-200/80 dark:border-blue-900/40 text-blue-950 dark:text-blue-200",
    activeClass: "bg-blue-100/90 dark:bg-blue-900/40 border-blue-500 dark:border-blue-500 text-blue-950 dark:text-blue-100 ring-2 ring-blue-500/30 shadow-xs",
    topBar: "bg-blue-500",
    labelText: "text-blue-700 dark:text-blue-300 font-extrabold",
    valueText: "text-blue-600 dark:text-blue-400",
    subText: "text-blue-700/80 dark:text-blue-300/80 font-bold",
  },
  amber: {
    baseClass: "bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/40 text-amber-950 dark:text-amber-200",
    activeClass: "bg-amber-100/90 dark:bg-amber-900/40 border-amber-500 dark:border-amber-500 text-amber-950 dark:text-amber-100 ring-2 ring-amber-500/30 shadow-xs",
    topBar: "bg-amber-500",
    labelText: "text-amber-800 dark:text-amber-300 font-extrabold",
    valueText: "text-amber-600 dark:text-amber-400",
    subText: "text-amber-700/80 dark:text-amber-300/80 font-bold",
  },
  sky: {
    baseClass: "bg-sky-50/60 dark:bg-sky-950/20 border-sky-200/80 dark:border-sky-900/40 text-sky-950 dark:text-sky-200",
    activeClass: "bg-sky-100/90 dark:bg-sky-900/40 border-sky-500 dark:border-sky-500 text-sky-950 dark:text-sky-100 ring-2 ring-sky-500/30 shadow-xs",
    topBar: "bg-sky-500",
    labelText: "text-sky-700 dark:text-sky-300 font-extrabold",
    valueText: "text-sky-600 dark:text-sky-400",
    subText: "text-sky-700/80 dark:text-sky-300/80 font-bold",
  },
  indigo: {
    baseClass: "bg-indigo-50/60 dark:bg-indigo-950/20 border-indigo-200/80 dark:border-indigo-900/40 text-indigo-950 dark:text-indigo-200",
    activeClass: "bg-indigo-100/90 dark:bg-indigo-900/40 border-indigo-500 dark:border-indigo-500 text-indigo-950 dark:text-indigo-100 ring-2 ring-indigo-500/30 shadow-xs",
    topBar: "bg-indigo-500",
    labelText: "text-indigo-700 dark:text-indigo-300 font-extrabold",
    valueText: "text-indigo-600 dark:text-indigo-400",
    subText: "text-indigo-700/80 dark:text-indigo-300/80 font-bold",
  },
  emerald: {
    baseClass: "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/40 text-emerald-950 dark:text-emerald-200",
    activeClass: "bg-emerald-100/90 dark:bg-emerald-900/40 border-emerald-500 dark:border-emerald-500 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/30 shadow-xs",
    topBar: "bg-emerald-500",
    labelText: "text-emerald-800 dark:text-emerald-300 font-extrabold",
    valueText: "text-emerald-600 dark:text-emerald-400",
    subText: "text-emerald-700/80 dark:text-emerald-300/80 font-bold",
  },
  rose: {
    baseClass: "bg-rose-50/60 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/40 text-rose-950 dark:text-rose-200",
    activeClass: "bg-rose-100/90 dark:bg-rose-900/40 border-rose-500 dark:border-rose-500 text-rose-950 dark:text-rose-100 ring-2 ring-rose-500/30 shadow-xs",
    topBar: "bg-rose-500",
    labelText: "text-rose-800 dark:text-rose-300 font-extrabold",
    valueText: "text-rose-600 dark:text-rose-400",
    subText: "text-rose-700/80 dark:text-rose-300/80 font-bold",
  },
};

const TelemetryCard = ({ label, value, subLabel, theme = "blue", icon: Icon, onClick, isActive = false }) => {
  const cfg = CARD_THEMES[theme] || CARD_THEMES.blue;
  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl border transition-all duration-200 select-none p-3 sm:p-3.5 flex flex-col justify-between min-h-[80px] ${
        onClick ? "cursor-pointer active:scale-[0.98]" : ""
      } ${
        isActive ? cfg.activeClass : cfg.baseClass
      }`}
    >
      <div className={`absolute top-0 left-0 right-0 h-[3.5px] ${cfg.topBar}`} />
      <div className="flex items-center justify-between gap-1 mb-1 pt-0.5">
        <span className={`text-[10px] sm:text-[11px] uppercase tracking-wider truncate font-extrabold ${cfg.labelText}`}>
          {label}
        </span>
        {Icon && (
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${cfg.valueText} bg-white/70 dark:bg-black/30 border border-white/50 dark:border-white/10`}>
            <Icon size={13} strokeWidth={2.5} />
          </div>
        )}
      </div>
      <div className="flex items-baseline justify-between gap-1">
        <h3 className={`text-xl sm:text-2xl font-black font-mono tracking-tight leading-none ${cfg.valueText}`}>
          {value}
        </h3>
        {subLabel && (
          <span className={`text-[10.5px] font-semibold truncate ${cfg.subText}`}>
            {subLabel}
          </span>
        )}
      </div>
    </div>
  );
};

const EmployeeLocationTracking = () => {
  const { user } = useAuth();
  const isEmployee = (user?.role || "").toLowerCase() === "employee";
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
  const todayStr = useMemo(() => new Date().toLocaleDateString("en-CA"), []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toLocaleDateString("en-CA");
  }, []);
  const [mapReady, setMapReady] = useState(false);
  const [isRadarSweepActive, setIsRadarSweepActive] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedCoord, setCopiedCoord] = useState(false);

  // Fetch Live Employees Query
  const {
    data: liveResponse,
    isLoading: loadingLive,
    refetch: refetchLive,
    isFetching: isFetchingLive,
  } = useQuery({
    queryKey: ["liveEmployeeLocations", selectedDate],
    queryFn: async () => {
      const res = await getLiveEmployeeLocationsApi({ date: selectedDate });
      return res.data || {};
    },
    refetchInterval: selectedDate === todayStr ? 4000 : false, // 4s live polling only for today
  });

  const employees = useMemo(() => {
    let list = [];
    if (Array.isArray(liveResponse)) list = liveResponse;
    else if (Array.isArray(liveResponse?.data)) list = liveResponse.data;
    // Strictly display only employees who have location tracking access enabled by admin
    return list.filter((emp) => Boolean(emp.isLocationTrackingEnabled));
  }, [liveResponse]);

  const officeLocation = useMemo(() => {
    return liveResponse?.officeLocation || employees[0]?.officeLocation || null;
  }, [liveResponse, employees]);

  // Auto-select employee with active GPS coordinates and dynamically re-focus on date changes
  useEffect(() => {
    if (employees.length === 0) return;

    // Check if currently selected employee is present in this date's fetched employee list
    const existing = selectedEmployee
      ? employees.find((e) => String(e._id) === String(selectedEmployee._id))
      : null;

    if (existing) {
      // If current selected employee has tracking on this selected date, preserve selection
      if (existing.isTrackingActive || existing.latitude) {
        setSelectedEmployee(existing);
        return;
      }
      // On today, keep selected employee even if stationary or pending punch
      if (selectedDate === todayStr) {
        setSelectedEmployee(existing);
        return;
      }
    }

    // On past dates (or if current employee has no tracking on this date), auto-select first active employee
    const bestEmp =
      employees.find((e) => e.isTrackingActive && e.latitude && e.longitude) ||
      employees.find((e) => e.isTrackingActive) ||
      employees.find((e) => (e.isOnline || e.trackingStatus === "active") && e.latitude) ||
      employees.find((e) => e.latitude && e.longitude) ||
      employees[0];

    if (bestEmp) {
      setSelectedEmployee(bestEmp);
    }
  }, [employees, selectedDate, todayStr]);


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
    enabled: Boolean(selectedEmployee?._id && (viewMode === "trail" || selectedDate !== todayStr)),
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
        (statusFilter === "active" && Boolean(emp.isTrackingActive)) ||
        (statusFilter === "inactive" && !emp.isTrackingActive) ||
        (statusFilter === "field" && Boolean(emp.isLocationTrackingEnabled)) ||
        (statusFilter === "office" && !emp.isLocationTrackingEnabled) ||
        (statusFilter === "halt" && emp.motionStatus === "stationary" && emp.latitude) ||
        (statusFilter === "moving" && emp.motionStatus === "moving") ||
        (statusFilter === "low_bat" && emp.batteryLevel !== null && emp.batteryLevel !== undefined && emp.batteryLevel < 20) ||
        (statusFilter === "stopped" && (!emp.isTrackingActive || emp.trackingStatus === "stopped" || emp.trackingStatus === "no_signal" || emp.trackingStatus === "disabled"));

      return matchesSearch && matchesStatus;
    });
  }, [employees, searchTerm, statusFilter]);

  // Tracking & Motion Metrics
  const activeTrackingCount = useMemo(
    () => employees.filter((e) => e.isTrackingActive && e.latitude).length,
    [employees]
  );
  const activeTrackedCount = useMemo(
    () => employees.filter((e) => e.isTrackingActive).length,
    [employees]
  );
  const inactiveCount = useMemo(
    () => employees.filter((e) => !e.isTrackingActive).length,
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
    () => employees.filter((e) => e.trackingStatus === "active" && e.motionStatus === "stationary" && e.stoppageDurationMinutes > 2 && e.latitude).length,
    [employees]
  );
  const movingCount = useMemo(
    () => employees.filter((e) => e.trackingStatus === "active" && e.motionStatus === "moving" && e.latitude).length,
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
  const onlineCount = useMemo(
    () =>
      employees.filter((e) =>
        selectedDate === todayStr ? e.isOnline && e.latitude : (e.isTrackingActive || e.isOnline) && e.latitude
      ).length,
    [employees, selectedDate, todayStr]
  );

  const totalFleetDistanceKm = useMemo(() => {
    const total = employees.reduce((acc, e) => acc + (parseFloat(e.todayDistanceKm) || 0), 0);
    return total > 0 ? total.toFixed(2) : "0";
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

    const initialCenter =
      officeLocation && officeLocation.latitude && officeLocation.longitude
        ? [officeLocation.latitude, officeLocation.longitude]
        : selectedEmployee && selectedEmployee.latitude && selectedEmployee.longitude
        ? [selectedEmployee.latitude, selectedEmployee.longitude]
        : [20.5937, 78.9629];
    const initialZoom = (officeLocation?.latitude || selectedEmployee?.latitude) ? 15 : 5;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
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
        const isTrackingActive = Boolean(emp.isTrackingActive || emp.trackingStatus === "active");
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
        if (isTrackingActive && isMoving && emp.speed > 0) {
          statusBadgeHtml = `
            <div style="position: absolute; top: -10px; font-size: 9.5px; font-weight: 800; background: #2563EB; color: #FFF; padding: 1.5px 6px; border-radius: 99px; box-shadow: 0 2px 8px rgba(0,0,0,0.5); border: 1.5px solid #FFF; white-space: nowrap; z-index: 30;">
              ⚡ ${Math.round(emp.speed)} km/h
            </div>
          `;
        } else if (isTrackingActive && emp.stoppageText && emp.stoppageText !== "0 mins") {
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
                ${
                  selectedDate !== todayStr
                    ? isTrackingActive
                      ? `🟢 Tracked (${emp.totalPoints || 0} pts)`
                      : "⚪ Not Tracked"
                    : isTrackingActive
                    ? "🟢 चालू (Active)"
                    : isIdle
                    ? "🟡 सुस्त (Idle)"
                    : "🔴 बंद (Stopped)"
                }
              </span>
            </div>

            <!-- Stoppage & Motion Highlights -->
            ${
              isTrackingActive
                ? `<div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 7px 9px; margin-bottom: 8px;">
                     <div style="display: flex; align-items: center; justify-content: space-between;">
                       <span style="font-size: 11px; font-weight: 700; color: #475569;">
                         ${selectedDate !== todayStr ? "📍 Day Route Distance:" : isMoving ? "🚗 Movement Status:" : "🛑 Stoppage Duration:"}
                       </span>
                       <span style="font-size: 12px; font-weight: 900; color: ${isMoving ? "#2563EB" : "#10B981"};">
                         ${selectedDate !== todayStr ? (emp.todayDistanceText || `${emp.todayDistanceKm || 0} km`) : isMoving ? `Moving (${Math.round(emp.speed)} km/h)` : `${emp.stoppageText || "0 mins"} थांबले`}
                       </span>
                     </div>
                     ${
                       selectedDate === todayStr && !isMoving && emp.stoppedSince
                         ? `<div style="font-size: 10px; color: #64748B; margin-top: 3px;">
                              📍 Stopped here since: <b>${new Date(emp.stoppedSince).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</b>
                            </div>`
                         : ""
                     }
                   </div>`
                : `<div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 7px 9px; margin-bottom: 8px;">
                     <span style="font-size: 11px; font-weight: 700; color: #64748B;">
                       🛑 ${selectedDate !== todayStr ? "No GPS Tracking on this Date" : emp.trackingStatus === "stopped" ? "Duty Inactive / Punched Out" : "Duty Inactive (Off-Duty)"}
                     </span>
                   </div>`
            }

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

      // Render Company Office Marker if available
      if (officeLocation && officeLocation.latitude && officeLocation.longitude) {
        const officeIcon = L.divIcon({
          html: `
            <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
              <div style="
                width: 38px; height: 38px; border-radius: 50%; 
                border: 3px solid #6366F1;
                background: #1E1B4B; color: #FFFFFF; display: flex; align-items: center; justify-content: center;
                font-size: 19px; box-shadow: 0 4px 14px rgba(0,0,0,0.6);
              ">
                🏢
              </div>
              <div style="position: absolute; bottom: -8px; font-size: 8.5px; font-weight: 800; background: #4F46E5; color: #FFF; padding: 1px 5px; border-radius: 4px; white-space: nowrap; border: 1px solid #FFF;">
                Office
              </div>
            </div>
          `,
          className: "custom-leaflet-marker",
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        });

        const officeMarker = L.marker([officeLocation.latitude, officeLocation.longitude], { icon: officeIcon })
          .bindPopup(`<b>🏢 ${officeLocation.name || "Company Office"}</b><br/><span style="font-size:11px; color:#64748B;">${officeLocation.address || "Office / Branch Headquarters"}</span>`);
        markersGroupRef.current.addLayer(officeMarker);
      }

      if (selectedEmployee?.latitude && selectedEmployee?.longitude) {
        mapInstanceRef.current.setView([selectedEmployee.latitude, selectedEmployee.longitude], 16);
      } else if (bounds.length === 1) {
        mapInstanceRef.current.setView(bounds[0], 16);
      } else if (bounds.length > 1) {
        mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 17 });
      } else if (officeLocation?.latitude && officeLocation?.longitude) {
        // Fallback to Company Office location when no tracking is active
        mapInstanceRef.current.setView([officeLocation.latitude, officeLocation.longitude], 16);
      } else {
        // Fallback to India overview
        mapInstanceRef.current.setView([20.5937, 78.9629], 5);
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
        trailData?.roadTrail && trailData.roadTrail.length > 0
          ? trailData.roadTrail
          : trailData?.trail && trailData.trail.length > 0
          ? trailData.trail
          : rawCleanPoints;
      const activePoints = roadPoints && roadPoints.length >= 2 ? roadPoints : rawCleanPoints;

      const isStationary =
        trailData.isStationaryAllDay ||
        trailData.distanceKm === 0 ||
        trailData.pureDistanceKm === 0 ||
        (trailData.distanceMeters !== undefined && trailData.distanceMeters === 0) ||
        activePoints.length < 2;

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

      const pureLatLngs = activePoints.map((pt) => [pt.latitude, pt.longitude]);

      // 🎯 Road-snapped Actual Route: Follows streets and corners smoothly
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

      drawArrows(activePoints);

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
    } else if (viewMode === "trail") {
      // No trail recorded for selected employee / date
      if (officeLocation && officeLocation.latitude && officeLocation.longitude) {
        const officeIcon = L.divIcon({
          html: `<div style="width:38px;height:38px;border-radius:50%;background:#4F46E5;border:2.5px solid #FFF;color:#FFF;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 4px 12px rgba(0,0,0,0.5);">🏢</div>`,
          iconSize: [38, 38],
          iconAnchor: [19, 19],
        });
        const offMarker = L.marker([officeLocation.latitude, officeLocation.longitude], { icon: officeIcon })
          .bindPopup(`<b>🏢 ${officeLocation.name || "Company Office"}</b><br/>No route trail for selected date (Tracking inactive or stationary at office)`);
        markersGroupRef.current.addLayer(offMarker);
        mapInstanceRef.current.setView([officeLocation.latitude, officeLocation.longitude], 16);
      } else {
        mapInstanceRef.current.setView([20.5937, 78.9629], 5);
      }
    }
  }, [employees, viewMode, trailData, selectedEmployee, mapReady, officeLocation]);

  // Center on employee when clicked in list
  const handleSelectStaff = (emp) => {
    setSelectedEmployee(emp);
    if (selectedDate !== todayStr && viewMode !== "trail") {
      setViewMode("trail");
    }
    if (emp.latitude && emp.longitude && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([emp.latitude, emp.longitude], 16, {
        duration: 1.2,
      });
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize({ pan: false });
      }, 400);
      mapContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    } else if (officeLocation?.latitude && officeLocation?.longitude && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([officeLocation.latitude, officeLocation.longitude], 16, {
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
    } else if (officeLocation?.latitude && officeLocation?.longitude) {
      mapInstanceRef.current.flyTo([officeLocation.latitude, officeLocation.longitude], 16, { duration: 1.2 });
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
    <div className={isFullscreen ? "fixed inset-0 z-50 bg-slate-50 dark:bg-[#071A2F] p-4 flex flex-col overflow-hidden font-sans text-slate-900 dark:text-slate-100" : "space-y-2.5 pb-8 font-sans text-slate-900 dark:text-slate-100 max-w-full overflow-hidden"}>
      {/* ── Scoped Keyframe Animations ───────── */}
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
        .custom-scrollbar::-webkit-scrollbar {
          height: 4px;
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.3);
          border-radius: 4px;
        }
      `}</style>

      {/* ── 1. EXECUTIVE HEADER (Matching CompanyMyTasks.jsx) ────────────────────── */}
      <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl px-3.5 py-2.5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left: Title & Subtitle */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Navigation size={16} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                  {isEmployee ? "My Live Location & Route" : "Live Employee Tracking"}
                </h1>
                {!isEmployee && (
                  <>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>
                        {selectedDate === todayStr
                          ? `${onlineCount} Live on Field`
                          : `${activeTrackedCount} Active Tracked`}
                      </span>
                    </span>
                    {hrManagerCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                        👔 {hrManagerCount} HR/Managers
                      </span>
                    )}
                  </>
                )}
              </div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                Real-time field personnel GPS telemetry, routes, and branch office monitoring
              </p>
            </div>
          </div>

          {/* Right: Controls Toolbar */}
          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap shrink-0">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => setViewMode("live")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "live"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Navigation size={12} strokeWidth={2.5} />
                <span>Live Map</span>
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
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "trail"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Footprints size={12} strokeWidth={2.5} />
                <span>Route Trail</span>
              </button>
            </div>

            {/* Date Selector */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700/60 text-xs">
              <button
                type="button"
                onClick={() => {
                  setSelectedDate(todayStr);
                  setViewMode("live");
                }}
                className={`px-2 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  selectedDate === todayStr
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedDate(yesterdayStr);
                  setViewMode("trail");
                }}
                className={`px-2 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  selectedDate === yesterdayStr
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Yesterday
              </button>
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700/80 ml-0.5">
                <Calendar size={11} className="text-slate-400" />
                <input
                  type="date"
                  value={selectedDate}
                  max={todayStr}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedDate(val);
                    if (val && val !== todayStr) {
                      setViewMode("trail");
                    }
                  }}
                  className="bg-transparent text-slate-800 dark:text-slate-200 text-xs font-bold focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            {/* Travel Allowance Button */}
            <Link
              to={
                (user?.role || "").toLowerCase().includes("hr")
                  ? "/hr/tracking-allowance"
                  : (user?.role || "").toLowerCase().includes("manager")
                  ? "/manager/tracking-allowance"
                  : "/company/tracking-allowance"
              }
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-bold text-xs transition-colors cursor-pointer"
              title="Travel Allowance"
            >
              <Wallet size={13} strokeWidth={2.5} />
              <span className="hidden sm:inline">TA Allowance</span>
            </Link>

            {/* Refresh GPS Button */}
            <button
              type="button"
              onClick={() => refetchLive()}
              title="Refresh GPS Locations"
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:border-blue-400 transition-colors cursor-pointer"
            >
              <RefreshCw size={13} className={isFetchingLive ? "animate-spin text-blue-600" : ""} />
            </button>

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={handleToggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:border-blue-400 transition-colors cursor-pointer"
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. EXECUTIVE METRIC CARDS ROW (Exact CARD_THEMES Tokens) ─────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {viewMode === "trail" ? (
          <>
            <TelemetryCard
              label="Travel Distance"
              value={trailData?.pureDistanceKm ? `${trailData.pureDistanceKm} km` : trailData?.distanceText || `${trailData?.distanceKm || 0} km`}
              subLabel="Route recorded"
              theme="blue"
              icon={Navigation}
            />
            <TelemetryCard
              label="Halt Duration"
              value={trailData?.totalHaltTimeText || "0 mins"}
              subLabel={`${trailData?.haltCount || 0} stops recorded`}
              theme="rose"
              icon={Timer}
            />
            <TelemetryCard
              label="In-Motion Time"
              value={trailData?.totalMovingTimeText || "0 mins"}
              subLabel="Active movement"
              theme="emerald"
              icon={Clock}
            />
            <TelemetryCard
              label="Max Speed"
              value={`${trailData?.maxSpeed || 0} km/h`}
              subLabel={`Avg ${trailData?.avgSpeed || 0} km/h`}
              theme="amber"
              icon={Activity}
            />
          </>
        ) : (
          <>
            <TelemetryCard
              label={selectedDate === todayStr ? "Active Tracking" : "Tracked on Date"}
              value={`${selectedDate === todayStr ? activeTrackingCount : activeTrackedCount} / ${employees.length}`}
              subLabel={`${inactiveCount} Standby`}
              theme="blue"
              icon={Navigation}
            />
            <TelemetryCard
              label="Stationary Halts"
              value={String(haltingCount)}
              subLabel="Duration > 2 mins"
              theme="amber"
              icon={Timer}
            />
            <TelemetryCard
              label="In-Motion Fleet"
              value={String(movingCount)}
              subLabel="Vehicles on road"
              theme="sky"
              icon={Car}
            />
            <TelemetryCard
              label="Fleet Distance"
              value={`${totalFleetDistanceKm} km`}
              subLabel="Total cumulative"
              theme="indigo"
              icon={Compass}
            />
          </>
        )}
      </div>

      {/* ── 3. MAP CANVAS WITH MODERN FLOATING COCKPIT HUD ───────────────────── */}
      <div className={`w-full bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden relative shadow-2xs flex flex-col transition-all ${isFullscreen ? "flex-1 min-h-0 h-full" : "h-[450px] sm:h-[490px] lg:h-[530px]"}`}>
        {/* Floating Command Bar on Map */}
        <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between gap-2 pointer-events-none">
          {/* Left: Telemetry Status Badge */}
          <div className="pointer-events-auto bg-white/95 dark:bg-[#111C24]/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold text-slate-900 dark:text-white tracking-tight whitespace-nowrap">
              {viewMode === "live"
                ? selectedDate === todayStr
                  ? `Live Fleet (${onlineCount} Active)`
                  : `Fleet Map (${activeTrackedCount} Active Tracked)`
                : selectedEmployee?.name || "Route Trail"}
            </span>
            <span className="hidden sm:inline-block text-[10px] text-slate-400 font-semibold border-l border-slate-200 dark:border-slate-700 pl-2">
              4s Sync
            </span>
          </div>

          {/* Right: Map Layers & Quick Actions */}
          <div className="pointer-events-auto bg-white/95 dark:bg-[#111C24]/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 p-0.5 rounded-lg shadow-sm flex items-center gap-1">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-md text-[11px]">
              <button
                type="button"
                onClick={() => handleMapTypeChange("satellite")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer font-bold ${
                  mapType === "satellite"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                Satellite
              </button>
              <button
                type="button"
                onClick={() => handleMapTypeChange("dark_radar")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer font-bold ${
                  mapType === "dark_radar"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                Dark View
              </button>
              <button
                type="button"
                onClick={() => handleMapTypeChange("street")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer font-bold ${
                  mapType === "street"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                Street
              </button>
            </div>

            {/* Center Fleet Button */}
            <button
              type="button"
              onClick={handleCenterFleet}
              title="Fit fleet on map"
              className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <Crosshair size={13} />
            </button>
          </div>
        </div>

        {/* Selected Employee Floating Cockpit HUD */}
        {selectedEmployee && (
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:w-[360px] z-20 bg-white/95 dark:bg-[#111C24]/95 backdrop-blur-xl p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xl flex flex-col gap-2.5 transition-all animate-in fade-in slide-in-from-bottom-2">
            {/* Header: Avatar, Name, Role Tag, Status Pill, Close */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="relative w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs overflow-hidden">
                  {selectedEmployee.avatar ? (
                    <img src={selectedEmployee.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>{(selectedEmployee.name || "E").slice(0, 2).toUpperCase()}</span>
                  )}
                  <span
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                      selectedEmployee.isTrackingActive || selectedEmployee.trackingStatus === "active"
                        ? "bg-emerald-500 animate-pulse"
                        : selectedEmployee.trackingStatus === "idle"
                        ? "bg-amber-500"
                        : "bg-slate-400"
                    }`}
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">{selectedEmployee.name}</h4>
                    {((selectedEmployee.designation || "") + " " + (selectedEmployee.department || "")).toLowerCase().includes("hr") ||
                    ((selectedEmployee.designation || "") + " " + (selectedEmployee.department || "")).toLowerCase().includes("manager") ? (
                      <span className="text-[8.5px] font-bold uppercase px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                        👔 HR/Mgr
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate font-medium">
                    {selectedEmployee.designation || "Staff"} • {selectedEmployee.department || "General"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase tracking-wider ${
                    selectedEmployee.isTrackingActive || selectedEmployee.trackingStatus === "active"
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
                      : selectedEmployee.trackingStatus === "idle"
                      ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {selectedEmployee.isTrackingActive || selectedEmployee.trackingStatus === "active"
                    ? "Active"
                    : selectedEmployee.trackingStatus === "idle"
                    ? "Idle"
                    : "Standby"}
                </span>

                <button
                  type="button"
                  onClick={() => setSelectedEmployee(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  title="Close"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Location Bar with Admin Branch Address Fallback */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200/70 dark:border-slate-700/60 flex flex-col gap-1 text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <MapPin size={13} className={selectedEmployee.latitude ? "text-emerald-500 shrink-0" : "text-blue-600 dark:text-blue-400 shrink-0"} />
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                  {selectedEmployee.latitude && selectedEmployee.longitude
                    ? selectedEmployee.address || `${Number(selectedEmployee.latitude).toFixed(4)}, ${Number(selectedEmployee.longitude).toFixed(4)}`
                    : `🏢 ${selectedEmployee.branchName || officeLocation?.name || "Main Branch"} (Branch Office)`}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium pl-4 truncate">
                {selectedEmployee.displayAddress || selectedEmployee.branchAddress || officeLocation?.address || "Admin configured office"}
              </p>
            </div>

            {/* Telemetry Pods (2 Columns) */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200/70 dark:border-slate-700/60 flex flex-col justify-between">
                <p className="text-[9.5px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider">
                  {selectedEmployee.trackingStatus === "active" && selectedEmployee.motionStatus === "moving"
                    ? "Speed"
                    : "Status"}
                </p>
                <p className="font-bold text-xs text-slate-800 dark:text-slate-200 mt-0.5 flex items-center gap-1">
                  {selectedEmployee.trackingStatus === "active" && selectedEmployee.motionStatus === "moving" ? (
                    <>
                      <Car size={13} className="text-blue-500" />
                      <span className="text-blue-600 dark:text-blue-400">{Math.round(selectedEmployee.speed)} km/h</span>
                    </>
                  ) : selectedEmployee.trackingStatus === "active" && selectedEmployee.latitude ? (
                    <>
                      <Timer size={13} className="text-amber-500" />
                      <span className="text-amber-700 dark:text-amber-300">{selectedEmployee.stoppageText || "0m"} stop</span>
                    </>
                  ) : (
                    <>
                      <Timer size={13} className="text-slate-400" />
                      <span className="text-slate-500 dark:text-slate-400 text-[10.5px]">
                        {selectedEmployee.trackingStatus === "stopped" ? "Punched Out" : "At Branch Office"}
                      </span>
                    </>
                  )}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200/70 dark:border-slate-700/60 flex flex-col justify-between">
                <p className="text-[9.5px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider">
                  Route Distance
                </p>
                <p className="font-bold text-xs text-indigo-600 dark:text-indigo-400 mt-0.5 flex items-center gap-1">
                  <Navigation size={13} />
                  <span>
                    {viewMode === "trail" && trailData
                      ? `${trailData.distanceKm || 0} km`
                      : selectedEmployee.todayDistanceText || "0 km"}
                  </span>
                </p>
              </div>
            </div>

            {/* Bottom Row: Battery, Lat/Lng Copy, and Route Trail CTA */}
            <div className="flex items-center justify-between text-[10.5px] pt-1.5 border-t border-slate-100 dark:border-slate-800 flex-wrap gap-1.5">
              <div className="flex items-center gap-1">
                {selectedEmployee.batteryLevel !== null && selectedEmployee.batteryLevel !== undefined && (
                  <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300 font-bold flex items-center gap-1">
                    <Battery size={11} className={selectedEmployee.batteryLevel < 20 ? "text-rose-500" : "text-emerald-500"} />
                    <span>{selectedEmployee.batteryLevel}%</span>
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (selectedEmployee.latitude && selectedEmployee.longitude) {
                      handleCopyCoordinates(selectedEmployee.latitude, selectedEmployee.longitude);
                    } else if (officeLocation?.latitude && officeLocation?.longitude) {
                      handleCopyCoordinates(officeLocation.latitude, officeLocation.longitude);
                    }
                  }}
                  className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded font-bold flex items-center gap-1 transition-all cursor-pointer"
                  title="Copy GPS Coordinates"
                >
                  {copiedCoord ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                  <span>{copiedCoord ? "Copied" : "GPS"}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setViewMode("trail");
                  if (selectedEmployee.latitude && selectedEmployee.longitude && mapInstanceRef.current) {
                    mapInstanceRef.current.flyTo([selectedEmployee.latitude, selectedEmployee.longitude], 17);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-2xs cursor-pointer flex items-center gap-1 transition-all active:scale-[0.98]"
              >
                <Footprints size={12} />
                <span>View Trail →</span>
              </button>
            </div>
          </div>
        )}

        {/* Leaflet Map Canvas */}
        <div ref={mapContainerRef} className="w-full h-full flex-1" style={{ zIndex: 1, minHeight: isFullscreen ? '100%' : '380px' }} />
      </div>

      {/* ── 4. FLEET DIRECTORY ROSTER (Clean Enterprise Layout) ─────────────── */}
      {!isFullscreen && (
        <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 shadow-2xs space-y-3">
          {/* Header Bar: Title, Search, and Status Filter Tabs */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Users size={16} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                  Fleet Directory
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {filteredEmployees.length} of {employees.length} Staff • Click card to focus pin on map
                </p>
              </div>
            </div>

            {/* Right: Search & Horizontal Filter Tabs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
              {/* Search Box */}
              <div className="relative w-full sm:w-56">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search staff, role, dept..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-xs h-8 pl-8 pr-2.5 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-[#0D1321] text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Status Filter Horizontal Tabs (Exact CompanyMyTasks Pill Tabs) */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 custom-scrollbar">
                {[
                  { id: "all", label: "All", count: employees.length },
                  { id: "active", label: selectedDate === todayStr ? "Active" : "Tracked", count: activeTrackedCount },
                  { id: "inactive", label: "Not Tracked", count: inactiveCount },
                  { id: "moving", label: "Moving", count: movingCount },
                  { id: "halt", label: "Halts", count: haltingCount },
                  { id: "hr_mgr", label: "HR/Mgrs", count: hrManagerCount },
                ].map((tab) => {
                  const isSel = statusFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setStatusFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                        isSel
                          ? "bg-blue-600 text-white shadow-2xs"
                          : "bg-white dark:bg-[#111C24] text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                          isSel ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* If Trail Mode: Compact Date Picker & Route Stats / Halts Ribbon */}
          {viewMode === "trail" && (
            <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                  <Calendar size={13} className="text-blue-600 dark:text-blue-400" />
                  <span>Date:</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
                  />
                </div>

                {selectedEmployee && (
                  <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{selectedEmployee.name}:</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/60 text-[11px]">
                      {trailData?.pureDistanceKm
                        ? `${trailData.pureDistanceKm} km`
                        : trailData?.distanceText || `${trailData?.distanceKm || 0} km`} Route
                    </span>
                  </div>
                )}
              </div>

              {/* Halts Quick Fly-To Buttons */}
              {Array.isArray(trailData?.halts) && trailData.halts.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-0.5 custom-scrollbar">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    Halts ({trailData.haltCount}):
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
                      className="px-2 py-0.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md border border-slate-200 dark:border-slate-700 text-[10.5px] font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 flex items-center gap-1 whitespace-nowrap shadow-2xs transition-all cursor-pointer"
                    >
                      <span className="w-4 h-4 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-[9px] font-black flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <span>{h.durationText || `${h.durationMinutes}m`}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Staff Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
            {loadingLive && employees.length === 0 ? (
              <div className="col-span-full py-10 text-center">
                <RefreshCw size={22} className="animate-spin text-blue-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Connecting fleet satellites...</p>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="col-span-full py-10 text-center text-slate-400 dark:text-slate-500">
                <Users size={26} className="mx-auto mb-2 opacity-40" />
                <p className="text-xs font-bold">No matching staff found</p>
              </div>
            ) : (
              filteredEmployees.map((emp) => {
                const isSelected = selectedEmployee?._id === emp._id;
                const isTrackingActive = Boolean(emp.isTrackingActive || emp.trackingStatus === "active");
                const isIdle = emp.trackingStatus === "idle";
                const isFieldStaff = Boolean(emp.isLocationTrackingEnabled);
                const isMoving = emp.motionStatus === "moving";
                const isHrOrMgr =
                  ((emp.designation || "") + " " + (emp.department || "")).toLowerCase().includes("hr") ||
                  ((emp.designation || "") + " " + (emp.department || "")).toLowerCase().includes("manager");

                return (
                  <div
                    key={emp._id}
                    onClick={() => handleSelectStaff(emp)}
                    className={`relative overflow-hidden p-3 rounded-xl border cursor-pointer flex flex-col justify-between space-y-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                      isSelected
                        ? "bg-blue-50/40 dark:bg-blue-950/20 border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/20 shadow-xs"
                        : "bg-white dark:bg-[#111C24] border-slate-200/80 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700/60 shadow-2xs"
                    }`}
                  >
                    {/* Accent top line */}
                    <div
                      className={`absolute top-0 left-0 right-0 h-[3px] ${
                        isTrackingActive
                          ? isMoving ? "bg-blue-500" : "bg-emerald-500"
                          : isIdle ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"
                      }`}
                    />

                    {/* Top Row: Avatar + Name + HR/Mgr Tag + Status Badge */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="relative w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[11px] shrink-0 shadow-2xs overflow-hidden">
                          {emp.avatar ? (
                            <img src={emp.avatar} alt={emp.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{(emp.name || "E").slice(0, 2).toUpperCase()}</span>
                          )}
                          <span
                            className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white dark:border-slate-900 ${
                              isTrackingActive
                                ? "bg-emerald-500 animate-pulse"
                                : isIdle
                                ? "bg-amber-500"
                                : "bg-slate-400"
                            }`}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{emp.name}</h4>
                            {isHrOrMgr && (
                              <span className="text-[8.5px] font-bold uppercase px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 shrink-0">
                                👔 HR/Mgr
                              </span>
                            )}
                          </div>
                          <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate font-medium">
                            {emp.designation || emp.department || (isFieldStaff ? "Field Staff" : "Office Staff")}
                          </p>
                        </div>
                      </div>

                      {/* Status Tag */}
                      <div className="shrink-0">
                        {selectedDate !== todayStr ? (
                          emp.isTrackingActive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Tracked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              Standby
                            </span>
                          )
                        ) : isTrackingActive ? (
                          isMoving ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                              Moving
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Active
                            </span>
                          )
                        ) : isIdle ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Idle
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Off-Duty
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle Row: Branch Office & Location */}
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 min-w-0">
                      <MapPin size={12} className={isTrackingActive && emp.latitude ? "text-emerald-500 shrink-0" : "text-slate-400 shrink-0"} />
                      <span className="truncate font-medium">
                        {isTrackingActive && emp.latitude
                          ? emp.address || `${Number(emp.latitude).toFixed(4)}, ${Number(emp.longitude).toFixed(4)}`
                          : `🏢 ${emp.branchName || officeLocation?.name || "Main Branch Office"}`}
                      </span>
                    </div>

                    {/* Bottom Row: Telemetry, Speed/Halt, TA & Battery */}
                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[10px]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {selectedDate !== todayStr ? (
                          emp.isTrackingActive ? (
                            <span className="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60">
                              📍 {emp.totalPoints || 0} GPS Pings
                            </span>
                          ) : (
                            <span className="font-medium text-slate-400 dark:text-slate-500">
                              No route recorded
                            </span>
                          )
                        ) : isTrackingActive && isMoving ? (
                          <span className="font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800/60 flex items-center gap-1">
                            <Car size={11} />
                            {Math.round(emp.speed)} km/h
                          </span>
                        ) : isTrackingActive && emp.latitude ? (
                          <span className="font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/60 flex items-center gap-1">
                            <Timer size={11} />
                            Halt: {emp.stoppageText || "0m"}
                          </span>
                        ) : (
                          <span className="font-medium text-slate-500 dark:text-slate-400">
                            {emp.trackingStatus === "stopped" ? "Punched Out" : "At Office"}
                          </span>
                        )}

                        {(parseFloat(emp.todayDistanceKm) > 0 || (emp.todayDistanceText && emp.todayDistanceText !== "0 km" && emp.todayDistanceText !== "0.00 km")) && (
                          <span className="font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800/60 flex items-center gap-1">
                            <span>🎯 {emp.todayDistanceText}</span>
                            <span className="text-emerald-700 dark:text-emerald-300 border-l border-indigo-200 dark:border-indigo-800/60 pl-1 font-extrabold">
                              ₹{(parseFloat(emp.todayDistanceKm || 0) * 4).toFixed(0)}
                            </span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 ml-auto text-slate-500 dark:text-slate-400 font-semibold shrink-0">
                        {emp.batteryLevel !== null && emp.batteryLevel !== undefined && (
                          <span className={`flex items-center gap-0.5 ${emp.batteryLevel < 20 ? "text-rose-600 font-bold" : ""}`}>
                            <Battery size={11} />
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
