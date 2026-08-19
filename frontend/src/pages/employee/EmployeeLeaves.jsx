import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyLeavesApi,
  getLeaveBalanceApi,
  applyLeaveApi,
  getCompanyHolidaysApi
} from "../../api/employeeApi";
import { format } from "date-fns";
import toast from "react-hot-toast";
import {
  Clock,
  CalendarDays,
  Plus,
  ArrowLeft,
  X,
  CheckCircle2,
  Ban,
  AlertCircle,
  Sparkles,
  Heart,
  Umbrella,
  Flag,
  ShieldCheck,
  Calendar as CalendarIcon,
  ArrowRight,
  Eye
} from "lucide-react";

const Modal = ({ isOpen, onClose, title, children, showBackIcon = false, onBack = null }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#111C24] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800 animate-fadeIn">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            {showBackIcon && (
              <button onClick={onBack || onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                <ArrowLeft size={18} strokeWidth={2.5} />
              </button>
            )}
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">{title}</h2>
          </div>
          {!showBackIcon && (
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg">
              <X size={18} />
            </button>
          )}
        </div>
        <div className="p-5 overflow-y-auto bg-slate-50/50 dark:bg-[#111C24]">
          {children}
        </div>
      </div>
    </div>
  );
};

const getStatusBadge = (status) => {
  switch (status) {
    case 'approved':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"><CheckCircle2 size={10} strokeWidth={3}/> Approved</span>;
    case 'rejected':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60"><Ban size={10} strokeWidth={3}/> Rejected</span>;
    case 'pending':
    default:
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60"><AlertCircle size={10} strokeWidth={3}/> Pending</span>;
  }
};

const EmployeeLeaves = () => {
  const queryClient = useQueryClient();
  const [activeModal, setActiveModal] = useState(null); // 'apply', 'balance', 'holidays', 'details'
  const [activeTab, setActiveTab] = useState("All"); // All, Pending, Approved, Rejected
  const [selectedLeave, setSelectedLeave] = useState(null);

  const [leaveForm, setLeaveForm] = useState({
    leaveType: "Casual Leave",
    startDate: "",
    endDate: "",
    reason: "",
    isHalfDay: false
  });

  const { data: leavesRes, isLoading: leavesLoading } = useQuery({
    queryKey: ["employeeMyLeaves"],
    queryFn: () => getMyLeavesApi().then((res) => res.data),
  });

  const { data: balanceRes } = useQuery({
    queryKey: ["employeeLeaveBalance"],
    queryFn: () => getLeaveBalanceApi().then((res) => res.data),
  });

  const { data: holidaysRes } = useQuery({
    queryKey: ["employeeHolidays"],
    queryFn: () => getCompanyHolidaysApi().then((res) => res.data),
  });

  const applyMutation = useMutation({
    mutationFn: (data) => applyLeaveApi(data),
    onSuccess: () => {
      toast.success("Leave applied successfully!");
      queryClient.invalidateQueries({ queryKey: ["employeeMyLeaves"] });
      queryClient.invalidateQueries({ queryKey: ["employeeLeaveBalance"] });
      setActiveModal(null);
      setLeaveForm({ leaveType: "Casual Leave", startDate: "", endDate: "", reason: "", isHalfDay: false });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to apply for leave");
    }
  });

  const balance = balanceRes?.balance || { casual: 0, sick: 0, annual: 0, lop: 0 };
  const leaves = leavesRes?.leaves || [];
  const holidays = holidaysRes?.holidays || [];

  const filteredLeaves = leaves.filter(l => {
    if (activeTab === "All") return true;
    return l.status.toLowerCase() === activeTab.toLowerCase();
  });

  const handleApplySubmit = (e) => {
    e.preventDefault();
    if (!leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason) {
      toast.error("Please fill all required fields");
      return;
    }
    applyMutation.mutate(leaveForm);
  };

  const renderApplyModal = () => (
    <Modal isOpen={activeModal === 'apply'} onClose={() => setActiveModal(null)} title="Apply for Leave" showBackIcon>
      
      {/* Banner */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-4 flex flex-col items-center justify-center text-center">
        <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 text-xs font-bold mb-0.5">
          <ShieldCheck size={14} /> 
          <span>Available {leaveForm.leaveType} Balance</span>
        </div>
        <h3 className="text-lg font-extrabold text-amber-600 dark:text-amber-400">
          {leaveForm.leaveType === 'Unpaid Leave' || leaveForm.leaveType === 'Leave Without Pay (LOP)' ? "Unlimited Allowed" : 
           leaveForm.leaveType === 'Casual Leave' ? `${balance.casual} Days` :
           leaveForm.leaveType === 'Sick Leave' ? `${balance.sick} Days` :
           `${balance.annual} Days`
          }
        </h3>
      </div>

      <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-2xs space-y-4">
        
        {/* Category Selection */}
        <div>
          <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">Leave Category</label>
          <div className="flex flex-wrap gap-1.5">
            {['Casual Leave', 'Sick Leave', 'Annual Leave', 'Leave Without Pay (LOP)'].map(cat => {
              const isActive = leaveForm.leaveType === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setLeaveForm({ ...leaveForm, leaveType: cat })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    isActive 
                      ? "bg-amber-500 text-slate-950 border-amber-500 font-extrabold shadow-2xs" 
                      : "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                  }`}
                >
                  {cat === 'Leave Without Pay (LOP)' ? 'Unpaid Leave' : cat.replace(' Leave', '')}
                </button>
              );
            })}
          </div>
        </div>

        {/* Half Day Toggle */}
        <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Apply as Half Day</span>
          <button 
            type="button"
            onClick={() => setLeaveForm({...leaveForm, isHalfDay: !leaveForm.isHalfDay})}
            className={`w-11 h-6 rounded-full transition-colors relative ${leaveForm.isHalfDay ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-700'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${leaveForm.isHalfDay ? 'translate-x-5.5' : 'translate-x-0.5'}`}></div>
          </button>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Start Date</label>
            <input
              type="date"
              value={leaveForm.startDate}
              onChange={(e) => setLeaveForm({...leaveForm, startDate: e.target.value})}
              className="w-full px-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0C1520] text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">End Date</label>
            <input
              type="date"
              value={leaveForm.endDate}
              onChange={(e) => setLeaveForm({...leaveForm, endDate: e.target.value})}
              className="w-full px-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0C1520] text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Reason for Leave</label>
          <textarea
            value={leaveForm.reason}
            onChange={(e) => setLeaveForm({...leaveForm, reason: e.target.value})}
            placeholder="Describe reason for leave request..."
            className="w-full px-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0C1520] text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 min-h-[70px] resize-none"
          />
        </div>

        <button 
          onClick={handleApplySubmit}
          disabled={applyMutation.isPending}
          className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-extrabold py-2.5 rounded-xl transition-all shadow-2xs text-xs"
        >
          {applyMutation.isPending ? "Submitting..." : "Submit Leave Request"}
        </button>

      </div>
    </Modal>
  );

  const renderDetailsModal = () => {
    if (!selectedLeave) return null;
    const sd = new Date(selectedLeave.startDate);
    const ed = new Date(selectedLeave.endDate);
    
    return (
      <Modal isOpen={activeModal === 'details'} onClose={() => {setActiveModal(null); setSelectedLeave(null);}} title="Leave Request Details" showBackIcon onBack={() => {setActiveModal(null); setSelectedLeave(null);}}>
        <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-2xs space-y-4">
          
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">{selectedLeave.leaveType}</h3>
              <p className="text-xs font-bold text-slate-500 mt-0.5">{selectedLeave.duration} {selectedLeave.duration === 1 ? 'Day' : 'Days'} Requested</p>
            </div>
            {getStatusBadge(selectedLeave.status)}
          </div>

          <div className="bg-slate-50 dark:bg-[#0C1520] rounded-xl p-4 flex items-center justify-around border border-slate-100 dark:border-slate-800">
            <div className="text-center">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">From Date</div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">{format(sd, 'MMM d, yyyy')}</div>
            </div>
            <ArrowRight className="text-slate-400" size={18} />
            <div className="text-center">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">To Date</div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">{format(ed, 'MMM d, yyyy')}</div>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Reason Specified</div>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed bg-slate-50 dark:bg-[#0C1520] p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              {selectedLeave.reason || "No reason provided."}
            </p>
          </div>

        </div>
      </Modal>
    );
  };

  return (
    <div className="w-full font-sans pb-12 relative space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight flex items-center gap-2">
            My Leaves
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Track leave balances, apply for time off, and view history
          </p>
        </div>

        <button 
          onClick={() => setActiveModal('apply')} 
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-extrabold shadow-2xs transition-all self-start sm:self-auto"
        >
          <Plus size={14} strokeWidth={2.5} /> Request Time Off
        </button>
      </div>

      {/* Leave Balances Quick Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Casual */}
        <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">Casual Leave</h3>
            <div className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white leading-tight">
              {balance.casual} <span className="text-xs font-medium text-slate-400">/ 12</span>
            </div>
          </div>
        </div>

        {/* Sick */}
        <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <Heart size={16} />
          </div>
          <div>
            <h3 className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">Sick Leave</h3>
            <div className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white leading-tight">
              {balance.sick} <span className="text-xs font-medium text-slate-400">/ 10</span>
            </div>
          </div>
        </div>

        {/* Annual */}
        <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
            <Umbrella size={16} />
          </div>
          <div>
            <h3 className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">Annual Leave</h3>
            <div className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white leading-tight">
              {balance.annual} <span className="text-xs font-medium text-slate-400">/ 15</span>
            </div>
          </div>
        </div>

        {/* LOP */}
        <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20">
            <Clock size={16} />
          </div>
          <div>
            <h3 className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">Unpaid Taken</h3>
            <div className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white leading-tight">
              {balance.lop} <span className="text-xs font-medium text-slate-400">Days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-[#111C24] p-1 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-1 w-fit">
        {['All', 'Pending', 'Approved', 'Rejected'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
              activeTab === tab 
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs" 
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Leave History Table */}
      <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200/80 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-[#0C1520]/40">
          <h3 className="font-extrabold text-slate-900 dark:text-white text-xs tracking-wider uppercase flex items-center gap-2">
            <CalendarIcon size={14} className="text-amber-500" /> Leave History Records
          </h3>
          <span className="text-[10px] font-bold text-slate-500 bg-white dark:bg-[#111C24] px-2 py-0.5 rounded-full border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            {filteredLeaves.length} records
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-[#0C1520]/60 border-b border-slate-200/80 dark:border-slate-800 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Leave Type</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {leavesLoading ? (
                <tr><td colSpan="6" className="py-12 text-center text-xs font-medium text-slate-400">Loading leave history...</td></tr>
              ) : filteredLeaves.length === 0 ? (
                <tr><td colSpan="6" className="py-12 text-center text-xs font-medium text-slate-400">No leave requests found.</td></tr>
              ) : (
                filteredLeaves.map((l) => {
                  const sd = new Date(l.startDate);
                  const ed = new Date(l.endDate);
                  return (
                    <tr 
                      key={l._id} 
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white text-xs">
                        {l.leaveType}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-slate-700 dark:text-slate-300">
                        {l.duration} Day{l.duration > 1 ? 's' : ''}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <span>{format(sd, 'MMM d')}</span>
                          <ArrowRight size={11} className="text-slate-400" />
                          <span>{format(ed, 'MMM d, yyyy')}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 truncate max-w-[180px]">
                        {l.reason}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(l.status)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button 
                          onClick={() => {setSelectedLeave(l); setActiveModal('details');}}
                          className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {renderApplyModal()}
      {renderDetailsModal()}

    </div>
  );
};

export default EmployeeLeaves;
