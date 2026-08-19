import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getEmployeesApi, uploadEmployeeDocumentApi } from "../../api/companyAdminApi";
import { Link } from "react-router-dom";
import {
  FileUp, User, Tag, UploadCloud, CheckCircle2,
  ChevronDown, X, FileText, Image as ImageIcon, File, Sparkles,
  ArrowUp, ArrowDown, ShieldCheck, FolderUp, Check, Search,
  Filter, Eye, Download, ExternalLink, RefreshCw, AlertCircle,
  Building2, Briefcase, Plus, FolderCheck, CreditCard, Award,
  Clock, ArrowRight, UserCheck
} from "lucide-react";
import toast from "react-hot-toast";

// ── Document Category Definitions ─────────────────────────────────────────────
const DOCUMENT_CATEGORIES = [
  { label: "Offer Letter",          value: "Offer Letter",          icon: "📄", color: "text-blue-500",   bg: "bg-blue-500/10",   border: "border-blue-500/20" },
  { label: "Joining Letter",        value: "Joining Letter",        icon: "📋", color: "text-indigo-500", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
  { label: "Aadhaar Card",          value: "Aadhaar Card",          icon: "🪪", color: "text-emerald-500",bg: "bg-emerald-500/10",border: "border-emerald-500/20" },
  { label: "PAN Card",              value: "PAN Card",              icon: "💳", color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20" },
  { label: "Resume / CV",           value: "Resume",                icon: "📝", color: "text-amber-500",  bg: "bg-amber-500/10",  border: "border-amber-500/20" },
  { label: "Previous Salary Slip",  value: "Previous Salary Slip",  icon: "💰", color: "text-teal-500",   bg: "bg-teal-500/10",   border: "border-teal-500/20" },
  { label: "Other / Custom Proof",  value: "Other",                 icon: "✨", color: "text-rose-500",   bg: "bg-rose-500/10",   border: "border-rose-500/20" },
];

const STANDARD_DOC_FIELDS = [
  { key: "aadhaarFront",       title: "Aadhaar Card (Front/Main)", icon: "🪪", category: "Identity" },
  { key: "aadhaarBack",        title: "Aadhaar Card (Back)",       icon: "🪪", category: "Identity" },
  { key: "panCard",            title: "PAN Card",                  icon: "💳", category: "Identity" },
  { key: "offerLetter",        title: "Offer Letter",              icon: "📄", category: "Contract" },
  { key: "joiningLetter",      title: "Joining Letter",            icon: "📋", category: "Contract" },
  { key: "resume",             title: "Resume / CV",               icon: "📝", category: "Career" },
  { key: "salarySlipPrevious", title: "Previous Salary Slip",      icon: "💰", category: "Finance" },
];

// ── Avatar styling ────────────────────────────────────────────────────────────
const AVATAR_BG = [
  "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
];
const getAvatarClass = (name) => AVATAR_BG[(name?.charCodeAt(0) || 0) % AVATAR_BG.length];

const getSafeUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed;
  }
  const base = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/+api$/, "").replace(/\/+$/, "");
  return `${base}/${trimmed.replace(/^\/+/, "")}`;
};

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

// ── Real-Time KPI Stat Card ───────────────────────────────────────────────────
const RealTimeKPICard = ({ label, value, subtext, Icon, iconBg, iconColor, progress }) => {
  return (
    <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs hover:shadow-md transition-all duration-300 group">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            {label}
          </span>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-0.5">
            {value}
          </h3>
        </div>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg} flex-shrink-0 shadow-xs group-hover:scale-105 transition-transform`}>
          <Icon size={18} style={{ color: iconColor }} strokeWidth={2.4} />
        </div>
      </div>

      {progress !== undefined && (
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%`, backgroundColor: iconColor }}
          />
        </div>
      )}

      <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 truncate">
        {subtext}
      </p>
    </div>
  );
};

const UploadDocument = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("upload"); // "upload" | "vault"
  const [employeeId, setEmployeeId] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [searchEmployeeQuery, setSearchEmployeeQuery] = useState("");
  const [vaultSearchQuery, setVaultSearchQuery] = useState("");
  const [vaultFilterCategory, setVaultFilterCategory] = useState("all");
  const [isEmpDropdownOpen, setIsEmpDropdownOpen] = useState(false);
  const fileInputRef = useRef(null);

  // ── Fetch Real-time Employees from Database ─────────────────────────────────
  const { data: empRes, isLoading: isEmpLoading, refetch } = useQuery({
    queryKey: ["employeesList"],
    queryFn: () => getEmployeesApi({ limit: 1000 }),
  });

  const employees = useMemo(() => empRes?.data?.employees || [], [empRes]);

  // Selected Employee object
  const selectedEmployee = useMemo(() => {
    return employees.find((e) => e._id === employeeId) || null;
  }, [employees, employeeId]);

  // ── Flatten All Real Documents in Database ──────────────────────────────────
  const allVaultDocuments = useMemo(() => {
    const docs = [];
    employees.forEach((emp) => {
      const empName = emp.user?.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Unknown Employee";
      const empCode = emp.employeeCode || "—";
      const empDept = emp.departmentId?.name || emp.department?.name || "General";
      const empRole = emp.role || emp.designationId?.name || "Staff";
      const empPhoto = emp.photo || emp.user?.profileImage;

      // Standard docs
      if (emp.documents) {
        STANDARD_DOC_FIELDS.forEach((std) => {
          const docUrl = emp.documents[std.key];
          if (docUrl && typeof docUrl === "string" && docUrl.trim()) {
            docs.push({
              id: `${emp._id}-${std.key}`,
              employeeId: emp._id,
              employeeName: empName,
              employeeCode: empCode,
              employeeDept: empDept,
              employeeRole: empRole,
              employeePhoto: empPhoto,
              title: std.title,
              category: std.category,
              icon: std.icon,
              url: docUrl,
              isCustom: false,
              uploadedAt: emp.updatedAt || emp.createdAt || null,
            });
          }
        });

        // Custom docs
        if (Array.isArray(emp.documents.customDocuments)) {
          emp.documents.customDocuments.forEach((cd, idx) => {
            if (cd && cd.url) {
              docs.push({
                id: `${emp._id}-custom-${idx}`,
                employeeId: emp._id,
                employeeName: empName,
                employeeCode: empCode,
                employeeDept: empDept,
                employeeRole: empRole,
                employeePhoto: empPhoto,
                title: cd.title || "Custom Document",
                category: "Custom",
                icon: "✨",
                url: cd.url,
                isCustom: true,
                uploadedBy: cd.uploadedBy || "Admin",
                uploadedAt: cd.uploadedAt || null,
              });
            }
          });
        }
      }
    });
    return docs;
  }, [employees]);

  // ── Real-time Database Metrics ──────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalDocs = allVaultDocuments.length;
    const totalEmployees = employees.length;
    const identityDocs = allVaultDocuments.filter((d) => d.category === "Identity").length;
    const contractDocs = allVaultDocuments.filter((d) => d.category === "Contract").length;
    const employeesWithDocs = employees.filter((emp) => {
      const hasStd = emp.documents && Object.keys(emp.documents).some((k) => k !== "customDocuments" && Boolean(emp.documents[k]));
      const hasCust = emp.documents?.customDocuments?.length > 0;
      return hasStd || hasCust;
    }).length;

    const complianceRate = totalEmployees > 0 ? Math.round((employeesWithDocs / totalEmployees) * 100) : 0;

    return {
      totalDocs,
      totalEmployees,
      identityDocs,
      contractDocs,
      employeesWithDocs,
      complianceRate,
    };
  }, [allVaultDocuments, employees]);

  // Filtered employees for dropdown
  const filteredEmployees = useMemo(() => {
    if (!searchEmployeeQuery.trim()) return employees;
    const q = searchEmployeeQuery.toLowerCase();
    return employees.filter((e) => {
      const name = `${e.firstName || ""} ${e.lastName || ""} ${e.user?.name || ""}`.toLowerCase();
      const code = (e.employeeCode || "").toLowerCase();
      const dept = (e.departmentId?.name || e.department?.name || "").toLowerCase();
      return name.includes(q) || code.includes(q) || dept.includes(q);
    });
  }, [employees, searchEmployeeQuery]);

  // Filtered Vault Documents
  const filteredVaultDocs = useMemo(() => {
    return allVaultDocuments.filter((d) => {
      const matchesSearch =
        vaultSearchQuery.trim() === "" ||
        d.employeeName.toLowerCase().includes(vaultSearchQuery.toLowerCase()) ||
        d.employeeCode.toLowerCase().includes(vaultSearchQuery.toLowerCase()) ||
        d.title.toLowerCase().includes(vaultSearchQuery.toLowerCase()) ||
        d.employeeDept.toLowerCase().includes(vaultSearchQuery.toLowerCase());

      const matchesCat =
        vaultFilterCategory === "all" ||
        (vaultFilterCategory === "identity" && d.category === "Identity") ||
        (vaultFilterCategory === "contract" && d.category === "Contract") ||
        (vaultFilterCategory === "career" && d.category === "Career") ||
        (vaultFilterCategory === "finance" && d.category === "Finance") ||
        (vaultFilterCategory === "custom" && d.category === "Custom");

      return matchesSearch && matchesCat;
    });
  }, [allVaultDocuments, vaultSearchQuery, vaultFilterCategory]);

  // ── Drag & Drop Handlers ────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };
  const handleDragOver = (e) => e.preventDefault();
  const handleDragEnter = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
  };

  // ── Upload Mutation ─────────────────────────────────────────────────────────
  const uploadMutation = useMutation({
    mutationFn: (formData) => uploadEmployeeDocumentApi(employeeId, formData),
    onSuccess: () => {
      toast.success("Document uploaded & saved to database successfully!");
      queryClient.invalidateQueries({ queryKey: ["employeesList"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setCategory("");
      setCustomCategory("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to upload document");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!employeeId) return toast.error("Please select a target employee.");
    if (!category) return toast.error("Please select a document category.");
    if (category === "Other" && !customCategory.trim()) return toast.error("Please enter a custom document title.");
    if (!file) return toast.error("Please select a file to upload.");

    const finalCategory = category === "Other" ? customCategory.trim() : category;
    const fd = new FormData();
    fd.append("title", finalCategory);
    fd.append("documentType", finalCategory);
    fd.append("file", file);
    uploadMutation.mutate(fd);
  };

  const isFormComplete = employeeId && category && (category !== "Other" || customCategory.trim()) && file;

  return (
    <div className="space-y-3 sm:space-y-4 pb-6 font-sans text-slate-900 dark:text-slate-100 max-w-[1440px] mx-auto">
      
      {/* ── Header Bar (100% Responsive for Mobile & Desktop) ──────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 shadow-2xs">
            <FileUp size={22} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2 truncate">
              Employee Document Vault
            </h1>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
              Official document storage, KYC verification & real-time compliance tracker
            </p>
          </div>
        </div>

        {/* View Toggle Tabs (Scrollable on Mobile) */}
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1 sm:pb-0 shrink-0">
          <button
            onClick={() => setActiveTab("upload")}
            className={`px-3 sm:px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "upload"
                ? "bg-amber-500 text-slate-950 shadow-xs shadow-amber-500/20"
                : "bg-white dark:bg-[#111C24] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-amber-500/40"
            }`}
          >
            <FolderUp size={15} />
            <span>Upload Document</span>
          </button>

          <button
            onClick={() => setActiveTab("vault")}
            className={`px-3 sm:px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "vault"
                ? "bg-amber-500 text-slate-950 shadow-xs shadow-amber-500/20"
                : "bg-white dark:bg-[#111C24] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-amber-500/40"
            }`}
          >
            <FolderCheck size={15} />
            <span>Document Vault ({stats.totalDocs})</span>
          </button>

          <button
            onClick={() => refetch()}
            title="Refresh database records"
            className="p-2 rounded-xl bg-white dark:bg-[#111C24] text-slate-500 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 transition-all cursor-pointer shrink-0"
          >
            <RefreshCw size={15} className={isEmpLoading ? "animate-spin text-amber-500" : ""} />
          </button>
        </div>
      </div>

      {/* ── Real-Time Metrics (Responsive 2-col on Mobile, 4-col on Desktop) ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        <RealTimeKPICard
          label="Uploaded Docs"
          value={`${stats.totalDocs} Files`}
          subtext={`Across ${stats.totalEmployees} employees`}
          Icon={FileText}
          iconBg="bg-blue-500/10"
          iconColor="#3B82F6"
          progress={stats.totalEmployees > 0 ? (stats.totalDocs / (stats.totalEmployees * 4)) * 100 : 0}
        />
        <RealTimeKPICard
          label="Identity & KYC"
          value={`${stats.identityDocs} Verified`}
          subtext="Aadhaar & PAN cards"
          Icon={ShieldCheck}
          iconBg="bg-emerald-500/10"
          iconColor="#10B981"
          progress={stats.totalEmployees > 0 ? (stats.identityDocs / (stats.totalEmployees * 2)) * 100 : 0}
        />
        <RealTimeKPICard
          label="Contracts & Offers"
          value={`${stats.contractDocs} Issued`}
          subtext="Agreements on file"
          Icon={Award}
          iconBg="bg-purple-500/10"
          iconColor="#8B5CF6"
          progress={stats.totalEmployees > 0 ? (stats.contractDocs / stats.totalEmployees) * 100 : 0}
        />
        <RealTimeKPICard
          label="Compliance Rate"
          value={`${stats.complianceRate}%`}
          subtext={`${stats.employeesWithDocs}/${stats.totalEmployees} employees have files`}
          Icon={UserCheck}
          iconBg="bg-amber-500/10"
          iconColor="#F59E0B"
          progress={stats.complianceRate}
        />
      </div>

      {/* ── MAIN CONTENT AREA ───────────────────────────────────────────────── */}
      {activeTab === "upload" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          
          {/* ── Left Column: Upload Wizard Form ──────────────────────────────── */}
          <div className="lg:col-span-7 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <UploadCloud size={16} className="text-amber-500" />
                Attach New Document
              </h2>
              <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">
                Cloud Sync
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              
              {/* Step 1: Select Employee */}
              <div className="space-y-1.5">
                <label className="flex items-center justify-between text-[11px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black flex items-center justify-center">1</span>
                    Target Employee <span className="text-rose-500">*</span>
                  </span>
                  {selectedEmployee && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 size={11} /> Selected
                    </span>
                  )}
                </label>

                {/* Searchable Dropdown */}
                <div className="relative">
                  <div
                    onClick={() => setIsEmpDropdownOpen(!isEmpDropdownOpen)}
                    className={`w-full flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/80 border rounded-xl cursor-pointer transition-all ${
                      isEmpDropdownOpen
                        ? "border-amber-500 ring-2 ring-amber-500/20"
                        : selectedEmployee
                        ? "border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/5"
                        : "border-slate-200 dark:border-slate-700 hover:border-amber-500/40"
                    }`}
                  >
                    {selectedEmployee ? (
                      <div className="flex items-center gap-2.5 min-w-0">
                        {selectedEmployee.photo ? (
                          <img
                            src={getSafeUrl(selectedEmployee.photo)}
                            alt=""
                            className="w-7 h-7 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                        ) : (
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${getAvatarClass(selectedEmployee.firstName)}`}>
                            {selectedEmployee.firstName?.[0]}
                          </div>
                        )}
                        <div className="truncate">
                          <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                            {selectedEmployee.firstName} {selectedEmployee.lastName}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400">
                            {selectedEmployee.employeeCode} • {selectedEmployee.departmentId?.name || "General"}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-slate-400">
                        {isEmpLoading ? "Loading employees..." : "— Search & Select an Employee —"}
                      </span>
                    )}
                    <ChevronDown size={15} className={`text-slate-400 transition-transform ${isEmpDropdownOpen ? "rotate-180 text-amber-500" : ""}`} />
                  </div>

                  {/* Dropdown Menu */}
                  {isEmpDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setIsEmpDropdownOpen(false)} />
                      <div className="absolute left-0 top-[calc(100%+4px)] z-40 w-full bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden p-2 space-y-1.5">
                        <div className="relative">
                          <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Search by name, code..."
                            value={searchEmployeeQuery}
                            onChange={(e) => setSearchEmployeeQuery(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                          {filteredEmployees.length === 0 ? (
                            <div className="p-3 text-center text-xs text-slate-400 font-bold">
                              No employees found
                            </div>
                          ) : (
                            filteredEmployees.map((emp) => {
                              const isSelected = emp._id === employeeId;
                              const docCount = (emp.documents ? Object.keys(emp.documents).filter(k => k !== 'customDocuments' && Boolean(emp.documents[k])).length : 0) + (emp.documents?.customDocuments?.length || 0);

                              return (
                                <button
                                  key={emp._id}
                                  type="button"
                                  onClick={() => {
                                    setEmployeeId(emp._id);
                                    setIsEmpDropdownOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all ${
                                    isSelected
                                      ? "bg-amber-500 text-slate-950 font-extrabold"
                                      : "hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${isSelected ? "bg-slate-950 text-amber-400" : getAvatarClass(emp.firstName)}`}>
                                      {emp.firstName?.[0]}
                                    </div>
                                    <div className="truncate">
                                      <p className="text-xs font-bold truncate">
                                        {emp.firstName} {emp.lastName}
                                      </p>
                                      <p className={`text-[9.5px] truncate ${isSelected ? "text-slate-800" : "text-slate-400"}`}>
                                        {emp.employeeCode} • {emp.departmentId?.name || "General"}
                                      </p>
                                    </div>
                                  </div>

                                  <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full ${isSelected ? "bg-slate-950/20 text-slate-950" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"}`}>
                                    {docCount} docs
                                  </span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Step 2: Document Category */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  <span className={`w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center ${employeeId ? "bg-amber-500 text-slate-950" : "bg-slate-200 dark:bg-slate-800 text-slate-500"}`}>2</span>
                  Document Category <span className="text-rose-500">*</span>
                </label>

                {/* Category Grid Badges (Compact) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                  {DOCUMENT_CATEGORIES.map((cat) => {
                    const isSelected = category === cat.value;
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setCategory(cat.value)}
                        className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? "border-amber-500 bg-amber-500/10 text-slate-900 dark:text-white ring-1 ring-amber-500/50 shadow-2xs font-extrabold"
                            : "border-slate-200 dark:border-slate-800 hover:border-amber-500/40 bg-slate-50/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 font-bold"
                        }`}
                      >
                        <span className="text-sm">{cat.icon}</span>
                        <span className="text-xs truncate">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>

                {category === "Other" && (
                  <div className="pt-1">
                    <input
                      type="text"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="Enter custom document title..."
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-amber-500/50 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                )}
              </div>

              {/* Step 3: Compact Drag & Drop Upload Zone */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    <span className={`w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center ${category ? "bg-amber-500 text-slate-950" : "bg-slate-200 dark:bg-slate-800 text-slate-500"}`}>3</span>
                    Upload File <span className="text-rose-500">*</span>
                  </label>
                  {file && (
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="text-[11px] font-bold text-rose-500 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <X size={12} /> Remove
                    </button>
                  )}
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`rounded-2xl border-2 border-dashed p-4 text-center cursor-pointer transition-all duration-200 ${
                    isDragging
                      ? "border-amber-500 bg-amber-500/10 scale-[0.99]"
                      : file
                      ? "border-emerald-500/60 bg-emerald-500/5 dark:bg-emerald-500/5"
                      : "border-slate-200 dark:border-slate-800 hover:border-amber-500/50 bg-slate-50/50 dark:bg-slate-900/40"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="sr-only"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    onChange={handleFileChange}
                    onClick={(e) => e.stopPropagation()}
                  />

                  {file ? (
                    <div className="flex items-center justify-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold shrink-0">
                        <Check size={16} />
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate max-w-xs">
                          {file.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-semibold">
                          {formatBytes(file.size)} • Ready to upload
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                        <UploadCloud size={16} strokeWidth={2.2} />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-slate-800 dark:text-white">
                          Choose a file or drag & drop here
                        </p>
                        <p className="text-[10px] text-slate-400 font-semibold">
                          PDF, PNG, JPG, or DOC (Max: 10MB)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={uploadMutation.isPending || !isFormComplete}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-extrabold rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
              >
                {uploadMutation.isPending ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Uploading & Saving...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} strokeWidth={2.5} />
                    <span>Confirm & Upload Document</span>
                  </>
                )}
              </button>

            </form>
          </div>

          {/* ── Right Column: Selected Employee Vault Live Status ───────────── */}
          <div className="lg:col-span-5 space-y-3">
            {selectedEmployee ? (
              <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-2xs space-y-4">
                
                {/* Employee Profile Preview Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    {selectedEmployee.photo ? (
                      <img
                        src={getSafeUrl(selectedEmployee.photo)}
                        alt=""
                        className="w-11 h-11 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
                      />
                    ) : (
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-extrabold ${getAvatarClass(selectedEmployee.firstName)}`}>
                        {selectedEmployee.firstName?.[0]}{selectedEmployee.lastName?.[0]}
                      </div>
                    )}
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">
                        {selectedEmployee.firstName} {selectedEmployee.lastName}
                      </h3>
                      <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                        {selectedEmployee.employeeCode} • {selectedEmployee.role || "Employee"}
                      </p>
                    </div>
                  </div>

                  <Link
                    to={`${window.location.pathname.startsWith("/hr") ? "/hr" : "/company"}/employees/edit/${selectedEmployee._id}`}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all text-xs font-bold flex items-center gap-1"
                    title="Open Full 7-Step Employee Editor"
                  >
                    <ExternalLink size={13} />
                  </Link>
                </div>

                {/* Real-time Checklist of Documents */}
                <div>
                  <h4 className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5">
                    Live Document Checklist (Database)
                  </h4>

                  <div className="space-y-2">
                    {STANDARD_DOC_FIELDS.map((doc) => {
                      const docUrl = selectedEmployee.documents?.[doc.key];
                      const isUploaded = Boolean(docUrl && typeof docUrl === "string" && docUrl.trim());
                      const cleanUrl = getSafeUrl(docUrl);

                      return (
                        <div
                          key={doc.key}
                          className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                            isUploaded
                              ? "bg-emerald-500/5 dark:bg-emerald-500/5 border-emerald-500/20"
                              : "bg-slate-50 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-sm">{doc.icon}</span>
                            <div className="truncate">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {doc.title}
                              </p>
                              <span className={`text-[10px] font-bold ${isUploaded ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
                                {isUploaded ? "Uploaded & Available" : "Missing / Not Uploaded"}
                              </span>
                            </div>
                          </div>

                          {isUploaded ? (
                            <div className="flex items-center gap-1.5">
                              <a
                                href={cleanUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all"
                                title="View Document"
                              >
                                <Eye size={13} />
                              </a>
                              <a
                                href={cleanUrl}
                                download
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 transition-all"
                                title="Download Document"
                              >
                                <Download size={13} />
                              </a>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                if (doc.key === "aadhaarFront" || doc.key === "aadhaarBack") setCategory("Aadhaar Card");
                                else if (doc.key === "panCard") setCategory("PAN Card");
                                else if (doc.key === "offerLetter") setCategory("Offer Letter");
                                else if (doc.key === "joiningLetter") setCategory("Joining Letter");
                                else if (doc.key === "resume") setCategory("Resume");
                                else if (doc.key === "salarySlipPrevious") setCategory("Previous Salary Slip");
                              }}
                              className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold transition-all cursor-pointer"
                            >
                              Upload This
                            </button>
                          )}
                        </div>
                      );
                    })}

                    {/* Custom Docs for selected employee */}
                    {selectedEmployee.documents?.customDocuments?.map((cd, idx) => {
                      const cleanUrl = getSafeUrl(cd.url);
                      return (
                        <div
                          key={`custom-${idx}`}
                          className="p-3 rounded-2xl border bg-purple-500/5 dark:bg-purple-500/5 border-purple-500/20 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-sm">✨</span>
                            <div className="truncate">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {cd.title}
                              </p>
                              <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
                                Custom Proof
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <a
                              href={cleanUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-all"
                              title="View Document"
                            >
                              <Eye size={13} />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            ) : (
              <div className="bg-white dark:bg-[#111C24] border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <User size={22} />
                </div>
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">
                  No Employee Selected
                </h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Pick an employee from step 1 on the left to see their live compliance checklist and existing database files.
                </p>
              </div>
            )}

            {/* Quick Helper Notice */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
              <Sparkles size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                  Automated Cloud Storage & Security
                </h4>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  All documents are securely encrypted and synchronized across the employee profile, HR portal, and company audits in real-time.
                </p>
              </div>
            </div>

          </div>

        </div>
      ) : (
        
        /* ── VAULT TAB: Complete Company-wide Document Directory ─────────────── */
        <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-2xs space-y-5">
          
          {/* Vault Top Controls (Fully Responsive) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <FolderCheck size={18} className="text-amber-500" />
                Real-Time Document Repository
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Showing {filteredVaultDocs.length} real files across the organization
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
              {/* Category Filter Chips (Touch Scrollable on Mobile) */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl overflow-x-auto hide-scrollbar whitespace-nowrap shrink-0">
                {[
                  { id: "all", label: "All" },
                  { id: "identity", label: "Identity (KYC)" },
                  { id: "contract", label: "Contracts" },
                  { id: "career", label: "Resumes" },
                  { id: "finance", label: "Salary Slips" },
                  { id: "custom", label: "Custom" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setVaultFilterCategory(tab.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer shrink-0 ${
                      vaultFilterCategory === tab.id
                        ? "bg-amber-500 text-slate-950 shadow-2xs"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-60 shrink-0">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search vault docs..."
                  value={vaultSearchQuery}
                  onChange={(e) => setVaultSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Vault Documents Display */}
          {filteredVaultDocs.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <FileText size={24} />
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                No Documents Found
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No documents match the current filter or search term. Upload documents using the upload tab.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("upload")}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus size={14} /> Upload New Document
              </button>
            </div>
          ) : (
            <>
              {/* ── Mobile Document Cards Grid (<md Screens) ──────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
                {filteredVaultDocs.map((doc) => {
                  const cleanUrl = getSafeUrl(doc.url);
                  return (
                    <div
                      key={doc.id}
                      className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {doc.employeePhoto ? (
                            <img
                              src={getSafeUrl(doc.employeePhoto)}
                              alt=""
                              className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                            />
                          ) : (
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${getAvatarClass(doc.employeeName)}`}>
                              {doc.employeeName?.[0]}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                              {doc.employeeName}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold truncate">
                              {doc.employeeCode} • {doc.employeeDept}
                            </p>
                          </div>
                        </div>
                        <span className={`text-[9.5px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                          doc.category === "Identity" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" :
                          doc.category === "Contract" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20" :
                          doc.category === "Career" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" :
                          doc.category === "Finance" ? "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20" :
                          "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                        }`}>
                          {doc.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-sm">{doc.icon}</span>
                        <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 truncate">
                          {doc.title}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 size={11} /> Saved
                        </span>
                        <div className="flex items-center gap-1.5">
                          <a
                            href={cleanUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-amber-500 text-xs font-bold flex items-center gap-1 transition-all"
                          >
                            <Eye size={12} /> View
                          </a>
                          <a
                            href={cleanUrl}
                            download
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-500 transition-all"
                            title="Download File"
                          >
                            <Download size={13} />
                          </a>
                          <Link
                            to={`${window.location.pathname.startsWith("/hr") ? "/hr" : "/company"}/employees/edit/${doc.employeeId}`}
                            className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-500 transition-all"
                            title="Edit Employee"
                          >
                            <ExternalLink size={13} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Desktop Document Table (>=md Screens) ────────────────── */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">
                      <th className="pb-3 px-3">Employee</th>
                      <th className="pb-3 px-3">Document Title</th>
                      <th className="pb-3 px-3">Category</th>
                      <th className="pb-3 px-3">Department</th>
                      <th className="pb-3 px-3">Source & Status</th>
                      <th className="pb-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold">
                    {filteredVaultDocs.map((doc) => {
                      const cleanUrl = getSafeUrl(doc.url);
                      return (
                        <tr key={doc.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors">
                          
                          {/* Employee Column */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              {doc.employeePhoto ? (
                                <img
                                  src={getSafeUrl(doc.employeePhoto)}
                                  alt=""
                                  className="w-7 h-7 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                                />
                              ) : (
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${getAvatarClass(doc.employeeName)}`}>
                                  {doc.employeeName?.[0]}
                                </div>
                              )}
                              <div>
                                <p className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight">
                                  {doc.employeeName}
                                </p>
                                <p className="text-[10px] text-slate-400 font-bold">
                                  {doc.employeeCode}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Title Column */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{doc.icon}</span>
                              <span className="font-extrabold text-slate-800 dark:text-slate-100">
                                {doc.title}
                              </span>
                            </div>
                          </td>

                          {/* Category Column */}
                          <td className="py-3 px-3">
                            <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                              doc.category === "Identity" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" :
                              doc.category === "Contract" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20" :
                              doc.category === "Career" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" :
                              doc.category === "Finance" ? "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20" :
                              "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                            }`}>
                              {doc.category}
                            </span>
                          </td>

                          {/* Department Column */}
                          <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                            {doc.employeeDept}
                          </td>

                          {/* Status Column */}
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 size={12} /> Stored in DB
                            </span>
                          </td>

                          {/* Actions Column */}
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <a
                                href={cleanUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                                title="View Document"
                              >
                                <Eye size={14} />
                              </a>
                              <a
                                href={cleanUrl}
                                download
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                                title="Download File"
                              >
                                <Download size={14} />
                              </a>
                              <Link
                                to={`${window.location.pathname.startsWith("/hr") ? "/hr" : "/company"}/employees/edit/${doc.employeeId}`}
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                                title="Edit Employee"
                              >
                                <ExternalLink size={14} />
                              </Link>
                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

        </div>
      )}

    </div>
  );
};

export default UploadDocument;
