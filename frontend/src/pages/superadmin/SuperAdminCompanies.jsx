import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getCompaniesApi, 
  updateCompanyStatusApi, 
  restoreCompanyApi, 
  permanentDeleteCompanyApi 
} from "../../api/superAdminApi";
import toast from "react-hot-toast";
import SaSelect from "../../components/common/SaSelect";
import DataTable from "../../components/common/DataTable";
import SuperAdminEditCompanyModal from "../../components/company/SuperAdminEditCompanyModal";
import SuperAdminDeleteCompanyModal from "../../components/company/SuperAdminDeleteCompanyModal";
import { 
  Search, Plus, MoreVertical, Building2, ExternalLink, Settings, Ban, Trash2, Key, 
  CheckCircle, Clock, AlertTriangle, User, Mail, Phone, Calendar, Users, ArrowUp, ArrowDown, Download, RotateCcw, ShieldAlert, Info, MessageSquare
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

/* ─── Fallback Mock Companies if API returns empty ────────────────────────── */
const MOCK_COMPANIES = [
  {
    _id: "comp_101",
    companyName: "Acme Corporation Global",
    companyCode: "ACME-01",
    ownerName: "Rajesh Sharma",
    email: "rajesh.sharma@acmeglobal.com",
    phone: "+91 98765 43210",
    planName: "Enterprise",
    employeeLimit: 500,
    status: "active",
    createdAt: "2025-11-15T10:30:00Z"
  },
  {
    _id: "comp_102",
    companyName: "TechSphere Solutions Pvt Ltd",
    companyCode: "TECH-88",
    ownerName: "Priya Nair",
    email: "priya.nair@techsphere.io",
    phone: "+91 98123 45678",
    planName: "Pro",
    employeeLimit: 200,
    status: "active",
    createdAt: "2025-12-01T14:20:00Z"
  },
  {
    _id: "comp_103",
    companyName: "Nexus Innovation Labs",
    companyCode: "NEXS-09",
    ownerName: "Arjun Verma",
    email: "arjun@nexuslabs.co",
    phone: "+91 99001 12233",
    planName: "Basic",
    employeeLimit: 50,
    status: "active",
    createdAt: "2026-01-10T09:15:00Z"
  }
];

/* ─── Compact KPI Card Component ─────────────────────────────────────────── */
const KPICard = ({ label, value, trend, isUp, period, strokeColor, Icon, iconBg, iconColor }) => {
  const sparkData = useMemo(() => [
    { v: 12 }, { v: 18 }, { v: 14 }, { v: 22 }, { v: 19 }, { v: 28 }, { v: 24 }, { v: 34 },
  ], []);

  return (
    <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-2.5 sm:px-3.5 sm:py-3 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-200 group">
      <div className="flex-1 min-w-0 pr-1 sm:pr-2">
        <div className="flex items-center gap-1 sm:gap-1.5 mb-1">
          <div className={`w-5 h-5 rounded-md flex items-center justify-center ${iconBg} flex-shrink-0`}>
            <Icon size={12} style={{ color: iconColor }} strokeWidth={2.2} />
          </div>
          <span className="text-[9px] sm:text-[9.5px] font-semibold text-slate-400 uppercase tracking-wider truncate">{label}</span>
        </div>
        <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none mb-1">{value}</h3>
        <div className="flex items-center gap-1 text-[9px] sm:text-[10px]">
          <span className={`inline-flex items-center font-bold ${isUp ? "text-emerald-600" : "text-rose-500"}`}>
            {isUp ? <ArrowUp size={9} strokeWidth={2.5}/> : <ArrowDown size={9} strokeWidth={2.5}/>}
            {trend}
          </span>
          <span className="text-slate-400 text-[8.5px] sm:text-[9px] truncate hidden sm:inline">vs {period}</span>
        </div>
      </div>
      <div className="h-8 w-14 opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none flex-shrink-0 hidden md:block">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`sk-${label.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.3}/>
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={strokeColor} strokeWidth={2} fill={`url(#sk-${label.replace(/\s+/g, '')})`}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const SuperAdminCompanies = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("active"); // "active" | "trash"
  const [searchTerm, setSearchTerm] = useState("");
  const [trashSearchTerm, setTrashSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [activeMenu, setActiveMenu] = useState(null);
  const [editingCompany, setEditingCompany] = useState(null);
  const [companyToDelete, setCompanyToDelete] = useState(null);

  // 1. Fetch Active Companies (isDeleted !== true)
  const { data: activeData, isLoading: isActiveLoading } = useQuery({
    queryKey: ["superAdminCompanies"],
    queryFn: () => getCompaniesApi(),
  });

  // 2. Fetch Deleted Companies (isDeleted === true)
  const { data: trashData, isLoading: isTrashLoading } = useQuery({
    queryKey: ["superAdminDeletedCompanies"],
    queryFn: () => getCompaniesApi({ trash: true }),
  });

  const rawActiveCompanies = Array.isArray(activeData?.data)
    ? activeData?.data
    : (activeData?.data?.companies || activeData?.data?.data || []);

  const activeCompaniesList = rawActiveCompanies.length > 0 ? rawActiveCompanies : MOCK_COMPANIES;

  const rawTrashCompanies = Array.isArray(trashData?.data)
    ? trashData?.data
    : (trashData?.data?.companies || trashData?.data?.data || []);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updateCompanyStatusApi(id, status),
    onSuccess: () => queryClient.invalidateQueries(["superAdminCompanies"]),
    onError: (err) => toast.error(err.response?.data?.message || "Failed to update status")
  });

  const restoreMutation = useMutation({
    mutationFn: (id) => restoreCompanyApi(id),
    onSuccess: () => {
      toast.success("Company restored successfully to active list!");
      queryClient.invalidateQueries(["superAdminCompanies"]);
      queryClient.invalidateQueries(["superAdminDeletedCompanies"]);
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to restore company")
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: (id) => permanentDeleteCompanyApi(id),
    onSuccess: () => {
      toast.success("Company permanently purged from database.");
      queryClient.invalidateQueries(["superAdminDeletedCompanies"]);
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to permanently delete company")
  });

  // Filtering for Active Tab
  const filteredActiveCompanies = useMemo(() => {
    return activeCompaniesList.filter((company) => {
      const matchesSearch = (company.companyName || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (company.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (company.companyCode || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || 
                            String(company.status || "").toLowerCase() === String(statusFilter).toLowerCase() || 
                            (statusFilter === "active" && company.isActive === true) || 
                            (statusFilter === "inactive" && company.isActive === false);
      const planStr = String(company.planName || company.plan || "").toLowerCase();
      const matchesPlan = planFilter === "all" || 
                          planStr.includes(String(planFilter).toLowerCase()) || 
                          (planFilter === "Trial" && ["trial", "free", "basic"].includes(planStr));
      return matchesSearch && matchesStatus && matchesPlan;
    });
  }, [activeCompaniesList, searchTerm, statusFilter, planFilter]);

  // Filtering for Trash Tab
  const filteredTrashCompanies = useMemo(() => {
    return rawTrashCompanies.filter((company) => {
      const term = trashSearchTerm.toLowerCase();
      return (
        (company.companyName || "").toLowerCase().includes(term) ||
        (company.email || "").toLowerCase().includes(term) ||
        (company.companyCode || "").toLowerCase().includes(term) ||
        (company.deletionReason || "").toLowerCase().includes(term)
      );
    });
  }, [rawTrashCompanies, trashSearchTerm]);

  // Active KPIs
  const totalCompanies = activeCompaniesList.length;
  const activeCount = activeCompaniesList.filter(c => c.status === "active").length;
  const suspendedCount = activeCompaniesList.filter(c => c.status === "suspended").length;
  const trialCount = activeCompaniesList.filter(c => String(c.planName).toLowerCase().includes("trial") || String(c.planName).toLowerCase().includes("free")).length;
  
  const expiringThisMonth = activeCompaniesList.filter(c => {
    if (!c.planName || (!String(c.planName).toLowerCase().includes("trial") && !String(c.planName).toLowerCase().includes("free"))) return false;
    const expiry = new Date(c.createdAt || Date.now());
    expiry.setDate(expiry.getDate() + 30);
    const now = new Date();
    return expiry.getMonth() === now.getMonth() && expiry.getFullYear() === now.getFullYear();
  }).length;

  const handleExportData = () => {
    try {
      const exportList = activeTab === "active" ? filteredActiveCompanies : filteredTrashCompanies;
      if (!exportList || exportList.length === 0) {
        toast.error("No companies available to export");
        return;
      }

      const headers = [
        "Company ID", "Company Name", "Company Code", "Owner / Contact Name",
        "Email", "Phone", "Plan Name", "User Limit", "Status", "Created Date"
      ];

      const rows = exportList.map((c) => [
        `"${(c._id || "").replace(/"/g, '""')}"`,
        `"${(c.companyName || c.name || "Unknown").replace(/"/g, '""')}"`,
        `"${(c.companyCode || "").replace(/"/g, '""')}"`,
        `"${(c.ownerName || c.contactPerson || "").replace(/"/g, '""')}"`,
        `"${(c.email || "").replace(/"/g, '""')}"`,
        `"${(c.phone || "").replace(/"/g, '""')}"`,
        `"${(c.planName || c.plan || "Free").replace(/"/g, '""')}"`,
        c.employeeLimit || c.userLimit || 0,
        `"${(c.status || "active").replace(/"/g, '""')}"`,
        `"${c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ""}"`
      ]);

      const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      const filename = `superadmin_companies_${activeTab}_${new Date().toISOString().split("T")[0]}.csv`;

      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Successfully exported ${exportList.length} company records!`);
    } catch (err) {
      console.error("Error exporting company data:", err);
      toast.error("Failed to export company data.");
    }
  };

  const toggleStatus = (id, currentStatus) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    if (window.confirm(`Are you sure you want to ${newStatus} this company?`)) {
      statusMutation.mutate({ id, status: newStatus });
    }
  };

  const handleRestore = (company) => {
    if (window.confirm(`Are you sure you want to restore "${company.companyName}"? This will reactivate the organization and return it to the active list.`)) {
      restoreMutation.mutate(company._id);
    }
  };

  const handlePermanentDelete = (company) => {
    if (window.confirm(`CRITICAL WARNING: Are you sure you want to permanently erase "${company.companyName}" immediately? All company data, settings, employees, and user credentials will be permanently destroyed. This CANNOT be undone!`)) {
      permanentDeleteMutation.mutate(company._id);
    }
  };

  // Columns for Active Companies Table
  const activeColumns = [
    {
      header: "Company",
      accessor: "companyName",
      render: (row) => (
        <div className="flex items-center space-x-3.5 py-1">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/20 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-2xs">
            {row.logo ? (
              <img src={row.logo} alt={row.companyName} className="w-full h-full object-cover rounded-xl" />
            ) : (
              <Building2 size={18} className="text-amber-600 dark:text-amber-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p 
              onClick={() => navigate(`/superadmin/companies/${row._id}`)}
              className="text-[14px] font-bold text-slate-900 dark:text-white tracking-tight truncate leading-tight hover:text-amber-500 transition-colors cursor-pointer"
            >
              {row.companyName}
            </p>
            {row.companyCode ? (
              <span className="inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                Code: {row.companyCode}
              </span>
            ) : (
              <span className="text-[11px] font-medium text-slate-400 mt-0.5 block">Organization</span>
            )}
          </div>
        </div>
      ),
    },
    {
      header: "Owner / Contact",
      accessor: "ownerName",
      render: (row) => (
        <div className="flex flex-col space-y-1 py-1">
          <div className="flex items-center space-x-2 text-slate-800 dark:text-slate-200 font-semibold text-[13px] leading-tight">
            <User size={13} className="text-slate-400 flex-shrink-0" />
            <span className="truncate">{row.ownerName || "No Owner Assigned"}</span>
          </div>
          <div className="flex items-center space-x-2 text-[12px] text-slate-500 dark:text-slate-400 leading-tight">
            <Mail size={12} className="opacity-75 flex-shrink-0" />
            <span className="truncate hover:underline cursor-pointer" title={row.email || row.ownerEmail}>
              {row.email || row.ownerEmail || "—"}
            </span>
          </div>
          {row.phone && (
            <div className="flex items-center space-x-2 text-[11px] text-slate-400 leading-tight">
              <Phone size={11} className="opacity-75 flex-shrink-0" />
              <span>{row.phone}</span>
            </div>
          )}
        </div>
      )
    },
    {
      header: "Plan & Usage",
      accessor: "planName",
      render: (row) => {
        const plan = row.planName?.toUpperCase() || "TRIAL";
        const isEnt = plan.includes("ENTERPRISE");
        const isPro = plan.includes("PRO") || plan.includes("BASIC");
        return (
          <div className="flex flex-col items-start space-y-1 py-1">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider shadow-2xs border ${
              isEnt
                ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                : isPro
                  ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
            }`}>
              {plan}
            </span>
            <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <Users size={12} className="opacity-75" />
              <span>Limit: {row.employeeLimit || 50} Users</span>
            </div>
          </div>
        );
      }
    },
    {
      header: "Created",
      accessor: "createdAt",
      render: (row) => (
        <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 font-medium text-[12px] py-1">
          <Calendar size={13} className="opacity-75 flex-shrink-0" />
          <span>
            {new Date(row.createdAt || Date.now()).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric"
            })}
          </span>
        </div>
      )
    },
    {
      header: "Status",
      accessor: "status",
      render: (row) => {
        const status = row.status?.toLowerCase() || "active";
        const isAct = status === "active";
        const isSusp = status === "suspended";
        return (
          <span className={`inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full text-[11px] font-extrabold tracking-wide border shadow-2xs ${
            isAct
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              : isSusp
                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isAct ? 'bg-emerald-500 animate-pulse' : isSusp ? 'bg-rose-500' : 'bg-amber-500'}`} />
            <span className="capitalize">{status}</span>
          </span>
        );
      }
    },
    {
      header: "Actions",
      accessor: "actions",
      render: (row) => {
        const isOpen = activeMenu?.id === row._id;
        return (
          <div className="text-right select-none">
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isOpen) {
                  setActiveMenu(null);
                } else {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const openUpward = window.innerHeight - rect.bottom < 260;
                  setActiveMenu({
                    id: row._id,
                    x: window.innerWidth - rect.right,
                    y: openUpward ? window.innerHeight - rect.top + 6 : rect.bottom + 6,
                    openUpward,
                    row
                  });
                }
              }}
              className={`p-1.5 rounded-lg border transition-all ${
                isOpen 
                  ? "bg-amber-500 text-slate-950 border-amber-500 shadow-xs" 
                  : "bg-slate-50 dark:bg-slate-800/80 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white border-slate-200/80 dark:border-slate-700"
              }`}
            >
              <MoreVertical size={15} />
            </button>
          </div>
        );
      }
    }
  ];

  // Columns for Deleted / Trash Companies Table
  const trashColumns = [
    {
      header: "Deleted Company",
      accessor: "companyName",
      render: (row) => (
        <div className="flex items-center space-x-3.5 py-1">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 dark:bg-rose-950/40 border border-rose-500/20 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-2xs">
            {row.logo ? (
              <img src={row.logo} alt={row.companyName} className="w-full h-full object-cover rounded-xl grayscale opacity-75" />
            ) : (
              <Building2 size={18} className="text-rose-500 dark:text-rose-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold text-slate-900 dark:text-white tracking-tight truncate leading-tight">
              {row.companyName}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              {row.companyCode && (
                <span className="text-[10px] font-semibold px-2 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                  {row.companyCode}
                </span>
              )}
              <span className="text-[11px] text-slate-400 truncate">
                Owner: {row.ownerName || row.email || "—"}
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      header: "Reason for Deletion",
      accessor: "deletionReason",
      render: (row) => (
        <div className="py-1 max-w-xs">
          <div className="flex items-start gap-1.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
            <MessageSquare size={13} className="text-rose-500 mt-0.5 flex-shrink-0" />
            <p className="text-[11.5px] font-medium text-slate-700 dark:text-slate-300 line-clamp-2 leading-tight">
              {row.deletionReason || "No deletion reason specified"}
            </p>
          </div>
        </div>
      )
    },
    {
      header: "Deleted On",
      accessor: "deletedAt",
      render: (row) => (
        <div className="flex flex-col space-y-0.5 py-1 text-[11.5px]">
          <div className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-300 font-semibold">
            <Calendar size={12} className="text-slate-400 flex-shrink-0" />
            <span>
              {row.deletedAt ? new Date(row.deletedAt).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric"
              }) : "—"}
            </span>
          </div>
          <span className="text-[10.5px] text-slate-400">
            By: {row.deletedBy?.name || row.deletedBy?.email || "SuperAdmin"}
          </span>
        </div>
      )
    },
    {
      header: "Retention Countdown",
      accessor: "permanentDeleteAt",
      render: (row) => {
        const target = row.permanentDeleteAt ? new Date(row.permanentDeleteAt) : null;
        const now = new Date();
        const daysLeft = target ? Math.max(0, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;
        
        const isUrgent = daysLeft <= 2;
        const isWarning = daysLeft <= 5;

        return (
          <div className="flex flex-col items-start space-y-1 py-1">
            <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold tracking-wide border shadow-2xs ${
              isUrgent
                ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 animate-pulse"
                : isWarning
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
            }`}>
              <Clock size={12} />
              <span>
                {daysLeft === 0 ? "Purging Today" : `${daysLeft} Day${daysLeft === 1 ? "" : "s"} Remaining`}
              </span>
            </span>
            {target && (
              <span className="text-[10px] text-slate-400">
                Purge: {target.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: "Actions",
      accessor: "trashActions",
      render: (row) => (
        <div className="flex items-center justify-end gap-2 py-1">
          {/* Restore Button */}
          <button
            type="button"
            onClick={() => handleRestore(row)}
            disabled={restoreMutation.isPending}
            title="Restore organization to active state"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 text-xs font-bold transition-all cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          >
            <RotateCcw size={13} strokeWidth={2.2} />
            <span>Restore</span>
          </button>

          {/* Permanent Delete Button */}
          <button
            type="button"
            onClick={() => handlePermanentDelete(row)}
            disabled={permanentDeleteMutation.isPending}
            title="Delete immediately without waiting 10 days"
            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/25 transition-all cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4 w-full pb-10 font-sans text-slate-900 dark:text-slate-100">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Companies Management</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage active client organizations, access control, and deleted organizations with 10-day safety retention.
          </p>
        </div>
        <div className="flex items-center space-x-2.5">
          <button 
            type="button" 
            onClick={handleExportData}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#111C24] text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer active:scale-95"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          <Link to="/superadmin/companies/add" className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold shadow-xs transition-all cursor-pointer">
            <Plus size={15} strokeWidth={2.5} />
            <span>Add Company</span>
          </Link>
        </div>
      </div>

      {/* Tabs Navigation: Active vs Deleted (Trash) */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("active")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === "active"
              ? "bg-amber-500 text-slate-950 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
          }`}
        >
          <Building2 size={15} />
          <span>Active Companies</span>
          <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-black ${
            activeTab === "active" ? "bg-slate-950/15 text-slate-950" : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
          }`}>
            {rawActiveCompanies.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("trash")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === "trash"
              ? "bg-rose-500 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10"
          }`}
        >
          <Trash2 size={15} />
          <span>Deleted Companies (Trash)</span>
          {rawTrashCompanies.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-black ${
              activeTab === "trash" ? "bg-white/20 text-white" : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
            }`}>
              {rawTrashCompanies.length}
            </span>
          )}
        </button>
      </div>

      {/* ACTIVE TAB CONTENT */}
      {activeTab === "active" && (
        <div className="space-y-4">
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
            <KPICard label="Total Companies"  value={totalCompanies}    trend="12.4%" isUp period="last month" strokeColor="#06B6D4" Icon={Building2} iconBg="bg-cyan-500/10"   iconColor="#0891B2"/>
            <KPICard label="Active Companies" value={activeCount}       trend="18.2%" isUp period="last month" strokeColor="#10B981" Icon={CheckCircle} iconBg="bg-emerald-500/10" iconColor="#059669"/>
            <KPICard label="Suspended"        value={suspendedCount}    trend="5.0%"  isUp={false} period="last month" strokeColor="#F43F5E" Icon={Ban} iconBg="bg-rose-500/10"    iconColor="#E11D48"/>
            <KPICard label="Trial Accounts"   value={trialCount}        trend="15.7%" isUp period="last month" strokeColor="#8B5CF6" Icon={Clock} iconBg="bg-purple-500/10"  iconColor="#7C3AED"/>
            <KPICard label="Expiring Soon"    value={expiringThisMonth} trend="Action" isUp={false} period="required" strokeColor="#F97316" Icon={AlertTriangle} iconBg="bg-orange-500/10" iconColor="#EA580C"/>
          </div>

          {/* Filter Row */}
          <div className="bg-white dark:bg-[#111C24] p-3 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.03)] border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search active companies by name, email, or code..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-slate-900 dark:text-white text-xs placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <SaSelect
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { label: "All Statuses", value: "all" },
                  { label: "Active Only", value: "active" },
                  { label: "Suspended Only", value: "suspended" },
                  { label: "Inactive Only", value: "inactive" }
                ]}
                buttonClassName="!py-2 !px-3 !rounded-lg !bg-slate-50/70 dark:!bg-slate-900/60 !w-full sm:!w-40 !text-xs !border-slate-200/80 dark:!border-slate-800"
              />
              <SaSelect
                value={planFilter}
                onChange={setPlanFilter}
                options={[
                  { label: "All Plans", value: "all" },
                  { label: "Trial / Free", value: "Trial" },
                  { label: "Pro Plan", value: "Pro" },
                  { label: "Enterprise", value: "Enterprise" }
                ]}
                buttonClassName="!py-2 !px-3 !rounded-lg !bg-slate-50/70 dark:!bg-slate-900/60 !w-full sm:!w-40 !text-xs !border-slate-200/80 dark:!border-slate-800"
              />
            </div>
          </div>

          {/* Active Data Table */}
          {isActiveLoading ? (
            <div className="py-24 text-center bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800">
              <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400 font-semibold text-xs">Loading company records...</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
              <DataTable columns={activeColumns} data={filteredActiveCompanies} pagination={{ total: filteredActiveCompanies.length }} />
            </div>
          )}
        </div>
      )}

      {/* TRASH / DELETED TAB CONTENT */}
      {activeTab === "trash" && (
        <div className="space-y-4">
          {/* Information Banner */}
          <div className="p-4 rounded-xl bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/20 flex items-start gap-3 text-xs">
            <Info size={18} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-slate-900 dark:text-white">
                10-Day Retention Grace Period Policy
              </p>
              <p className="text-slate-600 dark:text-slate-300 text-[11.5px] leading-relaxed">
                Companies listed here have been soft-deleted and removed from the active view. They are kept safely for <b>10 days</b> from deletion before being permanently purged. You can restore any organization with a single click anytime before its grace period ends.
              </p>
            </div>
          </div>

          {/* Search bar for trash */}
          <div className="bg-white dark:bg-[#111C24] p-3 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.03)] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search deleted companies by name, email, code, or reason..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-slate-900 dark:text-white text-xs placeholder-slate-400 focus:outline-none focus:border-rose-500 transition-all"
                value={trashSearchTerm}
                onChange={(e) => setTrashSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Trash Data Table */}
          {isTrashLoading ? (
            <div className="py-24 text-center bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800">
              <div className="animate-spin w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400 font-semibold text-xs">Loading deleted companies...</p>
            </div>
          ) : rawTrashCompanies.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
                <CheckCircle size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Trash is Empty</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">There are no soft-deleted companies in the 10-day retention pool.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
              <DataTable columns={trashColumns} data={filteredTrashCompanies} pagination={{ total: filteredTrashCompanies.length }} />
            </div>
          )}
        </div>
      )}

      {/* Action Dropdown Menu Portal */}
      {activeMenu && (
        <div 
          className="fixed inset-0 z-[9998]" 
          onClick={() => setActiveMenu(null)}
          onContextMenu={(e) => { e.preventDefault(); setActiveMenu(null); }}
        />
      )}
      {activeMenu && (
        <div 
          style={{
            position: "fixed",
            right: `${activeMenu.x}px`,
            ...(activeMenu.openUpward 
              ? { bottom: `${activeMenu.y}px` } 
              : { top: `${activeMenu.y}px` }),
            zIndex: 9999
          }}
          className="w-52 bg-white dark:bg-[#1E293B] rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150 select-none"
        >
          <div className="py-1.5 px-1">
            <button 
              type="button"
              onClick={() => { const id = activeMenu.id; setActiveMenu(null); navigate(`/superadmin/companies/${id}`); }} 
              className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ExternalLink size={14} className="text-slate-400" /> <span>View Details</span>
            </button>
            <button 
              type="button"
              onClick={() => { const comp = activeMenu.row; setActiveMenu(null); setEditingCompany(comp); }} 
              className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Settings size={14} className="text-slate-400" /> <span>Edit Company</span>
            </button>
            <button 
              type="button"
              onClick={() => { setActiveMenu(null); toast("Impersonating admin user..."); }} 
              className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Key size={14} className="text-slate-400" /> <span>Login as Admin</span>
            </button>
          </div>
          <div className="py-1.5 px-1 border-t border-slate-100 dark:border-slate-800">
            <button 
              type="button"
              onClick={() => { const { id, row } = activeMenu; setActiveMenu(null); toggleStatus(id, row.status); }} 
              disabled={statusMutation.isPending}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeMenu.row.status === "active" 
                  ? "text-amber-600 dark:text-amber-400 hover:bg-amber-500/10" 
                  : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
              }`}
            >
              <Ban size={14} /> <span>{activeMenu.row.status === "active" ? "Suspend Company" : "Activate Company"}</span>
            </button>
            <button 
              type="button"
              onClick={() => { 
                const comp = activeMenu.row; 
                setActiveMenu(null); 
                setCompanyToDelete(comp); 
              }} 
              className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <Trash2 size={14} /> <span>Delete Company</span>
            </button>
          </div>
        </div>
      )}

      {/* Edit Company Modal */}
      {editingCompany && (
        <SuperAdminEditCompanyModal
          isOpen={!!editingCompany}
          onClose={() => setEditingCompany(null)}
          company={editingCompany}
        />
      )}

      {/* Soft Delete Company Confirmation Modal */}
      {companyToDelete && (
        <SuperAdminDeleteCompanyModal
          isOpen={!!companyToDelete}
          onClose={() => setCompanyToDelete(null)}
          company={companyToDelete}
        />
      )}
    </div>
  );
};

export default SuperAdminCompanies;
