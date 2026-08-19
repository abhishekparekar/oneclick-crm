import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/api";
import {
  Wallet, DollarSign, ArrowUpRight, CheckCircle2, AlertCircle, Search,
  Plus, Calendar, Clock, Check, X, CreditCard, RefreshCw, ArrowDownRight,
  Receipt, User, FileText, ChevronRight, Filter, Sparkles, Building2, HelpCircle
} from "lucide-react";
import toast from "react-hot-toast";

const getSafeUrl = (url) => {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed;
  }
  const base = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/+api$/, "").replace(/\/+$/, "");
  return `${base}/${trimmed.replace(/^\/+/, "")}`;
};

const fmt = (n) => `₹ ${(Number(n) || 0).toLocaleString("en-IN")}`;

const AVATAR_BG = [
  "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
];
const getAvatarClass = (name) => AVATAR_BG[(name?.charCodeAt(0) || 0) % AVATAR_BG.length];

const SalaryAdvancesPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isDisburseModalOpen, setIsDisburseModalOpen] = useState(false);
  const [selectedAdvanceForRepay, setSelectedAdvanceForRepay] = useState(null);
  const [selectedAdvanceForHistory, setSelectedAdvanceForHistory] = useState(null);

  // Disburse Form State
  const [employeeId, setEmployeeId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("Personal Advance / Emergency");
  const [disbursedDate, setDisbursedDate] = useState(new Date().toISOString().slice(0, 10));
  const [disbursedMode, setDisbursedMode] = useState("bank_transfer");
  const [repaymentType, setRepaymentType] = useState("full_next_month");
  const [monthlyDeductionAmount, setMonthlyDeductionAmount] = useState("");
  const [percentage, setPercentage] = useState("15");
  const [notes, setNotes] = useState("");

  // Direct Repayment Form State
  const [repayAmount, setRepayAmount] = useState("");
  const [repayType, setRepayType] = useState("direct_cash");
  const [repayNotes, setRepayNotes] = useState("");

  // Fetch Advances
  const { data: advancesRes, isLoading } = useQuery({
    queryKey: ["salaryAdvances", statusFilter],
    queryFn: () => api.get(`/salary-advances/company${statusFilter ? `?status=${statusFilter}` : ""}`).then((r) => r.data),
  });

  const advances = advancesRes?.data || [];
  const metrics = advancesRes?.metrics || {
    totalDisbursed: 0,
    totalRecovered: 0,
    totalOutstanding: 0,
    activeCount: 0,
  };

  // Fetch Employees for dropdown
  const { data: employeesRes } = useQuery({
    queryKey: ["companyEmployeesList"],
    queryFn: () => api.get("/company/employees?limit=1000").then((r) => r.data),
  });
  const employees = employeesRes?.employees || [];

  // Create Advance Mutation
  const createMutation = useMutation({
    mutationFn: (payload) => api.post("/salary-advances/company", payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries(["salaryAdvances"]);
      toast.success(res?.data?.message || "Salary advance recorded successfully!");
      setIsDisburseModalOpen(false);
      resetDisburseForm();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to disburse advance");
    },
  });

  // Direct Repayment Mutation
  const repayMutation = useMutation({
    mutationFn: ({ id, payload }) => api.patch(`/salary-advances/company/${id}/repay`, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries(["salaryAdvances"]);
      toast.success(res?.data?.message || "Repayment recorded successfully!");
      setSelectedAdvanceForRepay(null);
      setRepayAmount("");
      setRepayNotes("");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to record repayment");
    },
  });

  // Cancel Mutation
  const cancelMutation = useMutation({
    mutationFn: (id) => api.delete(`/salary-advances/company/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(["salaryAdvances"]);
      toast.success("Salary advance updated.");
    },
    onError: () => toast.error("Failed to cancel advance"),
  });

  const resetDisburseForm = () => {
    setEmployeeId("");
    setAmount("");
    setReason("Personal Advance / Emergency");
    setDisbursedDate(new Date().toISOString().slice(0, 10));
    setDisbursedMode("bank_transfer");
    setRepaymentType("full_next_month");
    setMonthlyDeductionAmount("");
    setPercentage("15");
    setNotes("");
  };

  const handleDisburseSubmit = (e) => {
    e.preventDefault();
    if (!employeeId) return toast.error("Please select an employee");
    if (!amount || Number(amount) <= 0) return toast.error("Please enter a valid advance amount");

    createMutation.mutate({
      employeeId,
      amount: Number(amount),
      reason,
      disbursedDate,
      disbursedMode,
      repaymentType,
      monthlyDeductionAmount: repaymentType === "fixed_monthly_amount" ? Number(monthlyDeductionAmount) : undefined,
      percentage: repaymentType === "percentage_of_salary" ? Number(percentage) : undefined,
      notes,
    });
  };

  const handleRepaySubmit = (e) => {
    e.preventDefault();
    if (!selectedAdvanceForRepay) return;
    if (!repayAmount || Number(repayAmount) <= 0) return toast.error("Please enter a valid repayment amount");

    repayMutation.mutate({
      id: selectedAdvanceForRepay._id,
      payload: {
        amount: Number(repayAmount),
        recoveryType: repayType,
        notes: repayNotes,
      },
    });
  };

  const filteredAdvances = useMemo(() => {
    return advances.filter((adv) => {
      const name = `${adv.employeeId?.firstName || ""} ${adv.employeeId?.lastName || ""}`.toLowerCase();
      const code = (adv.employeeId?.employeeCode || "").toLowerCase();
      const dept = (adv.employeeId?.departmentId?.name || "").toLowerCase();
      const q = search.toLowerCase();
      return name.includes(q) || code.includes(q) || dept.includes(q) || (adv.reason || "").toLowerCase().includes(q);
    });
  }, [advances, search]);

  return (
    <div className="space-y-4 max-w-[1440px] mx-auto pb-12 font-sans text-slate-900 dark:text-slate-100">
      
      {/* ── Top Header Bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shadow-2xs shrink-0">
            <Wallet size={24} strokeWidth={2.3} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Salary Advances &amp; Loan Ledger
            </h1>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Manage employee advance disbursements, automatic payroll recovery plans &amp; direct returns.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDisburseModalOpen(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus size={15} strokeWidth={2.8} />
            <span>Disburse New Advance</span>
          </button>
        </div>
      </div>

      {/* ── KPI Metrics Deck ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#111C24] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Total Disbursed</span>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5">{fmt(metrics.totalDisbursed)}</h3>
            <span className="text-[10px] font-bold text-slate-400">All loans recorded</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <ArrowUpRight size={20} strokeWidth={2.4} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111C24] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Total Recovered</span>
            <h3 className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">{fmt(metrics.totalRecovered)}</h3>
            <span className="text-[10px] font-bold text-emerald-600">Payroll &amp; direct returns</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <CheckCircle2 size={20} strokeWidth={2.4} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111C24] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Outstanding Balance</span>
            <h3 className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5">{fmt(metrics.totalOutstanding)}</h3>
            <span className="text-[10px] font-bold text-amber-600">Yet to be recovered</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <DollarSign size={20} strokeWidth={2.4} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111C24] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Active Advances</span>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5">{metrics.activeCount} Staff</h3>
            <span className="text-[10px] font-bold text-slate-400">Ongoing deductions</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
            <Clock size={20} strokeWidth={2.4} />
          </div>
        </div>
      </div>

      {/* ── Filter & Search Toolbar ────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111C24] p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search staff, code, department, reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { key: "", label: "All Advances", count: advances.length },
            { key: "active", label: "Active", count: advances.filter(a => a.status === "active").length },
            { key: "completed", label: "Completed", count: advances.filter(a => a.status === "completed").length },
            { key: "cancelled", label: "Cancelled", count: advances.filter(a => a.status === "cancelled").length },
          ].map((chip) => {
            const isSelected = statusFilter === chip.key;
            return (
              <button
                key={chip.key}
                onClick={() => setStatusFilter(chip.key)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isSelected
                    ? "bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 shadow-2xs"
                    : "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-100"
                }`}
              >
                <span>{chip.label}</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${isSelected ? "bg-white/20 text-white dark:bg-slate-950/20 dark:text-slate-950" : "bg-slate-200/80 dark:bg-slate-800 text-slate-500"}`}>
                  {chip.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main Advances List / Table ─────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
            <RefreshCw size={24} className="animate-spin text-amber-500" />
            <p className="text-xs font-bold">Loading advances ledger...</p>
          </div>
        ) : filteredAdvances.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Wallet size={36} className="mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No salary advance records found</p>
            <p className="text-xs text-slate-400">Disburse an advance or adjust filter criteria.</p>
            <div className="pt-2">
              <button
                onClick={() => setIsDisburseModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs shadow-2xs transition-all"
              >
                <Plus size={13} strokeWidth={2.5} />
                <span>Disburse Advance</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3">Team Member</th>
                  <th className="px-3 py-3 text-center">Disbursed Date</th>
                  <th className="px-3 py-3 text-right">Advance Amount</th>
                  <th className="px-3 py-3 text-center">Repayment Schedule</th>
                  <th className="px-3 py-3 text-center">Recovery Progress</th>
                  <th className="px-3 py-3 text-right">Remaining Balance</th>
                  <th className="px-3 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredAdvances.map((adv, idx) => {
                  const empName = `${adv.employeeId?.firstName || ""} ${adv.employeeId?.lastName || ""}`.trim() || "Employee";
                  const empCode = adv.employeeId?.employeeCode || "-";
                  const dept = adv.employeeId?.departmentId?.name || "General";
                  const photoUrl = getSafeUrl(adv.employeeId?.photo);
                  const pctRecovered = adv.amount > 0 ? Math.min(100, Math.round((adv.totalRecovered / adv.amount) * 100)) : 0;
                  const isCompleted = adv.status === "completed" || adv.remainingBalance <= 0;

                  return (
                    <tr key={`${adv._id}-${idx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors group">
                      
                      {/* Employee Info */}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          {photoUrl ? (
                            <img
                              src={photoUrl}
                              alt={empName}
                              className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0"
                              onError={(e) => { e.target.onerror = null; e.target.style.display = "none"; }}
                            />
                          ) : (
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 shadow-2xs ${getAvatarClass(empName)}`}>
                              {empName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-extrabold text-slate-900 dark:text-white leading-tight truncate">{empName}</p>
                            <p className="text-[10px] text-slate-400 font-medium truncate">{empCode} · {dept}</p>
                            <p className="text-[9.5px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{adv.reason}</p>
                          </div>
                        </div>
                      </td>

                      {/* Disbursed Date & Mode */}
                      <td className="px-3 py-2.5 text-center">
                        <span className="font-bold text-slate-700 dark:text-slate-300 block">
                          {new Date(adv.disbursedDate || adv.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                        <span className="text-[9.5px] font-semibold text-slate-400 uppercase">{adv.disbursedMode?.replace("_", " ")}</span>
                      </td>

                      {/* Advance Amount */}
                      <td className="px-3 py-2.5 text-right font-black text-slate-900 dark:text-white font-mono text-sm">
                        {fmt(adv.amount)}
                      </td>

                      {/* Repayment Schedule */}
                      <td className="px-3 py-2.5 text-center">
                        {adv.repaymentType === "percentage_of_salary" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            {adv.percentage || 15}% of Salary / mo
                          </span>
                        )}
                        {adv.repaymentType === "fixed_monthly_amount" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            Fixed {fmt(adv.monthlyDeductionAmount)} / mo
                          </span>
                        )}
                        {adv.repaymentType === "full_next_month" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            100% Next Month Payroll
                          </span>
                        )}
                        {adv.repaymentType === "manual_direct" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            Direct Return by Staff
                          </span>
                        )}
                      </td>

                      {/* Recovery Progress */}
                      <td className="px-3 py-2.5 text-center">
                        <div className="w-32 mx-auto space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="text-emerald-600 dark:text-emerald-400">{fmt(adv.totalRecovered)}</span>
                            <span className="text-slate-400">{pctRecovered}%</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${isCompleted ? "bg-emerald-500" : "bg-amber-500"}`}
                              style={{ width: `${pctRecovered}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Remaining Balance */}
                      <td className="px-3 py-2.5 text-right font-black text-amber-600 dark:text-amber-400 font-mono text-sm">
                        {fmt(adv.remainingBalance)}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2.5 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-extrabold rounded-full border capitalize ${
                          isCompleted
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                            : adv.status === "cancelled"
                            ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1 ${isCompleted ? "bg-emerald-500" : adv.status === "cancelled" ? "bg-rose-500" : "bg-amber-500"}`} />
                          {isCompleted ? "Recovered" : adv.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {!isCompleted && adv.status === "active" && (
                            <button
                              onClick={() => {
                                setSelectedAdvanceForRepay(adv);
                                setRepayAmount(String(adv.remainingBalance));
                              }}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 rounded-lg text-[10.5px] font-extrabold transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                              title="Record direct payment returned by employee"
                            >
                              <Check size={11} strokeWidth={2.5} />
                              <span>Direct Repay</span>
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedAdvanceForHistory(adv)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                            title="View Recovery History"
                          >
                            <FileText size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── DISBURSE ADVANCE MODAL ─────────────────────────────────────────── */}
      {isDisburseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs font-sans animate-fadeIn">
          <div className="bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-scaleUp">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Wallet size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Disburse Salary Advance</h3>
                  <p className="text-[11px] text-slate-400">Configure repayment schedule and recovery mode</p>
                </div>
              </div>
              <button onClick={() => setIsDisburseModalOpen(false)} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleDisburseSubmit} className="p-5 space-y-4 overflow-y-auto">
              
              {/* Select Employee */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Select Employee <span className="text-rose-500">*</span>
                </label>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeCode} - {emp.departmentId?.name || "Staff"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount & Date Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Advance Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 15000"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      className="w-full pl-7 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Disbursal Date
                  </label>
                  <input
                    type="date"
                    value={disbursedDate}
                    onChange={(e) => setDisbursedDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Repayment Strategy Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Repayment Recovery Mode <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  
                  <button
                    type="button"
                    onClick={() => setRepaymentType("full_next_month")}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      repaymentType === "full_next_month"
                        ? "bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-200 font-extrabold"
                        : "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">100% Next Month</span>
                      {repaymentType === "full_next_month" && <CheckCircle2 size={15} className="text-amber-500" />}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Full amount deducted in upcoming salary</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRepaymentType("percentage_of_salary")}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      repaymentType === "percentage_of_salary"
                        ? "bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-200 font-extrabold"
                        : "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">Percentage of Salary</span>
                      {repaymentType === "percentage_of_salary" && <CheckCircle2 size={15} className="text-amber-500" />}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">e.g. 10% or 15% deducted each month</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRepaymentType("fixed_monthly_amount")}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      repaymentType === "fixed_monthly_amount"
                        ? "bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-200 font-extrabold"
                        : "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">Fixed Monthly EMI</span>
                      {repaymentType === "fixed_monthly_amount" && <CheckCircle2 size={15} className="text-amber-500" />}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Fixed ₹ amount per month until cleared</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRepaymentType("manual_direct")}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      repaymentType === "manual_direct"
                        ? "bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-200 font-extrabold"
                        : "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">Direct Return by Staff</span>
                      {repaymentType === "manual_direct" && <CheckCircle2 size={15} className="text-amber-500" />}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Employee returns cash/UPI directly</p>
                  </button>

                </div>
              </div>

              {/* Dynamic Parameter: Percentage or Fixed Amount */}
              {repaymentType === "percentage_of_salary" && (
                <div className="p-3 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-2xl space-y-2">
                  <label className="text-xs font-bold text-blue-900 dark:text-blue-200 block">
                    Deduction Percentage per Month (%)
                  </label>
                  <div className="flex items-center gap-2">
                    {[10, 15, 20, 25, 30].map((pct) => (
                      <button
                        type="button"
                        key={pct}
                        onClick={() => setPercentage(String(pct))}
                        className={`px-3 py-1 rounded-xl text-xs font-extrabold cursor-pointer transition-all ${
                          percentage === String(pct)
                            ? "bg-blue-600 text-white shadow-2xs"
                            : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={percentage}
                      onChange={(e) => setPercentage(e.target.value)}
                      placeholder="Custom %"
                      className="w-24 px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <p className="text-[10px] text-blue-600 dark:text-blue-400">
                    Each month, exactly {percentage || 15}% of the employee's earned monthly salary will be auto-deducted until ₹{Number(amount || 0).toLocaleString("en-IN")} is paid.
                  </p>
                </div>
              )}

              {repaymentType === "fixed_monthly_amount" && (
                <div className="p-3 bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 rounded-2xl space-y-2">
                  <label className="text-xs font-bold text-purple-900 dark:text-purple-200 block">
                    Fixed EMI Deduction per Month (₹)
                  </label>
                  <input
                    type="number"
                    min="100"
                    placeholder="e.g. 5000"
                    value={monthlyDeductionAmount}
                    onChange={(e) => setMonthlyDeductionAmount(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  />
                  <p className="text-[10px] text-purple-600 dark:text-purple-400">
                    Exactly ₹{Number(monthlyDeductionAmount || 0).toLocaleString("en-IN")} will be deducted from each month's payslip.
                  </p>
                </div>
              )}

              {/* Reason & Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Reason / Category</label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Medical, Emergency, Advance"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Disbursed Via</label>
                  <select
                    value={disbursedMode}
                    onChange={(e) => setDisbursedMode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
                    <option value="upi">UPI / Online</option>
                    <option value="cash">Cash in Hand</option>
                    <option value="cheque">Company Cheque</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDisburseModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-2xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {createMutation.isPending ? "Recording..." : "Confirm & Disburse Advance"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ── DIRECT REPAYMENT MODAL ─────────────────────────────────────────── */}
      {selectedAdvanceForRepay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs font-sans animate-fadeIn">
          <div className="bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-5 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Record Direct Repayment</h3>
                  <p className="text-[11px] text-slate-400">Direct cash/UPI returned by employee</p>
                </div>
              </div>
              <button onClick={() => setSelectedAdvanceForRepay(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-800 flex justify-between items-center text-xs">
              <span className="font-bold text-slate-500">Current Outstanding:</span>
              <span className="font-black text-amber-600 dark:text-amber-400 font-mono text-sm">{fmt(selectedAdvanceForRepay.remainingBalance)}</span>
            </div>

            <form onSubmit={handleRepaySubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Repayment Amount (₹)</label>
                <input
                  type="number"
                  min="1"
                  max={selectedAdvanceForRepay.remainingBalance}
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Payment Channel</label>
                <select
                  value={repayType}
                  onChange={(e) => setRepayType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                >
                  <option value="direct_cash">Cash Paid to Office/HR</option>
                  <option value="direct_bank">Bank UPI / Direct Transfer</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Notes / Receipt Ref</label>
                <input
                  type="text"
                  placeholder="e.g. Cash handed over to HR"
                  value={repayNotes}
                  onChange={(e) => setRepayNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedAdvanceForRepay(null)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={repayMutation.isPending}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {repayMutation.isPending ? "Recording..." : "Save Repayment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── RECOVERY HISTORY MODAL ─────────────────────────────────────────── */}
      {selectedAdvanceForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs font-sans animate-fadeIn">
          <div className="bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full p-5 space-y-4 animate-scaleUp max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Recovery Transaction Ledger</h3>
                  <p className="text-[11px] text-slate-400">
                    {selectedAdvanceForHistory.employeeId?.firstName} {selectedAdvanceForHistory.employeeId?.lastName} ({selectedAdvanceForHistory.employeeId?.employeeCode})
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedAdvanceForHistory(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Advance</span>
                <span className="font-black text-slate-900 dark:text-white">{fmt(selectedAdvanceForHistory.amount)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Recovered</span>
                <span className="font-black text-emerald-600">{fmt(selectedAdvanceForHistory.totalRecovered)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Balance</span>
                <span className="font-black text-amber-600">{fmt(selectedAdvanceForHistory.remainingBalance)}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {(!selectedAdvanceForHistory.recoveryHistory || selectedAdvanceForHistory.recoveryHistory.length === 0) ? (
                <div className="py-8 text-center text-slate-400 text-xs font-bold">
                  No recovery transactions recorded yet.
                </div>
              ) : (
                selectedAdvanceForHistory.recoveryHistory.map((rec, i) => (
                  <div key={i} className="p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">
                        {rec.recoveryType === "payroll_deduction" ? `Payroll Deduction (${rec.month}/${rec.year})` : "Direct Return"}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(rec.deductedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} • {rec.notes || "Automated salary recovery"}
                      </span>
                    </div>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                      -{fmt(rec.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-right">
              <button
                onClick={() => setSelectedAdvanceForHistory(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SalaryAdvancesPage;
