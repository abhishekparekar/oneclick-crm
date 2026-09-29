import { useState, useMemo, useRef, useEffect } from "react";
import { Users, ArrowRightLeft, Search, Check, ChevronDown, X, Loader2, User, Building2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { bulkShiftTasksApi } from "../../api/companyAdminApi";

export default function TaskBulkActionBar({
  selectedTaskIds = [],
  onClearSelection,
  onSelectAll,
  onSelectAllVisible,
  totalVisibleTasks = 0,
  visibleTasksCount = 0,
  employees = [],
  onSuccess,
}) {
  const handleSelectAll = onSelectAll || onSelectAllVisible;
  const totalTasks = totalVisibleTasks || visibleTasksCount;
  const [targetAssigneeId, setTargetAssigneeId] = useState("");
  const [shiftReason, setShiftReason] = useState("");
  const [isStaffMenuOpen, setIsStaffMenuOpen] = useState(false);
  const [staffSearch, setStaffSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsStaffMenuOpen(false);
      }
    };
    if (isStaffMenuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isStaffMenuOpen]);

  // Selected employee object
  const selectedEmployee = useMemo(() => {
    return employees.find(
      (e) => String(e._id || e.id) === String(targetAssigneeId)
    );
  }, [employees, targetAssigneeId]);

  // Filtered employees for dropdown (Sorted Alphabetically A to Z)
  const filteredEmployees = useMemo(() => {
    let list = Array.isArray(employees) ? [...employees] : [];
    if (staffSearch.trim()) {
      const q = staffSearch.toLowerCase();
      list = list.filter((emp) => {
        const name = (
          emp.name ||
          emp.fullName ||
          `${emp.firstName || ""} ${emp.lastName || ""}`
        ).toLowerCase();
        const dept = (
          emp.departmentId?.name ||
          emp.department?.name ||
          emp.departmentName ||
          emp.department ||
          ""
        ).toLowerCase();
        return name.includes(q) || dept.includes(q);
      });
    }
    return list.sort((a, b) => {
      const nameA = (a.name || a.fullName || `${a.firstName || ""} ${a.lastName || ""}`).trim();
      const nameB = (b.name || b.fullName || `${b.firstName || ""} ${b.lastName || ""}`).trim();
      return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
    });
  }, [employees, staffSearch]);

  const handleShiftSubmit = async () => {
    if (!targetAssigneeId) {
      toast.error("Please select a team member to shift tasks to");
      setIsStaffMenuOpen(true);
      return;
    }
    if (selectedTaskIds.length === 0) {
      toast.error("No tasks selected");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await bulkShiftTasksApi({
        taskIds: selectedTaskIds,
        newAssigneeId: targetAssigneeId,
        shiftReason: shiftReason.trim(),
      });

      const count = selectedTaskIds.length;
      const targetName =
        selectedEmployee?.fullName ||
        selectedEmployee?.name ||
        "team member";
      toast.success(
        res.data?.message ||
          `Successfully shifted ${count} task${count > 1 ? "s" : ""} to ${targetName}`
      );

      setTargetAssigneeId("");
      setShiftReason("");
      setStaffSearch("");
      setIsStaffMenuOpen(false);

      if (onSuccess) onSuccess();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Failed to shift tasks. Please try again.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (selectedTaskIds.length === 0) return null;

  return (
    <div className="bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 rounded-xl p-2 sm:p-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs shadow-2xs animate-fadeIn">
      {/* Left: Selection summary & batch shortcuts */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 bg-amber-500/20 text-amber-800 dark:text-amber-300 px-2.5 py-1 rounded-lg">
          <Users size={13} className="text-amber-600 dark:text-amber-400" />
          <span className="font-extrabold text-slate-900 dark:text-white">
            {selectedTaskIds.length} tasks selected
          </span>
        </div>

        {totalTasks > selectedTaskIds.length && handleSelectAll && (
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
          >
            Select all {totalTasks}
          </button>
        )}

        {onClearSelection && (
          <button
            type="button"
            onClick={onClearSelection}
            className="text-[11px] font-bold text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-0.5 cursor-pointer ml-1"
          >
            <X size={11} /> Clear
          </button>
        )}
      </div>

      {/* Right: Inline Shift Controls (Lead Style, No Popup) */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Team Member Picker Dropdown */}
        <div className="relative" ref={menuRef}>
          <div className="flex items-center gap-1">
            <span className="text-slate-500 dark:text-slate-400 font-bold text-[11px] hidden sm:inline">
              Shift to:
            </span>
            <button
              type="button"
              onClick={() => setIsStaffMenuOpen((prev) => !prev)}
              className="h-8 px-2.5 bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between gap-2 min-w-[150px] max-w-[220px] shadow-2xs hover:border-amber-500/60 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-1.5 truncate">
                <User size={12} className="text-amber-600 shrink-0" />
                <span className="truncate">
                  {selectedEmployee
                    ? selectedEmployee.fullName ||
                      selectedEmployee.name ||
                      "Selected Staff"
                    : "Select Team Member…"}
                </span>
              </div>
              <ChevronDown
                size={11}
                className={`text-slate-400 transition-transform shrink-0 ${
                  isStaffMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>

          {/* Dropdown Menu */}
          {isStaffMenuOpen && (
            <div className="absolute top-full right-0 sm:left-0 sm:right-auto mt-1 w-64 bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-2 z-50 flex flex-col space-y-1.5 animate-fadeIn">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Target Team Member
                </span>
                {targetAssigneeId && (
                  <button
                    type="button"
                    onClick={() => setTargetAssigneeId("")}
                    className="text-[10px] text-rose-500 hover:text-rose-600 font-bold cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Search Box */}
              {employees.length > 3 && (
                <div className="relative">
                  <Search
                    size={11}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={staffSearch}
                    onChange={(e) => setStaffSearch(e.target.value)}
                    placeholder="Search name or department..."
                    className="w-full pl-6 pr-2 py-1 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-slate-900 dark:text-white focus:border-amber-500"
                  />
                </div>
              )}

              {/* Staff List */}
              <div className="max-h-48 overflow-y-auto space-y-0.5 custom-scrollbar">
                {filteredEmployees.map((emp) => {
                  const empId = String(emp._id || emp.id);
                  const isSelected = String(targetAssigneeId) === empId;
                  const empName =
                    emp.fullName ||
                    emp.name ||
                    `${emp.firstName || ""} ${emp.lastName || ""}`.trim() ||
                    "Member";
                  const dept =
                    emp.departmentId?.name ||
                    emp.department?.name ||
                    emp.departmentName ||
                    emp.department ||
                    "";

                  return (
                    <button
                      key={empId}
                      type="button"
                      onClick={() => {
                        setTargetAssigneeId(empId);
                        setIsStaffMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-colors text-left ${
                        isSelected
                          ? "bg-amber-500/15 text-amber-900 dark:text-amber-200 font-bold"
                          : "hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-medium"
                      }`}
                    >
                      <div className="min-w-0 pr-1 truncate">
                        <p className="truncate leading-tight">{empName}</p>
                        {dept && (
                          <p className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                            <Building2 size={9} />
                            <span>{dept}</span>
                          </p>
                        )}
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center border shrink-0 ${
                          isSelected
                            ? "bg-amber-500 border-amber-500 text-white"
                            : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                        }`}
                      >
                        {isSelected && <Check size={10} strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
                {filteredEmployees.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-2">
                    No team members found.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Optional Shift Reason */}
        <input
          type="text"
          value={shiftReason}
          onChange={(e) => setShiftReason(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleShiftSubmit();
          }}
          placeholder="Shift reason (optional)..."
          className="h-8 px-2.5 bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white outline-none w-36 sm:w-48 placeholder-slate-400 focus:border-amber-500 shadow-2xs"
        />

        {/* Action Button: Shift Tasks */}
        <button
          type="button"
          onClick={handleShiftSubmit}
          disabled={!targetAssigneeId || isSubmitting}
          className="h-8 px-3.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs shrink-0"
        >
          {isSubmitting ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <ArrowRightLeft size={13} />
          )}
          <span>Shift Tasks</span>
        </button>
      </div>
    </div>
  );
}
