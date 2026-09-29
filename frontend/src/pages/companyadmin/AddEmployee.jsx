import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  createEmployeeApi, getDepartmentsApi, getDesignationsApi,
  getBranchesApi, getEmployeesApi, createDepartmentApi,
  createDesignationApi, createBranchApi, getModuleUsageApi,
  getCompanySettingsApi
} from "../../api/companyAdminApi";
import { getManagerDashboardApi } from "../../api/managerApi";
import { useAuth } from "../../context/AuthContext";
import {
  User, Mail, Phone, MapPin, Briefcase, CreditCard, ShieldCheck,
  FileText, Coins, Award, Camera, Save, ArrowLeft, ChevronDown,
  ChevronUp, CheckCircle2, X, Lock, Download, AlertTriangle, RefreshCw,
  Plus, Loader2, Building2, CalendarDays, Upload, Eye, ChevronRight,
  ChevronLeft, CheckCheck, Trash2, ExternalLink, Sparkles, Shield,
  DollarSign, Users, AlertCircle, FileCheck, Calendar, Cpu, Zap, ArrowUpRight,
  Wallet, Percent, Clock
} from "lucide-react";

const ALL_MODULES = [
  { key: "tasks", label: "Tasks Management", desc: "Create, execute and review tasks" },
  { key: "leads", label: "Lead", desc: "Manage leads & WhatsApp campaigns" },
  { key: "attendance", label: "Attendance & Bio-Punch", desc: "Punches, shifts & regularization" },
  { key: "projects", label: "Project Workspace", desc: "Milestones, sprints & task boards" },
];

const getPhotoUrl = (rawPhoto) => {
  if (!rawPhoto || typeof rawPhoto !== "string") return null;
  const trimmed = rawPhoto.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed;
  }
  const base = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/+api$/, "").replace(/\/+$/, "");
  return `${base}/${trimmed.replace(/^\/+/, "")}`;
};

const formatTime12h = (t) => {
  if (!t) return "";
  const parts = t.split(":");
  let h = parseInt(parts[0], 10);
  const m = parts[1] || "00";
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${String(h).padStart(2, "0")}:${m} ${ampm}`;
};

// ── Step Definitions ────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Basic Info", icon: User, desc: "Personal info & avatar" },
  { id: 2, label: "Job Details", icon: Briefcase, desc: "Role & department" },
  { id: 3, label: "Address & Contact", icon: MapPin, desc: "Location & emergency" },
  { id: 4, label: "Salary & Compensation", icon: DollarSign, desc: "CTC, allowances & tax" },
  { id: 5, label: "Bank & Identity", icon: CreditCard, desc: "Banking & PAN/Aadhaar" },
  { id: 6, label: "Document Vault", icon: FileText, desc: "Upload files & proofs" },
  { id: 7, label: "Review & Confirm", icon: CheckCheck, desc: "Verify candidate details" },
];

// ── Shared Field Components (Crystal Clear Contrast & High Density) ────────
const Field = ({ label, required, children, className = "", action, hint, error }) => (
  <div className={`space-y-1.5 ${className}`}>
    <div className="flex items-center justify-between">
      <label className={`block text-[11.5px] font-extrabold uppercase tracking-wider ${error ? "text-rose-500" : "text-slate-700 dark:text-slate-200"}`}>
        {label} {required && <span className="text-rose-500 font-black">*</span>}
      </label>
      {action}
    </div>
    {children}
    {error && (
      <p className="flex items-center gap-1 text-[10.5px] font-bold text-rose-500 animate-pulse">
        <AlertCircle size={11} className="shrink-0" /> {error}
      </p>
    )}
    {!error && hint && <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{hint}</p>}
  </div>
);

const Input = ({ label, type = "text", value, onChange, onBlur, placeholder, disabled = false, required = false, hint, className = "", error, onClearError, maxLength, allowZero = false }) => (
  <Field label={label} required={required} hint={hint} className={className} error={error}>
    <input
      type={type === "email" ? "text" : type === "tel" ? "text" : type}
      inputMode={type === "email" ? "email" : type === "tel" ? "numeric" : type === "number" ? "numeric" : undefined}
      value={(type === "number" && !allowZero && (value === 0 || value === "0")) ? "" : (value ?? "")}
      maxLength={maxLength}
      onChange={(e) => { if (onClearError) onClearError(); onChange(e.target.value); }}
      onBlur={onBlur}
      disabled={disabled}
      placeholder={placeholder || (type === "number" ? "0" : undefined)}
      autoComplete={type === "email" ? "email" : type === "tel" ? "tel" : undefined}
      className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#0B101B] border rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none transition-all ${
        error
          ? "border-rose-400 dark:border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 bg-rose-50/30 dark:bg-rose-900/10"
          : "border-slate-300 dark:border-slate-700/90 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
      } ${
        disabled ? "opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-900" : ""
      }`}
    />
  </Field>
);

const Select = ({ label, value, onChange, options = [], disabled = false, loading = false, required = false, placeholder = "Select...", action, hint, className = "", error, onClearError }) => (
  <Field label={label} required={required} action={action} hint={hint} className={className} error={error}>
    <div className="relative">
      <select
        value={value ?? ""}
        onChange={(e) => { if (onClearError) onClearError(); onChange(e.target.value); }}
        disabled={disabled || loading}
        className={`w-full appearance-none pl-3.5 pr-9 py-2.5 bg-slate-50 dark:bg-[#0B101B] border rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none transition-all cursor-pointer ${
          error
            ? "border-rose-400 dark:border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 bg-rose-50/30 dark:bg-rose-900/10"
            : "border-slate-300 dark:border-slate-700/90 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
        } ${
          disabled || loading ? "opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-900" : ""
        }`}
      >
        <option value="" disabled className="bg-white dark:bg-[#111C24] text-slate-400">
          {loading ? "Loading options..." : placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-white dark:bg-[#111C24] text-slate-900 dark:text-white font-semibold">
            {opt.label}
          </option>
        ))}
      </select>
      {loading ? (
        <Loader2 size={13} className="absolute right-3 top-3 text-amber-500 animate-spin pointer-events-none" />
      ) : (
        <ChevronDown size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
      )}
    </div>
  </Field>
);

const MultiSelect = ({ label, selected = [], onChange, options = [], disabled = false, loading = false, required = false, placeholder = "Select...", action, error, hint, onClearError }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toggle = (val) => {
    if (onClearError) onClearError();
    if (selected.includes(val)) onChange(selected.filter((v) => v !== val));
    else onChange([...selected, val]);
  };

  const selectedOptions = options.filter((o) => selected.includes(o.value));
  const selectedLabels = selectedOptions.map((o) => o.label).join(", ");

  return (
    <Field label={label} required={required} action={action} error={error} hint={hint}>
      <div className="relative" ref={containerRef}>
        <div
          className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#0B101B] border rounded-xl text-xs font-bold text-slate-900 dark:text-white transition-all flex items-center justify-between min-h-[40px] cursor-pointer hover:border-amber-500/60 ${
            error
              ? "border-rose-400 dark:border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 bg-rose-50/30 dark:bg-rose-900/10"
              : "border-slate-300 dark:border-slate-700/90 focus:border-amber-500"
          } ${
            disabled || loading ? "opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-900" : ""
          }`}
          onClick={() => !disabled && !loading && setOpen(!open)}
        >
          <span className="truncate">
            {loading ? (
              <span className="text-amber-500/80 font-medium flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin" /> Loading data...
              </span>
            ) : selected.length ? (
              <span className="flex items-center gap-1.5 flex-wrap">
                {selectedOptions.length <= 2 ? (
                  selectedLabels
                ) : (
                  <span>
                    {selectedOptions.slice(0, 2).map((o) => o.label).join(", ")}
                    <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-black">
                      +{selectedOptions.length - 2} more
                    </span>
                  </span>
                )}
              </span>
            ) : (
              <span className="text-slate-400 font-normal">{placeholder}</span>
            )}
          </span>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {!loading && selected.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] flex items-center justify-center">
                {selected.length}
              </span>
            )}
            {loading ? (
              <Loader2 size={13} className="text-amber-500 animate-spin" />
            ) : (
              <ChevronDown size={14} className="text-slate-400" />
            )}
          </div>
        </div>

        {open && (
          <div className="absolute z-50 w-full mt-1.5 bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-56 overflow-y-auto p-1.5 space-y-1 animate-fadeIn">
            {options.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-500 dark:text-slate-400">No options available</div>
            ) : (
              options.map((opt) => {
                const isSelected = selected.includes(opt.value);
                return (
                  <div
                    key={opt.value}
                    onClick={() => toggle(opt.value)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                      isSelected
                        ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 font-extrabold"
                        : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <CheckCircle2 size={14} className="text-amber-500 shrink-0 ml-2" />}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </Field>
  );
};

const Toggle = ({ label, checked, onChange, description }) => (
  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0D1321] border border-slate-200 dark:border-slate-800">
    <div>
      <p className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight">{label}</p>
      {description && <p className="text-[10px] text-slate-400 font-medium mt-0.5">{description}</p>}
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  </div>
);

export default function AddEmployee() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const avatarInputRef = useRef(null);
  const { user } = useAuth();

  const authCompanyModules = useMemo(() => {
    const raw =
      user?.company?.subscribedModules ??
      user?.subscribedModules ??
      (typeof user?.companyId === "object" && user?.companyId !== null ? user?.companyId?.subscribedModules : null);
    return Array.isArray(raw) && raw.length > 0
      ? raw.map((m) => String(m).toLowerCase().trim())
      : null;
  }, [user]);

  const isHR = window.location.pathname.startsWith("/hr");
  const isManager = window.location.pathname.startsWith("/manager") || (user?.role || "").toLowerCase() === "manager";
  const baseRoute = isHR ? "/hr" : isManager ? "/manager" : "/company";
  const backRoute = isManager ? "/manager/team" : `${baseRoute}/employees`;

  const [activeStep, setActiveStep] = useState(1);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  const clearError = (field) => setFormErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  // Upgrade Plan Popup
  const [upgradePlanModal, setUpgradePlanModal] = useState(null); // { moduleName, label, used, limit }

  // Initial Form State
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    photo: "",
    gender: "male",
    dateOfBirth: "",
    maritalStatus: "single",

    accessibleDepartments: [],
    departmentId: "",
    designationId: "",
    branchId: "",
    branchIds: [],
    reportingManagerId: "",
    role: "Employee",
    managerAccessLevel: "department",
    employmentType: "full_time",
    workMode: "office",
    allowRemotePunch: false,
    isLocationTrackingEnabled: false,
    joiningDate: new Date().toISOString().slice(0, 10),
    confirmationDate: "",
    noticePeriod: "30_days",

    address: {
      street: "",
      city: "",
      state: "",
      pincode: "",
      country: "India",
    },
    permanentAddress: {
      street: "",
      city: "",
      state: "",
      pincode: "",
      country: "India",
      sameAsCurrent: false,
    },
    emergencyContact: {
      name: "",
      relationship: "Parent",
      phone: "",
    },

    salaryDetails: {
      ctc: 0,
      monthlyCtc: 0,
      basic: 0,
      basicSalary: 0,
      hra: 0,
      annualHra: 0,
      conveyance: 0,
      medicalAllowance: 0,
      specialAllowance: 0,
      annualSpecialAllowance: 0,
      otherAllowance: 0,
      overtimeHourlyRate: 0,
      grossSalary: 0,
      annualGross: 0,
      pf: 0,
      pfEmployee: 0,
      pfEmployer: 0,
      annualPfEmployee: 0,
      annualPfEmployer: 0,
      esi: 0,
      esiEmployee: 0,
      esiEmployer: 0,
      professionalTax: 0,
      annualProfessionalTax: 0,
      tds: 0,
      totalDeductions: 0,
      netSalary: 0,
      inHandSalary: 0,
      annualNetSalary: 0,
    },

    bankDetails: {
      bankName: "",
      accountNumber: "",
      ifscCode: "",
      accountType: "savings",
    },
    aadhaarNumber: "",
    panNumber: "",
    documents: [],
    assignedModules: authCompanyModules || [],
  });

  // Quick Create Modal States
  const [quickModal, setQuickModal] = useState(null);
  const [quickForm, setQuickForm] = useState({ name: "", code: "", departmentId: "", city: "" });
  const [quickSaving, setQuickSaving] = useState(false);

  // Salary Configuration States
  const [salaryViewMode, setSalaryViewMode] = useState("monthly"); // "monthly" | "annual"


  // Queries
  const { data: deptRes, isLoading: deptLoading } = useQuery({
    queryKey: ["departments"],
    queryFn: getDepartmentsApi,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const { data: desigRes, isLoading: desigLoading } = useQuery({
    queryKey: ["designations"],
    queryFn: getDesignationsApi,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const { data: branchRes, isLoading: branchLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: getBranchesApi,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const { data: empRes, isLoading: empLoading } = useQuery({
    queryKey: ["allEmployees"],
    queryFn: () => getEmployeesApi({ limit: 1000 }),
    staleTime: 0,
    refetchOnMount: "always",
  });
  const { data: moduleUsageRes, isLoading: moduleUsageLoading } = useQuery({
    queryKey: ["companyModuleUsage"],
    queryFn: () => getModuleUsageApi().then((r) => r.data),
  });

  const { data: settingsRes } = useQuery({
    queryKey: ["companySettings"],
    queryFn: () => getCompanySettingsApi().then((r) => r?.data || r),
    staleTime: 60 * 1000,
  });

  const companySettings = useMemo(() => {
    return (
      settingsRes?.data?.settings ||
      settingsRes?.settings ||
      settingsRes?.data ||
      user?.company?.settings ||
      user?.companySettings ||
      {}
    );
  }, [settingsRes, user]);

  const shiftFullDayHours = useMemo(() => {
    if (companySettings?.fullDayHours) return Number(companySettings.fullDayHours);
    if (companySettings?.fullDayMinHours) return Number(companySettings.fullDayMinHours);
    if (companySettings?.shiftStartTime && companySettings?.shiftEndTime) {
      const [sh, sm] = companySettings.shiftStartTime.split(":").map(Number);
      const [eh, em] = companySettings.shiftEndTime.split(":").map(Number);
      let diff = (eh * 60 + (em || 0)) - (sh * 60 + (sm || 0));
      if (diff < 0) diff += 24 * 60;
      const calcHours = Math.round(diff / 60);
      if (calcHours > 0) return calcHours;
    }
    return 8;
  }, [companySettings]);

  const shiftStartTime = companySettings?.shiftStartTime || "09:30";
  const shiftEndTime = companySettings?.shiftEndTime || "18:30";

  const { data: dashRes } = useQuery({
    queryKey: ["managerDashboard"],
    queryFn: () => getManagerDashboardApi().then((r) => r.data),
    enabled: isManager,
    staleTime: 30 * 1000,
  });

  const managerProfile = dashRes?.manager || dashRes?.data?.manager || user?.employee || {};

  const managerAllowedDeptIds = useMemo(() => {
    if (!isManager) return null;
    const rawList = [
      managerProfile.departmentId?._id || managerProfile.departmentId || user?.departmentId?._id || user?.departmentId,
      ...(managerProfile.departmentIds || []),
      ...(user?.departmentIds || []),
      ...(managerProfile.accessibleDepartments || []),
      ...(user?.accessibleDepartments || []),
    ].filter(Boolean);

    return Array.from(
      new Set(
        rawList
          .map((d) => (typeof d === "object" ? (d._id || d.id || d) : d))
          .filter(Boolean)
          .map(String)
      )
    );
  }, [isManager, managerProfile, user]);

  const moduleUsage = moduleUsageRes?.usage || {};
  const subscribedModules = useMemo(() => {
    if (Array.isArray(moduleUsageRes?.subscribedModules) && moduleUsageRes.subscribedModules.length > 0) {
      return moduleUsageRes.subscribedModules.map((m) => String(m).toLowerCase().trim());
    }
    if (Array.isArray(authCompanyModules) && authCompanyModules.length > 0) {
      return authCompanyModules;
    }
    return [];
  }, [moduleUsageRes, authCompanyModules]);

  const modulesInitializedRef = useRef(false);

  useEffect(() => {
    if (subscribedModules.length > 0) {
      setFormData((prev) => {
        const cur = prev.assignedModules || [];
        const valid = cur.filter((m) => subscribedModules.includes(m));

        if (!modulesInitializedRef.current && valid.length === 0) {
          modulesInitializedRef.current = true;
          return { ...prev, assignedModules: [...subscribedModules] };
        }
        if (valid.length !== cur.length) {
          return { ...prev, assignedModules: valid };
        }
        return prev;
      });
    }
  }, [subscribedModules]);

  const departments = useMemo(() => {
    const raw = deptRes?.data?.departments ?? deptRes?.departments ?? (Array.isArray(deptRes?.data) ? deptRes.data : Array.isArray(deptRes) ? deptRes : []);
    return Array.isArray(raw) ? raw : [];
  }, [deptRes]);

  const designations = useMemo(() => {
    const raw = desigRes?.data?.designations ?? desigRes?.designations ?? (Array.isArray(desigRes?.data) ? desigRes.data : Array.isArray(desigRes) ? desigRes : []);
    return Array.isArray(raw) ? raw : [];
  }, [desigRes]);

  const branches = useMemo(() => {
    const raw = branchRes?.data?.branches ?? branchRes?.branches ?? (Array.isArray(branchRes?.data) ? branchRes.data : Array.isArray(branchRes) ? branchRes : []);
    return Array.isArray(raw) ? raw : [];
  }, [branchRes]);

  const managers = useMemo(() => {
    const raw = empRes?.data?.employees ?? empRes?.employees ?? (Array.isArray(empRes?.data) ? empRes.data : Array.isArray(empRes) ? empRes : []);
    return Array.isArray(raw) ? raw : [];
  }, [empRes]);

  const deptOptions = useMemo(() => {
    if (isManager && managerAllowedDeptIds && managerAllowedDeptIds.length > 0) {
      const filtered = departments.filter((d) => managerAllowedDeptIds.includes(String(d._id)));
      if (filtered.length > 0) {
        return filtered.map((d) => ({ value: d._id, label: d.name }));
      }
    }
    return departments.map((d) => ({ value: d._id, label: d.name }));
  }, [departments, isManager, managerAllowedDeptIds]);

  const desigOptions = useMemo(() => {
    const selectedDeptIds = Array.from(
      new Set(
        [
          formData.departmentId,
          ...(Array.isArray(formData.accessibleDepartments) ? formData.accessibleDepartments : []),
        ]
          .filter(Boolean)
          .map(String)
      )
    );

    const list = selectedDeptIds.length > 0
      ? designations.filter((d) => {
          const deptId = d.departmentId?._id || d.departmentId;
          return !deptId || selectedDeptIds.includes(String(deptId));
        })
      : designations;

    return list.map((d) => ({
      value: d._id,
      label: `${d.name} (${d.departmentId?.name || "General"})`,
    }));
  }, [designations, formData.departmentId, formData.accessibleDepartments]);

  const branchOptions = useMemo(() => {
    return branches.map((b) => ({
      value: b._id,
      label: `${b.branchName || b.name} (${b.city || ""})`,
    }));
  }, [branches]);

  const managerOptions = useMemo(() => {
    if (isManager) {
      const myId = managerProfile._id || user?.employeeId || user?._id;
      const myName = managerProfile.fullName || `${managerProfile.firstName || ''} ${managerProfile.lastName || ''}`.trim() || user?.name || "Current Manager";
      const myCode = managerProfile.employeeCode || "Manager";
      return [{ value: myId, label: `${myName} (${myCode})` }];
    }
    return managers.map((m) => ({
      value: m._id,
      label: `${m.firstName} ${m.lastName} (${m.employeeCode || "Staff"})`,
    }));
  }, [managers, isManager, managerProfile, user]);

  // Auto-set departmentId and reportingManagerId for Manager
  useEffect(() => {
    if (isManager && deptOptions.length > 0) {
      if (!formData.departmentId || !deptOptions.some((o) => o.value === formData.departmentId)) {
        setFormData((prev) => ({
          ...prev,
          departmentId: deptOptions[0].value,
          accessibleDepartments: Array.isArray(prev.accessibleDepartments) && prev.accessibleDepartments.length > 0
            ? prev.accessibleDepartments
            : [deptOptions[0].value],
        }));
        clearError("departmentId");
      }
    }
  }, [isManager, deptOptions, formData.departmentId]);

  useEffect(() => {
    if (isManager && !formData.reportingManagerId) {
      const myId = managerProfile._id || user?.employeeId || user?._id;
      if (myId) {
        setFormData((prev) => ({
          ...prev,
          reportingManagerId: myId,
        }));
      }
    }
  }, [isManager, managerProfile._id, user?.employeeId, user?._id, formData.reportingManagerId]);

  const handleCtcChange = (annualCtc) => {
    const ctc = Math.max(0, Number(annualCtc) || 0);
    setFormData((prev) => {
      const cur = prev.salaryDetails || {};
      return {
        ...prev,
        salaryDetails: {
          ...cur,
          ctc,
          monthlyCtc: Math.round(ctc / 12),
        },
      };
    });
  };

  const handleMonthlySalaryChange = (monthlyAmount) => {
    const m = Math.max(0, Number(monthlyAmount) || 0);
    setFormData((prev) => {
      const cur = prev.salaryDetails || {};
      return {
        ...prev,
        salaryDetails: {
          ...cur,
          monthlyCtc: m,
          ctc: m * 12,
        },
      };
    });
  };

  const handleCustomSalaryChange = (field, rawVal, isAnnualField = false) => {
    const num = rawVal === "" ? 0 : Number(rawVal) || 0;
    const monthlyVal = isAnnualField ? Math.round(num / 12) : num;

    setFormData((prev) => {
      const cur = prev.salaryDetails || {};
      const updated = { ...cur };

      if (field === "basic" || field === "basicSalary") {
        updated.basic = monthlyVal;
        updated.basicSalary = monthlyVal * 12;
      } else if (field === "hra") {
        updated.hra = monthlyVal;
        updated.annualHra = monthlyVal * 12;
      } else if (field === "specialAllowance") {
        updated.specialAllowance = monthlyVal;
        updated.annualSpecialAllowance = monthlyVal * 12;
      } else if (field === "conveyance") {
        updated.conveyance = monthlyVal;
      } else if (field === "medicalAllowance") {
        updated.medicalAllowance = monthlyVal;
      } else if (field === "otherAllowance") {
        updated.otherAllowance = monthlyVal;
      } else if (field === "overtimeHourlyRate") {
        updated.overtimeHourlyRate = Math.max(0, Number(rawVal) || 0);
      } else if (field === "pf" || field === "pfEmployee") {
        updated.pf = monthlyVal;
        updated.pfEmployee = monthlyVal;
        updated.annualPfEmployee = monthlyVal * 12;
        if (!updated.pfEmployer) {
          updated.pfEmployer = monthlyVal;
          updated.annualPfEmployer = monthlyVal * 12;
        }
      } else if (field === "pfEmployer") {
        updated.pfEmployer = monthlyVal;
        updated.annualPfEmployer = monthlyVal * 12;
      } else if (field === "professionalTax") {
        updated.professionalTax = monthlyVal;
        updated.annualProfessionalTax = monthlyVal * 12;
      } else if (field === "tds") {
        updated.tds = monthlyVal;
      } else if (field === "esi" || field === "esiEmployee") {
        updated.esi = monthlyVal;
        updated.esiEmployee = monthlyVal;
      }

      // Live Sum of Gross components
      const b = Number(updated.basic) || 0;
      const h = Number(updated.hra) || 0;
      const sp = Number(updated.specialAllowance) || 0;
      const c = Number(updated.conveyance) || 0;
      const med = Number(updated.medicalAllowance) || 0;
      const oth = Number(updated.otherAllowance) || 0;
      const gross = b + h + sp + c + med + oth;
      updated.grossSalary = gross;
      updated.annualGross = gross * 12;

      // Live Sum of Deductions
      const pfe = Number(updated.pfEmployee !== undefined ? updated.pfEmployee : updated.pf) || 0;
      const pt = Number(updated.professionalTax) || 0;
      const esie = Number(updated.esiEmployee !== undefined ? updated.esiEmployee : updated.esi) || 0;
      const tax = Number(updated.tds) || 0;
      const ded = pfe + pt + esie + tax;
      updated.totalDeductions = ded;

      const net = Math.max(0, gross - ded);
      updated.netSalary = net;
      updated.inHandSalary = net;
      updated.annualNetSalary = net * 12;

      // If CTC is 0 or empty, sync with gross
      if (!updated.ctc || updated.ctc === 0) {
        const pfem = updated.pfEmployer ? Number(updated.pfEmployer) : pfe;
        updated.ctc = (gross + pfem) * 12;
        updated.monthlyCtc = Math.round(updated.ctc / 12);
      }

      return {
        ...prev,
        salaryDetails: updated,
      };
    });
  };


  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo size must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result);
      setFormData((prev) => ({ ...prev, photo: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  // Quick Modals Handler
  const handleQuickSubmit = async (e) => {
    e.preventDefault();
    setQuickSaving(true);
    try {
      if (quickModal === "dept") {
        const res = await createDepartmentApi({ name: quickForm.name, code: quickForm.code || quickForm.name.slice(0, 3).toUpperCase() });
        queryClient.invalidateQueries({ queryKey: ["departments"] });
        const newDeptId = res.data?.department?._id;
        if (newDeptId) {
          setFormData((prev) => ({
            ...prev,
            accessibleDepartments: [...new Set([...(prev.accessibleDepartments || []), newDeptId])],
            departmentId: prev.departmentId || newDeptId,
          }));
          clearError("departmentId");
        }
        toast.success("Department created!");
      } else if (quickModal === "desig") {
        const res = await createDesignationApi({ name: quickForm.name, departmentId: quickForm.departmentId || formData.departmentId || formData.accessibleDepartments?.[0] });
        queryClient.invalidateQueries({ queryKey: ["designations"] });
        const newDesigId = res.data?.designation?._id;
        if (newDesigId) setFormData((prev) => ({ ...prev, designationId: newDesigId }));
        toast.success("Designation created!");
      } else if (quickModal === "branch") {
        const res = await createBranchApi({ branchName: quickForm.name, city: quickForm.city });
        queryClient.invalidateQueries({ queryKey: ["branches"] });
        const newBranchId = res.data?.branch?._id;
        if (newBranchId) {
          setFormData((prev) => ({
            ...prev,
            branchIds: [...new Set([...(prev.branchIds || []), newBranchId])],
            branchId: prev.branchId || newBranchId,
          }));
          clearError("branchId");
        }
        toast.success("Branch created!");
      }
      setQuickModal(null);
      setQuickForm({ name: "", code: "", departmentId: "", city: "" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create resource");
    } finally {
      setQuickSaving(false);
    }
  };

  // Create Employee Mutation
  const createMutation = useMutation({
    mutationFn: createEmployeeApi,
    onSuccess: async (res) => {
      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ["employees"] }),
        queryClient.invalidateQueries({ queryKey: ["allEmployees"] }),
        queryClient.invalidateQueries({ queryKey: ["companyEmployeesList"] }),
        queryClient.invalidateQueries({ queryKey: ["companyDashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["companyModuleUsage"] }),
      ]);
      queryClient.removeQueries({ queryKey: ["employees"] });
      queryClient.refetchQueries({ queryKey: ["employees"] });
      toast.success(res?.data?.message || "Employee registered successfully!");
      navigate(backRoute);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to create employee");
    },
  });

  // ── Per-field instant inline validation ───────────────────────────────────
  const validateField = (field, val) => {
    let err = "";
    const v = (val !== undefined && val !== null) ? String(val) : "";

    if (field === "firstName") {
      if (!v.trim()) err = "First name is required";
      else if (v.trim().length < 2) err = "First name must be at least 2 characters";
      else if (!/^[A-Za-z\s.'-]+$/.test(v.trim())) err = "Only letters allowed in first name";
    } else if (field === "email") {
      if (!v.trim()) err = "Email address is required";
      else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v.trim())) {
        err = "Enter a valid email address (e.g. name@company.com)";
      }
    } else if (field === "phone") {
      const digits = v.replace(/\D/g, "");
      if (!digits) err = "Mobile number is required";
      else if (!/^[6-9]/.test(digits)) err = "Mobile number must start with 6, 7, 8, or 9";
      else if (digits.length !== 10) err = `Mobile number must be 10 digits (${digits.length}/10)`;
    } else if (field === "role") {
      if (!v) err = "Please select a system role";
    } else if (field === "departmentId") {
      const hasDept = Array.isArray(val) ? (val.length > 0 && Boolean(val[0])) : Boolean(val && String(val).trim());
      if (!hasDept) err = "Department is required";
    } else if (field === "branchId") {
      const hasBranch = Array.isArray(val) ? (val.length > 0 && Boolean(val[0])) : Boolean(val && String(val).trim());
      if (!hasBranch) err = "Branch office is required";
    } else if (field === "emergencyPhone") {
      const digits = v.replace(/\D/g, "");
      if (digits && digits.length !== 10) err = `Emergency phone must be 10 digits (${digits.length}/10)`;
      else if (digits && !/^[6-9]/.test(digits)) err = "Phone number must start with 6, 7, 8, or 9";
    } else if (field === "pincode") {
      const digits = v.replace(/\D/g, "");
      if (digits && digits.length !== 6) err = "Pincode must be exactly 6 digits";
    } else if (field === "panNumber") {
      if (v.trim()) {
        const pan = v.trim().toUpperCase();
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) err = "Invalid PAN format (e.g. ABCDE1234F)";
      }
    } else if (field === "aadhaarNumber") {
      const digits = v.replace(/\D/g, "");
      if (digits && digits.length !== 12) err = `Aadhaar must be 12 digits (${digits.length}/12)`;
    } else if (field === "ifscCode") {
      if (v.trim()) {
        const ifsc = v.trim().toUpperCase();
        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) err = "Invalid IFSC format (e.g. SBIN0001234)";
      }
    } else if (field === "accountNumber") {
      const digits = v.replace(/\D/g, "");
      if (digits && (digits.length < 9 || digits.length > 18)) err = "Account number must be 9-18 digits";
    }

    setFormErrors((prev) => {
      if (err) return { ...prev, [field]: err };
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });

    return err;
  };

  // ── Per-step validation ────────────────────────────────────────────────────
  const validateStep = (step) => {
    const errors = {};
    if (step === 1) {
      const fn = validateField("firstName", formData.firstName);
      const em = validateField("email", formData.email);
      const ph = validateField("phone", formData.phone);
      if (fn) errors.firstName = fn;
      if (em) errors.email = em;
      if (ph) errors.phone = ph;
    }
    if (step === 2) {
      const rl = validateField("role", formData.role);
      const br = validateField(
        "branchId",
        formData.branchIds?.length ? formData.branchIds : formData.branchId
      );
      const dp = validateField(
        "departmentId",
        formData.accessibleDepartments?.length ? formData.accessibleDepartments : formData.departmentId
      );
      if (rl) errors.role = rl;
      if (br) errors.branchId = br;
      if (dp) errors.departmentId = dp;
    }
    if (step === 3) {
      if (formData.emergencyContact?.phone) {
        const ep = validateField("emergencyPhone", formData.emergencyContact.phone);
        if (ep) errors.emergencyPhone = ep;
      }
      if (formData.address?.pincode) {
        const pin = validateField("pincode", formData.address.pincode);
        if (pin) errors.pincode = pin;
      }
    }
    if (step === 5) {
      if (formData.panNumber) {
        const pan = validateField("panNumber", formData.panNumber);
        if (pan) errors.panNumber = pan;
      }
      if (formData.aadhaarNumber) {
        const aadh = validateField("aadhaarNumber", formData.aadhaarNumber);
        if (aadh) errors.aadhaarNumber = aadh;
      }
      if (formData.bankDetails?.ifscCode) {
        const ifsc = validateField("ifscCode", formData.bankDetails.ifscCode);
        if (ifsc) errors.ifscCode = ifsc;
      }
      if (formData.bankDetails?.accountNumber) {
        const acc = validateField("accountNumber", formData.bankDetails.accountNumber);
        if (acc) errors.accountNumber = acc;
      }
    }
    return errors;
  };

  const validateAndNext = () => {
    const errors = validateStep(activeStep);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    setActiveStep((s) => Math.min(s + 1, STEPS.length));
  };

  const handleFinalSubmit = (e) => {
    if (e) e.preventDefault();
    // Validate all critical steps before submit
    const step1Errors = validateStep(1);
    if (Object.keys(step1Errors).length > 0) {
      setFormErrors(step1Errors);
      setActiveStep(1);
      toast.error("Please fix the errors in Basic Info before submitting");
      return;
    }
    const step2Errors = validateStep(2);
    if (Object.keys(step2Errors).length > 0) {
      setFormErrors(step2Errors);
      setActiveStep(2);
      toast.error("Please fix the errors in Job Details before submitting");
      return;
    }
    const step3Errors = validateStep(3);
    if (Object.keys(step3Errors).length > 0) {
      setFormErrors(step3Errors);
      setActiveStep(3);
      toast.error("Please fix the errors in Address & Contact before submitting");
      return;
    }
    const step5Errors = validateStep(5);
    if (Object.keys(step5Errors).length > 0) {
      setFormErrors(step5Errors);
      setActiveStep(5);
      toast.error("Please fix the errors in Bank & Identity before submitting");
      return;
    }
    setFormErrors({});

    // Sanitize employmentType: convert full_time → full-time (backend expects hyphen)
    const sanitizeEmploymentType = (v) => {
      if (!v) return "full-time";
      return v.toLowerCase().replace(/_/g, "-");
    };

    const allSelectedDepts = Array.from(
      new Set(
        [
          formData.departmentId,
          ...(Array.isArray(formData.accessibleDepartments) ? formData.accessibleDepartments : []),
        ].filter(Boolean)
      )
    );

    const payload = {
      firstName: formData.firstName.trim(),
      middleName: formData.middleName?.trim() || undefined,
      lastName: formData.lastName?.trim() || "",
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone?.trim() || "",
      password: formData.password?.trim() || undefined,
      photo: formData.photo || undefined,
      gender: formData.gender,
      dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString() : undefined,
      maritalStatus: formData.maritalStatus || undefined,

      departmentId: allSelectedDepts[0] || formData.departmentId || undefined,
      departmentIds: allSelectedDepts,
      accessibleDepartments: allSelectedDepts,
      designationId: formData.designationId || undefined,
      branchId: formData.branchId || undefined,
      branchIds: Array.isArray(formData.branchIds) && formData.branchIds.length > 0
        ? (formData.branchId && !formData.branchIds.includes(formData.branchId) ? [formData.branchId, ...formData.branchIds] : formData.branchIds)
        : (formData.branchId ? [formData.branchId] : []),
      reportingManagerId: formData.reportingManagerId || (isManager ? (managerProfile._id || user?.employeeId || user?._id) : undefined),
      role: formData.role || "Employee",
      loginRole: formData.role || "Employee",
      managerAccessLevel: formData.role === "Manager" || formData.role === "HR" ? formData.managerAccessLevel : undefined,
      employmentType: sanitizeEmploymentType(formData.employmentType),
      workMode: formData.workMode || "office",
      allowRemotePunch: formData.allowRemotePunch || false,
      isLocationTrackingEnabled: Boolean(formData.isLocationTrackingEnabled),
      joiningDate: formData.joiningDate ? new Date(formData.joiningDate).toISOString() : undefined,
      confirmationDate: formData.confirmationDate ? new Date(formData.confirmationDate).toISOString() : undefined,
      noticePeriod: formData.noticePeriod || undefined,

      address: formData.address,
      permanentAddress: formData.permanentAddress,
      emergencyContact: formData.emergencyContact,
      salaryDetails: formData.salaryDetails || undefined,
      bankDetails: formData.bankDetails || undefined,
      aadhaarNumber: formData.aadhaarNumber?.trim() || undefined,
      panNumber: formData.panNumber?.trim() || undefined,
      // documents must be object {}, never an array
      documents: (formData.documents && !Array.isArray(formData.documents) && typeof formData.documents === "object")
        ? formData.documents
        : {},
      assignedModules: (formData.assignedModules || []).filter((m) => subscribedModules.includes(m)),
    };

    createMutation.mutate(payload);
  };

  const displayName = `${formData.firstName || "New"} ${formData.lastName || "Employee"}`.trim();
  const selectedDeptName = useMemo(() => {
    const ids = formData.accessibleDepartments?.length
      ? formData.accessibleDepartments
      : formData.departmentId
      ? [formData.departmentId]
      : [];
    const matched = departments.filter((d) => ids.some((id) => String(id) === String(d._id))).map((d) => d.name);
    return matched.length ? matched.join(", ") : "General";
  }, [departments, formData.accessibleDepartments, formData.departmentId]);
  const selectedDesigName = designations.find((d) => d._id === formData.designationId)?.name || "Staff";

  return (
    <div className="min-h-screen pb-24 space-y-5 max-w-[1400px] mx-auto font-sans text-slate-900 dark:text-slate-100">
      
      {/* ── Top Executive Header ────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              to={backRoute}
              className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
              title="Back to Employees"
            >
              <ArrowLeft size={18} />
            </Link>

            <div className="relative group">
              <input
                type="file"
                ref={avatarInputRef}
                onChange={handleAvatarUpload}
                accept="image/*"
                className="hidden"
              />
              <div
                onClick={() => avatarInputRef.current?.click()}
                className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 border-2 border-dashed border-amber-500/30 flex items-center justify-center font-extrabold text-lg shadow-2xs overflow-hidden cursor-pointer hover:border-amber-500 transition-all relative group"
              >
                {avatarPreview || formData.photo ? (
                  <img
                    src={avatarPreview || getPhotoUrl(formData.photo)}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{displayName.charAt(0).toUpperCase()}</span>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                  <Camera size={18} />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {displayName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase">
                  {formData.role || "Employee"}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {selectedDesigName} • {selectedDeptName} • Fast 7-Step Onboarding
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`${baseRoute}/employees`)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              Discard
            </button>
            <button
              onClick={handleFinalSubmit}
              disabled={createMutation.isPending}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>Register Employee</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Step Progress Indicator ─────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-2 shadow-2xs overflow-x-auto scrollbar-none">
        <div className="flex items-center justify-between min-w-[720px] gap-1.5">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isActive = activeStep === step.id;
            const isDone = activeStep > step.id;

            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                className={`flex-1 flex items-center gap-2.5 py-2.5 px-3 rounded-xl transition-all text-left cursor-pointer ${
                  isActive
                    ? "bg-[#1268D9] text-white font-black shadow-xs"
                    : isDone
                    ? "bg-slate-50 dark:bg-slate-900/80 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/60"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive
                      ? "bg-white/20 text-white"
                      : isDone
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {isDone ? <CheckCheck size={14} /> : <Icon size={14} className={isActive ? "text-white" : ""} />}
                </div>
                <div className="min-w-0">
                  <p className={`text-[11.5px] leading-tight truncate ${isActive ? "font-black text-white" : "font-extrabold text-slate-800 dark:text-slate-200"}`}>
                    {step.label}
                  </p>
                  <p className={`text-[9.5px] truncate font-medium ${isActive ? "text-white/90" : "text-slate-500 dark:text-slate-400"}`}>
                    {step.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main Form Canvas ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Side: Live Summary & Avatar Deck */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-300 tracking-wider">Candidate Card</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                Live Draft
              </span>
            </div>

            <div className="text-center space-y-2">
              <div
                onClick={() => avatarInputRef.current?.click()}
                className="w-20 h-20 rounded-2xl mx-auto bg-amber-500/10 text-amber-500 border-2 border-dashed border-amber-500/30 flex items-center justify-center font-black text-2xl shadow-2xs cursor-pointer hover:border-amber-500 transition-all overflow-hidden relative group"
              >
                {avatarPreview || formData.photo ? (
                  <img
                    src={avatarPreview || getPhotoUrl(formData.photo)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  displayName.charAt(0).toUpperCase()
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold">
                  Change
                </div>
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900 dark:text-white leading-tight">{displayName}</h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold mt-0.5">{formData.email || "no-email@company.com"}</p>
                <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">{formData.phone || "No phone provided"}</p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold">
              <div className="flex justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Department:</span>
                <span className="text-slate-900 dark:text-white font-bold">{selectedDeptName}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Designation:</span>
                <span className="text-slate-900 dark:text-white font-bold">{selectedDesigName}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Role:</span>
                <span className="text-amber-600 dark:text-amber-400 font-black">{formData.role}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Annual CTC:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-black font-mono">
                  ₹{(Number(formData.salaryDetails?.ctc) || 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between py-1 border-t border-slate-100 dark:border-slate-800/80 pt-1 mt-0.5">
                <span className="text-slate-500 dark:text-slate-400">Net In-Hand:</span>
                <span className="text-blue-600 dark:text-blue-400 font-black font-mono">
                  ₹{(Number(formData.salaryDetails?.netSalary) || 0).toLocaleString("en-IN")} / mo
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Step-by-Step Form Pane */}
        <div className="lg:col-span-8 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-2xs min-h-[460px] flex flex-col justify-between">
          
          {/* STEP 1: Basic Info */}
          {activeStep === 1 && (
            <div className="space-y-3 animate-fadeIn">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <User size={16} className="text-amber-500" /> Basic Information
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">Candidate personal identity &amp; communication details</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <Input
                  label="First Name"
                  required
                  placeholder="Enter first name"
                  value={formData.firstName}
                  error={formErrors.firstName}
                  onClearError={() => clearError("firstName")}
                  onBlur={() => validateField("firstName", formData.firstName)}
                  onChange={(v) => {
                    setFormData((p) => ({ ...p, firstName: v }));
                    if (formErrors.firstName || v.trim().length >= 2) {
                      validateField("firstName", v);
                    }
                  }}
                />
                <Input
                  label="Middle Name"
                  placeholder="Enter middle name"
                  value={formData.middleName}
                  onChange={(v) => setFormData((p) => ({ ...p, middleName: v }))}
                />
                <Input
                  label="Last Name"
                  placeholder="Enter last name"
                  value={formData.lastName}
                  onChange={(v) => setFormData((p) => ({ ...p, lastName: v }))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Input
                  label="Email Address (Login ID)"
                  required
                  type="email"
                  placeholder="Enter employee email address (e.g. name@company.com)"
                  value={formData.email}
                  error={formErrors.email}
                  onClearError={() => clearError("email")}
                  onBlur={() => validateField("email", formData.email)}
                  onChange={(v) => {
                    const clean = v.trim();
                    setFormData((p) => ({ ...p, email: clean }));
                    if (formErrors.email || clean.includes("@")) {
                      validateField("email", clean);
                    }
                  }}
                />
                <Input
                  label="Mobile / WhatsApp Phone"
                  required
                  type="tel"
                  maxLength={10}
                  placeholder="Enter 10-digit mobile number"
                  value={formData.phone}
                  error={formErrors.phone}
                  onClearError={() => clearError("phone")}
                  onBlur={() => validateField("phone", formData.phone)}
                  onChange={(v) => {
                    const digits = v.replace(/\D/g, "").slice(0, 10);
                    setFormData((p) => ({ ...p, phone: digits }));
                    validateField("phone", digits);
                  }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <Select
                  label="Gender"
                  value={formData.gender}
                  onChange={(v) => setFormData((p) => ({ ...p, gender: v }))}
                  options={[
                    { value: "male", label: "Male" },
                    { value: "female", label: "Female" },
                    { value: "other", label: "Other" },
                  ]}
                />
                <Input
                  label="Date of Birth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(v) => setFormData((p) => ({ ...p, dateOfBirth: v }))}
                />
                <Select
                  label="Marital Status"
                  value={formData.maritalStatus}
                  onChange={(v) => setFormData((p) => ({ ...p, maritalStatus: v }))}
                  options={[
                    { value: "single", label: "Single" },
                    { value: "married", label: "Married" },
                    { value: "divorced", label: "Divorced" },
                  ]}
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/20 border-2 border-amber-400/80 dark:border-amber-500/50 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Lock size={14} className="text-amber-600 dark:text-amber-400" />
                    Custom Initial Password <span className="text-[10.5px] text-slate-500 font-semibold normal-case">(Optional)</span>
                  </label>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-500 text-slate-950 uppercase tracking-wider shadow-xs">
                    <Phone size={11} strokeWidth={2.5} /> By Default: Mobile No. is Password
                  </span>
                </div>

                <input
                  type="text"
                  placeholder="Enter initial password (optional)"
                  value={formData.password}
                  onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#0B101B] border border-amber-300 dark:border-amber-700/80 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Job Details */}
          {activeStep === 2 && (
            <div className="space-y-3 animate-fadeIn">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Briefcase size={16} className="text-amber-500" /> Job &amp; Organizational Hierarchy
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">Department permissions, branch &amp; reporting chain</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Select
                  label="System Role"
                  required
                  value={formData.role || "Employee"}
                  error={formErrors.role}
                  onClearError={() => clearError("role")}
                  onChange={(v) => setFormData((p) => ({ ...p, role: v }))}
                  options={[
                    { value: "Employee", label: "Employee (Standard Staff / Team Member)" },
                    { value: "Manager", label: "Manager (Team & Task Leader)" },
                    { value: "HR", label: "HR (Human Resources Manager)" },
                    ...(isManager ? [] : [{ value: "CompanyAdmin", label: "Company Admin (Co-Administrator)" }]),
                  ]}
                />
                <MultiSelect
                  label="Branch Office"
                  required
                  loading={branchLoading}
                  selected={
                    Array.isArray(formData.branchIds) && formData.branchIds.length > 0
                      ? formData.branchIds
                      : formData.branchId
                      ? [formData.branchId]
                      : []
                  }
                  error={formErrors.branchId}
                  onClearError={() => clearError("branchId")}
                  onChange={(selectedArr) => {
                    const primary = selectedArr[0] || "";
                    setFormData((p) => ({
                      ...p,
                      branchId: primary,
                      branchIds: selectedArr,
                    }));
                    if (selectedArr.length > 0) clearError("branchId");
                  }}
                  options={branchOptions}
                  placeholder={branchLoading ? "Loading branches..." : "Select Branch Office(s)..."}
                  action={
                    !isManager ? (
                      <button
                        type="button"
                        onClick={() => { setQuickModal("branch"); setQuickForm({ name: "", city: "" }); }}
                        className="text-[10.5px] text-amber-600 dark:text-amber-400 font-black hover:underline"
                      >
                        + New Branch
                      </button>
                    ) : null
                  }
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <MultiSelect
                  label="Department"
                  required
                  loading={deptLoading}
                  selected={
                    Array.isArray(formData.accessibleDepartments) && formData.accessibleDepartments.length > 0
                      ? formData.accessibleDepartments
                      : formData.departmentId
                      ? [formData.departmentId]
                      : []
                  }
                  error={formErrors.departmentId}
                  onClearError={() => clearError("departmentId")}
                  onChange={(selectedArr) => {
                    const primary = selectedArr[0] || "";
                    setFormData((p) => ({
                      ...p,
                      departmentId: primary,
                      accessibleDepartments: selectedArr,
                    }));
                    if (selectedArr.length > 0) clearError("departmentId");
                  }}
                  options={deptOptions}
                  placeholder={deptLoading ? "Loading departments..." : "Select Department(s)..."}
                  action={
                    !isManager ? (
                      <button
                        type="button"
                        onClick={() => { setQuickModal("dept"); setQuickForm({ name: "", code: "" }); }}
                        className="text-[10.5px] text-amber-600 dark:text-amber-400 font-black hover:underline"
                      >
                        + New Department
                      </button>
                    ) : null
                  }
                />

                <Select
                  label="Job Designation"
                  loading={desigLoading}
                  value={formData.designationId}
                  onChange={(v) => setFormData((p) => ({ ...p, designationId: v }))}
                  options={desigOptions}
                  placeholder={desigLoading ? "Loading designations..." : "Select Designation..."}
                  action={
                    !isManager ? (
                      <button
                        type="button"
                        onClick={() => { setQuickModal("desig"); setQuickForm({ name: "", departmentId: formData.departmentId || formData.accessibleDepartments?.[0] || "" }); }}
                        className="text-[10.5px] text-amber-600 dark:text-amber-400 font-black hover:underline"
                      >
                        + New Designation
                      </button>
                    ) : null
                  }
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Select
                  label="Reporting Manager"
                  loading={empLoading}
                  value={formData.reportingManagerId}
                  disabled={isManager}
                  onChange={(v) => setFormData((p) => ({ ...p, reportingManagerId: v }))}
                  options={managerOptions}
                  placeholder={empLoading ? "Loading managers..." : "Select Reporting Manager..."}
                />

                <Select
                  label="Employment Type"
                  value={formData.employmentType}
                  onChange={(v) => setFormData((p) => ({ ...p, employmentType: v }))}
                  options={[
                    { value: "full_time", label: "Full Time" },
                    { value: "part_time", label: "Part Time" },
                    { value: "contract", label: "Contract" },
                    { value: "internship", label: "Internship" },
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Select
                  label="Work Mode"
                  value={formData.workMode}
                  onChange={(v) => setFormData((p) => ({ ...p, workMode: v }))}
                  options={[
                    { value: "office", label: "On-Site / Office" },
                    { value: "remote", label: "Remote / Work From Home" },
                    { value: "hybrid", label: "Hybrid" },
                  ]}
                />
                <Input
                  label="Joining Date"
                  type="date"
                  value={formData.joiningDate}
                  onChange={(v) => setFormData((p) => ({ ...p, joiningDate: v }))}
                />
              </div>

              {/* Module License & Feature Access */}
              <div className="bg-slate-50 dark:bg-[#0B101B] p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Cpu size={14} className="text-amber-500" />
                      <span>Module License &amp; Feature Access</span>
                    </h4>
                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">
                      Select which suite modules this employee can access according to company plan seat limits.
                    </p>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Plan Seat Limits Enforced
                  </span>
                </div>

                {moduleUsageLoading ? (
                  <div className="p-8 rounded-xl bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center justify-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <Loader2 size={18} className="animate-spin text-amber-500" />
                    <span>Loading module license limits &amp; usage statistics...</span>
                  </div>
                ) : ALL_MODULES.filter((m) => subscribedModules.includes(m.key)).length === 0 ? (
                  <div className="p-4 rounded-xl bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
                    No suite modules subscribed in current company plan.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {ALL_MODULES.filter((m) => subscribedModules.includes(m.key)).map((m) => {
                      const usageInfo = moduleUsage[m.key];
                      const used = usageInfo?.used ?? 0;
                      const limit = usageInfo?.limit || moduleUsageRes?.companyLimit || 0;
                      const isUnlimited = usageInfo?.isUnlimited || (limit >= 999999 || limit <= 0);
                      const remaining = isUnlimited ? 9999 : Math.max(0, limit - used);
                      const isFull = !isUnlimited && limit > 0 && remaining <= 0;
                      const isChecked = (formData.assignedModules || []).includes(m.key);
                      const percentage = limit > 0 && !isUnlimited ? Math.min(100, Math.round((used / limit) * 100)) : 0;

                      return (
                        <div
                          key={m.key}
                          onClick={() => {
                            if (isFull && !isChecked) {
                              setUpgradePlanModal({
                                moduleName: m.key,
                                label: m.label,
                                used,
                                limit,
                              });
                              return;
                            }
                            setFormData((p) => {
                              const cur = p.assignedModules || [];
                              return {
                                ...p,
                                assignedModules: isChecked ? cur.filter((x) => x !== m.key) : [...cur, m.key],
                              };
                            });
                          }}
                          className={`p-3 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                            isChecked
                              ? "bg-amber-500/10 border-amber-500/50 shadow-xs ring-1 ring-amber-500/30"
                              : isFull
                              ? "bg-rose-500/5 border-rose-300 dark:border-rose-900 hover:border-rose-400 cursor-pointer"
                              : "bg-white dark:bg-[#111C24] border-slate-200 dark:border-slate-700/80 hover:border-amber-500/40"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-xs font-black text-slate-900 dark:text-white block">
                                {m.label}
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-tight line-clamp-2 mt-0.5">
                                {m.desc}
                              </span>
                            </div>
                            {isFull && !isChecked ? (
                              <Zap size={14} className="text-rose-500 shrink-0 mt-0.5" />
                            ) : (
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer pointer-events-none mt-0.5"
                              />
                            )}
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                            <div className="flex items-center justify-between text-[10.5px] font-bold">
                              {isUnlimited ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                                  {used} Active (Unlimited Seats)
                                </span>
                              ) : isFull && !isChecked ? (
                                <span className="text-rose-500 font-extrabold flex items-center gap-1">
                                  <Zap size={11} className="shrink-0" /> Limit Full ({used}/{limit})
                                </span>
                              ) : (
                                <span className="text-amber-700 dark:text-amber-300 font-black">
                                  {used} / {limit} Seats Used {remaining > 0 ? `(${remaining} left)` : "(0 left)"}
                                </span>
                              )}
                              {!isUnlimited && limit > 0 && (
                                <span className="text-[10px] font-mono text-slate-400 font-extrabold">
                                  {percentage}%
                                </span>
                              )}
                            </div>
                            {!isUnlimited && limit > 0 && (
                              <div className="w-full bg-slate-200 dark:bg-slate-700/60 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    isFull ? "bg-rose-500" : percentage >= 80 ? "bg-amber-500" : "bg-emerald-500"
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <Toggle
                label="Allow Remote GPS Punch"
                checked={formData.allowRemotePunch}
                onChange={(v) => setFormData((p) => ({ ...p, allowRemotePunch: v }))}
                description="Allows employee to mark attendance from mobile app outside office geofence"
              />

              {/* Live GPS Location Tracking Toggle */}
              <Toggle
                label="Live GPS Location Tracking (Field Staff)"
                checked={formData.isLocationTrackingEnabled}
                onChange={(v) => setFormData((p) => ({ ...p, isLocationTrackingEnabled: v }))}
                description="Enable live travel route tracking on mobile punch-in. Keep OFF for office staff (Universal punch-in works normally for all employees without tracking)."
              />
            </div>
          )}

          {/* STEP 3: Address & Contact */}
          {activeStep === 3 && (
            <div className="space-y-3 animate-fadeIn">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <MapPin size={16} className="text-amber-500" /> Address &amp; Emergency Contact
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">Residential address and family emergency contacts</p>
              </div>

              <div className="space-y-3">
                <Input
                  label="Current Residential Street"
                  placeholder="Enter full street address"
                  value={formData.address?.street}
                  onChange={(v) => setFormData((p) => ({ ...p, address: { ...p.address, street: v } }))}
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <Input
                    label="City"
                    placeholder="Enter city name"
                    value={formData.address?.city}
                    onChange={(v) => setFormData((p) => ({ ...p, address: { ...p.address, city: v } }))}
                  />
                  <Input
                    label="State"
                    placeholder="Enter state name"
                    value={formData.address?.state}
                    onChange={(v) => setFormData((p) => ({ ...p, address: { ...p.address, state: v } }))}
                  />
                  <Input
                    label="Pincode"
                    type="tel"
                    maxLength={6}
                    placeholder="Enter 6-digit pincode"
                    value={formData.address?.pincode}
                    error={formErrors.pincode}
                    onClearError={() => clearError("pincode")}
                    onBlur={() => {
                      if (formData.address?.pincode) validateField("pincode", formData.address.pincode);
                    }}
                    onChange={(v) => {
                      const digits = v.replace(/\D/g, "").slice(0, 6);
                      setFormData((p) => ({ ...p, address: { ...p.address, pincode: digits } }));
                      if (digits) validateField("pincode", digits);
                      else clearError("pincode");
                    }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <span className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">Emergency Contact</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <Input
                    label="Contact Person Name"
                    placeholder="Enter emergency contact person name"
                    value={formData.emergencyContact?.name}
                    onChange={(v) => setFormData((p) => ({ ...p, emergencyContact: { ...p.emergencyContact, name: v } }))}
                  />
                  <Select
                    label="Relationship"
                    value={formData.emergencyContact?.relationship}
                    onChange={(v) => setFormData((p) => ({ ...p, emergencyContact: { ...p.emergencyContact, relationship: v } }))}
                    options={[
                      { value: "Parent", label: "Parent / Father / Mother" },
                      { value: "Spouse", label: "Spouse" },
                      { value: "Sibling", label: "Brother / Sister" },
                      { value: "Friend", label: "Friend / Relative" },
                    ]}
                  />
                  <Input
                    label="Emergency Phone"
                    type="tel"
                    maxLength={10}
                    placeholder="Enter 10-digit emergency contact phone"
                    value={formData.emergencyContact?.phone}
                    error={formErrors.emergencyPhone}
                    onClearError={() => clearError("emergencyPhone")}
                    onBlur={() => {
                      if (formData.emergencyContact?.phone) validateField("emergencyPhone", formData.emergencyContact.phone);
                    }}
                    onChange={(v) => {
                      const digits = v.replace(/\D/g, "").slice(0, 10);
                      setFormData((p) => ({ ...p, emergencyContact: { ...p.emergencyContact, phone: digits } }));
                      if (digits) validateField("emergencyPhone", digits);
                      else clearError("emergencyPhone");
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Salary & Compensation */}
          {activeStep === 4 && (
            <div className="space-y-4 animate-fadeIn">
              {/* Step Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <DollarSign size={16} className="text-amber-500" /> Salary Structure &amp; Allowances
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    Standard Indian payroll breakup with automatic CTC calculation, Gross Earnings, and Net In-Hand Take-Home salary.
                  </p>
                </div>

                {/* View Mode Toggle: Monthly vs Annual */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setSalaryViewMode("monthly")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      salaryViewMode === "monthly"
                        ? "bg-white dark:bg-[#111C24] text-slate-900 dark:text-white shadow-2xs"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    Monthly (₹/mo)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSalaryViewMode("annual")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      salaryViewMode === "annual"
                        ? "bg-white dark:bg-[#111C24] text-slate-900 dark:text-white shadow-2xs"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    Annual (₹/yr)
                  </button>
                </div>
              </div>

              {/* ── Main CTC & Monthly Input Card ── */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-blue-500/10 border border-amber-500/30">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Annual CTC Input */}
                  <div>
                    <label className="text-[11px] font-black uppercase text-amber-900 dark:text-amber-300 tracking-wider block mb-1.5">
                      Annual Cost to Company (CTC)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        placeholder="e.g. 360000"
                        value={formData.salaryDetails?.ctc ?? ""}
                        onChange={(e) => handleCtcChange(e.target.value)}
                        className="w-full pl-7 pr-3 py-2.5 bg-white dark:bg-[#0B101B] border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-black text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  {/* Monthly CTC / Gross Input */}
                  <div>
                    <label className="text-[11px] font-black uppercase text-blue-900 dark:text-blue-300 tracking-wider block mb-1.5">
                      Monthly CTC / Gross Salary
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        placeholder="e.g. 30000"
                        value={formData.salaryDetails?.monthlyCtc || Math.round((Number(formData.salaryDetails?.ctc) || 0) / 12) || ""}
                        onChange={(e) => handleMonthlySalaryChange(e.target.value)}
                        className="w-full pl-7 pr-3 py-2.5 bg-white dark:bg-[#0B101B] border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-black text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── LIVE KPI STATS RIBBON ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-2xl bg-white dark:bg-[#0B101B] border border-slate-200/90 dark:border-slate-800 shadow-2xs">
                  <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Annual CTC</span>
                  <div className="text-base font-black text-slate-900 dark:text-white font-mono mt-0.5">
                    ₹{(Number(formData.salaryDetails?.ctc) || 0).toLocaleString("en-IN")}
                  </div>
                  <span className="text-[9.5px] font-semibold text-slate-500">
                    ₹{Math.round((Number(formData.salaryDetails?.ctc) || 0) / 12).toLocaleString("en-IN")} / mo
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-white dark:bg-[#0B101B] border border-slate-200/90 dark:border-slate-800 shadow-2xs">
                  <span className="text-[10px] font-black uppercase text-blue-500 block tracking-wider">Gross Earnings</span>
                  <div className="text-base font-black text-blue-600 dark:text-blue-400 font-mono mt-0.5">
                    ₹{(Number(formData.salaryDetails?.grossSalary) || 0).toLocaleString("en-IN")}
                  </div>
                  <span className="text-[9.5px] font-semibold text-slate-500">
                    ₹{((Number(formData.salaryDetails?.grossSalary) || 0) * 12).toLocaleString("en-IN")} / yr
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-white dark:bg-[#0B101B] border border-slate-200/90 dark:border-slate-800 shadow-2xs">
                  <span className="text-[10px] font-black uppercase text-rose-500 block tracking-wider">Total Deductions</span>
                  <div className="text-base font-black text-rose-600 dark:text-rose-400 font-mono mt-0.5">
                    -₹{(Number(formData.salaryDetails?.totalDeductions) || 0).toLocaleString("en-IN")}
                  </div>
                  <span className="text-[9.5px] font-semibold text-slate-500">
                    PF + PT + TDS + ESI
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-300 tracking-wider">
                      Net Take-Home
                    </span>
                    <CheckCircle2 size={12} className="text-emerald-500" />
                  </div>
                  <div className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                    ₹{(Number(formData.salaryDetails?.netSalary) || 0).toLocaleString("en-IN")}
                  </div>
                  <span className="text-[9.5px] font-bold text-emerald-700 dark:text-emerald-300">
                    In-Hand Bank Deposit
                  </span>
                </div>
              </div>

              {/* ── SECTION 1: EARNINGS BREAKDOWN ── */}
              <div className="bg-slate-50/60 dark:bg-slate-900/40 rounded-2xl p-4 border border-slate-200/70 dark:border-slate-800/80 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2.5 gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Coins size={14} className="text-amber-500" /> 1. Monthly Earnings (Gross Components)
                  </span>

                  <span className="text-xs font-black text-slate-900 dark:text-white font-mono bg-white dark:bg-slate-800 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                    Gross: ₹{(Number(formData.salaryDetails?.grossSalary) || 0).toLocaleString("en-IN")} / mo
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    label={salaryViewMode === "monthly" ? "Basic Salary (Monthly)" : "Basic Salary (Annual)"}
                    type="number"
                    allowZero={true}
                    placeholder="Basic salary"
                    value={
                      salaryViewMode === "monthly"
                        ? formData.salaryDetails?.basic
                        : formData.salaryDetails?.basicSalary
                    }
                    onChange={(v) => handleCustomSalaryChange("basic", v, salaryViewMode === "annual")}
                  />

                  <Input
                    label={salaryViewMode === "monthly" ? "House Rent Allowance (HRA)" : "HRA (Annual)"}
                    type="number"
                    allowZero={true}
                    placeholder="House rent allowance"
                    value={
                      salaryViewMode === "monthly"
                        ? formData.salaryDetails?.hra
                        : (Number(formData.salaryDetails?.hra) || 0) * 12
                    }
                    onChange={(v) => handleCustomSalaryChange("hra", v, salaryViewMode === "annual")}
                  />

                  <Input
                    label={salaryViewMode === "monthly" ? "Special Allowance" : "Special Allowance (Annual)"}
                    type="number"
                    allowZero={true}
                    placeholder="Special allowance"
                    value={
                      salaryViewMode === "monthly"
                        ? formData.salaryDetails?.specialAllowance
                        : (Number(formData.salaryDetails?.specialAllowance) || 0) * 12
                    }
                    onChange={(v) => handleCustomSalaryChange("specialAllowance", v, salaryViewMode === "annual")}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <Input
                    label={salaryViewMode === "monthly" ? "Conveyance Allowance" : "Conveyance (Annual)"}
                    type="number"
                    allowZero={true}
                    placeholder="Conveyance allowance"
                    value={
                      salaryViewMode === "monthly"
                        ? formData.salaryDetails?.conveyance
                        : (Number(formData.salaryDetails?.conveyance) || 0) * 12
                    }
                    onChange={(v) => handleCustomSalaryChange("conveyance", v, salaryViewMode === "annual")}
                  />

                  <Input
                    label={salaryViewMode === "monthly" ? "Medical Allowance" : "Medical (Annual)"}
                    type="number"
                    allowZero={true}
                    placeholder="Medical allowance"
                    value={
                      salaryViewMode === "monthly"
                        ? formData.salaryDetails?.medicalAllowance
                        : (Number(formData.salaryDetails?.medicalAllowance) || 0) * 12
                    }
                    onChange={(v) => handleCustomSalaryChange("medicalAllowance", v, salaryViewMode === "annual")}
                  />

                  <Input
                    label={salaryViewMode === "monthly" ? "Other Allowance" : "Other Allowance (Annual)"}
                    type="number"
                    allowZero={true}
                    placeholder="Other allowance"
                    value={
                      salaryViewMode === "monthly"
                        ? formData.salaryDetails?.otherAllowance
                        : (Number(formData.salaryDetails?.otherAllowance) || 0) * 12
                    }
                    onChange={(v) => handleCustomSalaryChange("otherAllowance", v, salaryViewMode === "annual")}
                  />
                </div>
              </div>

              {/* ── OVERTIME HOURLY RATE (HIGHLIGHTED POLICY CARD) ── */}
              <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-500/10 dark:from-amber-950/30 dark:via-slate-900/40 dark:to-amber-950/20 rounded-2xl p-4 border-2 border-amber-400/80 dark:border-amber-500/50 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/70 dark:border-amber-800/60 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-xs">
                      <Clock size={16} strokeWidth={2.5} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                          Overtime Hourly Rate
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 uppercase tracking-wider shadow-2xs">
                          Beyond {shiftFullDayHours}h Shift
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-0.5">
                        Company shift schedule: <strong className="text-slate-800 dark:text-slate-200">{formatTime12h(shiftStartTime)} to {formatTime12h(shiftEndTime)} ({shiftFullDayHours}h Full Day)</strong>. Specify the hourly payout rate for work completed beyond standard shift hours.
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-black text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-3 py-1 rounded-xl border border-amber-300 dark:border-amber-700">
                    ₹{Number(formData.salaryDetails?.overtimeHourlyRate || 0).toLocaleString("en-IN")} / hr
                  </span>
                </div>

                <div className="max-w-xs">
                  <Input
                    label={`Overtime Rate Per Hour (Beyond ${shiftFullDayHours}h)`}
                    type="number"
                    allowZero={true}
                    placeholder="e.g. 150"
                    value={formData.salaryDetails?.overtimeHourlyRate}
                    onChange={(v) => handleCustomSalaryChange("overtimeHourlyRate", v)}
                  />
                </div>
              </div>

              {/* ── SECTION 2: DEDUCTIONS & COMPLIANCE ── */}
              <div className="bg-slate-50/60 dark:bg-slate-900/40 rounded-2xl p-4 border border-slate-200/70 dark:border-slate-800/80 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2.5 gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-rose-500" /> 2. Monthly Deductions &amp; Statutory Taxes
                  </span>

                  <span className="text-xs font-black text-rose-600 dark:text-rose-400 font-mono bg-white dark:bg-slate-800 px-3 py-1 rounded-xl border border-rose-200 dark:border-rose-900/40 shadow-2xs">
                    Deductions: -₹{(Number(formData.salaryDetails?.totalDeductions) || 0).toLocaleString("en-IN")} / mo
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <Input
                    label={salaryViewMode === "monthly" ? "Provident Fund (PF)" : "PF Employee (Annual)"}
                    type="number"
                    allowZero={true}
                    placeholder="0"
                    value={
                      salaryViewMode === "monthly"
                        ? (formData.salaryDetails?.pfEmployee ?? formData.salaryDetails?.pf)
                        : (Number(formData.salaryDetails?.pfEmployee ?? formData.salaryDetails?.pf) || 0) * 12
                    }
                    onChange={(v) => handleCustomSalaryChange("pfEmployee", v, salaryViewMode === "annual")}
                  />

                  <Input
                    label={salaryViewMode === "monthly" ? "Professional Tax (PT)" : "Professional Tax (Annual)"}
                    type="number"
                    allowZero={true}
                    placeholder="0"
                    value={
                      salaryViewMode === "monthly"
                        ? formData.salaryDetails?.professionalTax
                        : (formData.salaryDetails?.annualProfessionalTax || (Number(formData.salaryDetails?.professionalTax) || 0) * 12)
                    }
                    onChange={(v) => handleCustomSalaryChange("professionalTax", v, salaryViewMode === "annual")}
                  />

                  <Input
                    label={salaryViewMode === "monthly" ? "Employee State Insurance (ESI)" : "ESI Employee (Annual)"}
                    type="number"
                    allowZero={true}
                    placeholder="0"
                    value={
                      salaryViewMode === "monthly"
                        ? (formData.salaryDetails?.esiEmployee ?? formData.salaryDetails?.esi)
                        : (Number(formData.salaryDetails?.esiEmployee ?? formData.salaryDetails?.esi) || 0) * 12
                    }
                    onChange={(v) => handleCustomSalaryChange("esiEmployee", v, salaryViewMode === "annual")}
                  />

                  <Input
                    label={salaryViewMode === "monthly" ? "TDS / Income Tax" : "TDS / Tax (Annual)"}
                    type="number"
                    allowZero={true}
                    placeholder="0"
                    value={
                      salaryViewMode === "monthly"
                        ? formData.salaryDetails?.tds
                        : (Number(formData.salaryDetails?.tds) || 0) * 12
                    }
                    onChange={(v) => handleCustomSalaryChange("tds", v, salaryViewMode === "annual")}
                  />
                </div>

                {/* Section 3 Note: Employer Contributions & Net Take-Home (Properly Aligned Grid) */}
                <div className="pt-2.5 border-t border-slate-200/70 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">Employer PF Contribution:</span>
                    <span className="font-black font-mono text-slate-900 dark:text-white">
                      ₹{(Number(formData.salaryDetails?.pfEmployer) || Number(formData.salaryDetails?.pfEmployee) || 0).toLocaleString("en-IN")} / mo
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between">
                    <span className="font-semibold text-emerald-800 dark:text-emerald-300">Monthly Net In-Hand:</span>
                    <span className="font-black font-mono text-emerald-700 dark:text-emerald-400">
                      ₹{(Number(formData.salaryDetails?.netSalary) || 0).toLocaleString("en-IN")} / mo
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Bank & Identity */}
          {activeStep === 5 && (
            <div className="space-y-3 animate-fadeIn">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <CreditCard size={16} className="text-amber-500" /> Banking &amp; Government ID Proofs
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">Direct salary deposit banking &amp; PAN/Aadhaar compliance</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Input
                  label="Aadhaar Card Number"
                  type="tel"
                  maxLength={12}
                  placeholder="Enter 12-digit Aadhaar number"
                  value={formData.aadhaarNumber}
                  error={formErrors.aadhaarNumber}
                  onClearError={() => clearError("aadhaarNumber")}
                  onBlur={() => {
                    if (formData.aadhaarNumber) validateField("aadhaarNumber", formData.aadhaarNumber);
                  }}
                  onChange={(v) => {
                    const digits = v.replace(/\D/g, "").slice(0, 12);
                    setFormData((p) => ({ ...p, aadhaarNumber: digits }));
                    if (digits) validateField("aadhaarNumber", digits);
                    else clearError("aadhaarNumber");
                  }}
                />
                <Input
                  label="Income Tax PAN Number"
                  maxLength={10}
                  placeholder="Enter 10-character PAN number (e.g. ABCDE1234F)"
                  value={formData.panNumber}
                  error={formErrors.panNumber}
                  onClearError={() => clearError("panNumber")}
                  onBlur={() => {
                    if (formData.panNumber) validateField("panNumber", formData.panNumber);
                  }}
                  onChange={(v) => {
                    const pan = v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
                    setFormData((p) => ({ ...p, panNumber: pan }));
                    if (pan) validateField("panNumber", pan);
                    else clearError("panNumber");
                  }}
                />
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <span className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">Salary Bank Account</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <Input
                    label="Bank Name"
                    placeholder="Enter bank name"
                    value={formData.bankDetails?.bankName}
                    onChange={(v) => setFormData((p) => ({ ...p, bankDetails: { ...p.bankDetails, bankName: v } }))}
                  />
                  <Input
                    label="Bank Account Number"
                    type="tel"
                    maxLength={18}
                    placeholder="Enter bank account number"
                    value={formData.bankDetails?.accountNumber}
                    error={formErrors.accountNumber}
                    onClearError={() => clearError("accountNumber")}
                    onBlur={() => {
                      if (formData.bankDetails?.accountNumber) validateField("accountNumber", formData.bankDetails.accountNumber);
                    }}
                    onChange={(v) => {
                      const digits = v.replace(/\D/g, "").slice(0, 18);
                      setFormData((p) => ({ ...p, bankDetails: { ...p.bankDetails, accountNumber: digits } }));
                      if (digits) validateField("accountNumber", digits);
                      else clearError("accountNumber");
                    }}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <Input
                    label="IFSC Code"
                    maxLength={11}
                    placeholder="Enter 11-character IFSC code (e.g. SBIN0001234)"
                    value={formData.bankDetails?.ifscCode}
                    error={formErrors.ifscCode}
                    onClearError={() => clearError("ifscCode")}
                    onBlur={() => {
                      if (formData.bankDetails?.ifscCode) validateField("ifscCode", formData.bankDetails.ifscCode);
                    }}
                    onChange={(v) => {
                      const ifsc = v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11);
                      setFormData((p) => ({ ...p, bankDetails: { ...p.bankDetails, ifscCode: ifsc } }));
                      if (ifsc) validateField("ifscCode", ifsc);
                      else clearError("ifscCode");
                    }}
                  />
                  <Select
                    label="Account Type"
                    value={formData.bankDetails?.accountType}
                    onChange={(v) => setFormData((p) => ({ ...p, bankDetails: { ...p.bankDetails, accountType: v } }))}
                    options={[
                      { value: "savings", label: "Savings Account" },
                      { value: "current", label: "Salary / Current Account" },
                    ]}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Document Vault */}
          {activeStep === 6 && (
            <div className="space-y-3 animate-fadeIn">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText size={16} className="text-amber-500" /> Employee Document Vault
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">Attach Aadhaar, PAN, Resume, Offer Letter or Certificates</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0B101B] border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2">
                <FileCheck size={28} className="mx-auto text-amber-500" />
                <p className="text-xs font-black text-slate-900 dark:text-white">Upload Candidate Verified Proofs</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">PDF, PNG, JPG files up to 5MB supported</p>
                <input
                  type="file"
                  id="vaultDocUpload"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      setFormData((prev) => ({
                        ...prev,
                        documents: [
                          ...(prev.documents || []),
                          {
                            title: file.name,
                            url: reader.result,
                            type: file.type.includes("pdf") ? "pdf" : "image",
                            uploadedAt: new Date().toISOString(),
                          },
                        ],
                      }));
                      toast.success(`Attached ${file.name}`);
                    };
                    reader.readAsDataURL(file);
                  }}
                />
                <button
                  type="button"
                  onClick={() => document.getElementById("vaultDocUpload")?.click()}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-2xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Upload size={13} strokeWidth={2.5} />
                  <span>Choose File to Attach</span>
                </button>
              </div>

              <div className="space-y-2">
                {(formData.documents || []).map((doc, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-amber-500" />
                      <span className="font-bold text-slate-900 dark:text-white truncate max-w-xs">{doc.title}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, documents: p.documents.filter((_, i) => i !== idx) }))}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 7: Review & Final Submit */}
          {activeStep === 7 && (
            <div className="space-y-3 animate-fadeIn">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCheck size={16} className="text-amber-500" /> Final Review &amp; Confirm
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">Verify all candidate details before registration</p>
              </div>

              {/* ── Section 1: Basic Info ── */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
                  <User size={13} className="text-amber-500" />
                  <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">Basic Information</span>
                  <button type="button" onClick={() => setActiveStep(1)} className="ml-auto text-[10px] font-black text-amber-600 dark:text-amber-400 hover:underline cursor-pointer">Edit</button>
                </div>
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5 text-xs">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Full Name</p>
                    <p className="font-black text-slate-900 dark:text-white">{displayName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Email</p>
                    <p className="font-semibold text-slate-700 dark:text-slate-200 break-all">{formData.email || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Mobile</p>
                    <p className="font-semibold font-mono text-slate-700 dark:text-slate-200">{formData.phone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Gender</p>
                    <p className="font-semibold capitalize text-slate-700 dark:text-slate-200">{formData.gender || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Date of Birth</p>
                    <p className="font-semibold text-slate-700 dark:text-slate-200">{formData.dateOfBirth ? new Date(formData.dateOfBirth).toLocaleDateString("en-IN") : "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Marital Status</p>
                    <p className="font-semibold capitalize text-slate-700 dark:text-slate-200">{formData.maritalStatus || "—"}</p>
                  </div>
                </div>
              </div>

              {/* ── Section 2: Job Details ── */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
                  <Briefcase size={13} className="text-amber-500" />
                  <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">Job & Role Details</span>
                  <button type="button" onClick={() => setActiveStep(2)} className="ml-auto text-[10px] font-black text-amber-600 dark:text-amber-400 hover:underline cursor-pointer">Edit</button>
                </div>
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5 text-xs">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">System Role</p>
                    <span className="px-2 py-0.5 rounded-lg text-[10.5px] font-black bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 uppercase">{formData.role || "Employee"}</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Department(s)</p>
                    <p className="font-semibold text-slate-700 dark:text-slate-200">{selectedDeptName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Designation</p>
                    <p className="font-semibold text-slate-700 dark:text-slate-200">{selectedDesigName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Branch Office(s)</p>
                    <p className="font-semibold text-slate-700 dark:text-slate-200">
                      {(Array.isArray(formData.branchIds) && formData.branchIds.length > 0
                        ? formData.branchIds
                        : formData.branchId ? [formData.branchId] : []
                      ).map(id => {
                        const b = branches.find(x => x._id === id);
                        return b ? (b.branchName || b.name) : id;
                      }).join(", ") || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Employment Type</p>
                    <p className="font-semibold capitalize text-slate-700 dark:text-slate-200">{(formData.employmentType || "").replace(/_/g, " ")}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Work Mode</p>
                    <p className="font-semibold capitalize text-slate-700 dark:text-slate-200">{formData.workMode || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Joining Date</p>
                    <p className="font-semibold text-slate-700 dark:text-slate-200">{formData.joiningDate ? new Date(formData.joiningDate).toLocaleDateString("en-IN") : "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Reporting Manager</p>
                    <p className="font-semibold text-slate-700 dark:text-slate-200">
                      {formData.reportingManagerId
                        ? (managerOptions.find(m => m.value === formData.reportingManagerId)?.label || "—")
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Remote Punch</p>
                    <span className={`px-2 py-0.5 rounded-lg text-[10.5px] font-black border ${formData.allowRemotePunch ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"}`}>
                      {formData.allowRemotePunch ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Section 3: Address & Emergency ── */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
                  <MapPin size={13} className="text-amber-500" />
                  <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">Address & Emergency Contact</span>
                  <button type="button" onClick={() => setActiveStep(3)} className="ml-auto text-[10px] font-black text-amber-600 dark:text-amber-400 hover:underline cursor-pointer">Edit</button>
                </div>
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5 text-xs">
                  <div className="col-span-2 sm:col-span-3">
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Current Address</p>
                    <p className="font-semibold text-slate-700 dark:text-slate-200">
                      {[formData.address?.street, formData.address?.city, formData.address?.state, formData.address?.pincode, formData.address?.country].filter(Boolean).join(", ") || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Emergency Contact</p>
                    <p className="font-semibold text-slate-700 dark:text-slate-200">{formData.emergencyContact?.name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Relationship</p>
                    <p className="font-semibold text-slate-700 dark:text-slate-200">{formData.emergencyContact?.relationship || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Emergency Phone</p>
                    <p className="font-semibold font-mono text-slate-700 dark:text-slate-200">{formData.emergencyContact?.phone || "—"}</p>
                  </div>
                </div>
              </div>

              {/* ── Section 4: Salary Summary ── */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
                  <DollarSign size={13} className="text-amber-500" />
                  <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">Salary & Compensation</span>
                  <button type="button" onClick={() => setActiveStep(4)} className="ml-auto text-[10px] font-black text-amber-600 dark:text-amber-400 hover:underline cursor-pointer">Edit</button>
                </div>
                <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Annual CTC</p>
                    <p className="font-black font-mono text-slate-900 dark:text-white">₹{(Number(formData.salaryDetails?.ctc) || 0).toLocaleString("en-IN")}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-500/5 border border-blue-200 dark:border-blue-900/40">
                    <p className="text-[10px] font-black uppercase text-blue-500 mb-0.5">Monthly Gross</p>
                    <p className="font-black font-mono text-blue-700 dark:text-blue-400">₹{(Number(formData.salaryDetails?.grossSalary) || 0).toLocaleString("en-IN")}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-500/5 border border-rose-200 dark:border-rose-900/40">
                    <p className="text-[10px] font-black uppercase text-rose-500 mb-0.5">Deductions</p>
                    <p className="font-black font-mono text-rose-600 dark:text-rose-400">-₹{(Number(formData.salaryDetails?.totalDeductions) || 0).toLocaleString("en-IN")}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                    <p className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 mb-0.5">Net In-Hand</p>
                    <p className="font-black font-mono text-emerald-700 dark:text-emerald-400">₹{(Number(formData.salaryDetails?.netSalary) || 0).toLocaleString("en-IN")}</p>
                  </div>
                </div>
                <div className="px-4 pb-4 grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[
                    { label: "Basic", val: formData.salaryDetails?.basic },
                    { label: "HRA", val: formData.salaryDetails?.hra },
                    { label: "Special", val: formData.salaryDetails?.specialAllowance },
                    { label: "Conveyance", val: formData.salaryDetails?.conveyance },
                    { label: "Medical", val: formData.salaryDetails?.medicalAllowance },
                    { label: "Other", val: formData.salaryDetails?.otherAllowance },
                  ].map(({ label, val }) => (
                    <div key={label} className="text-center p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                      <p className="text-[9.5px] font-black uppercase text-slate-400">{label}</p>
                      <p className="font-black font-mono text-slate-800 dark:text-slate-200 text-xs">₹{(Number(val) || 0).toLocaleString("en-IN")}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Section 5: Bank & Identity ── */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
                  <CreditCard size={13} className="text-amber-500" />
                  <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">Bank & Identity</span>
                  <button type="button" onClick={() => setActiveStep(5)} className="ml-auto text-[10px] font-black text-amber-600 dark:text-amber-400 hover:underline cursor-pointer">Edit</button>
                </div>
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5 text-xs">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Bank Name</p>
                    <p className="font-semibold text-slate-700 dark:text-slate-200">{formData.bankDetails?.bankName || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Account Number</p>
                    <p className="font-semibold font-mono text-slate-700 dark:text-slate-200">
                      {formData.bankDetails?.accountNumber
                        ? `${"•".repeat(Math.max(0, formData.bankDetails.accountNumber.length - 4))}${formData.bankDetails.accountNumber.slice(-4)}`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">IFSC Code</p>
                    <p className="font-semibold font-mono text-slate-700 dark:text-slate-200">{formData.bankDetails?.ifscCode || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Account Type</p>
                    <p className="font-semibold capitalize text-slate-700 dark:text-slate-200">{formData.bankDetails?.accountType || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Aadhaar</p>
                    <p className="font-semibold font-mono text-slate-700 dark:text-slate-200">
                      {formData.aadhaarNumber
                        ? `XXXX-XXXX-${formData.aadhaarNumber.slice(-4)}`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">PAN Number</p>
                    <p className="font-semibold font-mono text-slate-700 dark:text-slate-200">{formData.panNumber || "—"}</p>
                  </div>
                </div>
              </div>

              {/* ── Section 6: Module Licenses ── */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
                  <Cpu size={13} className="text-amber-500" />
                  <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Module Licenses ({(formData.assignedModules || []).filter((m) => subscribedModules.includes(m)).length} Assigned)
                  </span>
                  <button type="button" onClick={() => setActiveStep(2)} className="ml-auto text-[10px] font-black text-amber-600 dark:text-amber-400 hover:underline cursor-pointer">Edit</button>
                </div>
                <div className="p-4 flex flex-wrap gap-2">
                  {(formData.assignedModules || []).filter((m) => subscribedModules.includes(m)).length === 0 ? (
                    <span className="text-[11px] text-slate-400 italic">No modules assigned</span>
                  ) : (
                    (formData.assignedModules || []).filter((m) => subscribedModules.includes(m)).map((mKey) => {
                      const mod = ALL_MODULES.find((x) => x.key === mKey);
                      return (
                        <span key={mKey} className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 flex items-center gap-1">
                          <CheckCircle2 size={11} /> {mod?.label || mKey}
                        </span>
                      );
                    })
                  )}
                </div>
              </div>

              {/* ── Documents (conditional) ── */}
              {Array.isArray(formData.documents) && formData.documents.length > 0 && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
                    <FileText size={13} className="text-amber-500" />
                    <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">Documents ({formData.documents.length})</span>
                    <button type="button" onClick={() => setActiveStep(6)} className="ml-auto text-[10px] font-black text-amber-600 dark:text-amber-400 hover:underline cursor-pointer">Edit</button>
                  </div>
                  <div className="p-4 flex flex-wrap gap-2">
                    {formData.documents.map((doc, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                        <FileText size={11} className="text-amber-500" /> {doc.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ── CTA Banner ── */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10.5px] font-black text-emerald-800 dark:text-emerald-300 uppercase">Annual CTC Compensation</span>
                  <h4 className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    ₹{(Number(formData.salaryDetails?.ctc) || 0).toLocaleString("en-IN")} / year
                  </h4>
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-3 mt-0.5">
                    <span>Gross: <strong>₹{(Number(formData.salaryDetails?.grossSalary) || 0).toLocaleString("en-IN")}/mo</strong></span>
                    <span>•</span>
                    <span>Net Take-Home: <strong className="text-emerald-600 dark:text-emerald-400">₹{(Number(formData.salaryDetails?.netSalary) || 0).toLocaleString("en-IN")}/mo</strong></span>
                  </div>
                </div>
                <span className="px-3.5 py-1.5 bg-emerald-500 text-slate-950 font-black rounded-xl text-xs shadow-2xs self-start sm:self-auto flex items-center gap-1.5">
                  <CheckCircle2 size={13} /> Ready to Register
                </span>
              </div>
            </div>
          )}

          {/* ── Footer Navigation Buttons ─────────────────────────────────── */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 mt-6 gap-3">
            <button
              type="button"
              disabled={activeStep === 1}
              onClick={() => { setFormErrors({}); setActiveStep((s) => Math.max(1, s - 1)); }}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1"
            >
              <ChevronLeft size={14} /> <span>Previous</span>
            </button>

            <div className="flex items-center gap-2">
              {activeStep < 7 ? (
                <button
                  type="button"
                  onClick={validateAndNext}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1"
                >
                  <span>Next Step</span> <ChevronRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={createMutation.isPending}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>Confirm &amp; Register Employee</span>
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── Quick Create Modals ─────────────────────────────────────────── */}
      {quickModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs font-sans animate-fadeIn">
          <div className="bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-sm w-full p-4 space-y-3 animate-scaleUp">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {quickModal === "dept" && "Add New Department"}
                {quickModal === "desig" && "Add New Designation"}
                {quickModal === "branch" && "Add New Branch Office"}
              </h3>
              <button onClick={() => setQuickModal(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleQuickSubmit} className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Name</label>
                <input
                  type="text"
                  required
                  placeholder="Enter department or designation name"
                  value={quickForm.name}
                  onChange={(e) => setQuickForm({ ...quickForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0D1321] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                />
              </div>

              {quickModal === "branch" && (
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">City</label>
                  <input
                    type="text"
                    placeholder="Enter branch city name"
                    value={quickForm.city}
                    onChange={(e) => setQuickForm({ ...quickForm, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0D1321] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickModal(null)}
                  className="flex-1 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickSaving}
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-extrabold shadow-sm flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {quickSaving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  <span>Save</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Upgrade Plan Popup Modal ─────────────────────────────────────── */}
      {upgradePlanModal && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setUpgradePlanModal(null)}
        >
          <div
            className="bg-white dark:bg-[#0D1321] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Top gradient bar */}
            <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg, #f43f5e, #f97316, #f59e0b)" }} />

            {/* Header */}
            <div className="px-6 pt-5 pb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-200 dark:border-rose-900 flex items-center justify-center flex-shrink-0">
                  <Zap size={18} className="text-rose-500" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                    Module Seat Limit Reached
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    {upgradePlanModal.label} module
                  </p>
                </div>
              </div>
              <button
                onClick={() => setUpgradePlanModal(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <X size={15} />
              </button>
            </div>

            {/* Usage Stats */}
            <div className="mx-6 mb-4 p-4 rounded-xl bg-rose-50 dark:bg-rose-500/5 border border-rose-200 dark:border-rose-900/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                  {upgradePlanModal.label} Seat Usage
                </span>
                <span className="text-xs font-black text-rose-600 dark:text-rose-400 font-mono">
                  {upgradePlanModal.used} / {upgradePlanModal.limit}
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-rose-200 dark:bg-rose-900/40 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-400 transition-all"
                  style={{ width: "100%" }}
                />
              </div>
              <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold mt-1.5">
                All {upgradePlanModal.limit} seats are allocated. No remaining seats for <strong>{upgradePlanModal.label}</strong>.
              </p>
            </div>

            {/* Body */}
            <div className="px-6 pb-4 space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                Your current plan has a limit of{" "}
                <strong className="text-slate-900 dark:text-white">{upgradePlanModal.limit} employee seats</strong> for the{" "}
                <strong className="text-slate-900 dark:text-white">{upgradePlanModal.label}</strong> module.
                To assign this module to more employees, please upgrade your subscription plan.
              </p>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-900/40 flex items-start gap-2">
                <Sparkles size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-[10.5px] text-amber-700 dark:text-amber-400 font-semibold leading-snug">
                  Upgrading your plan will increase the seat cap for all modules including{" "}
                  {upgradePlanModal.label}, Attendance, Tasks, Leads and more.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 pb-5 flex gap-2.5">
              <button
                type="button"
                onClick={() => setUpgradePlanModal(null)}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all"
              >
                Cancel
              </button>
              <a
                href="/company/requests"
                className="flex-1 py-2.5 rounded-xl text-xs font-extrabold text-white flex items-center justify-center gap-1.5 transition-all hover:opacity-90 shadow-sm"
                style={{ background: "linear-gradient(135deg, #f43f5e, #f97316)" }}
              >
                <Zap size={13} />
                <span>Request Plan Upgrade</span>
                <ArrowUpRight size={12} />
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}