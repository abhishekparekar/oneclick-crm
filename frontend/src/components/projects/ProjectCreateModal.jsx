import { useState, useMemo, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import { getManagerTeamApi, createManagerProjectApi } from "../../api/managerApi";
import { getEmployeesApi, getDepartmentsApi, createProjectApi } from "../../api/companyAdminApi";
import {
  FolderKanban,
  Building2,
  UserCheck,
  Calendar,
  CalendarDays,
  Clock,
  Users,
  Search,
  X,
  Check,
  Sparkles,
  AlertCircle,
  FileText,
  Paperclip,
  CheckCircle2,
  Tag,
} from "lucide-react";
import TaskAttachmentField from "../tasks/TaskAttachmentField";
import toast from "react-hot-toast";

const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Calculate working days (excluding weekends) between two dates
const calculateWorkingDays = (start, end) => {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s) || isNaN(e) || s > e) return 0;
  
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
};

const STATUS_OPTIONS = [
  { value: "planning", label: "Planning", color: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800", dot: "bg-indigo-500" },
  { value: "active", label: "Active", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800", dot: "bg-emerald-500" },
  { value: "working", label: "In Progress", color: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800", dot: "bg-amber-500" },
  { value: "review", label: "Review", color: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800", dot: "bg-cyan-500" },
  { value: "deployment", label: "Deployment", color: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800", dot: "bg-purple-500" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", color: "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30", dot: "bg-emerald-500" },
  { value: "medium", label: "Medium", color: "text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/30", dot: "bg-amber-500" },
  { value: "high", label: "High", color: "text-rose-700 dark:text-rose-400 bg-rose-500/10 border-rose-500/30", dot: "bg-rose-500" },
];

export default function ProjectCreateModal({ isOpen, onClose, onSuccess }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "CompanyAdmin" || user?.role === "Admin" || user?.role === "HR";

  // Data fetching
  const { data: teamData } = useQuery({
    queryKey: ["managerTeam"],
    queryFn: () => getManagerTeamApi().then((r) => r.data),
    enabled: isOpen && !isAdmin,
  });

  const { data: adminEmpsData } = useQuery({
    queryKey: ["companyEmployees"],
    queryFn: () => getEmployeesApi({ limit: 500 }).then((r) => r.data),
    enabled: isOpen && isAdmin,
  });

  const { data: deptData } = useQuery({
    queryKey: ["departments"],
    queryFn: () => getDepartmentsApi().then((r) => r.data),
    enabled: isOpen,
  });

  // Extract employees list
  const employees = useMemo(() => {
    if (isAdmin) {
      const list = adminEmpsData?.employees || adminEmpsData?.data || [];
      return Array.isArray(list) ? list : [];
    }
    const list = teamData?.data?.teamMembers || teamData?.teamMembers || teamData?.team || [];
    return Array.isArray(list) ? list : [];
  }, [isAdmin, adminEmpsData, teamData]);

  const departments = useMemo(() => {
    const list = deptData?.departments || deptData?.data || [];
    return Array.isArray(list) ? list : [];
  }, [deptData]);

  const initialForm = {
    name: "",
    clientName: "",
    description: "",
    projectManager: "",
    departmentId: "",
    status: "planning",
    priority: "medium",
    startDate: getTodayDateString(),
    endDate: "",
    estimatedWorkingDays: 0,
    nextFollowUpDate: "",
    members: [],
    attachments: [],
  };

  const [form, setForm] = useState(initialForm);
  const [memberSearch, setMemberSearch] = useState("");
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setForm(initialForm);
      setMemberSearch("");
      setIsMemberDropdownOpen(false);
    }
  }, [isOpen]);

  // Auto-calculate working days whenever start date or end date changes
  useEffect(() => {
    if (form.startDate && form.endDate) {
      const days = calculateWorkingDays(form.startDate, form.endDate);
      setForm((prev) => ({ ...prev, estimatedWorkingDays: days }));
    }
  }, [form.startDate, form.endDate]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Mutations
  const createMut = useMutation({
    mutationFn: (data) => (isAdmin ? createProjectApi(data) : createManagerProjectApi(data)),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["companyProjects"] });
      queryClient.invalidateQueries({ queryKey: ["managerProjects"] });
      toast.success("Project created successfully!");
      if (onSuccess) onSuccess(res?.data?.project || res?.data);
      onClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to create project");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Please enter a project title");
      return;
    }
    createMut.mutate(form);
  };

  const toggleMember = (empId) => {
    setForm((prev) => {
      const exists = prev.members.includes(empId);
      return {
        ...prev,
        members: exists ? prev.members.filter((id) => id !== empId) : [...prev.members, empId],
      };
    });
  };

  const selectAllMembers = () => {
    setForm((prev) => ({
      ...prev,
      members: filteredEmployees.map((e) => e._id),
    }));
  };

  const clearAllMembers = () => {
    setForm((prev) => ({ ...prev, members: [] }));
  };

  const filteredEmployees = useMemo(() => {
    let list = employees;
    if (form.departmentId) {
      list = list.filter((emp) => {
        const dId = emp.departmentId?._id || emp.departmentId;
        return dId === form.departmentId;
      });
    }
    if (memberSearch.trim()) {
      const q = memberSearch.toLowerCase();
      list = list.filter(
        (emp) =>
          (emp.fullName || `${emp.firstName || ""} ${emp.lastName || ""}`).toLowerCase().includes(q) ||
          emp.email?.toLowerCase().includes(q) ||
          emp.employeeCode?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [employees, form.departmentId, memberSearch]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-white dark:bg-[#0E1726] border border-slate-200/90 dark:border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden relative animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Compact Header ────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/80 dark:bg-[#111C2D] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 dark:from-amber-500 dark:to-amber-700 flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <FolderKanban size={18} strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                  New Project Workspace
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {isAdmin ? "Company Admin" : "Manager"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-none mt-0.5">
                Define scope, schedule milestones, and assign dedicated team members.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Form Body (2-Column Responsive Compact Grid) ──────────── */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
            {/* ── LEFT COLUMN: Identity & Scope (7 Cols) ──────────────── */}
            <div className="lg:col-span-7 space-y-3.5">
              {/* Project Title */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Project Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enterprise HRMS Platform Redesign..."
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#152238] border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all shadow-xs"
                />
              </div>

              {/* Client & Department Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Building2 size={12} className="text-slate-400" /> Client / Account
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Corp / Internal"
                    value={form.clientName}
                    onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-[#152238] border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Department
                  </label>
                  <select
                    value={form.departmentId}
                    onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-[#152238] border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all cursor-pointer shadow-xs"
                  >
                    <option value="">All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept._id} value={dept._id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Project Manager Selector (Only for Admin) */}
              {isAdmin && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <UserCheck size={12} className="text-slate-400" /> Project Lead / Manager
                  </label>
                  <select
                    value={form.projectManager}
                    onChange={(e) => setForm({ ...form, projectManager: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-[#152238] border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all cursor-pointer shadow-xs"
                  >
                    <option value="">Assign Project Manager...</option>
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.fullName || `${emp.firstName || ""} ${emp.lastName || ""}`}{" "}
                        {emp.employeeCode ? `(${emp.employeeCode})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Project Scope & Description</span>
                  <span className="text-[10px] text-slate-400 lowercase font-medium">{form.description.length} chars</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Outline key objectives, deliverable milestones, and technical constraints..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#152238] border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all resize-none shadow-xs"
                />
              </div>

              {/* Attachments */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Paperclip size={12} className="text-slate-400" /> Documents & Briefs
                </label>
                <TaskAttachmentField
                  attachments={form.attachments}
                  onChange={(attachments) => setForm((prev) => ({ ...prev, attachments }))}
                />
              </div>
            </div>

            {/* ── RIGHT COLUMN: Schedule, Status & Team (5 Cols) ─────── */}
            <div className="lg:col-span-5 space-y-3.5">
              {/* Status Segmented Pills */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Initial Status
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {STATUS_OPTIONS.map((st) => {
                    const isSelected = form.status === st.value;
                    return (
                      <button
                        type="button"
                        key={st.value}
                        onClick={() => setForm({ ...form, status: st.value })}
                        className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? `${st.color} border-current shadow-xs`
                            : "bg-slate-50 dark:bg-[#152238] border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        {st.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Priority Segmented Pills */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Priority Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PRIORITY_OPTIONS.map((pr) => {
                    const isSelected = form.priority === pr.value;
                    return (
                      <button
                        type="button"
                        key={pr.value}
                        onClick={() => setForm({ ...form, priority: pr.value })}
                        className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? `${pr.color} shadow-xs font-black`
                            : "bg-slate-50 dark:bg-[#152238] border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${pr.dot}`} />
                        {pr.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Timeline & Working Days */}
              <div className="bg-slate-50 dark:bg-[#111C2D] border border-slate-200/80 dark:border-slate-800/80 p-3 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1">
                    <CalendarDays size={12} className="text-amber-500" /> Timeline & Schedule
                  </span>
                  <span className="text-amber-600 dark:text-amber-400 text-[10px]">
                    {form.estimatedWorkingDays} Working Days
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-[#152238] border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
                      Target Delivery
                    </label>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-[#152238] border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
                    Next Review / Follow-Up Date
                  </label>
                  <input
                    type="date"
                    value={form.nextFollowUpDate}
                    onChange={(e) => setForm({ ...form, nextFollowUpDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-[#152238] border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
                  />
                </div>
              </div>

              {/* Team Members Multi-Select */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Users size={12} className="text-slate-400" /> Team Members ({form.members.length})
                  </label>
                  <div className="flex items-center gap-2 text-[10px]">
                    <button
                      type="button"
                      onClick={selectAllMembers}
                      className="text-amber-600 hover:text-amber-700 dark:text-amber-400 font-bold cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <button
                      type="button"
                      onClick={clearAllMembers}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-semibold cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Member Search input */}
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search employees by name, email, code..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-[#152238] border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
                  />
                </div>

                {/* Member Roster list */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 bg-slate-50/50 dark:bg-[#111C2D] max-h-[160px] overflow-y-auto custom-scrollbar space-y-1">
                  {filteredEmployees.length === 0 ? (
                    <div className="text-center py-5 text-slate-400 text-xs font-semibold">
                      No matching employees found
                    </div>
                  ) : (
                    filteredEmployees.map((emp) => {
                      const isSelected = form.members.includes(emp._id);
                      const name = emp.fullName || `${emp.firstName || ""} ${emp.lastName || ""}`.trim();
                      const initial = name ? name.charAt(0).toUpperCase() : "U";

                      return (
                        <div
                          key={emp._id}
                          onClick={() => toggleMember(emp._id)}
                          className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer transition-all ${
                            isSelected
                              ? "bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 font-bold"
                              : "hover:bg-white dark:hover:bg-[#152238] text-slate-700 dark:text-slate-300 border border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${
                                isSelected
                                  ? "bg-amber-600 text-white"
                                  : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                              }`}
                            >
                              {initial}
                            </div>
                            <div className="truncate min-w-0">
                              <p className="truncate text-[11.5px] leading-tight">{name}</p>
                              <p className="text-[9.5px] text-slate-400 truncate">
                                {emp.designationId?.name || emp.departmentId?.name || emp.employeeCode || emp.email}
                              </p>
                            </div>
                          </div>

                          <div className="flex-shrink-0 ml-1.5">
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center border ${
                                isSelected
                                  ? "bg-amber-600 border-amber-600 text-white"
                                  : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                              }`}
                            >
                              {isSelected && <Check size={10} strokeWidth={3} />}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Footer Actions ────────────────────────────────────────── */}
          <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between bg-white dark:bg-[#0E1726]">
            <div className="text-[11px] text-slate-400 hidden sm:block">
              {form.name ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 size={12} /> Ready to initiate workspace
                </span>
              ) : (
                <span>* Required fields must be completed</span>
              )}
            </div>

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMut.isPending || !form.name.trim()}
                className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {createMut.isPending ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                    Creating Workspace...
                  </>
                ) : (
                  <>
                    <Sparkles size={13} />
                    Create Project Workspace
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
