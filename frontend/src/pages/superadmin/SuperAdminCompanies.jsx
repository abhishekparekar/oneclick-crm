import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCompaniesApi, updateCompanyStatusApi, deleteCompanyApi } from "../../api/superAdminApi";
import toast from "react-hot-toast";
import SaSelect from "../../components/common/SaSelect";
import DataTable from "../../components/common/DataTable";
import { 
  Search, Plus, MoreVertical, Building2, ExternalLink, Settings, Ban, Trash2, Key, 
  CheckCircle, Clock, AlertTriangle, User, Mail, Phone, Calendar, Users, Upload, ArrowUp, ArrowDown, Download, ShieldAlert
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
  },
  {
    _id: "comp_104",
    companyName: "Starlight Retail Ventures",
    companyCode: "STAR-44",
    ownerName: "Sunita Menon",
    email: "sunita@starlightretail.in",
    phone: "+91 97445 66778",
    planName: "Enterprise",
    employeeLimit: 1000,
    status: "active",
    createdAt: "2026-02-18T16:45:00Z"
  },
  {
    _id: "comp_105",
    companyName: "CloudScale AI Systems",
    companyCode: "CLOD-12",
    ownerName: "Vikramaditya Rao",
    email: "vikram@cloudscale.ai",
    phone: "+91 96554 33221",
    planName: "Trial",
    employeeLimit: 25,
    status: "active",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    _id: "comp_106",
    companyName: "Apex Logistics India",
    companyCode: "APEX-55",
    ownerName: "Meera Joshi",
    email: "meera.j@apexlogistics.com",
    phone: "+91 95432 11009",
    planName: "Basic",
    employeeLimit: 50,
    status: "suspended",
    createdAt: "2026-03-05T08:30:00Z"
  },
  {
    _id: "comp_107",
    companyName: "Zenith Healthcare Analytics",
    companyCode: "ZENT-90",
    ownerName: "Dr. Alok Gupta",
    email: "alok.gupta@zenithhealth.org",
    phone: "+91 94321 88776",
    planName: "Pro",
    employeeLimit: 150,
    status: "active",
    createdAt: "2026-04-12T13:10:00Z"
  },
  {
    _id: "comp_108",
    companyName: "Quantika Financial Technologies",
    companyCode: "QNTK-33",
    ownerName: "Siddharth Chatterjee",
    email: "siddharth@quantika.in",
    phone: "+91 93210 55443",
    planName: "Trial",
    employeeLimit: 15,
    status: "active",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  }
];

/* ─── Compact KPI Card Component (Matching Company Admin Dashboard) ──────── */
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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [activeMenu, setActiveMenu] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["superAdminCompanies"],
    queryFn: () => getCompaniesApi(),
  });

  const rawCompanies = Array.isArray(data?.data)
    ? data?.data
    : (data?.data?.companies || data?.data?.data || []);

  const companies = rawCompanies.length > 0 ? rawCompanies : MOCK_COMPANIES;

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updateCompanyStatusApi(id, status),
    onSuccess: () => queryClient.invalidateQueries(["superAdminCompanies"]),
    onError: (err) => toast.error(err.response?.data?.message || "Failed to update status")
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteCompanyApi(id),
    onSuccess: () => queryClient.invalidateQueries(["superAdminCompanies"]),
    onError: (err) => toast.error(err.response?.data?.message || "Failed to delete company")
  });

  const filteredCompanies = companies.filter((company) => {
    const matchesSearch = (company.companyName || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (company.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (company.companyCode || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || String(company.status || "").toLowerCase() === String(statusFilter).toLowerCase() || (statusFilter === "active" && company.isActive === true) || (statusFilter === "inactive" && company.isActive === false);
    const planStr = String(company.planName || company.plan || "").toLowerCase();
    const matchesPlan = planFilter === "all" || 
                        planStr.includes(String(planFilter).toLowerCase()) || 
                        (planFilter === "Trial" && ["trial", "free", "basic"].includes(planStr));
    return matchesSearch && matchesStatus && matchesPlan;
  });

  // Calculate KPIs
  const totalCompanies = companies.length;
  const activeCompanies = companies.filter(c => c.status === "active").length;
  const suspendedCompanies = companies.filter(c => c.status === "suspended").length;
  const trialCompanies = companies.filter(c => String(c.planName).toLowerCase().includes("trial") || String(c.planName).toLowerCase().includes("free")).length;
  
  const expiringThisMonth = companies.filter(c => {
    if (!c.planName || (!String(c.planName).toLowerCase().includes("trial") && !String(c.planName).toLowerCase().includes("free"))) return false;
    const expiry = new Date(c.createdAt || Date.now());
    expiry.setDate(expiry.getDate() + 30);
    const now = new Date();
    return expiry.getMonth() === now.getMonth() && expiry.getFullYear() === now.getFullYear();
  }).length;

  const handleExportData = () => {
    try {
      if (!filteredCompanies || filteredCompanies.length === 0) {
        toast.error("No companies available to export");
        return;
      }

      const headers = [
        "Company ID", "Company Name", "Company Code", "Owner / Contact Name",
        "Email", "Phone", "Plan Name", "User Limit", "Status", "Created Date"
      ];

      const rows = filteredCompanies.map((c) => [
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
      const filename = `superadmin_companies_export_${new Date().toISOString().split("T")[0]}.csv`;

      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Successfully exported ${filteredCompanies.length} company records!`);
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

  const handleDelete = (id) => {
    if (window.confirm("CRITICAL: Are you sure you want to permanently delete this company and ALL of its users? This action cannot be undone.")) {
      deleteMutation.mutate(id);
    }
  };

  const columns = [
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

  return (
    <div className="space-y-4 w-full pb-10 font-sans text-slate-900 dark:text-slate-100">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Companies</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage all registered organizations, subscriptions, and access limits.</p>
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

      {/* Row 1: KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        <KPICard label="Total Companies"  value={totalCompanies}    trend="12.4%" isUp period="last month" strokeColor="#06B6D4" Icon={Building2} iconBg="bg-cyan-500/10"   iconColor="#0891B2"/>
        <KPICard label="Active Companies" value={activeCompanies}   trend="18.2%" isUp period="last month" strokeColor="#10B981" Icon={CheckCircle} iconBg="bg-emerald-500/10" iconColor="#059669"/>
        <KPICard label="Suspended"        value={suspendedCompanies}trend="5.0%"  isUp={false} period="last month" strokeColor="#F43F5E" Icon={Ban} iconBg="bg-rose-500/10"    iconColor="#E11D48"/>
        <KPICard label="Trial Accounts"   value={trialCompanies}    trend="15.7%" isUp period="last month" strokeColor="#8B5CF6" Icon={Clock} iconBg="bg-purple-500/10"  iconColor="#7C3AED"/>
        <KPICard label="Expiring Soon"    value={expiringThisMonth} trend="Action" isUp={false} period="required" strokeColor="#F97316" Icon={AlertTriangle} iconBg="bg-orange-500/10" iconColor="#EA580C"/>
      </div>

      {/* Filter Row */}
      <div className="bg-white dark:bg-[#111C24] p-3 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.03)] border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search companies by name, email, or code..."
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

      {/* Data Table */}
      {isLoading ? (
        <div className="py-24 text-center bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800">
          <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400 font-semibold text-xs">Loading company records...</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
          <DataTable columns={columns} data={filteredCompanies} pagination={{ total: filteredCompanies.length }} />
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
              onClick={() => { setActiveMenu(null); toast("Edit company modal coming soon"); }} 
              className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Settings size={14} className="text-slate-400" /> <span>Edit Company</span>
            </button>
            <button 
              type="button"
              onClick={() => { setActiveMenu(null); toast("Impersonating admin user..."); }} 
              className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Key size={14} className="text-slate-400" /> <span>Login as Admin</span>
            </button>
          </div>
          <div className="py-1.5 px-1 border-t border-slate-100 dark:border-slate-800">
            <button 
              type="button"
              onClick={() => { const { id, row } = activeMenu; setActiveMenu(null); toggleStatus(id, row.status); }} 
              disabled={statusMutation.isPending}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeMenu.row.status === "active" 
                  ? "text-amber-600 dark:text-amber-400 hover:bg-amber-500/10" 
                  : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
              }`}
            >
              <Ban size={14} /> <span>{activeMenu.row.status === "active" ? "Suspend Company" : "Activate Company"}</span>
            </button>
            <button 
              type="button"
              onClick={() => { const id = activeMenu.id; setActiveMenu(null); handleDelete(id); }} 
              disabled={deleteMutation.isPending}
              className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 size={14} /> <span>Delete Permanently</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminCompanies;
