import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  getEmployeesApi, deleteEmployeeApi, patchEmployeeStatusApi, resetEmployeePasswordApi,
  getDepartmentsApi, getDesignationsApi, getBranchesApi, getEmployeeByIdApi,
} from "../../api/companyAdminApi";
import {
  Search, Filter, UserPlus, Download, RefreshCw,
  Users, UserCheck, CalendarOff, UserX, UserRoundPlus,
  Mail, Phone, Building2, Briefcase, MapPin, Calendar,
  MoreHorizontal, Eye, EyeOff, Edit2, PowerOff, Power, Trash2,
  KeyRound, ChevronDown, X, ChevronRight, ChevronLeft,
  CheckCircle2, ClipboardList, FolderOpen, AlignJustify, LayoutGrid,
  Shield, Award, User, Hexagon, DollarSign, FileText,
} from "lucide-react";

// ── Avatar helper ─────────────────────────────────────────────────────────────
const AVATAR_BG = [
  "bg-ca-bg text-emerald-700",
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-teal-100 text-teal-700",
  "bg-orange-100 text-orange-700",
  "bg-indigo-100 text-indigo-700",
];
const avatarClass = (name) => AVATAR_BG[(name?.charCodeAt(0) || 0) % AVATAR_BG.length];

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

// ── Status pill ───────────────────────────────────────────────────────────────
const EmpStatusBadge = ({ status }) => {
  const cfg = {
    active: "bg-[#ecfdf5] dark:bg-[#064e3b] text-[#047857] dark:text-[#34d399] border-[#a7f3d0] dark:border-[#10b981]",
    inactive: "bg-[#f1f5f9] dark:bg-[#1e293b] text-[#64748b] dark:text-[#cbd5e1] border-[#e2e8f0] dark:border-[#475569]",
    on_leave: "bg-[#fffbeb] dark:bg-[#78350f] text-[#b45309] dark:text-[#fbbf24] border-[#fde68a] dark:border-[#f59e0b]",
    terminated: "bg-[#fef2f2] dark:bg-[#7f1d1d] text-[#b91c1c] dark:text-[#f87171] border-[#fecaca] dark:border-[#ef4444]",
  };
  const label = {
    active: "Active", inactive: "Inactive",
    on_leave: "On Leave", terminated: "Terminated",
  };
  const key = (status || "inactive").toLowerCase();
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg[key] || cfg.inactive}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${key === "active" ? "bg-ca-secondary" : key === "on_leave" ? "bg-ca-primary" : key === "terminated" ? "bg-ca-primary" : "bg-slate-400"}`} />
      {label[key] || status}
    </span>
  );
};

// ── Dot stat for drawer ────────────────────────────────────────────────────────
const DrawerStat = ({ label, value, color = "text-ca-text" }) => (
  <div className="text-center">
    <p className={`text-xl font-bold ${color}`}>{value ?? "—"}</p>
    <p className="text-xs text-ca-text-secondary mt-0.5">{label}</p>
  </div>
);

// ── Action menu ────────────────────────────────────────────────────────────────
const ActionMenu = ({ employee, onView, onToggleStatus, onResetPassword, onDelete }) => {
  const [pos, setPos] = useState(null);
  const isActive = employee.status === "active";
  const MENU_H = 210; // approx menu height in px

  const handleOpen = (e) => {
    if (pos) { setPos(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < MENU_H) {
      // open upward
      setPos({ right: window.innerWidth - rect.right, bottom: window.innerHeight - rect.top + 4, top: "auto" });
    } else {
      setPos({ right: window.innerWidth - rect.right, top: rect.bottom + 4, bottom: "auto" });
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="p-1.5 rounded-lg hover:bg-ca-bg text-ca-text-secondary transition-colors"
      >
        <MoreHorizontal size={16} />
      </button>
      {pos && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPos(null)} />
          <div
            className="fixed z-50 w-44 bg-ca-surface border border-ca-border rounded-xl shadow-xl overflow-hidden"
            style={{ top: pos.top, bottom: pos.bottom, right: pos.right }}
          >
            <button onClick={() => { onView(employee); setPos(null); }} className="flex items-center space-x-2.5 w-full px-3.5 py-2 text-[13px] text-ca-text hover:bg-ca-bg">
              <Eye size={14} className="text-ca-text-secondary" /><span>View Details</span>
            </button>
            <Link to={`${window.location.pathname.startsWith("/hr") ? "/hr" : "/company"}/employees/edit/${employee._id}`} className="flex items-center space-x-2.5 w-full px-3.5 py-2 text-[13px] text-ca-text hover:bg-ca-bg" onClick={() => setPos(null)}>
              <Edit2 size={14} className="text-ca-text-secondary" /><span>Edit Employee</span>
            </Link>
            <button onClick={() => { onToggleStatus(employee); setPos(null); }} className="flex items-center space-x-2.5 w-full px-3.5 py-2 text-[13px] text-ca-text hover:bg-ca-bg">
              {isActive ? <PowerOff size={14} className="text-ca-text-secondary" /> : <Power size={14} className="text-ca-text-secondary" />}
              <span>{isActive ? "Deactivate" : "Activate"}</span>
            </button>
            <button onClick={() => { onResetPassword?.(employee); setPos(null); }} className="flex items-center space-x-2.5 w-full px-3.5 py-2 text-[13px] text-ca-text hover:bg-ca-bg">
              <KeyRound size={14} className="text-ca-text-secondary" /><span>Reset Password</span>
            </button>
            <div className="border-t border-ca-border" />
            <button onClick={() => { onDelete(employee); setPos(null); }} className="flex items-center space-x-2.5 w-full px-3.5 py-2 text-[13px] text-ca-primary hover:bg-ca-primary-light">
              <Trash2 size={14} /><span>Delete</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ── Reset Password Modal ───────────────────────────────────────────────────────
const ResetPasswordModal = ({ employee, onClose, onSubmit, isPending }) => {
  const [newPassword, setNewPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  if (!employee) return null;
  const name = employee.user?.name || `${employee.firstName || ""} ${employee.lastName || ""}`.trim() || "Employee";

  const handleGenerate = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let pass = "";
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass);
    setShowPass(true);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    onSubmit(newPassword);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              <KeyRound size={18} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">Reset Password</h3>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">For {name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter at least 6 characters"
                className="w-full pl-3.5 pr-20 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                  title={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-slate-400 font-medium">Need a strong default password?</span>
            <button
              type="button"
              onClick={handleGenerate}
              className="font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
            >
              ⚡ Auto-Generate
            </button>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/50 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300 font-medium">
            🔒 The employee will be able to log in using this new password immediately.
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-200/80 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || newPassword.length < 6}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              {isPending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Resetting...</span>
                </>
              ) : (
                <>
                  <KeyRound size={14} strokeWidth={2.5} />
                  <span>Update Password</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Select dropdown (custom — uses app color palette) ─────────────────────────
const Select = ({ value, onChange, options, placeholder, className = "" }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <div className={`relative ${className}`}>
      {open && <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-1.5 pl-3 pr-2.5 py-1.5 border rounded-lg text-[13px] font-medium cursor-pointer transition-all shadow-sm whitespace-nowrap ${
          open || value
            ? "border-[#E65100] bg-[#E65100]/10 text-[#E65100]"
            : "border-slate-200 bg-white text-slate-600 hover:border-[#E65100]/40 hover:bg-slate-50"
        }`}
      >
        <span className={`whitespace-nowrap ${value ? "font-bold text-[#E65100]" : ""}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={13} className={`flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-30 min-w-full w-max max-w-[220px] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          <div className="py-1 max-h-52 overflow-y-auto">
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              className={`w-full text-left px-3.5 py-2 text-[13px] transition-colors ${
                !value ? "bg-[#E65100] text-white font-bold" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {placeholder}
            </button>
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={`w-full text-left px-3.5 py-2 text-[13px] transition-colors ${
                  value === o.value
                    ? "bg-[#E65100] text-white font-bold"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Employee Drawer ────────────────────────────────────────────────────────────
const EmployeeDrawer = ({ employee, onClose, onEdit, onToggleStatus }) => {
  const { data: fullEmpRes, isLoading: isLoadingFull } = useQuery({
    queryKey: ["employee", employee?._id],
    queryFn: () => getEmployeeByIdApi(employee?._id),
    enabled: !!employee?._id,
  });

  if (!employee) return null;

  const empData = fullEmpRes?.data?.employee || employee;

  const name = empData.user?.name || `${empData.firstName || ""} ${empData.lastName || ""}`.trim() || "Employee";
  const email = empData.user?.email || empData.email;
  const phone = empData.user?.phone || empData.phone;
  const isActive = empData.status === "active";
  const joined = empData.joiningDate || empData.user?.joiningDate || empData.dateOfJoining || empData.user?.dateOfJoining || empData.createdAt || empData.user?.createdAt || empData.userId?.createdAt || empData.created_at;
  const initials = name.slice(0, 2).toUpperCase();
  const ac = avatarClass(name);
  const rawPhoto = empData.photo || empData.documents?.photo || empData.user?.profileImage || empData.userId?.profileImage;
  const photoUrl = getPhotoUrl(rawPhoto);

  const displayRole = empData.role || empData.userId?.role || empData.user?.role || "Employee";
  const formattedRole = displayRole === "CompanyAdmin" ? "Company Admin" : displayRole;

  const drawerDepts = Array.isArray(empData.accessibleDepartments) && empData.accessibleDepartments.length > 0
    ? empData.accessibleDepartments.map(d => typeof d === 'object' ? d.name : d).filter(Boolean).join(", ")
    : (empData.departmentId?.name || empData.department?.name || "—");

  const formatAddress = (addr) => {
    if (!addr) return null;
    return [addr.addressLine1, addr.addressLine2, addr.city, addr.state, addr.country, addr.pincode].filter(Boolean).join(", ");
  };

  const personalRows = [
    { label: "Date of Birth", value: empData.dateOfBirth ? new Date(empData.dateOfBirth).toLocaleDateString("en-IN") : null },
    { label: "Gender", value: empData.gender },
    { label: "Blood Group", value: empData.bloodGroup },
    { label: "Marital Status", value: empData.maritalStatus },
    { label: "Aadhaar No", value: empData.aadhaarNumber },
    { label: "PAN No", value: empData.panNumber },
  ];

  const addressRows = [
    { label: "Current Address", value: formatAddress(empData.currentAddress) },
    { label: "Permanent Address", value: formatAddress(empData.permanentAddress) },
  ];

  const jobRows = [
    { label: "Employee Code", value: empData.employeeCode },
    { label: "Department", value: drawerDepts },
    { label: "Designation", value: empData.designationId?.name || empData.designation?.name || "—" },
    { label: "Branch", value: empData.branchId?.name || empData.branch?.name || "Main Office" },
    { label: "System Role", value: formattedRole },
    { label: "Employment Type", value: empData.employmentType },
    { label: "Work Mode", value: empData.workMode },
    { label: "Joined Date", value: joined ? new Date(joined).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : null },
    { label: "Confirmation", value: empData.confirmationDate ? new Date(empData.confirmationDate).toLocaleDateString("en-IN") : null },
    { label: "Notice Period", value: empData.noticePeriod ? `${empData.noticePeriod} Days` : null },
  ];

  const bankRows = [
    { label: "Bank Name", value: empData.bankDetails?.bankName },
    { label: "Account Holder", value: empData.bankDetails?.accountHolderName },
    { label: "Account Number", value: empData.bankDetails?.accountNumber },
    { label: "IFSC Code", value: empData.bankDetails?.ifscCode },
    { label: "UPI ID", value: empData.bankDetails?.upiId },
  ];

  const salaryRows = [
    { label: "Annual CTC", value: empData.salaryDetails?.ctc ? `₹${Number(empData.salaryDetails.ctc).toLocaleString("en-IN")}` : null },
    { label: "Basic (Monthly)", value: empData.salaryDetails?.basic ? `₹${Number(empData.salaryDetails.basic).toLocaleString("en-IN")}` : null },
    { label: "HRA", value: empData.salaryDetails?.hra ? `₹${Number(empData.salaryDetails.hra).toLocaleString("en-IN")}` : null },
    { label: "Special Allowance", value: empData.salaryDetails?.specialAllowance ? `₹${Number(empData.salaryDetails.specialAllowance).toLocaleString("en-IN")}` : null },
    { label: "PF Deduction", value: empData.salaryDetails?.pf ? `₹${Number(empData.salaryDetails.pf).toLocaleString("en-IN")}` : null },
    { label: "ESI Deduction", value: empData.salaryDetails?.esi ? `₹${Number(empData.salaryDetails.esi).toLocaleString("en-IN")}` : null },
    { label: "TDS Deduction", value: empData.salaryDetails?.tds ? `₹${Number(empData.salaryDetails.tds).toLocaleString("en-IN")}` : null },
  ];

  const docs = empData.documents || {};
  const docList = [
    { key: "offerLetter", label: "Offer Letter", url: docs.offerLetter },
    { key: "joiningLetter", label: "Joining Letter", url: docs.joiningLetter },
    { key: "resume", label: "Resume / CV", url: docs.resume },
    { key: "salarySlipPrevious", label: "Previous Salary Slip", url: docs.salarySlipPrevious },
    { key: "panCard", label: "PAN Card", url: docs.panCard },
    { key: "aadhaarFront", label: "Aadhaar Document", url: docs.aadhaarFront || docs.aadhaarBack },
  ].filter(d => Boolean(d.url));

  const GridSection = ({ title, icon: Icon, rows, cols = 3 }) => {
    return (
      <div className="bg-white dark:bg-[#111C24] rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs relative overflow-hidden">
        {isLoadingFull && (
          <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <RefreshCw size={14} className="text-amber-500 animate-spin" />
          </div>
        )}
        <div className="flex items-center gap-1.5 mb-3 border-b border-slate-100 dark:border-slate-800/80 pb-2">
          <div className="w-5 h-5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Icon size={12} strokeWidth={2.5} />
          </div>
          <span className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">{title}</span>
        </div>
        <div className={`grid grid-cols-2 sm:grid-cols-${cols} gap-2`}>
          {rows.map(({ label, value }) => (
            <div key={label} className="bg-slate-50/80 dark:bg-[#0D1321] p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <p className="text-[9.5px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-0.5 truncate">{label}</p>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 break-words leading-tight">{value || "—"}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-fadeIn">
      {/* Overlay */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={onClose} />
      
      <div className="relative w-full sm:w-[620px] bg-slate-50 dark:bg-[#0B111E] h-full flex flex-col shadow-2xl border-l border-slate-200 dark:border-slate-800 overflow-hidden animate-slideLeft">
        
        {/* Compact Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-white dark:bg-[#111C24] border-b border-slate-200/80 dark:border-slate-800 flex-shrink-0 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-slate-900 dark:text-white">Employee Profile</span>
            {empData.employeeCode && (
              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 font-mono text-[10.5px] font-extrabold border border-amber-500/20">
                {empData.employeeCode}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">
          
          {/* Profile Hero Card */}
          <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 text-center shadow-2xs">
            <div className="relative inline-block mb-3">
              {photoUrl ? (
                <img src={photoUrl} alt={name} className="w-20 h-20 rounded-2xl object-cover mx-auto shadow-md border-2 border-white dark:border-slate-700 ring-4 ring-amber-500/20" />
              ) : (
                <div className={`w-20 h-20 rounded-2xl ${ac} flex items-center justify-center text-2xl font-black mx-auto shadow-md border-2 border-white dark:border-slate-700 ring-4 ring-amber-500/20`}>
                  {initials}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1">
                <EmpStatusBadge status={employee.status} />
              </div>
            </div>
            
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-tight">{name}</h2>
              <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1.5">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                  {formattedRole}
                </span>
                {drawerDepts && drawerDepts !== "—" && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {drawerDepts}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center justify-center gap-2 mt-4 max-w-sm mx-auto">
              {email && (
                <a href={`mailto:${email}`} className="flex-1 flex items-center justify-center gap-1.5 bg-slate-50 dark:bg-[#0D1321] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all font-bold text-xs shadow-2xs">
                  <Mail size={13} className="text-amber-500" /><span>Email</span>
                </a>
              )}
              {phone && (
                <a href={`tel:${phone}`} className="flex-1 flex items-center justify-center gap-1.5 bg-slate-50 dark:bg-[#0D1321] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all font-bold text-xs shadow-2xs">
                  <Phone size={13} className="text-emerald-500" /><span>Call</span>
                </a>
              )}
              <Link to={`/company/attendance?employee=${employee._id}`} className="flex-1 flex items-center justify-center gap-1.5 bg-slate-50 dark:bg-[#0D1321] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all font-bold text-xs shadow-2xs">
                <Calendar size={13} className="text-indigo-500" /><span>Logs</span>
              </Link>
            </div>
          </div>

          {/* Quick Stats Micro Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white dark:bg-[#111C24] rounded-xl p-3 text-center border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 leading-none mb-1">{employee._stats?.present ?? "0"}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Present</p>
            </div>
            <div className="bg-white dark:bg-[#111C24] rounded-xl p-3 text-center border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <p className="text-lg font-black text-amber-600 dark:text-amber-400 leading-none mb-1">{employee._stats?.leaves ?? "0"}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Leaves</p>
            </div>
            <div className="bg-white dark:bg-[#111C24] rounded-xl p-3 text-center border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 leading-none mb-1">{employee._stats?.tasks ?? "0"}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tasks</p>
            </div>
          </div>

          {/* Detailed Sections */}
          <GridSection title="Job Details" icon={Building2} rows={jobRows} cols={3} />
          <GridSection title="Personal Information" icon={User} rows={personalRows} cols={3} />
          <GridSection title="Address Details" icon={MapPin} rows={addressRows} cols={2} />
          <GridSection title="Bank & Statutory" icon={Briefcase} rows={bankRows} cols={3} />
          <GridSection title="Salary Structure" icon={DollarSign} rows={salaryRows} cols={3} />

          {/* Uploaded Documents Section */}
          {docList.length > 0 && (
            <div className="bg-white dark:bg-[#111C24] rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center gap-1.5 mb-3 border-b border-slate-100 dark:border-slate-800/80 pb-2">
                <div className="w-5 h-5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <FileText size={12} strokeWidth={2.5} />
                </div>
                <span className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Uploaded Documents ({docList.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {docList.map(doc => (
                  <a
                    key={doc.key}
                    href={doc.url.startsWith("http") ? doc.url : `${(import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace("/api", "")}${doc.url.startsWith("/") ? "" : "/"}${doc.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 dark:bg-[#0D1321] border border-slate-200/60 dark:border-slate-800 hover:border-amber-500/40 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-2xs"
                  >
                    <span className="truncate">{doc.label}</span>
                    <Download size={13} className="text-amber-500 shrink-0 ml-1.5" />
                  </a>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Drawer Sticky Footer Actions */}
        <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C24] p-4 flex items-center gap-2.5 z-10 shadow-lg">
          <Link
            to={`${window.location.pathname.startsWith("/hr") ? "/hr" : "/company"}/employees/edit/${employee._id}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer"
          >
            <Edit2 size={13} strokeWidth={2.5} /> <span>Edit Employee</span>
          </Link>
          <button
            onClick={() => onToggleStatus(employee)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-extrabold transition-all border shadow-2xs cursor-pointer ${
              isActive
                ? "bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                : "bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-900/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            }`}
          >
            {isActive ? <PowerOff size={13} strokeWidth={2.5} /> : <Power size={13} strokeWidth={2.5} />}
            <span>{isActive ? "Deactivate Account" : "Activate Account"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const ROWS_PER_PAGE = 10;
const Employees = () => {
  const queryClient = useQueryClient();

  // ── Filters ──
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [activeTab, setActiveTab] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [resetModalEmp, setResetModalEmp] = useState(null);

  // ── Data queries ──
  const { data: empRes, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["employees"],
    queryFn: () => getEmployeesApi(),
  });
  const { data: deptRes } = useQuery({ queryKey: ["departments"], queryFn: getDepartmentsApi });
  const { data: branchRes } = useQuery({ queryKey: ["branches"], queryFn: getBranchesApi });

  const allEmployees = empRes?.data?.employees || [];
  const departments = deptRes?.data?.departments || deptRes?.data || [];
  const branches = branchRes?.data?.branches || branchRes?.data || [];

  // ── Mutations ──
  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => patchEmployeeStatusApi(id, status),
    onSuccess: () => { queryClient.invalidateQueries(["employees"]); queryClient.invalidateQueries(["companyDashboard"]); },
  });
  const deleteMutation = useMutation({
    mutationFn: deleteEmployeeApi,
    onSuccess: () => { queryClient.invalidateQueries(["employees"]); queryClient.invalidateQueries(["companyDashboard"]); },
  });
  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, newPassword }) => resetEmployeePasswordApi(id, newPassword),
    onSuccess: (res) => {
      toast.success(res.data?.message || "Password reset successfully!");
      setResetModalEmp(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to reset password");
    },
  });

  const handleToggleStatus = (emp) => {
    const isActive = emp.status === "active";
    const label = isActive ? "deactivate" : "activate";
    const name = emp.user?.name || emp.firstName || "this employee";
    if (window.confirm(`Are you sure you want to ${label} ${name}?`)) {
      statusMutation.mutate({ id: emp.user?._id || emp._id, status: !isActive });
    }
  };
  const handleDelete = (emp) => {
    const name = emp.user?.name || emp.firstName || "this employee";
    if (window.confirm(`Permanently delete ${name}? This cannot be undone.`)) {
      deleteMutation.mutate(emp._id);
    }
  };

  // ── Stats ──
  const stats = useMemo(() => ({
    total: allEmployees.length,
    active: allEmployees.filter(e => e.status === "active").length,
    onLeave: allEmployees.filter(e => e.status === "on_leave").length,
    inactive: allEmployees.filter(e => e.status === "inactive" || e.status === "terminated").length,
    newJoiners: allEmployees.filter(e => {
      const d = e.joiningDate || e.createdAt;
      if (!d) return false;
      const joined = new Date(d);
      const now = new Date();
      return joined.getMonth() === now.getMonth() && joined.getFullYear() === now.getFullYear();
    }).length,
  }), [allEmployees]);

  // ── Filtered list ──
  const filtered = useMemo(() => {
    let list = [...allEmployees];
    const s = search.toLowerCase().trim();

    if (activeTab) {
      if (activeTab === "inactive") list = list.filter(e => e.status === "inactive" || e.status === "terminated");
      else list = list.filter(e => e.status === activeTab);
    }
    if (statusFilter) list = list.filter(e => e.status === statusFilter);
    if (deptFilter) list = list.filter(e => (e.departmentId?._id || e.department?._id) === deptFilter);
    if (roleFilter) list = list.filter(e => {
      const role = e.role || e.userId?.role || e.user?.role || "Employee";
      return role.toLowerCase() === roleFilter.toLowerCase();
    });
    if (branchFilter) list = list.filter(e => (e.branchId?._id || e.branch?._id) === branchFilter);
    if (typeFilter) list = list.filter(e => e.employmentType === typeFilter);
    if (s) {
      list = list.filter(e => {
        const name = `${e.user?.name || ""} ${e.firstName || ""} ${e.lastName || ""}`.toLowerCase();
        const email = (e.user?.email || "").toLowerCase();
        const code = (e.employeeCode || "").toLowerCase();
        const dept = (e.departmentId?.name || e.department?.name || "").toLowerCase();
        const phone = (e.user?.phone || e.phone || "");
        return name.includes(s) || email.includes(s) || code.includes(s) || dept.includes(s) || phone.includes(s);
      });
    }
    return list;
  }, [allEmployees, search, activeTab, statusFilter, deptFilter, roleFilter, branchFilter, typeFilter]);

  // ── Pagination ──
  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  const resetPage = () => setPage(1);

  // ── Export CSV ──
  const exportCSV = () => {
    const headers = ["Name", "Code", "Email", "Phone", "Department", "Role", "Branch", "Status", "Joined"];
    const rows = filtered.map(e => {
      const depts = Array.isArray(e.accessibleDepartments) && e.accessibleDepartments.length > 0
        ? e.accessibleDepartments.map(d => typeof d === 'object' ? d.name : d).filter(Boolean).join("; ")
        : (e.departmentId?.name || e.department?.name || "");
      const role = e.role || e.userId?.role || e.user?.role || "Employee";
      const formattedRole = role === "CompanyAdmin" ? "Company Admin" : role;

      return [
        e.user?.name || `${e.firstName || ""} ${e.lastName || ""}`,
        e.employeeCode || "",
        e.user?.email || e.email || "",
        e.user?.phone || e.phone || "",
        depts,
        formattedRole,
        e.branchId?.name || e.branch?.name || "",
        e.status || "",
        e.joiningDate ? new Date(e.joiningDate).toLocaleDateString("en-IN") : "",
      ];
    });
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "employees.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Tab counts ──
  const TAB_OPTIONS = [
    { value: "", label: "All", count: allEmployees.length },
    { value: "active", label: "Active", count: stats.active },
    { value: "on_leave", label: "On Leave", count: stats.onLeave },
    { value: "inactive", label: "Inactive", count: stats.inactive },
  ];

  const KPI_CARDS = [
    { label: "Total Employees", sub: "View all employees", value: stats.total, icon: Users, color: "from-orange-500 to-orange-600", glow: "#E65100" },
    { label: "Active Employees", sub: "Currently active", value: stats.active, icon: UserCheck, color: "from-emerald-500 to-emerald-600", glow: "#10B981" },
    { label: "On Leave", sub: "Employees on leave", value: stats.onLeave, icon: CalendarOff, color: "from-amber-500 to-amber-600", glow: "#F59E0B" },
    { label: "Inactive Employees", sub: "Not active", value: stats.inactive, icon: UserX, color: "from-rose-500 to-rose-600", glow: "#F43F5E" },
    { label: "New Joiners", sub: "This month", value: stats.newJoiners, icon: UserRoundPlus, color: "from-purple-500 to-purple-600", glow: "#A855F7" },
  ];

  const activeFiltersCount = [deptFilter, roleFilter, branchFilter, statusFilter, typeFilter].filter(Boolean).length;

  return (
    <>
      <div className="space-y-4 pb-6">

        {/* ── Seamless Page Header (Matching Dashboard layout) ──────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2 pt-1">
          <div>
            <h1 className="text-[22px] font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Employee Directory <Users size={20} className="text-amber-500" />
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Manage team members, roles, profiles, and status</p>
          </div>
          
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              onClick={exportCSV}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-2xs"
            >
              <Download size={13} className="text-slate-400" /><span>Export</span>
            </button>
            <button
              onClick={() => refetch()}
              className="p-1.5 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-2xs"
            >
              <RefreshCw size={14} className={isRefetching ? "animate-spin text-amber-500" : ""} />
            </button>
            <Link
              to={`${window.location.pathname.startsWith("/hr") ? "/hr" : "/company"}/employees/add`}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold shadow-xs transition-all"
            >
              <UserPlus size={14} strokeWidth={2.5} /><span>Add Team Member</span>
            </Link>
          </div>
        </div>

        {/* ── KPI Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3.5">
          <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Staff</span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{stats.total}</h3>
              <span className="text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400">All Registered</span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold">
              <Users size={16} />
            </div>
          </div>
          <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Staff</span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{stats.active}</h3>
              <span className="text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400">Currently Active</span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
              <UserCheck size={16} />
            </div>
          </div>
          <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">On Leave</span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{stats.onLeave}</h3>
              <span className="text-[10.5px] font-bold text-amber-600 dark:text-amber-400">On Approved Leave</span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              <CalendarOff size={16} />
            </div>
          </div>
          <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Inactive</span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{stats.inactive}</h3>
              <span className="text-[10.5px] font-bold text-rose-500">Deactivated</span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold">
              <UserX size={16} />
            </div>
          </div>
          <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">New Joiners</span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{stats.newJoiners}</h3>
              <span className="text-[10.5px] font-bold text-purple-600 dark:text-purple-400">Joined This Month</span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
              <UserRoundPlus size={16} />
            </div>
          </div>
        </div>

        {/* ── Table Card ────────────────────────────────────────────────── */}
        <div className="bg-ca-surface rounded-xl border border-ca-border shadow-sm overflow-hidden">

          {/* Top toolbar */}
          <div className="px-5 pt-4 pb-4 border-b border-ca-border space-y-4 bg-ca-bg/40">

            {/* Single row: Search + Filters + Tabs + Count */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              
              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative w-72">
                  <Search size={13} className="absolute left-3.5 top-2.5 text-ca-text-secondary" />
                  <input
                    type="text"
                    placeholder="Search name, code, email, phone..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); resetPage(); }}
                    className="w-full pl-10 pr-4 py-2 border border-ca-border bg-ca-surface rounded-xl text-[13px] text-ca-text placeholder-ca-text-secondary focus:outline-none focus:ring-2 focus:ring-[#E65100]/20 focus:border-[#E65100]/40 transition-all shadow-sm"
                  />
                  {search && (
                    <button onClick={() => setSearch("")} className="absolute right-3 top-2.5 text-ca-text-secondary hover:text-ca-text">
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Filter toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-[13px] font-bold transition-all shadow-sm whitespace-nowrap ${showFilters || activeFiltersCount > 0 ? "bg-[#E65100]/5 border-[#E65100]/20 text-[#E65100]" : "border-ca-border text-ca-text-secondary bg-ca-surface hover:bg-ca-bg"}`}
                >
                  <Filter size={14} className={showFilters || activeFiltersCount > 0 ? "text-[#E65100]" : "text-ca-text-secondary"} />
                  <span>Filters</span>
                  {activeFiltersCount > 0 && (
                    <span className="w-5 h-5 rounded-md bg-[#E65100] text-white text-[11px] flex items-center justify-center font-black ml-1">{activeFiltersCount}</span>
                  )}
                </button>
              </div>

              {/* Status Tabs */}
              <div className="flex items-center justify-center flex-1">
                <div className="flex space-x-1.5 bg-ca-surface p-1.5 rounded-2xl border border-ca-border shadow-sm">
                  {TAB_OPTIONS.map((tab) => (
                    <button
                      key={tab.value || "all"}
                      onClick={() => { setActiveTab(tab.value); resetPage(); }}
                      className={`flex items-center px-4 py-1.5 rounded-xl text-[13px] font-bold transition-all duration-300 whitespace-nowrap ${
                        activeTab === tab.value
                          ? "bg-[#E65100] text-white shadow-md"
                          : "text-ca-text-secondary hover:text-ca-text hover:bg-ca-bg"
                      }`}
                    >
                      {tab.label}
                      <span className={`ml-2 px-2 py-0.5 rounded-lg text-[11px] font-black tracking-wide ${
                        activeTab === tab.value
                          ? "bg-white/20 text-white"
                          : "bg-ca-bg text-ca-text-secondary shadow-sm border border-ca-border"
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Count */}
              <p className="text-[13px] text-slate-500 font-bold whitespace-nowrap">
                {filtered.length} of {allEmployees.length} employees
              </p>
            </div>

            {/* Filter dropdowns (expandable) */}
            {showFilters && (
              <div className="flex flex-wrap gap-2 pt-1">
                <Select
                  value={deptFilter} onChange={(v) => { setDeptFilter(v); resetPage(); }}
                  options={departments.map(d => ({ value: d._id, label: d.name }))}
                  placeholder="All Departments" className="w-36"
                />
                <Select
                  value={roleFilter} onChange={(v) => { setRoleFilter(v); resetPage(); }}
                  options={[
                    { value: "Employee", label: "Employee" },
                    { value: "Manager", label: "Manager" },
                    { value: "HR", label: "HR" },
                    { value: "CompanyAdmin", label: "Company Admin" }
                  ]}
                  placeholder="All Roles" className="w-32"
                />
                <Select
                  value={branchFilter} onChange={(v) => { setBranchFilter(v); resetPage(); }}
                  options={branches.map(b => ({ value: b._id, label: b.name }))}
                  placeholder="All Branches" className="w-32"
                />
                <Select
                  value={statusFilter} onChange={(v) => { setStatusFilter(v); resetPage(); }}
                  options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }, { value: "on_leave", label: "On Leave" }, { value: "terminated", label: "Terminated" }]}
                  placeholder="All Statuses" className="w-32"
                />
                <Select
                  value={typeFilter} onChange={(v) => { setTypeFilter(v); resetPage(); }}
                  options={[{ value: "Full Time", label: "Full Time" }, { value: "Part Time", label: "Part Time" }, { value: "Contract", label: "Contract" }, { value: "Intern", label: "Intern" }]}
                  placeholder="Employment Type" className="w-40"
                />
                {activeFiltersCount > 0 && (
                  <button
                    onClick={() => { setDeptFilter(""); setRoleFilter(""); setBranchFilter(""); setStatusFilter(""); setTypeFilter(""); resetPage(); }}
                    className="px-3 py-1.5 text-xs font-semibold text-ca-primary border border-ca-border rounded-lg hover:bg-ca-primary-light transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>
            )}
          </div>


          {/* ── Table ──────────────────────────────────────────────────── */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-ca-text-secondary">Loading employees...</p>
            </div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-ca-bg flex items-center justify-center">
                <Users size={24} className="text-slate-300" />
              </div>
              <p className="text-sm font-medium text-ca-text-secondary">No employees found</p>
              <p className="text-xs text-ca-text-secondary">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-y border-slate-200 bg-[#f8f9fa]">
                    {["Team Member", "Contact", "Department & Branch", "Role", "Status", "Joining Date", "Actions"].map((h) => (
                      <th key={h} className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {h}
                          {h !== "Actions" && <span className="text-slate-300">↕</span>}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginated.map((emp) => {
                    const name = emp.user?.name || `${emp.firstName || ""} ${emp.lastName || ""}`;
                    const email = emp.user?.email || emp.email || "";
                    const phone = emp.user?.phone || emp.phone || "";
                    const depts = Array.isArray(emp.accessibleDepartments) && emp.accessibleDepartments.length > 0
                      ? emp.accessibleDepartments.map(d => typeof d === 'object' ? d.name : d).filter(Boolean).join(", ")
                      : (emp.departmentId?.name || emp.department?.name || "—");
                    const role = emp.role || emp.userId?.role || emp.user?.role || "Employee";
                    const formattedRole = role === "CompanyAdmin" ? "Company Admin" : role;
                    const branch = emp.branchId?.name || emp.branch?.name || "—";
                    const joined = emp.joiningDate || emp.user?.joiningDate || emp.dateOfJoining || emp.user?.dateOfJoining || emp.createdAt || emp.user?.createdAt || emp.userId?.createdAt || emp.created_at;
                    const code = emp.employeeCode || "—";
                    const ac = avatarClass(name);
                    const isSelected = selectedEmployee?._id === emp._id;
                    const rawPhoto = emp.photo || emp.documents?.photo || emp.user?.profileImage || emp.userId?.profileImage;
                    const photoUrl = getPhotoUrl(rawPhoto);

                    return (
                      <tr
                        key={emp._id}
                        className={`hover:bg-slate-50 transition-colors cursor-pointer group ${isSelected ? "bg-[#E65100]/5 border-l-2 border-l-[#E65100]" : ""}`}
                        onClick={() => setSelectedEmployee(isSelected ? null : emp)}
                      >
                        {/* Employee */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center space-x-2">
                            {photoUrl ? (
                              <img src={photoUrl} alt={name} className="w-9 h-9 rounded-full object-cover flex-shrink-0 shadow-sm border border-slate-200" />
                            ) : (
                              <div className={`w-9 h-9 rounded-full ${ac} flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-sm border border-slate-200`}>
                                {name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="text-[13px] font-black text-slate-800 leading-tight group-hover:text-[#E65100] transition-colors">{name}</p>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">{code}</p>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="px-5 py-3.5">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2 text-[12px] font-bold text-slate-600">
                              <Mail size={13} className="text-slate-400" />
                              <span className="truncate max-w-[150px]">{email || "—"}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-[12px] font-bold text-slate-500">
                              <Phone size={13} className="text-slate-400" />
                              <span>{phone || "—"}</span>
                            </div>
                          </div>
                        </td>

                        {/* Department & Branch */}
                        <td className="px-5 py-3.5">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2 text-[12px] font-bold text-slate-600">
                              <Building2 size={13} className="text-slate-400" />
                              <span className="truncate max-w-[150px]">{depts}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-[12px] font-bold text-slate-400">
                              <MapPin size={13} className="text-slate-300" />
                              <span>{branch}</span>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center space-x-2 text-[12px] font-bold text-slate-600">
                            <Hexagon size={13} className="text-slate-400" />
                            <span>{formattedRole}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5">
                          <EmpStatusBadge status={emp.status} />
                        </td>

                        {/* Joining Date */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center space-x-2 text-[12px] font-bold text-slate-600">
                            <Calendar size={13} className="text-slate-400" />
                            <span>{joined ? new Date(joined).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Not Set"}</span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <ActionMenu
                            employee={emp}
                            onView={(e) => setSelectedEmployee(e)}
                            onToggleStatus={handleToggleStatus}
                            onResetPassword={(e) => setResetModalEmp(e)}
                            onDelete={handleDelete}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Pagination ─────────────────────────────────────────────── */}
          {filtered.length > ROWS_PER_PAGE && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-ca-border bg-ca-bg">
              <p className="text-xs text-ca-text-secondary">
                Showing <span className="font-semibold text-ca-text">{(page - 1) * ROWS_PER_PAGE + 1}–{Math.min(page * ROWS_PER_PAGE, filtered.length)}</span> of <span className="font-semibold text-ca-text">{filtered.length}</span> results
              </p>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-ca-border text-ca-text-secondary hover:bg-ca-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pageNum = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page + i - 2;
                  if (pageNum > totalPages) return null;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors ${page === pageNum ? "bg-primary-600 text-white border border-primary-600" : "border border-ca-border text-ca-text-secondary hover:bg-ca-surface"}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-ca-border text-ca-text-secondary hover:bg-ca-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Employee Detail Drawer ───────────────────────────────────── */}
      {selectedEmployee && (
        <EmployeeDrawer
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
          onEdit={() => { }}
          onToggleStatus={(emp) => { handleToggleStatus(emp); setSelectedEmployee(null); }}
        />
      )}

      {/* ── Reset Password Modal ────────────────────────────────────── */}
      {resetModalEmp && (
        <ResetPasswordModal
          employee={resetModalEmp}
          onClose={() => setResetModalEmp(null)}
          onSubmit={(newPassword) => {
            resetPasswordMutation.mutate({
              id: resetModalEmp._id,
              newPassword,
            });
          }}
          isPending={resetPasswordMutation.isPending}
        />
      )}
    </>
  );
};

export default Employees;
