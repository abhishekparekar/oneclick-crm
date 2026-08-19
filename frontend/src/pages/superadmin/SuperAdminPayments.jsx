import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPaymentsApi, getCompaniesApi, getPlansApi,
  createManualPaymentApi, updatePaymentStatusApi
} from "../../api/superAdminApi";
import DataTable from "../../components/common/DataTable";
import {
  Search, Plus, Download, DollarSign, TrendingUp, CreditCard,
  CheckCircle, CheckCircle2, XCircle, RotateCcw, AlertCircle, Clock,
  Building2, FileText, Check, ExternalLink, RefreshCw
} from "lucide-react";
import { useNavigate } from "react-router-dom";

/* ─── Palette-Enforced Payment Status Badge ────────────────────────────── */
const PaymentRecordBadge = ({ status }) => {
  const badgeStyles = {
    paid: { bg: "bg-[#fbbf24]/15", text: "text-[#fbbf24]", border: "border-[#fbbf24]/30", label: "Paid & Cleared", icon: CheckCircle2 },
    pending: { bg: "bg-[#06B6D4]/15", text: "text-[#06B6D4]", border: "border-[#06B6D4]/30", label: "Pending Clearance", icon: Clock },
    failed: { bg: "bg-sa-bg", text: "text-sa-text-secondary", border: "border-sa-border/30", label: "Failed / Declined", icon: XCircle },
    refunded: { bg: "bg-[#f59e0b]/15", text: "text-[#f59e0b]", border: "border-[#f59e0b]/30", label: "Refunded", icon: RotateCcw },
  };
  const current = badgeStyles[status] || badgeStyles.pending;
  const Icon = current.icon;
  return (
    <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${current.bg} ${current.text} ${current.border}`}>
      <Icon size={11} className="flex-shrink-0" />
      <span>{current.label}</span>
    </span>
  );
};

/* ─── Top Financial Summary Card ───────────────────────────────────────── */
const PaymentKpiCard = ({ title, amount, subtitle, icon: Icon, grad = ["#d97706", "#f59e0b"], active, onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-sa-surface rounded-2xl p-4 border transition-all cursor-pointer flex items-center justify-between shadow-xs ${
      active ? "border-[#f59e0b] ring-2 ring-[#f59e0b]/20 shadow-md" : "border-sa-border hover:border-sa-border/80 hover:bg-sa-bg/30"
    }`}
  >
    <div>
      <p className="text-[10px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1">{title}</p>
      <div className="flex items-baseline space-x-1.5">
        <h4 className="text-2xl font-black text-sa-text tracking-tight leading-none">{amount}</h4>
        {subtitle && <span className="text-[10px] font-bold text-sa-text-secondary">{subtitle}</span>}
      </div>
    </div>
    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
      style={{ background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})` }}>
      <Icon size={18} className="text-white" />
    </div>
  </div>
);

const MOCK_PAYMENTS = [
  {
    _id: "pay_01",
    invoiceNo: "INV-2026-001",
    companyId: { _id: "comp_101", companyName: "Acme Corporation Global" },
    planId: { planName: "Enterprise" },
    amount: 150000,
    paymentMode: "netbanking",
    transactionId: "TXN98423001882",
    status: "paid",
    createdAt: "2026-07-01T10:30:00Z"
  },
  {
    _id: "pay_02",
    invoiceNo: "INV-2026-002",
    companyId: { _id: "comp_102", companyName: "TechSphere Solutions Pvt Ltd" },
    planId: { planName: "Pro" },
    amount: 50000,
    paymentMode: "upi",
    transactionId: "UPI77129003445",
    status: "paid",
    createdAt: "2026-07-02T14:15:00Z"
  },
  {
    _id: "pay_03",
    invoiceNo: "INV-2026-003",
    companyId: { _id: "comp_103", companyName: "Nexus Innovation Labs" },
    planId: { planName: "Basic" },
    amount: 20000,
    paymentMode: "credit_card",
    transactionId: "CC441299881023",
    status: "paid",
    createdAt: "2026-07-03T11:00:00Z"
  },
  {
    _id: "pay_04",
    invoiceNo: "INV-2026-004",
    companyId: { _id: "comp_104", companyName: "Starlight Retail Ventures" },
    planId: { planName: "Enterprise" },
    amount: 150000,
    paymentMode: "bank_transfer",
    transactionId: "NEFT8834991002",
    status: "pending",
    createdAt: "2026-07-05T09:20:00Z"
  },
  {
    _id: "pay_05",
    invoiceNo: "INV-2026-005",
    companyId: { _id: "comp_106", companyName: "Apex Logistics India" },
    planId: { planName: "Basic" },
    amount: 20000,
    paymentMode: "netbanking",
    transactionId: "TXN11200399441",
    status: "failed",
    createdAt: "2026-07-06T16:45:00Z"
  }
];

const SuperAdminPayments = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    companyId: "",
    planId: "",
    amount: 0,
    billingCycle: "monthly",
    paymentMode: "netbanking",
    transactionId: "",
    status: "paid"
  });

  const { data: paymentsData, isLoading } = useQuery({ queryKey: ["superAdminPayments"], queryFn: () => getPaymentsApi() });
  const { data: companiesData } = useQuery({ queryKey: ["superAdminCompanies"], queryFn: () => getCompaniesApi() });
  const { data: plansData } = useQuery({ queryKey: ["superAdminPlans"], queryFn: () => getPlansApi() });

  const rawPayments = Array.isArray(paymentsData?.data) ? paymentsData?.data : (paymentsData?.data?.payments || []);
  const payments = rawPayments;
  const companies = companiesData?.data?.companies || [];
  const plans = plansData?.data?.plans || [];

  const filteredPayments = payments.filter((payment) => {
    const companyName = payment.companyId?.companyName || "";
    const invoiceNo = payment.invoiceNo || "";
    const txnId = payment.transactionId || "";
    const matchesSearch = companyName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          txnId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // KPI Calculations
  const totalRevenue = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const paidRevenue = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const pendingRevenue = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  
  const now = new Date();
  const monthlyRevenue = payments.filter(p => {
    if (p.status !== 'paid' || !p.paidAt) return false;
    const paidDate = new Date(p.paidAt);
    return paidDate.getMonth() === now.getMonth() && paidDate.getFullYear() === now.getFullYear();
  }).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const pendingPayments = payments.filter(p => p.status === 'pending').length;
  const failedPayments = payments.filter(p => p.status === 'failed').length;
  const refundedPayments = payments.filter(p => p.status === 'refunded').length;

  const createMutation = useMutation({
    mutationFn: createManualPaymentApi,
    onSuccess: () => { queryClient.invalidateQueries(["superAdminPayments"]); setIsModalOpen(false); },
    onError: (err) => alert(err.response?.data?.message || "Failed to record payment")
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => updatePaymentStatusApi(id, status),
    onSuccess: () => queryClient.invalidateQueries(["superAdminPayments"]),
    onError: (err) => alert(err.response?.data?.message || "Failed to update payment status")
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleUpdateStatus = (id, newStatus) => {
    if (window.confirm(`Are you sure you want to change this payment transaction status to ${newStatus.toUpperCase()}?`)) {
      updateStatusMutation.mutate({ id, status: newStatus });
    }
  };

  const handleDownload = (invoiceNo) => {
    alert(`Downloading Invoice ${invoiceNo || 'Document'} as PDF...`);
  };

  /* ─── Table Columns Definition ───────────────────────────────────────── */
  const columns = [
    {
      header: "Invoice & Reference",
      accessor: "invoiceNo",
      render: (row) => (
        <div className="py-1">
          <span className="inline-block px-2.5 py-1 rounded-lg bg-[#f59e0b]/10 border border-[#f59e0b]/30 text-xs font-mono font-black text-[#f59e0b] tracking-wider mb-1">
            {row.invoiceNo || 'INV-00000'}
          </span>
          <p className="text-[10px] font-mono font-bold text-sa-text-secondary flex items-center gap-1">
            <span>TXN:</span> <span className="text-sa-text font-semibold">{row.transactionId || "MANUAL-REC"}</span>
          </p>
        </div>
      )
    },
    {
      header: "Tenant Workspace & Plan",
      accessor: "company",
      render: (row) => (
        <div className="flex items-center space-x-3 py-1">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0 shadow-xs"
            style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}>
            {(row.companyId?.companyName || "C").substring(0, 2).toUpperCase()}
          </div>
          <div>
            <span 
              onClick={() => navigate(`/superadmin/companies/${row.companyId?._id || row.companyId}`)}
              className="text-xs font-black text-sa-text hover:text-[#f59e0b] transition-colors cursor-pointer flex items-center gap-1 block leading-tight"
            >
              <span>{row.companyId?.companyName || "Unknown Tenant Workspace"}</span>
              <ExternalLink size={11} className="text-[#f59e0b] opacity-70" />
            </span>
            <span className="text-[10px] font-extrabold text-sa-text-secondary mt-0.5 inline-block px-1.5 py-0.5 rounded bg-sa-bg border border-sa-border/30 uppercase tracking-wider">
              {row.planId?.planName || "Custom Plan"} • <span className="text-[#f59e0b] font-black">{row.billingCycle || "monthly"}</span>
            </span>
          </div>
        </div>
      )
    },
    {
      header: "Amount Collected",
      accessor: "amount",
      render: (row) => (
        <div className="py-1 flex items-center space-x-1.5">
          <div className="w-6 h-6 rounded-md bg-[#fbbf24]/15 text-[#fbbf24] flex items-center justify-center font-bold">
            <DollarSign size={13} />
          </div>
          <span className="text-sm font-black text-sa-text">${(Number(row.amount) || 0).toLocaleString()}</span>
        </div>
      )
    },
    {
      header: "Payment Method & Date",
      accessor: "date",
      render: (row) => (
        <div className="py-1 space-y-0.5">
          <div className="inline-flex items-center space-x-1.5 text-xs font-extrabold text-sa-text uppercase tracking-wider">
            <CreditCard size={13} className="text-[#06B6D4]" />
            <span>{row.paymentMode || 'Netbanking'}</span>
          </div>
          <p className="text-[11px] font-bold text-sa-text-secondary">
            {row.paidAt ? new Date(row.paidAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : (row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—')}
          </p>
        </div>
      )
    },
    {
      header: "Transaction Status",
      accessor: "status",
      render: (row) => <PaymentRecordBadge status={row.status} />
    },
    {
      header: "Ledger Actions",
      accessor: "actions",
      render: (row) => (
        <div className="flex items-center space-x-1.5">
          {row.status !== 'paid' && (
            <button
              type="button"
              onClick={() => handleUpdateStatus(row._id, 'paid')}
              className="p-1.5 rounded-lg bg-[#fbbf24]/10 border border-[#fbbf24]/30 text-[#fbbf24] hover:bg-[#fbbf24]/20 transition-all"
              title="Verify & Mark as Paid (Cleared)"
            >
              <CheckCircle2 size={14} />
            </button>
          )}
          {row.status === 'paid' && (
            <button
              type="button"
              onClick={() => handleUpdateStatus(row._id, 'refunded')}
              className="p-1.5 rounded-lg bg-[#f59e0b]/10 border border-[#f59e0b]/30 text-[#f59e0b] hover:bg-[#f59e0b]/20 transition-all"
              title="Process Ledger Refund"
            >
              <RotateCcw size={14} />
            </button>
          )}
          {row.status === 'pending' && (
            <button
              type="button"
              onClick={() => handleUpdateStatus(row._id, 'failed')}
              className="p-1.5 rounded-lg bg-sa-bg border border-sa-border/30 text-sa-text-secondary hover:text-rose-500 hover:border-rose-300 transition-all"
              title="Mark Transaction as Failed / Declined"
            >
              <XCircle size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={() => handleDownload(row.invoiceNo)}
            className="p-1.5 rounded-lg bg-sa-surface border border-sa-border/30 text-sa-text hover:border-[#f59e0b] hover:text-[#f59e0b] transition-all flex items-center space-x-1"
            title="Download PDF Invoice Receipt"
          >
            <Download size={14} />
          </button>
        </div>
      )
    }
  ];

  /* ─── Render Page ────────────────────────────────────────────────────── */
  return (
    <div className="space-y-3 sm:space-y-3.5 w-full pb-12">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2.5 border-b border-sa-border/30">
        <div>
          <h1 className="text-2xl font-black text-sa-text tracking-tight">Payments & Billing Ledger</h1>
          <p className="text-xs text-sa-text-secondary mt-0.5">Monitor platform recurring revenue, transaction history, invoices, and manual payment entries.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)} 
          className="px-4 py-2.5 rounded-xl text-xs font-black text-white shadow-sm transition-all hover:opacity-90 flex items-center space-x-2 cursor-pointer active:scale-95"
          style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}
        >
          <Plus size={15} />
          <span>Record Manual Payment</span>
        </button>
      </div>

      {/* Financial KPI Bar (5 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
        <PaymentKpiCard 
          title="Total Platform Revenue" 
          amount={`$${totalRevenue.toLocaleString()}`} 
          subtitle="Lifetime cleared" 
          icon={DollarSign} 
          grad={["#d97706", "#f59e0b"]} 
          active={statusFilter === "all"} 
          onClick={() => setStatusFilter("all")} 
        />
        <PaymentKpiCard 
          title="Paid & Settled" 
          amount={`$${paidRevenue.toLocaleString()}`} 
          subtitle={`${payments.filter(p => p.status === 'paid').length} Transactions`} 
          icon={CheckCircle} 
          grad={["#059669", "#10b981"]} 
          active={statusFilter === "paid"} 
          onClick={() => setStatusFilter("paid")} 
        />
        <PaymentKpiCard 
          title="Pending Settlement" 
          amount={`$${pendingRevenue.toLocaleString()}`} 
          subtitle={`${payments.filter(p => p.status === 'pending').length} Transactions`} 
          icon={Clock} 
          grad={["#d97706", "#f59e0b"]} 
          active={statusFilter === "pending"} 
          onClick={() => setStatusFilter("pending")} 
        />
        <PaymentKpiCard 
          title="Failed / Declined" 
          amount={`$${payments.filter(p => p.status === 'failed').reduce((sum, p) => sum + (Number(p.amount) || 0), 0).toLocaleString()}`} 
          subtitle={`${payments.filter(p => p.status === 'failed').length} Transactions`} 
          icon={AlertCircle} 
          grad={["#dc2626", "#ef4444"]} 
          active={statusFilter === "failed"} 
          onClick={() => setStatusFilter("failed")} 
        />
        <PaymentKpiCard 
          title="Refunded Volume" 
          amount={`$${payments.filter(p => p.status === 'refunded').reduce((sum, p) => sum + (Number(p.amount) || 0), 0).toLocaleString()}`} 
          subtitle={`${payments.filter(p => p.status === 'refunded').length} Transactions`} 
          icon={RefreshCw} 
          grad={["#4f46e5", "#6366f1"]} 
          active={statusFilter === "refunded"} 
          onClick={() => setStatusFilter("refunded")} 
        />
      </div>

      {/* Filter Toolbar Card */}
      <div className="bg-sa-surface p-2.5 sm:p-3 rounded-2xl border border-sa-border shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sa-text-secondary" />
          <input
            type="text"
            placeholder="Search invoice number, transaction reference ID, or tenant workspace name..."
            className="w-full bg-sa-bg/60 border border-sa-border/30 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-sa-text placeholder:text-sa-text-secondary/50 focus:outline-none focus:border-[#f59e0b] transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Quick Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: "all", label: "All Transactions" },
            { id: "paid", label: "Paid" },
            { id: "pending", label: "Pending" },
            { id: "failed", label: "Failed" },
            { id: "refunded", label: "Refunded" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setStatusFilter(item.id)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold whitespace-nowrap transition-all border ${
                statusFilter === item.id 
                  ? "bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/40 shadow-2xs" 
                  : "bg-sa-bg/60 text-sa-text-secondary border-sa-border/30 hover:text-sa-text"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Data Table Section */}
      {isLoading ? (
        <div className="py-20 text-center bg-sa-surface rounded-2xl border border-sa-border p-8">
          <div className="animate-spin w-8 h-8 border-4 border-[#f59e0b] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-xs font-extrabold text-sa-text-secondary">Loading financial transaction ledger...</p>
        </div>
      ) : (
        <div className="bg-sa-surface rounded-2xl border border-sa-border shadow-sm overflow-hidden">
          <DataTable columns={columns} data={filteredPayments} pagination={{ total: filteredPayments.length }} />
        </div>
      )}

      {/* ─── Record Manual Payment Glassmorphic Modal ────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-sa-surface rounded-2xl shadow-2xl border border-sa-border w-full max-w-lg overflow-hidden flex flex-col">
            
            <div className="px-6 py-4 border-b border-sa-border/30 flex justify-between items-center bg-sa-bg/60">
              <div className="flex items-center space-x-2.5">
                <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                <div>
                  <h2 className="text-base font-black text-sa-text tracking-tight">Record Manual Payment</h2>
                  <p className="text-[10px] font-bold text-sa-text-secondary">Log offline wire transfers, netbanking clearances, or custom ledger adjustments.</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-xl flex items-center justify-center bg-sa-surface border border-sa-border/30 text-sa-text-secondary hover:text-sa-text transition-all font-bold text-lg">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[80vh] hide-scrollbar">
              
              <div className="space-y-4">
                <h4 className="text-xs font-black text-sa-text uppercase tracking-wider border-b border-sa-border/30 pb-2 flex items-center gap-1.5">
                  <Building2 size={14} className="text-[#f59e0b]" />
                  <span>Tenant & Subscription Plan</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1 block">Select Target Tenant Workspace</label>
                    <select required value={formData.companyId} onChange={e => setFormData({...formData, companyId: e.target.value})}
                      className="w-full bg-sa-bg border border-sa-border/30 rounded-xl px-3.5 py-2.5 text-xs font-bold text-sa-text focus:outline-none focus:border-[#f59e0b] transition-all cursor-pointer">
                      <option value="">-- Choose Company Workspace --</option>
                      {companies.map(c => <option key={c._id} value={c._id}>{c.companyName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1 block">Assigned Plan Tier</label>
                    <select required value={formData.planId} onChange={e => setFormData({...formData, planId: e.target.value})}
                      className="w-full bg-sa-bg border border-sa-border/30 rounded-xl px-3.5 py-2.5 text-xs font-bold text-sa-text focus:outline-none focus:border-[#f59e0b] transition-all cursor-pointer">
                      <option value="">-- Choose Subscription Plan --</option>
                      {plans.map(p => <option key={p._id} value={p._id}>{p.planName} (${p.priceMonthly}/mo)</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1 block">Billing Cycle</label>
                    <select required value={formData.billingCycle} onChange={e => setFormData({...formData, billingCycle: e.target.value})}
                      className="w-full bg-sa-bg border border-sa-border/30 rounded-xl px-3.5 py-2.5 text-xs font-bold text-sa-text focus:outline-none focus:border-[#f59e0b] transition-all cursor-pointer">
                      <option value="monthly">Monthly Cycle</option>
                      <option value="yearly">Annual / Yearly Cycle</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-black text-sa-text uppercase tracking-wider border-b border-sa-border/30 pb-2 flex items-center gap-1.5">
                  <CreditCard size={14} className="text-[#06B6D4]" />
                  <span>Financial Transaction Details</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1 block">Payment Amount ($)</label>
                    <input type="number" required min="0" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: Number(e.target.value)})}
                      className="w-full bg-sa-bg border border-sa-border/30 rounded-xl px-3.5 py-2.5 text-sm font-black text-[#f59e0b] focus:outline-none focus:border-[#f59e0b] transition-all" />
                  </div>
                  <div>
                    <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1 block">Payment Method / Mode</label>
                    <select required value={formData.paymentMode} onChange={e => setFormData({...formData, paymentMode: e.target.value})}
                      className="w-full bg-sa-bg border border-sa-border/30 rounded-xl px-3.5 py-2.5 text-xs font-bold text-sa-text focus:outline-none focus:border-[#f59e0b] transition-all cursor-pointer">
                      <option value="netbanking">Net Banking / Wire Transfer</option>
                      <option value="card">Credit Card (Stripe / External)</option>
                      <option value="upi">UPI / Instant Transfer</option>
                      <option value="cash">Cash / Cheque Record</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1 block">Transaction ID / Reference Number</label>
                    <input type="text" required value={formData.transactionId} onChange={e => setFormData({...formData, transactionId: e.target.value})}
                      className="w-full bg-sa-bg border border-sa-border/30 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-sa-text focus:outline-none focus:border-[#f59e0b] transition-all uppercase" placeholder="e.g. WIRE-TXN-987654321" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[11px] font-extrabold text-sa-text-secondary uppercase tracking-wider mb-1 block">Ledger Clearance Status</label>
                    <select required value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}
                      className="w-full bg-sa-bg border border-sa-border/30 rounded-xl px-3.5 py-2.5 text-xs font-black text-sa-text focus:outline-none focus:border-[#f59e0b] transition-all cursor-pointer">
                      <option value="paid">Paid (Verified & Cleared)</option>
                      <option value="pending">Pending (Awaiting Clearance)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-sa-border/30 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 rounded-xl border border-sa-border/30 bg-sa-bg text-xs font-extrabold text-sa-text hover:bg-sa-border/40 transition-all">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-50 flex items-center space-x-1.5"
                  style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}
                >
                  <Check size={14} />
                  <span>{createMutation.isPending ? 'Recording Ledger Entry...' : 'Confirm & Record Payment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminPayments;
