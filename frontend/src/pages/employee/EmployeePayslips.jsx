import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/api";
import {
  Receipt, Download, Calendar, X, FileText, Eye,
  Wallet, CheckCircle2, UserCheck, UserX, Clock,
  Umbrella, CalendarCheck, TrendingDown, TrendingUp, ChevronDown,
  DollarSign, MinusCircle, ShieldCheck, Printer, ArrowUp, ArrowDown,
  Landmark, CalendarX
} from "lucide-react";
import toast from "react-hot-toast";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const fmt = (n) => `₹ ${(Number(n) || 0).toLocaleString("en-IN")}`;
const fmtDay = (v) => {
  const n = Number(v) || 0;
  return n % 1 === 0 ? String(n) : n.toFixed(1);
};

/* ── Top Metric Stat Card ─────────────────────────────────────────────── */
const MetricCard = ({ label, value, subtext, Icon, iconBg, iconColor, accentBorder, trend, isPositive }) => (
  <div className="relative bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 sm:p-3.5 shadow-2xs hover:shadow-xs transition-all overflow-hidden flex flex-col justify-between group min-w-0">
    <div className={`absolute top-0 left-0 right-0 h-[2.5px] ${accentBorder}`} />
    <div className="flex items-start justify-between gap-1.5 mb-1.5">
      <div className="min-w-0 flex-1">
        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">
          {label}
        </span>
        <h3 className="text-base sm:text-lg xl:text-xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5 font-mono truncate" title={String(value)}>
          {value}
        </h3>
      </div>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${iconBg} shrink-0 shadow-2xs`}>
        <Icon size={16} style={{ color: iconColor }} strokeWidth={2.4} />
      </div>
    </div>
    <div className="flex items-center justify-between text-[10.5px] pt-1.5 border-t border-slate-100 dark:border-slate-800/80 gap-1">
      <span className="text-slate-400 truncate text-[10px] sm:text-[10.5px]">{subtext}</span>
      {trend && (
        <span className={`inline-flex items-center font-bold font-mono shrink-0 text-[9.5px] sm:text-[10px] ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
          {isPositive ? <ArrowUp size={10} strokeWidth={2.5} className="mr-0.5" /> : <ArrowDown size={10} strokeWidth={2.5} className="mr-0.5" />}
          {trend}
        </span>
      )}
    </div>
  </div>
);

const EmployeePayslips = () => {
  const currentYear = new Date().getFullYear();
  const [previewHtml, setPreviewHtml] = useState(null);
  const [yearFilter, setYearFilter] = useState(currentYear);
  const [monthFilter, setMonthFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);

  const { data: payslipsRes, isLoading } = useQuery({
    queryKey: ["employeeMyPayslips", yearFilter, monthFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (yearFilter && yearFilter !== "all") params.append("year", yearFilter);
      if (monthFilter && monthFilter !== "all") params.append("month", monthFilter);
      const qs = params.toString();
      return api.get(`/payroll/my-payslips${qs ? `?${qs}` : ""}`).then((res) => res.data);
    },
  });

  const { data: advanceRes } = useQuery({
    queryKey: ["employeeMyAdvances"],
    queryFn: () => api.get("/salary-advances/my").then((res) => res.data),
  });
  const activeAdvance = advanceRes?.metrics?.activeAdvance || null;

  const { data: salaryStructureRes } = useQuery({
    queryKey: ["employeeMySalaryStructure"],
    queryFn: () => api.get("/payroll/my-salary-structure").then((res) => res.data?.data || null),
  });
  const salaryStructure = salaryStructureRes || null;

  const rawPayslips = useMemo(() => payslipsRes?.data || payslipsRes?.payslips || [], [payslipsRes]);

  const yearOptions = useMemo(() => {
    const years = new Set([
      currentYear + 1,
      currentYear,
      currentYear - 1,
      currentYear - 2,
      currentYear - 3,
    ]);
    rawPayslips.forEach((p) => {
      if (p.year) years.add(Number(p.year));
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [currentYear, rawPayslips]);

  const payslips = useMemo(() => {
    return rawPayslips.filter((ps) => {
      if (yearFilter && yearFilter !== "all" && Number(ps.year) !== Number(yearFilter)) {
        return false;
      }
      if (monthFilter && monthFilter !== "all") {
        const pMonthNum = parseInt(ps.month, 10);
        const fMonthNum = parseInt(monthFilter, 10);
        if (!isNaN(pMonthNum) && !isNaN(fMonthNum)) {
          if (pMonthNum !== fMonthNum) return false;
        } else {
          const targetName = MONTH_NAMES[fMonthNum - 1]?.toLowerCase();
          const psStr = String(ps.month).trim().toLowerCase();
          if (psStr !== targetName && psStr !== String(monthFilter).toLowerCase()) {
            return false;
          }
        }
      }
      return true;
    });
  }, [rawPayslips, yearFilter, monthFilter]);

  const payslipsCount = payslips.length;

  // 1. Proper Agreed Base Salary (Monthly CTC / Gross Salary Structure)
  const properBaseSalary = useMemo(() => {
    if (payslips.length > 0) {
      return payslips.reduce((sum, p) => {
        const earned = p.earnings?.grossEarnings || 0;
        const lop = p.deductions?.lopDeduction || 0;
        const fallback = salaryStructure?.grossSalary || salaryStructure?.monthlyCTC || p.grossSalary || 0;
        const slipBase = (earned + lop) > 0 ? (earned + lop) : fallback;
        return sum + slipBase;
      }, 0);
    }
    return salaryStructure?.grossSalary || salaryStructure?.monthlyCTC || 0;
  }, [payslips, salaryStructure]);

  // 2. Gross Earned (Prorated to attendance)
  const totalGrossSalary = useMemo(
    () => payslips.reduce((sum, p) => sum + (p.grossSalary || p.earnings?.grossEarnings || 0), 0),
    [payslips]
  );

  // 3. Loss of Pay (LOP) Deduction
  const totalLopDeduction = useMemo(
    () => payslips.reduce((sum, p) => sum + (p.deductions?.lopDeduction || 0), 0),
    [payslips]
  );

  const totalLopDays = useMemo(
    () => payslips.reduce((sum, p) => sum + (p.attendanceSummary?.lossOfPayDays || p.attendanceSummary?.absentDays || 0), 0),
    [payslips]
  );

  // 4. Total Deductions (PF, PT, TDS, Advances)
  const totalDeductions = useMemo(
    () => payslips.reduce((sum, p) => sum + (p.deductions?.totalDeductions || 0), 0),
    [payslips]
  );

  // 5. Net In-Hand Salary Received
  const totalNetSalary = useMemo(
    () => payslips.reduce((sum, p) => sum + (p.netSalary || 0), 0),
    [payslips]
  );

  // 6. Attendance & Payable Days
  const totalPayableDays = useMemo(
    () => payslips.reduce((sum, p) => sum + (p.attendanceSummary?.payableDays !== undefined ? Number(p.attendanceSummary.payableDays) : 0), 0),
    [payslips]
  );

  const totalWorkDays = useMemo(
    () => payslips.reduce((sum, p) => {
      const cal = p.attendanceSummary?.totalCalendarDays || p.attendanceSummary?.workingDays || 30;
      return sum + Number(cal);
    }, 0) || (payslips.length * 30 || 30),
    [payslips]
  );

  const attendancePercent = totalWorkDays > 0 ? Math.round((totalPayableDays / totalWorkDays) * 100) : 0;

  const selectedMonthName = monthFilter !== "all" ? MONTH_NAMES[Number(monthFilter) - 1] || monthFilter : null;
  const currentPeriodText = selectedMonthName
    ? `${selectedMonthName} ${yearFilter === "all" ? "" : yearFilter}`.trim()
    : `${yearFilter === "all" ? "All Years" : `Financial Year ${yearFilter}`}`;

  const downloadPDF = async (id, monthStr, yearStr) => {
    try {
      const response = await api.get(`/payroll/${id}/payslip-pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Payslip_${monthStr}_${yearStr}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success("Payslip PDF downloaded!");
    } catch {
      toast.error("Failed to download PDF payslip.");
    }
  };

  const previewPayslip = async (id) => {
    try {
      const res = await api.get(`/payroll/${id}/payslip-preview`);
      setPreviewHtml(res.data);
    } catch {
      toast.error("Failed to preview payslip.");
    }
  };

  return (
    <div className="w-full font-sans pb-10 space-y-4 text-slate-900 dark:text-slate-100 max-w-[1440px] mx-auto text-xs">

      {/* ── Header Banner ─────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-[#111C24] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
            <Receipt size={20} strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                My Payslips &amp; Financial Ledger
              </h1>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                {currentPeriodText}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Access authenticated monthly salary slips, itemized earnings, statutory deductions, and PDF downloads.
            </p>
          </div>
        </div>

        {/* Year & Month Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto bg-slate-50 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          {/* Year Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 pl-1.5">Year:</span>
            <div className="relative">
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
                className="appearance-none pl-2.5 pr-7 py-1.5 bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-2xs"
              >
                <option value="all">All Years</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

          {/* Month Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 pl-1 sm:pl-0">Month:</span>
            <div className="relative">
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="appearance-none pl-2.5 pr-7 py-1.5 bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-2xs"
              >
                <option value="all">All Months</option>
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={String(idx + 1)}>
                    {name}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Reset Filters button if altered */}
          {(yearFilter !== currentYear || monthFilter !== "all") && (
            <button
              onClick={() => {
                setYearFilter(currentYear);
                setMonthFilter("all");
              }}
              title="Reset Filters to Current Year & All Months"
              className="px-2 py-1 text-[10.5px] font-extrabold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ── Active Salary Advance Banner ─────────────────────────────── */}
      {activeAdvance && (
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-2xs">
              <Wallet size={20} strokeWidth={2.4} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Active Salary Advance</h3>
                <span className="px-2 py-0.5 text-[9.5px] font-black rounded-full bg-amber-500 text-slate-950 uppercase">
                  {activeAdvance.repaymentType === "percentage_of_salary"
                    ? `${activeAdvance.percentage || 15}% Salary Deduction`
                    : activeAdvance.repaymentType === "fixed_monthly_amount"
                    ? `Fixed ${fmt(activeAdvance.monthlyDeductionAmount)}/mo EMI`
                    : "Next Month Full Deduction"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Disbursed: <span className="font-bold text-slate-700 dark:text-slate-300">{fmt(activeAdvance.amount)}</span> on {new Date(activeAdvance.disbursedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} • Reason: {activeAdvance.reason}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 sm:border-l sm:border-amber-500/20 sm:pl-5">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Repaid</span>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono">{fmt(activeAdvance.totalRecovered)}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Remaining</span>
              <span className="text-sm font-black text-amber-600 dark:text-amber-400 font-mono">{fmt(activeAdvance.remainingBalance)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── 5 Top KPI Stat Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {/* Card 1: Proper Base / CTC Salary */}
        <MetricCard
          label="Proper Base Salary"
          value={fmt(properBaseSalary)}
          subtext={salaryStructure?.monthlyCTC ? "Fixed Monthly CTC" : "Agreed Base Gross"}
          Icon={Landmark}
          iconBg="bg-indigo-50 dark:bg-indigo-950/40"
          iconColor="#6366F1"
          accentBorder="bg-indigo-500"
          trend="Base CTC"
          isPositive={true}
        />

        {/* Card 2: Gross Earned */}
        <MetricCard
          label="Gross Earned"
          value={fmt(totalGrossSalary)}
          subtext="Prorated to attendance"
          Icon={DollarSign}
          iconBg="bg-emerald-50 dark:bg-emerald-950/40"
          iconColor="#059669"
          accentBorder="bg-emerald-500"
          trend="Earned"
          isPositive={true}
        />

        {/* Card 3: Loss of Pay (LOP) */}
        <MetricCard
          label="Loss of Pay (LOP)"
          value={fmt(totalLopDeduction)}
          subtext={`${fmtDay(totalLopDays)} Unworked / LOP Days`}
          Icon={CalendarX}
          iconBg="bg-amber-50 dark:bg-amber-950/40"
          iconColor="#D97706"
          accentBorder="bg-amber-500"
          trend={totalLopDays > 0 ? `${fmtDay(totalLopDays)}d LOP` : "0d LOP"}
          isPositive={false}
        />

        {/* Card 4: Total Deductions */}
        <MetricCard
          label="Total Deductions"
          value={fmt(totalDeductions)}
          subtext="PF, PT, TDS & Advances"
          Icon={MinusCircle}
          iconBg="bg-rose-50 dark:bg-rose-950/40"
          iconColor="#DB2777"
          accentBorder="bg-rose-500"
          trend="Deducted"
          isPositive={false}
        />

        {/* Card 5: Net In-Hand Pay */}
        <MetricCard
          label="Net In-Hand Pay"
          value={fmt(totalNetSalary)}
          subtext={selectedMonthName ? `Disbursed (${selectedMonthName})` : "Take-Home Disbursal"}
          Icon={Wallet}
          iconBg="bg-blue-50 dark:bg-blue-950/40"
          iconColor="#0284C7"
          accentBorder="bg-blue-500"
          trend="In-Hand"
          isPositive={true}
        />
      </div>

      {/* ── Main Salary Statements Card ───────────────────────────────── */}
      <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden flex flex-col">
        
        {/* Table/Card Header */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-2">
            <Receipt size={15} className="text-amber-500" />
            <h3 className="font-black text-slate-900 dark:text-white text-xs tracking-wider uppercase">
              {selectedMonthName
                ? `Salary Statement (${selectedMonthName} ${yearFilter === "all" ? "" : yearFilter})`
                : `Monthly Disbursal Statements (${yearFilter === "all" ? "All Years" : yearFilter})`}
            </h3>
          </div>
          <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 bg-white dark:bg-[#111C24] px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 shadow-2xs">
            {payslips.length} Statement{payslips.length === 1 ? "" : "s"}
          </span>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-bold">Loading authenticated payslips...</p>
          </div>
        ) : payslips.length === 0 ? (
          /* Empty State */
          <div className="py-20 flex flex-col items-center justify-center text-center p-6 space-y-2.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-2xs">
              <Receipt size={22} strokeWidth={2} />
            </div>
            <p className="text-slate-900 dark:text-white font-bold text-sm">
              No Payslips Released Yet for {selectedMonthName ? `${selectedMonthName} ` : ""}{yearFilter === "all" ? "All Time" : yearFilter}
            </p>
            <p className="text-slate-400 text-xs max-w-md">
              Your monthly salary slips will appear here once generated and released by the HR Department. You will receive an instant notification when a new statement is published.
            </p>
          </div>
        ) : (
          /* Full Clean Table / Card View */
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {payslips.map((ps) => {
              const mNum = parseInt(ps.month, 10);
              const monthName = !isNaN(mNum) && mNum >= 1 && mNum <= 12 ? MONTH_NAMES[mNum - 1] : ps.month;
              const isPaid = ps.status === "paid";
              const gross = ps.grossSalary || ps.earnings?.grossEarnings || 0;
              const deductions = ps.deductions?.totalDeductions || 0;
              const net = ps.netSalary || 0;
              const att = ps.attendanceSummary || {};
              const isExpanded = expandedId === ps._id;

              return (
                <div key={ps._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                  
                  {/* Clean Summary Bar */}
                  <div className="p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    
                    {/* Pay Period & Status */}
                    <div className="flex items-center gap-3 min-w-[190px]">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0 shadow-2xs">
                        <Calendar size={18} />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 dark:text-white text-sm leading-tight">
                          {monthName} {ps.year}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider border ${
                              isPaid
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                : "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isPaid ? "bg-emerald-500" : "bg-blue-500"}`} />
                            {ps.status || "Generated"}
                          </span>
                          {ps.sentAt && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              · Released {new Date(ps.sentAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Clean Essential Attendance Summary */}
                    <div className="flex flex-wrap items-center gap-1.5 flex-1 max-w-lg">
                      {att.payableDays !== undefined && (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-black px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                          <CalendarCheck size={12} className="text-amber-500" />
                          <span>{fmtDay(att.payableDays)} Payable Days</span>
                        </span>
                      )}
                      {(att.presentDays || 0) > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                          <UserCheck size={11} /> {fmtDay(att.presentDays)} Present
                        </span>
                      )}
                      {(att.absentDays || 0) > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400">
                          <UserX size={11} /> {fmtDay(att.absentDays)} Absent
                        </span>
                      )}
                      {(att.halfDays || 0) > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400">
                          <Clock size={11} /> {fmtDay(att.halfDays)} Half Day
                        </span>
                      )}
                      {(att.paidLeaveDays || 0) > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400">
                          <Umbrella size={11} /> {fmtDay(att.paidLeaveDays)} Paid Leave
                        </span>
                      )}
                      {(att.lossOfPayDays || 0) > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                          LOP: {fmtDay(att.lossOfPayDays)}d
                        </span>
                      )}
                    </div>

                    {/* Financial Figures */}
                    <div className="flex items-center gap-4 sm:gap-6 justify-between sm:justify-start pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Gross</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300 font-mono text-xs">{fmt(gross)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Deductions</span>
                        <span className="font-bold text-rose-600 dark:text-rose-400 font-mono text-xs">{fmt(deductions)}</span>
                      </div>
                      <div className="pl-2 border-l border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] font-black text-[#1268D9] dark:text-blue-400 uppercase tracking-wider block">Take-Home</span>
                        <span className="font-black text-[#1268D9] dark:text-blue-400 font-mono text-sm sm:text-base">{fmt(net)}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : ps._id)}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer border ${
                          isExpanded
                            ? "bg-slate-900 text-white dark:bg-slate-800 border-slate-900 dark:border-slate-700"
                            : "bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        <ChevronDown size={13} className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                        <span>{isExpanded ? "Hide" : "Breakdown"}</span>
                      </button>

                      <button
                        onClick={() => previewPayslip(ps._id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                        title="View Full Salary Slip"
                      >
                        <Eye size={13} strokeWidth={2.2} />
                        <span>View</span>
                      </button>

                      <button
                        onClick={() => downloadPDF(ps._id, monthName, ps.year)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1268D9] hover:bg-[#0D50B8] text-white rounded-xl text-xs font-black transition-all shadow-md shadow-[#1268D9]/20 cursor-pointer"
                        title="Download Authenticated PDF"
                      >
                        <Download size={13} strokeWidth={2.2} />
                        <span>PDF</span>
                      </button>
                    </div>
                  </div>

                  {/* ── Expanded Itemized Breakdown Drawer ────────────── */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 dark:border-slate-800/80 px-4 py-4 bg-slate-50/60 dark:bg-slate-900/50 space-y-3.5 animate-fadeIn">
                      
                      {/* Attendance Breakdown Row */}
                      <div className="bg-white dark:bg-[#111C24] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                          Attendance &amp; Working Days Record ({monthName} {ps.year})
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-6 lg:grid-cols-7 gap-2 text-center">
                          <div className="p-2 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40">
                            <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase block">Present Days</span>
                            <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 font-mono">{fmtDay(att.presentDays || 0)}</span>
                          </div>
                          <div className="p-2 rounded-lg bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800/40">
                            <span className="text-[9px] font-bold text-rose-700 dark:text-rose-400 uppercase block">Absent Days</span>
                            <span className="text-xs font-black text-rose-800 dark:text-rose-300 font-mono">{fmtDay(att.absentDays || 0)}</span>
                          </div>
                          <div className="p-2 rounded-lg bg-purple-50/80 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/40">
                            <span className="text-[9px] font-bold text-purple-700 dark:text-purple-400 uppercase block">Half Days</span>
                            <span className="text-xs font-black text-purple-800 dark:text-purple-300 font-mono">{fmtDay(att.halfDays || 0)}</span>
                          </div>
                          <div className="p-2 rounded-lg bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40">
                            <span className="text-[9px] font-bold text-blue-700 dark:text-blue-400 uppercase block">Paid Leaves</span>
                            <span className="text-xs font-black text-blue-800 dark:text-blue-300 font-mono">{fmtDay(att.paidLeaveDays || 0)}</span>
                          </div>
                          <div className="p-2 rounded-lg bg-orange-50/80 dark:bg-orange-950/30 border border-orange-200/60 dark:border-orange-800/40">
                            <span className="text-[9px] font-bold text-orange-700 dark:text-orange-400 uppercase block">Loss of Pay</span>
                            <span className="text-xs font-black text-orange-800 dark:text-orange-300 font-mono">{fmtDay(att.lossOfPayDays || 0)}</span>
                          </div>
                          <div className="p-2 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40">
                            <span className="text-[9px] font-bold text-amber-700 dark:text-amber-400 uppercase block">Payable Days</span>
                            <span className="text-xs font-black text-amber-800 dark:text-amber-300 font-mono">{fmtDay(att.payableDays || 0)}</span>
                          </div>
                          {att.totalOvertimeHours > 0 && (
                            <div className="p-2 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 col-span-2 sm:col-span-1">
                              <span className="text-[9px] font-bold text-amber-700 dark:text-amber-400 uppercase block">Overtime</span>
                              <span className="text-xs font-black text-amber-800 dark:text-amber-300 font-mono">{att.totalOvertimeHours} hrs</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Earnings vs Deductions Side by Side */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        
                        {/* Earnings Table */}
                        <div className="bg-white dark:bg-[#111C24] border border-emerald-100 dark:border-emerald-950/60 rounded-xl p-3.5 space-y-2">
                          <div className="flex items-center justify-between pb-1.5 border-b border-emerald-100 dark:border-emerald-950">
                            <span className="text-[10.5px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                              <TrendingUp size={12} />
                              Itemized Earnings
                            </span>
                            <span className="text-[10px] text-slate-400">Prorated to attendance</span>
                          </div>
                          <div className="space-y-1.5 text-xs">
                            {[
                              ["Basic Salary", ps.earnings?.basicSalary],
                              ["House Rent Allowance (HRA)", ps.earnings?.hra],
                              ["Conveyance Allowance", ps.earnings?.conveyanceAllowance],
                              ["Medical Allowance", ps.earnings?.medicalAllowance],
                              ["Special Allowance", ps.earnings?.specialAllowance],
                              ["Other Allowance", ps.earnings?.otherAllowance],
                              ps.earnings?.bonus > 0 && ["Performance Bonus", ps.earnings?.bonus],
                              ps.earnings?.incentive > 0 && ["Special Incentive", ps.earnings?.incentive],
                              ps.earnings?.overtimePay > 0 && [
                                `Overtime Pay (${ps.earnings?.overtimeHours || 0}h @ ₹${ps.earnings?.overtimeHourlyRate || 0}/h)`,
                                ps.earnings?.overtimePay
                              ],
                            ]
                              .filter(Boolean)
                              .map(
                                ([label, val]) =>
                                  val > 0 && (
                                    <div key={label} className="flex justify-between items-center text-[11px]">
                                      <span className="text-slate-600 dark:text-slate-400">{label}</span>
                                      <span className="font-bold text-slate-900 dark:text-white font-mono">{fmt(val)}</span>
                                    </div>
                                  )
                              )}
                          </div>
                          <div className="pt-2 border-t border-emerald-100 dark:border-emerald-950 flex justify-between items-center text-xs font-black">
                            <span className="text-emerald-700 dark:text-emerald-400">Gross Total Earnings</span>
                            <span className="text-emerald-700 dark:text-emerald-400 font-mono text-sm">{fmt(ps.earnings?.grossEarnings || gross)}</span>
                          </div>
                        </div>

                        {/* Deductions Table */}
                        <div className="bg-white dark:bg-[#111C24] border border-rose-100 dark:border-rose-950/60 rounded-xl p-3.5 space-y-2">
                          <div className="flex items-center justify-between pb-1.5 border-b border-rose-100 dark:border-rose-950">
                            <span className="text-[10.5px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                              <TrendingDown size={12} />
                              Itemized Deductions
                            </span>
                            <span className="text-[10px] text-slate-400">Statutory &amp; LOP</span>
                          </div>
                          <div className="space-y-1.5 text-xs">
                            {[
                              ["Provident Fund (Employee PF)", ps.deductions?.pf],
                              ["Employee State Insurance (ESI)", ps.deductions?.esi],
                              ["Professional Tax (PT)", ps.deductions?.professionalTax],
                              ["Tax Deducted at Source (TDS)", ps.deductions?.tds],
                              ["Loss of Pay Deduction (LOP)", ps.deductions?.lopDeduction],
                              ["Salary Advance Recovery", ps.deductions?.advanceDeduction],
                              ["Other Deductions", ps.deductions?.otherDeductions],
                            ]
                              .filter(([, v]) => v > 0)
                              .map(([label, val]) => (
                                <div key={label} className="flex justify-between items-center text-[11px]">
                                  <span className="text-slate-600 dark:text-slate-400">{label}</span>
                                  <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">{fmt(val)}</span>
                                </div>
                              ))}
                            {deductions === 0 && (
                              <p className="text-[11px] text-slate-400 italic py-1">No deductions applicable for this cycle.</p>
                            )}
                          </div>
                          <div className="pt-2 border-t border-rose-100 dark:border-rose-950 flex justify-between items-center text-xs font-black">
                            <span className="text-rose-700 dark:text-rose-400">Total Deductions</span>
                            <span className="text-rose-700 dark:text-rose-400 font-mono text-sm">{fmt(deductions)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Net Disbursed Highlight Footer */}
                      <div className="bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent border border-blue-200 dark:border-blue-900/60 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-[#1268D9] dark:text-blue-400 uppercase tracking-wider block">
                            Net Take-Home Pay Disbursed
                          </span>
                          <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                            {ps.amountInWords || `${fmt(net)} Only`}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xl sm:text-2xl font-black text-[#1268D9] dark:text-blue-400 font-mono">
                            {fmt(net)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer info */}
        <div className="flex justify-between items-center text-xs text-slate-400 font-medium px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30">
          <span>Showing {payslips.length} salary statement{payslips.length === 1 ? "" : "s"} for {currentPeriodText}</span>
          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <ShieldCheck size={12} />
            HRMS Authenticated Ledger
          </span>
        </div>
      </div>

      {/* ── Payslip HTML Preview Modal ───────────────────────────────── */}
      {previewHtml && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs font-sans animate-fadeIn">
          <div className="bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-scaleUp">
            
            {/* Modal Header */}
            <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-900 text-white dark:bg-[#0B132B]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-xs">
                  <FileText size={16} />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white leading-tight">Digital Salary Statement</h3>
                  <p className="text-[10px] text-slate-400">Authenticated HRMS Salary Slip</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const printWin = window.open("", "_blank");
                    printWin.document.write(previewHtml);
                    printWin.document.close();
                    printWin.focus();
                    setTimeout(() => {
                      printWin.print();
                    }, 250);
                  }}
                  className="px-3.5 py-1.5 bg-[#1268D9] hover:bg-[#0D50B8] text-white font-extrabold text-xs rounded-xl shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Printer size={13} strokeWidth={2.4} />
                  <span>Print / Save PDF</span>
                </button>
                <button
                  onClick={() => setPreviewHtml(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Close preview"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-100 dark:bg-slate-950 flex justify-center">
              <div
                className="bg-white text-slate-900 rounded-xl shadow-md border border-slate-200/80 w-full max-w-3xl overflow-hidden"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeePayslips;
