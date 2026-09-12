import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Wallet,
  IndianRupee,
  Navigation,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  Filter,
  Download,
  Calendar,
  Settings,
  Car,
  Bike,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  Eye,
  Check,
  X,
  FileSpreadsheet,
  Printer,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Edit2,
  Layers,
} from "lucide-react";
import {
  getTrackingAllowanceReportApi,
  updateTrackingAllowanceRateApi,
  updateAllowanceStatusApi,
} from "../../api/locationApi";
import { useAuth } from "../../context/AuthContext";

const TrackingAllowance = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Date filters
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [dateRangeMode, setDateRangeMode] = useState("today"); // "today" | "yesterday" | "this_month" | "custom"
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(todayStr);

  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "pending" | "approved" | "rejected"
  const [vehicleFilter, setVehicleFilter] = useState("all"); // "all" | "two_wheeler" | "four_wheeler"

  // Rate configuration modal
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [rateForm, setRateForm] = useState({
    ratePerKm: 4.0,
    twoWheelerRate: 4.0,
    fourWheelerRate: 8.0,
  });

  // Calculate effective query parameters
  const queryParams = useMemo(() => {
    if (dateRangeMode === "today") {
      return { date: todayStr };
    } else if (dateRangeMode === "yesterday") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      return { date: y.toISOString().slice(0, 10) };
    } else if (dateRangeMode === "this_month") {
      const d = new Date();
      const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
      return { startDate: firstDay, endDate: todayStr };
    } else {
      return { startDate, endDate };
    }
  }, [dateRangeMode, todayStr, startDate, endDate]);

  // Fetch tracking allowance report
  const {
    data: reportData,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["trackingAllowanceReport", queryParams],
    queryFn: async () => {
      const res = await getTrackingAllowanceReportApi(queryParams);
      return res.data?.data || { summary: {}, records: [] };
    },
    staleTime: 1000 * 20,
  });

  const summary = reportData?.summary || {};
  const records = reportData?.records || [];

  // Update rates mutation
  const updateRateMutation = useMutation({
    mutationFn: updateTrackingAllowanceRateApi,
    onSuccess: (res) => {
      toast.success("प्रवास भत्ता दर यशस्वीरित्या अपडेट केला!");
      setIsRateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["trackingAllowanceReport"] });
    },
    onError: () => {
      toast.error("दर अपडेट करण्यात अडचण आली.");
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: updateAllowanceStatusApi,
    onSuccess: (res) => {
      toast.success(res.data?.message || "स्थिती यशस्वीरित्या अपडेट केली!");
      queryClient.invalidateQueries({ queryKey: ["trackingAllowanceReport"] });
    },
    onError: () => {
      toast.error("स्थिती अपडेट करण्यात अडचण आली.");
    },
  });

  // Filtered rows
  const filteredRows = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch =
        !searchTerm ||
        r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.designation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.department?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      const matchesVehicle = vehicleFilter === "all" || r.vehicleType === vehicleFilter;

      return matchesSearch && matchesStatus && matchesVehicle;
    });
  }, [records, searchTerm, statusFilter, vehicleFilter]);

  // Running totals for the currently filtered view
  const filteredTotals = useMemo(() => {
    return filteredRows.reduce(
      (acc, r) => {
        acc.distance += parseFloat(r.distanceKm) || 0;
        acc.amount += parseFloat(r.totalAmount) || 0;
        if (r.status === "approved") {
          acc.approvedAmount += parseFloat(r.totalAmount) || 0;
        }
        return acc;
      },
      { distance: 0, amount: 0, approvedAmount: 0 }
    );
  }, [filteredRows]);

  // Handle single record approve / reject
  const handleAction = (record, newStatus) => {
    updateStatusMutation.mutate({
      items: [
        {
          employeeId: record.employeeId,
          date: record.date,
          distanceKm: record.distanceKm,
          ratePerKm: record.ratePerKm,
          totalAmount: record.totalAmount,
          vehicleType: record.vehicleType,
        },
      ],
      status: newStatus,
    });
  };

  // Handle approve all pending
  const handleApproveAllPending = () => {
    const pendingItems = filteredRows
      .filter((r) => r.status === "pending")
      .map((r) => ({
        employeeId: r.employeeId,
        date: r.date,
        distanceKm: r.distanceKm,
        ratePerKm: r.ratePerKm,
        totalAmount: r.totalAmount,
        vehicleType: r.vehicleType,
      }));

    if (pendingItems.length === 0) {
      toast.info("मंजूर करण्यासाठी कोणतेही प्रलंबित रेकॉर्ड नाहीत.");
      return;
    }

    if (window.confirm(`आपण खात्रीने सर्व ${pendingItems.length} प्रलंबित भत्ते मंजूर करू इच्छिता?`)) {
      updateStatusMutation.mutate({
        items: pendingItems,
        status: "approved",
      });
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (filteredRows.length === 0) {
      toast.error("एक्सपोर्ट करण्यासाठी डेटा उपलब्ध नाही.");
      return;
    }

    const headers = [
      "Date",
      "Employee Code",
      "Employee Name",
      "Department",
      "Vehicle Type",
      "GPS Distance (KM)",
      "Rate Per KM (INR)",
      "Total Allowance (INR)",
      "Status",
    ];

    const rows = filteredRows.map((r) => [
      r.date,
      `"${r.employeeCode || ""}"`,
      `"${r.name || ""}"`,
      `"${r.department || ""}"`,
      r.vehicleType === "four_wheeler" ? "4-Wheeler" : "2-Wheeler",
      r.distanceKm,
      r.ratePerKm,
      r.totalAmount,
      r.status,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Tracking_Allowance_Report_${queryParams.startDate || queryParams.date || todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV फाईल डाऊनलोड झाली!");
  };

  // Determine Live Radar Path
  const userRole = (user?.role || "").toLowerCase();
  const liveRadarPath = userRole.includes("hr")
    ? "/hr/location-tracking"
    : userRole.includes("manager")
    ? "/manager/location-tracking"
    : "/company/location-tracking";

  return (
    <div className="space-y-3 p-3 sm:p-4 max-w-7xl mx-auto">
      {/* ── Page Header (Native, Compact, Integrated) ─────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-0.5">
        <div className="flex items-center gap-2.5">
          <Link
            to={liveRadarPath}
            className="w-8 h-8 rounded-lg bg-card border border-border hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors shadow-2xs"
            title="Back to Live Tracking"
          >
            <ArrowLeft size={15} />
          </Link>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black text-foreground tracking-tight">
                Tracking Allowance
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                KM Based TA
              </span>
              <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">
                • प्रवास भत्ता व्यवस्थापन
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground font-medium">
              Verified Pure GPS किलोमीटरनुसार कर्मचाऱ्यांचा दैनिक व मासिक प्रवास भत्ता
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto flex-wrap justify-end">
          <button
            type="button"
            onClick={() => {
              setRateForm({
                ratePerKm: summary.defaultRate || 4.0,
                twoWheelerRate: summary.twoWheelerRate || 4.0,
                fourWheelerRate: summary.fourWheelerRate || 8.0,
              });
              setIsRateModalOpen(true);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-card hover:bg-muted text-foreground text-xs font-bold border border-border transition-all cursor-pointer shadow-2xs"
          >
            <Settings size={12} className="text-primary" />
            <span>दर: ₹{summary.twoWheelerRate || 4}/km</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-card hover:bg-muted text-foreground text-xs font-bold border border-border transition-all cursor-pointer shadow-2xs"
          >
            <Download size={12} />
            <span className="hidden sm:inline">CSV Export</span>
          </button>

          <Link
            to={liveRadarPath}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-black shadow-xs hover:bg-primary/90 transition-all cursor-pointer"
          >
            <Navigation size={12} />
            <span>Live Tracking →</span>
          </Link>
        </div>
      </div>

      {/* ── 4 Executive KPI Metrics (Compact & High-Density) ───────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
        {/* Metric 1: Total Distance */}
        <div className="bg-card p-2.5 sm:p-3 rounded-xl border border-border/80 shadow-2xs flex items-center justify-between hover:border-blue-500/40 transition-colors">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider block truncate">
              एकूण प्रवास (Distance)
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg sm:text-xl font-black text-foreground tracking-tight">
                {Number(summary.totalDistanceKm || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] font-bold text-muted-foreground">km</span>
            </div>
            <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 block mt-0.5">
              🎯 Verified Pure GPS
            </span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 flex-shrink-0">
            <Navigation size={14} />
          </div>
        </div>

        {/* Metric 2: Payable TA */}
        <div className="bg-card p-2.5 sm:p-3 rounded-xl border border-border/80 shadow-2xs flex items-center justify-between hover:border-emerald-500/40 transition-colors">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider block truncate">
              एकूण देय भत्ता (Payable)
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                ₹{Number(summary.totalPayableAmount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </span>
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground block mt-0.5 truncate">
              @ ₹{summary.twoWheelerRate || 4}/km सरासरी
            </span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 flex-shrink-0">
            <IndianRupee size={14} />
          </div>
        </div>

        {/* Metric 3: Approved */}
        <div className="bg-card p-2.5 sm:p-3 rounded-xl border border-border/80 shadow-2xs flex items-center justify-between hover:border-indigo-500/40 transition-colors">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider block truncate">
              मंजूर झालेले (Approved)
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg sm:text-xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                {summary.approvedCount || 0}
              </span>
              <span className="text-[11px] font-bold text-muted-foreground">दावे</span>
            </div>
            <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 block mt-0.5 truncate">
              पेरोलसाठी रेडी
            </span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 flex-shrink-0">
            <CheckCircle2 size={14} />
          </div>
        </div>

        {/* Metric 4: Pending */}
        <div className="bg-card p-2.5 sm:p-3 rounded-xl border border-border/80 shadow-2xs flex items-center justify-between hover:border-amber-500/40 transition-colors">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider block truncate">
              प्रलंबित (Pending Review)
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
                {summary.pendingCount || 0}
              </span>
              <span className="text-[11px] font-bold text-muted-foreground">दावे</span>
            </div>
            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 block mt-0.5 truncate">
              मंजुरी आवश्यक
            </span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 flex-shrink-0">
            <Clock size={14} />
          </div>
        </div>
      </div>

      {/* ── Unified Native Control Bar (Dates + Search + Filters + Actions) ── */}
      <div className="bg-card rounded-xl border border-border p-2.5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 text-xs">
        {/* Left Side: Date Presets & Custom Pickers */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/70">
            {[
              { id: "today", label: "आज (Today)" },
              { id: "yesterday", label: "काल (Yesterday)" },
              { id: "this_month", label: "चालू महिना" },
              { id: "custom", label: "कस्टम तारीख" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDateRangeMode(tab.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  dateRangeMode === tab.id
                    ? "bg-background text-foreground shadow-2xs font-extrabold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {dateRangeMode === "custom" && (
            <div className="flex items-center gap-1.5 bg-muted/40 px-2 py-0.5 rounded-lg border border-border font-bold">
              <span className="text-muted-foreground text-[10px]">पासून:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-background text-foreground text-[11px] font-bold rounded px-1.5 py-0.5 border border-border focus:outline-none focus:border-primary cursor-pointer"
              />
              <span className="text-muted-foreground text-[10px]">पर्यंत:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-background text-foreground text-[11px] font-bold rounded px-1.5 py-0.5 border border-border focus:outline-none focus:border-primary cursor-pointer"
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh Data"
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted border border-border/60 transition-all cursor-pointer"
          >
            <RefreshCw size={12} className={isFetching ? "animate-spin text-primary" : ""} />
          </button>
        </div>

        {/* Right Side: Search + Status + Vehicle Filters + Bulk Approve */}
        <div className="flex items-center gap-2 flex-wrap justify-between md:justify-end">
          {/* Search Box */}
          <div className="relative w-full sm:w-44 lg:w-52">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="शोध कर्मचारी, कोड..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-muted/40 border border-border rounded-lg pl-7 pr-2.5 py-1 text-xs font-semibold text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-all"
            />
          </div>

          {/* Status Pills */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/70 text-[11px] font-bold">
            {[
              { id: "all", label: "All" },
              { id: "pending", label: `Pending${summary.pendingCount ? ` (${summary.pendingCount})` : ""}` },
              { id: "approved", label: "Approved" },
              { id: "rejected", label: "Rejected" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-2 py-0.5 rounded text-[11px] transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === tab.id
                    ? "bg-background text-foreground shadow-2xs font-extrabold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Vehicle Pills */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/70 text-[11px] font-bold">
            {[
              { id: "all", label: "All Vehicles" },
              { id: "two_wheeler", label: "🏍️ 2-W" },
              { id: "four_wheeler", label: "🚗 4-W" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setVehicleFilter(tab.id)}
                className={`px-2 py-0.5 rounded text-[11px] transition-all cursor-pointer whitespace-nowrap ${
                  vehicleFilter === tab.id
                    ? "bg-background text-foreground shadow-2xs font-extrabold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Bulk Approve Button */}
          {summary.pendingCount > 0 && (
            <button
              type="button"
              onClick={handleApproveAllPending}
              disabled={updateStatusMutation.isPending}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black shadow-xs transition-all cursor-pointer whitespace-nowrap ml-auto md:ml-0"
            >
              <CheckCircle2 size={12} />
              <span>सर्व मंजूर करा ({summary.pendingCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Native High-Density Claims Table ───────────────────────────── */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-xs">
        <div className="overflow-x-auto max-h-[640px] relative">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-md border-b border-border text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-2.5 px-3.5">कर्मचारी (Employee)</th>
                <th className="py-2.5 px-3">तारीख</th>
                <th className="py-2.5 px-3">वाहन</th>
                <th className="py-2.5 px-3 text-right">GPS अंतर</th>
                <th className="py-2.5 px-3 text-right">दर (Rate)</th>
                <th className="py-2.5 px-3 text-right">भत्ता रक्कम</th>
                <th className="py-2.5 px-3 text-center">स्थिती</th>
                <th className="py-2.5 px-3 text-right">कृती</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-muted-foreground">
                    <RefreshCw size={22} className="animate-spin text-primary mx-auto mb-2" />
                    <span className="font-bold text-xs">GPS अंतर व भत्त्याचा डेटा मोजत आहे...</span>
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-muted-foreground">
                    <Wallet size={28} className="mx-auto mb-2 opacity-30" />
                    <p className="font-bold text-sm text-foreground">कोणतेही रेकॉर्ड सापडले नाहीत</p>
                    <p className="text-[11px] mt-0.5 text-muted-foreground">तारीख किंवा शोध पर्याय तपासा.</p>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const isApproved = row.status === "approved";
                  const isRejected = row.status === "rejected";
                  const isPending = row.status === "pending";

                  return (
                    <tr
                      key={row._id}
                      className="hover:bg-muted/40 transition-colors group"
                    >
                      {/* Employee Info */}
                      <td className="py-2 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0 overflow-hidden shadow-2xs">
                            {row.avatar ? (
                              <img
                                src={row.avatar}
                                alt={row.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>{(row.name || "E").slice(0, 2).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-foreground text-xs leading-snug truncate group-hover:text-primary transition-colors">
                              {row.name}
                            </h4>
                            <p className="text-[10px] text-muted-foreground leading-tight truncate font-medium">
                              {row.employeeCode ? `${row.employeeCode} • ` : ""}
                              {row.designation || "Staff"} • {row.department || "General"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-2 px-3 font-semibold text-foreground whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground">
                          <Calendar size={11} className="text-muted-foreground" />
                          <span>{row.date}</span>
                        </span>
                      </td>

                      {/* Vehicle Type */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-bold bg-muted text-foreground border border-border/70">
                          {row.vehicleType === "four_wheeler" ? (
                            <>
                              <Car size={11} className="text-blue-500" />
                              <span>4-Wheeler</span>
                            </>
                          ) : (
                            <>
                              <Bike size={11} className="text-emerald-500" />
                              <span>2-Wheeler</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* GPS Distance */}
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <span className="font-extrabold text-xs text-foreground">
                          {Number(row.distanceKm).toFixed(2)}{" "}
                          <span className="text-[10px] font-semibold text-muted-foreground">km</span>
                        </span>
                      </td>

                      {/* Rate Per KM */}
                      <td className="py-2 px-3 text-right font-medium text-muted-foreground whitespace-nowrap text-xs">
                        ₹{Number(row.ratePerKm).toFixed(1)}/km
                      </td>

                      {/* Total Amount */}
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <span className="font-black text-xs text-emerald-600 dark:text-emerald-400">
                          ₹{Number(row.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        {isApproved ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            <Check size={10} strokeWidth={3} />
                            <span>मंजूर</span>
                          </span>
                        ) : isRejected ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                            <X size={10} strokeWidth={3} />
                            <span>नाकारले</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            <Clock size={10} strokeWidth={3} />
                            <span>प्रलंबित</span>
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {isPending && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleAction(row, "approved")}
                                title="Approve Claim"
                                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10.5px] font-extrabold shadow-2xs transition-all cursor-pointer flex items-center gap-0.5"
                              >
                                <Check size={10} />
                                <span>मंजूर</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleAction(row, "rejected")}
                                title="Reject Claim"
                                className="px-1.5 py-0.5 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded text-[10.5px] font-semibold transition-all cursor-pointer"
                              >
                                नाकार
                              </button>
                            </>
                          )}

                          {isApproved && (
                            <button
                              type="button"
                              onClick={() => handleAction(row, "pending")}
                              title="Reset to Pending"
                              className="px-2 py-0.5 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded text-[10px] font-semibold border border-border transition-all cursor-pointer"
                            >
                              रीसेट
                            </button>
                          )}

                          {isRejected && (
                            <button
                              type="button"
                              onClick={() => handleAction(row, "approved")}
                              title="Re-approve Claim"
                              className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-extrabold transition-all cursor-pointer"
                            >
                              पुन्हा मंजूर
                            </button>
                          )}

                          {/* Link to view GPS trail for this day in Live Tracking */}
                          <Link
                            to={`${liveRadarPath}?employeeId=${row.employeeId}&date=${row.date}`}
                            title="View GPS Route in Live Tracking"
                            className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted transition-all"
                          >
                            <Eye size={13} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Sticky Table Summary Footer */}
            {filteredRows.length > 0 && (
              <tfoot className="sticky bottom-0 z-10 bg-muted/95 backdrop-blur-md border-t-2 border-border text-foreground font-black text-xs">
                <tr>
                  <td className="py-2 px-3.5">
                    <span className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
                      एकूण ({filteredRows.length} नोंदी)
                    </span>
                  </td>
                  <td className="py-2 px-3 text-muted-foreground">—</td>
                  <td className="py-2 px-3 text-muted-foreground">—</td>
                  <td className="py-2 px-3 text-right">
                    <span className="font-black text-xs text-foreground">
                      {filteredTotals.distance.toFixed(2)} km
                    </span>
                  </td>
                  <td className="py-2 px-3 text-muted-foreground text-right">—</td>
                  <td className="py-2 px-3 text-right">
                    <span className="font-black text-xs text-emerald-600 dark:text-emerald-400">
                      ₹{filteredTotals.amount.toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold">
                      ₹{filteredTotals.approvedAmount.toFixed(0)} मंजूर
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right text-muted-foreground">—</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ── Rate Settings Modal ────────────────────────────────────────── */}
      {isRateModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                  <IndianRupee size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-foreground">
                    प्रवास भत्ता दर निश्चित करा (Rate Per KM)
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-medium">
                    कंपनीच्या वाहनानुसार प्रति किलोमीटर दर सेट करा
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRateModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs font-bold">
              <div>
                <label className="block text-foreground mb-1 flex items-center gap-1.5">
                  <Bike size={13} className="text-emerald-500" />
                  <span>टू-व्हीलर दर (Bike / 2-Wheeler Rate ₹/km):</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={rateForm.twoWheelerRate}
                  onChange={(e) =>
                    setRateForm((prev) => ({
                      ...prev,
                      twoWheelerRate: parseFloat(e.target.value) || 0,
                      ratePerKm: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-black text-foreground focus:outline-none focus:border-primary shadow-2xs"
                />
                <p className="text-[10px] text-muted-foreground font-medium mt-1">
                  सामान्यतः ₹3.5 ते ₹5.0 प्रति किमी
                </p>
              </div>

              <div>
                <label className="block text-foreground mb-1 flex items-center gap-1.5">
                  <Car size={13} className="text-blue-500" />
                  <span>फोर-व्हीलर दर (Car / 4-Wheeler Rate ₹/km):</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={rateForm.fourWheelerRate}
                  onChange={(e) =>
                    setRateForm((prev) => ({
                      ...prev,
                      fourWheelerRate: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-black text-foreground focus:outline-none focus:border-primary shadow-2xs"
                />
                <p className="text-[10px] text-muted-foreground font-medium mt-1">
                  सामान्यतः ₹8.0 ते ₹12.0 प्रति किमी
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setIsRateModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground text-xs font-bold transition-all cursor-pointer"
              >
                रद्द करा
              </button>
              <button
                type="button"
                onClick={() => updateRateMutation.mutate(rateForm)}
                disabled={updateRateMutation.isPending}
                className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-black shadow-xs hover:bg-primary/90 transition-all cursor-pointer flex items-center gap-1.5"
              >
                {updateRateMutation.isPending ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <Check size={13} />
                )}
                <span>दर सेव्ह करा</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackingAllowance;
