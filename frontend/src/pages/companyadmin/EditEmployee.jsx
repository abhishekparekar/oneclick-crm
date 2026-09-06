import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  getEmployeeByIdApi, updateEmployeeApi, patchEmployeeStatusApi,
  getCompanyAuditLogsApi, getDepartmentsApi, getDesignationsApi,
  getBranchesApi, getEmployeesApi,
  createDepartmentApi, createDesignationApi, createBranchApi,
  getLeaveBalanceApi, updateLeaveBalanceApi, uploadEmployeeDocumentApi,
  getModuleUsageApi
} from "../../api/companyAdminApi";
import { useAuth } from "../../context/AuthContext";
import {
  User, Mail, Phone, MapPin, Briefcase, CreditCard, ShieldCheck,
  FileText, Coins, Award, Camera, Save, ArrowLeft, ChevronDown,
  ChevronUp, CheckCircle2, History, X, Lock, PowerOff, Download,
  AlertTriangle, RefreshCw, Plus, Loader2, Building2, CalendarDays,
  Upload, Eye, ChevronRight, ChevronLeft, CheckCheck, Trash2,
  ExternalLink, Sparkles, Shield, DollarSign, Users, AlertCircle, FileCheck,
  Calendar, Cpu
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
  { id: 4, label: "Salary & Leaves", icon: DollarSign, desc: "Compensation & quotas" },
  { id: 5, label: "Bank & Identity", icon: CreditCard, desc: "Banking & PAN/Aadhaar" },
  { id: 6, label: "Document Vault", icon: FileText, desc: "Upload files & proofs" },
  { id: 7, label: "Review & Save", icon: CheckCheck, desc: "Final verification" },
];

// ── Shared Field Components ──────────────────────────────────────────────────
const Field = ({ label, required, children, className = "", action, hint }) => (
  <div className={`space-y-1 ${className}`}>
    <div className="flex items-center justify-between">
      <label className="block text-[10.5px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {action}
    </div>
    {children}
    {hint && <p className="text-[10px] text-slate-400 font-medium">{hint}</p>}
  </div>
);

const Input = ({ label, type = "text", value, onChange, placeholder, disabled = false, required = false, hint, className = "" }) => (
  <Field label={label} required={required} hint={hint} className={className}>
    <input
      type={type}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#0D1321] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all ${
        disabled ? "opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-900" : ""
      }`}
    />
  </Field>
);

const Select = ({ label, value, onChange, options, disabled = false, required = false, placeholder = "Select...", action, hint, className = "" }) => (
  <Field label={label} required={required} action={action} hint={hint} className={className}>
    <div className="relative">
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full appearance-none pl-3.5 pr-9 py-2.5 bg-slate-50 dark:bg-[#0D1321] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all ${
          disabled ? "opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-900" : ""
        }`}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown size={13} className="absolute right-2.5 top-2 text-slate-400 pointer-events-none" />
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
    if (selected.includes(val)) onChange(selected.filter(v => v !== val));
    else onChange([...selected, val]);
  };

  const selectedLabels = options.filter(o => selected.includes(o.value)).map(o => o.label).join(", ");

  return (
    <Field label={label} required={required} action={action}>
      <div className="relative" ref={containerRef}>
        <div
          className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#0D1321] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white transition-all flex items-center justify-between min-h-[40px] cursor-pointer hover:border-amber-500/50 ${
            disabled ? "opacity-60 cursor-not-allowed" : ""
          }`}
          onClick={() => !disabled && setOpen(!open)}
        >
          <span className="truncate block">{selected.length ? selectedLabels : <span className="text-slate-400 font-normal">{placeholder}</span>}</span>
          <ChevronDown size={14} className="text-slate-400 flex-shrink-0 ml-2" />
        </div>

        {open && !disabled && (
          <div className="absolute z-20 w-full mt-1.5 bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-48 overflow-y-auto p-1.5 animate-fadeIn">
            {options.map(o => (
              <div
                key={o.value}
                className="flex items-center px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-lg cursor-pointer transition-colors"
                onClick={(e) => { e.stopPropagation(); toggle(o.value); }}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(o.value)}
                  readOnly
                  className="mr-2.5 h-3.5 w-3.5 text-amber-500 rounded border-slate-300 dark:border-slate-700 focus:ring-amber-500"
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{o.label}</span>
              </div>
            ))}
            {options.length === 0 && <div className="p-3 text-xs text-slate-400 text-center">No options available</div>}
          </div>
        )}
      </div>
    </Field>
  );
};

// ── Document Item Component ────────────────────────────────────────────────
const DocumentUploader = ({ title, docKey, currentUrl, employeeId, onUploaded }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (< 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be under 10MB");
      return;
    }

    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("documentType", docKey);
    form.append("title", title);

    try {
      const res = await uploadEmployeeDocumentApi(employeeId, form);
      const fileUrl = res.data?.document?.fileUrl || res.data?.fileUrl || res.data?.employee?.documents?.[docKey];
      toast.success(`${title} uploaded successfully!`);
      onUploaded(docKey, fileUrl || file.name);
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to upload ${title}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const cleanUrl = getPhotoUrl(currentUrl);

  return (
    <div className="bg-slate-50/80 dark:bg-[#0D1321] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 transition-all hover:border-amber-500/30">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${currentUrl ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-slate-200/60 dark:bg-slate-800 text-slate-400'}`}>
            {currentUrl ? <FileCheck size={18} /> : <FileText size={18} />}
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight">{title}</h4>
            <span className={`text-[10px] font-bold ${currentUrl ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
              {currentUrl ? "Uploaded & Verified" : "Not uploaded yet"}
            </span>
          </div>
        </div>
        {currentUrl && (
          <a
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
            title="View File"
          >
            <ExternalLink size={14} />
          </a>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex-1 py-2 px-3 bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-700 hover:border-amber-500/50 rounded-xl text-[11px] font-bold text-slate-700 dark:text-slate-200 transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 size={13} className="animate-spin text-amber-500" />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <Upload size={13} className="text-amber-500" />
              <span>{currentUrl ? "Replace Document" : "Upload Document"}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// ── Main Page Component ─────────────────────────────────────────────────────
export default function EditEmployee() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const avatarInputRef = useRef(null);

  // ── Queries ──
  const { data: empRes, isLoading: empLoading, isError, error } = useQuery({
    queryKey: ["employee", id],
    queryFn: () => getEmployeeByIdApi(id),
  });

  const { data: deptRes } = useQuery({ queryKey: ["departments"], queryFn: getDepartmentsApi });
  const { data: desgRes } = useQuery({ queryKey: ["designations"], queryFn: getDesignationsApi });
  const { data: branchRes } = useQuery({ queryKey: ["branches"], queryFn: getBranchesApi });
  const { data: mgrsRes } = useQuery({ queryKey: ["employees"], queryFn: () => getEmployeesApi({ status: "active" }) });

  const { data: leaveRes } = useQuery({
    queryKey: ["leaveBalance", id],
    queryFn: () => getLeaveBalanceApi({ employeeId: id }),
  });

  const { data: moduleUsageRes } = useQuery({
    queryKey: ["companyModuleUsage"],
    queryFn: () => getModuleUsageApi().then((r) => r.data),
  });

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

  const { data: auditRes, refetch: refetchAudit } = useQuery({
    queryKey: ["auditLogs", id],
    queryFn: () => getCompanyAuditLogsApi({ entityId: id, module: "Team Member" }),
    enabled: showAuditLog,
  });

  // Prune any unsubscribed modules if subscribedModules updates
  useEffect(() => {
    if (formData && subscribedModules.length > 0) {
      setFormData((prev) => {
        if (!prev) return prev;
        const cur = prev.assignedModules || [];
        const valid = cur.filter((m) => subscribedModules.includes(m));
        if (valid.length !== cur.length) {
          return { ...prev, assignedModules: valid };
        }
        return prev;
      });
    }
  }, [subscribedModules]);

  // Populate form data
  useEffect(() => {
    if (empRes?.data?.employee && !formData) {
      const emp = empRes.data.employee;
      const resolvedPhoto = emp.photo || emp.documents?.photo || emp.userId?.profileImage || "";
      const rawAssigned = (emp.assignedModules && emp.assignedModules.length > 0)
        ? emp.assignedModules
        : (emp.userId?.assignedModules && emp.userId.assignedModules.length > 0
            ? emp.userId.assignedModules
            : subscribedModules);
      const validAssigned = (rawAssigned || [])
        .map((m) => String(m).toLowerCase().trim())
        .filter((m) => subscribedModules.length === 0 || subscribedModules.includes(m));

      const initialData = {
        ...emp,
        photo: resolvedPhoto,
        gender: emp.gender ? emp.gender.toLowerCase() : "",
        employmentType: emp.employmentType ? emp.employmentType.toLowerCase().replace('_', '-') : "full-time",
        workMode: emp.workMode ? emp.workMode.toLowerCase() : "office",
        maritalStatus: emp.maritalStatus ? emp.maritalStatus.toLowerCase() : "",
        bloodGroup: emp.bloodGroup || "",
        aadhaarNumber: emp.aadhaarNumber || "",
        panNumber: emp.panNumber || "",
        dateOfBirth: emp.dateOfBirth ? emp.dateOfBirth.split('T')[0] : "",
        joiningDate: emp.joiningDate ? emp.joiningDate.split('T')[0] : "",
        confirmationDate: emp.confirmationDate ? emp.confirmationDate.split('T')[0] : "",
        managerAccessLevel: emp.managerAccessLevel || "team",
        allowRemotePunch: emp.allowRemotePunch || false,
        isLocationTrackingEnabled: emp.isLocationTrackingEnabled ?? false,
        assignedModules: validAssigned,
        accessibleDepartments: emp.accessibleDepartments?.length
          ? emp.accessibleDepartments.map(d => typeof d === 'object' ? d._id : d)
          : (emp.departmentId ? [typeof emp.departmentId === 'object' ? emp.departmentId._id : emp.departmentId] : []),
        currentAddress: emp.currentAddress || {},
        permanentAddress: emp.permanentAddress || {},
        emergencyContact: emp.emergencyContact || {},
        bankDetails: emp.bankDetails || {},
        salaryDetails: emp.salaryDetails || {},
        skills: emp.skills || [],
        certifications: emp.certifications || [],
        documents: emp.documents || {},
        leaveBalance: { monthly: 2, paidLeaves: 18, unpaidLeaves: 0, casual: 12, sick: 6, annual: 15, unpaid: 0 },
        leaveBalanceLoaded: false,
      };
      setFormData(initialData);
      setOriginalData(JSON.stringify(initialData));
    }
  }, [empRes, formData]);

  useEffect(() => {
    if (leaveRes?.data?.balance && formData && !formData.leaveBalanceLoaded) {
      const lb = leaveRes.data.balance;
      const casual = Number(lb.casual ?? 12);
      const sick = Number(lb.sick ?? 6);
      const annual = Number(lb.annual ?? 15);
      const unpaid = Number(lb.lop ?? lb.unpaid ?? lb.unpaidLeaves ?? 0);
      const paidLeaves = Number(lb.paidLeaves ?? (casual + sick + annual));
      const monthly = Number(lb.monthlyLeaves ?? lb.monthly ?? 2);

      const initialLeave = {
        monthly,
        paidLeaves,
        unpaidLeaves: unpaid,
        casual,
        sick,
        annual,
        unpaid,
      };

      setFormData(prev => ({
        ...prev,
        leaveBalance: initialLeave,
        leaveBalanceLoaded: true,
      }));

      setOriginalData(prev => {
        const parsed = prev ? JSON.parse(prev) : {};
        return JSON.stringify({ ...parsed, leaveBalance: initialLeave, leaveBalanceLoaded: true });
      });
    }
  }, [leaveRes, formData]);

  const departments = deptRes?.data?.departments || deptRes?.data || [];
  const designations = desgRes?.data?.designations || desgRes?.data || [];
  const branches = branchRes?.data?.branches || branchRes?.data || [];
  const managers = (mgrsRes?.data?.employees || []).filter(e => e._id !== id);

  // ── Quick Creation Modals ──
  const [quickModal, setQuickModal] = useState(null);
  const [quickForm, setQuickForm] = useState({ name: "", description: "", city: "", address: "", departmentId: "" });
  const [quickSaving, setQuickSaving] = useState(false);

  const handleQuickOpen = (type) => {
    setQuickForm({ name: "", description: "", city: "", address: "", departmentId: formData?.accessibleDepartments?.[0] || "" });
    setQuickModal(type);
  };

  const handleQuickSave = async (e) => {
    e.preventDefault();
    if (!quickForm.name.trim()) return toast.error("Name is required");
    if (quickModal === "designation" && !quickForm.departmentId) return toast.error("Please select a department");
    setQuickSaving(true);
    try {
      if (quickModal === "department") {
        const res = await createDepartmentApi({ name: quickForm.name.trim(), description: quickForm.description.trim() });
        await queryClient.invalidateQueries(["departments"]);
        const newDept = res.data?.department;
        if (newDept?._id) handleChange("accessibleDepartments", [...(formData?.accessibleDepartments || []), newDept._id]);
      } else if (quickModal === "designation") {
        const res = await createDesignationApi({ name: quickForm.name.trim(), description: quickForm.description.trim(), departmentId: quickForm.departmentId });
        await queryClient.invalidateQueries(["designations"]);
        const newDesg = res.data?.designation;
        if (newDesg?._id) {
          handleChange("designationId", newDesg._id);
        }
      } else if (quickModal === "branch") {
        const res = await createBranchApi({ branchName: quickForm.name.trim(), name: quickForm.name.trim(), city: quickForm.city.trim(), address: quickForm.address.trim() });
        await queryClient.invalidateQueries(["branches"]);
        const newBranch = res.data?.branch;
        if (newBranch?._id) handleChange("branchId", newBranch._id);
      }
      toast.success(`${quickModal} created successfully`);
      setQuickModal(null);
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to create ${quickModal}`);
    } finally {
      setQuickSaving(false);
    }
  };

  // ── Mutations ──
  const updateMutation = useMutation({
    mutationFn: (data) => updateEmployeeApi(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["employee", id]);
      queryClient.invalidateQueries(["employees"]);
      setOriginalData(JSON.stringify(formData));
      setIsDirty(false);
      toast.success("Employee profile updated successfully!");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to update employee");
    }
  });

  const statusMutation = useMutation({
    mutationFn: (status) => patchEmployeeStatusApi(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries(["employee", id]);
      toast.success("Status updated successfully");
    }
  });

  const updateLeaveMutation = useMutation({
    mutationFn: (payload) => updateLeaveBalanceApi(id, payload)
  });

  // Track dirty state
  useEffect(() => {
    if (formData && originalData) {
      setIsDirty(JSON.stringify(formData) !== originalData);
    }
  }, [formData, originalData]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value }
    }));
  };

  // Avatar Photo Upload Handler
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Profile picture must be under 5MB");
      return;
    }

    setUploadingPhoto(true);
    const form = new FormData();
    form.append("file", file);
    form.append("documentType", "photo");
    form.append("title", "photo");

    try {
      const res = await uploadEmployeeDocumentApi(id, form);
      const newPhoto = res.data?.document?.fileUrl || res.data?.fileUrl || res.data?.employee?.photo;
      if (newPhoto) {
        handleChange("photo", newPhoto);
      }
      queryClient.invalidateQueries(["employee", id]);
      toast.success("Profile photo updated successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to upload profile picture");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDocumentUploaded = (docKey, fileUrl) => {
    handleNestedChange("documents", docKey, fileUrl);
    queryClient.invalidateQueries(["employee", id]);
  };

  const copyCurrentAddressToPermanent = () => {
    if (formData?.currentAddress) {
      handleChange("permanentAddress", { ...formData.currentAddress });
      toast.success("Copied current address to permanent address");
    }
  };

  const handleSave = () => {
    if (!formData) return;

    const payload = {
      firstName: formData.firstName,
      middleName: formData.middleName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      alternateMobile: formData.alternateMobile,
      gender: formData.gender ? String(formData.gender).toLowerCase().trim() : "",
      dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString() : null,
      bloodGroup: formData.bloodGroup || "",
      maritalStatus: formData.maritalStatus ? String(formData.maritalStatus).toLowerCase().trim() : "",
      photo: formData.photo,

      currentAddress: formData.currentAddress,
      permanentAddress: formData.permanentAddress,
      emergencyContact: formData.emergencyContact,

      departmentId: formData.accessibleDepartments?.[0] || undefined,
      accessibleDepartments: formData.accessibleDepartments || [],
      designationId: typeof formData.designationId === "object" ? formData.designationId?._id : formData.designationId,
      branchId: typeof formData.branchId === "object" ? formData.branchId?._id : formData.branchId,
      reportingManagerId: typeof formData.reportingManagerId === "object" ? formData.reportingManagerId?._id : formData.reportingManagerId,
      managerAccessLevel: (formData.role === "Manager" || formData.userId?.role === "Manager") ? formData.managerAccessLevel : undefined,
      employmentType: formData.employmentType ? String(formData.employmentType).toLowerCase().trim().replace("_", "-") : "full-time",
      workMode: formData.workMode ? String(formData.workMode).toLowerCase().trim() : "office",
      allowRemotePunch: formData.allowRemotePunch,
      isLocationTrackingEnabled: Boolean(formData.isLocationTrackingEnabled),
      joiningDate: formData.joiningDate ? new Date(formData.joiningDate).toISOString() : null,
      confirmationDate: formData.confirmationDate ? new Date(formData.confirmationDate).toISOString() : null,
      noticePeriod: formData.noticePeriod,

      bankDetails: formData.bankDetails,
      aadhaarNumber: formData.aadhaarNumber,
      panNumber: formData.panNumber,
      documents: formData.documents,

      assignedModules: (formData.assignedModules || []).filter((m) => subscribedModules.includes(m)),
      role: formData.role || formData.userId?.role,
      loginRole: formData.role || formData.userId?.role,
      salaryDetails: formData.salaryDetails,
    };

    updateMutation.mutate(payload, {
      onSuccess: () => {
        if (formData.leaveBalanceLoaded) {
          updateLeaveMutation.mutate({
            monthlyLeaves: formData.leaveBalance.monthly,
            paidLeaves: formData.leaveBalance.paidLeaves,
            unpaidLeaves: formData.leaveBalance.unpaidLeaves ?? formData.leaveBalance.unpaid,
            casual: formData.leaveBalance.casual,
            sick: formData.leaveBalance.sick,
            annual: formData.leaveBalance.annual,
            lop: formData.leaveBalance.unpaidLeaves ?? formData.leaveBalance.unpaid,
            unpaid: formData.leaveBalance.unpaidLeaves ?? formData.leaveBalance.unpaid,
          });
        }
      }
    });
  };

  if (empLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <RefreshCw size={28} className="text-amber-500 animate-spin" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loading employee workspace...</p>
      </div>
    );
  }

  if (isError || !formData) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3 text-rose-500">
        <AlertTriangle size={36} />
        <p className="text-sm font-extrabold text-slate-900 dark:text-white">Failed to load employee</p>
        <p className="text-xs text-slate-400">{error?.response?.data?.message || "Please check your network and try again."}</p>
        <Link to={`${window.location.pathname.startsWith("/hr") ? "/hr" : "/company"}/employees`} className="mt-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold">
          Return to Employee Directory
        </Link>
      </div>
    );
  }

  const name = `${formData.firstName || ""} ${formData.lastName || ""}`.trim() || "Employee";
  const initials = name.slice(0, 2).toUpperCase();
  const photoUrl = getPhotoUrl(formData.photo);
  const baseRoute = window.location.pathname.startsWith("/hr") ? "/hr" : "/company";

  return (
    <div className="min-h-screen pb-20 space-y-3">
      
      {/* ── Top Executive Header ────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to={`${baseRoute}/employees`}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer shrink-0"
              title="Back to Employees"
            >
              <ArrowLeft size={15} />
            </Link>

            <div className="relative group">
              <input
                type="file"
                ref={avatarInputRef}
                onChange={handleAvatarUpload}
                accept="image/*"
                className="hidden"
              />
              <div className="relative">
                {photoUrl ? (
                  <img src={photoUrl} alt={name} className="w-10 h-10 rounded-xl object-cover border-2 border-white dark:border-slate-700 shadow-md ring-1 ring-amber-500/20" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white font-black text-sm flex items-center justify-center shadow-md border-2 border-white dark:border-slate-700">
                    {initials}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-lg bg-slate-900 text-white dark:bg-amber-600 flex items-center justify-center shadow-md hover:scale-110 transition-transform cursor-pointer disabled:opacity-50"
                  title="Upload profile picture"
                >
                  {uploadingPhoto ? <Loader2 size={11} className="animate-spin" /> : <Camera size={11} />}
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black text-slate-900 dark:text-white tracking-tight leading-tight">{name}</h1>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 font-mono text-[10.5px] font-extrabold border border-amber-500/20">
                  {formData.employeeCode || "EMP"}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">
                {formData.role || "Employee"} • {formData.email || "No email assigned"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isDirty && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/10 text-amber-600 border border-amber-500/20 animate-pulse">
                <AlertCircle size={13} /> Unsaved Changes
              </span>
            )}
            <button
              onClick={() => { setShowAuditLog(true); refetchAudit(); }}
              className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-[#0D1321] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <History size={14} className="text-amber-500" />
              <span>Audit Log</span>
            </button>
            <button
              onClick={handleSave}
              disabled={!isDirty || updateMutation.isPending}
              className={`px-4 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ${
                isDirty
                  ? "bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
              }`}
            >
              {updateMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} strokeWidth={2.5} />}
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Compact Step Bar ── */}
      <div className="flex border-t border-slate-100 dark:border-slate-800/60 overflow-x-auto scrollbar-none">
        {STEPS.map((s) => {
          const Icon = s.icon;
          const isCurrent = step === s.id;
          const isCompleted = step > s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setStep(s.id)}
              className={`flex-1 flex items-center justify-center gap-1 py-2.5 px-2 text-[10.5px] font-extrabold uppercase tracking-wide transition-all border-b-2 cursor-pointer whitespace-nowrap ${
                isCurrent
                  ? "border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-50/60 dark:bg-amber-950/20"
                  : isCompleted
                  ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/10"
                  : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/40"
              }`}
            >
              <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                isCurrent ? "bg-amber-500/20 text-amber-600 dark:text-amber-400" : isCompleted ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-slate-200 dark:bg-slate-800 text-slate-400"
              }`}>
                {isCompleted ? <CheckCircle2 size={11} strokeWidth={2.5} /> : <Icon size={11} strokeWidth={2.5} />}
              </div>
              <span className="hidden sm:inline truncate">{s.label}</span>
              <span className="sm:hidden font-black">{s.id}</span>
            </button>
          );
        })}
      </div>

      {/* ── Form Step Content Container ─────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-2xs animate-fadeIn">
        
        {/* ══ STEP 1: Basic & Profile Info ══════════════════════════════════ */}
        {step === 1 && (
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 pb-2 mb-1 border-b border-slate-100 dark:border-slate-800/60">
              <div className="w-5 h-5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <User size={11} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-[10.5px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Basic &amp; Personal Information</h3>
                <p className="hidden">Core identification, personal contact, and avatar</p>
              </div>
            </div>

            {/* Profile Avatar Card */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700/80">
              {photoUrl ? (
                <img src={photoUrl} alt={name} className="w-12 h-12 rounded-xl object-cover border-2 border-white dark:border-slate-700 shadow-sm ring-1 ring-amber-500/20" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white font-black text-base flex items-center justify-center shadow-sm">
                  {initials}
                </div>
              )}
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800 dark:text-white">Profile Photo</p>
                <p className="text-[10px] text-slate-400">JPG, PNG, WEBP - Max 5MB</p>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white text-[11px] font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {uploadingPhoto ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                    <span>Upload New Photo</span>
                  </button>
                  {photoUrl && (
                    <button
                      type="button"
                      onClick={() => handleChange("photo", "")}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-rose-600 text-[11px] font-bold hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <Input label="First Name" required value={formData.firstName} onChange={(v) => handleChange("firstName", v)} placeholder="First Name" />
              <Input label="Middle Name" value={formData.middleName} onChange={(v) => handleChange("middleName", v)} placeholder="Middle Name" />
              <Input label="Last Name" required value={formData.lastName} onChange={(v) => handleChange("lastName", v)} placeholder="Last Name" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Input label="Official / Login Email" type="email" required value={formData.email} onChange={(v) => handleChange("email", v)} placeholder="name@company.com" />
              <Input label="Primary Phone Number" type="tel" required value={formData.phone} onChange={(v) => handleChange("phone", v)} placeholder="9876543210" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Input label="Alternate Mobile" type="tel" value={formData.alternateMobile} onChange={(v) => handleChange("alternateMobile", v)} placeholder="Optional secondary contact" />
              <Input label="Date of Birth" type="date" value={formData.dateOfBirth} onChange={(v) => handleChange("dateOfBirth", v)} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <Select label="Gender" value={formData.gender ? formData.gender.toLowerCase() : ""} onChange={(v) => handleChange("gender", v.toLowerCase())} options={[
                { value: "male", label: "Male" }, { value: "female", label: "Female" }, { value: "other", label: "Other" }
              ]} />
              <Select label="Blood Group" value={formData.bloodGroup || ""} onChange={(v) => handleChange("bloodGroup", v)} options={[
                { value: "A+", label: "A+" }, { value: "A-", label: "A-" }, { value: "B+", label: "B+" }, { value: "B-", label: "B-" },
                { value: "O+", label: "O+" }, { value: "O-", label: "O-" }, { value: "AB+", label: "AB+" }, { value: "AB-", label: "AB-" }
              ]} />
              <Select label="Marital Status" value={formData.maritalStatus ? formData.maritalStatus.toLowerCase() : ""} onChange={(v) => handleChange("maritalStatus", v.toLowerCase())} options={[
                { value: "single", label: "Single" }, { value: "married", label: "Married" }, { value: "divorced", label: "Divorced" }
              ]} />
            </div>
          </div>
        )}

        {/* ══ STEP 2: Job Details ═══════════════════════════════════════════ */}
        {step === 2 && (
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 pb-2 mb-1 border-b border-slate-100 dark:border-slate-800/60">
              <div className="w-5 h-5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Briefcase size={11} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-[10.5px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Job &amp; Employment Details</h3>
                <p className="hidden">Department, designation, role permissions, and branch</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <MultiSelect
                label="Accessible Departments"
                selected={formData.accessibleDepartments || []}
                onChange={(val) => handleChange("accessibleDepartments", val)}
                options={departments.map(d => ({ value: d._id, label: d.name }))}
                action={
                  <button type="button" onClick={() => handleQuickOpen("department")} className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer">
                    + Add Dept
                  </button>
                }
              />
              <Select
                label="Designation / Title"
                value={typeof formData.designationId === "object" ? formData.designationId?._id : formData.designationId}
                onChange={(v) => handleChange("designationId", v)}
                options={designations.map(d => ({ value: d._id, label: `${d.name} (${d.departmentId?.name || 'All'})` }))}
                action={
                  <button type="button" onClick={() => handleQuickOpen("designation")} className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer">
                    + Add Desg
                  </button>
                }
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Select
                label="Branch / Office"
                value={typeof formData.branchId === "object" ? formData.branchId?._id : formData.branchId}
                onChange={(v) => handleChange("branchId", v)}
                options={branches.map(b => ({ value: b._id, label: b.name || b.branchName }))}
                action={
                  <button type="button" onClick={() => handleQuickOpen("branch")} className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer">
                    + Add Branch
                  </button>
                }
              />
              <Select
                label="System Role &amp; Access"
                value={formData.role || formData.userId?.role || "Employee"}
                onChange={(v) => handleChange("role", v)}
                options={[
                  { value: "Employee", label: "Team Member / Employee" },
                  { value: "HR", label: "HR Manager" },
                  { value: "Manager", label: "Manager" },
                  { value: "CompanyAdmin", label: "Company Admin" }
                ]}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Select
                label="Reporting Manager"
                value={typeof formData.reportingManagerId === "object" ? formData.reportingManagerId?._id : formData.reportingManagerId}
                onChange={(v) => handleChange("reportingManagerId", v)}
                options={managers.map(m => ({ value: m._id, label: `${m.user?.name || m.firstName + ' ' + m.lastName} (${m.role || 'Member'})` }))}
              />
              <Select
                label="Employment Type"
                value={formData.employmentType ? formData.employmentType.toLowerCase().replace('_', '-') : "full-time"}
                onChange={(v) => handleChange("employmentType", v)}
                options={[
                  { value: "full-time", label: "Full-Time" },
                  { value: "part-time", label: "Part-Time" },
                  { value: "contract", label: "Contractual" },
                  { value: "intern", label: "Internship" }
                ]}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <Select
                label="Work Mode"
                value={formData.workMode ? formData.workMode.toLowerCase() : "office"}
                onChange={(v) => handleChange("workMode", v.toLowerCase())}
                options={[
                  { value: "office", label: "In-Office" },
                  { value: "remote", label: "Remote / WFH" },
                  { value: "hybrid", label: "Hybrid" }
                ]}
              />
              <Input label="Joining Date" type="date" required value={formData.joiningDate} onChange={(v) => handleChange("joiningDate", v)} />
              <Input label="Confirmation Date" type="date" value={formData.confirmationDate} onChange={(v) => handleChange("confirmationDate", v)} />
            </div>

            {/* Module License & Feature Access */}
            <div className="bg-slate-50 dark:bg-[#0D1321] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu size={14} className="text-amber-500" />
                    <span>Module License &amp; Feature Access</span>
                  </h4>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">
                    Allocate module access for this employee according to the active subscription quota.
                  </p>
                </div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Plan Quota Enforced
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
                    const isChecked = (formData.assignedModules || []).includes(m.key);
                    const isFull = usageInfo && !usageInfo.isUnlimited && usageInfo.remaining <= 0;

                    return (
                      <div
                        key={m.key}
                        onClick={() => {
                          if (isFull && !isChecked) return;
                          const cur = formData.assignedModules || [];
                          const next = isChecked ? cur.filter((x) => x !== m.key) : [...cur, m.key];
                          handleChange("assignedModules", next);
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                          isChecked
                            ? "bg-amber-500/10 border-amber-500/50 shadow-xs ring-1 ring-amber-500/30"
                            : isFull
                            ? "opacity-60 bg-rose-500/5 border-rose-300 dark:border-rose-900 cursor-not-allowed"
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
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isFull && !isChecked}
                            onChange={() => {}}
                            className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer pointer-events-none mt-0.5"
                          />
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-bold">
                          {usageInfo?.isUnlimited ? (
                            <span className="text-emerald-600 dark:text-emerald-400">Full plan seats ({usageInfo.used} used)</span>
                          ) : (
                            <span className={isFull && !isChecked ? "text-rose-500" : "text-amber-600 dark:text-amber-400"}>
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

            {/* Remote Punch Option */}
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-[#0D1321] border border-slate-200/80 dark:border-slate-800">
              <input
                type="checkbox"
                id="allowRemotePunch"
                checked={formData.allowRemotePunch || false}
                onChange={(e) => handleChange("allowRemotePunch", e.target.checked)}
                className="w-4 h-4 text-amber-500 rounded border-slate-300 dark:border-slate-700 focus:ring-amber-500 cursor-pointer"
              />
              <label htmlFor="allowRemotePunch" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                Allow Remote Punch &amp; Geofence Bypass (Ideal for Field Sales &amp; Remote Executives)
              </label>
            </div>

            {/* Live GPS Location Tracking Toggle */}
            {subscribedModules.length === 0 || subscribedModules.includes("location_tracking") ? (
              <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-[#0D1321] border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <label htmlFor="isLocationTrackingEnabled" className="text-xs font-bold text-slate-900 dark:text-slate-100 cursor-pointer">
                        Live GPS Location Tracking (Field Staff)
                      </label>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                        formData.isLocationTrackingEnabled
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700"
                      }`}>
                        {formData.isLocationTrackingEnabled ? "TRACKING ACTIVE" : "OFFICE STAFF (NO TRACKING)"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Turn ON for field workers to track live travel routes and halts upon punch-in. Turn OFF for office workers (Universal punch-in works normally for all employees without tracking).
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    id="isLocationTrackingEnabled"
                    checked={formData.isLocationTrackingEnabled || false}
                    onChange={(e) => handleChange("isLocationTrackingEnabled", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-amber-500"></div>
                </label>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3 p-4 rounded-2xl bg-slate-100/60 dark:bg-slate-800/30 border border-dashed border-slate-300 dark:border-slate-700">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-400 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                        Live GPS Location Tracking
                      </span>
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        Super Admin Module Inactive
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      GPS tracking is not subscribed for your company. Contact Super Admin to enable this add-on module.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ STEP 3: Address & Emergency ═══════════════════════════════════ */}
        {step === 3 && (
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 pb-2 mb-1 border-b border-slate-100 dark:border-slate-800/60">
              <div className="w-5 h-5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <MapPin size={11} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-[10.5px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Address &amp; Emergency Contact</h3>
                <p className="hidden">Residential address and designated emergency contact person</p>
              </div>
            </div>

            {/* Current Address */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Current Residential Address</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Input label="Address Line 1" value={formData.currentAddress?.addressLine1} onChange={(v) => handleNestedChange("currentAddress", "addressLine1", v)} placeholder="Enter full street address" />
                <Input label="Address Line 2" value={formData.currentAddress?.addressLine2} onChange={(v) => handleNestedChange("currentAddress", "addressLine2", v)} placeholder="Enter area, landmark (optional)" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <Input label="City" value={formData.currentAddress?.city} onChange={(v) => handleNestedChange("currentAddress", "city", v)} placeholder="Enter city name" />
                <Input label="State" value={formData.currentAddress?.state} onChange={(v) => handleNestedChange("currentAddress", "state", v)} placeholder="Enter state name" />
                <Input label="Pincode / ZIP" value={formData.currentAddress?.pincode} onChange={(v) => handleNestedChange("currentAddress", "pincode", v)} placeholder="Enter 6-digit pincode" />
              </div>
            </div>

            {/* Permanent Address */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Permanent Address</h4>
                <button
                  type="button"
                  onClick={copyCurrentAddressToPermanent}
                  className="text-xs font-extrabold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  ⚡ Same as Current Address
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Input label="Address Line 1" value={formData.permanentAddress?.addressLine1} onChange={(v) => handleNestedChange("permanentAddress", "addressLine1", v)} placeholder="Enter full street address" />
                <Input label="Address Line 2" value={formData.permanentAddress?.addressLine2} onChange={(v) => handleNestedChange("permanentAddress", "addressLine2", v)} placeholder="Enter area, landmark (optional)" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <Input label="City" value={formData.permanentAddress?.city} onChange={(v) => handleNestedChange("permanentAddress", "city", v)} placeholder="Enter city name" />
                <Input label="State" value={formData.permanentAddress?.state} onChange={(v) => handleNestedChange("permanentAddress", "state", v)} placeholder="Enter state name" />
                <Input label="Pincode / ZIP" value={formData.permanentAddress?.pincode} onChange={(v) => handleNestedChange("permanentAddress", "pincode", v)} placeholder="Enter 6-digit pincode" />
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Emergency Contact Person</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <Input label="Contact Person Name" value={formData.emergencyContact?.name} onChange={(v) => handleNestedChange("emergencyContact", "name", v)} placeholder="Enter emergency contact person name" />
                <Input label="Relationship" value={formData.emergencyContact?.relation} onChange={(v) => handleNestedChange("emergencyContact", "relation", v)} placeholder="Enter relationship (e.g. Spouse, Parent)" />
                <Input label="Emergency Phone" type="tel" value={formData.emergencyContact?.phone} onChange={(v) => handleNestedChange("emergencyContact", "phone", v)} placeholder="Enter emergency contact phone number" />
              </div>
            </div>
          </div>
        )}

        {/* ══ STEP 4: Salary & Leaves ═══════════════════════════════════════ */}
        {step === 4 && (
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 pb-2 mb-1 border-b border-slate-100 dark:border-slate-800/60">
              <div className="w-5 h-5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <DollarSign size={11} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-[10.5px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Compensation & Leave Balance</h3>
                <p className="hidden">Monthly/Annual salary breakdown and allocated leave quotas</p>
              </div>
            </div>

            {/* Salary Breakdown */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Salary Structure (₹ INR)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <Input label="Annual CTC (Gross)" type="number" value={formData.salaryDetails?.ctc} onChange={(v) => handleNestedChange("salaryDetails", "ctc", v)} placeholder="₹ 6,00,000" />
                <Input label="Basic Salary (Monthly)" type="number" value={formData.salaryDetails?.basic} onChange={(v) => handleNestedChange("salaryDetails", "basic", v)} placeholder="₹ 25,000" />
                <Input label="HRA (Monthly)" type="number" value={formData.salaryDetails?.hra} onChange={(v) => handleNestedChange("salaryDetails", "hra", v)} placeholder="₹ 10,000" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <Input label="Special Allowance" type="number" value={formData.salaryDetails?.specialAllowance} onChange={(v) => handleNestedChange("salaryDetails", "specialAllowance", v)} placeholder="₹ 5,000" />
                <Input label="PF Deductions" type="number" value={formData.salaryDetails?.pf} onChange={(v) => handleNestedChange("salaryDetails", "pf", v)} placeholder="₹ 1,800" />
                <Input label="ESI Deductions" type="number" value={formData.salaryDetails?.esi} onChange={(v) => handleNestedChange("salaryDetails", "esi", v)} placeholder="₹ 0" />
                <Input label="TDS Deductions" type="number" value={formData.salaryDetails?.tds} onChange={(v) => handleNestedChange("salaryDetails", "tds", v)} placeholder="₹ 1,000" />
              </div>
            </div>

            {/* Leave Balance Quotas */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Calendar size={14} className="text-amber-500" />
                    Leave Allocations & Quota Matrix
                  </h4>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Configure monthly allowances, total paid leaves, and unpaid loss-of-pay quota.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Paid: {Number(formData.leaveBalance?.paidLeaves ?? (Number(formData.leaveBalance?.casual || 0) + Number(formData.leaveBalance?.sick || 0) + Number(formData.leaveBalance?.annual || 0)))} Days/Yr
                  </span>
                  <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Monthly: {formData.leaveBalance?.monthly ?? 2} Days/Mo
                  </span>
                </div>
              </div>

              {/* Primary Entitlements: Month Leaves, Paid Leaves, Unpaid Leaves */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-amber-500/5 dark:bg-amber-500/5 border border-amber-500/20">
                <Input
                  label="Monthly Leaves (Allowed / Month)"
                  type="number"
                  value={formData.leaveBalance?.monthly}
                  onChange={(v) => handleNestedChange("leaveBalance", "monthly", v === "" ? "" : Number(v))}
                  placeholder="e.g. 2"
                  hint="Leaves allowed per month"
                />
                <Input
                  label="Total Paid Leaves (Annual Quota)"
                  type="number"
                  value={formData.leaveBalance?.paidLeaves}
                  onChange={(v) => handleNestedChange("leaveBalance", "paidLeaves", v === "" ? "" : Number(v))}
                  placeholder="e.g. 18"
                  hint="Total paid leave quota per year"
                />
                <Input
                  label="Unpaid Leaves (LOP / Loss of Pay)"
                  type="number"
                  value={formData.leaveBalance?.unpaidLeaves ?? formData.leaveBalance?.unpaid}
                  onChange={(v) => {
                    const val = v === "" ? "" : Number(v);
                    handleNestedChange("leaveBalance", "unpaidLeaves", val);
                    handleNestedChange("leaveBalance", "unpaid", val);
                  }}
                  placeholder="e.g. 0"
                  hint="Unpaid / LWP leave balance buffer"
                />
              </div>

              {/* Category Breakdown (CL, SL, PL) */}
              <div className="space-y-2">
                <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Detailed Leave Type Distribution (Days)
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <Input
                    label="Casual Leaves (CL)"
                    type="number"
                    value={formData.leaveBalance?.casual}
                    onChange={(v) => {
                      const val = v === "" ? "" : Number(v);
                      handleNestedChange("leaveBalance", "casual", val);
                      const s = Number(formData.leaveBalance?.sick || 0);
                      const a = Number(formData.leaveBalance?.annual || 0);
                      handleNestedChange("leaveBalance", "paidLeaves", (Number(val) || 0) + s + a);
                    }}
                    placeholder="12"
                  />
                  <Input
                    label="Sick Leaves (SL)"
                    type="number"
                    value={formData.leaveBalance?.sick}
                    onChange={(v) => {
                      const val = v === "" ? "" : Number(v);
                      handleNestedChange("leaveBalance", "sick", val);
                      const c = Number(formData.leaveBalance?.casual || 0);
                      const a = Number(formData.leaveBalance?.annual || 0);
                      handleNestedChange("leaveBalance", "paidLeaves", c + (Number(val) || 0) + a);
                    }}
                    placeholder="6"
                  />
                  <Input
                    label="Annual / Privilege Leaves (PL)"
                    type="number"
                    value={formData.leaveBalance?.annual}
                    onChange={(v) => {
                      const val = v === "" ? "" : Number(v);
                      handleNestedChange("leaveBalance", "annual", val);
                      const c = Number(formData.leaveBalance?.casual || 0);
                      const s = Number(formData.leaveBalance?.sick || 0);
                      handleNestedChange("leaveBalance", "paidLeaves", c + s + (Number(val) || 0));
                    }}
                    placeholder="15"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ STEP 5: Bank & Identity ═══════════════════════════════════════ */}
        {step === 5 && (
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 pb-2 mb-1 border-b border-slate-100 dark:border-slate-800/60">
              <div className="w-5 h-5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <CreditCard size={11} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-[10.5px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Banking & Government Identification</h3>
                <p className="hidden">Bank disbursement details, IFSC code, Aadhaar, and PAN</p>
              </div>
            </div>

            {/* Banking Details */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Bank Account for Payroll</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Input label="Bank Name" value={formData.bankDetails?.bankName} onChange={(v) => handleNestedChange("bankDetails", "bankName", v)} placeholder="Enter bank name" />
                <Input label="Account Holder Name" value={formData.bankDetails?.accountHolderName} onChange={(v) => handleNestedChange("bankDetails", "accountHolderName", v)} placeholder="Enter account holder name" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <Input label="Account Number" value={formData.bankDetails?.accountNumber} onChange={(v) => handleNestedChange("bankDetails", "accountNumber", v)} placeholder="Enter bank account number" />
                <Input label="IFSC Code" value={formData.bankDetails?.ifscCode} onChange={(v) => handleNestedChange("bankDetails", "ifscCode", v)} placeholder="Enter 11-character IFSC code" />
                <Input label="UPI ID (Optional)" value={formData.bankDetails?.upiId} onChange={(v) => handleNestedChange("bankDetails", "upiId", v)} placeholder="Enter UPI ID (optional)" />
              </div>
            </div>

            {/* Statutory Identity */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Government Identity Numbers</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Input label="Aadhaar Card Number" value={formData.aadhaarNumber} onChange={(v) => handleChange("aadhaarNumber", v)} placeholder="Enter 12-digit Aadhaar number" />
                <Input label="PAN Card Number" value={formData.panNumber} onChange={(v) => handleChange("panNumber", v)} placeholder="Enter 10-character PAN number" />
              </div>
            </div>
          </div>
        )}

        {/* ══ STEP 6: Document Vault ════════════════════════════════════════ */}
        {step === 6 && (
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 pb-2 mb-1 border-b border-slate-100 dark:border-slate-800/60">
              <div className="w-5 h-5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <FileText size={11} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-[10.5px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Document Vault & Verification</h3>
                <p className="hidden">Upload, view, and replace official employee documents securely</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <DocumentUploader
                title="Offer Letter"
                docKey="offerLetter"
                currentUrl={formData.documents?.offerLetter}
                employeeId={id}
                onUploaded={handleDocumentUploaded}
              />
              <DocumentUploader
                title="Joining Letter"
                docKey="joiningLetter"
                currentUrl={formData.documents?.joiningLetter}
                employeeId={id}
                onUploaded={handleDocumentUploaded}
              />
              <DocumentUploader
                title="Resume / Curriculum Vitae"
                docKey="resume"
                currentUrl={formData.documents?.resume}
                employeeId={id}
                onUploaded={handleDocumentUploaded}
              />
              <DocumentUploader
                title="Previous Salary Slip"
                docKey="salarySlipPrevious"
                currentUrl={formData.documents?.salarySlipPrevious}
                employeeId={id}
                onUploaded={handleDocumentUploaded}
              />
              <DocumentUploader
                title="PAN Card Document"
                docKey="panCard"
                currentUrl={formData.documents?.panCard}
                employeeId={id}
                onUploaded={handleDocumentUploaded}
              />
              <DocumentUploader
                title="Aadhaar Card Document"
                docKey="aadhaarFront"
                currentUrl={formData.documents?.aadhaarFront || formData.documents?.aadhaarBack}
                employeeId={id}
                onUploaded={handleDocumentUploaded}
              />
            </div>
          </div>
        )}

        {/* ══ STEP 7: Review & Summary ══════════════════════════════════════ */}
        {step === 7 && (
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 pb-2 mb-1 border-b border-slate-100 dark:border-slate-800/60">
              <div className="w-5 h-5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <CheckCheck size={11} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-[10.5px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Profile Summary & Verification</h3>
                <p className="hidden">Verify all employee parameters before committing updates to the database</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              
              {/* Card 1: Basic */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0D1321] border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
                  <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <User size={13} className="text-amber-500" /> Basic Info
                  </span>
                  <button onClick={() => setStep(1)} className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer">Edit</button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-slate-400 text-[10px] block">Full Name</span><span className="font-bold text-slate-800 dark:text-slate-200">{name}</span></div>
                  <div><span className="text-slate-400 text-[10px] block">Email</span><span className="font-bold text-slate-800 dark:text-slate-200 truncate block">{formData.email}</span></div>
                  <div><span className="text-slate-400 text-[10px] block">Phone</span><span className="font-bold text-slate-800 dark:text-slate-200">{formData.phone || "—"}</span></div>
                  <div><span className="text-slate-400 text-[10px] block">Gender / DOB</span><span className="font-bold text-slate-800 dark:text-slate-200">{formData.gender || "—"} • {formData.dateOfBirth || "—"}</span></div>
                </div>
              </div>

              {/* Card 2: Job */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0D1321] border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
                  <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Briefcase size={13} className="text-amber-500" /> Job & Role
                  </span>
                  <button onClick={() => setStep(2)} className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer">Edit</button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-slate-400 text-[10px] block">System Role</span><span className="font-bold text-slate-800 dark:text-slate-200">{formData.role || "Employee"}</span></div>
                  <div><span className="text-slate-400 text-[10px] block">Employment Type</span><span className="font-bold text-slate-800 dark:text-slate-200">{formData.employmentType || "Full-Time"}</span></div>
                  <div><span className="text-slate-400 text-[10px] block">Work Mode</span><span className="font-bold text-slate-800 dark:text-slate-200">{formData.workMode || "Office"}</span></div>
                  <div><span className="text-slate-400 text-[10px] block">Joining Date</span><span className="font-bold text-slate-800 dark:text-slate-200">{formData.joiningDate || "—"}</span></div>
                </div>
              </div>

              {/* Card 3: Salary */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0D1321] border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
                  <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <DollarSign size={13} className="text-amber-500" /> Compensation
                  </span>
                  <button onClick={() => setStep(4)} className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer">Edit</button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-slate-400 text-[10px] block">Annual CTC</span><span className="font-bold text-slate-800 dark:text-slate-200">{formData.salaryDetails?.ctc ? `₹${Number(formData.salaryDetails.ctc).toLocaleString('en-IN')}` : "—"}</span></div>
                  <div><span className="text-slate-400 text-[10px] block">Monthly Basic</span><span className="font-bold text-slate-800 dark:text-slate-200">{formData.salaryDetails?.basic ? `₹${Number(formData.salaryDetails.basic).toLocaleString('en-IN')}` : "—"}</span></div>
                  <div><span className="text-slate-400 text-[10px] block">HRA</span><span className="font-bold text-slate-800 dark:text-slate-200">{formData.salaryDetails?.hra ? `₹${Number(formData.salaryDetails.hra).toLocaleString('en-IN')}` : "—"}</span></div>
                  <div><span className="text-slate-400 text-[10px] block">PF Deduction</span><span className="font-bold text-slate-800 dark:text-slate-200">{formData.salaryDetails?.pf ? `₹${Number(formData.salaryDetails.pf).toLocaleString('en-IN')}` : "—"}</span></div>
                </div>
              </div>

              {/* Card 4: Banking */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0D1321] border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
                  <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <FileCheck size={13} className="text-amber-500" /> Identity & Bank
                  </span>
                  <button onClick={() => setStep(5)} className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer">Edit</button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-slate-400 text-[10px] block">Bank Name</span><span className="font-bold text-slate-800 dark:text-slate-200">{formData.bankDetails?.bankName || "—"}</span></div>
                  <div><span className="text-slate-400 text-[10px] block">A/C Number</span><span className="font-bold text-slate-800 dark:text-slate-200">{formData.bankDetails?.accountNumber || "—"}</span></div>
                  <div><span className="text-slate-400 text-[10px] block">Aadhaar No</span><span className="font-bold text-slate-800 dark:text-slate-200">{formData.aadhaarNumber || "—"}</span></div>
                  <div><span className="text-slate-400 text-[10px] block">PAN No</span><span className="font-bold text-slate-800 dark:text-slate-200">{formData.panNumber || "—"}</span></div>
                </div>
              </div>

              {/* Card 5: Leave Quotas */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0D1321] border border-slate-200/80 dark:border-slate-800 space-y-2 sm:col-span-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
                  <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Calendar size={13} className="text-amber-500" /> Leave Entitlements & Allocations
                  </span>
                  <button onClick={() => setStep(4)} className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer">Edit</button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div><span className="text-slate-400 text-[10px] block">Monthly Leaves</span><span className="font-bold text-amber-600 dark:text-amber-400">{formData.leaveBalance?.monthly ?? 2} Days / Mo</span></div>
                  <div><span className="text-slate-400 text-[10px] block">Paid Leaves</span><span className="font-bold text-emerald-600 dark:text-emerald-400">{formData.leaveBalance?.paidLeaves ?? 18} Days / Yr</span></div>
                  <div><span className="text-slate-400 text-[10px] block">Unpaid Leaves (LOP)</span><span className="font-bold text-slate-800 dark:text-slate-200">{formData.leaveBalance?.unpaidLeaves ?? formData.leaveBalance?.unpaid ?? 0} Days</span></div>
                  <div><span className="text-slate-400 text-[10px] block">Breakdown</span><span className="font-bold text-slate-800 dark:text-slate-200">CL: {formData.leaveBalance?.casual || 0} | SL: {formData.leaveBalance?.sick || 0} | PL: {formData.leaveBalance?.annual || 0}</span></div>
                </div>
              </div>

              {/* Card 6: Assigned Module Licenses */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0D1321] border border-slate-200/80 dark:border-slate-800 space-y-2 sm:col-span-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
                  <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Cpu size={13} className="text-amber-500" /> Assigned Module Licenses ({(formData.assignedModules || []).filter((m) => subscribedModules.includes(m)).length})
                  </span>
                  <button onClick={() => setStep(2)} className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer">Edit</button>
                </div>
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

            </div>

            {/* Commitment CTA Banner */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">Ready to save employee profile updates?</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">All updates will be immediately reflected in attendance, payroll, and dashboard access.</p>
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={!isDirty || updateMutation.isPending}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {updateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} strokeWidth={2.5} />}
                <span>{updateMutation.isPending ? "Saving..." : "Commit All Changes"}</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Step Navigation Footer ────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setStep(prev => Math.max(1, prev - 1))}
            disabled={step === 1}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={14} /> <span>Previous Step</span>
          </button>

          <div className="flex items-center gap-2">
            {step < STEPS.length ? (
              <button
                type="button"
                onClick={() => setStep(prev => Math.min(STEPS.length, prev + 1))}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white text-xs font-extrabold shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>Next Step</span> <ChevronRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                disabled={!isDirty || updateMutation.isPending}
                className="px-6 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white text-xs font-extrabold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {updateMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} strokeWidth={2.5} />}
                <span>Save Changes</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* ── Audit Log Slide-over Drawer ─────────────────────────────────── */}
      {showAuditLog && (
        <div className="fixed inset-0 z-50 flex justify-end animate-fadeIn">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={() => setShowAuditLog(false)} />
          <div className="relative w-full sm:w-[480px] bg-white dark:bg-[#111C24] h-full flex flex-col shadow-2xl border-l border-slate-200 dark:border-slate-800 animate-slideLeft">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <History size={16} className="text-amber-500" />
                <h3 className="text-[10.5px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Audit Timeline</h3>
              </div>
              <button onClick={() => setShowAuditLog(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50 dark:bg-[#0D1321]">
              {auditRes?.data?.logs?.length > 0 ? (
                auditRes.data.logs.map((log) => (
                  <div key={log._id} className="p-3.5 rounded-2xl bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 dark:text-white">{log.performedBy?.name || "System Admin"}</span>
                      <span className="text-[10px] font-bold text-slate-400">{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                    <span className="inline-block px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10.5px] font-extrabold">
                      {log.action}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-400 text-xs font-bold">No historical audit logs found for this employee.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Quick Create Master Data Modal ───────────────────────────────── */}
      {quickModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#111C24] rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 animate-slideUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Create New {quickModal}
              </h3>
              <button onClick={() => setQuickModal(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleQuickSave} className="space-y-3.5">
              {quickModal === "designation" && (
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Department *</label>
                  <select
                    value={quickForm.departmentId}
                    onChange={(e) => setQuickForm({ ...quickForm, departmentId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0D1321] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">{quickModal === "branch" ? "Branch Name" : "Name"} *</label>
                <input
                  type="text"
                  required
                  placeholder={`Enter ${quickModal} name`}
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
                    placeholder="e.g. Pune, Mumbai"
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
                  className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white rounded-xl text-xs font-extrabold shadow-sm flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {quickSaving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  <span>Save</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}