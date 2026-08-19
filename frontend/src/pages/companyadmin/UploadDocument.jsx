import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getEmployeesApi, uploadEmployeeDocumentApi } from "../../api/companyAdminApi";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import {
  FileUp, User, Tag, UploadCloud, CheckCircle2,
  ChevronDown, X, FileText, Image, File, Sparkles,
  ArrowUp, ArrowDown, ShieldCheck, FolderUp, Check
} from "lucide-react";
import toast from "react-hot-toast";

const DOCUMENT_CATEGORIES = [
  { label: "Offer Letter",        value: "Offer Letter",        icon: "📄" },
  { label: "Joining Letter",      value: "Joining Letter",      icon: "📋" },
  { label: "Aadhaar Card",        value: "Aadhaar Card",        icon: "🪪" },
  { label: "PAN Card",            value: "PAN Card",            icon: "💳" },
  { label: "Resume",              value: "Resume",              icon: "📝" },
  { label: "Previous Salary Slip",value: "Previous Salary Slip",icon: "💰" },
  { label: "Other (Custom)",      value: "Other",               icon: "✏️" },
];

// ── Top KPI Stat Card ──────────────────────────────────────────────────────────
const KPICard = ({ label, value, trend, isUp, period, strokeColor, Icon, iconBg, iconColor }) => {
  const sparkData = useMemo(() => [
    { v: 12 }, { v: 22 }, { v: 18 }, { v: 28 }, { v: 24 }, { v: 34 }, { v: 30 }, { v: 42 },
  ], []);

  return (
    <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 px-4 py-3.5 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] transition-all duration-300 group">
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${iconBg} flex-shrink-0 shadow-xs`}>
            <Icon size={13} style={{ color: iconColor }} strokeWidth={2.4} />
          </div>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">{label}</span>
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight leading-tight mb-1 truncate">{value}</h3>
        <div className="flex items-center gap-1 text-[11px]">
          <span className={`inline-flex items-center font-medium ${isUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
            {isUp ? <ArrowUp size={10} strokeWidth={2.5}/> : <ArrowDown size={10} strokeWidth={2.5}/>}
            {trend}
          </span>
          <span className="text-slate-400 text-[9.5px] truncate">vs {period}</span>
        </div>
      </div>
      <div className="hidden sm:block h-10 w-16 opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={40}>
          <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`sk-[#E65100]-doc-${label.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.35}/>
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={strokeColor} strokeWidth={2.2} fill={`url(#sk-[#E65100]-doc-${label.replace(/\s+/g, '')})`}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ── Mini custom select ─────────────────────────────────────────────────────────
const CustomSelect = ({ value, onChange, options, placeholder, disabled }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <div className="relative">
      {open && <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border rounded-xl text-xs font-bold cursor-pointer transition-all ${
          open
            ? "border-amber-500 ring-2 ring-amber-500/20 text-slate-900 dark:text-white"
            : value
            ? "border-amber-500/50 text-slate-900 dark:text-white shadow-2xs"
            : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-amber-500/40"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <span className="flex items-center gap-2 truncate">
          {selected?.icon && <span>{selected.icon}</span>}
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={14} className={`flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180 text-amber-500" : "text-slate-400"}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-30 w-full bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden">
          <div className="py-1 max-h-56 overflow-y-auto custom-scrollbar">
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              className={`w-full text-left px-3.5 py-2 text-xs font-bold transition-colors ${!value ? "bg-amber-500 text-slate-950 font-extrabold" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
            >
              {placeholder}
            </button>
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={`w-full text-left px-3.5 py-2 text-xs font-bold flex items-center gap-2 transition-colors ${
                  value === o.value
                    ? "bg-amber-500 text-slate-950 font-extrabold"
                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <span>{o.icon}</span>{o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const UploadDocument = () => {
  const [employeeId, setEmployeeId] = useState("");
  const [category,   setCategory]   = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [file, setFile]             = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); };
  const handleDragOver  = (e) => e.preventDefault();
  const handleDragEnter = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop      = (e) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
  };

  const { data: empRes, isLoading: isEmpLoading } = useQuery({
    queryKey: ["employeesList"],
    queryFn: () => getEmployeesApi({ limit: 1000 }),
  });
  const employees = useMemo(() => empRes?.data?.employees || [], [empRes]);

  const employeeOptions = employees.map((emp) => ({
    value: emp._id,
    label: `${emp.user?.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim()} (${emp.employeeCode})`,
    icon: "👤",
  }));

  const uploadMutation = useMutation({
    mutationFn: (formData) => uploadEmployeeDocumentApi(employeeId, formData),
    onSuccess: () => {
      toast.success("Document uploaded successfully!");
      setEmployeeId(""); setCategory(""); setCustomCategory(""); setFile(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to upload document"),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!employeeId)  return toast.error("Please select an employee.");
    if (!category)    return toast.error("Please select a document category.");
    if (category === "Other" && !customCategory.trim()) return toast.error("Please enter a custom category name.");
    if (!file)        return toast.error("Please select a file to upload.");
    const finalCategory = category === "Other" ? customCategory.trim() : category;
    const fd = new FormData();
    fd.append("documentType", finalCategory);
    fd.append("file", file);
    uploadMutation.mutate(fd);
  };

  const isComplete = employeeId && category && (category !== "Other" || customCategory.trim()) && file;

  return (
    <div className="space-y-4 pb-12 font-sans text-slate-900 dark:text-slate-100">

      {/* ── Page Header Banner ── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pt-1 pb-1">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            Upload Employee Document <FileUp size={20} className="text-amber-500" />
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Attach official identity cards, offer letters, resumes, and salary slips directly to employee profiles.
          </p>
        </div>
      </div>

      {/* ── Top 4 Compact KPI Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3.5">
        <KPICard label="Total Uploaded Docs" value="128 Files" trend="12.5%" isUp period="last month" strokeColor="#06B6D4" Icon={FileText} iconBg="bg-cyan-500/10" iconColor="#0891B2" />
        <KPICard label="Aadhaar & Identity" value="48 Uploaded" trend="9.4%" isUp period="last month" strokeColor="#10B981" Icon={ShieldCheck} iconBg="bg-emerald-500/10" iconColor="#059669" />
        <KPICard label="Offer & Joining Letters" value="36 Files" trend="15.2%" isUp period="last month" strokeColor="#8B5CF6" Icon={FolderUp} iconBg="bg-purple-500/10" iconColor="#7C3AED" />
        <KPICard label="Recent Uploads" value="14 Today" trend="8.0%" isUp period="last 24 hours" strokeColor="#EAB308" Icon={UploadCloud} iconBg="bg-amber-500/10" iconColor="#D97706" />
      </div>

      {/* ── Form Card ── */}
      <div className="max-w-2xl mx-auto bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] overflow-hidden">
        <form onSubmit={handleSubmit} className="divide-y divide-slate-100 dark:divide-slate-800/80">

          {/* Step 1 — Employee */}
          <div className="p-5 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-xs font-black flex items-center justify-center">1</div>
              <label className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">Select Target Employee *</label>
            </div>
            <CustomSelect
              value={employeeId}
              onChange={setEmployeeId}
              options={employeeOptions}
              placeholder={isEmpLoading ? "Loading employees…" : "— Choose an Employee —"}
              disabled={isEmpLoading}
            />
          </div>

          {/* Step 2 — Category */}
          <div className="p-5 space-y-2">
            <div className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full text-xs font-black flex items-center justify-center ${employeeId ? "bg-amber-500 text-slate-950" : "bg-slate-200 dark:bg-slate-800 text-slate-500"}`}>2</div>
              <label className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">Document Category *</label>
            </div>
            <CustomSelect
              value={category}
              onChange={setCategory}
              options={DOCUMENT_CATEGORIES}
              placeholder="— Choose a Category —"
            />
            {category === "Other" && (
              <div className="pt-2">
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Enter custom category name…"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            )}
          </div>

          {/* Step 3 — Dropzone */}
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded-full text-xs font-black flex items-center justify-center ${category ? "bg-amber-500 text-slate-950" : "bg-slate-200 dark:bg-slate-800 text-slate-500"}`}>3</div>
                <label className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">File Upload *</label>
              </div>
              {file && (
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-xs font-bold text-rose-500 hover:underline flex items-center gap-1"
                >
                  <X size={13} /> Remove
                </button>
              )}
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-200 ${
                isDragging
                  ? "border-amber-500 bg-amber-500/10 scale-[0.99]"
                  : file
                  ? "border-amber-500/60 bg-amber-500/5"
                  : "border-slate-200 dark:border-slate-800 hover:border-amber-500/50 bg-slate-50/50 dark:bg-slate-900/40"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="sr-only"
                onChange={handleFileChange}
                onClick={(e) => e.stopPropagation()}
              />

              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                    <FileText size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-extrabold text-slate-900 dark:text-white">{file.name}</p>
                    <p className="text-[11px] text-slate-400 font-medium">{formatBytes(file.size)}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <UploadCloud size={32} className="mx-auto text-amber-500" />
                  <p className="text-xs font-extrabold text-slate-800 dark:text-white">Click or Drag & Drop File</p>
                  <p className="text-[11px] text-slate-400 font-medium">Supports PDF, PNG, JPG up to 10MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Submit Action */}
          <div className="p-5 bg-slate-50/50 dark:bg-slate-900/50">
            <button
              type="submit"
              disabled={uploadMutation.isPending || !isComplete}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-extrabold rounded-xl text-xs shadow-sm transition-all flex items-center justify-center space-x-1.5"
            >
              {uploadMutation.isPending ? (
                <span>Uploading...</span>
              ) : (
                <>
                  <Check size={15} strokeWidth={2.5} />
                  <span>Upload Document</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>

    </div>
  );
};

export default UploadDocument;
