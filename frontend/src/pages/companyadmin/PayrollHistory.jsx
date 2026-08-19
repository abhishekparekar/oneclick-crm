import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/api";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import {
  Search, DollarSign, Download, Eye, FileText,
  Wallet, MinusCircle, ArrowUp, ArrowDown, X,
  Receipt, Check, Send, MailCheck, BellRing,
  UserCheck, UserX, Clock, Umbrella, CalendarCheck, Calculator, Printer
} from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

const getPhotoUrl = (rawPhoto) => {
  if (!rawPhoto) return null;
  return rawPhoto.startsWith("http") || rawPhoto.startsWith("data:")
    ? rawPhoto
    : `${(import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace("/api", "")}${rawPhoto.startsWith("/") ? "" : "/"}${rawPhoto}`;
};

const fmt = (n) => `\u20B9 ${(Number(n) || 0).toLocaleString("en-IN")}`;
const fmtDay = (v) => { const n = Number(v) || 0; return n % 1 === 0 ? String(n) : n.toFixed(1); };

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const KPICard = ({ label, value, trend, isUp, period, strokeColor, Icon, iconBg, iconColor, accentBorder }) => {
  const sparkData = useMemo(() => [
    { v: 12 }, { v: 18 }, { v: 14 }, { v: 22 }, { v: 19 }, { v: 28 }, { v: 24 }, { v: 34 },
  ], []);
  return (
    <div className="relative bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 px-3.5 py-3 shadow-2xs hover:shadow-xs transition-all overflow-hidden flex items-center justify-between group">
      <div className={`absolute top-0 left-0 right-0 h-[2.5px] ${accentBorder}`} />
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-center gap-1.5 mb-1">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${iconBg} flex-shrink-0 shadow-2xs`}>
            <Icon size={13} style={{ color: iconColor }} strokeWidth={2.4} />
          </div>
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">{label}</span>
        </div>
        <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight mb-0.5 truncate">{value}</h3>
        <div className="flex items-center gap-1 text-[10px]">
          <span className={`inline-flex items-center font-bold ${isUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
            {isUp ? <ArrowUp size={9} strokeWidth={2.5}/> : <ArrowDown size={9} strokeWidth={2.5}/>}{trend}
          </span>
          <span className="text-slate-400 text-[9.5px] truncate">&middot; {period}</span>
        </div>
      </div>
      <div className="hidden sm:block h-9 w-14 opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none flex-shrink-0">
        <AreaChart width={56} height={36} data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`sk-pay-${label.replace(/\s+/g, "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={0.35}/>
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={strokeColor} strokeWidth={2.2} fill={`url(#sk-pay-${label.replace(/\s+/g, "")})`}/>
        </AreaChart>
      </div>
    </div>
  );
};

const AttChip = ({ icon: Icon, value, color, title }) => (
  <span title={title} className={`inline-flex items-center gap-0.5 text-[9.5px] font-bold px-1.5 py-0.5 rounded ${color}`}>
    <Icon size={9} strokeWidth={2.5} />{fmtDay(value)}
  </span>
);

const AVATAR_BG = [
  "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
];
const getAvatarClass = (name) => AVATAR_BG[(name?.charCodeAt(0) || 0) % AVATAR_BG.length];

const ConfirmSendDialog = ({ employee, onConfirm, onCancel, isPending }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
    <div className="bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
          <Send size={18} />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Send Payslip?</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">This will release the payslip to the employee portal.</p>
        </div>
      </div>
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
        <p className="text-xs font-bold text-slate-900 dark:text-white">{employee}</p>
        <p className="text-[10px] text-slate-500 mt-0.5">A notification will be sent. The employee can view and download this payslip from their portal.</p>
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer">Cancel</button>
        <button onClick={onConfirm} disabled={isPending} className="flex-1 py-2 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5">
          <Send size={12} />{isPending ? "Sending..." : "Send Now"}
        </button>
      </div>
    </div>
  </div>
);

const ConfirmBulkDialog = ({ count, monthLabel, onConfirm, onCancel, isPending }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
    <div className="bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
          <BellRing size={18} />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Bulk Send Payslips?</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Release payslips for {count} employee(s).</p>
        </div>
      </div>
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3">
        <p className="text-[10px] text-amber-700 dark:text-amber-300 font-medium">
          All {count} payslips for {monthLabel} will be released simultaneously. Each employee will receive a notification.
        </p>
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer">Cancel</button>
        <button onClick={onConfirm} disabled={isPending} className="flex-1 py-2 text-xs font-extrabold text-amber-950 bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5">
          <Send size={12} />{isPending ? "Sending..." : `Send to All ${count}`}
        </button>
      </div>
    </div>
  </div>
);

const PayrollHistory = () => {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [previewHtml, setPreviewHtml] = useState(null);
  const [confirmSend, setConfirmSend] = useState(null);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  const [y, m] = month.split("-");
  const monthLabel = MONTH_NAMES[(parseInt(m, 10) || 1) - 1] || m;

  const { data: payrollRes, isLoading } = useQuery({
    queryKey: ["payrolls", y, m, statusFilter],
    queryFn: () => api.get(`/payroll/company?month=${parseInt(m, 10)}&year=${parseInt(y, 10)}${statusFilter ? `&status=${statusFilter}` : ""}`)
  });
  const payrolls = payrollRes?.data?.data || [];

  const markPaidMutation = useMutation({
    mutationFn: (id) => api.patch(`/payroll/${id}/mark-paid`),
    onSuccess: () => { queryClient.invalidateQueries(["payrolls"]); toast.success("Payroll marked as paid!"); },
    onError: () => toast.error("Failed to mark as paid")
  });

  const sendPayslipMutation = useMutation({
    mutationFn: (id) => api.post(`/payroll/${id}/send`),
    onSuccess: (res) => {
      queryClient.invalidateQueries(["payrolls"]);
      toast.success(res?.data?.message || "Payslip sent to employee!");
      setConfirmSend(null);
    },
    onError: () => { toast.error("Failed to send payslip"); setConfirmSend(null); }
  });

  const bulkSendMutation = useMutation({
    mutationFn: () => api.post(`/payroll/company/bulk-send`, { month: parseInt(m, 10), year: parseInt(y, 10) }),
    onSuccess: (res) => {
      queryClient.invalidateQueries(["payrolls"]);
      toast.success(res?.data?.message || "All payslips dispatched!");
      setShowBulkConfirm(false);
    },
    onError: () => { toast.error("Failed to bulk send"); setShowBulkConfirm(false); }
  });

  const downloadPDF = async (id, employeeCode, monthStr) => {
    try {
      const response = await api.get(`/payroll/${id}/payslip-pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Payslip_${employeeCode}_${monthStr}.pdf`);
      document.body.appendChild(link); link.click(); link.parentNode.removeChild(link);
      toast.success("Payslip PDF downloaded!");
    } catch { toast.error("Failed to download PDF payslip."); }
  };

  const previewPayslip = async (id) => {
    try {
      const res = await api.get(`/payroll/${id}/payslip-preview`);
      setPreviewHtml(res.data);
    } catch { toast.error("Failed to preview payslip."); }
  };

  const filteredPayrolls = payrolls.filter(p => {
    if (!p.employeeSnapshot) return true;
    return `${p.employeeSnapshot.employeeName} ${p.employeeSnapshot.employeeCode} ${p.employeeSnapshot.department || ""}`.toLowerCase().includes(search.toLowerCase());
  });

  const getDisplayGross = (p) => p.grossSalary > 0 ? p.grossSalary : (p.netSalary || 0);
  const totalNet = filteredPayrolls.reduce((s, p) => s + (p.netSalary || 0), 0);
  const totalGross = filteredPayrolls.reduce((s, p) => s + getDisplayGross(p), 0);
  const totalDeductions = filteredPayrolls.reduce((s, p) => s + (p.deductions?.totalDeductions || 0), 0);
  const sentCount = payrolls.filter(p => p.sentToEmployee).length;
  const unsentPayrolls = payrolls.filter(p => !p.sentToEmployee);

  const exportToCSV = () => {
    if (!filteredPayrolls.length) { toast.error("No records to export"); return; }
    const headers = ["Code","Name","Dept","Month","Present","Absent","HalfDay","LOP","Payable","Gross","Deductions","Net","Status","Sent"];
    const rows = filteredPayrolls.map(p => {
      const att = p.attendanceSummary || {};
      return [
        p.employeeSnapshot?.employeeCode || "", `"${p.employeeSnapshot?.employeeName || ""}"`,
        `"${p.employeeSnapshot?.department || ""}"`, `${p.month}-${p.year}`,
        att.presentDays || 0, att.absentDays || 0, att.halfDays || 0,
        att.lossOfPayDays || 0, att.payableDays || 0,
        getDisplayGross(p), p.deductions?.totalDeductions || 0, p.netSalary || 0,
        p.status, p.sentToEmployee ? "Yes" : "No"
      ].join(",");
    });
    const csv = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const a = document.createElement("a");
    a.setAttribute("href", encodeURI(csv));
    a.setAttribute("download", `Salary_Report_${month}.csv`);
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast.success("CSV exported!");
  };

  const isHR = window.location.pathname.startsWith("/hr");

  return (
    <div className="space-y-3 max-w-7xl mx-auto pb-8 flex flex-col font-sans text-slate-900 dark:text-slate-100">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#111C24] p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">Payroll History &amp; Disbursals</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 uppercase">{monthLabel} {y}</span>
            {sentCount > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">{sentCount}/{payrolls.length} Sent</span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Audit salary statements, preview/download payslips, and dispatch to staff.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {unsentPayrolls.length > 0 && (
            <button onClick={() => setShowBulkConfirm(true)} className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-extrabold rounded-xl text-xs hover:bg-blue-100 transition-all shadow-2xs cursor-pointer">
              <Send size={13} strokeWidth={2.4} /><span>Send All ({unsentPayrolls.length})</span>
            </button>
          )}
          <button onClick={exportToCSV} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-50 transition-all shadow-2xs cursor-pointer">
            <Download size={13} className="text-slate-400" /><span>Export CSV</span>
          </button>
          <Link to={isHR ? "/hr/payroll/generate" : "/company/payroll/generate"} className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs shadow-2xs transition-all">
            <Calculator size={14} strokeWidth={2.5} /><span>Run Payroll</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <KPICard label="Net Disbursed" value={fmt(totalNet)} trend="Payout" isUp period={monthLabel} strokeColor="#EAB308" Icon={Wallet} iconBg="bg-amber-50 dark:bg-amber-950/40" iconColor="#D97706" accentBorder="bg-amber-500" />
        <KPICard label="Total Gross" value={fmt(totalGross)} trend="Earned" isUp period="gross" strokeColor="#10B981" Icon={DollarSign} iconBg="bg-emerald-50 dark:bg-emerald-950/40" iconColor="#059669" accentBorder="bg-emerald-500" />
        <KPICard label="Deductions" value={fmt(totalDeductions)} trend="PF+Taxes" isUp period="deducted" strokeColor="#EC4899" Icon={MinusCircle} iconBg="bg-rose-50 dark:bg-rose-950/40" iconColor="#DB2777" accentBorder="bg-rose-500" />
        <KPICard label="Payslips Sent" value={`${sentCount} / ${payrolls.length}`} trend="Released" isUp period="to employees" strokeColor="#06B6D4" Icon={MailCheck} iconBg="bg-blue-50 dark:bg-blue-950/40" iconColor="#0284C7" accentBorder="bg-blue-500" />
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs flex flex-col">
        {/* Toolbar */}
        <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              <input type="text" placeholder="Search employee, code, department..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">Month:</span>
              <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs cursor-pointer" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-slate-100 dark:border-slate-800">
            {[
              { key: "", label: "All", count: payrolls.length },
              { key: "paid", label: "Paid", count: payrolls.filter(p => p.status === "paid").length },
              { key: "generated", label: "Generated", count: payrolls.filter(p => p.status === "generated").length },
              { key: "cancelled", label: "Cancelled", count: payrolls.filter(p => p.status === "cancelled").length },
            ].map((chip) => {
              const isSelected = statusFilter === chip.key;
              return (
                <button key={chip.key} onClick={() => setStatusFilter(chip.key)} className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${isSelected ? "bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 shadow-2xs" : "bg-white dark:bg-[#111C24] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                  <span>{chip.label}</span>
                  <span className={`px-1.5 rounded-md text-[10px] font-extrabold ${isSelected ? "bg-white/20 text-white dark:bg-slate-950/20 dark:text-slate-950" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>{chip.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        {/* ── Table & Cards Container ── */}
        <div>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
              <div className="w-8 h-8 border-[3px] border-amber-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-bold">Loading payroll disbursals...</p>
            </div>
          ) : filteredPayrolls.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Receipt size={36} className="mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No payroll entries for {monthLabel} {y}</p>
              <p className="text-[11px] text-slate-400">Generate salary entries for this billing period.</p>
              <div className="pt-2">
                <Link to={isHR ? "/hr/payroll/generate" : "/company/payroll/generate"} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs shadow-2xs transition-all">
                  <Calculator size={13} strokeWidth={2.5} /><span>Generate Payroll for {monthLabel} {y}</span>
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* ── Mobile Cards Layout (<md Screens) ──────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 md:hidden">
                {filteredPayrolls.map((p, idx) => {
                  const empName = p.employeeSnapshot?.employeeName || (p.employeeId?.firstName ? `${p.employeeId.firstName} ${p.employeeId.lastName}` : "Employee");
                  const empCode = p.employeeSnapshot?.employeeCode || p.employeeId?.employeeCode || "-";
                  const dept = p.employeeSnapshot?.department || p.employeeId?.departmentId?.name || "General";
                  const rawPhoto = p.employeeSnapshot?.photo || p.employeeId?.photo || p.employeeId?.documents?.photo || p.employeeId?.userId?.profileImage || null;
                  const photoUrl = getPhotoUrl(rawPhoto);
                  const isPaid = p.status === "paid";
                  const isSent = p.sentToEmployee;
                  const att = p.attendanceSummary || {};
                  const payable = att.payableDays || 0;
                  const calDays = att.totalCalendarDays || 30;
                  const lop = att.lossOfPayDays || 0;

                  return (
                    <div
                      key={`mob-${p._id || "pay"}-${idx}`}
                      className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#111C24] shadow-2xs space-y-3"
                    >
                      {/* Top Employee & Status Row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {photoUrl ? (
                            <img
                              src={photoUrl}
                              alt={empName}
                              className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0"
                              onError={(e) => { e.target.onerror = null; e.target.style.display = "none"; }}
                            />
                          ) : (
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 shadow-2xs ${getAvatarClass(empName)}`}>
                              {empName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-extrabold text-slate-900 dark:text-white text-xs truncate leading-tight">{empName}</p>
                            <p className="text-[10px] text-slate-400 font-bold truncate mt-0.5">{empCode} • {dept}</p>
                          </div>
                        </div>

                        <span className={`inline-flex items-center px-2 py-0.5 text-[9.5px] font-extrabold rounded-full border capitalize shrink-0 ${isPaid ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" : p.status === "cancelled" ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800" : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1 ${isPaid ? "bg-emerald-500" : p.status === "cancelled" ? "bg-rose-500" : "bg-amber-500"}`} />
                          {p.status || "Generated"}
                        </span>
                      </div>

                      {/* Net Salary Hero Pill */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                        <div>
                          <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">Net Take-Home</span>
                          <span className="text-base font-black text-amber-600 dark:text-amber-400 font-mono">{fmt(p.netSalary || 0)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9.5px] font-bold text-slate-400 block">Gross / Deductions</span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">{fmt(getDisplayGross(p))} / <span className="text-rose-500">{fmt(p.deductions?.totalDeductions || 0)}</span></span>
                        </div>
                      </div>

                      {/* Clean Attendance Summary Badge */}
                      <div className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-xl bg-slate-100/60 dark:bg-slate-800/40">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Attendance:</span>
                        <div className="flex items-center gap-1.5 text-[10.5px]">
                          <span className="font-extrabold text-slate-800 dark:text-slate-200">{fmtDay(payable)} / {calDays}d</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">{fmtDay(att.presentDays || 0)}P</span>
                          {lop > 0 && (
                            <span className="text-[9.5px] font-extrabold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-1 rounded">-{fmtDay(lop)} LOP</span>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                        <div>
                          {isSent ? (
                            <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 px-2 py-0.5 rounded-md">
                              <MailCheck size={10} />Sent
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9.5px] font-medium text-slate-400 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-md">
                              <Clock size={9} />Unsent
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {!isPaid && (
                            <button
                              onClick={() => markPaidMutation.mutate(p._id)}
                              disabled={markPaidMutation.isPending}
                              className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                            >
                              <Check size={11} strokeWidth={2.5} />Pay
                            </button>
                          )}
                          <button
                            onClick={() => setConfirmSend({ id: p._id, name: empName })}
                            className={`p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer ${isSent ? "text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40" : "text-slate-500 hover:text-blue-600 hover:bg-blue-50"}`}
                            title="Send Payslip"
                          >
                            <Send size={13} />
                          </button>
                          <button
                            onClick={() => previewPayslip(p._id)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                            title="Preview Payslip"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            onClick={() => downloadPDF(p._id, empCode, p.month)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                            title="Download PDF"
                          >
                            <Download size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Desktop Table (>=md Screens) ───────────────────────────── */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3">Team Member</th>
                      <th className="px-3 py-3 text-center">Attendance Summary</th>
                      <th className="px-3 py-3 text-right">Gross</th>
                      <th className="px-3 py-3 text-right">Deductions</th>
                      <th className="px-3 py-3 text-right">Net Take-Home</th>
                      <th className="px-3 py-3 text-center">Pay Status</th>
                      <th className="px-3 py-3 text-center">Delivery</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {filteredPayrolls.map((p, idx) => {
                      const empName = p.employeeSnapshot?.employeeName || (p.employeeId?.firstName ? `${p.employeeId.firstName} ${p.employeeId.lastName}` : "Employee");
                      const empCode = p.employeeSnapshot?.employeeCode || p.employeeId?.employeeCode || "-";
                      const dept = p.employeeSnapshot?.department || p.employeeId?.departmentId?.name || "General";
                      const rawPhoto = p.employeeSnapshot?.photo || p.employeeId?.photo || p.employeeId?.documents?.photo || p.employeeId?.userId?.profileImage || null;
                      const photoUrl = getPhotoUrl(rawPhoto);
                      const isPaid = p.status === "paid";
                      const isSent = p.sentToEmployee;
                      const att = p.attendanceSummary || {};
                      const payable = att.payableDays || 0;
                      const calDays = att.totalCalendarDays || 30;
                      const lop = att.lossOfPayDays || 0;

                      return (
                        <tr key={`${p._id || "pay"}-${idx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors group">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2.5">
                              {photoUrl ? (
                                <img
                                  src={photoUrl}
                                  alt={empName}
                                  className="w-8 h-8 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0"
                                  onError={(e) => { e.target.onerror = null; e.target.style.display = "none"; }}
                                />
                              ) : (
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-2xs ${getAvatarClass(empName)}`}>
                                  {empName.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white leading-tight">{empName}</p>
                                <p className="text-[10px] text-slate-400 font-medium">{empCode} · {dept}</p>
                              </div>
                            </div>
                          </td>

                          {/* Redesigned Clean Executive Attendance Column */}
                          <td className="px-3 py-2.5 text-center">
                            <div className="inline-flex flex-col items-center justify-center">
                              <div className="flex items-center gap-1">
                                <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
                                  {fmtDay(payable)}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400">
                                  / {calDays}d
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-[9.5px] font-semibold text-slate-400 mt-0.5">
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{fmtDay(att.presentDays || 0)}P</span>
                                <span>•</span>
                                <span>{fmtDay((att.paidLeaveDays || 0) + (att.weeklyOffDays || 0) + (att.holidayDays || 0))}Off</span>
                                {lop > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="text-rose-600 dark:text-rose-400 font-extrabold">-{fmtDay(lop)} LOP</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-3 py-2.5 text-right font-bold text-slate-700 dark:text-slate-300 font-mono">{fmt(getDisplayGross(p))}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-rose-600 dark:text-rose-400 font-mono">{fmt(p.deductions?.totalDeductions || 0)}</td>
                          <td className="px-3 py-2.5 text-right font-black text-amber-600 dark:text-amber-400 font-mono text-sm">{fmt(p.netSalary || 0)}</td>

                          <td className="px-3 py-2.5 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full border capitalize ${isPaid ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" : p.status === "cancelled" ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800" : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800"}`}>
                              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isPaid ? "bg-emerald-500" : p.status === "cancelled" ? "bg-rose-500" : "bg-amber-500"}`} />
                              {p.status || "Generated"}
                            </span>
                          </td>

                          <td className="px-3 py-2.5 text-center">
                            {isSent ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 px-2 py-0.5 rounded-md">
                                  <MailCheck size={10} />Sent &#10003;
                                </span>
                                {p.sentAt && <p className="text-[9px] text-slate-400">{new Date(p.sentAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</p>}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-md">
                                <Clock size={9} />Pending
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {!isPaid && (
                                <button onClick={() => markPaidMutation.mutate(p._id)} disabled={markPaidMutation.isPending} title="Mark as Paid" className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 rounded-lg text-[10.5px] font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1">
                                  <Check size={10} strokeWidth={2.5} />Pay
                                </button>
                              )}
                              <button onClick={() => setConfirmSend({ id: p._id, name: empName })} title={isSent ? "Resend Payslip" : "Send Payslip to Employee"} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isSent ? "text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"}`}>
                                <Send size={13} />
                              </button>
                              <button onClick={() => previewPayslip(p._id)} title="Preview Payslip" className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer">
                                <Eye size={14} />
                              </button>
                              <button onClick={() => downloadPDF(p._id, empCode, p.month)} title="Download PDF" className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer">
                                <Download size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
        <div className="flex justify-between items-center text-xs text-slate-400 font-medium px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30">
          <span>Showing {filteredPayrolls.length} of {payrolls.length} records &middot; {sentCount} sent</span>
          <span>HR Compensation Ledger</span>
        </div>
      </div>

      {/* Preview Modal */}
      {previewHtml && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-xs font-sans animate-fadeIn">
          <div className="bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[94vh] flex flex-col overflow-hidden animate-scaleUp">
            <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-900 text-white dark:bg-[#0B132B]">
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
                    const w = window.open("", "_blank");
                    w.document.write(previewHtml);
                    w.document.close();
                    w.focus();
                    setTimeout(() => { w.print(); }, 250);
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
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-100 dark:bg-slate-950 flex justify-center">
              <div
                className="bg-white text-slate-900 rounded-xl shadow-md border border-slate-200/80 w-full max-w-4xl overflow-hidden"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>
        </div>
      )}

      {confirmSend && (
        <ConfirmSendDialog
          employee={confirmSend.name}
          onConfirm={() => sendPayslipMutation.mutate(confirmSend.id)}
          onCancel={() => setConfirmSend(null)}
          isPending={sendPayslipMutation.isPending}
        />
      )}

      {showBulkConfirm && (
        <ConfirmBulkDialog
          count={unsentPayrolls.length}
          monthLabel={`${monthLabel} ${y}`}
          onConfirm={() => bulkSendMutation.mutate()}
          onCancel={() => setShowBulkConfirm(false)}
          isPending={bulkSendMutation.isPending}
        />
      )}
    </div>
  );
};

export default PayrollHistory;
