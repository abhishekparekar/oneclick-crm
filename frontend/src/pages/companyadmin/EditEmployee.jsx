import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  getEmployeeByIdApi, updateEmployeeApi, patchEmployeeStatusApi,
  getCompanyAuditLogsApi, getDepartmentsApi, getDesignationsApi,
  getBranchesApi, getEmployeesApi,
  createDepartmentApi, createDesignationApi, createBranchApi,
  getLeaveBalanceApi, updateLeaveBalanceApi, uploadEmployeeDocumentApi
} from "../../api/companyAdminApi";
import {
  User, Mail, Phone, MapPin, Briefcase, CreditCard, ShieldCheck,
  FileText, Coins, Award, Camera, Save, ArrowLeft, ChevronDown,
  ChevronUp, CheckCircle2, History, X, Lock, PowerOff, Download,
  AlertTriangle, RefreshCw, Plus, Loader2, Building2, CalendarDays,
  Upload, Eye, ChevronRight, ChevronLeft, CheckCheck, Trash2,
  ExternalLink, Sparkles, Shield, DollarSign, Users, AlertCircle, FileCheck,
  Calendar
} from "lucide-react";

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
  <div className={`space-y-1.5 ${className}`}>
    <div className="flex items-center justify-between">
      <label className="block text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
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

  const { data: auditRes, refetch: refetchAudit } = useQuery({
    queryKey: ["auditLogs", id],
    queryFn: () => getCompanyAuditLogsApi({ entityId: id, module: "Team Member" }),
    enabled: showAuditLog,
  });

  const { data: leaveRes } = useQuery({
    queryKey: ["leaveBalance", id],
    queryFn: () => getLeaveBalanceApi({ employeeId: id }),
  });

  // Populate form data
  useEffect(() => {
    if (empRes?.data?.employee && !formData) {
      const emp = empRes.data.employee;
      const resolvedPhoto = emp.photo || emp.documents?.photo || emp.userId?.profileImage || "";
      const initialData = {
        ...emp,
        photo: resolvedPhoto,
        dateOfBirth: emp.dateOfBirth ? emp.dateOfBirth.split('T')[0] : "",
        joiningDate: emp.joiningDate ? emp.joiningDate.split('T')[0] : "",
        confirmationDate: emp.confirmationDate ? emp.confirmationDate.split('T')[0] : "",
        managerAccessLevel: emp.managerAccessLevel || "team",
        allowRemotePunch: emp.allowRemotePunch || false,
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
      gender: formData.gender,
      dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString() : null,
      bloodGroup: formData.bloodGroup,
      maritalStatus: formData.maritalStatus,
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
      employmentType: formData.employmentType,
      workMode: formData.workMode,
      allowRemotePunch: formData.allowRemotePunch,
      joiningDate: formData.joiningDate ? new Date(formData.joiningDate).toISOString() : null,
      confirmationDate: formData.confirmationDate ? new Date(formData.confirmationDate).toISOString() : null,
      noticePeriod: formData.noticePeriod,

      bankDetails: formData.bankDetails,
      aadhaarNumber: formData.aadhaarNumber,
      panNumber: formData.panNumber,
      documents: formData.documents,

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
    <div className="min-h-screen pb-24 space-y-6">
      
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
              <div className="relative">
                {photoUrl ? (
                  <img src={photoUrl} alt={name} className="w-14 h-14 rounded-2xl object-cover border-2 border-white dark:border-slate-700 shadow-md ring-2 ring-amber-500/20" />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white font-black text-lg flex items-center justify-center shadow-md border-2 border-white dark:border-slate-700">
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
                <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-tight">{name}</h1>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 font-mono text-[10.5px] font-extrabold border border-amber-500/20">
                  {formData.employeeCode || "EMP"}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">
                {formData.role || "Employee"} • {formData.email || "No email assigned"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {isDirty && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/10 text-amber-600 border border-amber-500/20 animate-pulse">
                <AlertCircle size={13} /> Unsaved Changes
              </span>
            )}
            <button
              onClick={() => { setShowAuditLog(true); refetchAudit(); }}
              className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0D1321] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <History size={14} className="text-amber-500" />
              <span>Audit Log</span>
            </button>
            <button
              onClick={handleSave}
              disabled={!isDirty || updateMutation.isPending}
              className={`px-5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ${
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

        {/* ── Modern Step Navigation Bar ──────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const isCurrent = step === s.id;
            const isCompleted = step > s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(s.id)}
                className={`p-2.5 rounded-2xl text-left transition-all cursor-pointer border ${
                  isCurrent
                    ? "bg-slate-900 text-white dark:bg-amber-600 shadow-md border-transparent"
                    : isCompleted
                    ? "bg-slate-50 dark:bg-[#0D1321] text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-800 hover:border-amber-500/30"
                    : "bg-white dark:bg-[#111C24] text-slate-400 border-slate-200/40 dark:border-slate-800/40 opacity-70 hover:opacity-100"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black ${isCurrent ? 'bg-white/20 text-white' : isCompleted ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-200/60 dark:bg-slate-800 text-slate-400'}`}>
                    {isCompleted ? <CheckCircle2 size={12} /> : s.id}
                  </div>
                  <span className="text-[11px] font-extrabold truncate">{s.label}</span>
                </div>
                <p className={`text-[9.5px] truncate font-semibold ${isCurrent ? 'text-white/80' : 'text-slate-400'}`}>{s.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Form Step Content Container ─────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-2xs animate-fadeIn">
        
        {/* ══ STEP 1: Basic & Profile Info ══════════════════════════════════ */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <User size={16} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Basic & Personal Information</h3>
                <p className="text-xs text-slate-400 font-medium">Core identification, personal contact, and avatar</p>
              </div>
            </div>

            {/* Profile Avatar Card */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-[#0D1321] border border-slate-200/80 dark:border-slate-800">
              {photoUrl ? (
                <img src={photoUrl} alt={name} className="w-16 h-16 rounded-2xl object-cover border-2 border-white dark:border-slate-700 shadow-sm ring-2 ring-amber-500/20" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white font-black text-xl flex items-center justify-center shadow-sm">
                  {initials}
                </div>
              )}
              <div className="space-y-1">
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">Profile Avatar</h4>
                <p className="text-[11px] text-slate-400">Supported formats: JPG, PNG, WEBP (Max 5MB)</p>
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input label="First Name" required value={formData.firstName} onChange={(v) => handleChange("firstName", v)} placeholder="First Name" />
              <Input label="Middle Name" value={formData.middleName} onChange={(v) => handleChange("middleName", v)} placeholder="Middle Name" />
              <Input label="Last Name" required value={formData.lastName} onChange={(v) => handleChange("lastName", v)} placeholder="Last Name" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Official / Login Email" type="email" required value={formData.email} onChange={(v) => handleChange("email", v)} placeholder="name@company.com" />
              <Input label="Primary Phone Number" type="tel" required value={formData.phone} onChange={(v) => handleChange("phone", v)} placeholder="9876543210" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Alternate Mobile" type="tel" value={formData.alternateMobile} onChange={(v) => handleChange("alternateMobile", v)} placeholder="Optional secondary contact" />
              <Input label="Date of Birth" type="date" value={formData.dateOfBirth} onChange={(v) => handleChange("dateOfBirth", v)} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select label="Gender" value={formData.gender} onChange={(v) => handleChange("gender", v)} options={[
                { value: "Male", label: "Male" }, { value: "Female", label: "Female" }, { value: "Other", label: "Other" }
              ]} />
              <Select label="Blood Group" value={formData.bloodGroup} onChange={(v) => handleChange("bloodGroup", v)} options={[
                { value: "A+", label: "A+" }, { value: "A-", label: "A-" }, { value: "B+", label: "B+" }, { value: "B-", label: "B-" },
                { value: "O+", label: "O+" }, { value: "O-", label: "O-" }, { value: "AB+", label: "AB+" }, { value: "AB-", label: "AB-" }
              ]} />
              <Select label="Marital Status" value={formData.maritalStatus} onChange={(v) => handleChange("maritalStatus", v)} options={[
                { value: "Single", label: "Single" }, { value: "Married", label: "Married" }, { value: "Divorced", label: "Divorced" }
              ]} />
            </div>
          </div>
        )}

        {/* ══ STEP 2: Job Details ═══════════════════════════════════════════ */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <Briefcase size={16} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Job & Employment Details</h3>
                <p className="text-xs text-slate-400 font-medium">Department, designation, role permissions, and branch</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                label="System Role & Access"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Reporting Manager"
                value={typeof formData.reportingManagerId === "object" ? formData.reportingManagerId?._id : formData.reportingManagerId}
                onChange={(v) => handleChange("reportingManagerId", v)}
                options={managers.map(m => ({ value: m._id, label: `${m.user?.name || m.firstName + ' ' + m.lastName} (${m.role || 'Member'})` }))}
              />
              <Select
                label="Employment Type"
                value={formData.employmentType}
                onChange={(v) => handleChange("employmentType", v)}
                options={[
                  { value: "Full-Time", label: "Full-Time" },
                  { value: "Part-Time", label: "Part-Time" },
                  { value: "Contract", label: "Contractual" },
                  { value: "Internship", label: "Internship" },
                  { value: "Freelance", label: "Freelance" }
                ]}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                label="Work Mode"
                value={formData.workMode}
                onChange={(v) => handleChange("workMode", v)}
                options={[
                  { value: "Office", label: "In-Office" },
                  { value: "Remote", label: "Remote / WFH" },
                  { value: "Hybrid", label: "Hybrid" }
                ]}
              />
              <Input label="Joining Date" type="date" required value={formData.joiningDate} onChange={(v) => handleChange("joiningDate", v)} />
              <Input label="Confirmation Date" type="date" value={formData.confirmationDate} onChange={(v) => handleChange("confirmationDate", v)} />
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
                Allow Remote Punch & Geofence Bypass (Ideal for Field Sales & Remote Executives)
              </label>
            </div>
          </div>
        )}

        {/* ══ STEP 3: Address & Emergency ═══════════════════════════════════ */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <MapPin size={16} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Address & Emergency Contact</h3>
                <p className="text-xs text-slate-400 font-medium">Residential address and designated emergency contact person</p>
              </div>
            </div>

            {/* Current Address */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Current Residence Address</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Address Line 1" value={formData.currentAddress?.addressLine1} onChange={(v) => handleNestedChange("currentAddress", "addressLine1", v)} placeholder="Flat, building, street" />
                <Input label="Address Line 2" value={formData.currentAddress?.addressLine2} onChange={(v) => handleNestedChange("currentAddress", "addressLine2", v)} placeholder="Area, landmark" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input label="City" value={formData.currentAddress?.city} onChange={(v) => handleNestedChange("currentAddress", "city", v)} placeholder="e.g. Pune" />
                <Input label="State" value={formData.currentAddress?.state} onChange={(v) => handleNestedChange("currentAddress", "state", v)} placeholder="e.g. Maharashtra" />
                <Input label="Pincode / ZIP" value={formData.currentAddress?.pincode} onChange={(v) => handleNestedChange("currentAddress", "pincode", v)} placeholder="e.g. 411001" />
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Address Line 1" value={formData.permanentAddress?.addressLine1} onChange={(v) => handleNestedChange("permanentAddress", "addressLine1", v)} placeholder="Flat, building, street" />
                <Input label="Address Line 2" value={formData.permanentAddress?.addressLine2} onChange={(v) => handleNestedChange("permanentAddress", "addressLine2", v)} placeholder="Area, landmark" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input label="City" value={formData.permanentAddress?.city} onChange={(v) => handleNestedChange("permanentAddress", "city", v)} placeholder="e.g. Pune" />
                <Input label="State" value={formData.permanentAddress?.state} onChange={(v) => handleNestedChange("permanentAddress", "state", v)} placeholder="e.g. Maharashtra" />
                <Input label="Pincode / ZIP" value={formData.permanentAddress?.pincode} onChange={(v) => handleNestedChange("permanentAddress", "pincode", v)} placeholder="e.g. 411001" />
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Emergency Contact Person</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input label="Contact Person Name" value={formData.emergencyContact?.name} onChange={(v) => handleNestedChange("emergencyContact", "name", v)} placeholder="e.g. Sunita Patil" />
                <Input label="Relationship" value={formData.emergencyContact?.relation} onChange={(v) => handleNestedChange("emergencyContact", "relation", v)} placeholder="e.g. Spouse / Parent" />
                <Input label="Emergency Phone" type="tel" value={formData.emergencyContact?.phone} onChange={(v) => handleNestedChange("emergencyContact", "phone", v)} placeholder="e.g. 9876543210" />
              </div>
            </div>
          </div>
        )}

        {/* ══ STEP 4: Salary & Leaves ═══════════════════════════════════════ */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <DollarSign size={16} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Compensation & Leave Balance</h3>
                <p className="text-xs text-slate-400 font-medium">Monthly/Annual salary breakdown and allocated leave quotas</p>
              </div>
            </div>

            {/* Salary Breakdown */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Salary Structure (₹ INR)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input label="Annual CTC (Gross)" type="number" value={formData.salaryDetails?.ctc} onChange={(v) => handleNestedChange("salaryDetails", "ctc", v)} placeholder="₹ 6,00,000" />
                <Input label="Basic Salary (Monthly)" type="number" value={formData.salaryDetails?.basic} onChange={(v) => handleNestedChange("salaryDetails", "basic", v)} placeholder="₹ 25,000" />
                <Input label="HRA (Monthly)" type="number" value={formData.salaryDetails?.hra} onChange={(v) => handleNestedChange("salaryDetails", "hra", v)} placeholder="₹ 10,000" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <CreditCard size={16} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Banking & Government Identification</h3>
                <p className="text-xs text-slate-400 font-medium">Bank disbursement details, IFSC code, Aadhaar, and PAN</p>
              </div>
            </div>

            {/* Banking Details */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Bank Account for Payroll</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Bank Name" value={formData.bankDetails?.bankName} onChange={(v) => handleNestedChange("bankDetails", "bankName", v)} placeholder="e.g. HDFC Bank, SBI" />
                <Input label="Account Holder Name" value={formData.bankDetails?.accountHolderName} onChange={(v) => handleNestedChange("bankDetails", "accountHolderName", v)} placeholder="As in passbook" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input label="Account Number" value={formData.bankDetails?.accountNumber} onChange={(v) => handleNestedChange("bankDetails", "accountNumber", v)} placeholder="Account Number" />
                <Input label="IFSC Code" value={formData.bankDetails?.ifscCode} onChange={(v) => handleNestedChange("bankDetails", "ifscCode", v)} placeholder="e.g. HDFC0001234" />
                <Input label="UPI ID (Optional)" value={formData.bankDetails?.upiId} onChange={(v) => handleNestedChange("bankDetails", "upiId", v)} placeholder="e.g. rahul@okhdfcbank" />
              </div>
            </div>

            {/* Statutory Identity */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Government Identity Numbers</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Aadhaar Card Number" value={formData.aadhaarNumber} onChange={(v) => handleChange("aadhaarNumber", v)} placeholder="12-digit UID" />
                <Input label="PAN Card Number" value={formData.panNumber} onChange={(v) => handleChange("panNumber", v)} placeholder="10-digit alphanumeric PAN" />
              </div>
            </div>
          </div>
        )}

        {/* ══ STEP 6: Document Vault ════════════════════════════════════════ */}
        {step === 6 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <FileText size={16} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Document Vault & Verification</h3>
                <p className="text-xs text-slate-400 font-medium">Upload, view, and replace official employee documents securely</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <CheckCheck size={16} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Profile Summary & Verification</h3>
                <p className="text-xs text-slate-400 font-medium">Verify all employee parameters before committing updates to the database</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
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
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Audit Timeline</h3>
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