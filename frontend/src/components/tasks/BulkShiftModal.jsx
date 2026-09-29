import { useState, useMemo, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bulkShiftTasksApi } from "../../api/companyAdminApi";
import { X, ArrowRightLeft, User, Search, CheckSquare, Square, AlertCircle, CheckCircle2 } from "lucide-react";

export default function BulkShiftModal({
  isOpen,
  onClose,
  selectedTaskIds = [],
  allTasks = [],
  employees = [],
  onSuccess
}) {
  const queryClient = useQueryClient();
  const [targetTaskIds, setTargetTaskIds] = useState([]);
  const [newAssigneeId, setNewAssigneeId] = useState("");
  const [shiftReason, setShiftReason] = useState("");
  const [taskSearch, setTaskSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Sync targetTaskIds whenever modal opens or selectedTaskIds changes
  useEffect(() => {
    if (isOpen) {
      setTargetTaskIds(selectedTaskIds);
      setNewAssigneeId("");
      setShiftReason("");
      setTaskSearch("");
      setErrorMessage("");
    }
  }, [isOpen, selectedTaskIds]);

  // Group employees by department for better UX
  const groupedEmployees = useMemo(() => {
    const groups = {};
    employees.forEach(emp => {
      const deptName = emp.departmentId?.name || emp.department?.name || (typeof emp.department === "string" ? emp.department : "") || "General / Other";
      if (!groups[deptName]) groups[deptName] = [];
      groups[deptName].push(emp);
    });
    // Sort employees alphabetically A-Z inside each department
    Object.keys(groups).forEach(dept => {
      groups[dept].sort((a, b) => {
        const nameA = (a.fullName || a.name || `${a.firstName || ""} ${a.lastName || ""}`).trim();
        const nameB = (b.fullName || b.name || `${b.firstName || ""} ${b.lastName || ""}`).trim();
        return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
      });
    });
    return groups;
  }, [employees]);

  // Filter tasks for task selector
  const visibleTasks = useMemo(() => {
    if (!taskSearch.trim()) return allTasks;
    const q = taskSearch.toLowerCase();
    return allTasks.filter(t =>
      (t.title && t.title.toLowerCase().includes(q)) ||
      (t.taskId && t.taskId.toLowerCase().includes(q))
    );
  }, [allTasks, taskSearch]);

  const toggleTaskSelection = (id) => {
    setTargetTaskIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAllVisible = () => {
    const visibleIds = visibleTasks.map(t => t._id);
    const allSelected = visibleIds.every(id => targetTaskIds.includes(id));
    if (allSelected) {
      setTargetTaskIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setTargetTaskIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const shiftMutation = useMutation({
    mutationFn: (payload) => bulkShiftTasksApi(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries(["tasks"]);
      queryClient.invalidateQueries(["task"]);
      queryClient.invalidateQueries(["dashboard-summary"]);
      onSuccess?.(targetTaskIds.length);
      onClose();
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.message || "Failed to shift tasks";
      setErrorMessage(msg);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (targetTaskIds.length === 0) {
      setErrorMessage("Please select at least 1 task to shift.");
      return;
    }
    if (!newAssigneeId) {
      setErrorMessage("Please select a new team member to assign the tasks to.");
      return;
    }
    if (!shiftReason.trim()) {
      setErrorMessage("Please provide a reason for shifting tasks.");
      return;
    }

    shiftMutation.mutate({
      taskIds: targetTaskIds,
      newAssigneeId,
      shiftReason: shiftReason.trim()
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ArrowRightLeft size={16} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                Shift Multiple Tasks
              </h2>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Reassign selected tasks to a new team member
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Error Banner */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-semibold">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Selected Tasks Badge & List */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span>Select Tasks to Shift</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50">
                  {targetTaskIds.length} selected
                </span>
              </label>
              {visibleTasks.length > 0 && (
                <button
                  type="button"
                  onClick={selectAllVisible}
                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  {visibleTasks.every(t => targetTaskIds.includes(t._id)) ? "Deselect All" : "Select All"}
                </button>
              )}
            </div>

            {/* Task Search Bar */}
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={taskSearch}
                onChange={e => setTaskSearch(e.target.value)}
                placeholder="Filter tasks by title or ID..."
                className="w-full pl-7 pr-3 py-1.5 h-8 bg-slate-50 dark:bg-[#0D1321] border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Tasks Scroll Box */}
            <div className="max-h-36 overflow-y-auto border border-slate-200 dark:border-slate-700/80 rounded-xl divide-y divide-slate-100 dark:divide-slate-800/80 bg-slate-50/50 dark:bg-[#0D1321]/50 hide-scrollbar p-1">
              {visibleTasks.length === 0 ? (
                <p className="text-center py-4 text-slate-400 text-xs">No matching tasks found</p>
              ) : (
                visibleTasks.map(t => {
                  const isChecked = targetTaskIds.includes(t._id);
                  return (
                    <div
                      key={t._id}
                      onClick={() => toggleTaskSelection(t._id)}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                        isChecked
                          ? "bg-blue-50/80 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 font-semibold"
                          : "hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
                      ) : (
                        <Square size={14} className="text-slate-400 shrink-0" />
                      )}
                      <span className="font-mono text-[10px] font-bold text-slate-500 shrink-0">
                        {t.taskId || "TSK"}
                      </span>
                      <span className="truncate flex-1 text-xs">{t.title}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* New Assignee Select */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <User size={12} className="text-blue-600 dark:text-blue-400" />
              <span>Select New Assignee *</span>
            </label>
            <div className="relative">
              <select
                required
                value={newAssigneeId}
                onChange={e => setNewAssigneeId(e.target.value)}
                className="w-full text-xs h-9 pl-3 pr-8 bg-slate-50 dark:bg-[#0D1321] border border-slate-200 dark:border-slate-700/80 rounded-lg outline-none cursor-pointer text-slate-900 dark:text-slate-100 font-semibold focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
              >
                <option value="">Select Team Member</option>
                {Object.keys(groupedEmployees).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })).map(dept => (
                  <optgroup key={dept} label={dept}>
                    {groupedEmployees[dept].map(emp => {
                      const name = emp.fullName || emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.email;
                      const code = emp.employeeCode ? ` (${emp.employeeCode})` : "";
                      return (
                        <option key={emp._id} value={emp._id}>
                          {name}{code}
                        </option>
                      );
                    })}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          {/* Shift Reason */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Reason for Shifting *
            </label>
            <textarea
              required
              rows={2}
              value={shiftReason}
              onChange={e => setShiftReason(e.target.value)}
              placeholder="e.g. Reassigned due to employee leave / balancing team deliverables"
              className="w-full p-2.5 bg-slate-50 dark:bg-[#0D1321] border border-slate-200 dark:border-slate-700/80 rounded-lg outline-none text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 h-8 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={shiftMutation.isPending || targetTaskIds.length === 0}
              className="flex items-center gap-1.5 px-4 h-8 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {shiftMutation.isPending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Shifting...</span>
                </>
              ) : (
                <>
                  <ArrowRightLeft size={13} strokeWidth={2.5} />
                  <span>Shift {targetTaskIds.length > 0 ? `${targetTaskIds.length} Tasks` : "Tasks"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
