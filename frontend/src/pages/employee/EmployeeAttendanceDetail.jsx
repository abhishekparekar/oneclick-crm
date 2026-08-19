import { useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { Calendar as CalendarIcon, Clock, Image as ImageIcon, BellRing, ChevronRight, ChevronLeft, X, HelpCircle } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { submitRegularizationApi } from "../../api/employeeApi";
import toast from "react-hot-toast";

const EmployeeAttendanceDetail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [correctionReason, setCorrectionReason] = useState("");
  
  // Destructure data passed from calendar
  const { date, status, record } = location.state || {};

  // If no date is passed (user navigated directly), redirect back
  if (!date) {
    navigate("/employee/attendance");
    return null;
  }

  const dateObj = new Date(date);
  const formattedDate = format(dateObj, "EEEE, MMMM d, yyyy");

  const getStatusBadge = (statusStr) => {
    switch (statusStr) {
      case 'present': return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 font-bold text-xs rounded-full uppercase tracking-wider">Present</span>;
      case 'half_day': return <span className="px-3 py-1 bg-amber-100 text-amber-700 font-bold text-xs rounded-full uppercase tracking-wider">Half Day</span>;
      case 'leave':
      case 'paid_leave':
      case 'unpaid_leave': return <span className="px-3 py-1 bg-blue-100 text-blue-700 font-bold text-xs rounded-full uppercase tracking-wider">Leave</span>;
      case 'absent': return <span className="px-3 py-1 bg-rose-100 text-rose-700 font-bold text-xs rounded-full uppercase tracking-wider">Absent</span>;
      case 'weekend':
      case 'weekly_off':
      case 'holiday': return <span className="px-3 py-1 bg-slate-200 text-slate-700 font-bold text-xs rounded-full uppercase tracking-wider">Weekly Off / Holiday</span>;
      default: return null;
    }
  };

  const regMutation = useMutation({
    mutationFn: (data) => submitRegularizationApi(data),
    onSuccess: () => {
      toast.success("Correction request submitted successfully!");
      queryClient.invalidateQueries({ queryKey: ["employeeMonthlyAttendance"] });
      setIsCorrectionModalOpen(false);
      setCorrectionReason("");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to submit correction request");
    }
  });

  const handleSubmitCorrection = (e) => {
    e.preventDefault();
    if (!correctionReason.trim()) {
      toast.error("Please enter a reason for the correction");
      return;
    }
    regMutation.mutate({
      date,
      attendanceId: record._id,
      reason: correctionReason
    });
  };

  const handleRequestCorrection = () => {
    setIsCorrectionModalOpen(true);
  };

  // Process times
  const inTimeStr = record?.punchInTime ? format(new Date(record.punchInTime), "h:mm a") : "—";
  const outTimeStr = record?.punchOutTime ? format(new Date(record.punchOutTime), "h:mm a") : "—";

  // Process hours
  let loggedHoursStr = "—";
  if (record?.totalHours) {
    const hrs = Math.floor(record.totalHours);
    const mins = Math.round((record.totalHours - hrs) * 60);
    loggedHoursStr = `${hrs} hr ${mins} min`;
  }

  return (
    <div className="space-y-4 pb-24 relative w-full font-sans min-h-screen">
      {/* Page Header */}
      <div className="mb-6">
        <PageHeader title="Attendance Detail" icon={CalendarIcon}>
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg text-sm font-bold transition-all shadow-sm backdrop-blur-sm"
          >
            <ChevronLeft size={16} strokeWidth={2.5} />
            Back
          </button>
        </PageHeader>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Summary */}
        <div className="lg:col-span-1 space-y-6">
          {/* Top Info Card */}
          <div className="bg-gradient-to-b from-[#0f172a] to-slate-900 dark:from-slate-900 dark:to-slate-950 rounded-[2rem] shadow-xl p-6 md:p-8 relative overflow-hidden border border-slate-800 flex flex-col justify-between">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-blue-500/10 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-purple-500/10 blur-3xl"></div>
            
            <div className="relative z-10 flex flex-col h-full">
              <div className="bg-white/10 w-12 h-12 rounded-2xl flex items-center justify-center text-blue-400 mb-4 border border-white/10 shadow-inner backdrop-blur-md">
                <CalendarIcon size={24} strokeWidth={2.5} />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white mb-6 leading-tight">{formattedDate}</h2>
              
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-sm flex items-center justify-between mt-auto">
                <span className="text-[11px] font-bold text-white/60 uppercase tracking-widest">Daily Status</span>
                <div>{getStatusBadge(status)}</div>
              </div>
            </div>
          </div>

          {/* Total Logged Hours Card */}
          <div className="bg-white dark:bg-[#111C24] rounded-[2rem] shadow-sm p-6 md:p-8 border border-slate-200 dark:border-slate-800 flex items-center gap-4">
            <div className="bg-emerald-50 dark:bg-emerald-900/30 w-12 h-12 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <Clock size={24} strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Total Logged Hours</div>
              <div className="text-xl md:text-2xl font-black text-slate-800 dark:text-white leading-none tracking-tight">{loggedHoursStr}</div>
            </div>
          </div>
        </div>

        {/* Right Column: Sessions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-[#111C24] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm h-full flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between bg-slate-50/50 dark:bg-[#111C24]/50">
              <h3 className="text-[12px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                Punch Parameters
              </h3>
              <span className="px-2.5 py-1 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] uppercase tracking-widest font-bold rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm">
                Session 1
              </span>
            </div>
            
            <div className="p-6 md:p-8 flex-1 flex flex-col justify-center bg-slate-50/30 dark:bg-[#0C1520]/20">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 md:gap-6">
                
                {/* In Selfie Horizontal Card */}
                <div className="flex flex-row items-stretch bg-white dark:bg-[#111C24] rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow overflow-hidden group h-32 md:h-40 cursor-pointer">
                  
                  {/* Image Area (Left) */}
                  <div className="w-2/5 max-w-[160px] relative overflow-hidden bg-slate-50 dark:bg-[#0C1520] shrink-0 border-r border-slate-100 dark:border-slate-800/50">
                    {record?.punchInSelfie ? (
                      <img src={record.punchInSelfie} alt="Punch In Selfie" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-700">
                        <ImageIcon size={32} strokeWidth={1.5} />
                      </div>
                    )}
                  </div>

                  {/* Info Area (Right) */}
                  <div className="flex-1 p-4 md:p-5 flex flex-col justify-center overflow-hidden">
                    <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] shrink-0"></div>
                      <span className="text-[10px] md:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate">Punched In</span>
                    </div>
                    <span className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight truncate">{inTimeStr}</span>
                  </div>
                </div>

                {/* Out Selfie Horizontal Card */}
                <div className="flex flex-row items-stretch bg-white dark:bg-[#111C24] rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow overflow-hidden group h-32 md:h-40 cursor-pointer">
                  
                  {/* Image Area (Left) */}
                  <div className="w-2/5 max-w-[160px] relative overflow-hidden bg-slate-50 dark:bg-[#0C1520] shrink-0 border-r border-slate-100 dark:border-slate-800/50">
                    {record?.punchOutSelfie ? (
                      <img src={record.punchOutSelfie} alt="Punch Out Selfie" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-700">
                        <ImageIcon size={32} strokeWidth={1.5} />
                      </div>
                    )}
                  </div>

                  {/* Info Area (Right) */}
                  <div className="flex-1 p-4 md:p-5 flex flex-col justify-center overflow-hidden">
                    <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-500 shadow-[0_0_8px_rgba(148,163,184,0.3)] shrink-0"></div>
                      <span className="text-[10px] md:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate">Punched Out</span>
                    </div>
                    <span className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight truncate">{outTimeStr}</span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Correction Button */}
      <button 
          onClick={handleRequestCorrection}
          className="w-full bg-white dark:bg-[#111C24] border border-[#f59e0b] hover:bg-rose-50 dark:hover:bg-rose-900/10 text-[#f59e0b] font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-3"
        >
          <BellRing size={20} strokeWidth={2.5} />
          <span>Request Attendance Correction</span>
        </button>

      {/* Correction Modal */}
      {isCorrectionModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#0C1520] rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-[#111C24]/30">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Request Attendance Correction</h2>
              <button 
                onClick={() => setIsCorrectionModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 md:p-8">
              {/* Alert Banner */}
              <div className="bg-[#fff7ed] dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/30 rounded-2xl p-4 mb-6 flex gap-4">
                <div className="text-orange-500 flex-shrink-0 mt-0.5">
                  <HelpCircle size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#f59e0b] dark:text-orange-400 mb-1">Attendance Correction</h3>
                  <p className="text-xs text-slate-700 dark:text-orange-200/70 leading-relaxed">
                    Employees cannot manually edit attendance logs. You can only request adjustments by submitting a reason for review by your administrator.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmitCorrection} className="space-y-6">
                
                <div className="space-y-4 mb-6">
                  {/* Selected Date */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <span className="text-[13px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Selected Date</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-white">{formattedDate}</span>
                  </div>

                  {/* Record ID */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <span className="text-[13px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Record ID</span>
                    <span className="text-sm font-medium text-slate-400 dark:text-slate-500 font-mono">{record?._id}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-bold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider">
                    Reason for Correction Request <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                    placeholder="e.g., Forgot to punch out due to client meeting / GPS location mismatch / punch-in missed..."
                    className="w-full min-h-[120px] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#111C24] text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/20 focus:border-[#f59e0b] transition-all resize-y text-[15px]"
                    required
                  />
                </div>
                
                <div className="flex justify-end gap-3 pt-6">
                  <button
                    type="button"
                    onClick={() => setIsCorrectionModalOpen(false)}
                    className="px-6 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={regMutation.isPending}
                    className="px-6 py-3 rounded-xl font-bold bg-[#f59e0b] hover:bg-[#b32900] text-white disabled:opacity-50 transition-colors flex items-center justify-center min-w-[160px]"
                  >
                    {regMutation.isPending ? "Submitting..." : "Submit Request"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeAttendanceDetail;



