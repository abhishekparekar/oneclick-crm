import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/api";
import {
  Receipt, Download, Calendar, X, FileText, Eye,
  Wallet, CheckCircle2, UserCheck, UserX, Clock,
  Umbrella, CalendarCheck, TrendingDown, TrendingUp, ChevronDown,
  Sparkles, DollarSign, MinusCircle, Check, ArrowUp, ArrowDown,
  ShieldCheck, Printer, ArrowRight
} from "lucide-react";
import toast from "react-hot-toast";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const fmt = (n) => `₹ ${(Number(n) || 0).toLocaleString("en-IN")}`;
const fmtDay = (v) => { const n = Number(v) || 0; return n % 1 === 0 ? String(n) : n.toFixed(1); };

/* ── Top Metric Stat Card ─────────────────────────────────────────────── */
const MetricCard = ({ label, value, subtext, Icon, iconBg, iconColor, accentBorder, trend, isPositive }) => (
  <div className="relative bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 shadow-2xs hover:shadow-xs transition-all overflow-hidden flex flex-col justify-between group">
    <div className={`absolute top-0 left-0 right-0 h-[2.5px] ${accentBorder}`} />
    <div className="flex items-start justify-between gap-2 mb-2">
      <div>
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
          {label}
        </span>
        <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5 font-mono">
          {value}
        </h3>
      </div>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg} flex-shrink-0 shadow-2xs`}>
        <Icon size={16} style={{ color: iconColor }} strokeWidth={2.4} />
      </div>
    </div>
    <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
      <span className="text-slate-400 truncate">{subtext}</span>
      {trend && (
        <span className={`inline-flex items-center font-bold font-mono ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
          {isPositive ? <ArrowUp size={10} strokeWidth={2.5} className="mr-0.5" /> : <ArrowDown size={10} strokeWidth={2.5} className="mr-0.5" />}
          {trend}
        </span>
      )}
    </div>
  </div>
);

/* ── Attendance Micro Pill ─────────────────────────────────────────────── */
const AttPill = ({ icon: Icon, label, value, color }) => (
  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${color}`}>
    <Icon size={10} strokeWidth={2.5} />
    <span>{fmtDay(value)}</span>
    <span className="opacity-75 font-normal text-[9px] hidden sm:inline">{label}</span>
  </span>
);

const EmployeePayslips = () => {
  const [previewHtml, setPreviewHtml] = useState(null);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [expandedId, setExpandedId] = useState(null);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 4 }, (_, i) => currentYear - i);

  const { data: payslipsRes, isLoading } = useQuery({
    queryKey: ["employeeMyPayslips", yearFilter],
    queryFn: () => api.get(`/payroll/my-payslips?year=${yearFilter}`).then((res) => res.data),
  });

  const payslips = payslipsRes?.data || payslipsRes?.payslips || [];
  const payslipsCount = payslips.length;

  const totalNetSalary = useMemo(
    () => payslips.reduce((sum, p) => sum + (p.netSalary || 0), 0),
    [payslips]
  );
  const totalGrossSalary = useMemo(
    () => payslips.reduce((sum, p) => sum + (p.grossSalary || p.earnings?.grossEarnings || 0), 0),
    [payslips]
  );
  const totalDeductions = useMemo(
    () => payslips.reduce((sum, p) => sum + (p.deductions?.totalDeductions || 0), 0),
    [payslips]
  );
  const avgNet = payslipsCount > 0 ? Math.round(totalNetSalary / payslipsCount) : 0;

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
    <div className="w-full font-sans pb-10 space-y-3.5 text-slate-900 dark:text-slate-100">

      {/* ── Header Banner ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#111C24] p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center flex-shrink-0 shadow-xs">
            <Receipt size={20} strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                My Payslips &amp; Financial Ledger
              </h1>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                Financial Year {yearFilter}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Access authenticated monthly salary slips, itemized earnings, statutory deductions, and PDF downloads.
            </p>
          </div>
        </div>

        {/* Year Filter Switcher */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-50 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 pl-2">Year:</span>
          <div className="relative">
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(Number(e.target.value))}
              className="appearance-none pl-2.5 pr-7 py-1 bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-2xs"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ── 4 Top KPI Stat Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <MetricCard
          label="Total Net Received"
          value={fmt(totalNetSalary)}
          subtext={`YTD Disbursed (${yearFilter})`}
          Icon={Wallet}
          iconBg="bg-amber-50 dark:bg-amber-950/40"
          iconColor="#D97706"
          accentBorder="bg-amber-500"
          trend="Net Pay"
          isPositive={true}
        />
        <MetricCard
          label="Total Gross Earnings"
          value={fmt(totalGrossSalary)}
          subtext={`Basic + Allowances`}
          Icon={DollarSign}
          iconBg="bg-emerald-50 dark:bg-emerald-950/40"
          iconColor="#059669"
          accentBorder="bg-emerald-500"
          trend="Earned"
          isPositive={true}
        />
        <MetricCard
          label="Total Deductions"
          value={fmt(totalDeductions)}
          subtext={`PF, PT, TDS & LOP`}
          Icon={MinusCircle}
          iconBg="bg-rose-50 dark:bg-rose-950/40"
          iconColor="#DB2777"
          accentBorder="bg-rose-500"
          trend="Deducted"
          isPositive={false}
        />
        <MetricCard
          label="Average Monthly Net"
          value={fmt(avgNet)}
          subtext={`${payslipsCount} Statements released`}
          Icon={TrendingUp}
          iconBg="bg-blue-50 dark:bg-blue-950/40"
          iconColor="#0284C7"
          accentBorder="bg-blue-500"
          trend={`${payslipsCount} Slips`}
          isPositive={true}
        />
      </div>

      {/* ── Main Salary Statements Card ───────────────────────────────── */}
      <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden flex flex-col">
        
        {/* Table/Card Header */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-2">
            <Receipt size={14} className="text-amber-500" />
            <h3 className="font-bold text-slate-900 dark:text-white text-xs tracking-wider uppercase">
              Monthly Disbursal Statements ({yearFilter})
            </h3>
          </div>
          <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-300 bg-white dark:bg-[#111C24] px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 shadow-2xs">
            {payslips.length} Statements
          </span>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
            <div className="w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-bold">Loading authenticated payslips...</p>
          </div>
        ) : payslips.length === 0 ? (
          /* Empty State */
          <div className="py-20 flex flex-col items-center justify-center text-center p-6 space-y-2.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-2xs">
              <Receipt size={22} strokeWidth={2} />
            </div>
            <p className="text-slate-900 dark:text-white font-bold text-sm">No Payslips Released Yet for {yearFilter}</p>
            <p className="text-slate-400 text-xs max-w-md">
              Your monthly salary slips will appear here once generated and released by the HR Department. You will receive an instant notification when a new statement is published.
            </p>
          </div>
        ) : (
          /* Full Table / Card View */
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
                <div key={ps._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  
                  {/* Summary Bar */}
                  <div className="p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    
                    {/* Pay Period & Status */}
                    <div className="flex items-center gap-3 min-w-[200px]">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center flex-shrink-0 shadow-2xs">
                        <Calendar size={18} />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 dark:text-white text-sm leading-tight">
                          {monthName} {ps.year}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9.5px] font-bold border capitalize ${
                              isPaid
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full mr-1 ${isPaid ? "bg-emerald-500" : "bg-amber-500"}`} />
                            {ps.status || "Generated"}
                          </span>
                          {ps.sentAt && (
                            <span className="text-[9.5px] text-slate-400">
                              · Released {new Date(ps.sentAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Attendance Snapshot Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 flex-1 max-w-xl">
                      <AttPill icon={UserCheck} label="Present" value={att.presentDays || 0} color="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400" />
                      <AttPill icon={UserX} label="Absent" value={att.absentDays || 0} color="bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400" />
                      <AttPill icon={Clock} label="Half Day" value={att.halfDays || 0} color="bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400" />
                      <AttPill icon={Umbrella} label="Paid Leave" value={att.paidLeaveDays || 0} color="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400" />
                      <AttPill icon={CalendarCheck} label="Payable" value={att.payableDays || 0} color="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400" />
                      {(att.lossOfPayDays || 0) > 0 && (
                        <span className="text-[9px] font-bold text-rose-500 px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40">
                          LOP: {fmtDay(att.lossOfPayDays)}d
                        </span>
                      )}
                    </div>

                    {/* Salary Metrics */}
                    <div className="flex items-center gap-4 sm:gap-6 justify-between sm:justify-start pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Gross</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300 font-mono text-xs">{fmt(gross)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Deductions</span>
                        <span className="font-bold text-rose-600 dark:text-rose-400 font-mono text-xs">{fmt(deductions)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">Take-Home</span>
                        <span className="font-black text-amber-600 dark:text-amber-400 font-mono text-sm sm:text-base">{fmt(net)}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center flex-shrink-0">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : ps._id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer border ${
                          isExpanded
                            ? "bg-slate-900 text-white dark:bg-slate-800 border-slate-900 dark:border-slate-700"
                            : "bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        <ChevronDown size={12} className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                        <span>{isExpanded ? "Hide" : "Breakdown"}</span>
                      </button>

                      <button
                        onClick={() => previewPayslip(ps._id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                        title="View Full Salary Slip"
                      >
                        <Eye size={12} strokeWidth={2.5} />
                        <span>View</span>
                      </button>

                      <button
                        onClick={() => downloadPDF(ps._id, monthName, ps.year)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 rounded-xl text-xs font-extrabold transition-all shadow-2xs cursor-pointer"
                        title="Download Authenticated PDF"
                      >
                        <Download size={12} strokeWidth={2.5} />
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
                        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center">
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
                      <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-200 dark:border-amber-800/60 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
                            Net Take-Home Pay Disbursed
                          </span>
                          <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                            {ps.amountInWords || `${fmt(net)} Only`}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
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
          <span>Showing {payslips.length} salary statement{payslips.length === 1 ? "" : "s"} for FY {yearFilter}</span>
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
                  className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold text-xs rounded-xl shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
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
