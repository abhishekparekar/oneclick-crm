import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAuditLogsApi, getCompaniesApi } from "../../api/superAdminApi";
import toast from "react-hot-toast";
import SaSelect from "../../components/common/SaSelect";
import DataTable from "../../components/common/DataTable";
import {
  Search, History, Shield, UserCircle, Clock, Globe, 
  Building2, Download, Filter, Activity, Lock,
  Pencil, Plus, Trash2, LogIn, RefreshCw, AlertTriangle,
  Key, Users, Layers
} from "lucide-react";

/* ── Action badge colour map ─────────────────────────────────────────────── */
const ACTION_STYLE = {
  CREATE:  { bg: "bg-emerald-500/15", text: "text-emerald-600 dark:text-emerald-400", icon: Plus },
  UPDATE:  { bg: "bg-cyan-500/15",    text: "text-cyan-600 dark:text-cyan-400",       icon: Pencil },
  DELETE:  { bg: "bg-rose-500/15",   text: "text-rose-600 dark:text-rose-400",         icon: Trash2 },
  LOGIN:   { bg: "bg-blue-500/15",   text: "text-blue-600 dark:text-blue-400",         icon: LogIn },
  SYSTEM:  { bg: "bg-amber-500/15",  text: "text-amber-600 dark:text-amber-400",       icon: RefreshCw },
  SUSPEND: { bg: "bg-rose-500/15",   text: "text-rose-600 dark:text-rose-400",         icon: AlertTriangle },
  STATUS:  { bg: "bg-purple-500/15", text: "text-purple-600 dark:text-purple-400",     icon: RefreshCw },
};

const getActionStyle = (action = "") => {
  const up = action.toUpperCase();
  if (up.includes("CREATE") || up.includes("ADD") || up.includes("CONVERT")) return ACTION_STYLE.CREATE;
  if (up.includes("UPDATE") || up.includes("EDIT") || up.includes("EXTEND") || up.includes("RENEW")) return ACTION_STYLE.UPDATE;
  if (up.includes("DELETE") || up.includes("REMOVE") || up.includes("CANCEL")) return ACTION_STYLE.DELETE;
  if (up.includes("STATUS")) return ACTION_STYLE.STATUS;
  if (up.includes("LOGIN") || up.includes("AUTH")) return ACTION_STYLE.LOGIN;
  if (up.includes("SUSPEND") || up.includes("BAN")) return ACTION_STYLE.SUSPEND;
  return ACTION_STYLE.SYSTEM;
};

/* ── Module icon map ──────────────────────────────────────────────────────── */
const MODULE_ICON = {
  employee:      UserCircle,
  employees:     UserCircle,
  companies:     Building2,
  companyadmins: Shield,
  companyrequests: Building2,
  users:         Users,
  billing:       History,
  payments:      History,
  system:        Shield,
  subscriptions: RefreshCw,
  plans:         Layers,
  subsuperadmins: Key,
  attendance:    Clock,
  tasks:         Activity,
  leaves:        Clock,
  announcements: RefreshCw,
};

const getModuleIcon = (module = "") => {
  const key = module.toLowerCase().replace(/[^a-z]/g, "");
  return MODULE_ICON[key] || Activity;
};

/* ── Format relative time ─────────────────────────────────────────────────── */
const formatRelative = (dateStr) => {
  if (!dateStr) return "recently";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

/* ── Role Badge Component ─────────────────────────────────────────────────── */
const RoleBadge = ({ role }) => {
  if (!role) return null;
  const map = {
    SuperAdmin:    { bg: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30", label: "Super Admin" },
    SubSuperAdmin: { bg: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30", label: "Sub-Super Admin" },
    CompanyAdmin:  { bg: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30", label: "Company Admin" },
    HR:            { bg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30", label: "HR Manager" },
    Manager:       { bg: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30", label: "Manager" },
    Employee:      { bg: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30", label: "Employee" },
  };
  const c = map[role] || { bg: "bg-slate-500/15 text-slate-500 border-slate-500/20", label: role };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider border ${c.bg}`}>
      {c.label}
    </span>
  );
};

/* ─────────────────────────────────────────────────────────────────────────── */

const SuperAdminActivityLogs = () => {
  const [activeTab, setActiveTab]         = useState("platform"); // "platform" | "companies" | "all"
  const [searchTerm, setSearchTerm]       = useState("");
  const [moduleFilter, setModuleFilter]   = useState("all");
  const [actionFilter, setActionFilter]   = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");

  // Fetch all audit logs
  const { data, isLoading } = useQuery({
    queryKey: ["superAdminAuditLogs"],
    queryFn:  () => getAuditLogsApi({ limit: 1000 }),
    refetchInterval: 30000,
  });

  // Fetch companies for filtering
  const { data: companiesData } = useQuery({
    queryKey: ["superAdminCompaniesListBrief"],
    queryFn: () => getCompaniesApi(),
    staleTime: 60000,
  });

  const rawCompanies = Array.isArray(companiesData?.data) 
    ? companiesData.data 
    : (companiesData?.data?.companies || []);

  const logs = data?.data?.logs || [];

  // Partition logs: STRICTLY SuperAdmin & SubSuperAdmin for Platform tab
  const { platformLogs, companyLogs } = useMemo(() => {
    const platform = [];
    const company = [];

    logs.forEach((log) => {
      const role = log.performedBy?.role;
      const isStrictSuperAdmin = role === "SuperAdmin" || role === "SubSuperAdmin";

      if (isStrictSuperAdmin) {
        platform.push(log);
      } else {
        company.push(log);
      }
    });

    return { platformLogs: platform, companyLogs: company };
  }, [logs]);

  // Current tab base logs
  const tabLogs = useMemo(() => {
    if (activeTab === "platform") return platformLogs;
    if (activeTab === "companies") return companyLogs;
    return logs;
  }, [activeTab, platformLogs, companyLogs, logs]);

  // Unique modules for current tab
  const modules = useMemo(() => {
    return ["all", ...new Set(tabLogs.map(l => l.module).filter(Boolean))];
  }, [tabLogs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return tabLogs.filter((log) => {
      const searchTarget = `${log.action || ""} ${log.performedBy?.name || ""} ${log.performedBy?.email || ""} ${log.companyId?.companyName || ""} ${log.module || ""}`.toLowerCase();
      const matchSearch = !searchTerm || searchTarget.includes(searchTerm.toLowerCase());
      const matchModule = moduleFilter === "all" || (log.module || "").toLowerCase() === moduleFilter.toLowerCase();
      const matchAction = actionFilter === "all" || (log.action || "").toUpperCase().includes(actionFilter.toUpperCase());
      const matchCompany = companyFilter === "all" || String(log.companyId?._id || log.companyId) === companyFilter;

      return matchSearch && matchModule && matchAction && matchCompany;
    });
  }, [tabLogs, searchTerm, moduleFilter, actionFilter, companyFilter]);

  /* ── Export CSV Handler ─────────────────────────────────────────────────── */
  const handleExportCSV = () => {
    try {
      if (!filteredLogs || filteredLogs.length === 0) {
        toast.error("No activity logs available to export");
        return;
      }

      const headers = [
        "Event ID",
        "Timestamp",
        "Performed By Name",
        "Performed By Email",
        "Role",
        "IP Address",
        "Action Performed",
        "Module",
        "Target Organization",
      ];

      const rows = filteredLogs.map((log) => [
        `"${(log._id || "").replace(/"/g, '""')}"`,
        `"${log.createdAt ? new Date(log.createdAt).toLocaleString() : ""}"`,
        `"${(log.performedBy?.name || "System").replace(/"/g, '""')}"`,
        `"${(log.performedBy?.email || "").replace(/"/g, '""')}"`,
        `"${(log.performedBy?.role || "System").replace(/"/g, '""')}"`,
        `"${(log.ipAddress || "System Event").replace(/"/g, '""')}"`,
        `"${(log.action || "").replace(/"/g, '""')}"`,
        `"${(log.module || "SYSTEM").replace(/"/g, '""')}"`,
        `"${(log.companyId?.companyName || "Platform-wide").replace(/"/g, '""')}"`,
      ]);

      const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      const filename = `${activeTab}_activity_logs_${new Date().toISOString().split("T")[0]}.csv`;

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

  /* ── Dynamic Table Columns ──────────────────────────────────────────────── */
  const columns = useMemo(() => {
    return [
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
            <p className="text-[10px] text-sa-text-secondary font-medium mt-0.5">
              {new Date(row.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
          </div>
        )
      },
      {
        header: activeTab === "platform" ? "Platform Admin" : "Performed By",
        accessor: "performedBy",
        render: (row) => (
          <div className="flex items-center space-x-2.5 min-w-[170px]">
            <div className={`w-8 h-8 rounded-xl text-white flex items-center justify-center font-black text-xs flex-shrink-0 shadow-2xs ${
              row.performedBy?.role === "SuperAdmin" 
                ? "bg-[#1268D9]" 
                : row.performedBy?.role === "SubSuperAdmin"
                ? "bg-purple-600"
                : "bg-slate-700"
            }`}>
              {(row.performedBy?.name || "S").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-xs font-extrabold text-sa-text truncate">{row.performedBy?.name || "System"}</p>
                <RoleBadge role={row.performedBy?.role} />
              </div>
              <p className="text-[11px] text-sa-text-secondary font-medium truncate mt-0.5">
                {row.performedBy?.email || row.ipAddress || "Platform Event"}
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
            <div className="flex items-center space-x-2.5 max-w-sm">
              <span className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${style.bg}`}>
                <Icon size={13} className={style.text} />
              </span>
              <span className="text-xs font-bold text-sa-text leading-snug">{row.action}</span>
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
              <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-sa-bg border border-sa-border/40">
                <Icon size={12} className="text-amber-500 dark:text-cyan-400 flex-shrink-0" />
                <span className="text-[10px] font-black text-sa-text uppercase tracking-wider">{row.module || "SYSTEM"}</span>
              </span>
            </div>
          );
        }
      },
      {
        header: activeTab === "platform" ? "Target Scope" : "Company",
        accessor: "company",
        render: (row) => (
          <div className="flex items-center space-x-1.5 min-w-[140px]">
            {row.companyId?.companyName ? (
              <div className="flex items-center gap-1.5">
                <Building2 size={13} className="text-amber-500 flex-shrink-0" />
                <span className="text-xs font-extrabold text-sa-text hover:underline cursor-pointer">
                  {row.companyId.companyName}
                </span>
              </div>
            ) : (
              <span className="text-xs text-sa-text-secondary font-bold flex items-center">
                <Shield size={12} className="mr-1 text-blue-500 flex-shrink-0" />
                Platform-wide
              </span>
            )}
          </div>
        )
      },
      {
        header: "IP Address",
        accessor: "ipAddress",
        render: (row) => (
          <span className="text-[11px] font-mono font-medium text-sa-text-secondary flex items-center">
            <Globe size={11} className="mr-1 flex-shrink-0 opacity-70" />
            {row.ipAddress || "Internal"}
          </span>
        )
      }
    ];
  }, [activeTab]);

  return (
    <div className="space-y-3 sm:space-y-3.5 w-full pb-12 font-sans">

      {/* ── Header Banner ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-sa-surface p-4 sm:p-5 rounded-2xl border border-sa-border shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0 shadow-2xs">
            <Activity size={24} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-sa-text tracking-tight">Activity Logs</h1>
            <p className="text-xs text-sa-text-secondary mt-0.5 font-medium">
              Real-time audit trail of administrative operations and organization activity events.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3 self-start sm:self-center">
          <button 
            type="button"
            onClick={handleExportCSV}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl border border-sa-border/40 bg-sa-bg text-sa-text text-xs font-extrabold hover:bg-sa-surface hover:border-amber-500 transition-all cursor-pointer active:scale-95 shadow-2xs"
          >
            <Download size={14} className="text-amber-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── Main Category Tabs: SuperAdmin First, Company Activities Second ── */}
      <div className="flex items-center justify-between border-b border-sa-border/40 pb-1 gap-2 flex-wrap">
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          
          {/* Tab 1: Super Admin & Sub-Super Admin (Default Active) */}
          <button
            type="button"
            onClick={() => { setActiveTab("platform"); setCompanyFilter("all"); }}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === "platform"
                ? "bg-[#1268D9] text-white shadow-sm shadow-[#1268D9]/25"
                : "text-sa-text-secondary hover:text-sa-text hover:bg-sa-surface border border-transparent"
            }`}
          >
            <Shield size={14} />
            <span>SuperAdmin &amp; Sub-Admins</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === "platform" ? "bg-white/20 text-white" : "bg-sa-bg text-sa-text-secondary"
            }`}>
              {platformLogs.length}
            </span>
          </button>

          {/* Tab 2: Company Activities */}
          <button
            type="button"
            onClick={() => setActiveTab("companies")}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === "companies"
                ? "bg-[#1268D9] text-white shadow-sm shadow-[#1268D9]/25"
                : "text-sa-text-secondary hover:text-sa-text hover:bg-sa-surface border border-transparent"
            }`}
          >
            <Building2 size={14} />
            <span>Company Activities</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === "companies" ? "bg-white/20 text-white" : "bg-sa-bg text-sa-text-secondary"
            }`}>
              {companyLogs.length}
            </span>
          </button>

          {/* Tab 3: All Activities */}
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === "all"
                ? "bg-[#1268D9] text-white shadow-sm shadow-[#1268D9]/25"
                : "text-sa-text-secondary hover:text-sa-text hover:bg-sa-surface border border-transparent"
            }`}
          >
            <Layers size={14} />
            <span>All Logs</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === "all" ? "bg-white/20 text-white" : "bg-sa-bg text-sa-text-secondary"
            }`}>
              {logs.length}
            </span>
          </button>
        </div>

        {/* Live Status indicator */}
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-sa-text-secondary">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Real-time Log Stream</span>
        </div>
      </div>

      {/* ── Search & Filter Bar ────────────────────────────────────────────── */}
      <div className="bg-sa-surface p-2.5 sm:p-3 rounded-2xl border border-sa-border shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sa-text-secondary" />
          <input
            type="text"
            placeholder={
              activeTab === "platform" 
                ? "Search platform action, admin name or email..." 
                : activeTab === "companies"
                ? "Search company action, employee or organization..."
                : "Search all audit records..."
            }
            className="w-full bg-sa-bg border border-sa-border/30 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-sa-text placeholder:text-sa-text-secondary/50 focus:outline-none focus:border-sa-primary transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Company filter dropdown (visible when on company activities or all) */}
          {activeTab !== "platform" && rawCompanies.length > 0 && (
            <SaSelect
              value={companyFilter}
              onChange={setCompanyFilter}
              options={[
                { label: "All Companies", value: "all" },
                ...rawCompanies.map(c => ({ label: c.companyName, value: c._id }))
              ]}
              buttonClassName="!py-1.5 !px-3 !rounded-xl !bg-sa-bg !text-xs !font-bold"
            />
          )}

          {/* Module Filter */}
          <SaSelect
            value={moduleFilter}
            onChange={setModuleFilter}
            options={[
              { label: "All Modules", value: "all" },
              ...modules.filter(m => m !== "all").map(m => ({ label: m, value: m }))
            ]}
            buttonClassName="!py-1.5 !px-3 !rounded-xl !bg-sa-bg !text-xs !font-bold"
          />

          {/* Action Filter */}
          <SaSelect
            value={actionFilter}
            onChange={setActionFilter}
            options={[
              { label: "All Actions", value: "all" },
              { label: "Create / Add", value: "CREATE" },
              { label: "Update / Edit", value: "UPDATE" },
              { label: "Delete / Remove", value: "DELETE" },
              { label: "Status Change", value: "STATUS" },
              { label: "Login / Auth", value: "LOGIN" },
              { label: "Suspend / Ban", value: "SUSPEND" }
            ]}
            buttonClassName="!py-1.5 !px-3 !rounded-xl !bg-sa-bg !text-xs !font-bold"
          />
        </div>
      </div>

      {/* ── Results count strip ───────────────────────────────────────────── */}
      {!isLoading && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-bold text-sa-text-secondary">
            Showing <span className="text-sa-primary font-black">{filteredLogs.length.toLocaleString()}</span> of{" "}
            <span className="text-sa-text font-black">{tabLogs.length.toLocaleString()}</span> {activeTab === "platform" ? "Platform Admin" : activeTab === "companies" ? "Company" : "Total"} events
          </p>
          {(searchTerm || moduleFilter !== "all" || actionFilter !== "all" || companyFilter !== "all") && (
            <button
              onClick={() => { setSearchTerm(""); setModuleFilter("all"); setActionFilter("all"); setCompanyFilter("all"); }}
              className="text-xs font-bold text-sa-primary hover:underline cursor-pointer"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* ── Data Table ────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="py-24 text-center bg-sa-surface rounded-2xl border border-sa-border shadow-xs">
          <div className="animate-spin w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sa-text font-bold text-sm">Loading activity logs...</p>
          <p className="text-sa-text-secondary text-xs mt-0.5">Fetching verified audit trail events</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="py-20 text-center bg-sa-surface rounded-2xl border border-sa-border shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-sa-bg flex items-center justify-center mx-auto mb-3 text-sa-text-secondary">
            <Activity size={24} />
          </div>
          <p className="text-sa-text font-black text-sm">No activity logs found</p>
          <p className="text-sa-text-secondary text-xs mt-1">
            {searchTerm || moduleFilter !== "all" || actionFilter !== "all" || companyFilter !== "all"
              ? "Try adjusting or clearing your search filters."
              : activeTab === "platform"
              ? "No SuperAdmin or Sub-SuperAdmin activity logs recorded yet."
              : "No company activity events recorded yet."}
          </p>
        </div>
      ) : (
        <div className="bg-sa-surface rounded-2xl border border-sa-border shadow-xs overflow-hidden">
          <DataTable columns={columns} data={filteredLogs} pagination={{ total: filteredLogs.length }} />
        </div>
      )}

    </div>
  );
};

export default SuperAdminActivityLogs;
