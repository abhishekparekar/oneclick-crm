import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  getDepartmentsApi, getDesignationsApi, getBranchesApi,
  getEmployeesApi, createEmployeeApi,
  createDepartmentApi, createDesignationApi, createBranchApi,
  getLeaveSettingsApi,
} from "../../api/companyAdminApi";
import {
  ArrowLeft, ChevronRight, ChevronLeft, ChevronDown, CheckCircle2,
  User, Briefcase, Phone, DollarSign, FileText, Eye,
  Camera, Upload, X, Building2, MapPin, Users,
  Mail, Shield, Calendar, Hash, Banknote, CreditCard,
  AlertCircle, CheckCheck, Loader2, Save, Plus,
} from "lucide-react";

// ── Step definitions ──────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Basic Info", icon: User },
  { id: 2, label: "Job Details", icon: Briefcase },
  { id: 3, label: "Contact", icon: Phone },
  { id: 4, label: "Salary", icon: DollarSign },
  { id: 5, label: "Identity", icon: Shield },
  { id: 6, label: "Review", icon: Eye },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const genCode = () => "EMP-" + Math.random().toString(36).substring(2, 7).toUpperCase();
const n = (v) => parseFloat(v) || 0;
const fmt = (v) => v ? `₹${Number(v).toLocaleString("en-IN")}` : "₹0";

// ── Shared field components ───────────────────────────────────────────────────
const Field = ({ label, required, children, half = false, className = "", action }) => (
  <div className={`${half ? "" : ""} ${className}`}>
    <div className="flex items-center justify-between mb-1.5">
      <label className="block text-xs font-semibold text-ca-text-secondary uppercase tracking-wide">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {action}
    </div>
    {children}
  </div>
);

const Input = ({ className = "", ...props }) => (
  <input
    {...props}
    className={`w-full px-3 py-2.5 border border-ca-border rounded-xl text-sm text-ca-text bg-ca-surface placeholder-ca-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all ${className}`}
  />
);

const SelectField = ({ children, className = "", ...props }) => (
  <select
    {...props}
    className={`w-full px-3 py-2.5 border border-ca-border rounded-xl text-sm text-ca-text bg-ca-surface focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all appearance-none ${className}`}
  >
    {children}
  </select>
);

const MultiSelect = ({ options, selected, onChange, placeholder = "Select options" }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef();

  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toggle = (val) => {
    if (selected.includes(val)) onChange(selected.filter(v => v !== val));
    else onChange([...selected, val]);
  };

  const selectedLabels = options.filter(o => selected.includes(o.value)).map(o => o.label).join(", ");

  return (
    <div className="relative" ref={containerRef}>
      <div
        className="w-full px-3 py-2.5 border border-ca-border rounded-xl text-sm text-ca-text bg-ca-surface cursor-pointer flex justify-between items-center"
        onClick={() => setOpen(!open)}
      >
        <span className="truncate">{selected.length ? selectedLabels : <span className="text-ca-text-secondary">{placeholder}</span>}</span>
        <ChevronDown size={14} className="text-ca-text-secondary ml-2 flex-shrink-0" />
      </div>
      {open && (
        <div className="absolute z-10 w-full mt-1 bg-ca-surface border border-ca-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {options.map(o => (
            <div
              key={o.value}
              className="flex items-center px-3 py-2 hover:bg-ca-bg cursor-pointer"
              onClick={(e) => { e.stopPropagation(); toggle(o.value); }}
            >
              <input
                type="checkbox"
                checked={selected.includes(o.value)}
                readOnly
                className="mr-2 h-4 w-4 text-primary-600 rounded border-ca-border focus:ring-primary-500"
              />
              <span className="text-sm text-ca-text">{o.label}</span>
            </div>
          ))}
          {options.length === 0 && <div className="p-3 text-sm text-ca-text-secondary text-center">No options available</div>}
        </div>
      )}
    </div>
  );
};

// ── Section header ────────────────────────────────────────────────────────────
const SectionHead = ({ icon: Icon, title, desc }) => (
  <div className="flex items-start space-x-3 mb-5 pb-4 border-b border-ca-border">
    <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0 mt-0.5">
      <Icon size={17} className="text-primary-600" />
    </div>
    <div>
      <h2 className="text-base font-bold text-ca-text">{title}</h2>
      {desc && <p className="text-xs text-ca-text-secondary mt-0.5">{desc}</p>}
    </div>
  </div>
);

// ── AVATAR COLORS ─────────────────────────────────────────────────────────────
const AVATAR_BG = ["bg-ca-secondary", "bg-violet-500", "bg-blue-500", "bg-ca-primary", "bg-rose-500"];

// ═══════════════════════════════════════════════════════════════════════════════
const AddEmployee = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [employeeCode] = useState(genCode);
  const photoInputRef = useRef();
  const queryClient = useQueryClient();

  // ── Quick Create Modal State ─────────────────────────────────────────────
  const [quickModal, setQuickModal] = useState(null); // 'department' | 'designation' | 'branch' | null
  const [quickForm, setQuickForm] = useState({ name: "", description: "", city: "", address: "", departmentId: "" });
  const [quickSaving, setQuickSaving] = useState(false);

  const handleQuickOpen = (type) => {
    setQuickForm({ name: "", description: "", city: "", address: "", departmentId: form.accessibleDepartments?.[0] || "" });
    setQuickModal(type);
  };

  const handleQuickSave = async (e) => {
    e.preventDefault();
    if (!quickForm.name.trim()) return alert("Name is required");
    if (quickModal === "designation" && !quickForm.departmentId) return alert("Please select a department");
    setQuickSaving(true);
    try {
      if (quickModal === "department") {
        const res = await createDepartmentApi({ name: quickForm.name.trim(), description: quickForm.description.trim() });
        await queryClient.invalidateQueries(["departments"]);
        const newDept = res.data?.department;
        if (newDept?._id) set("accessibleDepartments", [...(form.accessibleDepartments || []), newDept._id]);
      } else if (quickModal === "designation") {
        const res = await createDesignationApi({ name: quickForm.name.trim(), description: quickForm.description.trim(), departmentId: quickForm.departmentId });
        await queryClient.invalidateQueries(["designations"]);
        const newDesg = res.data?.designation;
        if (newDesg?._id) {
          set("accessibleDepartments", quickForm.departmentId ? [...new Set([...(form.accessibleDepartments || []), quickForm.departmentId])] : form.accessibleDepartments);
          set("designationId", newDesg._id);
        }
      } else if (quickModal === "branch") {
        const res = await createBranchApi({ branchName: quickForm.name.trim(), name: quickForm.name.trim(), city: quickForm.city.trim(), address: quickForm.address.trim() });
        await queryClient.invalidateQueries(["branches"]);
        const newBranch = res.data?.branch;
        if (newBranch?._id) set("branchId", newBranch._id);
      }
      setQuickModal(null);
    } catch (err) {
      alert(err.response?.data?.message || `Failed to create ${quickModal}`);
    } finally {
      setQuickSaving(false);
    }
  };

  // ── API queries ──────────────────────────────────────────────────────────
  const { data: deptRes } = useQuery({ queryKey: ["departments"], queryFn: getDepartmentsApi });
  const { data: desigRes } = useQuery({ queryKey: ["designations"], queryFn: getDesignationsApi });
  const { data: branchRes } = useQuery({ queryKey: ["branches"], queryFn: getBranchesApi });
  const { data: empRes } = useQuery({ queryKey: ["employees"], queryFn: getEmployeesApi });
  const { data: leaveSettingsRes } = useQuery({ queryKey: ["companyLeaveSettings"], queryFn: getLeaveSettingsApi });

  const departments = deptRes?.data?.departments || deptRes?.data || [];
  const designations = desigRes?.data?.designations || desigRes?.data || [];
  const branches = branchRes?.data?.branches || branchRes?.data || [];

  // ── Form State ────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    // Basic Info
    firstName: "", middleName: "", lastName: "",
    gender: "", dob: "", maritalStatus: "",
    // Job
    loginRole: "Employee", accessibleDepartments: [], designationId: "", branchId: "", reportingManager: "",
    managerAccessLevel: "team", employmentType: "full-time", workMode: "office", allowRemotePunch: false,
    joiningDate: new Date().toISOString().slice(0, 10), probationEndDate: "",
    // Contact
    email: "", phone: "", alternatePhone: "",
    emergencyContact: "", emergencyName: "",
    // Address
    addressLine: "", city: "", state: "", country: "India", pinCode: "",
    // Salary
    ctc: "", basicSalary: "", hra: "", ta: "", otherAllow: "",
    pf: "", tax: "", otherDeduct: "",
    bankName: "", accountNumber: "", ifsc: "",
    // Identity
    aadhaar: "", pan: "", passport: "",
    // Leaves
    casualLeave: "", sickLeave: "", annualLeave: "", lopLeave: "",
  });

  const set = (name, value) => setForm(prev => ({ ...prev, [name]: value }));
  const handle = (e) => set(e.target.name, e.target.value);

  // Sync leave settings once loaded
  useEffect(() => {
    if (leaveSettingsRes?.data?.settings) {
      const settings = leaveSettingsRes.data.settings;
      setForm(prev => ({
        ...prev,
        casualLeave: prev.casualLeave !== "" ? prev.casualLeave : (settings.defaultCasualLeaves !== undefined ? settings.defaultCasualLeaves : 12),
        sickLeave: prev.sickLeave !== "" ? prev.sickLeave : (settings.defaultSickLeaves !== undefined ? settings.defaultSickLeaves : 10),
        annualLeave: prev.annualLeave !== "" ? prev.annualLeave : (settings.defaultAnnualLeaves !== undefined ? settings.defaultAnnualLeaves : 15),
        lopLeave: prev.lopLeave !== "" ? prev.lopLeave : (settings.defaultUnpaidLeaves !== undefined ? settings.defaultUnpaidLeaves : 0),
      }));
    }
  }, [leaveSettingsRes]);

  // Auto-calculate salary components when Annual CTC changes
  useEffect(() => {
    const ctcVal = parseFloat(form.ctc);
    if (!isNaN(ctcVal) && ctcVal > 0) {
      const monthlyGross = Math.round(ctcVal / 12);
      const basic = Math.round(monthlyGross * 0.5); // 50% of monthly gross
      const hra = Math.round(basic * 0.5); // 50% of basic
      const pf = Math.round(basic * 0.12); // 12% of basic
      const otherAllow = Math.max(0, monthlyGross - (basic + hra));

      setForm(prev => ({
        ...prev,
        basicSalary: basic.toString(),
        hra: hra.toString(),
        ta: "0",
        otherAllow: otherAllow.toString(),
        pf: pf.toString(),
        tax: "0",
        otherDeduct: "0",
      }));
    }
  }, [form.ctc]);

  const managers = useMemo(() => {
    return (empRes?.data?.employees || []).filter(e => {
      const userRole = e.role || e.userId?.role;
      const isManager = userRole === "Manager" || userRole === "CompanyAdmin";
      if (!isManager) return false;

      // Filter by selected departments in form
      if (form.accessibleDepartments?.length) {
        const empDeptId = e.departmentId?._id || e.departmentId;
        return form.accessibleDepartments.includes(empDeptId) ||
          (Array.isArray(e.accessibleDepartments) && e.accessibleDepartments.some(d => form.accessibleDepartments.includes(d._id || d)));
      }
      return true;
    });
  }, [empRes, form.accessibleDepartments]);

  const filteredDesig = form.accessibleDepartments?.length
    ? designations.filter(d => form.accessibleDepartments.includes(d.departmentId?._id || d.departmentId))
    : designations;

  // ── Salary calculations ───────────────────────────────────────────────────
  const gross = n(form.basicSalary) + n(form.hra) + n(form.ta) + n(form.otherAllow);
  const deductions = n(form.pf) + n(form.tax) + n(form.otherDeduct);
  const netSalary = gross - deductions;

  // ── Photo upload ──────────────────────────────────────────────────────────
  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = (s) => {
    if (s === 1) {
      if (!form.firstName.trim()) return "First name is required";
      if (!form.lastName.trim()) return "Last name is required";
      if (!form.gender) return "Please select a gender";
    }
    if (s === 2) {
      if (!form.accessibleDepartments?.length) return "Department is required";
      if (!form.branchId) return "Branch is required";
    }
    if (s === 3) {
      if (!form.email.trim()) return "Email is required";
      if (!/\S+@\S+\.\S+/.test(form.email)) return "Enter a valid email";
      if (!form.phone.trim()) return "Phone number is required";
    }
    if (s === 4) {
      if (!form.basicSalary) return "Basic salary is required";
    }
    return null;
  };

  const goNext = () => {
    const err = validate(step);
    if (err) { setError(err); return; }
    setError("");
    setStep(s => Math.min(s + 1, 6));
  };

  const goPrev = () => { setError(""); setStep(s => Math.max(s - 1, 1)); };

  // ── Submit ────────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: createEmployeeApi,
    onSuccess: () => navigate("/company/employees"),
    onError: (err) => setError(err.response?.data?.message || "Failed to create employee"),
  });

  const handleSubmit = () => {
    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      gender: form.gender,
      dateOfBirth: form.dob ? new Date(form.dob).toISOString() : undefined,
      maritalStatus: form.maritalStatus || undefined,
      joiningDate: form.joiningDate ? new Date(form.joiningDate).toISOString() : undefined,
      probationEndDate: form.probationEndDate ? new Date(form.probationEndDate).toISOString() : undefined,
      departmentId: form.accessibleDepartments?.[0] || undefined,
      accessibleDepartments: form.accessibleDepartments || [],
      branchId: form.branchId,
      employmentType: form.employmentType,
      workMode: form.workMode,
      loginRole: form.loginRole,
      managerAccessLevel: form.loginRole === "Manager" ? form.managerAccessLevel : undefined,
      reportingManagerId: form.reportingManager || undefined,
      salary: n(form.basicSalary),
      salaryDetails: {
        basic: n(form.basicSalary),
        hra: n(form.hra),
        travelAllowance: n(form.ta),
        otherAllowances: n(form.otherAllow),
        grossSalary: gross,
        pf: n(form.pf),
        incomeTax: n(form.tax),
        otherDeductions: n(form.otherDeduct),
        netSalary,
      },
      leaveBalance: {
        casual: n(form.casualLeave),
        sick: n(form.sickLeave),
        annual: n(form.annualLeave),
        lop: n(form.lopLeave),
      },
      aadhaar: form.aadhaar || undefined,
      pan: form.pan || undefined,
      address: form.addressLine ? {
        line: form.addressLine, city: form.city, state: form.state,
        country: form.country, pinCode: form.pinCode,
      } : undefined,
    };
    createMutation.mutate(payload);
  };

  // ── Profile completion % ──────────────────────────────────────────────────
  const completionFields = [
    form.firstName, form.lastName, form.email, form.phone, form.gender,
    form.accessibleDepartments?.length ? "yes" : "", form.branchId, form.joiningDate,
    form.basicSalary, form.aadhaar, form.pan,
  ];
  const completionPct = Math.round((completionFields.filter(Boolean).length / completionFields.length) * 100);

  const fullName = `${form.firstName} ${form.middleName ? form.middleName + " " : ""}${form.lastName}`.trim() || "New Employee";

  return (
    <div className="min-h-full pb-24">
      {/* ── Premium Dark Page Header ────────────────────────────────────────── */}
      <div className="relative bg-[#0f172a] border border-white/10 rounded-xl overflow-hidden shadow-md mb-4 flex-shrink-0">
        
        
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <Link
              to="/company/employees"
              className="w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg transition-all shadow-sm cursor-pointer shrink-0"
            >
              <ArrowLeft size={16} />
            </Link>
            
            <div>
              {/* Breadcrumb */}
              <div className="flex items-center space-x-2 text-[10px] font-black text-[#FFB74D] uppercase tracking-widest mb-0.5">
                <Link to="/company/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
                <ChevronRight size={10} className="text-[#FFB74D]/50" />
                <Link to="/company/employees" className="hover:text-white transition-colors">Team Members</Link>
                <ChevronRight size={10} className="text-[#FFB74D]/50" />
                <span className="text-slate-300">Add Team Member</span>
              </div>
              <h1 className="font-black text-white text-xl tracking-tight leading-none">Add New Employee</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-lg text-[11px] font-bold transition-colors shadow-sm whitespace-nowrap">
              <Save size={14} className="text-[#FFB74D]" />
              <span>Save Draft</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Step Progress Bar ─────────────────────────────────────────────── */}
      <div className="bg-ca-surface border border-ca-border rounded-2xl px-6 py-4 mb-5 shadow-sm">
        <div className="flex items-center justify-between">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <div key={s.id} className="flex items-center flex-1">
                <div
                  className="flex items-center space-x-2 cursor-pointer"
                  onClick={() => isDone && setStep(s.id)}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all flex-shrink-0 ${isDone ? "bg-primary-600 text-white" :
                      isActive ? "bg-primary-50 border-2 border-primary-500 text-primary-600" :
                        "bg-ca-bg text-ca-text-secondary"
                    }`}>
                    {isDone ? <CheckCheck size={14} /> : <Icon size={14} />}
                  </div>
                  <div className="hidden md:block">
                    <p className={`text-xs font-semibold ${isActive ? "text-primary-700" : isDone ? "text-ca-text" : "text-ca-text-secondary"}`}>{s.label}</p>
                  </div>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-3 rounded-full transition-all ${isDone ? "bg-primary-500" : "bg-ca-bg"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Main Layout ───────────────────────────────────────────────────── */}
      <div className="flex gap-5">

        {/* ── LEFT PANEL ─────────────────────────────────────────────────── */}
        <div className="w-56 flex-shrink-0 space-y-4">

          {/* Photo Upload */}
          <div className="bg-ca-surface border border-ca-border rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold text-ca-text-secondary uppercase tracking-wider mb-4">Profile Photo</p>
            <div className="flex flex-col items-center">
              <div
                className="relative w-24 h-24 rounded-2xl overflow-hidden cursor-pointer group"
                onClick={() => photoInputRef.current?.click()}
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full ${AVATAR_BG[0]} flex items-center justify-center text-white text-3xl font-bold`}>
                    {form.firstName ? form.firstName[0].toUpperCase() : <Camera size={28} />}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-2xl">
                  <Camera size={20} className="text-white" />
                </div>
              </div>
              <button
                onClick={() => photoInputRef.current?.click()}
                className="mt-3 text-xs text-primary-600 font-semibold hover:underline flex items-center space-x-1"
              >
                <Upload size={12} /><span>Upload Photo</span>
              </button>
              <p className="text-xs text-ca-text-secondary mt-1 text-center">JPG, PNG · Max 2MB</p>
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="bg-ca-surface border border-ca-border rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-bold text-ca-text-secondary uppercase tracking-wider mb-3">Preview</p>
            <div className="space-y-2 text-xs">
              <div className="text-center py-3 bg-primary-50 rounded-xl border border-primary-100">
                <p className="font-bold text-ca-text text-sm truncate px-2">{fullName || "—"}</p>
                <p className="text-primary-600 font-semibold mt-0.5">{employeeCode}</p>
              </div>
              {[
                { label: "Dept", value: form.accessibleDepartments?.map(id => departments.find(d => d._id === id)?.name).filter(Boolean).join(", ") || "—" },
                { label: "Role", value: form.loginRole || "—" },
                { label: "Type", value: form.employmentType || "—" },
                { label: "Mode", value: form.workMode || "—" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-1 border-b border-ca-border last:border-0">
                  <span className="text-ca-text-secondary">{label}</span>
                  <span className="text-ca-text font-semibold truncate ml-2">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Completion */}
          <div className="bg-ca-surface border border-ca-border rounded-2xl p-4 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-bold text-ca-text-secondary uppercase tracking-wider">Completion</p>
              <span className="text-xs font-bold text-primary-700">{completionPct}%</span>
            </div>
            <div className="h-2 bg-ca-bg rounded-full overflow-hidden">
              <div className="h-full bg-primary-500 rounded-full transition-all duration-500" style={{ width: `${completionPct}%` }} />
            </div>
            <p className="text-xs text-ca-text-secondary mt-2">{completionFields.filter(Boolean).length} of {completionFields.length} fields filled</p>
          </div>
        </div>

        {/* ── RIGHT PANEL ─────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          <div className="bg-ca-surface border border-ca-border rounded-2xl shadow-sm overflow-hidden">

            {/* Error Banner */}
            {error && (
              <div className="mx-6 mt-5 flex items-center space-x-2.5 p-3 bg-ca-primary-light border border-ca-border rounded-xl text-sm text-red-700">
                <AlertCircle size={13} className="flex-shrink-0" />
                <span>{error}</span>
                <button onClick={() => setError("")} className="ml-auto flex-shrink-0"><X size={14} /></button>
              </div>
            )}

            <div className="p-6 space-y-3">

              {/* ═══ STEP 1: Basic Information ═══════════════════════════ */}
              {step === 1 && (
                <div>
                  <SectionHead icon={User} title="Basic Information" desc="Employee's personal and demographic details" />
                  <div className="grid grid-cols-3 gap-4">
                    <Field label="First Name" required>
                      <Input name="firstName" value={form.firstName} onChange={handle} placeholder="Ramesh" />
                    </Field>
                    <Field label="Middle Name">
                      <Input name="middleName" value={form.middleName} onChange={handle} placeholder="Kumar" />
                    </Field>
                    <Field label="Last Name" required>
                      <Input name="lastName" value={form.lastName} onChange={handle} placeholder="Sharma" />
                    </Field>
                    <Field label="Gender" required>
                      <SelectField name="gender" value={form.gender} onChange={handle}>
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                        <option value="prefer_not_say">Prefer not to say</option>
                      </SelectField>
                    </Field>
                    <Field label="Date of Birth">
                      <Input type="date" name="dob" value={form.dob} onChange={handle} />
                    </Field>
                    <Field label="Marital Status">
                      <SelectField name="maritalStatus" value={form.maritalStatus} onChange={handle}>
                        <option value="">Select</option>
                        <option value="single">Single</option>
                        <option value="married">Married</option>
                        <option value="divorced">Divorced</option>
                        <option value="widowed">Widowed</option>
                      </SelectField>
                    </Field>
                  </div>
                </div>
              )}

              {/* ═══ STEP 2: Job Details ════════════════════════════════ */}
              {step === 2 && (
                <div>
                  <SectionHead icon={Briefcase} title="Job Details" desc="Role, department, and employment configuration" />
                  <div className="grid grid-cols-2 gap-4">
                    <Field
                      label="Departments"
                      required
                      action={
                        <button
                          type="button"
                          onClick={() => handleQuickOpen("department")}
                          className="text-[11px] font-semibold text-primary-600 hover:text-primary-700 flex items-center space-x-0.5"
                        >
                          <Plus size={13} /><span>New</span>
                        </button>
                      }
                    >
                      <MultiSelect
                        options={departments.map(d => ({ label: d.name, value: d._id }))}
                        selected={form.accessibleDepartments || []}
                        onChange={(val) => set("accessibleDepartments", val)}
                        placeholder="Select departments"
                      />
                    </Field>
                    <Field
                      label="Branch"
                      required
                      action={
                        <button
                          type="button"
                          onClick={() => handleQuickOpen("branch")}
                          className="text-[11px] font-semibold text-primary-600 hover:text-primary-700 flex items-center space-x-0.5"
                        >
                          <Plus size={13} /><span>New</span>
                        </button>
                      }
                    >
                      <SelectField name="branchId" value={form.branchId} onChange={handle}>
                        <option value="">Select branch</option>
                        {branches.map(b => <option key={b._id} value={b._id}>{b.name || b.branchName}</option>)}
                      </SelectField>
                    </Field>
                    <Field label="Reporting Manager">
                      <SelectField name="reportingManager" value={form.reportingManager} onChange={handle}>
                        <option value="">No reporting manager</option>
                        {managers.map(m => (
                          <option key={m._id} value={m._id}>
                            {m.user?.name || `${m.firstName || ""} ${m.lastName || ""}`.trim()}
                          </option>
                        ))}
                      </SelectField>
                    </Field>
                    <Field label="Employee Role">
                      <SelectField name="loginRole" value={form.loginRole} onChange={handle}>
                        <option value="Employee">Team Member</option>
                        {user?.role !== "Manager" && (
                          <>
                            <option value="Manager">Manager</option>
                            <option value="HR">HR</option>
                            <option value="CompanyAdmin">Company Admin</option>
                          </>
                        )}
                      </SelectField>
                    </Field>
                    {form.loginRole === "Manager" && (
                      <Field label="Manager Access Level">
                        <SelectField name="managerAccessLevel" value={form.managerAccessLevel} onChange={handle}>
                          <option value="team">Team Only (Direct Reports)</option>
                          <option value="department">Full Department</option>
                        </SelectField>
                      </Field>
                    )}
                    <Field label="Employment Type">
                      <SelectField name="employmentType" value={form.employmentType} onChange={handle}>
                        <option value="full-time">Full Time</option>
                        <option value="part-time">Part Time</option>
                        <option value="contract">Contract</option>
                        <option value="intern">Intern</option>
                      </SelectField>
                    </Field>
                    <Field label="Work Mode">
                      <SelectField name="workMode" value={form.workMode} onChange={handle}>
                        <option value="office">Office</option>
                        <option value="remote">Remote</option>
                        <option value="hybrid">Hybrid</option>
                      </SelectField>
                    </Field>
                    <div className="flex items-center space-x-2 mt-7">
                      <input
                        type="checkbox"
                        id="allowRemotePunch"
                        checked={form.allowRemotePunch}
                        onChange={(e) => setForm(f => ({ ...f, allowRemotePunch: e.target.checked }))}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <label htmlFor="allowRemotePunch" className="text-sm font-medium text-ca-text-secondary">
                        Allow Remote Punch (Field Worker)
                      </label>
                    </div>
                    <Field label="Joining Date">
                      <Input type="date" name="joiningDate" value={form.joiningDate} onChange={handle} />
                    </Field>
                    <Field label="Probation End Date">
                      <Input type="date" name="probationEndDate" value={form.probationEndDate} onChange={handle} />
                    </Field>
                  </div>
                </div>
              )}

              {/* ═══ STEP 3: Contact + Address ══════════════════════════ */}
              {step === 3 && (
                <div className="space-y-3">
                  <div>
                    <SectionHead icon={Mail} title="Contact Information" desc="Primary and emergency contact details" />
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Email Address" required>
                        <Input type="email" name="email" value={form.email} onChange={handle} placeholder="ramesh@company.com" />
                      </Field>
                      <Field label="Mobile Number" required>
                        <Input type="tel" name="phone" value={form.phone} onChange={handle} placeholder="9876543210" />
                      </Field>
                      <Field label="Alternate Mobile">
                        <Input type="tel" name="alternatePhone" value={form.alternatePhone} onChange={handle} placeholder="Optional" />
                      </Field>
                      <Field label="Emergency Contact">
                        <Input type="tel" name="emergencyContact" value={form.emergencyContact} onChange={handle} placeholder="Emergency phone" />
                      </Field>
                      <Field label="Emergency Contact Name" className="col-span-2">
                        <Input name="emergencyName" value={form.emergencyName} onChange={handle} placeholder="Full name of contact person" />
                      </Field>
                    </div>
                  </div>

                  <div>
                    <SectionHead icon={MapPin} title="Home Address" desc="Residential address for records" />
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Address Line" className="col-span-2">
                        <Input name="addressLine" value={form.addressLine} onChange={handle} placeholder="Flat no, Street, Area" />
                      </Field>
                      <Field label="City">
                        <Input name="city" value={form.city} onChange={handle} placeholder="Mumbai" />
                      </Field>
                      <Field label="State">
                        <Input name="state" value={form.state} onChange={handle} placeholder="Maharashtra" />
                      </Field>
                      <Field label="Country">
                        <Input name="country" value={form.country} onChange={handle} />
                      </Field>
                      <Field label="PIN Code">
                        <Input name="pinCode" value={form.pinCode} onChange={handle} placeholder="400001" />
                      </Field>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ STEP 4: Salary ═════════════════════════════════════ */}
              {step === 4 && (
                <div>
                  <SectionHead icon={DollarSign} title="Salary & Compensation" desc="Monthly earnings, deductions, and bank details" />

                  {/* CTC */}
                  <div className="mb-5">
                    <Field label="Annual CTC">
                      <div className="relative">
                        <span className="absolute left-3 top-[10px] text-ca-text-secondary text-sm font-semibold">₹</span>
                        <Input name="ctc" value={form.ctc} onChange={handle} placeholder="0" className="pl-8" />
                      </div>
                    </Field>
                  </div>

                  {/* Earnings */}
                  <div className="bg-ca-bg border border-emerald-100 rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-bold text-emerald-800">Monthly Earnings</p>
                      <span className="text-sm font-bold text-emerald-700">{fmt(gross)} gross</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { name: "basicSalary", label: "Basic Salary *" },
                        { name: "hra", label: "HRA" },
                        { name: "ta", label: "Travel Allowance" },
                        { name: "otherAllow", label: "Other Allowances" },
                      ].map(f => (
                        <div key={f.name}>
                          <label className="block text-xs font-semibold text-emerald-700 mb-1">{f.label}</label>
                          <div className="relative">
                            <span className="absolute left-3 top-[9px] text-ca-secondary text-xs font-semibold">₹</span>
                            <input
                              type="number" name={f.name} value={form[f.name]} onChange={handle} placeholder="0"
                              className="w-full pl-8 pr-2 py-2 border border-ca-border rounded-lg text-sm bg-ca-surface focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Deductions */}
                  <div className="bg-ca-primary-light border border-red-100 rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-bold text-red-700">Deductions</p>
                      <span className="text-sm font-bold text-ca-primary">- {fmt(deductions)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { name: "pf", label: "Provident Fund" },
                        { name: "tax", label: "Income Tax" },
                        { name: "otherDeduct", label: "Other" },
                      ].map(f => (
                        <div key={f.name}>
                          <label className="block text-xs font-semibold text-red-700 mb-1">{f.label}</label>
                          <div className="relative">
                            <span className="absolute left-3 top-[9px] text-ca-primary text-xs font-semibold">₹</span>
                            <input
                              type="number" name={f.name} value={form[f.name]} onChange={handle} placeholder="0"
                              className="w-full pl-8 pr-2 py-2 border border-ca-border rounded-lg text-sm bg-ca-surface focus:outline-none focus:ring-2 focus:ring-red-400"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Net Salary pill */}
                  <div className="flex items-center justify-between p-4 bg-ca-text text-white rounded-xl mb-5">
                    <p className="text-sm font-semibold text-white/70">Net Monthly Take-Home</p>
                    <p className="text-xl font-bold">{fmt(netSalary)}</p>
                  </div>

                  {/* Bank Details */}
                  <div className="border border-ca-border rounded-xl p-4">
                    <p className="text-xs font-bold text-ca-text-secondary uppercase tracking-wider mb-3 flex items-center">
                      <Banknote size={14} className="mr-1.5 text-ca-text-secondary" /> Bank Details
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Bank Name">
                        <Input name="bankName" value={form.bankName} onChange={handle} placeholder="State Bank of India" />
                      </Field>
                      <Field label="Account Number">
                        <Input name="accountNumber" value={form.accountNumber} onChange={handle} placeholder="0000000000000" />
                      </Field>
                      <Field label="IFSC Code">
                        <Input name="ifsc" value={form.ifsc} onChange={handle} placeholder="SBIN0000123" />
                      </Field>
                    </div>
                  </div>

                  {/* Initial Leave Balances */}
                  <div className="border border-ca-border rounded-xl p-4 mt-4">
                    <p className="text-xs font-bold text-ca-text-secondary uppercase tracking-wider mb-3 flex items-center">
                      <Calendar size={14} className="mr-1.5 text-ca-text-secondary" /> Initial Leave Balances
                    </p>
                    <div className="grid grid-cols-4 gap-3">
                      <Field label="Casual Leave">
                        <Input type="number" name="casualLeave" value={form.casualLeave} onChange={handle} placeholder="12" min="0" />
                      </Field>
                      <Field label="Sick Leave">
                        <Input type="number" name="sickLeave" value={form.sickLeave} onChange={handle} placeholder="10" min="0" />
                      </Field>
                      <Field label="Annual Leave">
                        <Input type="number" name="annualLeave" value={form.annualLeave} onChange={handle} placeholder="15" min="0" />
                      </Field>
                      <Field label="Unpaid Leave (LOP)">
                        <Input type="number" name="lopLeave" value={form.lopLeave} onChange={handle} placeholder="0" min="0" />
                      </Field>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ STEP 5: Identity ════════════════════════════════════ */}
              {step === 5 && (
                <div>
                  <SectionHead icon={Shield} title="Identity & Documents" desc="Government IDs and document uploads" />

                  {/* ID Fields */}
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <Field label="Aadhaar Number">
                      <Input name="aadhaar" value={form.aadhaar} onChange={handle} placeholder="1234 5678 9012" maxLength={14} />
                    </Field>
                    <Field label="PAN Number">
                      <Input name="pan" value={form.pan} onChange={handle} placeholder="ABCDE1234F" maxLength={10} className="uppercase" />
                    </Field>
                    <Field label="Passport Number">
                      <Input name="passport" value={form.passport} onChange={handle} placeholder="Optional" />
                    </Field>
                  </div>

                  {/* Document Uploads */}
                  <div className="border border-ca-border rounded-xl p-4">
                    <p className="text-xs font-bold text-ca-text-secondary uppercase tracking-wider mb-3">Document Uploads</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Aadhaar Card", icon: "🪪", required: true },
                        { label: "PAN Card", icon: "💳", required: true },
                        { label: "Resume / CV", icon: "📄" },
                        { label: "Offer Letter", icon: "📋" },
                        { label: "Passport Photo", icon: "🖼️" },
                        { label: "Other Documents", icon: "📁" },
                      ].map((doc) => (
                        <label key={doc.label} className="flex items-center space-x-3 p-3 border-2 border-dashed border-ca-border rounded-xl hover:border-primary-400 hover:bg-primary-50 cursor-pointer transition-all group">
                          <span className="text-2xl flex-shrink-0">{doc.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-ca-text">
                              {doc.label}
                              {doc.required && <span className="text-red-400 ml-1">*</span>}
                            </p>
                            <p className="text-xs text-ca-text-secondary">Click to upload</p>
                          </div>
                          <Upload size={14} className="text-slate-300 group-hover:text-primary-500 flex-shrink-0" />
                          <input type="file" className="hidden" />
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-ca-text-secondary mt-3 flex items-center">
                      <AlertCircle size={11} className="mr-1.5" /> Max file size: 5MB each. Accepted: PDF, JPG, PNG
                    </p>
                  </div>
                </div>
              )}

              {/* ═══ STEP 6: Review ═════════════════════════════════════ */}
              {step === 6 && (
                <div>
                  <SectionHead icon={Eye} title="Review & Confirm" desc="Please verify all details before creating the employee account" />

                  <div className="space-y-4">
                    {/* Personal */}
                    <ReviewSection title="Basic Information" icon={User} onEdit={() => setStep(1)}>
                      <ReviewRow label="Full Name" value={fullName} />
                      <ReviewRow label="Gender" value={form.gender || "—"} />
                      <ReviewRow label="Date of Birth" value={form.dob || "—"} />
                      <ReviewRow label="Employee Code" value={employeeCode} highlight />
                    </ReviewSection>

                    {/* Job */}
                    <ReviewSection title="Job Details" icon={Briefcase} onEdit={() => setStep(2)}>
                      <ReviewRow label="Departments" value={form.accessibleDepartments?.map(id => departments.find(d => d._id === id)?.name).filter(Boolean).join(", ") || "—"} />
                      {/* <ReviewRow label="Designation" value={designations.find(d => d._id === form.designationId)?.name || "—"} /> */}
                      <ReviewRow label="Branch" value={branches.find(b => b._id === form.branchId)?.name || branches.find(b => b._id === form.branchId)?.branchName || "—"} />
                      <ReviewRow label="Employment Type" value={{ "full-time": "Full Time", "part-time": "Part Time", "contract": "Contract", "intern": "Intern" }[form.employmentType] || form.employmentType} />
                      <ReviewRow label="Work Mode" value={{ "office": "Office", "remote": "Remote", "hybrid": "Hybrid" }[form.workMode] || form.workMode} />
                      <ReviewRow label="Joining Date" value={form.joiningDate} />
                    </ReviewSection>

                    {/* Contact */}
                    <ReviewSection title="Contact" icon={Mail} onEdit={() => setStep(3)}>
                      <ReviewRow label="Email" value={form.email || "—"} />
                      <ReviewRow label="Phone" value={form.phone || "—"} />
                      <ReviewRow label="Emergency Contact" value={form.emergencyContact || "—"} />
                    </ReviewSection>

                    {/* Salary */}
                    <ReviewSection title="Salary" icon={DollarSign} onEdit={() => setStep(4)}>
                      <ReviewRow label="Basic Salary" value={fmt(form.basicSalary)} />
                      <ReviewRow label="Gross Salary" value={fmt(gross)} />
                      <ReviewRow label="Net Salary" value={fmt(netSalary)} highlight />
                    </ReviewSection>

                    {/* Identity */}
                    <ReviewSection title="Identity" icon={Shield} onEdit={() => setStep(5)}>
                      <ReviewRow label="Aadhaar" value={form.aadhaar || "—"} />
                      <ReviewRow label="PAN" value={form.pan || "—"} />
                    </ReviewSection>

                    {/* Info note */}
                    <div className="p-4 bg-primary-50 border border-primary-200 rounded-xl flex items-start space-x-2">
                      <AlertCircle size={16} className="text-primary-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-primary-800">
                        A temporary password will be auto-generated and sent to <strong>{form.email || "the employee's email"}</strong>. They must change it on first login.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Sticky Bottom Action Bar ─────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-56 right-0 bg-ca-surface border-t border-ca-border px-6 py-3 flex items-center justify-between z-30 shadow-lg">
        <div className="flex items-center space-x-2">
          <Link to="/company/employees" className="px-4 py-2 text-sm font-medium text-ca-text-secondary hover:text-ca-text transition-colors">
            Cancel
          </Link>
          {step > 1 && (
            <button onClick={goPrev} className="flex items-center space-x-1.5 px-3 py-1.5 border border-ca-border rounded-lg text-[11px] font-medium text-ca-text-secondary bg-ca-surface hover:bg-ca-bg transition-colors">
              <ChevronLeft size={13} /><span>Previous</span>
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Progress text */}
          <span className="text-xs text-ca-text-secondary mr-2">Step {step} of {STEPS.length}</span>

          {step < 6 ? (
            <button onClick={goNext} className="flex items-center space-x-2 px-5 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors shadow-sm">
              <span>Next</span><ChevronRight size={13} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="flex items-center space-x-2 px-6 py-2 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-70"
            >
              {createMutation.isPending ? (
                <><Loader2 size={13} className="animate-spin" /><span>Creating...</span></>
              ) : (
                <><CheckCircle2 size={13} /><span>Create Employee</span></>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Quick Create Modal ────────────────────────────────────────────── */}
      {quickModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-ca-surface rounded-2xl max-w-md w-full p-6 shadow-xl border border-ca-border animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-ca-border mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600">
                  {quickModal === "department" && <Building2 size={16} />}
                  {quickModal === "designation" && <Briefcase size={16} />}
                  {quickModal === "branch" && <MapPin size={16} />}
                </div>
                <h3 className="font-bold text-ca-text capitalize text-base">
                  Create New {quickModal}
                </h3>
              </div>
              <button onClick={() => setQuickModal(null)} className="text-ca-text-secondary hover:text-ca-text-secondary p-1">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleQuickSave} className="space-y-4">
              {quickModal === "designation" && (
                <div>
                  <label className="block text-xs font-semibold text-ca-text-secondary mb-1.5 uppercase tracking-wide">
                    Department <span className="text-red-400">*</span>
                  </label>
                  <SelectField
                    value={quickForm.departmentId}
                    onChange={(e) => setQuickForm({ ...quickForm, departmentId: e.target.value })}
                  >
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                  </SelectField>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-ca-text-secondary mb-1.5 uppercase tracking-wide">
                  {quickModal === "branch" ? "Branch Name" : `${quickModal} Name`} <span className="text-red-400">*</span>
                </label>
                <Input
                  placeholder={`Enter ${quickModal} name`}
                  value={quickForm.name}
                  onChange={(e) => setQuickForm({ ...quickForm, name: e.target.value })}
                  required
                />
              </div>

              {(quickModal === "department" || quickModal === "designation") && (
                <div>
                  <label className="block text-xs font-semibold text-ca-text-secondary mb-1.5 uppercase tracking-wide">
                    Description
                  </label>
                  <Input
                    placeholder="Optional description"
                    value={quickForm.description}
                    onChange={(e) => setQuickForm({ ...quickForm, description: e.target.value })}
                  />
                </div>
              )}

              {quickModal === "branch" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-ca-text-secondary mb-1.5 uppercase tracking-wide">
                      City
                    </label>
                    <Input
                      placeholder="e.g. Pune, Mumbai"
                      value={quickForm.city}
                      onChange={(e) => setQuickForm({ ...quickForm, city: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ca-text-secondary mb-1.5 uppercase tracking-wide">
                      Address
                    </label>
                    <Input
                      placeholder="Optional office address"
                      value={quickForm.address}
                      onChange={(e) => setQuickForm({ ...quickForm, address: e.target.value })}
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end space-x-3 pt-3 border-t border-ca-border">
                <button
                  type="button"
                  onClick={() => setQuickModal(null)}
                  className="px-3 py-1.5 border border-ca-border rounded-lg text-[11px] font-semibold text-ca-text-secondary hover:bg-ca-bg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickSaving}
                  className="px-5 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors flex items-center space-x-2 shadow-sm disabled:opacity-50"
                >
                  {quickSaving && <Loader2 size={14} className="animate-spin" />}
                  <span>Create {quickModal}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Review helpers ────────────────────────────────────────────────────────────
const ReviewSection = ({ title, icon: Icon, onEdit, children }) => (
  <div className="border border-ca-border rounded-xl overflow-hidden">
    <div className="flex items-center justify-between px-4 py-3 bg-ca-bg border-b border-ca-border">
      <div className="flex items-center space-x-2">
        <Icon size={14} className="text-ca-text-secondary" />
        <p className="text-xs font-bold text-ca-text uppercase tracking-wide">{title}</p>
      </div>
      <button onClick={onEdit} className="text-xs text-primary-600 font-semibold hover:underline">Edit</button>
    </div>
    <div className="px-4 py-2 grid grid-cols-2 gap-0">{children}</div>
  </div>
);

const ReviewRow = ({ label, value, highlight }) => (
  <div className="flex justify-between py-2 border-b border-ca-border last:border-0 col-span-1">
    <span className="text-xs text-ca-text-secondary font-medium">{label}</span>
    <span className={`text-xs font-bold ${highlight ? "text-primary-700" : "text-ca-text"}`}>{value}</span>
  </div>
);

export default AddEmployee;