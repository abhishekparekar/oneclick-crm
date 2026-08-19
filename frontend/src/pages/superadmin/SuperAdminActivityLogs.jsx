import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAuditLogsApi } from "../../api/superAdminApi";
import toast from "react-hot-toast";
import SaSelect from "../../components/common/SaSelect";
import DataTable from "../../components/common/DataTable";
import {
  Search, History, Shield, UserCircle, Clock, Globe, 
  Building2, Download, Filter, Activity, Lock,
  Pencil, Plus, Trash2, LogIn, RefreshCw, AlertTriangle
} from "lucide-react";

/* ── Action badge colour map (palette shades) ─────────────────────────────── */
const ACTION_STYLE = {
  CREATE:  { bg: "bg-emerald-500/15", text: "text-emerald-600 dark:text-emerald-400", icon: Plus },
  UPDATE:  { bg: "bg-[#06B6D4]/20",  text: "text-[#f59e0b] dark:text-[#06B6D4]",     icon: Pencil },
  DELETE:  { bg: "bg-rose-500/15",   text: "text-rose-600 dark:text-rose-400",         icon: Trash2 },
  LOGIN:   { bg: "bg-[#93CAF6]/20",  text: "text-[#b45309] dark:text-[#fbbf24]",      icon: LogIn },
  SYSTEM:  { bg: "bg-[#f59e0b]/15",  text: "text-[#d97706] dark:text-[#8EB5F0]",      icon: RefreshCw },
  SUSPEND: { bg: "bg-amber-500/15",  text: "text-amber-600 dark:text-amber-400",       icon: AlertTriangle },
};

const getActionStyle = (action = "") => {
  const up = action.toUpperCase();
  if (up.includes("CREATE") || up.includes("ADD"))    return ACTION_STYLE.CREATE;
  if (up.includes("UPDATE") || up.includes("EDIT"))   return ACTION_STYLE.UPDATE;
  if (up.includes("DELETE") || up.includes("REMOVE")) return ACTION_STYLE.DELETE;
  if (up.includes("LOGIN")  || up.includes("AUTH"))   return ACTION_STYLE.LOGIN;
  if (up.includes("SUSPEND") || up.includes("BAN"))   return ACTION_STYLE.SUSPEND;
  return ACTION_STYLE.SYSTEM;
};

/* ── Module icon map ──────────────────────────────────────────────────────── */
const MODULE_ICON = {
  employee:     UserCircle,
  companies:    Building2,
  users:        UserCircle,
  billing:      History,
  system:       Shield,
  subscriptions: RefreshCw,
};
const getModuleIcon = (module = "") => {
  const key = module.toLowerCase();
  return MODULE_ICON[key] || Activity;
};

/* ── Format relative time ─────────────────────────────────────────────────── */
const formatRelative = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

/* ─────────────────────────────────────────────────────────────────────────── */

const SuperAdminActivityLogs = () => {
  const [searchTerm, setSearchTerm]     = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["superAdminAuditLogs"],
    queryFn:  () => getAuditLogsApi(),
  });

  const logs = data?.data?.logs || [];
  const total = logs.length;

  /* Unique modules for filter */
  const modules = ["all", ...new Set(logs.map(l => l.module).filter(Boolean))];

  const filteredLogs = logs.filter((log) => {
    const matchSearch =
      (log.action || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.performedBy?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.companyId?.companyName || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchModule = moduleFilter === "all" || (log.module || "").toLowerCase() === moduleFilter.toLowerCase();
    const matchAction = actionFilter === "all" || (log.action || "").toUpperCase().includes(actionFilter);
    return matchSearch && matchModule && matchAction;
  });

  const handleExportCSV = () => {
    try {
      if (!filteredLogs || filteredLogs.length === 0) {
        toast.error("No activity logs available to export");
        return;
      }

      const headers = [
        "Event ID",
        "Timestamp",
        "Administrator Name",
        "Administrator Email",
        "IP Address",
        "Action Performed",
        "Module",
        "Organization Name",
        "Details"
      ];

      const rows = filteredLogs.map((log) => [
        `"${(log._id || "").replace(/"/g, '""')}"`,
        `"${log.createdAt ? new Date(log.createdAt).toLocaleString() : ""}"`,
        `"${(log.performedBy?.name || "System").replace(/"/g, '""')}"`,
        `"${(log.performedBy?.email || "").replace(/"/g, '""')}"`,
        `"${(log.ipAddress || "System Event").replace(/"/g, '""')}"`,
        `"${(log.action || "").replace(/"/g, '""')}"`,
        `"${(log.module || "SYSTEM").replace(/"/g, '""')}"`,
        `"${(log.companyId?.companyName || "Platform-wide").replace(/"/g, '""')}"`,
        `"${(typeof log.details === "object" ? JSON.stringify(log.details) : log.details || "").replace(/"/g, '""')}"`
      ]);

      const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      const filename = `superadmin_activity_logs_${new Date().toISOString().split("T")[0]}.csv`;

      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Successfully exported ${filteredLogs.length} audit events (${filename})!`);
    } catch (err) {
      console.error("Error exporting activity logs:", err);
      toast.error("Failed to export activity logs.");
    }
  };

  /* ── Table columns ──────────────────────────────────────────────────────── */
  const columns = [
    {
      header: "Timestamp",
      accessor: "createdAt",
      render: (row) => (
        <div>
          <p className="text-xs font-black text-sa-text">
            {new Date(row.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
          <p className="text-[11px] text-sa-text-secondary font-semibold mt-0.5 flex items-center">
            <Clock size={10} className="mr-1 flex-shrink-0" />
            {formatRelative(row.createdAt)}
          </p>
          <p className="text-[11px] text-sa-text-secondary font-medium mt-0.5">
            {new Date(row.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
          </p>
        </div>
      )
    },
    {
      header: "Administrator",
      accessor: "performedBy",
      render: (row) => (
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-sa-primary text-white flex items-center justify-center font-black text-xs flex-shrink-0">
            {(row.performedBy?.name || "S").charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-extrabold text-sa-text">{row.performedBy?.name || "System"}</p>
            <p className="text-[11px] text-sa-text-secondary font-medium mt-0.5 flex items-center">
              <Globe size={10} className="mr-1 flex-shrink-0" />
              {row.ipAddress || "System Event"}
            </p>
          </div>
        </div>
      )
    },
    {
      header: "Action Performed",
      accessor: "action",
      render: (row) => {
        const style = getActionStyle(row.action);
        const Icon  = style.icon;
        return (
          <div className="flex items-center space-x-2.5 max-w-xs">
            <span className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${style.bg}`}>
              <Icon size={13} className={style.text} />
            </span>
            <span className="text-sm font-bold text-sa-text leading-snug">{row.action}</span>
          </div>
        );
      }
    },
    {
      header: "Module",
      accessor: "module",
      render: (row) => {
        const Icon = getModuleIcon(row.module);
        return (
          <div className="flex items-center space-x-2">
            <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#f59e0b]/10 border border-[#f59e0b]/20">
              <Icon size={12} className="text-[#f59e0b] dark:text-[#06B6D4] flex-shrink-0" />
              <span className="text-[11px] font-black text-[#f59e0b] dark:text-[#06B6D4] uppercase tracking-widest">{row.module || "SYSTEM"}</span>
            </span>
          </div>
        );
      }
    },
    {
      header: "Organization",
      accessor: "company",
      render: (row) => (
        <div className="flex items-center space-x-1.5">
          {row.companyId?.companyName ? (
            <>
              <Building2 size={13} className="text-sa-text-secondary flex-shrink-0" />
              <span className="text-sm font-bold text-sa-text">{row.companyId.companyName}</span>
            </>
          ) : (
            <span className="text-xs text-sa-text-secondary font-bold flex items-center">
              <Shield size={12} className="mr-1 flex-shrink-0" />
              Platform-wide
            </span>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-3 sm:space-y-3.5 w-full pb-12">

      {/* ── Header Banner ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-sa-surface p-4 sm:p-4.5 rounded-2xl border border-sa-border shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-sa-primary/10 text-sa-primary flex items-center justify-center flex-shrink-0">
            <Activity size={24} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-sa-text tracking-tight">Activity Logs</h1>
            <p className="text-sm text-sa-text-secondary mt-0.5 font-medium">
              Immutable audit trail of all administrative actions across the platform.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3 self-start sm:self-center">
          {/* Live counter pill */}
          <span className="px-3 py-1.5 rounded-xl bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-[11px] font-black text-[#f59e0b] dark:text-[#06B6D4] uppercase tracking-widest flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
            <span>{total.toLocaleString()} Events</span>
          </span>
          <button 
            type="button"
            onClick={handleExportCSV}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl border border-sa-border/30 bg-sa-surface text-sa-text text-sm font-bold hover:bg-sa-bg hover:border-sa-primary transition-all cursor-pointer active:scale-95"
          >
            <Download size={15} className="text-sa-primary" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── Immutable Audit Banner ─────────────────────────────────────────── */}
      <div className="flex items-start space-x-3.5 bg-[#f59e0b]/8 border border-[#f59e0b]/25 rounded-2xl p-3 sm:p-3.5">
        <div className="w-9 h-9 rounded-xl bg-[#f59e0b]/15 flex items-center justify-center flex-shrink-0">
          <Lock size={16} className="text-[#f59e0b] dark:text-[#06B6D4]" />
        </div>
        <div>
          <p className="text-sm font-extrabold text-sa-text">Immutable Audit Trail — Read-Only</p>
          <p className="text-xs text-sa-text-secondary mt-0.5 leading-relaxed">
            These records are cryptographically sealed for compliance and security auditing. They cannot be modified, redacted, or deleted by any user including Super Admins.
          </p>
        </div>
      </div>

      {/* ── Search & Filter Bar ────────────────────────────────────────────── */}
      <div className="bg-sa-surface p-2.5 sm:p-3 rounded-2xl border border-sa-border shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sa-text-secondary" />
          <input
            type="text"
            placeholder="Search by action, administrator, or organization..."
            className="w-full bg-sa-bg border border-sa-border/30 rounded-xl pl-10 pr-4 py-2 text-sm text-sa-text placeholder-sa-text-secondary focus:outline-none focus:border-sa-primary transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 flex-shrink-0">
            <Filter size={14} className="text-sa-text-secondary" />
            <span className="text-xs font-extrabold text-sa-text-secondary uppercase tracking-wider">Filters:</span>
          </div>
          <SaSelect
            value={moduleFilter}
            onChange={setModuleFilter}
            options={[
              { label: "All Modules", value: "all" },
              ...modules.filter(m => m !== "all").map(m => ({ label: m, value: m }))
            ]}
            buttonClassName="!py-2 !px-3.5 !rounded-xl !bg-sa-bg"
          />
          <SaSelect
            value={actionFilter}
            onChange={setActionFilter}
            options={[
              { label: "All Actions", value: "all" },
              { label: "Create", value: "CREATE" },
              { label: "Update", value: "UPDATE" },
              { label: "Delete", value: "DELETE" },
              { label: "Login", value: "LOGIN" },
              { label: "Suspend", value: "SUSPEND" }
            ]}
            buttonClassName="!py-2 !px-3.5 !rounded-xl !bg-sa-bg"
          />
        </div>
      </div>

      {/* ── Results count strip ───────────────────────────────────────────── */}
      {!isLoading && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-bold text-sa-text-secondary">
            Showing <span className="text-sa-primary font-black">{filteredLogs.length.toLocaleString()}</span> of{" "}
            <span className="text-sa-text font-black">{total.toLocaleString()}</span> audit events
          </p>
          {(searchTerm || moduleFilter !== "all" || actionFilter !== "all") && (
            <button
              onClick={() => { setSearchTerm(""); setModuleFilter("all"); setActionFilter("all"); }}
              className="text-xs font-bold text-sa-primary hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* ── Data Table ────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="py-24 text-center bg-sa-surface rounded-2xl border border-sa-border shadow-sm">
          <div className="animate-spin w-9 h-9 border-4 border-sa-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-sa-text-secondary font-bold text-sm">Loading audit events...</p>
          <p className="text-sa-text-secondary text-xs mt-1">Fetching cryptographically sealed records</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="py-24 text-center bg-sa-surface rounded-2xl border border-sa-border shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-sa-primary/10 flex items-center justify-center mx-auto mb-4">
            <Activity size={28} className="text-sa-primary" />
          </div>
          <p className="text-sa-text font-black text-base">No audit events found</p>
          <p className="text-sa-text-secondary text-sm mt-1">Try adjusting your search filters</p>
        </div>
      ) : (
        <div className="bg-sa-surface rounded-2xl border border-sa-border shadow-sm overflow-hidden">
          <DataTable columns={columns} data={filteredLogs} pagination={{ total: filteredLogs.length }} />
        </div>
      )}

    </div>
  );
};

export default SuperAdminActivityLogs;
