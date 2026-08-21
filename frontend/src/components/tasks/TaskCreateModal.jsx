import { useState, useMemo, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTaskApi } from "../../api/companyAdminApi";
import { createManagerTaskApi } from "../../api/managerApi";
import { useAuth } from "../../context/AuthContext";
import { 
  X, Calendar, Clock, Upload, Plus, Search, CheckSquare, 
  Sparkles, Layers, Users, Building2, FileText, AlertCircle, 
  Paperclip, Trash2, Check, User, Repeat, Flag, ShieldCheck
} from "lucide-react";
import TaskAttachmentField from "./TaskAttachmentField";

const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const PRIORITIES = [
  { id: "low", label: "Low", icon: "🟢", color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-500/10 border-emerald-500/30", activeBg: "bg-emerald-500 text-white font-bold" },
  { id: "medium", label: "Medium", icon: "🟡", color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-500/10 border-amber-500/30", activeBg: "bg-amber-500 text-slate-950 font-black shadow-xs" },
  { id: "high", label: "High", icon: "🟠", color: "text-orange-700 dark:text-orange-300", bg: "bg-orange-500/10 border-orange-500/30", activeBg: "bg-orange-500 text-white font-bold" },
  { id: "urgent", label: "Urgent", icon: "🔴", color: "text-rose-700 dark:text-rose-300", bg: "bg-rose-500/10 border-rose-500/30", activeBg: "bg-rose-600 text-white font-bold" },
];

export default function TaskCreateModal({ isOpen, onClose, departments = [], employees = [], createTaskFn }) {
  const queryClient = useQueryClient();
  const { user: authUser, hasPermission } = useAuth();

  // Permission Check: Strictly check if Admin granted permission to assign tasks to other staff
  const canAssignOthers = useMemo(() => {
    if (!authUser) return false;
    // Admins, HR and Managers always have full team assignment access
    if (["CompanyAdmin", "SuperAdmin", "HR", "Manager"].includes(authUser.role)) return true;
    
    // For standard Employees, strictly check customized permissions granted by Admin
    const perm = authUser.permissions || {};
    const taskPerm = perm.tasks;

    if (typeof taskPerm === "object" && taskPerm !== null) {
      if (taskPerm.create === true || taskPerm.assign === true) return true;
    } else if (taskPerm === true) {
      return true;
    }

    if (hasPermission && (hasPermission("tasks", "create") || hasPermission("tasks", "assign"))) {
      return true;
    }

    return false;
  }, [authUser, hasPermission]);

  const defaultSelfId = useMemo(() => {
    return authUser?.employeeId?._id || authUser?.employeeId || authUser?._id || authUser?.id || "";
  }, [authUser]);

  const initialForm = {
    title: "",
    description: "",
    departmentId: "",
    assignedTo: canAssignOthers ? [] : (defaultSelfId ? [defaultSelfId] : []),
    priority: "medium",
    repeatEnabled: false,
    repeatType: "daily",
    weeklyDays: [],
    monthlyDates: [],
    startDate: getTodayDateString(),
    endDate: "",
    deadlineTime: "18:00",
    nextFollowUpDate: getTodayDateString(),
    finishDate: "",
    checklist: [],
    attachments: [],
  };

  const [form, setForm] = useState(initialForm);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [newChecklistItem, setNewChecklistItem] = useState("");

  // Initialize/Sync Department & Self Assignment
  useEffect(() => {
    if (isOpen) {
      if (!canAssignOthers) {
        const selfDeptId = authUser?.departmentId?._id || authUser?.departmentId || (departments[0]?._id || departments[0]?.id || "");
        setForm(prev => ({
          ...prev,
          assignedTo: defaultSelfId ? [defaultSelfId] : prev.assignedTo,
          departmentId: prev.departmentId || selfDeptId
        }));
      } else if (departments.length > 0 && !form.departmentId) {
        setForm(prev => ({ ...prev, departmentId: departments[0]._id || departments[0].id }));
      }
    }
  }, [isOpen, canAssignOthers, defaultSelfId, departments]);

  // Filter Employees based on the Selected Department with robust name and ID matching
  const departmentFilteredEmployees = useMemo(() => {
    if (!employees || employees.length === 0) return [];
    if (!form.departmentId || form.departmentId === "all") return employees;

    const targetDeptId = form.departmentId.toString();
    const deptObj = departments.find(d => (d._id || d.id || "").toString() === targetDeptId);
    const targetDeptName = (deptObj?.name || deptObj?.departmentName || "").trim().toLowerCase();

    const filtered = employees.filter(e => {
      // 1. Direct departmentId matching
      const d1 = (e.departmentId?._id || e.departmentId || e.department?._id || e.department || "").toString();
      if (d1 && d1 === targetDeptId) return true;

      // 2. Department name matching
      const empDeptName = (e.departmentId?.name || e.department?.name || (typeof e.department === "string" ? e.department : "")).trim().toLowerCase();
      if (targetDeptName && empDeptName && targetDeptName === empDeptName) return true;

      // 3. Array of departmentIds
      if (Array.isArray(e.departmentIds)) {
        if (e.departmentIds.some(x => (x?._id || x || "").toString() === targetDeptId)) return true;
      }

      // 4. Array of accessibleDepartments
      if (Array.isArray(e.accessibleDepartments)) {
        if (e.accessibleDepartments.some(x => (x?._id || x || "").toString() === targetDeptId)) return true;
      }

      return false;
    });

    return filtered.length > 0 ? filtered : employees;
  }, [employees, departments, form.departmentId]);

  const handleAddChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    setForm(prev => ({
      ...prev,
      checklist: [...prev.checklist, { title: newChecklistItem.trim(), isCompleted: false }]
    }));
    setNewChecklistItem("");
  };

  const handleRemoveChecklistItem = (index) => {
    setForm(prev => ({
      ...prev,
      checklist: prev.checklist.filter((_, i) => i !== index)
    }));
  };

  const mutation = useMutation({
    mutationFn: (data) => {
      if (createTaskFn) return createTaskFn(data);
      const isManager = window.location.pathname.startsWith("/manager");
      return isManager ? createManagerTaskApi(data) : createTaskApi(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["tasks"]);
      queryClient.invalidateQueries(["managerMyTasks"]);
      queryClient.invalidateQueries(["managerTeamTasks"]);
      queryClient.invalidateQueries(["employeeMyTasksPage"]);
      queryClient.invalidateQueries(["employeeDashboardSummary"]);
      handleClose(true);
    },
    onError: (err) => {
      alert(err.response?.data?.message || "Failed to create task");
    }
  });

  const handleClose = (force = false) => {
    if (!force && JSON.stringify(form) !== JSON.stringify(initialForm)) {
      if (!window.confirm("Data has not been saved. Are you sure you want to close?")) {
        return;
      }
    }
    setForm(initialForm);
    onClose();
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => {
      const updated = {
        ...prev,
        [name]: type === "checkbox" ? checked : value
      };
      if (name === "startDate" && (prev.nextFollowUpDate === "" || prev.nextFollowUpDate === prev.startDate)) {
        updated.nextFollowUpDate = value;
      }
      return updated;
    });
  };

  const handleArrayChange = (field, val) => {
    setForm(prev => {
      const arr = [...prev[field]];
      if (arr.includes(val)) {
        return { ...prev, [field]: arr.filter(item => item !== val) };
      } else {
        return { ...prev, [field]: [...arr, val] };
      }
    });
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!form.title || !form.title.trim()) {
      alert("Please enter a task title.");
      return;
    }
    
    const finalDeptId = form.departmentId || (departments[0]?._id || departments[0]?.id || "");

    const assignedList = canAssignOthers 
      ? (Array.isArray(form.assignedTo) && form.assignedTo.length > 0 ? form.assignedTo : (defaultSelfId ? [defaultSelfId] : []))
      : [defaultSelfId];

    if (canAssignOthers && assignedList.length === 0) {
      alert("Please select at least one team member to assign this task to.");
      return;
    }

    const submitData = {
      ...form,
      departmentId: finalDeptId || form.departmentId,
      assignedTo: assignedList,
      assignmentType: !canAssignOthers ? "self" : (assignedList.length > 1 ? "multiple_employees" : "employee")
    };
    if (form.repeatEnabled) {
      delete submitData.endDate;
    }
    mutation.mutate(submitData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-3 sm:p-4 animate-fadeIn font-sans">
      <div className="bg-white dark:bg-[#0A0F18] border border-slate-200 dark:border-slate-800/90 rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl animate-scaleUp text-xs">
        
        {/* ── 1. CLEAN OBSIDIAN HEADER ────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-slate-900 via-[#111A29] to-slate-900 dark:from-[#060A10] dark:via-[#0E1524] dark:to-[#060A10] px-5 py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-md">
              <CheckSquare size={16} className="stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-xs font-black text-white tracking-wide uppercase flex items-center gap-1.5">
                Create New Task
              </h3>
              <p className="text-[10.5px] text-slate-400 font-medium">
                {!canAssignOthers 
                  ? "Create and schedule a personal work task for yourself" 
                  : "Fill in details to assign a task, priority and deadline"}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => handleClose()} 
            className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {/* ── 2. HIGH-DENSITY FORM BODY ──────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 custom-scrollbar text-xs">
          <form id="task-form" onSubmit={onSubmit} className="space-y-3">
            
            {/* ── SEGMENTED SWITCH: REGULAR TASK vs RECURRING TASK ───────────── */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-[#070C14] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner">
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, repeatEnabled: false }))}
                className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  !form.repeatEnabled
                    ? "bg-white dark:bg-[#0E1522] text-slate-900 dark:text-white shadow-md border border-slate-200/80 dark:border-slate-700"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                }`}
              >
                <CheckSquare size={13} className={!form.repeatEnabled ? "text-amber-500" : "text-slate-400"} />
                <span>Regular Task (One-Time)</span>
              </button>

              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, repeatEnabled: true }))}
                className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  form.repeatEnabled
                    ? "bg-white dark:bg-[#0E1522] text-slate-900 dark:text-white shadow-md border border-slate-200/80 dark:border-slate-700"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                }`}
              >
                <Repeat size={13} className={form.repeatEnabled ? "text-amber-500" : "text-slate-400"} />
                <span>Recurring Task (Routine)</span>
              </button>
            </div>

            {/* Task Title */}
            <div>
              <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Task Title <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <FileText size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  required 
                  type="text" 
                  name="title" 
                  value={form.title} 
                  onChange={handleChange} 
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-[#0E1522] border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30" 
                  placeholder="Enter clear task objective or title..." 
                />
              </div>
            </div>

            {/* Row 2: Department, Assignee & Priority */}
            <div className={`grid grid-cols-1 ${canAssignOthers ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-2.5`}>
              
              {/* Department */}
              <div>
                <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Department <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building2 size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select 
                    name="departmentId" 
                    value={form.departmentId} 
                    onChange={handleChange} 
                    className="w-full pl-7 pr-2 py-1.5 bg-slate-50 dark:bg-[#0E1522] border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 cursor-pointer truncate"
                  >
                    <option value="">All Departments</option>
                    {departments.map(d => (
                      <option key={d._id || d.id} value={d._id || d.id}>{d.name || d.departmentName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Assignee Picker (Only visible when user has assignment permission) */}
              {canAssignOthers && (
                <div className="relative">
                  <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Assign Staff ({departmentFilteredEmployees.length})
                  </label>
                  <div 
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-[#0E1522] border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-900 dark:text-white flex items-center justify-between cursor-pointer shadow-2xs"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  >
                    <span className="truncate flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                      <Users size={12} className="text-slate-400 shrink-0" />
                      {form.assignedTo.length === 0 ? "Select staff..." : `${form.assignedTo.length} assigned`}
                    </span>
                    <span className="text-[9px] text-amber-500 font-bold ml-1">▼</span>
                  </div>

                  {isDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
                      <div className="absolute z-20 w-64 right-0 mt-1 bg-white dark:bg-[#0E1522] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden animate-scaleUp">
                        <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center gap-1.5">
                          <Search size={12} className="text-slate-400" />
                          <input 
                            type="text" 
                            placeholder="Search employee..." 
                            className="w-full bg-transparent text-xs focus:outline-none text-slate-900 dark:text-white"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            autoFocus
                          />
                        </div>
                        
                        <div className="max-h-40 overflow-y-auto p-1.5 custom-scrollbar text-xs divide-y divide-slate-100 dark:divide-slate-800/60">
                          {departmentFilteredEmployees.length > 0 && (
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 p-1.5 rounded-lg transition-colors font-bold text-amber-600 dark:text-amber-400">
                              <input 
                                type="checkbox" 
                                className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                                checked={
                                  departmentFilteredEmployees.length > 0 &&
                                  departmentFilteredEmployees.every(e => form.assignedTo.includes(e._id || e.id || e.userId?._id))
                                }
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setForm(prev => ({ ...prev, assignedTo: departmentFilteredEmployees.map(emp => emp._id || emp.id || emp.userId?._id) }));
                                  } else {
                                    setForm(prev => ({ ...prev, assignedTo: [] }));
                                  }
                                }}
                              />
                              <span>Select All ({departmentFilteredEmployees.length})</span>
                            </label>
                          )}

                          {departmentFilteredEmployees
                            .filter(e => `${e.firstName || e.name || ''} ${e.lastName || ''}`.toLowerCase().includes(searchTerm.toLowerCase()))
                            .map(e => {
                              const empId = e._id || e.id || e.userId?._id;
                              const isChecked = form.assignedTo.includes(empId);
                              const name = e.fullName || `${e.firstName || ''} ${e.lastName || ''}` || e.name || 'Staff';
                              return (
                                <label key={empId} className="flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 p-1.5 rounded-lg transition-colors">
                                  <div className="flex items-center gap-1.5 truncate">
                                    <input 
                                      type="checkbox" 
                                      className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                                      checked={isChecked}
                                      onChange={(ev) => {
                                        if (ev.target.checked) {
                                          setForm(prev => ({ ...prev, assignedTo: [...prev.assignedTo, empId] }));
                                        } else {
                                          setForm(prev => ({ ...prev, assignedTo: prev.assignedTo.filter(id => id !== empId) }));
                                        }
                                      }}
                                    />
                                    <span className="text-slate-800 dark:text-slate-200 truncate">{name}</span>
                                  </div>
                                  {isChecked && <Check size={11} className="text-amber-500 stroke-[3]" />}
                                </label>
                              );
                            })}

                          {departmentFilteredEmployees.length === 0 && (
                            <div className="p-3 text-center text-slate-400 text-[11px] italic">
                              No employees found in this department.
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Priority Pills */}
              <div>
                <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Priority
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {PRIORITIES.map(p => {
                    const isSel = form.priority === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, priority: p.id }))}
                        className={`py-1.5 px-1 rounded-xl border text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer ${
                          isSel
                            ? `${p.activeBg} shadow-2xs`
                            : "bg-slate-50 dark:bg-[#0E1522] border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        }`}
                        title={p.label}
                      >
                        <span>{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Description */}
            <div>
              <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Description / Instructions
              </label>
              <textarea 
                name="description" 
                rows={2}
                value={form.description} 
                onChange={handleChange} 
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-[#0E1522] border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 resize-none" 
                placeholder="Enter details or task guidelines..." 
              />
            </div>

            {/* ── TIMELINE: REGULAR vs RECURRING MODE ──────────────────────── */}
            {!form.repeatEnabled ? (
              /* Regular Timeline (Start Date, Due Date & Next Follow-Up Date) */
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      required 
                      type="date" 
                      name="startDate" 
                      value={form.startDate} 
                      onChange={handleChange} 
                      className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 dark:bg-[#0E1522] border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-bold text-slate-900 dark:text-white font-mono" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Due Date / Deadline <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Clock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      required 
                      type="date" 
                      name="endDate" 
                      value={form.endDate} 
                      onChange={handleChange} 
                      className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 dark:bg-[#0E1522] border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-bold text-slate-900 dark:text-white font-mono" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Next Follow-up Date
                  </label>
                  <div className="relative">
                    <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="date" 
                      name="nextFollowUpDate" 
                      value={form.nextFollowUpDate} 
                      onChange={handleChange} 
                      className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 dark:bg-[#0E1522] border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-bold text-slate-900 dark:text-white font-mono" 
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Recurring Timeline Configuration */
              <div className="p-3 bg-slate-50 dark:bg-[#0E1522] border border-amber-500/30 rounded-2xl space-y-2.5 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <Repeat size={12} />
                    Recurring Routine Schedule
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  {/* Frequency */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Frequency
                    </label>
                    <select 
                      name="repeatType" 
                      value={form.repeatType} 
                      onChange={handleChange} 
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-[#080D14] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Start Date <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      required 
                      type="date" 
                      name="startDate" 
                      value={form.startDate} 
                      onChange={handleChange} 
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-[#080D14] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white font-mono" 
                    />
                  </div>

                  {/* Finish Date */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Finish Date <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      required 
                      type="date" 
                      name="finishDate" 
                      value={form.finishDate} 
                      onChange={handleChange} 
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-[#080D14] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white font-mono" 
                    />
                  </div>

                  {/* Next Follow-up Date for Recurring */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Follow-up Date
                    </label>
                    <input 
                      type="date" 
                      name="nextFollowUpDate" 
                      value={form.nextFollowUpDate} 
                      onChange={handleChange} 
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-[#080D14] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white font-mono" 
                    />
                  </div>
                </div>

                {/* If Weekly: Day Pills */}
                {form.repeatType === "weekly" && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                      Select Days
                    </label>
                    <div className="flex gap-1 flex-wrap">
                      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => {
                        const isDaySel = form.weeklyDays.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => handleArrayChange("weeklyDays", day)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                              isDaySel
                                ? "bg-amber-500 text-slate-950 border-amber-500 font-black shadow-2xs"
                                : "bg-white dark:bg-[#080D14] border-slate-200 dark:border-slate-700 text-slate-500"
                            }`}
                          >
                            {day.slice(0, 3)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* If Monthly: Date Picker */}
                {form.repeatType === "monthly" && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                        Select Month Dates
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const allDates = Array.from({ length: 31 }, (_, i) => i + 1);
                          if (form.monthlyDates.length === 31) {
                            setForm(prev => ({ ...prev, monthlyDates: [] }));
                          } else {
                            setForm(prev => ({ ...prev, monthlyDates: allDates }));
                          }
                        }}
                        className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                      >
                        {form.monthlyDates.length === 31 ? "Clear All" : "Select All"}
                      </button>
                    </div>
                    <div className="flex gap-1 flex-wrap max-h-20 overflow-y-auto p-1 bg-white dark:bg-[#080D14] border border-slate-200 dark:border-slate-700 rounded-xl">
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(date => {
                        const isDateSel = form.monthlyDates.includes(date);
                        return (
                          <button
                            key={date}
                            type="button"
                            onClick={() => handleArrayChange("monthlyDates", date)}
                            className={`w-6 h-6 rounded-md text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer ${
                              isDateSel
                                ? "bg-amber-500 text-slate-950 font-black"
                                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                            }`}
                          >
                            {date}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Row 5: Checklist Steps */}
            <div className="p-3 bg-slate-50 dark:bg-[#0E1522] border border-slate-200/80 dark:border-slate-800/90 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <CheckSquare size={12} className="text-amber-500" />
                  Checklist Steps ({form.checklist.length})
                </span>
              </div>

              {/* Add checklist input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  placeholder="Add actionable checklist step..."
                  className="flex-1 px-3 py-1.5 bg-white dark:bg-[#080D14] border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddChecklistItem();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddChecklistItem}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs cursor-pointer shrink-0 transition-all shadow-2xs"
                >
                  Add Step
                </button>
              </div>

              {/* Checklist items list */}
              {form.checklist.length > 0 && (
                <div className="space-y-1 max-h-28 overflow-y-auto custom-scrollbar pt-0.5">
                  {form.checklist.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white dark:bg-[#080D14] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px]">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{item.title}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveChecklistItem(idx)}
                        className="text-rose-500 hover:text-rose-700 font-bold text-[10px] ml-2 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Row 6: Attachments */}
            <div>
              <TaskAttachmentField
                attachments={form.attachments}
                onChange={(attachments) => setForm((prev) => ({ ...prev, attachments }))}
                compact={true}
              />
            </div>
            
          </form>
        </div>

        {/* ── 3. MODAL ACTION FOOTER ───────────────────────────────────────── */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#070B12] flex items-center justify-end gap-2.5 shrink-0">
          <button 
            type="button" 
            onClick={() => handleClose()} 
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700/80 font-extrabold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="task-form" 
            disabled={mutation.isPending} 
            className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs rounded-xl shadow-md shadow-amber-600/20 flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
          >
            <Sparkles size={13} />
            <span>{mutation.isPending ? "Saving Task..." : (!canAssignOthers ? "Create My Task" : "Save & Create Task")}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
