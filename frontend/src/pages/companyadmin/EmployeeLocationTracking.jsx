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
  const [mapType, setMapType] = useState("satellite"); // "street" | "satellite" | "hybrid"
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "online" | "offline"
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
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
    refetchInterval: 20000, // 20s live polling
  });

  const employees = useMemo(() => (Array.isArray(liveData) ? liveData : []), [liveData]);

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

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        (emp.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.department || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.designation || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "online" && emp.isOnline) ||
        (statusFilter === "offline" && !emp.isOnline);
      return matchesSearch && matchesStatus;
    });
  }, [employees, searchTerm, statusFilter]);

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

  // Tile layer helper
  const setTileLayer = (type) => {
    if (!mapInstanceRef.current || !window.L) return;
    const L = window.L;

    if (currentTileLayerRef.current) {
      mapInstanceRef.current.removeLayer(currentTileLayerRef.current);
    }

    if (type === "satellite") {
      // Google Hybrid Satellite Tiles (satellite imagery with clean street & building labels)
      currentTileLayerRef.current = L.tileLayer("https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
        maxZoom: 20,
        attribution: "© Google Maps Satellite",
      }).addTo(mapInstanceRef.current);
    } else if (type === "pure_satellite") {
      // Esri High-Resolution World Imagery
      currentTileLayerRef.current = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 19,
          attribution: "© Esri World Imagery",
        }
      ).addTo(mapInstanceRef.current);
    } else {
      // Standard OpenStreetMap Streets
      currentTileLayerRef.current = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
      }).addTo(mapInstanceRef.current);
    }
  };

  // Initialize Map
  useEffect(() => {
    if (!mapReady || !mapContainerRef.current || mapInstanceRef.current) return;

    const L = window.L;
    // Default center Pune / India
    const map = L.map(mapContainerRef.current, {
      center: [18.5204, 73.8567],
      zoom: 12,
      zoomControl: false,
    });

    mapInstanceRef.current = map;
    setTileLayer(mapType);

    L.control.zoom({ position: "topright" }).addTo(map);

    markersGroupRef.current = L.featureGroup().addTo(map);
    polylineLayerRef.current = L.featureGroup().addTo(map);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mapReady]);

  // Handle Map Type Change
  const handleMapTypeChange = (newType) => {
    setMapType(newType);
    setTileLayer(newType);
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
        const isOnline = emp.isOnline;

        // Custom HTML Marker icon with avatar / pulse dot
        const iconHtml = `
          <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
            <div style="
              width: 40px; height: 40px; border-radius: 50%; 
              border: 3.5px solid ${isSelected ? "#F59E0B" : isOnline ? "#10B981" : "#94A3B8"};
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
              position: absolute; bottom: 0; right: 2px; width: 12px; height: 12px; border-radius: 50%;
              background: ${isOnline ? "#10B981" : "#94A3B8"}; border: 2.5px solid #FFFFFF;
            "></div>
          </div>
        `;

        const customIcon = L.divIcon({
          html: iconHtml,
          className: "custom-leaflet-marker",
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        });

        const marker = L.marker([emp.latitude, emp.longitude], { icon: customIcon });

        const popupContent = `
          <div style="font-family: sans-serif; padding: 4px 2px; min-width: 170px;">
            <div style="font-weight: 800; font-size: 14px; color: #0F172A;">${emp.name}</div>
            <div style="font-size: 11px; color: #64748B; margin-top: 1px;">${emp.designation || emp.department || "Staff"}</div>
            ${
              emp.speed > 0
                ? `<div style="font-size: 11px; font-weight: 800; color: #10B981; margin-top: 4px;">⚡ Speed: ${emp.speed} km/h</div>`
                : ""
            }
            <div style="font-size: 10.5px; color: #64748B; margin-top: 4px;">
              ⏱️ ${emp.lastUpdated ? new Date(emp.lastUpdated).toLocaleTimeString() : "Recent"}
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);
        marker.on("click", () => setSelectedEmployee(emp));
        markersGroupRef.current.addLayer(marker);
        bounds.push([emp.latitude, emp.longitude]);
      });

      if (bounds.length > 0 && !selectedEmployee) {
        mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60] });
      }
    } else if (viewMode === "trail" && trailData?.trail?.length > 0) {
      const rawLatlngs = trailData.trail.map((pt) => [pt.latitude, pt.longitude]);

      // Initial line (smooth blue route)
      const polyline = L.polyline(rawLatlngs, {
        color: "#2563EB",
        weight: 5,
        opacity: 0.9,
        smoothFactor: 2,
        lineJoin: "round",
        lineCap: "round",
      });

      polylineLayerRef.current.addLayer(polyline);

      // Start Marker (Green Pin)
      const startPt = trailData.trail[0];
      const startIcon = L.divIcon({
        html: `
          <div style="width: 32px; height: 32px; border-radius: 50%; background: #10B981; border: 2.5px solid #FFF; color: #FFF; display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: 0 3px 10px rgba(0,0,0,0.5);">
            🚩
          </div>
        `,
        className: "start-marker",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      L.marker([startPt.latitude, startPt.longitude], { icon: startIcon })
        .bindPopup("<b>Route Start</b><br/>" + new Date(startPt.timestamp).toLocaleTimeString())
        .addTo(polylineLayerRef.current);

      // End Marker (Red Pin)
      if (trailData.trail.length > 1) {
        const endPt = trailData.trail[trailData.trail.length - 1];
        const endIcon = L.divIcon({
          html: `
            <div style="width: 32px; height: 32px; border-radius: 50%; background: #EF4444; border: 2.5px solid #FFF; color: #FFF; display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: 0 3px 10px rgba(0,0,0,0.5);">
              📍
            </div>
          `,
          className: "end-marker",
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
        L.marker([endPt.latitude, endPt.longitude], { icon: endIcon })
          .bindPopup("<b>Latest / End Point</b><br/>" + new Date(endPt.timestamp).toLocaleTimeString())
          .addTo(polylineLayerRef.current);
      }

      // Snap-to-Roads: Match GPS track to real street corridors so lines never cut through buildings
      if (trailData.trail.length >= 2) {
        const samplePoints = trailData.trail.length > 70
          ? trailData.trail.filter((_, idx) => idx % Math.ceil(trailData.trail.length / 70) === 0 || idx === trailData.trail.length - 1)
          : trailData.trail;

        const coordsStr = samplePoints.map((p) => `${p.longitude},${p.latitude}`).join(";");
        fetch(`https://router.project-osrm.org/match/v1/driving/${coordsStr}?overview=full&geometries=geojson`)
          .then((res) => res.json())
          .then((data) => {
            if (data.code === "Ok" && data.matchings && data.matchings.length > 0) {
              const roadSnappedCoords = [];
              data.matchings.forEach((m) => {
                if (m.geometry?.coordinates) {
                  m.geometry.coordinates.forEach(([lng, lat]) => {
                    roadSnappedCoords.push([lat, lng]);
                  });
                }
              });
              if (roadSnappedCoords.length > 0 && polylineLayerRef.current) {
                // Remove initial straight polyline and replace with road-snapped geometry
                polylineLayerRef.current.removeLayer(polyline);
                const roadPolyline = L.polyline(roadSnappedCoords, {
                  color: "#3B82F6",
                  weight: 5.5,
                  opacity: 0.95,
                  lineJoin: "round",
                  lineCap: "round",
                });
                polylineLayerRef.current.addLayer(roadPolyline);
              }
            }
          })
          .catch((err) => {
            console.log("[RoadMatching] Falling back to high-accuracy raw GPS track:", err.message);
          });
      }

      mapInstanceRef.current.fitBounds(polyline.getBounds(), { padding: [70, 70] });
    }
  }, [employees, viewMode, trailData, selectedEmployee, mapReady]);

  // Center on employee when clicked in list
  const handleSelectStaff = (emp) => {
    setSelectedEmployee(emp);
    if (emp.latitude && emp.longitude && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([emp.latitude, emp.longitude], 16, {
        duration: 1.2,
      });
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
              if (!selectedEmployee && employees.length > 0) {
                setSelectedEmployee(employees[0]);
              }
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

      {/* ── 4 Top KPI Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card p-4 rounded-2xl border border-border shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Online Staff</p>
            <h3 className="text-2xl font-black text-foreground mt-0.5">{onlineCount}</h3>
            <p className="text-[10px] font-semibold text-emerald-600 mt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Transmitting GPS
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <Compass size={20} />
          </div>
        </div>

        <div className="bg-card p-4 rounded-2xl border border-border shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Total Field Staff</p>
            <h3 className="text-2xl font-black text-foreground mt-0.5">{employees.length}</h3>
            <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">Enrolled for tracking</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <Users size={20} />
          </div>
        </div>

        <div className="bg-card p-4 rounded-2xl border border-border shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
              {viewMode === "trail" ? "Selected Route Distance" : "Tracking Frequency"}
            </p>
            <h3 className="text-2xl font-black text-foreground mt-0.5">
              {viewMode === "trail" ? `${trailData?.distanceKm || 0} km` : "30 sec"}
            </h3>
            <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">
              {viewMode === "trail" ? `${trailData?.totalPoints || 0} waypoints recorded` : "High accuracy GPS"}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Activity size={20} />
          </div>
        </div>

        <div className="bg-card p-4 rounded-2xl border border-border shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Location Privacy & SLA</p>
            <h3 className="text-lg font-black text-foreground mt-1">Duty Hours Only</h3>
            <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">Auto punch-out sync</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
            <ShieldCheck size={20} />
          </div>
        </div>
      </div>

      {/* ── Main Split View (Map 72% + Staff Panel 28%) ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[630px]">
        {/* Left Interactive Map Box */}
        <div className="lg:col-span-8 bg-card rounded-2xl border border-border overflow-hidden relative shadow-xs flex flex-col">
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

          {/* Map Container */}
          <div ref={mapContainerRef} className="w-full h-full" style={{ zIndex: 1 }} />
        </div>

        {/* Right Staff List & Trail Controls */}
        <div className="lg:col-span-4 bg-card rounded-2xl border border-border p-4 flex flex-col h-full shadow-xs">
          {/* If Trail Mode: Show Date Selector & Selected Staff */}
          {viewMode === "trail" && (
            <div className="mb-3 p-3 bg-muted/50 rounded-xl border border-border space-y-2">
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
                <div className="flex items-center justify-between pt-1 border-t border-border/60 text-xs">
                  <span className="font-bold text-foreground">{selectedEmployee.name}</span>
                  <span className="font-extrabold text-primary">{trailData?.distanceKm || 0} km traveled</span>
                </div>
              )}
            </div>
          )}

          {/* Search Bar */}
          <div className="relative mb-3">
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
          <div className="flex items-center space-x-1.5 mb-3">
            {[
              { id: "all", label: "All Staff" },
              { id: "online", label: "Live Only" },
              { id: "offline", label: "Idle / Offline" },
            ].map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => setStatusFilter(pill.id)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all border cursor-pointer ${
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
                const isOnline = emp.isOnline;

                return (
                  <div
                    key={emp._id}
                    onClick={() => handleSelectStaff(emp)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? "bg-primary/10 border-primary shadow-xs"
                        : "bg-card border-border hover:border-primary/40 hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="relative w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {emp.avatar ? (
                          <img src={emp.avatar} alt={emp.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span>{(emp.name || "E").slice(0, 2).toUpperCase()}</span>
                        )}
                        <span
                          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-card ${
                            isOnline ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-extrabold text-foreground truncate">{emp.name}</h4>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {emp.designation || emp.department || "Field Staff"}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 pl-2">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                          isOnline
                            ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                            : "bg-muted text-muted-foreground border border-border"
                        }`}
                      >
                        {isOnline ? "Live" : "Idle"}
                      </span>
                      {emp.speed > 0 && (
                        <p className="text-[10px] font-bold text-primary mt-0.5">{emp.speed} km/h</p>
                      )}
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
