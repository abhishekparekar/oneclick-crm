import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { getManagerTeamApi } from "../../api/managerApi";
import {
  patchEmployeeStatusApi,
  getEmployeeByIdApi,
  getDepartmentsApi,
  getBranchesApi,
  getDesignationsApi,
} from "../../api/companyAdminApi";
import { useAuth } from "../../context/AuthContext";
import {
  Search, Filter, UserPlus, Download, RefreshCw,
  Users, UserCheck, CalendarOff, UserX, UserRoundPlus,
  Mail, Phone, Building2, Briefcase, MapPin, Calendar,
  MoreHorizontal, Eye, Edit2, PowerOff, Power,
  ChevronDown, X, ChevronRight, ChevronLeft,
  CheckCircle2, Hexagon, DollarSign, FileText,
  FileUp, Shield, Award, User, CheckCheck, Loader2,
  Clock, CheckSquare
} from "lucide-react";

// ── Avatar helper ─────────────────────────────────────────────────────────────
const AVATAR_BG = [
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400",
  "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400",
  "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-400",
  "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400",
  "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400",
  "bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400",
  "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400",
];
const avatarClass = (name) => AVATAR_BG[(name?.charCodeAt(0) || 0) % AVATAR_BG.length];

const getPhotoUrl = (rawPhoto) => {
  if (!rawPhoto || typeof rawPhoto !== "string") return null;
  const trimmed = rawPhoto.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }
  const base = (import.meta.env.VITE_API_URL || "http://localhost:5000/api")
    .replace(/\/+api$/, "")
    .replace(/\/+$/, "");
  return `${base}/${trimmed.replace(/^\/+/, "")}`;
};

// ── Status pill ───────────────────────────────────────────────────────────────
const EmpStatusBadge = ({ status }) => {
  const cfg = {
    active: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    inactive: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    on_leave: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    terminated: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  };
  const label = {
    active: "Active",
    inactive: "Inactive",
    on_leave: "On Leave",
    terminated: "Terminated",
  };
  const key = (status || "inactive").toLowerCase();
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${cfg[key] || cfg.inactive}`}>
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
          key === "active"
            ? "bg-emerald-500 animate-pulse"
            : key === "on_leave"
            ? "bg-amber-500"
            : key === "terminated"
            ? "bg-rose-500"
            : "bg-slate-400"
        }`}
      />
      {label[key] || status}
    </span>
  );
};

// ── Action menu ────────────────────────────────────────────────────────────────
const ActionMenu = ({
  employee,
  onView,
  onToggleStatus,
  canEdit,
  canToggleStatus,
  canUploadDocs,
}) => {
  const [pos, setPos] = useState(null);
  const isActive = employee.status === "active";
  const empId = employee._id || employee.employeeId?._id || employee.employeeId;

  const handleOpen = (e) => {
    e.stopPropagation();
    if (pos) {
      setPos(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < 180) {
      setPos({
        right: window.innerWidth - rect.right,
        bottom: window.innerHeight - rect.top + 4,
        top: "auto",
      });
    } else {
      setPos({
        right: window.innerWidth - rect.right,
        top: rect.bottom + 4,
        bottom: "auto",
      });
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
        title="Member actions"
      >
        <MoreHorizontal size={16} />
      </button>
      {pos && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPos(null)} />
          <div
            className="fixed z-50 w-44 bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden py-1"
            style={{ top: pos.top, bottom: pos.bottom, right: pos.right }}
          >
            <button
              onClick={() => {
                onView(employee);
                setPos(null);
              }}
              className="flex items-center space-x-2.5 w-full px-3.5 py-2 text-[12px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer"
            >
              <Eye size={14} className="text-slate-400" />
              <span>View Profile</span>
            </button>

            {canEdit && (
              <Link
                to={`/manager/employees/edit/${empId}`}
                className="flex items-center space-x-2.5 w-full px-3.5 py-2 text-[12px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer"
                onClick={() => setPos(null)}
              >
                <Edit2 size={14} className="text-slate-400" />
                <span>Edit Details</span>
              </Link>
            )}

            {canUploadDocs && (
              <Link
                to="/manager/upload-document"
                className="flex items-center space-x-2.5 w-full px-3.5 py-2 text-[12px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer"
                onClick={() => setPos(null)}
              >
                <FileUp size={14} className="text-slate-400" />
                <span>Upload KYC</span>
              </Link>
            )}

            {canToggleStatus && (
              <>
                <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                <button
                  onClick={() => {
                    onToggleStatus(employee);
                    setPos(null);
                  }}
                  className="flex items-center space-x-2.5 w-full px-3.5 py-2 text-[12px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer"
                >
                  {isActive ? (
                    <>
                      <PowerOff size={14} className="text-rose-500" />
                      <span className="text-rose-600 dark:text-rose-400">Deactivate</span>
                    </>
                  ) : (
                    <>
                      <Power size={14} className="text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">Activate</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ── Select dropdown ───────────────────────────────────────────────────────────
const Select = ({ value, onChange, options, placeholder, className = "" }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <div className={`relative ${className}`}>
      {open && <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-1.5 pl-3 pr-2.5 py-1.5 border rounded-lg text-[12px] font-bold cursor-pointer transition-all shadow-2xs whitespace-nowrap ${
          open || value
            ? "border-[#1268D9] bg-[#1268D9]/10 text-[#1268D9]"
            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C24] text-slate-700 dark:text-slate-300 hover:border-[#1268D9]/40"
        }`}
      >
        <span className={`whitespace-nowrap truncate ${value ? "font-black text-[#1268D9]" : ""}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={13} className={`flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-30 min-w-full w-max max-w-[220px] bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden py-1 animate-fadeIn">
          <div className="max-h-52 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className={`w-full text-left px-3.5 py-2 text-[12px] transition-colors cursor-pointer ${
                !value
                  ? "bg-[#1268D9] text-white font-bold"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              {placeholder}
            </button>
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2 text-[12px] transition-colors cursor-pointer ${
                  value === o.value
                    ? "bg-[#1268D9] text-white font-bold"
                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
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

// ── Employee Slide-over / Modal Drawer ─────────────────────────────────────────
const EmployeeDrawer = ({ employee, onClose, canEdit }) => {
  const [drawerTab, setDrawerTab] = useState("overview");
  const empId = employee?._id || employee?.employeeId?._id || employee?.employeeId;

  const { data: fullEmpRes, isLoading: isLoadingFull } = useQuery({
    queryKey: ["employee", empId],
    queryFn: () => getEmployeeByIdApi(empId),
    enabled: !!empId,
  });

  if (!employee) return null;
  const empData = fullEmpRes?.data?.employee || employee;
  const name =
    empData.fullName ||
    empData.user?.name ||
    `${empData.firstName || ""} ${empData.lastName || ""}`.trim() ||
    "Team Member";
  const email = empData.user?.email || empData.email;
  const phone = empData.user?.phone || empData.phone;
  const isActive = empData.status === "active";
  const joined =
    empData.joiningDate ||
    empData.user?.joiningDate ||
    empData.dateOfJoining ||
    empData.createdAt;
  const initials = name.slice(0, 2).toUpperCase();
  const ac = avatarClass(name);
  const rawPhoto =
    empData.photo ||
    empData.documents?.photo ||
    empData.user?.profileImage ||
    empData.userId?.profileImage;
  const photoUrl = getPhotoUrl(rawPhoto);
  const displayRole = empData.role || empData.userId?.role || empData.user?.role || "Employee";
  const formattedRole = displayRole === "CompanyAdmin" ? "Company Admin" : displayRole;
  const drawerDepts =
    Array.isArray(empData.accessibleDepartments) && empData.accessibleDepartments.length > 0
      ? empData.accessibleDepartments
          .map((d) => (typeof d === "object" ? d.name : d))
          .filter(Boolean)
          .join(", ")
      : empData.departmentId?.name || empData.department?.name || "—";
  const branchName = empData.branchId?.branchName || empData.branchId?.name || empData.branch?.name || "—";
  const desigName = empData.designationId?.name || empData.designation?.name || "Team Member";

  const formatAddress = (addr) => {
    if (!addr) return null;
    return [addr.addressLine1, addr.addressLine2, addr.city, addr.state, addr.country, addr.pincode]
      .filter(Boolean)
      .join(", ");
  };

  const docs = empData.documents || {};
  const docList = [
    { key: "offerLetter", label: "Offer Letter", url: docs.offerLetter },
    { key: "joiningLetter", label: "Joining Letter", url: docs.joiningLetter },
    { key: "resume", label: "Resume / CV", url: docs.resume },
    { key: "salarySlipPrevious", label: "Previous Salary Slip", url: docs.salarySlipPrevious },
    { key: "panCard", label: "PAN Card", url: docs.panCard },
    { key: "aadhaarFront", label: "Aadhaar Document", url: docs.aadhaarFront || docs.aadhaarBack },
  ].filter((d) => Boolean(d.url));

  const TABS = [
    { id: "overview", label: "Overview", icon: User },
    { id: "job", label: "Job Info", icon: Briefcase },
    { id: "personal", label: "Personal", icon: Shield },
    { id: "documents", label: "Documents", icon: FileText },
  ];

  const InfoRow = ({ label, value, highlight = false }) => (
    <div className="flex flex-col gap-0.5 py-2 border-b border-slate-100 dark:border-slate-800/50 last:border-0">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      <span
        className={`text-xs font-bold leading-snug ${
          highlight ? "text-[#1268D9] dark:text-[#2F8BFF]" : "text-slate-800 dark:text-slate-200"
        }`}
      >
        {value || "—"}
      </span>
    </div>
  );

  const SectionBlock = ({ title, iconEl, iconColor = "text-[#1268D9]", iconBg = "bg-[#1268D9]/10", children }) => (
    <div className="bg-slate-50/50 dark:bg-[#071A2F]/40 rounded-2xl border border-slate-200/80 dark:border-[#1C3554] overflow-hidden shadow-2xs">
      <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100/60 dark:bg-[#071A2F] border-b border-slate-200/80 dark:border-[#1C3554]">
        <div className={`w-5 h-5 rounded-md ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}>
          {iconEl}
        </div>
        <span className="text-[10.5px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
          {title}
        </span>
      </div>
      <div className="px-3.5 pt-0.5 pb-2">{children}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-[#0D1B2E] rounded-2xl shadow-2xl flex flex-col border border-slate-200 dark:border-[#1C3554] overflow-hidden z-10">
        {/* Header */}
        <div className="flex-shrink-0 bg-slate-50/80 dark:bg-[#071A2F] border-b border-slate-200/80 dark:border-[#1C3554]">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200/80 dark:border-[#1C3554]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#1268D9]/10 text-[#1268D9] flex items-center justify-center shrink-0">
                <Users size={15} />
              </div>
              <div className="min-w-0">
                <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                  Team Member Profile
                </p>
                <p className="text-sm font-black text-slate-900 dark:text-white truncate leading-tight mt-0.5">
                  {name}
                </p>
              </div>
              {empData.employeeCode && (
                <span className="px-2 py-0.5 rounded-lg bg-white dark:bg-[#050F1F] text-slate-600 dark:text-slate-300 font-mono text-[10px] font-extrabold border border-slate-200 dark:border-[#1C3554] shrink-0">
                  {empData.employeeCode}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <EmpStatusBadge status={empData.status} />
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/[0.06] text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Profile Banner */}
          <div className="px-4 py-3 flex items-start gap-3.5">
            <div className="relative shrink-0">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={name}
                  className="w-12 h-12 rounded-2xl object-cover shadow-md border-2 border-white dark:border-[#1C3554] ring-2 ring-[#1268D9]/20"
                />
              ) : (
                <div
                  className={`w-12 h-12 rounded-2xl ${ac} flex items-center justify-center text-sm font-black shadow-md border-2 border-white dark:border-[#1C3554] ring-2 ring-[#1268D9]/20`}
                >
                  {initials}
                </div>
              )}
              {isActive && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0D1B2E]" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-[#1268D9]/10 text-[#1268D9] dark:text-[#2F8BFF] border border-[#1268D9]/20">
                  {desigName}
                </span>
                {drawerDepts && drawerDepts !== "—" && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/60">
                    {drawerDepts}
                  </span>
                )}
                {empData.employmentType && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-[#050F1F] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#1C3554]">
                    {empData.employmentType}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {email && (
                  <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                    <Mail size={12} className="text-[#1268D9] shrink-0" />
                    {email}
                  </span>
                )}
                {phone && (
                  <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <Phone size={12} className="text-emerald-500 shrink-0" />
                    {phone}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 shrink-0">
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-[#050F1F] border border-slate-200 dark:border-[#1C3554] text-slate-700 dark:text-slate-200 rounded-lg hover:border-[#1268D9] hover:bg-[#1268D9]/5 transition-all font-bold text-[10px] cursor-pointer"
                >
                  <Mail size={11} className="text-[#1268D9]" /> Email
                </a>
              )}
              {canEdit && (
                <Link
                  to={`/manager/employees/edit/${empId}`}
                  className="flex items-center gap-1 px-2.5 py-1 bg-[#1268D9] text-white rounded-lg hover:bg-blue-600 transition-all font-bold text-[10px] cursor-pointer shadow-2xs"
                >
                  <Edit2 size={11} /> Edit
                </Link>
              )}
            </div>
          </div>

          {/* Tab Bar */}
          <div className="flex border-t border-slate-200/80 dark:border-[#1C3554]">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setDrawerTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-extrabold uppercase tracking-wide transition-all border-b-2 cursor-pointer ${
                  drawerTab === t.id
                    ? "border-[#1268D9] text-[#1268D9] dark:text-[#2F8BFF] bg-[#1268D9]/10"
                    : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50/80 dark:hover:bg-white/[0.03]"
                }`}
              >
                <t.icon size={13} strokeWidth={2.5} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 max-h-[60vh]">
          {isLoadingFull ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2">
              <Loader2 size={24} className="animate-spin text-[#1268D9]" />
              <p className="text-xs text-slate-400">Loading complete details...</p>
            </div>
          ) : (
            <>
              {drawerTab === "overview" && (
                <div className="space-y-3">
                  <SectionBlock title="Organizational Summary" iconEl={<Briefcase size={12} />}>
                    <div className="grid grid-cols-2 gap-x-4">
                      <InfoRow label="Department" value={drawerDepts} highlight />
                      <InfoRow label="Designation" value={desigName} />
                      <InfoRow label="Primary Branch" value={branchName} />
                      <InfoRow label="System Role" value={formattedRole} />
                      <InfoRow
                        label="Date of Joining"
                        value={
                          joined
                            ? new Date(joined).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"
                        }
                      />
                      <InfoRow label="Employment Type" value={empData.employmentType} />
                    </div>
                  </SectionBlock>

                  <SectionBlock title="Quick Contact" iconEl={<Mail size={12} />}>
                    <div className="grid grid-cols-2 gap-x-4">
                      <InfoRow label="Email Address" value={email} />
                      <InfoRow label="Phone Number" value={phone} />
                      <InfoRow label="Work Mode" value={empData.workMode || "office"} />
                      <InfoRow
                        label="Remote Punch Allowed"
                        value={empData.allowRemotePunch ? "Yes" : "No"}
                      />
                    </div>
                  </SectionBlock>
                </div>
              )}

              {drawerTab === "job" && (
                <div className="space-y-3">
                  <SectionBlock title="Role & Reporting" iconEl={<Building2 size={12} />}>
                    <div className="grid grid-cols-2 gap-x-4">
                      <InfoRow label="Primary Department" value={empData.departmentId?.name || "—"} />
                      <InfoRow label="All Accessible Depts" value={drawerDepts} />
                      <InfoRow label="Reporting Manager" value={empData.reportingManagerName || "Self / Admin"} />
                      <InfoRow label="Employee Code" value={empData.employeeCode} />
                    </div>
                  </SectionBlock>
                </div>
              )}

              {drawerTab === "personal" && (
                <div className="space-y-3">
                  <SectionBlock title="Personal Identity" iconEl={<Shield size={12} />}>
                    <div className="grid grid-cols-2 gap-x-4">
                      <InfoRow label="Gender" value={empData.gender} />
                      <InfoRow
                        label="Date of Birth"
                        value={
                          empData.dateOfBirth
                            ? new Date(empData.dateOfBirth).toLocaleDateString("en-IN")
                            : "—"
                        }
                      />
                      <InfoRow label="Marital Status" value={empData.maritalStatus} />
                      <InfoRow label="Blood Group" value={empData.bloodGroup} />
                    </div>
                  </SectionBlock>

                  {(empData.currentAddress?.addressLine1 || empData.permanentAddress?.addressLine1) && (
                    <SectionBlock title="Addresses" iconEl={<MapPin size={12} />}>
                      <InfoRow label="Current Address" value={formatAddress(empData.currentAddress)} />
                      <InfoRow label="Permanent Address" value={formatAddress(empData.permanentAddress)} />
                    </SectionBlock>
                  )}
                </div>
              )}

              {drawerTab === "documents" && (
                <div className="space-y-3">
                  <SectionBlock title="KYC Documents" iconEl={<FileText size={12} />}>
                    {docList.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        No documents uploaded yet.
                      </div>
                    ) : (
                      <div className="space-y-2 py-1">
                        {docList.map((doc) => (
                          <div
                            key={doc.key}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#0B101B] border border-slate-200 dark:border-slate-800"
                          >
                            <div className="flex items-center gap-2">
                              <FileText size={14} className="text-[#1268D9]" />
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {doc.label}
                              </span>
                            </div>
                            <a
                              href={getPhotoUrl(doc.url)}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-[#1268D9] hover:underline"
                            >
                              View File
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </SectionBlock>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const ROWS_PER_PAGE = 10;

// ── Main Manager Team Members Component ───────────────────────────────────────
export default function ManagerTeamMembers() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();

  const canAdd = hasPermission("teamMembers", "add");
  const canEdit = hasPermission("teamMembers", "edit");
  const canUploadDocs = hasPermission("teamMembers", "uploadDocs");
  const canToggleStatus = hasPermission("teamMembers", "activeInactive");

  // ── Filters & Page State ──
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [activeTab, setActiveTab] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // ── Data Queries ──
  const { data: teamRes, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["managerTeam"],
    queryFn: () => getManagerTeamApi().then((r) => r.data),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: deptRes } = useQuery({
    queryKey: ["departments"],
    queryFn: getDepartmentsApi,
    staleTime: 60 * 1000,
  });

  const { data: desgRes } = useQuery({
    queryKey: ["designations"],
    queryFn: getDesignationsApi,
    staleTime: 60 * 1000,
  });

  const { data: branchRes } = useQuery({
    queryKey: ["branches"],
    queryFn: getBranchesApi,
    staleTime: 60 * 1000,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => patchEmployeeStatusApi(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managerTeam"] });
      toast.success("Team member status updated!");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to update status");
    },
  });

  const handleToggleStatus = (emp) => {
    const isActive = emp.status === "active";
    const label = isActive ? "deactivate" : "activate";
    const name = emp.fullName || emp.name || emp.firstName || "this team member";
    if (window.confirm(`Are you sure you want to ${label} ${name}?`)) {
      statusMutation.mutate({
        id: emp._id || emp.employeeId?._id || emp.employeeId,
        status: !isActive,
      });
    }
  };

  const rawMembers =
    teamRes?.data?.teamMembers ||
    teamRes?.teamMembers ||
    teamRes?.team ||
    teamRes?.employees ||
    [];
  const allMembers = Array.isArray(rawMembers)
    ? rawMembers
    : Array.isArray(teamRes?.data)
    ? teamRes.data
    : [];

  const summary = teamRes?.data?.summary || teamRes?.summary || {};
  const departments = deptRes?.data?.departments || deptRes?.departments || [];
  const designations = desgRes?.data?.designations || desgRes?.designations || [];
  const branches = branchRes?.data?.branches || branchRes?.branches || [];

  // ── Stats Calculations ──
  const stats = useMemo(() => {
    return {
      total: allMembers.length,
      active: allMembers.filter((e) => (e.status || "active").toLowerCase() === "active").length,
      onLeave: allMembers.filter((e) => (e.status || "").toLowerCase() === "on_leave").length,
      inactive: allMembers.filter(
        (e) => (e.status || "").toLowerCase() === "inactive" || (e.status || "").toLowerCase() === "terminated"
      ).length,
      pendingTasks: summary.pendingTasks ?? allMembers.reduce((acc, m) => acc + (m.pendingTasksCount || 0), 0),
    };
  }, [allMembers, summary]);

  // ── Filtered List ──
  const filtered = useMemo(() => {
    let list = [...allMembers];
    const s = search.toLowerCase().trim();

    if (activeTab) {
      if (activeTab === "inactive") {
        list = list.filter((e) => (e.status || "").toLowerCase() === "inactive" || (e.status || "").toLowerCase() === "terminated");
      } else {
        list = list.filter((e) => (e.status || "active").toLowerCase() === activeTab);
      }
    }

    if (statusFilter) {
      list = list.filter((e) => (e.status || "active").toLowerCase() === statusFilter.toLowerCase());
    }

    if (deptFilter) {
      list = list.filter((e) => {
        const dId = e.departmentId?._id || e.departmentId || e.department?._id;
        return String(dId) === String(deptFilter);
      });
    }

    if (designationFilter) {
      list = list.filter((e) => {
        const desId = e.designationId?._id || e.designationId || e.designation?._id;
        return String(desId) === String(designationFilter);
      });
    }

    if (branchFilter) {
      list = list.filter((e) => {
        const bId = e.branchId?._id || e.branchId || e.branch?._id;
        return String(bId) === String(branchFilter);
      });
    }

    if (s) {
      list = list.filter((e) => {
        const name = (e.fullName || `${e.firstName || ""} ${e.lastName || ""}` || e.name || "").toLowerCase();
        const email = (e.email || e.user?.email || "").toLowerCase();
        const code = (e.employeeCode || "").toLowerCase();
        const phone = (e.phone || e.user?.phone || "").toLowerCase();
        const dept = (e.departmentId?.name || e.departmentName || e.department?.name || "").toLowerCase();
        return (
          name.includes(s) ||
          email.includes(s) ||
          code.includes(s) ||
          phone.includes(s) ||
          dept.includes(s)
        );
      });
    }

    return list;
  }, [allMembers, search, activeTab, statusFilter, deptFilter, designationFilter, branchFilter]);

  // ── Pagination ──
  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  const resetPage = () => setPage(1);

  // ── Export CSV ──
  const exportCSV = () => {
    const headers = ["Name", "Code", "Email", "Phone", "Department", "Designation", "Branch", "Status", "Joined"];
    const rows = filtered.map((e) => {
      const name = e.fullName || `${e.firstName || ""} ${e.lastName || ""}` || e.name || "";
      const dept = e.departmentId?.name || e.departmentName || e.department?.name || "";
      const desg = e.designationId?.name || e.designationName || e.designation?.name || "";
      const branch = e.branchId?.branchName || e.branchId?.name || e.branch?.name || "";
      return [
        name,
        e.employeeCode || "",
        e.email || e.user?.email || "",
        e.phone || e.user?.phone || "",
        dept,
        desg,
        branch,
        e.status || "active",
        e.joiningDate ? new Date(e.joiningDate).toLocaleDateString("en-IN") : "",
      ];
    });

    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "team_members.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeFiltersCount = [deptFilter, designationFilter, branchFilter, statusFilter].filter(Boolean).length;

  const TAB_OPTIONS = [
    { value: "", label: "All", count: stats.total },
    { value: "active", label: "Active", count: stats.active },
    { value: "on_leave", label: "On Leave", count: stats.onLeave },
    { value: "inactive", label: "Inactive", count: stats.inactive },
  ];

  return (
    <>
      <div className="space-y-4 pb-10 font-sans text-slate-900 dark:text-slate-100 max-w-full">
        {/* ── 1. Seamless Page Header (Matching Admin layout) ──────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div>
            <h1 className="text-[20px] sm:text-[22px] font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Team Directory <Users size={20} className="text-[#1268D9]" />
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Directory of assigned team members, profiles, and reporting structures
            </p>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              onClick={exportCSV}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-2xs cursor-pointer"
            >
              <Download size={13} className="text-slate-400" />
              <span>Export</span>
            </button>

            <button
              onClick={() => refetch()}
              className="p-1.5 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-2xs cursor-pointer"
              title="Refresh Team Members"
            >
              <RefreshCw size={14} className={isFetching ? "animate-spin text-[#1268D9]" : ""} />
            </button>

            {canUploadDocs && (
              <Link
                to="/manager/upload-document"
                className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-2xs"
              >
                <FileUp size={13} className="text-[#1268D9]" />
                <span className="hidden sm:inline">Upload Docs</span>
              </Link>
            )}

            {canAdd && (
              <Link
                to="/manager/employees/add"
                className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3.5 py-1.5 bg-[#1268D9] hover:bg-blue-600 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer"
              >
                <UserPlus size={14} strokeWidth={2.5} />
                <span>+ Add Team Member</span>
              </Link>
            )}
          </div>
        </div>

        {/* ── 2. KPI Cards (Matching Admin format) ─────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
          <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Staff</span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{stats.total}</h3>
              <span className="text-[10.5px] font-bold text-[#1268D9]">All Assigned</span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-[#1268D9]/10 text-[#1268D9] flex items-center justify-center font-bold">
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
              <span className="text-[10.5px] font-bold text-amber-600 dark:text-amber-400">Approved Leave</span>
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
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Tasks</span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{stats.pendingTasks}</h3>
              <span className="text-[10.5px] font-bold text-purple-600 dark:text-purple-400">Assigned Incomplete</span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
              <CheckSquare size={16} />
            </div>
          </div>
        </div>

        {/* ── 3. Table Card (Matching Admin Directory Table) ─────────────────── */}
        <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
          {/* Top Toolbar */}
          <div className="px-4 sm:px-5 pt-4 pb-4 border-b border-slate-200/80 dark:border-slate-800 space-y-3 bg-slate-50/40 dark:bg-slate-900/40">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative w-64 sm:w-72">
                  <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search name, code, email, phone..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      resetPage();
                    }}
                    className="w-full pl-9 pr-4 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B101B] rounded-xl text-[12px] font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1268D9]/20 focus:border-[#1268D9] transition-all shadow-2xs"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Filter toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 border rounded-xl text-[12px] font-bold transition-all shadow-2xs whitespace-nowrap cursor-pointer ${
                    showFilters || activeFiltersCount > 0
                      ? "bg-[#1268D9]/10 border-[#1268D9]/30 text-[#1268D9]"
                      : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 bg-white dark:bg-[#0B101B] hover:bg-slate-50"
                  }`}
                >
                  <Filter size={13} className={showFilters || activeFiltersCount > 0 ? "text-[#1268D9]" : "text-slate-400"} />
                  <span>Filters</span>
                  {activeFiltersCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-[#1268D9] text-white text-[10px] flex items-center justify-center font-black ml-0.5">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Status Tab Pills */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
                {TAB_OPTIONS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => {
                      setActiveTab(t.value);
                      resetPage();
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeTab === t.value
                        ? "bg-white dark:bg-[#111C24] text-[#1268D9] shadow-2xs font-extrabold"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    <span>{t.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        activeTab === t.value
                          ? "bg-[#1268D9]/10 text-[#1268D9]"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {t.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Collapsible Filter Bar */}
            {showFilters && (
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center gap-2.5 flex-wrap animate-fadeIn">
                <Select
                  value={deptFilter}
                  onChange={(v) => {
                    setDeptFilter(v);
                    resetPage();
                  }}
                  options={departments.map((d) => ({ value: d._id, label: d.name }))}
                  placeholder="All Departments"
                  className="w-36"
                />
                <Select
                  value={designationFilter}
                  onChange={(v) => {
                    setDesignationFilter(v);
                    resetPage();
                  }}
                  options={designations.map((d) => ({ value: d._id, label: d.name }))}
                  placeholder="All Designations"
                  className="w-36"
                />
                <Select
                  value={branchFilter}
                  onChange={(v) => {
                    setBranchFilter(v);
                    resetPage();
                  }}
                  options={branches.map((b) => ({ value: b._id, label: b.name || b.branchName }))}
                  placeholder="All Branches"
                  className="w-32"
                />
                <Select
                  value={statusFilter}
                  onChange={(v) => {
                    setStatusFilter(v);
                    resetPage();
                  }}
                  options={[
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                    { value: "on_leave", label: "On Leave" },
                    { value: "terminated", label: "Terminated" },
                  ]}
                  placeholder="All Statuses"
                  className="w-32"
                />

                {activeFiltersCount > 0 && (
                  <button
                    onClick={() => {
                      setDeptFilter("");
                      setDesignationFilter("");
                      setBranchFilter("");
                      setStatusFilter("");
                      resetPage();
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-[#1268D9] hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── 4. Main Table ──────────────────────────────────────────────── */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-2">
              <Loader2 size={24} className="animate-spin text-[#1268D9]" />
              <p className="text-xs text-slate-400 font-medium">Loading team members...</p>
            </div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Users size={22} className="text-slate-400" />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No team members found</p>
              <p className="text-xs text-slate-400">Try adjusting your search query or filter options</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-y border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60">
                    {[
                      "Team Member",
                      "Contact",
                      "Department & Branch",
                      "Designation",
                      "Status",
                      "Joining Date",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className={`px-5 py-3 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap ${
                          h === "Actions" ? "text-center" : ""
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {paginated.map((emp) => {
                    const empId = emp._id || emp.employeeId?._id || emp.employeeId;
                    const name =
                      emp.fullName ||
                      `${emp.firstName || ""} ${emp.lastName || ""}`.trim() ||
                      emp.name ||
                      "Team Member";
                    const email = emp.email || emp.user?.email || "";
                    const phone = emp.phone || emp.user?.phone || "";
                    const dept =
                      emp.departmentId?.name ||
                      emp.departmentName ||
                      emp.department?.name ||
                      "—";
                    const desg =
                      emp.designationId?.name ||
                      emp.designationName ||
                      emp.designation?.name ||
                      "Team Member";
                    const branch =
                      emp.branchId?.branchName ||
                      emp.branchId?.name ||
                      emp.branch?.name ||
                      "—";
                    const joined =
                      emp.joiningDate ||
                      emp.user?.joiningDate ||
                      emp.dateOfJoining ||
                      emp.createdAt;
                    const code = emp.employeeCode || "—";
                    const ac = avatarClass(name);
                    const rawPhoto =
                      emp.photo ||
                      emp.documents?.photo ||
                      emp.user?.profileImage ||
                      emp.userId?.profileImage;
                    const photoUrl = getPhotoUrl(rawPhoto);
                    const isSelected = selectedEmployee?._id === empId;

                    return (
                      <tr
                        key={empId}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group ${
                          isSelected ? "bg-[#1268D9]/5 border-l-2 border-l-[#1268D9]" : ""
                        }`}
                        onClick={() => setSelectedEmployee(isSelected ? null : emp)}
                      >
                        {/* 1. Team Member Avatar & Name */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center space-x-2.5">
                            {photoUrl ? (
                              <img
                                src={photoUrl}
                                alt={name}
                                className="w-9 h-9 rounded-full object-cover flex-shrink-0 shadow-2xs border border-slate-200 dark:border-slate-700"
                              />
                            ) : (
                              <div
                                className={`w-9 h-9 rounded-full ${ac} flex items-center justify-center font-black text-xs flex-shrink-0 shadow-2xs border border-slate-200 dark:border-slate-700`}
                              >
                                {name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-[13px] font-black text-slate-800 dark:text-slate-100 leading-tight group-hover:text-[#1268D9] transition-colors truncate">
                                {name}
                              </p>
                              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5 font-mono">
                                {code}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* 2. Contact Details */}
                        <td className="px-5 py-3.5">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-1.5 text-[12px] font-bold text-slate-600 dark:text-slate-300">
                              <Mail size={12} className="text-slate-400 shrink-0" />
                              <span className="truncate max-w-[160px]">{email || "—"}</span>
                            </div>
                            <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              <Phone size={12} className="text-slate-400 shrink-0" />
                              <span className="font-mono">{phone || "—"}</span>
                            </div>
                          </div>
                        </td>

                        {/* 3. Department & Branch */}
                        <td className="px-5 py-3.5">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-1.5 text-[12px] font-bold text-slate-700 dark:text-slate-200">
                              <Building2 size={12} className="text-[#1268D9] shrink-0" />
                              <span className="truncate max-w-[150px]">{dept}</span>
                            </div>
                            <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-slate-400">
                              <MapPin size={12} className="text-slate-300 dark:text-slate-600 shrink-0" />
                              <span className="truncate max-w-[150px]">{branch}</span>
                            </div>
                          </div>
                        </td>

                        {/* 4. Designation */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center space-x-1.5 text-[12px] font-bold text-slate-700 dark:text-slate-300">
                            <Briefcase size={13} className="text-slate-400 shrink-0" />
                            <span>{desg}</span>
                          </div>
                        </td>

                        {/* 5. Status Badge */}
                        <td className="px-5 py-3.5">
                          <EmpStatusBadge status={emp.status} />
                        </td>

                        {/* 6. Joining Date */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center space-x-1.5 text-[11.5px] font-bold text-slate-600 dark:text-slate-300">
                            <Calendar size={12} className="text-slate-400 shrink-0" />
                            <span>
                              {joined
                                ? new Date(joined).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "Not Set"}
                            </span>
                          </div>
                        </td>

                        {/* 7. Action Menu */}
                        <td className="px-5 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            {canEdit && (
                              <Link
                                to={`/manager/employees/edit/${empId}`}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-[#1268D9] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="Edit Team Member"
                              >
                                <Edit2 size={13} />
                              </Link>
                            )}

                            <ActionMenu
                              employee={emp}
                              onView={(e) => setSelectedEmployee(e)}
                              onToggleStatus={handleToggleStatus}
                              canEdit={canEdit}
                              canToggleStatus={canToggleStatus}
                              canUploadDocs={canUploadDocs}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── 5. Pagination ──────────────────────────────────────────────── */}
          {filtered.length > ROWS_PER_PAGE && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Showing{" "}
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {(page - 1) * ROWS_PER_PAGE + 1}–{Math.min(page * ROWS_PER_PAGE, filtered.length)}
                </span>{" "}
                of <span className="font-bold text-slate-800 dark:text-slate-200">{filtered.length}</span> team members
              </p>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        page === pageNum
                          ? "bg-[#1268D9] text-white border border-[#1268D9]"
                          : "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 6. Employee Details Slide-Over Drawer Modal ─────────────────────── */}
      {selectedEmployee && (
        <EmployeeDrawer
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
          canEdit={canEdit}
        />
      )}
    </>
  );
}
