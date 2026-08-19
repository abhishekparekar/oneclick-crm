import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getEmployeeByIdApi, updateEmployeeApi, patchEmployeeStatusApi,
  getCompanyAuditLogsApi, getDepartmentsApi, getDesignationsApi,
  getBranchesApi, getEmployeesApi,
  createDepartmentApi, createDesignationApi, createBranchApi,
  getLeaveBalanceApi, updateLeaveBalanceApi
} from "../../api/companyAdminApi";
import {
  User, Mail, Phone, MapPin, Briefcase, CreditCard, ShieldCheck,
  FileText, Coins, Award, Camera, Save, ArrowLeft, ChevronDown,
  ChevronUp, CheckCircle2, History, X, Lock, PowerOff, Download,
  AlertTriangle, RefreshCw, Plus, Loader2, Building2, CalendarDays
} from "lucide-react";

// ── Components ─────────────────────────────────────────────────────────────

const SectionCard = ({ title, icon: Icon, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="bg-ca-surface rounded-2xl border border-ca-border shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] overflow-hidden mb-3">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-6 py-4 bg-ca-surface border-b border-ca-border hover:bg-ca-bg/50 transition-colors group"
      >
        <div className="flex items-center space-x-2">
          <div className="w-9 h-9 rounded-xl bg-theme-3/5 border-none flex items-center justify-center group-hover:bg-theme-3/10 transition-colors">
            <Icon size={16} className="text-theme-4" />
          </div>
          <h3 className="text-base font-bold text-ca-text">{title}</h3>
        </div>
        {isOpen ? <ChevronUp size={18} className="text-ca-text-secondary" /> : <ChevronDown size={18} className="text-ca-text-secondary" />}
      </button>
      {isOpen && <div className="p-5">{children}</div>}
    </div>
  );
};

const Input = ({ label, type = "text", value, onChange, placeholder, disabled = false, required = false }) => (
  <div className="space-y-1.5">
    <label className="block text-[11px] font-bold text-ca-text-secondary uppercase tracking-widest mb-1.5">
      {label} {required && <span className="text-ca-primary">*</span>}
    </label>
    <input
      type={type}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className={`w-full px-3 py-2 border border-ca-border rounded-lg text-base text-ca-text placeholder-ca-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-ca-primary focus:border-ca-primary transition-shadow ${disabled ? "bg-ca-bg text-ca-text-secondary cursor-not-allowed" : "bg-ca-surface"}`}
    />
  </div>
);

const Select = ({ label, value, onChange, options, disabled = false, required = false, placeholder = "Select...", action }) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <label className="block text-[11px] font-bold text-ca-text-secondary uppercase tracking-widest mb-1.5">
        {label} {required && <span className="text-ca-primary">*</span>}
      </label>
      {action}
    </div>
    <div className="relative">
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full appearance-none pl-3 pr-8 py-2 border border-ca-border rounded-lg text-base text-ca-text focus:outline-none focus:ring-2 focus:ring-ca-primary focus:border-ca-primary transition-shadow ${disabled ? "bg-ca-bg text-ca-text-secondary cursor-not-allowed" : "bg-ca-surface"}`}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-2.5 text-ca-text-secondary pointer-events-none" />
    </div>
  </div>
);

const MultiSelect = ({ label, selected = [], onChange, options, disabled = false, required = false, placeholder = "Select...", action }) => {
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
    <div className="space-y-1.5" ref={containerRef}>
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-bold text-ca-text-secondary uppercase tracking-widest mb-1.5">
          {label} {required && <span className="text-ca-primary">*</span>}
        </label>
        {action}
      </div>
      <div className="relative">
        <div
          className={`w-full appearance-none pl-3 pr-8 py-2 border border-ca-border rounded-lg text-base text-ca-text transition-shadow flex items-center justify-between min-h-[38px] ${disabled ? "bg-ca-bg text-ca-text-secondary cursor-not-allowed" : "bg-ca-surface cursor-pointer focus:ring-2 focus:ring-ca-primary focus:border-ca-primary"}`}
          onClick={() => !disabled && setOpen(!open)}
        >
          <span className="truncate block w-full">{selected.length ? selectedLabels : <span className="text-ca-text-secondary">{placeholder}</span>}</span>
        </div>
        <ChevronDown size={14} className="absolute right-3 top-2.5 text-ca-text-secondary pointer-events-none" />

        {open && !disabled && (
          <div className="absolute z-10 w-full mt-1 bg-ca-surface border border-ca-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
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
                  className="mr-2 h-4 w-4 text-theme-4 rounded border-ca-border focus:ring-ca-primary"
                />
                <span className="text-base text-ca-text">{o.label}</span>
              </div>
            ))}
            {options.length === 0 && <div className="p-3 text-base text-ca-text-secondary text-center">No options available</div>}
          </div>
        )}
      </div>
    </div>
  );
};

const MultiInput = ({ label, values, onChange, placeholder }) => {
  const [inputValue, setInputValue] = useState("");
  const addValue = (e) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      if (!values.includes(inputValue.trim())) {
        onChange([...values, inputValue.trim()]);
      }
      setInputValue("");
    }
  };
  const removeValue = (val) => onChange(values.filter(v => v !== val));

  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-bold text-ca-text-secondary uppercase tracking-widest mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {values.map((val) => (
          <span key={val} className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-theme-3/10 text-theme-3 border border-theme-3/30">
            {val}
            <button type="button" onClick={() => removeValue(val)} className="ml-1.5 text-theme-3/60 hover:text-theme-4"><X size={12} /></button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={addValue}
        placeholder={placeholder + " (Press Enter to add)"}
        className="w-full px-3 py-2 border border-ca-border rounded-lg text-base text-ca-text placeholder-ca-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-ca-primary focus:border-ca-primary"
      />
    </div>
  );
};

// ── Main Page Component ───────────────────────────────────────────────────

const EditEmployee = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [roleUpdatedState, setRoleUpdatedState] = useState(false);
  const [isRoleEditing, setIsRoleEditing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // ── Queries ──
  const { data: empRes, isLoading: empLoading, isError, error } = useQuery({
    queryKey: ["employee", id],
    queryFn: () => getEmployeeByIdApi(id)
  });

  useEffect(() => {
    if (empRes?.data?.employee && !formData) {
      const emp = empRes.data.employee;
      const initialData = {
        ...emp,
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
        experienceDetails: emp.experienceDetails || [],
        educationDetails: emp.educationDetails || [],
        documents: emp.documents || {},
        leaveBalance: { casual: 0, sick: 0, annual: 0, unpaid: 0 },
        leaveBalanceLoaded: false,
      };
      setFormData(initialData);
      setOriginalData(JSON.stringify(initialData));
    }
  }, [empRes, formData]);

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
    queryFn: () => getLeaveBalanceApi({ employeeId: id })
  });

  useEffect(() => {
    if (leaveRes?.data?.balance && formData && !formData.leaveBalanceLoaded) {
      const lb = leaveRes.data.balance;
      const initialLeave = {
        casual: lb.casual ?? 0,
        sick: lb.sick ?? 0,
        annual: lb.annual ?? 0,
        unpaid: lb.lop ?? lb.unpaid ?? 0,
      };

      setFormData(prev => ({
        ...prev,
        leaveBalance: initialLeave,
        leaveBalanceLoaded: true
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

  // ── Quick Create Modal State ─────────────────────────────────────────────
  const [quickModal, setQuickModal] = useState(null);
  const [quickForm, setQuickForm] = useState({ name: "", description: "", city: "", address: "", departmentId: "" });
  const [quickSaving, setQuickSaving] = useState(false);

  const handleQuickOpen = (type) => {
    setQuickForm({ name: "", description: "", city: "", address: "", departmentId: formData?.accessibleDepartments?.[0] || "" });
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
        if (newDept?._id) handleChange("accessibleDepartments", [...(formData?.accessibleDepartments || []), newDept._id]);
      } else if (quickModal === "designation") {
        const res = await createDesignationApi({ name: quickForm.name.trim(), description: quickForm.description.trim(), departmentId: quickForm.departmentId });
        await queryClient.invalidateQueries(["designations"]);
        const newDesg = res.data?.designation;
        if (newDesg?._id) {
          handleChange("accessibleDepartments", quickForm.departmentId ? [...new Set([...(formData?.accessibleDepartments || []), quickForm.departmentId])] : formData?.accessibleDepartments);
          handleChange("designationId", newDesg._id);
        }
      } else if (quickModal === "branch") {
        const res = await createBranchApi({ branchName: quickForm.name.trim(), name: quickForm.name.trim(), city: quickForm.city.trim(), address: quickForm.address.trim() });
        await queryClient.invalidateQueries(["branches"]);
        const newBranch = res.data?.branch;
        if (newBranch?._id) handleChange("branchId", newBranch._id);
      }
      setQuickModal(null);
    } catch (err) {
      alert(err.response?.data?.message || `Failed to create ${quickModal}`);
    } finally {
      setQuickSaving(false);
    }
  };

  // ── Mutations ──
  const updateMutation = useMutation({
    mutationFn: (data) => updateEmployeeApi(id, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries(["employee", id]);
      queryClient.invalidateQueries(["employees"]);
      setOriginalData(JSON.stringify(formData));
      setIsDirty(false);
      alert("Employee updated successfully!");
    },
    onError: (err) => {
      alert(err?.response?.data?.message || "Failed to update employee");
    }
  });

  const statusMutation = useMutation({
    mutationFn: (status) => patchEmployeeStatusApi(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(["employee", id]);
    }
  });

  const updateLeaveMutation = useMutation({
    mutationFn: (payload) => updateLeaveBalanceApi(id, payload)
  });

  // ── Handlers ──
  useEffect(() => {
    if (formData && originalData) {
      setIsDirty(JSON.stringify(formData) !== originalData);
    }
  }, [formData, originalData]);

  // Warn before leaving
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value }
    }));
  };

  const handleSave = () => {
    if (!isDirty) return;

    // Add confirmation for sensitive changes
    const original = JSON.parse(originalData);
    if (original.salaryDetails?.ctc !== formData.salaryDetails?.ctc || original.reportingManagerId !== formData.reportingManagerId) {
      if (!window.confirm("You are making sensitive changes (Salary or Manager). Are you sure you want to save?")) {
        return;
      }
    }

    // Transform arrays back if needed, prepare payload
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
      joiningDate: formData.joiningDate ? new Date(formData.joiningDate).toISOString() : null,
      confirmationDate: formData.confirmationDate ? new Date(formData.confirmationDate).toISOString() : null,
      noticePeriod: formData.noticePeriod,

      bankDetails: formData.bankDetails,

      aadhaarNumber: formData.aadhaarNumber,
      panNumber: formData.panNumber,

      role: formData.role || formData.userId?.role,
      loginRole: formData.role || formData.userId?.role,

      salaryDetails: formData.salaryDetails,

      skills: formData.skills,
      certifications: formData.certifications,
    };

    updateMutation.mutate(payload, {
      onSuccess: () => {
        if (formData.leaveBalanceLoaded) {
          updateLeaveMutation.mutate({
            casual: formData.leaveBalance.casual,
            sick: formData.leaveBalance.sick,
            annual: formData.leaveBalance.annual,
            lop: formData.leaveBalance.unpaid
          });
        }
      }
    });
  };

  if (empLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <RefreshCw size={24} className="text-theme-3 animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-ca-primary">
        <AlertTriangle size={32} className="mb-2" />
        <p className="font-semibold">Failed to load employee data</p>
        <p className="text-base">{error?.response?.data?.message || error?.message || "Unknown error"}</p>
      </div>
    );
  }

  if (!formData) {
    return null;
  }

  const name = `${formData.firstName || ""} ${formData.lastName || ""}`.trim();
  const initials = name.slice(0, 2).toUpperCase();
  const photoUrl = formData.photo ? (formData.photo.startsWith("http") ? formData.photo : `${(import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace("/api", "")}${formData.photo.startsWith("/") ? "" : "/"}${formData.photo}`) : null;

  return (
    <div className="pb-20 relative">
      {/* ── Sticky Header ────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-[#0f172a]/80 backdrop-blur-md border-b border-white/10 px-6 py-4 -mx-6 mb-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-4">
          <Link to="/company/employees" className="p-2 rounded-lg border border-ca-border text-slate-300 hover:bg-ca-bg transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center space-x-2 text-sm font-medium text-slate-300 mb-1">
              <Link to="/company/dashboard" className="hover:text-theme-4 transition-colors">Dashboard</Link>
              <span>/</span>
              <Link to="/company/employees" className="hover:text-theme-4 transition-colors">Team Members</Link>
              <span>/</span>
              <span className="text-slate-300">Edit Employee</span>
            </div>
            <h1 className="text-2xl font-bold text-white leading-tight">Edit Employee Workspace</h1>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isDirty && (
            <span className="flex items-center text-sm font-semibold text-amber-600 bg-ca-primary-light px-3 py-1.5 rounded-full border border-amber-200">
              <AlertTriangle size={12} className="mr-1.5" /> Unsaved Changes
            </span>
          )}
          <button
            onClick={() => { setShowAuditLog(true); refetchAudit(); }}
            className="flex items-center space-x-1.5 px-3 py-1.5 border border-ca-border rounded-lg text-base font-semibold text-ca-text hover:bg-ca-bg transition-colors"
          >
            <History size={16} /> <span>Audit Log</span>
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty || updateMutation.isLoading}
            className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-extrabold tracking-wide shadow-sm transition-all ${isDirty ? "bg-theme-4 text-white hover:bg-theme-3 hover:shadow" : "bg-ca-bg text-ca-text-secondary cursor-not-allowed"}`}
          >
            {updateMutation.isLoading ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
            <span>Save Changes</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-3">

        {/* ── Left Sidebar Profile ─────────────────────────────────── */}
        <div className="w-full lg:w-72 flex-shrink-0 space-y-5">
          <div className="bg-ca-surface rounded-xl border border-ca-border shadow-sm p-6 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-24 bg-theme-3" />
            <div className="relative mt-4 mb-4">
              <div className="w-24 h-24 mx-auto rounded-full border-4 border-white shadow-md bg-ca-surface relative">
                {photoUrl ? (
                  <img src={photoUrl} alt="Profile" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className="w-full h-full rounded-full bg-ca-bg flex items-center justify-center text-4xl font-bold text-ca-text-secondary">
                    {initials}
                  </div>
                )}
                <button className="absolute bottom-0 right-0 w-8 h-8 bg-theme-4 text-white rounded-full flex items-center justify-center border-2 border-white shadow-sm hover:bg-theme-3 transition-colors">
                  <Camera size={14} />
                </button>
              </div>
            </div>

            <h2 className="text-xl font-bold text-ca-text">{name}</h2>
            <p className="text-base font-medium text-ca-text-secondary mb-3">{formData.employeeCode}</p>

            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-bold border ${formData.status === 'active' ? 'bg-theme-3-light text-theme-2 border-theme-3-light' : 'bg-ca-bg text-ca-text-secondary border-ca-border'}`}>
              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${formData.status === 'active' ? 'bg-theme-3' : 'bg-slate-400'}`} />
              {formData.status === 'active' ? "Active Employee" : "Inactive"}
            </span>

            <div className="mt-3 pt-5 border-t border-ca-border space-y-3 text-left">
              <div className="flex items-center justify-between text-base">
                <span className="text-ca-text-secondary">Profile Completion</span>
                <span className="font-bold text-theme-3">{formData.profileCompletionPercentage || 0}%</span>
              </div>
              <div className="h-1.5 w-full bg-ca-bg rounded-full overflow-hidden">
                <div className="h-full bg-theme-3 rounded-full" style={{ width: `${formData.profileCompletionPercentage || 0}%` }} />
              </div>
            </div>
          </div>

          <div className="bg-ca-surface rounded-xl border border-ca-border shadow-sm p-2">
            <p className="px-3 py-2 text-sm font-bold text-ca-text-secondary uppercase tracking-wider mb-1">Quick Actions</p>
            <button className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg hover:bg-ca-bg text-base font-medium text-ca-text transition-colors">
              <Lock size={13} className="text-ca-text-secondary" /> <span>Reset Password</span>
            </button>
            <button className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg hover:bg-ca-bg text-base font-medium text-ca-text transition-colors">
              <Download size={13} className="text-ca-text-secondary" /> <span>Download Employee Card</span>
            </button>
            <div className="my-1 border-t border-ca-border" />
            <button
              onClick={() => {
                if (window.confirm(`Are you sure you want to ${formData.status === 'active' ? 'deactivate' : 'activate'} this account?`)) {
                  statusMutation.mutate(formData.status === 'active' ? 'inactive' : 'active');
                  setFormData(prev => ({ ...prev, status: prev.status === 'active' ? 'inactive' : 'active' }));
                }
              }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-base font-bold transition-colors ${formData.status === 'active' ? 'text-amber-700 hover:bg-amber-50' : 'text-theme-2 hover:bg-theme-3-light'}`}
            >
              <PowerOff size={13} /> <span>{formData.status === 'active' ? 'Disable Account' : 'Enable Account'}</span>
            </button>
          </div>

          <div className="bg-ca-surface rounded-2xl border border-ca-border shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] p-5">
            <h3 className="font-bold text-ca-text mb-4 flex items-center"><User size={16} className="text-theme-3 mr-2" /> Role Management</h3>
            {!isRoleEditing ? (
              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="text-[11px] font-bold text-ca-text-secondary uppercase tracking-widest mb-1">System Role</p>
                  <p className="text-[15px] font-bold text-ca-text">
                    {formData.role || formData.userId?.role || "Employee"}
                  </p>
                </div>
                <button
                  onClick={() => setIsRoleEditing(true)}
                  className="text-theme-4 hover:text-theme-3 text-sm font-bold px-3 py-1.5 rounded-lg hover:bg-ca-bg transition-colors"
                >
                  Edit
                </button>
              </div>
            ) : (
              <div className="flex items-end space-x-2">
                <div className="flex-1">
                  <Select
                    label="System Role"
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
                <button
                  onClick={() => {
                    const newRole = formData.role || formData.userId?.role || "Employee";
                    updateMutation.mutate({ role: newRole, loginRole: newRole }, {
                      onSuccess: () => {
                        setIsRoleEditing(false);
                        setRoleUpdatedState(true);
                        setTimeout(() => setRoleUpdatedState(false), 3000);
                      }
                    });
                  }}
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 bg-theme-3 text-white text-sm font-bold rounded-xl hover:bg-theme-4 transition-colors min-h-[44px] disabled:opacity-50"
                >
                  {updateMutation.isPending ? "Saving..." : "Update Role"}
                </button>
              </div>
            )}
            {roleUpdatedState && (
              <p className="text-theme-4 text-sm font-semibold mt-3 flex items-center animate-fadeIn">
                <CheckCircle2 size={14} className="mr-1.5" /> Updated successfully
              </p>
            )}
          </div>

          <div className="bg-ca-surface rounded-2xl border border-ca-border shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] p-5">
            <h3 className="font-bold text-ca-text mb-4 flex items-center"><CheckCircle2 size={16} className="text-theme-3 mr-2" /> Current Status</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-ca-text-secondary font-semibold">Active Projects</span>
                  <span className="font-bold text-ca-text">2</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-ca-text-secondary font-semibold">Pending Tasks</span>
                  <span className="font-bold text-ca-text">5</span>
                </div>
              </div>
              <div className="pt-3 border-t border-ca-border">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-ca-text-secondary font-semibold">Attendance (This Month)</span>
                  <span className="font-bold text-theme-3">92%</span>
                </div>
                <div className="h-1.5 bg-ca-bg rounded-full overflow-hidden">
                  <div className="h-full bg-theme-3 rounded-full" style={{ width: '92%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-ca-text-secondary font-semibold">Available Leaves</span>
                  <span className="font-bold text-theme-5">12 Days</span>
                </div>
                <div className="h-1.5 bg-ca-bg rounded-full overflow-hidden">
                  <div className="h-full bg-theme-5 rounded-full" style={{ width: '60%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-ca-surface rounded-2xl border border-ca-border shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] p-4">
            <h3 className="text-sm font-bold text-ca-text-secondary uppercase tracking-wider mb-3">System Info</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-ca-text-secondary">Last Login:</span>
                <span className="font-semibold text-ca-text">Today, 09:30 AM</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-ca-text-secondary">Last Updated:</span>
                <span className="font-semibold text-ca-text">
                  {new Date(formData.updatedAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'short' })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Edit Sections ────────────────────────────────────── */}
        <div className="flex-1 space-y-5">

          <SectionCard title="1. Personal Information" icon={User}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="First Name" required value={formData.firstName} onChange={(v) => handleChange("firstName", v)} />
              <Input label="Middle Name" value={formData.middleName} onChange={(v) => handleChange("middleName", v)} />
              <Input label="Last Name" required value={formData.lastName} onChange={(v) => handleChange("lastName", v)} />
              <Select label="Gender" value={formData.gender} onChange={(v) => handleChange("gender", v)} options={[
                { value: "male", label: "Male" }, { value: "female", label: "Female" }, { value: "other", label: "Other" }
              ]} />
              <Input label="Date of Birth" type="date" value={formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString().split('T')[0] : ""} onChange={(v) => handleChange("dateOfBirth", v)} />
              <Select label="Marital Status" value={formData.maritalStatus} onChange={(v) => handleChange("maritalStatus", v)} options={[
                { value: "single", label: "Single" }, { value: "married", label: "Married" }, { value: "divorced", label: "Divorced" }
              ]} />
              <Select label="Blood Group" value={formData.bloodGroup} onChange={(v) => handleChange("bloodGroup", v)} options={[
                { value: "A+", label: "A+" }, { value: "A-", label: "A-" }, { value: "B+", label: "B+" }, { value: "B-", label: "B-" },
                { value: "O+", label: "O+" }, { value: "O-", label: "O-" }, { value: "AB+", label: "AB+" }, { value: "AB-", label: "AB-" }
              ]} />
            </div>
          </SectionCard>

          <SectionCard title="2. Contact Information" icon={Phone}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="Work Email" type="email" required disabled value={formData.email} onChange={(v) => handleChange("email", v)} />
              <Input label="Primary Mobile" type="tel" required value={formData.phone} onChange={(v) => handleChange("phone", v)} />
              <Input label="Alternate Mobile" type="tel" value={formData.alternateMobile} onChange={(v) => handleChange("alternateMobile", v)} />
              <div className="md:col-span-3 pt-4 mt-2 border-t border-ca-border grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Emergency Contact Name" value={formData.emergencyContact?.name} onChange={(v) => handleNestedChange("emergencyContact", "name", v)} />
                <Input label="Emergency Contact Number" type="tel" value={formData.emergencyContact?.phone} onChange={(v) => handleNestedChange("emergencyContact", "phone", v)} />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="3. Address Details" icon={MapPin} defaultOpen={false}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="space-y-4">
                <h4 className="text-base font-bold text-ca-text border-b border-ca-border pb-2">Current Address</h4>
                <Input label="Address Line 1" value={formData.currentAddress?.addressLine1} onChange={(v) => handleNestedChange("currentAddress", "addressLine1", v)} />
                <Input label="Address Line 2" value={formData.currentAddress?.addressLine2} onChange={(v) => handleNestedChange("currentAddress", "addressLine2", v)} />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="City" value={formData.currentAddress?.city} onChange={(v) => handleNestedChange("currentAddress", "city", v)} />
                  <Input label="State" value={formData.currentAddress?.state} onChange={(v) => handleNestedChange("currentAddress", "state", v)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Country" value={formData.currentAddress?.country} onChange={(v) => handleNestedChange("currentAddress", "country", v)} />
                  <Input label="PIN Code" value={formData.currentAddress?.pincode} onChange={(v) => handleNestedChange("currentAddress", "pincode", v)} />
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-ca-border pb-2">
                  <h4 className="text-base font-bold text-ca-text">Permanent Address</h4>
                  <label className="flex items-center space-x-2 text-sm font-semibold text-ca-text-secondary cursor-pointer">
                    <input type="checkbox" className="rounded text-theme-4 focus:ring-ca-primary"
                      checked={formData.permanentAddress?.sameAsCurrent}
                      onChange={(e) => handleNestedChange("permanentAddress", "sameAsCurrent", e.target.checked)}
                    />
                    <span>Same as Current</span>
                  </label>
                </div>
                <Input label="Address Line 1" disabled={formData.permanentAddress?.sameAsCurrent} value={formData.permanentAddress?.sameAsCurrent ? formData.currentAddress?.addressLine1 : formData.permanentAddress?.addressLine1} onChange={(v) => handleNestedChange("permanentAddress", "addressLine1", v)} />
                <Input label="Address Line 2" disabled={formData.permanentAddress?.sameAsCurrent} value={formData.permanentAddress?.sameAsCurrent ? formData.currentAddress?.addressLine2 : formData.permanentAddress?.addressLine2} onChange={(v) => handleNestedChange("permanentAddress", "addressLine2", v)} />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="City" disabled={formData.permanentAddress?.sameAsCurrent} value={formData.permanentAddress?.sameAsCurrent ? formData.currentAddress?.city : formData.permanentAddress?.city} onChange={(v) => handleNestedChange("permanentAddress", "city", v)} />
                  <Input label="PIN Code" disabled={formData.permanentAddress?.sameAsCurrent} value={formData.permanentAddress?.sameAsCurrent ? formData.currentAddress?.pincode : formData.permanentAddress?.pincode} onChange={(v) => handleNestedChange("permanentAddress", "pincode", v)} />
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="4. Employment Details" icon={Briefcase}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MultiSelect
                label="Departments"
                required
                selected={formData.accessibleDepartments || []}
                onChange={(v) => handleChange("accessibleDepartments", v)}
                options={departments.map(d => ({ value: d._id, label: d.name }))}
                action={
                  <button type="button" onClick={() => handleQuickOpen("department")} className="text-[13px] font-semibold text-theme-4 hover:text-theme-3 flex items-center space-x-0.5">
                    <Plus size={13} /><span>New</span>
                  </button>
                }
              />

              <Select
                label="Branch"
                required
                value={formData.branchId}
                onChange={(v) => handleChange("branchId", v)}
                options={branches.map(b => ({ value: b._id, label: b.name || b.branchName }))}
                action={
                  <button type="button" onClick={() => handleQuickOpen("branch")} className="text-[13px] font-semibold text-theme-4 hover:text-theme-3 flex items-center space-x-0.5">
                    <Plus size={13} /><span>New</span>
                  </button>
                }
              />

              <Select label="Reporting Manager" value={formData.reportingManagerId} onChange={(v) => handleChange("reportingManagerId", v)} options={managers.map(m => ({ value: m._id, label: `${m.firstName} ${m.lastName}` }))} />
              {(formData.role === "Manager" || formData.userId?.role === "Manager") && (
                <Select label="Manager Access Level" value={formData.managerAccessLevel} onChange={(v) => handleChange("managerAccessLevel", v)} options={[
                  { value: "team", label: "Team Only (Direct Reports)" },
                  { value: "department", label: "All" }
                ]} />
              )}
              <Select label="Employment Type" value={formData.employmentType} onChange={(v) => handleChange("employmentType", v)} options={[
                { value: "full-time", label: "Full Time" }, { value: "part-time", label: "Part Time" }, { value: "contract", label: "Contract" }, { value: "intern", label: "Intern" }
              ]} />
              <Select label="Work Mode" value={formData.workMode} onChange={(v) => handleChange("workMode", v)} options={[
                { value: "office", label: "Office" }, { value: "remote", label: "Remote" }, { value: "hybrid", label: "Hybrid" }
              ]} />

              <div className="flex items-center space-x-2 mt-7">
                <input
                  type="checkbox"
                  id="allowRemotePunch"
                  checked={formData.allowRemotePunch || false}
                  onChange={(e) => handleChange("allowRemotePunch", e.target.checked)}
                  className="w-4 h-4 text-theme-4 border-gray-300 rounded focus:ring-ca-primary"
                />
                <label htmlFor="allowRemotePunch" className="text-base font-medium text-ca-text-secondary">
                  Allow Remote Punch (Field Worker)
                </label>
              </div>

              <Input label="Joining Date" type="date" required value={formData.joiningDate ? new Date(formData.joiningDate).toISOString().split('T')[0] : ""} onChange={(v) => handleChange("joiningDate", v)} />
              <Input label="Confirmation Date" type="date" value={formData.confirmationDate ? new Date(formData.confirmationDate).toISOString().split('T')[0] : ""} onChange={(v) => handleChange("confirmationDate", v)} />
              <Select label="Notice Period" value={formData.noticePeriod} onChange={(v) => handleChange("noticePeriod", v)} options={[
                { value: "0", label: "None" }, { value: "15", label: "15 Days" }, { value: "30", label: "30 Days" }, { value: "60", label: "60 Days" }, { value: "90", label: "90 Days" }
              ]} />
            </div>
          </SectionCard>

          <SectionCard title="5. Leave Balance" icon={CalendarDays}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Input
                label="Casual Leaves"
                type="number"
                value={formData.leaveBalance?.casual || 0}
                onChange={(v) => handleNestedChange("leaveBalance", "casual", Number(v))}
              />
              <Input
                label="Sick Leaves"
                type="number"
                value={formData.leaveBalance?.sick || 0}
                onChange={(v) => handleNestedChange("leaveBalance", "sick", Number(v))}
              />
              <Input
                label="Annual Leaves"
                type="number"
                value={formData.leaveBalance?.annual || 0}
                onChange={(v) => handleNestedChange("leaveBalance", "annual", Number(v))}
              />
              <Input
                label="Unpaid Leaves"
                type="number"
                value={formData.leaveBalance?.unpaid || 0}
                onChange={(v) => handleNestedChange("leaveBalance", "unpaid", Number(v))}
              />
            </div>
          </SectionCard>

          <SectionCard title="6. Banking Details" icon={CreditCard} defaultOpen={false}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Bank Name" value={formData.bankDetails?.bankName} onChange={(v) => handleNestedChange("bankDetails", "bankName", v)} />
              <Input label="Account Holder Name" value={formData.bankDetails?.accountHolderName} onChange={(v) => handleNestedChange("bankDetails", "accountHolderName", v)} />
              <Input label="Account Number" type="password" placeholder="••••••••••••" value={formData.bankDetails?.accountNumber} onChange={(v) => handleNestedChange("bankDetails", "accountNumber", v)} />
              <Input label="IFSC Code" value={formData.bankDetails?.ifscCode} onChange={(v) => handleNestedChange("bankDetails", "ifscCode", v)} />
              <Input label="Branch Name" value={formData.bankDetails?.branchName} onChange={(v) => handleNestedChange("bankDetails", "branchName", v)} />
              <Input label="UPI ID (Optional)" value={formData.bankDetails?.upiId} onChange={(v) => handleNestedChange("bankDetails", "upiId", v)} />
            </div>
          </SectionCard>

          <SectionCard title="7. Identity Documents" icon={ShieldCheck} defaultOpen={false}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Aadhaar Number" placeholder="XXXX XXXX XXXX" value={formData.aadhaarNumber} onChange={(v) => handleChange("aadhaarNumber", v)} />
              <Input label="PAN Number" placeholder="ABCDE1234F" value={formData.panNumber} onChange={(v) => handleChange("panNumber", v)} />
            </div>
          </SectionCard>

          <SectionCard title="8. Official Documents" icon={FileText} defaultOpen={false}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Offer Letter URL" placeholder="https://..." value={formData.documents?.offerLetter} onChange={(v) => handleNestedChange("documents", "offerLetter", v)} />
              <Input label="Joining Letter URL" placeholder="https://..." value={formData.documents?.joiningLetter} onChange={(v) => handleNestedChange("documents", "joiningLetter", v)} />
              <Input label="Previous Salary Slip URL" placeholder="https://..." value={formData.documents?.salarySlipPrevious} onChange={(v) => handleNestedChange("documents", "salarySlipPrevious", v)} />
              <Input label="Resume URL" placeholder="https://..." value={formData.documents?.resume} onChange={(v) => handleNestedChange("documents", "resume", v)} />
            </div>
          </SectionCard>

          <SectionCard title="9. Salary Structure" icon={Coins} defaultOpen={false}>
            <div className="bg-ca-primary-light border border-amber-200 rounded-lg p-3 mb-4 flex items-start space-x-2">
              <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                <strong className="block mb-0.5">Highly Sensitive Information</strong>
                Changing salary details will require a confirmation before saving and will be logged in the strict audit trail.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="CTC (Annual)" type="number" placeholder="₹" value={formData.salaryDetails?.ctc} onChange={(v) => handleNestedChange("salaryDetails", "ctc", v)} />
              <Input label="Basic Salary (Monthly)" type="number" placeholder="₹" value={formData.salaryDetails?.basic} onChange={(v) => handleNestedChange("salaryDetails", "basic", v)} />
              <Input label="HRA (Monthly)" type="number" placeholder="₹" value={formData.salaryDetails?.hra} onChange={(v) => handleNestedChange("salaryDetails", "hra", v)} />
              <Input label="Special Allowance" type="number" placeholder="₹" value={formData.salaryDetails?.specialAllowance} onChange={(v) => handleNestedChange("salaryDetails", "specialAllowance", v)} />
              <Input label="PF Deductions" type="number" placeholder="₹" value={formData.salaryDetails?.pf} onChange={(v) => handleNestedChange("salaryDetails", "pf", v)} />
              <Input label="ESI Deductions" type="number" placeholder="₹" value={formData.salaryDetails?.esi} onChange={(v) => handleNestedChange("salaryDetails", "esi", v)} />
              <Input label="TDS Deductions" type="number" placeholder="₹" value={formData.salaryDetails?.tds} onChange={(v) => handleNestedChange("salaryDetails", "tds", v)} />
            </div>
          </SectionCard>

          <SectionCard title="8. Skills & Experience" icon={Award} defaultOpen={false}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <MultiInput label="Technical Skills" placeholder="e.g. React, Node.js" values={formData.skills} onChange={(v) => handleChange("skills", v)} />
              <MultiInput label="Certifications" placeholder="e.g. AWS Certified Developer" values={formData.certifications} onChange={(v) => handleChange("certifications", v)} />
            </div>
          </SectionCard>

        </div>



      </div>

      {/* ── Audit Log Drawer ────────────────────────────────────────── */}
      {showAuditLog && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity" onClick={() => setShowAuditLog(false)} />
          <div className="relative w-full sm:w-[450px] bg-ca-surface h-full flex flex-col shadow-2xl border-l border-ca-border animate-slideInRight">
            <div className="flex items-center justify-between px-5 py-4 border-b border-ca-border">
              <h2 className="font-bold text-ca-text flex items-center"><History size={18} className="mr-2 text-theme-4" /> Audit Timeline</h2>
              <button onClick={() => setShowAuditLog(false)} className="p-1.5 rounded-lg hover:bg-ca-bg text-ca-text-secondary transition-colors"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 bg-ca-bg">
              {auditRes?.data?.logs?.length > 0 ? (
                <div className="space-y-3">
                  {auditRes.data.logs.map((log) => (
                    <div key={log._id} className="relative pl-6">
                      <div className="absolute left-0 top-1 w-2 h-2 rounded-full bg-theme-3 ring-4 ring-theme-3/10" />
                      <div className="absolute left-1 top-3 bottom-[-24px] w-0.5 bg-ca-border last:hidden" />

                      <div className="bg-ca-surface p-4 rounded-xl shadow-sm border border-ca-border text-base">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-ca-text">{log.performedBy?.name || "System"}</span>
                          <span className="text-sm text-ca-text-secondary font-medium">{new Date(log.createdAt).toLocaleString()}</span>
                        </div>
                        <span className="inline-block px-2 py-0.5 bg-ca-bg text-ca-text-secondary rounded text-sm font-bold mb-3">{log.action}</span>

                        {log.newData && Object.keys(log.newData).length > 0 && (
                          <div className="space-y-2 mt-2">
                            {Object.keys(log.newData).filter(k => k !== 'updatedAt').map(key => (
                              <div key={key} className="bg-ca-bg p-2 rounded border border-ca-border text-sm">
                                <span className="font-semibold text-ca-text-secondary block mb-1">{key}</span>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="text-ca-primary break-words line-through opacity-70">
                                    {log.oldData?.[key] ? JSON.stringify(log.oldData[key]) : "None"}
                                  </div>
                                  <div className="text-theme-3 break-words font-medium">
                                    {JSON.stringify(log.newData[key])}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-ca-text-secondary text-base">No audit logs found for this employee.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Quick Create Modal ────────────────────────────────────────────── */}
      {quickModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-ca-surface rounded-2xl max-w-md w-full p-6 shadow-xl border border-ca-border animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-ca-border mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-theme-3/10 flex items-center justify-center text-theme-4">
                  {quickModal === "department" && <Building2 size={16} />}
                  {quickModal === "designation" && <Briefcase size={16} />}
                  {quickModal === "branch" && <MapPin size={16} />}
                </div>
                <h3 className="font-bold text-ca-text capitalize text-lg">
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
                  <label className="block text-sm font-semibold text-ca-text-secondary mb-1.5 uppercase tracking-wide">
                    Department <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={quickForm.departmentId}
                    onChange={(e) => setQuickForm({ ...quickForm, departmentId: e.target.value })}
                    className="w-full px-3 py-2 border border-ca-border rounded-lg text-base text-ca-text bg-ca-surface focus:outline-none focus:ring-2 focus:ring-ca-primary"
                  >
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-ca-text-secondary mb-1.5 uppercase tracking-wide">
                  {quickModal === "branch" ? "Branch Name" : `${quickModal} Name`} <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder={`Enter ${quickModal} name`}
                  value={quickForm.name}
                  onChange={(e) => setQuickForm({ ...quickForm, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-ca-border rounded-lg text-base text-ca-text bg-ca-surface focus:outline-none focus:ring-2 focus:ring-ca-primary"
                />
              </div>

              {(quickModal === "department" || quickModal === "designation") && (
                <div>
                  <label className="block text-sm font-semibold text-ca-text-secondary mb-1.5 uppercase tracking-wide">
                    Description
                  </label>
                  <input
                    type="text"
                    placeholder="Optional description"
                    value={quickForm.description}
                    onChange={(e) => setQuickForm({ ...quickForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-ca-border rounded-lg text-base text-ca-text bg-ca-surface focus:outline-none focus:ring-2 focus:ring-ca-primary"
                  />
                </div>
              )}

              {quickModal === "branch" && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-ca-text-secondary mb-1.5 uppercase tracking-wide">
                      City
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Pune, Mumbai"
                      value={quickForm.city}
                      onChange={(e) => setQuickForm({ ...quickForm, city: e.target.value })}
                      className="w-full px-3 py-2 border border-ca-border rounded-lg text-base text-ca-text bg-ca-surface focus:outline-none focus:ring-2 focus:ring-ca-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-ca-text-secondary mb-1.5 uppercase tracking-wide">
                      Address
                    </label>
                    <input
                      type="text"
                      placeholder="Optional office address"
                      value={quickForm.address}
                      onChange={(e) => setQuickForm({ ...quickForm, address: e.target.value })}
                      className="w-full px-3 py-2 border border-ca-border rounded-lg text-base text-ca-text bg-ca-surface focus:outline-none focus:ring-2 focus:ring-ca-primary"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end space-x-3 pt-3 border-t border-ca-border">
                <button
                  type="button"
                  onClick={() => setQuickModal(null)}
                  className="px-4 py-2 border border-ca-border rounded-xl text-base font-semibold text-ca-text-secondary hover:bg-ca-bg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickSaving}
                  className="px-5 py-2 bg-theme-4 text-white rounded-xl text-base font-semibold hover:bg-theme-3 transition-colors flex items-center space-x-2 shadow-sm disabled:opacity-50"
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

export default EditEmployee;