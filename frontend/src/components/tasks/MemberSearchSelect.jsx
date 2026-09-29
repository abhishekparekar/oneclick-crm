import { useState, useMemo, useRef, useEffect } from "react";
import { User, Search, Check, ChevronDown, X, Building2 } from "lucide-react";

export default function MemberSearchSelect({
  value,
  onChange,
  employees = [],
  departments = [],
  departmentId = "",
  theme = "blue", // "blue" | "teal"
  placeholder = "All Members",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      // Auto-focus search input when opened
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  // Reset search when closed
  useEffect(() => {
    if (!isOpen) setSearch("");
  }, [isOpen]);

  // Find selected employee
  const selectedEmp = useMemo(() => {
    if (!value) return null;
    return employees.find((e) => String(e._id || e.id) === String(value));
  }, [employees, value]);

  // Filter employees by active department if set
  const departmentScopedEmployees = useMemo(() => {
    if (!departmentId) return employees;
    return employees.filter((e) => {
      const dId = e.departmentId?._id || e.departmentId?.id || e.departmentId;
      return String(dId) === String(departmentId);
    });
  }, [employees, departmentId]);

  // Filter by user search query
  const filteredList = useMemo(() => {
    let list = [...departmentScopedEmployees];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e) => {
        const name = (
          e.fullName ||
          e.name ||
          `${e.firstName || ""} ${e.lastName || ""}`
        ).toLowerCase();
        const code = (e.employeeCode || "").toLowerCase();
        const dept = (
          e.departmentId?.name ||
          e.department?.name ||
          e.departmentName ||
          e.department ||
          ""
        ).toLowerCase();
        return name.includes(q) || code.includes(q) || dept.includes(q);
      });
    }
    return list.sort((a, b) => {
      const nameA = (a.fullName || a.name || `${a.firstName || ""} ${a.lastName || ""}`).trim();
      const nameB = (b.fullName || b.name || `${b.firstName || ""} ${b.lastName || ""}`).trim();
      return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
    });
  }, [departmentScopedEmployees, search]);

  const activeBorder =
    theme === "teal"
      ? "border-teal-500 ring-1 ring-teal-500/25"
      : "border-blue-500 ring-1 ring-blue-500/25";
  const activeText =
    theme === "teal"
      ? "text-teal-700 dark:text-teal-300 font-bold"
      : "text-blue-700 dark:text-blue-300 font-bold";
  const activeBg =
    theme === "teal"
      ? "bg-teal-50 dark:bg-teal-950/40"
      : "bg-blue-50 dark:bg-blue-950/40";
  const focusBorder =
    theme === "teal" ? "focus:border-teal-500" : "focus:border-blue-500";
  const highlightTag =
    theme === "teal"
      ? "bg-teal-500/15 text-teal-700 dark:text-teal-300"
      : "bg-blue-500/15 text-blue-700 dark:text-blue-300";

  const selectedEmpDept = useMemo(() => {
    if (!selectedEmp) return "";
    return (
      selectedEmp.departmentId?.name ||
      selectedEmp.department?.name ||
      selectedEmp.departmentName ||
      selectedEmp.department ||
      departments.find(
        (d) =>
          String(d._id || d.id) ===
          String(selectedEmp.departmentId?._id || selectedEmp.departmentId)
      )?.name ||
      ""
    );
  }, [selectedEmp, departments]);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between text-xs h-8 pl-2.5 pr-2 rounded-lg cursor-pointer transition-all shadow-2xs ${
          value
            ? `${activeBg} ${activeBorder} ${activeText}`
            : "bg-slate-50 dark:bg-[#0D1321] border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 font-medium hover:border-slate-300 dark:hover:border-slate-600"
        }`}
      >
        <div className="flex items-center gap-1.5 truncate pr-1">
          <User
            size={12}
            className={
              value
                ? theme === "teal"
                  ? "text-teal-600"
                  : "text-blue-600"
                : "text-slate-400"
            }
          />
          <span className="truncate">
            {selectedEmp
              ? `${(selectedEmp.fullName || selectedEmp.name || `${selectedEmp.firstName || ""} ${selectedEmp.lastName || ""}`).trim()}${
                  selectedEmpDept ? ` (${selectedEmpDept})` : ""
                }`
              : `${placeholder} (${departmentScopedEmployees.length})`}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {value && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setIsOpen(false);
              }}
              title="Clear member filter"
              className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X size={11} />
            </span>
          )}
          <ChevronDown
            size={12}
            className={`text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* Dropdown Menu with Search Bar */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-72 sm:w-80 bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-2 z-[90] flex flex-col space-y-1.5 animate-fadeIn">
          {/* Search Bar */}
          <div className="relative">
            <Search
              size={12}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search team member..."
              className={`w-full pl-8 pr-7 py-1 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-slate-900 dark:text-white placeholder-slate-400 ${focusBorder} transition-all`}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={11} />
              </button>
            )}
          </div>

          {/* Members List */}
          <div className="max-h-56 overflow-y-auto space-y-0.5 custom-scrollbar pr-0.5">
            {/* "All Members" option */}
            {!search && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors text-left ${
                  !value
                    ? `${activeBg} ${activeText}`
                    : "hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-medium"
                }`}
              >
                <span className="font-bold">
                  {placeholder} ({departmentScopedEmployees.length})
                </span>
                {!value && <Check size={12} className="stroke-[3]" />}
              </button>
            )}

            {filteredList.map((e) => {
              const empId = String(e._id || e.id);
              const isSelected = String(value) === empId;
              const name =
                e.fullName ||
                e.name ||
                `${e.firstName || ""} ${e.lastName || ""}`.trim() ||
                "Member";
              const code = e.employeeCode ? ` (${e.employeeCode})` : "";
              const deptName =
                e.departmentId?.name ||
                e.department?.name ||
                e.departmentName ||
                departments.find(
                  (d) =>
                    String(d._id) ===
                    String(e.departmentId?._id || e.departmentId)
                )?.name ||
                "";

              return (
                <button
                  key={empId}
                  type="button"
                  onClick={() => {
                    onChange(empId);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors text-left ${
                    isSelected
                      ? `${activeBg} ${activeText}`
                      : "hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-medium"
                  }`}
                >
                  <div className="min-w-0 pr-1.5 truncate">
                    <p className="truncate leading-tight font-semibold">
                      {name}
                      <span className="text-[10.5px] text-slate-400 font-mono">
                        {code}
                      </span>
                    </p>
                    {deptName && (
                      <p className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                        <Building2 size={9} />
                        <span>{deptName}</span>
                      </p>
                    )}
                  </div>
                  {isSelected && (
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${highlightTag}`}
                    >
                      <Check size={10} className="stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}

            {filteredList.length === 0 && (
              <div className="py-3 text-center text-slate-400 text-xs">
                No team members found for "{search}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
