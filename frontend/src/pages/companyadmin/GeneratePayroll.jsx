import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from "../../api/api";
import {
  Calculator, CheckCircle2, AlertCircle, Search, ChevronRight, ChevronLeft,
  Gift, DollarSign, Calendar, Sparkles, X, Check, Banknote
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const getPhotoUrl = (rawPhoto) => {
  if (!rawPhoto) return null;
  return rawPhoto.startsWith("http") || rawPhoto.startsWith("data:")
    ? rawPhoto
    : `${(import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace("/api", "")}${rawPhoto.startsWith("/") ? "" : "/"}${rawPhoto}`;
};

const fmt = (v) => `₹ ${(Number(v) || 0).toLocaleString("en-IN")}`;
const fmtDays = (v) => { const n = Number(v) || 0; return n % 1 === 0 ? String(n) : n.toFixed(1); };

const GeneratePayroll = () => {
  const navigate = useNavigate();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [step, setStep] = useState(1);
  const [previews, setPreviews] = useState([]);
  const [selectedEmpIds, setSelectedEmpIds] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  
  // Per-employee bonus/advance overrides: { empId: { bonus, incentive, advanceDeduction } }
  const [overrides, setOverrides] = useState({});
  const [activeOverrideEmp, setActiveOverrideEmp] = useState(null);

  // Quick CTC Modal state
  const [quickCtcEmp, setQuickCtcEmp] = useState(null);
  const [quickCtcAmount, setQuickCtcAmount] = useState("");
  const [savingQuickCtc, setSavingQuickCtc] = useState(false);

  const { data: empRes } = useQuery({
    queryKey: ["employees"],
    queryFn: () => api.get("/company/employees?limit=1000"),
  });
  const employees = empRes?.data?.employees || [];

  const previewMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/payroll/company/preview", payload);
      return res.data;
    },
    onSuccess: (data) => {
      if (data.success && data.data) {
        setPreviews(data.data);
        setSelectedEmpIds(data.data.filter(p => p.success).map(p => String(p.employeeId)));
        setStep(2);
        toast.success(`Calculated preview for ${data.data.length} staff records!`);
      }
    },
    onError: (err) => {
      const msg = err.response?.data?.message || "Failed to generate preview";
      setError(msg);
      toast.error(msg);
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/payroll/company/generate", payload);
      return res.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        setSuccessMsg(data.message || "Payroll successfully generated and logged!");
        setStep(3);
        toast.success("Payroll generated successfully!");
      }
    },
    onError: (err) => {
      console.error("Payroll Generate Error:", err, err.response?.data);
      const msg = err.response?.data?.message || "Failed to generate payroll";
      setError(msg);
      toast.error(msg);
    },
  });

  const handlePreview = () => {
    setError("");
    const [y, m] = month.split("-");
    const activeEmpIds = employees.filter(e => e.status === "active").map(e => e._id);
    if (activeEmpIds.length === 0) { 
      setError("No active employees found in the organization."); 
      toast.error("No active employees found.");
      return; 
    }
    previewMutation.mutate({ month: parseInt(m, 10), year: parseInt(y, 10), employeeIds: activeEmpIds, overrides });
  };

  const handleGenerate = () => {
    setError("");
    if (selectedEmpIds.length === 0) { 
      setError("Please select at least one employee."); 
      toast.error("Select at least 1 employee.");
      return; 
    }
    const [y, m] = month.split("-");
    generateMutation.mutate({ month: parseInt(m, 10), year: parseInt(y, 10), employeeIds: selectedEmpIds, overrides });
  };

  const toggleSelectAll = () => {
    const validIds = previews.filter(p => p.success).map(p => String(p.employeeId));
    setSelectedEmpIds(selectedEmpIds.length === validIds.length ? [] : validIds);
  };

  const toggleSelect = (id) => {
    const sid = String(id);
    setSelectedEmpIds(prev => prev.includes(sid) ? prev.filter(i => i !== sid) : [...prev, sid]);
  };

  const setOverride = (empId, field, value) => {
    setOverrides(prev => ({ ...prev, [empId]: { ...(prev[empId] || {}), [field]: Number(value) || 0 } }));
  };

  // Quick Save Single Employee Salary Structure
  const handleSaveQuickCTC = async () => {
    const numericCtc = Number(quickCtcAmount);
    if (!quickCtcEmp || !numericCtc || numericCtc <= 0) return;
    setSavingQuickCtc(true);
    try {
      const basicSalary = Math.round(numericCtc * 0.50);
      const hra = Math.round(basicSalary * 0.40);
      const conveyanceAllowance = 1600;
      const medicalAllowance = 1250;
      const pf = Math.round(basicSalary * 0.12);
      const professionalTax = 200;
      const allocated = basicSalary + hra + conveyanceAllowance + medicalAllowance;
      const specialAllowance = Math.max(0, numericCtc - allocated);

      const payload = {
        employeeId: quickCtcEmp.employeeId,
        monthlyCTC: numericCtc,
        basicSalary,
        hra,
        conveyanceAllowance,
        medicalAllowance,
        specialAllowance,
        otherAllowance: 0,
        pf,
        esi: 0,
        professionalTax,
        tds: 0,
        otherDeductions: 0,
      };

      await api.post("/payroll/company/salary-structures", payload);
      toast.success(`Salary structure saved for ${quickCtcEmp.employeeSnapshot?.employeeName}!`);
      setQuickCtcEmp(null);
      setQuickCtcAmount("");
      handlePreview();
    } catch (err) {
      console.error("Error saving CTC:", err);
      toast.error("Failed to save salary structure.");
    } finally {
      setSavingQuickCtc(false);
    }
  };

  const filteredPreviews = previews.filter(p => {
    if (!p.employeeSnapshot) return true;
    return `${p.employeeSnapshot.employeeName} ${p.employeeSnapshot.employeeCode} ${p.employeeSnapshot.department || ''}`.toLowerCase().includes(search.toLowerCase());
  });

  const validCount = previews.filter(p => p.success).length;

  const totalNetPayout = previews
    .filter(p => selectedEmpIds.includes(String(p.employeeId)))
    .reduce((sum, p) => sum + (p.netSalary || p.calculatedPayroll?.netSalary || 0), 0);

  const totalGrossPayout = previews
    .filter(p => selectedEmpIds.includes(String(p.employeeId)))
    .reduce((sum, p) => sum + (p.grossSalary || p.earnings?.grossEarnings || p.calculatedPayroll?.grossSalary || p.calculatedPayroll?.earnings?.grossEarnings || 0), 0);


  return (
    <div className="space-y-3 max-w-7xl mx-auto pb-8 flex flex-col font-sans text-slate-900 dark:text-slate-100">
      
      {/* ── Executive Header Banner ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#111C24] p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(window.location.pathname.startsWith("/hr") ? "/hr/payroll/history" : "/company/payroll/history")}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-amber-500 hover:border-amber-500 transition-all shadow-2xs cursor-pointer"
            title="Back to History"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Generate Monthly Payroll
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 uppercase">
                Step {step} of 3
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Calculate payable days, apply attendance proration, tax deductions, and disburse staff salaries.
            </p>
          </div>
        </div>

        {/* 3-Step Wizard Indicator */}
        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          {[
            { id: 1, label: "1. Period" },
            { id: 2, label: "2. Review & Adjust" },
            { id: 3, label: "3. Disburse" },
          ].map((s) => (
            <span
              key={s.id}
              className={`text-[10.5px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                step === s.id
                  ? "bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 shadow-2xs"
                  : step > s.id
                  ? "text-emerald-600 dark:text-emerald-400 font-extrabold"
                  : "text-slate-400"
              }`}
            >
              {s.label}
            </span>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* ── STEP 1: Select Period & Start Preview ────────────────────── */}
      {step === 1 && (
        <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-2xs space-y-6 max-w-2xl mx-auto w-full my-4">
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mx-auto mb-2">
              <Calendar size={24} />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Choose Payroll Billing Cycle</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select the month and year to compile attendance and generate salary calculation previews.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              Salary Period (Month & Year)
            </label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Staff</span>
              <p className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                {employees.filter(e => e.status === "active").length}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Enrolled</span>
              <p className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                {employees.length}
              </p>
            </div>
          </div>

          <button
            onClick={handlePreview}
            disabled={previewMutation.isPending}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
          >
            {previewMutation.isPending ? (
              <>
                <Calculator size={16} className="animate-spin" />
                <span>Computing Attendance & Proration...</span>
              </>
            ) : (
              <>
                <span>Calculate & Preview Payroll</span>
                <ChevronRight size={16} />
              </>
            )}
          </button>
        </div>
      )}

      {/* ── STEP 2: Review Calculations, Overrides & Confirmation ────── */}
      {step === 2 && (
        <div className="space-y-3">
          
          {/* Top KPI Deck & Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-white dark:bg-[#111C24] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Selected Staff</span>
              <p className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                {selectedEmpIds.length} / {previews.length}
              </p>
            </div>
            <div className="bg-white dark:bg-[#111C24] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Gross Total</span>
              <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {fmt(totalGrossPayout)}
              </p>
            </div>
            <div className="bg-white dark:bg-[#111C24] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Net Disbursal</span>
              <p className="text-lg font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
                {fmt(totalNetPayout)}
              </p>
            </div>
            <div className="bg-white dark:bg-[#111C24] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Ready to Run</span>
                <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {validCount} Valid Records
                </p>
              </div>
              <button
                onClick={handleGenerate}
                disabled={generateMutation.isPending || selectedEmpIds.length === 0}
                className="px-3.5 py-2 bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 font-extrabold text-xs rounded-xl hover:opacity-90 transition-all shadow-2xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <DollarSign size={13} strokeWidth={2.5} />
                <span>{generateMutation.isPending ? "Generating..." : "Generate Final"}</span>
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden flex flex-col">
            
            {/* Toolbar */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedEmpIds.length === validCount && validCount > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-300 dark:border-slate-700 text-amber-500 focus:ring-amber-500 cursor-pointer w-4 h-4"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select All Valid ({selectedEmpIds.length} selected)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative max-w-xs w-full">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search staff, code, department..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
                  />
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer shadow-2xs"
                >
                  Change Period
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 w-10 text-center"></th>
                    <th className="px-3 py-3">Team Member</th>
                    <th className="px-3 py-3 text-center">Payable Days</th>
                    <th className="px-3 py-3 text-center">Month Leaves</th>
                    <th className="px-3 py-3 text-right">Gross Earnings</th>
                    <th className="px-3 py-3 text-right">Deductions</th>
                    <th className="px-3 py-3 text-right">Net Salary</th>
                    <th className="px-3 py-3 text-center">Bonus / Advance</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredPreviews.map((p, idx) => {
                    const empName = p.employeeSnapshot?.employeeName || "Employee";
                    const empCode = p.employeeSnapshot?.employeeCode || "—";
                    const dept = p.employeeSnapshot?.department || "General";
                    const isSelected = selectedEmpIds.includes(String(p.employeeId));
                    const empObj = employees.find(e => String(e._id) === String(p.employeeId));
                    const rawPhoto = p.employeeSnapshot?.photo || p.photo || empObj?.photo || empObj?.user?.profileImage || empObj?.userId?.profileImage || null;
                    const photoUrl = getPhotoUrl(rawPhoto);
                    const empOverrides = overrides[p.employeeId] || {};
                    const hasOverrides = empOverrides.bonus || empOverrides.incentive || empOverrides.advanceDeduction;
                    const att = p.attendanceSummary || p.calculatedPayroll?.attendanceDetails || {};
                    const monthLeavesCount = att.monthLeaves ?? ((att.paidLeaveDays || 0) + (att.unpaidLeaveDays || 0));
                    const gross = p.grossSalary || p.earnings?.grossEarnings || p.calculatedPayroll?.grossSalary || p.calculatedPayroll?.earnings?.grossEarnings || 0;
                    const deductions = p.deductions?.totalDeductions || p.calculatedPayroll?.deductions?.totalDeductions || 0;
                    const net = p.netSalary || p.calculatedPayroll?.netSalary || 0;

                    return (
                      <tr
                        key={`${p.employeeId || "prev"}-${idx}`}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors ${
                          isSelected ? "bg-amber-50/30 dark:bg-amber-950/20" : ""
                        }`}
                      >
                        <td className="px-4 py-3 text-center">
                          {p.success && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(p.employeeId)}
                              className="rounded border-slate-300 dark:border-slate-700 text-amber-500 focus:ring-amber-500 cursor-pointer w-3.5 h-3.5"
                            />
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            {photoUrl ? (
                              <img
                                src={photoUrl}
                                alt={empName}
                                className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0"
                                onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-2xs">
                                {empName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white leading-tight">{empName}</p>
                              <p className="text-[10px] text-slate-400 font-medium">{empCode} · {dept}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {p.success ? (
                            <div className="flex flex-col items-center">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono font-extrabold text-[11px]">
                                {fmtDays(att.payableDays || 0)} Days
                              </span>
                              <div className="flex items-center gap-1 text-[9px] text-slate-400 mt-0.5">
                                <span className="text-emerald-600 font-bold">{fmtDays(att.presentDays || 0)}P</span>
                                <span>·</span>
                                <span className="text-rose-500 font-bold">{fmtDays(att.absentDays || 0)}A</span>
                                {att.halfDays > 0 && <><span>·</span><span className="text-purple-600 font-bold">{fmtDays(att.halfDays)}HD</span></>}
                              </div>
                            </div>
                          ) : "—"}
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-slate-600 dark:text-slate-400">
                          {p.success ? (
                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              monthLeavesCount > 0 
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60" 
                                : "text-slate-400"
                            }`}>
                              {fmtDays(monthLeavesCount)} Leaves
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                          {p.success ? fmt(gross) : "—"}
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-rose-600 dark:text-rose-400 font-mono">
                          {p.success ? fmt(deductions) : "—"}
                        </td>
                        <td className="px-3 py-3 text-right font-black text-amber-600 dark:text-amber-400 font-mono text-sm">
                          {p.success ? fmt(net) : "—"}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <button
                            onClick={() => setActiveOverrideEmp(p)}
                            disabled={!p.success}
                            className={`px-2 py-1 rounded-lg text-[10.5px] font-bold border transition-all cursor-pointer flex items-center gap-1 mx-auto disabled:opacity-40 ${
                              hasOverrides
                                ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
                                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-amber-500"
                            }`}
                          >
                            <Gift size={12} className="text-amber-500" />
                            <span>{hasOverrides ? "Adjusted" : "+ Adjust"}</span>
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {p.success ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <Check size={11} className="mr-1" />
                              Ready
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                setQuickCtcEmp(p);
                                setQuickCtcAmount("");
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-2xs transition-all cursor-pointer"
                              title="Set salary structure to include in this payroll run"
                            >
                              <Sparkles size={11} />
                              <span>Set CTC</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>

          {/* Quick CTC Modal */}
          {quickCtcEmp && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn font-sans">
              <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-4 space-y-3 animate-scaleUp">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                    <Sparkles size={15} />
                    Set Monthly CTC
                  </h3>
                  <button
                    onClick={() => setQuickCtcEmp(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex items-center gap-2.5">
                  {(() => {
                    const empName = quickCtcEmp.employeeSnapshot?.employeeName || "Employee";
                    const empObj = employees.find(e => String(e._id) === String(quickCtcEmp.employeeId));
                    const rawPhoto = quickCtcEmp.employeeSnapshot?.photo || empObj?.photo || empObj?.user?.profileImage || null;
                    const photoUrl = getPhotoUrl(rawPhoto);
                    return (
                      <>
                        {photoUrl ? (
                          <img src={photoUrl} alt={empName} className="w-8 h-8 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {empName.charAt(0)}
                          </div>
                        )}
                        <div className="truncate">
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">{empName}</h4>
                          <p className="text-[10px] text-slate-400 font-mono">{quickCtcEmp.employeeSnapshot?.employeeCode}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10.5px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                    Monthly CTC Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quickCtcAmount}
                    onChange={(e) => setQuickCtcAmount(e.target.value)}
                    placeholder="Enter monthly salary CTC amount"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-extrabold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
                  />
                </div>

                <button
                  onClick={handleSaveQuickCTC}
                  disabled={savingQuickCtc || !quickCtcAmount || Number(quickCtcAmount) <= 0}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingQuickCtc ? "Saving & Re-calculating..." : "Save Salary & Recalculate"}
                </button>
              </div>
            </div>
          )}

          {/* Override Modal */}
          {activeOverrideEmp && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
              <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-4 space-y-3 animate-scaleUp">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-amber-600">
                    <Gift size={15} />
                    Adjust Bonus & Advances
                  </h3>
                  <button
                    onClick={() => setActiveOverrideEmp(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                      {activeOverrideEmp.employeeSnapshot?.employeeName}
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400">{activeOverrideEmp.employeeSnapshot?.employeeCode}</span>
                  </div>
                  {((activeOverrideEmp.deductions?.advanceRecoveryDetails?.length > 0) || (activeOverrideEmp.deductions?.advanceDeduction > 0)) && (
                    <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[10.5px]">
                      <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                        <Banknote size={12} />
                        Auto Advance Scheduled: {fmt(activeOverrideEmp.deductions?.advanceDeduction || 0)}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 font-semibold">
                        {activeOverrideEmp.deductions?.advanceRecoveryDetails?.[0]?.repaymentType === "percentage_of_salary"
                          ? "Percentage of Salary Deduction"
                          : activeOverrideEmp.deductions?.advanceRecoveryDetails?.[0]?.repaymentType === "fixed_monthly_amount"
                          ? "Fixed EMI Deduction"
                          : "Payroll Recovery"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2.5 text-xs">
                  <div>
                    <label className="text-[10.5px] font-bold text-slate-600 dark:text-slate-400 uppercase">One-Time Bonus (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={overrides[activeOverrideEmp.employeeId]?.bonus ?? ""}
                      onChange={(e) => setOverride(activeOverrideEmp.employeeId, "bonus", e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold mt-1 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10.5px] font-bold text-slate-600 dark:text-slate-400 uppercase">Performance Incentive (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={overrides[activeOverrideEmp.employeeId]?.incentive ?? ""}
                      onChange={(e) => setOverride(activeOverrideEmp.employeeId, "incentive", e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold mt-1 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-[10.5px] font-bold text-slate-600 dark:text-slate-400 uppercase">Advance / Loan Recovery (₹)</label>
                      {activeOverrideEmp.advanceSummary?.autoCalculatedDeduction > 0 && overrides[activeOverrideEmp.employeeId]?.advanceDeduction === undefined && (
                        <span className="text-[9.5px] text-emerald-600 dark:text-emerald-400 font-bold">
                          Auto: {fmt(activeOverrideEmp.advanceSummary.autoCalculatedDeduction)}
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={
                        overrides[activeOverrideEmp.employeeId]?.advanceDeduction !== undefined
                          ? overrides[activeOverrideEmp.employeeId]?.advanceDeduction
                          : (activeOverrideEmp.deductions?.advanceDeduction ?? "")
                      }
                      onChange={(e) => setOverride(activeOverrideEmp.employeeId, "advanceDeduction", e.target.value)}
                      placeholder={activeOverrideEmp.advanceSummary?.autoCalculatedDeduction ? String(activeOverrideEmp.advanceSummary.autoCalculatedDeduction) : "0"}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold mt-1 text-slate-900 dark:text-white"
                    />
                    {activeOverrideEmp.advanceSummary?.activeAdvance && (
                      <p className="text-[9.5px] text-slate-400 mt-1">
                        Auto-calculated from employee's advance EMI settings. You can modify the amount for this payroll cycle.
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setActiveOverrideEmp(null);
                    handlePreview();
                  }}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
                >
                  Save & Recalculate Preview
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── STEP 3: Disbursal Success & Completion ───────────────────── */}
      {step === 3 && (
        <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-8 shadow-2xs max-w-lg mx-auto w-full text-center space-y-4 my-8">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto animate-bounce">
            <CheckCircle2 size={36} strokeWidth={2.4} />
          </div>
          
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Payroll Successfully Generated!</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {successMsg || "Salaries and payslip statements have been recorded and released for the selected billing period."}
            </p>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800 flex justify-between items-center text-xs font-bold">
            <span className="text-slate-500">Billing Cycle:</span>
            <span className="text-slate-900 dark:text-white">{month}</span>
          </div>

          <div className="flex gap-2 pt-2">
            <Link
              to={window.location.pathname.startsWith("/hr") ? "/hr/payroll/history" : "/company/payroll/history"}
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs shadow-2xs transition-all"
            >
              View Payroll History
            </Link>
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
            >
              Run Another
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default GeneratePayroll;
