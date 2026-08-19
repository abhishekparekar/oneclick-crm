import React, { useState, useEffect, useMemo } from "react";
import api from "../../api/api";
import {
  Search, User, Calculator, Save, CheckCircle2, AlertCircle, ChevronLeft,
  DollarSign, Sparkles, TrendingUp, ShieldAlert, ArrowRight, RefreshCw,
  Layers, Percent, Coins, PieChart as PieIcon
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const getPhotoUrl = (rawPhoto) => {
  if (!rawPhoto) return null;
  return rawPhoto.startsWith("http") || rawPhoto.startsWith("data:")
    ? rawPhoto
    : `${(import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace("/api", "")}${rawPhoto.startsWith("/") ? "" : "/"}${rawPhoto}`;
};

const fmt = (n) => `₹ ${(Number(n) || 0).toLocaleString("en-IN")}`;

const SalaryStructurePage = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [structure, setStructure] = useState({
    monthlyCTC: 0,
    basicSalary: 0,
    hra: 0,
    conveyanceAllowance: 0,
    medicalAllowance: 0,
    specialAllowance: 0,
    otherAllowance: 0,
    pf: 0,
    esi: 0,
    professionalTax: 0,
    tds: 0,
    otherDeductions: 0,
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await api.get("/company/employees?limit=1000");
      if (res.data && res.data.employees) {
        setEmployees(res.data.employees || []);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchSalaryStructure = async (empId) => {
    setLoading(true);
    setMessage({ type: "", text: "" });
    try {
      const res = await api.get(`/payroll/company/salary-structures/${empId}`);
      if (res.data.success && res.data.data) {
        const data = res.data.data;
        setStructure({
          monthlyCTC: data.monthlyCTC || 0,
          basicSalary: data.basicSalary || 0,
          hra: data.hra || 0,
          conveyanceAllowance: data.conveyanceAllowance || 0,
          medicalAllowance: data.medicalAllowance || 0,
          specialAllowance: data.specialAllowance || 0,
          otherAllowance: data.otherAllowance || data.allowances || 0,
          pf: data.pf || 0,
          esi: data.esi || 0,
          professionalTax: data.professionalTax || 0,
          tds: data.tds || 0,
          otherDeductions: data.otherDeductions || data.deductions || 0,
        });
        if (data.isLegacy) {
          setMessage({ type: "warning", text: "Loaded legacy salary details. Please save to create a formal salary structure." });
        }
      } else {
        setStructure({
          monthlyCTC: 0, basicSalary: 0, hra: 0, conveyanceAllowance: 0, medicalAllowance: 0, specialAllowance: 0, otherAllowance: 0,
          pf: 0, esi: 0, professionalTax: 0, tds: 0, otherDeductions: 0
        });
      }
    } catch (error) {
      console.error("Error fetching salary structure:", error);
      setStructure({
        monthlyCTC: 0, basicSalary: 0, hra: 0, conveyanceAllowance: 0, medicalAllowance: 0, specialAllowance: 0, otherAllowance: 0,
        pf: 0, esi: 0, professionalTax: 0, tds: 0, otherDeductions: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEmployee = (emp) => {
    setSelectedEmp(emp);
    fetchSalaryStructure(emp._id);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setStructure(prev => ({
      ...prev,
      [name]: parseFloat(value) || 0
    }));
  };

  // Quick Auto-Distribute Standard Formula from Monthly CTC
  const handleAutoDistribute = () => {
    const ctc = structure.monthlyCTC;
    if (!ctc || ctc <= 0) {
      toast.error("Please enter a Monthly CTC amount first!");
      return;
    }
    // Standard Indian Payroll Split:
    // Basic: 50% of CTC
    // HRA: 40% of Basic (20% of CTC)
    // Conveyance: 1600 (fixed) or 5%
    // Medical: 1250 (fixed) or 5%
    // PF: 12% of Basic
    // PT: 200 (fixed)
    // Special: balance gross
    const basic = Math.round(ctc * 0.50);
    const hra = Math.round(basic * 0.40);
    const conveyance = 1600;
    const medical = 1250;
    const pf = Math.round(basic * 0.12);
    const pt = 200;
    const grossTarget = ctc; // assuming CTC approx gross
    const allocated = basic + hra + conveyance + medical;
    const special = Math.max(0, grossTarget - allocated);

    setStructure(prev => ({
      ...prev,
      basicSalary: basic,
      hra: hra,
      conveyanceAllowance: conveyance,
      medicalAllowance: medical,
      specialAllowance: special,
      otherAllowance: 0,
      pf: pf,
      esi: 0,
      professionalTax: pt,
      tds: 0,
      otherDeductions: 0,
    }));
    toast.success("Standard salary breakdown generated!");
  };

  const calculateGross = () => {
    return (
      (structure.basicSalary || 0) +
      (structure.hra || 0) +
      (structure.conveyanceAllowance || 0) +
      (structure.medicalAllowance || 0) +
      (structure.specialAllowance || 0) +
      (structure.otherAllowance || 0)
    );
  };

  const calculateTotalDeductions = () => {
    return (
      (structure.pf || 0) +
      (structure.esi || 0) +
      (structure.professionalTax || 0) +
      (structure.tds || 0) +
      (structure.otherDeductions || 0)
    );
  };

  const calculateNet = () => {
    return calculateGross() - calculateTotalDeductions();
  };

  const handleSave = async () => {
    if (!selectedEmp) return;
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const payload = {
        employeeId: selectedEmp._id,
        ...structure
      };
      const res = await api.post("/payroll/company/salary-structures", payload);
      if (res.data.success) {
        setMessage({ type: "success", text: "Salary structure updated successfully!" });
        toast.success("Salary structure saved!");
      }
    } catch (error) {
      console.error("Error saving salary structure:", error);
      setMessage({ type: "error", text: "Failed to save salary structure." });
      toast.error("Failed to save salary structure.");
    } finally {
      setSaving(false);
    }
  };

  const filteredEmployees = employees.filter(e => 
    `${e.firstName} ${e.lastName} ${e.employeeCode} ${e.departmentId?.name || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleBack = () => {
    const isHR = window.location.pathname.startsWith("/hr");
    navigate(isHR ? "/hr/dashboard" : "/company/payroll/history");
  };

  const gross = calculateGross();
  const deductions = calculateTotalDeductions();
  const net = calculateNet();

  return (
    <div className="space-y-3 max-w-7xl mx-auto pb-8 flex flex-col font-sans text-slate-900 dark:text-slate-100">
      
      {/* ── Executive Header Banner ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#111C24] p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-amber-500 hover:border-amber-500 transition-all shadow-2xs cursor-pointer"
            title="Back"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Salary Structures & Compensation
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 uppercase">
                Payroll
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Define monthly CTC, gross earnings breakdown, and statutory tax deductions for staff.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">
            {employees.length} Staff Enrolled
          </span>
        </div>
      </div>

      {/* ── Main 2-Column Work Surface ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[580px]">
        
        {/* Left Column: Employee Selector (4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs flex flex-col overflow-hidden">
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              <input 
                type="text" 
                placeholder="Search staff, code, department..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 max-h-[620px]">
            {filteredEmployees.map((emp, idx) => {
              const name = `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.name || "Employee";
              const rawPhoto = emp.photo || emp.user?.profileImage || emp.userId?.profileImage || null;
              const photoUrl = getPhotoUrl(rawPhoto);
              const isSelected = selectedEmp?._id === emp._id;
              const deptName = emp.departmentId?.name || "General";

              return (
                <button
                  key={`${emp._id || "emp"}-${idx}`}
                  onClick={() => handleSelectEmployee(emp)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all text-left cursor-pointer border ${
                    isSelected
                      ? "bg-amber-500/10 border-amber-500/40 shadow-2xs"
                      : "bg-white dark:bg-slate-900/30 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={name}
                        className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0"
                        onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold text-xs flex items-center justify-center shadow-2xs shrink-0">
                        {name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="truncate">
                      <p className={`text-xs font-bold truncate leading-tight ${isSelected ? "text-amber-700 dark:text-amber-400" : "text-slate-900 dark:text-white"}`}>
                        {name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                        {emp.employeeCode} · {deptName}
                      </p>
                    </div>
                  </div>

                  <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                    isSelected
                      ? "bg-amber-500 text-slate-950"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                  }`}>
                    {emp.status || "Active"}
                  </span>
                </button>
              );
            })}

            {filteredEmployees.length === 0 && (
              <div className="p-8 text-center text-slate-400">
                <User size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-1" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No employees found</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Salary Breakdown & Compensation Editor (8 cols) */}
        <div className="lg:col-span-8 flex flex-col">
          {selectedEmp ? (
            <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs flex flex-col flex-1 overflow-hidden">
              
              {/* Employee Summary Card & Action Bar */}
              <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {(() => {
                    const empName = `${selectedEmp.firstName || ""} ${selectedEmp.lastName || ""}`.trim() || selectedEmp.name || "Employee";
                    const rawPhoto = selectedEmp.photo || selectedEmp.user?.profileImage || selectedEmp.userId?.profileImage || null;
                    const photoUrl = getPhotoUrl(rawPhoto);
                    return photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={empName}
                        className="w-11 h-11 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0"
                        onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold text-sm flex items-center justify-center shadow-2xs shrink-0">
                        {empName.charAt(0).toUpperCase()}
                      </div>
                    );
                  })()}
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                        {selectedEmp.firstName} {selectedEmp.lastName}
                      </h2>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {selectedEmp.employeeCode}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      {selectedEmp.designationId?.title || selectedEmp.designationId?.name || "Staff"} · {selectedEmp.departmentId?.name || "General"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAutoDistribute}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-amber-500 hover:text-amber-600 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                    title="Auto-calculate standard allowances from CTC"
                  >
                    <Sparkles size={13} className="text-amber-500" />
                    <span>Auto Split</span>
                  </button>
                  <button 
                    onClick={handleSave} 
                    disabled={saving || loading}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-4 py-1.5 rounded-xl text-xs font-extrabold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Save size={13} strokeWidth={2.5} />
                    <span>{saving ? "Saving..." : "Save Structure"}</span>
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                  <RefreshCw size={22} className="animate-spin text-amber-500" />
                  <p className="text-xs font-bold">Loading compensation details...</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                  
                  {message.text && (
                    <div className={`p-3 rounded-xl flex items-center gap-2 text-xs font-bold border ${
                      message.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : message.type === 'warning'
                        ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                        : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                    }`}>
                      {message.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                      <span>{message.text}</span>
                    </div>
                  )}

                  {/* Monthly CTC Primary Box */}
                  <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/30 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10.5px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                        Target Monthly Cost-to-Company (CTC)
                      </span>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Base anchor for calculating statutory components and gross earnings.
                      </p>
                    </div>
                    <div className="relative max-w-xs w-full">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                      <input
                        type="number"
                        name="monthlyCTC"
                        value={structure.monthlyCTC || ""}
                        onChange={handleChange}
                        placeholder="0"
                        className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-extrabold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* 2-Column Grid: Earnings & Deductions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    
                    {/* Earnings Deck */}
                    <div className="bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800 rounded-2xl p-3.5 space-y-3 flex flex-col justify-between">
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
                          <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            Gross Earnings Breakdown
                          </span>
                          <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                            {fmt(gross)}
                          </span>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div>
                            <div className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              <span>Basic Salary <span className="text-rose-500">*</span></span>
                              <span className="font-mono text-slate-900 dark:text-white">{fmt(structure.basicSalary)}</span>
                            </div>
                            <input type="number" name="basicSalary" value={structure.basicSalary || ""} onChange={handleChange} className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500" />
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              <span>House Rent Allowance (HRA)</span>
                              <span className="font-mono text-slate-900 dark:text-white">{fmt(structure.hra)}</span>
                            </div>
                            <input type="number" name="hra" value={structure.hra || ""} onChange={handleChange} className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500" />
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              <span>Conveyance Allowance</span>
                              <span className="font-mono text-slate-900 dark:text-white">{fmt(structure.conveyanceAllowance)}</span>
                            </div>
                            <input type="number" name="conveyanceAllowance" value={structure.conveyanceAllowance || ""} onChange={handleChange} className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500" />
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              <span>Medical Allowance</span>
                              <span className="font-mono text-slate-900 dark:text-white">{fmt(structure.medicalAllowance)}</span>
                            </div>
                            <input type="number" name="medicalAllowance" value={structure.medicalAllowance || ""} onChange={handleChange} className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500" />
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              <span>Special Allowance</span>
                              <span className="font-mono text-slate-900 dark:text-white">{fmt(structure.specialAllowance)}</span>
                            </div>
                            <input type="number" name="specialAllowance" value={structure.specialAllowance || ""} onChange={handleChange} className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500" />
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              <span>Other Allowances</span>
                              <span className="font-mono text-slate-900 dark:text-white">{fmt(structure.otherAllowance)}</span>
                            </div>
                            <input type="number" name="otherAllowance" value={structure.otherAllowance || ""} onChange={handleChange} className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500" />
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex justify-between text-xs font-extrabold text-slate-900 dark:text-white">
                        <span>Total Monthly Earnings</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-mono">{fmt(gross)}</span>
                      </div>
                    </div>

                    {/* Deductions Deck */}
                    <div className="bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800 rounded-2xl p-3.5 space-y-3 flex flex-col justify-between">
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
                          <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                            Statutory & Other Deductions
                          </span>
                          <span className="text-xs font-extrabold text-rose-600 dark:text-rose-400">
                            {fmt(deductions)}
                          </span>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div>
                            <div className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              <span>Provident Fund (PF - 12%)</span>
                              <span className="font-mono text-slate-900 dark:text-white">{fmt(structure.pf)}</span>
                            </div>
                            <input type="number" name="pf" value={structure.pf || ""} onChange={handleChange} className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500" />
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              <span>Employee State Insurance (ESI)</span>
                              <span className="font-mono text-slate-900 dark:text-white">{fmt(structure.esi)}</span>
                            </div>
                            <input type="number" name="esi" value={structure.esi || ""} onChange={handleChange} className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500" />
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              <span>Professional Tax (PT)</span>
                              <span className="font-mono text-slate-900 dark:text-white">{fmt(structure.professionalTax)}</span>
                            </div>
                            <input type="number" name="professionalTax" value={structure.professionalTax || ""} onChange={handleChange} className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500" />
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              <span>Tax Deducted at Source (TDS)</span>
                              <span className="font-mono text-slate-900 dark:text-white">{fmt(structure.tds)}</span>
                            </div>
                            <input type="number" name="tds" value={structure.tds || ""} onChange={handleChange} className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500" />
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              <span>Other Deductions</span>
                              <span className="font-mono text-slate-900 dark:text-white">{fmt(structure.otherDeductions)}</span>
                            </div>
                            <input type="number" name="otherDeductions" value={structure.otherDeductions || ""} onChange={handleChange} className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500" />
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex justify-between text-xs font-extrabold text-slate-900 dark:text-white">
                        <span>Total Monthly Deductions</span>
                        <span className="text-rose-600 dark:text-rose-400 font-mono">{fmt(deductions)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Compensation Executive Summary Strip */}
                  <div className="bg-slate-900 text-white dark:bg-[#0B132B] rounded-2xl p-4 border border-slate-800 shadow-lg">
                    <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                        <Coins size={14} className="text-amber-400" />
                        Executive Compensation Summary
                      </span>
                      <span className="text-xs text-amber-400 font-extrabold">
                        Annual CTC ~ {fmt(gross * 12)}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gross Earnings</p>
                        <p className="text-base sm:text-lg font-extrabold text-emerald-400 mt-0.5">{fmt(gross)}</p>
                      </div>
                      <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Deductions</p>
                        <p className="text-base sm:text-lg font-extrabold text-rose-400 mt-0.5">{fmt(deductions)}</p>
                      </div>
                      <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/30">
                        <p className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">Net Take-Home</p>
                        <p className="text-base sm:text-xl font-black text-amber-400 mt-0.5">{fmt(net)}</p>
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-2xs min-h-[400px]">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center mb-3">
                <Calculator size={26} strokeWidth={2.2} />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Select an Employee</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                Choose a team member from the directory to review, configure, and save their salary breakdown and tax deductions.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default SalaryStructurePage;
