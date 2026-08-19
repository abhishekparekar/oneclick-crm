import { useState, useMemo, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTaskApi } from "../../api/companyAdminApi";
import { createManagerTaskApi } from "../../api/managerApi";
import { X, Calendar, Clock, Upload, Plus, Search } from "lucide-react";
import TaskAttachmentField from "./TaskAttachmentField";

const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function TaskCreateModal({ isOpen, onClose, departments = [], employees = [] }) {
  const queryClient = useQueryClient();

  const initialForm = {
    title: "",
    description: "",
    departmentId: "",
    assignedTo: [],
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

  const availableDepartments = useMemo(() => {
    if (!form.assignedTo || form.assignedTo.length === 0) {
      return departments;
    }

    const selectedEmps = employees.filter(emp => form.assignedTo.includes(emp._id));
    const empDeptsList = selectedEmps.map(emp => {
      const depts = new Set();
      if (emp.departmentId) {
        depts.add(emp.departmentId._id || emp.departmentId);
      }
      if (emp.departmentIds && emp.departmentIds.length > 0) {
        emp.departmentIds.forEach(d => depts.add(d._id || d));
      }
      if (emp.accessibleDepartments && emp.accessibleDepartments.length > 0) {
        emp.accessibleDepartments.forEach(d => depts.add(d._id || d));
      }
      return depts;
    });

    if (empDeptsList.length === 0) return departments;

    let commonDepts = empDeptsList[0];
    for (let i = 1; i < empDeptsList.length; i++) {
      const nextDepts = empDeptsList[i];
      commonDepts = new Set([...commonDepts].filter(x => nextDepts.has(x)));
    }

    const commonDeptsStrings = new Set([...commonDepts].map(id => id.toString()));
    return departments.filter(d => commonDeptsStrings.has(d._id.toString()));
  }, [form.assignedTo, employees, departments]);

  useEffect(() => {
    if (form.assignedTo.length === 0) return;

    const currentAvailable = availableDepartments;
    if (currentAvailable.length > 0) {
      const isCurrentValid = currentAvailable.some(d => d._id === form.departmentId);
      if (!isCurrentValid) {
        setForm(prev => ({ ...prev, departmentId: currentAvailable[0]._id }));
      }
    } else {
      setForm(prev => ({ ...prev, departmentId: "" }));
    }
  }, [form.assignedTo, availableDepartments]);

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
      const isManager = window.location.pathname.startsWith("/manager");
      return isManager ? createManagerTaskApi(data) : createTaskApi(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["tasks"]);
      queryClient.invalidateQueries(["managerMyTasks"]);
      queryClient.invalidateQueries(["managerTeamTasks"]);
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
    if (!form.departmentId) {
      alert("Please select a department for this task.");
      return;
    }
    const submitData = {
      ...form,
      assignedTo: Array.isArray(form.assignedTo) ? form.assignedTo : (form.assignedTo ? [form.assignedTo] : []),
      assignmentType: form.assignedTo && form.assignedTo.length > 1 ? "multiple_employees" : "employee"
    };
    if (form.repeatEnabled) {
      delete submitData.endDate;
    }
    mutation.mutate(submitData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4">
      <div className="bg-ca-surface rounded-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-theme-4/20 flex items-center justify-between bg-theme-4/10 dark:bg-ca-bg">
          <h2 className="text-lg sm:text-xl font-bold text-ca-text">Create New Task</h2>
          <button onClick={() => handleClose()} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <X size={20} className="text-ca-text-secondary" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          <form id="task-form" onSubmit={onSubmit} className="space-y-4 sm:space-y-5">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div className="col-span-2">
                <label className="label-text">Task Title *</label>
                <input required type="text" name="title" value={form.title} onChange={handleChange} className="input-field" placeholder="Enter task title" />
              </div>

              <div className="col-span-2">
                <label className="label-text">Description</label>
                <textarea name="description" value={form.description} onChange={handleChange} className="input-field h-24 resize-none" placeholder="Task details..." />
              </div>

              <div>
                <label className="label-text">Filter by Department</label>
                <select name="departmentId" value={form.departmentId} onChange={handleChange} className="input-field">
                  {form.assignedTo.length === 0 && <option value="">All Departments</option>}
                  {availableDepartments.map(d => (
                    <option key={d._id} value={d._id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <label className="label-text">Assign To *</label>
                <div 
                  className="input-field flex items-center justify-between cursor-pointer"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <span className="truncate text-base">
                    {form.assignedTo.length === 0 ? "Select Team Members" : `${form.assignedTo.length} member(s) selected`}
                  </span>
                  <div className="text-ca-text-secondary font-bold ml-2">▼</div>
                </div>

                {isDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
                    <div className="absolute z-20 w-full mt-1 bg-ca-surface border border-ca-border rounded-xl shadow-xl overflow-hidden">
                      <div className="p-2 border-b border-ca-border bg-ca-bg flex items-center space-x-2">
                        <Search size={16} className="text-ca-text-secondary" />
                        <input 
                          type="text" 
                          placeholder="Search employees..." 
                          className="w-full bg-transparent text-base focus:outline-none text-ca-text-secondary"
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                        />
                      </div>
                      
                      <div className="max-h-48 overflow-y-auto p-2 custom-scrollbar">
                        <label className="flex items-center space-x-3 cursor-pointer hover:bg-ca-hover p-2 rounded-lg transition-colors border-b border-ca-border mb-1">
                          <input 
                            type="checkbox" 
                            className="rounded text-ca-primary focus:ring-blue-500 w-4 h-4 cursor-pointer"
                            checked={
                              employees.filter(e => !form.departmentId || (e.departmentId && (e.departmentId._id === form.departmentId || e.departmentId === form.departmentId))).length > 0 &&
                              employees.filter(e => !form.departmentId || (e.departmentId && (e.departmentId._id === form.departmentId || e.departmentId === form.departmentId))).every(e => form.assignedTo.includes(e._id))
                            }
                            onChange={(e) => {
                              const filtered = employees.filter(emp => !form.departmentId || (emp.departmentId && (emp.departmentId._id === form.departmentId || emp.departmentId === form.departmentId)));
                              if (e.target.checked) {
                                setForm(prev => ({ ...prev, assignedTo: filtered.map(emp => emp._id) }));
                              } else {
                                setForm(prev => ({ ...prev, assignedTo: [] }));
                              }
                            }}
                          />
                          <span className="text-base font-bold text-blue-700">Select All</span>
                        </label>

                        {employees
                          .filter(e => !form.departmentId || (e.departmentId && (e.departmentId._id === form.departmentId || e.departmentId === form.departmentId)))
                          .filter(e => `${e.firstName} ${e.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()))
                          .map(e => (
                            <label key={e._id} className="flex items-center space-x-3 cursor-pointer hover:bg-ca-hover p-2 rounded-lg transition-colors">
                              <input 
                                type="checkbox" 
                                className="rounded text-ca-primary focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                checked={form.assignedTo.includes(e._id)}
                                onChange={(ev) => {
                                  if (ev.target.checked) {
                                    setForm(prev => ({ ...prev, assignedTo: [...prev.assignedTo, e._id] }));
                                  } else {
                                    setForm(prev => ({ ...prev, assignedTo: prev.assignedTo.filter(id => id !== e._id) }));
                                  }
                                }}
                              />
                              <span className="text-base font-medium text-ca-text-secondary">{e.firstName} {e.lastName}</span>
                            </label>
                        ))}
                        {employees
                          .filter(e => !form.departmentId || (e.departmentId && (e.departmentId._id === form.departmentId || e.departmentId === form.departmentId)))
                          .filter(e => `${e.firstName} ${e.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                          <div className="text-sm text-ca-text-secondary text-center py-4">No employees found.</div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="label-text">Start Date *</label>
                <input required type="date" name="startDate" value={form.startDate} onChange={handleChange} className="input-field" />
              </div>

              {!form.repeatEnabled && (
                <div>
                  <label className="label-text">End Date / Deadline *</label>
                  <input required={!form.repeatEnabled} type="date" name="endDate" value={form.endDate} onChange={handleChange} className="input-field" />
                </div>
              )}
              
              <div>
                <label className="label-text">Next Follow-up Date</label>
                <input type="date" name="nextFollowUpDate" value={form.nextFollowUpDate} onChange={handleChange} className="input-field" />
              </div>

              <div>
                <label className="label-text">Priority</label>
                <select name="priority" value={form.priority} onChange={handleChange} className="input-field">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <TaskAttachmentField
              attachments={form.attachments}
              onChange={(attachments) => setForm((prev) => ({ ...prev, attachments }))}
            />

            {/* Checklist Section */}
            <div className="border border-ca-border rounded-xl p-4 bg-ca-bg mt-4">
              <h3 className="text-base font-bold text-ca-text mb-1">Task Checklist (Points)</h3>
              <p className="text-sm text-ca-text-secondary mb-3">Add specific checklist items for this task</p>
              
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  placeholder="Enter checklist item..."
                  className="input-field flex-1"
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
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Add
                </button>
              </div>

              {form.checklist && form.checklist.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {form.checklist.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-ca-surface p-2 rounded-lg border border-ca-border">
                      <span className="text-sm font-medium text-ca-text-secondary">{item.title}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveChecklistItem(idx)}
                        className="text-ca-primary hover:text-red-700 text-xs font-semibold px-2 py-1 rounded hover:bg-ca-primary-light transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recurring Section */}
            <div className="border border-ca-border rounded-xl p-4 bg-ca-bg mt-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-ca-text">Recurring Task</h3>
                  <p className="text-sm text-ca-text-secondary">Automatically generate this task on a schedule</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" name="repeatEnabled" checked={form.repeatEnabled} onChange={handleChange} className="sr-only peer" />
                  <div className="w-11 h-6 bg-ca-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4ade80]"></div>
                </label>
              </div>

              {form.repeatEnabled && (
                <div className="space-y-4 pt-4 border-t border-ca-border">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label-text">Repeat Type</label>
                      <select name="repeatType" value={form.repeatType} onChange={handleChange} className="input-field">
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    <div>
                      <label className="label-text">Stop Generating On (Finish Date)</label>
                      <input required type="date" name="finishDate" value={form.finishDate} onChange={handleChange} className="input-field" />
                    </div>
                  </div>

                  {form.repeatType === "weekly" && (
                    <div>
                      <label className="label-text">Select Days</label>
                      <div className="flex gap-2 flex-wrap">
                        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => handleArrayChange("weeklyDays", day)}
                            className={`px-3 py-1 text-sm rounded-full border ${form.weeklyDays.includes(day) ? "bg-[#365314] text-white border-[#365314]" : "bg-ca-surface text-ca-text-secondary border-ca-border"}`}
                          >
                            {day.slice(0,3)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {form.repeatType === "monthly" && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="label-text mb-0">Select Dates</label>
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
                          className="text-xs font-semibold text-[#365314] hover:underline"
                        >
                          {form.monthlyDates.length === 31 ? "Clear All" : "Select All"}
                        </button>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(date => (
                          <button
                            key={date}
                            type="button"
                            onClick={() => handleArrayChange("monthlyDates", date)}
                            className={`w-8 h-8 flex items-center justify-center text-sm rounded-full border transition-all ${
                              form.monthlyDates.includes(date)
                                ? "bg-[#365314] text-white border-[#365314] font-bold"
                                : "bg-ca-surface text-ca-text-secondary border-ca-border hover:border-slate-400"
                            }`}
                          >
                            {date}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-ca-border flex items-center justify-end space-x-3 bg-ca-surface">
          <button type="button" onClick={() => handleClose()} className="btn-outline">Cancel</button>
          <button type="submit" form="task-form" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? "Saving..." : "Create Task"}
          </button>
        </div>
      </div>
    </div>
  );
}
