import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  createEmployeeApi, getDepartmentsApi, getDesignationsApi,
  getBranchesApi, getEmployeesApi, createDepartmentApi,
  createDesignationApi, createBranchApi, getModuleUsageApi
} from "../../api/companyAdminApi";
import { useAuth } from "../../context/AuthContext";
import {
  User, Mail, Phone, MapPin, Briefcase, CreditCard, ShieldCheck,
  FileText, Coins, Award, Camera, Save, ArrowLeft, ChevronDown,
  ChevronUp, CheckCircle2, X, Lock, Download, AlertTriangle, RefreshCw,
  Plus, Loader2, Building2, CalendarDays, Upload, Eye, ChevronRight,
  ChevronLeft, CheckCheck, Trash2, ExternalLink, Sparkles, Shield,
  DollarSign, Users, AlertCircle, FileCheck, Calendar, Cpu, Zap, ArrowUpRight
} from "lucide-react";

const ALL_MODULES = [
  { key: "tasks", label: "Tasks Management", desc: "Create, execute and review tasks" },
  { key: "leads", label: "Lead Engine & CRM", desc: "Manage leads & WhatsApp campaigns" },
  { key: "attendance", label: "Attendance & Bio-Punch", desc: "Punches, shifts & regularization" },
  { key: "leave", label: "Leaves & Holidays", desc: "Apply leaves & view holiday roster" },
  { key: "payroll", label: "Salary & Payslips", desc: "View payslips & salary structures" },
  { key: "projects", label: "Project Workspace", desc: "Milestones, sprints & task boards" },
  { key: "reports", label: "Analytics & Reports", desc: "View operational reports & analytics" },
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

// ── Step Definitions ────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Basic Info", icon: User, desc: "Personal info & avatar" },
  { id: 2, label: "Job Details", icon: Briefcase, desc: "Role & department" },
  { id: 3, label: "Address & Contact", icon: MapPin, desc: "Location & emergency" },
  { id: 4, label: "Salary & Compensation", icon: DollarSign, desc: "CTC, allowances & tax" },
  { id: 5, label: "Bank & Identity", icon: CreditCard, desc: "Banking & PAN/Aadhaar" },
  { id: 6, label: "Document Vault", icon: FileText, desc: "Upload files & proofs" },
  { id: 7, label: "Review & Create", icon: CheckCheck, desc: "Final verification" },
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

const Input = ({ label, type = "text", value, onChange, onBlur, placeholder, disabled = false, required = false, hint, className = "", error, onClearError, maxLength }) => (
  <Field label={label} required={required} hint={hint} className={className} error={error}>
    <input
      type={type === "email" ? "text" : type === "tel" ? "text" : type}
      inputMode={type === "email" ? "email" : type === "tel" ? "numeric" : type === "number" ? "numeric" : undefined}
      value={value ?? ""}
      maxLength={maxLength}
      onChange={(e) => { if (onClearError) onClearError(); onChange(e.target.value); }}
      onBlur={onBlur}
      disabled={disabled}
      placeholder={placeholder}
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

const Select = ({ label, value, onChange, options, disabled = false, required = false, placeholder = "Select...", action, hint, className = "", error, onClearError }) => (
  <Field label={label} required={required} action={action} hint={hint} className={className} error={error}>
    <div className="relative">
      <select
        value={value ?? ""}
        onChange={(e) => { if (onClearError) onClearError(); onChange(e.target.value); }}
        disabled={disabled}
        className={`w-full appearance-none pl-3.5 pr-9 py-2.5 bg-slate-50 dark:bg-[#0B101B] border rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none transition-all cursor-pointer ${
          error
            ? "border-rose-400 dark:border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 bg-rose-50/30 dark:bg-rose-900/10"
            : "border-slate-300 dark:border-slate-700/90 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
        } ${
          disabled ? "opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-900" : ""
        }`}
      >
        <option value="" disabled className="bg-white dark:bg-[#111C24] text-slate-400">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-white dark:bg-[#111C24] text-slate-900 dark:text-white font-semibold">
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
    </div>
  </Field>
);

const MultiSelect = ({ label, selected = [], onChange, options, disabled = false, required = false, placeholder = "Select departments...", action }) => {
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
    if (selected.includes(val)) onChange(selected.filter((v) => v !== val));
    else onChange([...selected, val]);
  };

  const selectedLabels = options.filter((o) => selected.includes(o.value)).map((o) => o.label).join(", ");

  return (
    <Field label={label} required={required} action={action}>
      <div className="relative" ref={containerRef}>
        <div
          className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#0B101B] border border-slate-300 dark:border-slate-700/90 rounded-xl text-xs font-bold text-slate-900 dark:text-white transition-all flex items-center justify-between min-h-[40px] cursor-pointer hover:border-amber-500/60 ${
            disabled ? "opacity-60 cursor-not-allowed" : ""
          }`}
          onClick={() => !disabled && setOpen(!open)}
        >
          <span className="truncate">
            {selected.length ? selectedLabels : <span className="text-slate-400 font-normal">{placeholder}</span>}
          </span>
          <ChevronDown size={14} className="text-slate-400 shrink-0 ml-2" />
        </div>

        {open && (
          <div className="absolute z-50 w-full mt-1.5 bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-56 overflow-y-auto p-1.5 space-y-1 animate-fadeIn">
            {options.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-500 dark:text-slate-400">No departments available</div>
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
  const baseRoute = isHR ? "/hr" : "/company";

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
    reportingManagerId: "",
    role: "Employee",
    managerAccessLevel: "department",
    employmentType: "full_time",
    workMode: "office",
    allowRemotePunch: false,
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
      ctc: 360000,
      basicSalary: 180000,
      hra: 72000,
      conveyance: 19200,
      medicalAllowance: 15000,
      specialAllowance: 73800,
      otherAllowance: 0,
      pfEmployee: 21600,
      pfEmployer: 21600,
      esiEmployee: 0,
      esiEmployer: 0,
      professionalTax: 2400,
      tds: 0,
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

  // Queries
  const { data: deptRes } = useQuery({ queryKey: ["departments"], queryFn: () => getDepartmentsApi().then((r) => r.data) });
  const { data: desigRes } = useQuery({ queryKey: ["designations"], queryFn: () => getDesignationsApi().then((r) => r.data) });
  const { data: branchRes } = useQuery({ queryKey: ["branches"], queryFn: () => getBranchesApi().then((r) => r.data) });
  const { data: empRes } = useQuery({ queryKey: ["allEmployees"], queryFn: () => getEmployeesApi({ limit: 1000 }).then((r) => r.data) });
  const { data: moduleUsageRes } = useQuery({ queryKey: ["companyModuleUsage"], queryFn: () => getModuleUsageApi().then((r) => r.data) });

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

  const departments = deptRes?.departments || [];
  const designations = desigRes?.designations || [];
  const branches = branchRes?.branches || [];
  const managers = empRes?.employees || [];

  const deptOptions = departments.map((d) => ({ value: d._id, label: d.name }));
  const desigOptions = designations.map((d) => ({ value: d._id, label: `${d.name} (${d.departmentId?.name || "General"})` }));
  const branchOptions = branches.map((b) => ({ value: b._id, label: `${b.branchName} (${b.city || ""})` }));
  const managerOptions = managers.map((m) => ({ value: m._id, label: `${m.firstName} ${m.lastName} (${m.employeeCode || "Staff"})` }));

  // Auto-calculate Indian Salary Split when CTC changes
  const handleCtcChange = (annualCtc) => {
    const ctc = Number(annualCtc) || 0;
    const basic = Math.round(ctc * 0.5);
    const hra = Math.round(basic * 0.4);
    const conveyance = 19200;
    const medical = 15000;
    const pfEmp = Math.round(basic * 0.12);
    const pfEmplr = Math.round(basic * 0.12);
    const pt = 2400;
    const special = Math.max(0, ctc - (basic + hra + conveyance + medical + pfEmplr));

    setFormData((prev) => ({
      ...prev,
      salaryDetails: {
        ctc,
        basicSalary: basic,
        hra,
        conveyance,
        medicalAllowance: medical,
        specialAllowance: special,
        otherAllowance: 0,
        pfEmployee: pfEmp,
        pfEmployer: pfEmplr,
        esiEmployee: 0,
        esiEmployer: 0,
        professionalTax: pt,
        tds: 0,
      },
    }));
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
        queryClient.invalidateQueries(["departments"]);
        const newDeptId = res.data?.department?._id;
        if (newDeptId) {
          setFormData((prev) => ({
            ...prev,
            accessibleDepartments: [...(prev.accessibleDepartments || []), newDeptId],
            departmentId: prev.departmentId || newDeptId,
          }));
        }
        toast.success("Department created!");
      } else if (quickModal === "desig") {
        const res = await createDesignationApi({ name: quickForm.name, departmentId: quickForm.departmentId || formData.accessibleDepartments?.[0] });
        queryClient.invalidateQueries(["designations"]);
        const newDesigId = res.data?.designation?._id;
        if (newDesigId) setFormData((prev) => ({ ...prev, designationId: newDesigId }));
        toast.success("Designation created!");
      } else if (quickModal === "branch") {
        const res = await createBranchApi({ branchName: quickForm.name, city: quickForm.city });
        queryClient.invalidateQueries(["branches"]);
        const newBranchId = res.data?.branch?._id;
        if (newBranchId) setFormData((prev) => ({ ...prev, branchId: newBranchId }));
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
      navigate(`${baseRoute}/employees`);
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
      if (rl) errors.role = rl;
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

      departmentId: formData.accessibleDepartments?.[0] || formData.departmentId || undefined,
      accessibleDepartments: formData.accessibleDepartments || [],
      designationId: formData.designationId || undefined,
      branchId: formData.branchId || undefined,
      reportingManagerId: formData.reportingManagerId || undefined,
      role: formData.role || "Employee",
      loginRole: formData.role || "Employee",
      managerAccessLevel: formData.role === "Manager" || formData.role === "HR" ? formData.managerAccessLevel : undefined,
      employmentType: sanitizeEmploymentType(formData.employmentType),
      workMode: formData.workMode || "office",
      allowRemotePunch: formData.allowRemotePunch || false,
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
  const selectedDeptName = departments.find((d) => formData.accessibleDepartments?.includes(d._id))?.name || "General";
  const selectedDesigName = designations.find((d) => d._id === formData.designationId)?.name || "Staff";

  return (
    <div className="min-h-screen pb-24 space-y-5 max-w-[1400px] mx-auto font-sans text-slate-900 dark:text-slate-100">
      
      {/* ── Top Executive Header ────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              to={`${baseRoute}/employees`}
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
                    ? "bg-amber-500 text-slate-950 font-black shadow-xs"
                    : isDone
                    ? "bg-slate-50 dark:bg-slate-900/80 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/60"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive
                      ? "bg-slate-950/20 text-slate-950"
                      : isDone
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {isDone ? <CheckCheck size={14} /> : <Icon size={14} />}
                </div>
                <div className="min-w-0">
                  <p className={`text-[11.5px] leading-tight truncate ${isActive ? "font-black text-slate-950" : "font-extrabold text-slate-800 dark:text-slate-200"}`}>
                    {step.label}
                  </p>
                  <p className={`text-[9.5px] truncate font-medium ${isActive ? "text-slate-950/80" : "text-slate-500 dark:text-slate-400"}`}>
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

              <Input
                label="Custom Initial Password"
                type="text"
                placeholder="Enter initial password (optional)"
                value={formData.password}
                onChange={(v) => setFormData((p) => ({ ...p, password: v }))}
                hint="Default is employee's phone number or secure random string"
              />
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
                  value={formData.role}
                  error={formErrors.role}
                  onClearError={() => clearError("role")}
                  onChange={(v) => setFormData((p) => ({ ...p, role: v }))}
                  options={[
                    { value: "Employee", label: "Employee (Standard Staff)" },
                    { value: "Manager", label: "Manager (Team & Task Leader)" },
                    { value: "HR", label: "HR (Human Resources Manager)" },
                  ]}
                />
                <Select
                  label="Branch Office"
                  value={formData.branchId}
                  onChange={(v) => setFormData((p) => ({ ...p, branchId: v }))}
                  options={branchOptions}
                  placeholder="Select Branch..."
                  action={
                    <button
                      type="button"
                      onClick={() => { setQuickModal("branch"); setQuickForm({ name: "", city: "" }); }}
                      className="text-[10.5px] text-amber-600 dark:text-amber-400 font-black hover:underline"
                    >
                      + New Branch
                    </button>
                  }
                />
              </div>

              <MultiSelect
                label="Accessible Departments (Multi-Select)"
                selected={formData.accessibleDepartments}
                onChange={(v) => setFormData((p) => ({ ...p, accessibleDepartments: v, departmentId: v[0] || "" }))}
                options={deptOptions}
                placeholder="Select accessible departments..."
                action={
                  <button
                    type="button"
                    onClick={() => { setQuickModal("dept"); setQuickForm({ name: "", code: "" }); }}
                    className="text-[10.5px] text-amber-600 dark:text-amber-400 font-black hover:underline"
                  >
                    + New Department
                  </button>
                }
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Select
                  label="Job Designation"
                  value={formData.designationId}
                  onChange={(v) => setFormData((p) => ({ ...p, designationId: v }))}
                  options={desigOptions}
                  placeholder="Select Designation..."
                  action={
                    <button
                      type="button"
                      onClick={() => { setQuickModal("desig"); setQuickForm({ name: "", departmentId: formData.accessibleDepartments?.[0] || "" }); }}
                      className="text-[10.5px] text-amber-600 dark:text-amber-400 font-black hover:underline"
                    >
                      + New Designation
                    </button>
                  }
                />
                <Select
                  label="Reporting Manager"
                  value={formData.reportingManagerId}
                  onChange={(v) => setFormData((p) => ({ ...p, reportingManagerId: v }))}
                  options={managerOptions}
                  placeholder="Select Reporting Manager..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
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

                {ALL_MODULES.filter((m) => subscribedModules.includes(m.key)).length === 0 ? (
                  <div className="p-4 rounded-xl bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
                    No suite modules subscribed in current company plan.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {ALL_MODULES.filter((m) => subscribedModules.includes(m.key)).map((m) => {
                      const usageInfo = moduleUsage[m.key];
                      const isFull = usageInfo && !usageInfo.isUnlimited && usageInfo.remaining <= 0;
                      const isChecked = (formData.assignedModules || []).includes(m.key);

                      return (
                        <div
                          key={m.key}
                          onClick={() => {
                            if (isFull && !isChecked) {
                              // Show upgrade plan popup
                              setUpgradePlanModal({
                                moduleName: m.key,
                                label: m.label,
                                used: usageInfo?.used || 0,
                                limit: usageInfo?.limit || 0,
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

                          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-bold">
                            {usageInfo?.isUnlimited ? (
                              <span className="text-emerald-600 dark:text-emerald-400">Full plan seats ({usageInfo.used} used)</span>
                            ) : isFull && !isChecked ? (
                              <span className="text-rose-500 flex items-center gap-1">
                                <Zap size={9} /> Limit full — Upgrade Plan
                              </span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400">
                                {usageInfo?.used || 0}/{usageInfo?.limit || 0} seats used {usageInfo?.remaining > 0 ? `(${usageInfo.remaining} left)` : "(Full)"}
                              </span>
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
            <div className="space-y-3 animate-fadeIn">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <DollarSign size={16} className="text-amber-500" /> Salary Structure &amp; Allowances
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">Standard Indian payroll breakup with automatic CTC calculation</p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10.5px] font-black uppercase text-amber-900 dark:text-amber-300 tracking-wider">
                    Annual Cost to Company (CTC)
                  </span>
                  <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
                    ₹{(Number(formData.salaryDetails?.ctc) || 0).toLocaleString("en-IN")}
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Auto-splits Basic, HRA, PF &amp; Special Allowance</span>
                </div>

                <div className="w-full sm:w-48">
                  <label className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300 uppercase block mb-1">Set Annual CTC (₹)</label>
                  <input
                    type="number"
                    value={formData.salaryDetails?.ctc}
                    onChange={(e) => handleCtcChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#0B101B] border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-black text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <Input
                  label="Basic Salary (Annual)"
                  type="number"
                  placeholder="Enter basic salary"
                  value={formData.salaryDetails?.basicSalary}
                  onChange={(v) => setFormData((p) => ({ ...p, salaryDetails: { ...p.salaryDetails, basicSalary: Number(v) } }))}
                />
                <Input
                  label="House Rent Allowance (HRA)"
                  type="number"
                  placeholder="Enter house rent allowance"
                  value={formData.salaryDetails?.hra}
                  onChange={(v) => setFormData((p) => ({ ...p, salaryDetails: { ...p.salaryDetails, hra: Number(v) } }))}
                />
                <Input
                  label="Special Allowance"
                  type="number"
                  placeholder="Enter special allowance"
                  value={formData.salaryDetails?.specialAllowance}
                  onChange={(v) => setFormData((p) => ({ ...p, salaryDetails: { ...p.salaryDetails, specialAllowance: Number(v) } }))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <Input
                  label="Provident Fund (Employee)"
                  type="number"
                  placeholder="Enter provident fund deduction"
                  value={formData.salaryDetails?.pfEmployee}
                  onChange={(v) => setFormData((p) => ({ ...p, salaryDetails: { ...p.salaryDetails, pfEmployee: Number(v) } }))}
                />
                <Input
                  label="Professional Tax (PT)"
                  type="number"
                  placeholder="Enter professional tax"
                  value={formData.salaryDetails?.professionalTax}
                  onChange={(v) => setFormData((p) => ({ ...p, salaryDetails: { ...p.salaryDetails, professionalTax: Number(v) } }))}
                />
                <Input
                  label="TDS / Tax Withholding"
                  type="number"
                  placeholder="Enter TDS deduction"
                  value={formData.salaryDetails?.tds}
                  onChange={(v) => setFormData((p) => ({ ...p, salaryDetails: { ...p.salaryDetails, tds: Number(v) } }))}
                />
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
                  <CheckCheck size={16} className="text-amber-500" /> Final Review &amp; Onboarding Confirmation
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">Verify all candidate details before database registration</p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">Candidate</span>
                  <p className="font-black text-slate-900 dark:text-white text-sm">{displayName}</p>
                  <p className="text-slate-600 dark:text-slate-300 font-semibold">{formData.email}</p>
                  <p className="text-slate-500 dark:text-slate-400 font-mono">{formData.phone}</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">Designation &amp; Role</span>
                  <p className="font-black text-slate-900 dark:text-white text-sm">{selectedDesigName}</p>
                  <p className="text-slate-600 dark:text-slate-300 font-semibold">{selectedDeptName} Department</p>
                  <p className="text-amber-600 dark:text-amber-400 font-black uppercase">{formData.role}</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
                  <Cpu size={13} className="text-amber-500" />
                  Assigned Module Licenses ({(formData.assignedModules || []).filter((m) => subscribedModules.includes(m)).length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(formData.assignedModules || [])
                    .filter((m) => subscribedModules.includes(m))
                    .map((mKey) => {
                      const mod = ALL_MODULES.find((x) => x.key === mKey);
                      return (
                        <span
                          key={mKey}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                        >
                          {mod?.label || mKey}
                        </span>
                      );
                    })}
                  {(!formData.assignedModules || formData.assignedModules.filter((m) => subscribedModules.includes(m)).length === 0) && (
                    <span className="text-[11px] text-slate-400 italic">No modules assigned</span>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-[10.5px] font-black text-emerald-800 dark:text-emerald-300 uppercase">Annual CTC Compensation</span>
                  <h4 className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    ₹{(Number(formData.salaryDetails?.ctc) || 0).toLocaleString("en-IN")}
                  </h4>
                </div>
                <span className="px-3.5 py-1.5 bg-emerald-500 text-slate-950 font-black rounded-xl text-xs shadow-2xs self-start sm:self-auto">
                  Ready to Register
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