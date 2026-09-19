import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Image as ImageIcon, 
  BellRing, 
  ChevronLeft, 
  X, 
  HelpCircle, 
  Camera, 
  CheckCircle2, 
  MapPin, 
  ZoomIn, 
  AlertCircle,
  Timer,
  CalendarCheck
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { submitRegularizationApi } from "../../api/employeeApi";
import toast from "react-hot-toast";

// Helper component for selfie with graceful fallback
const SelfieThumbnail = ({ src, alt, label, onZoom }) => {
  const [hasError, setHasError] = useState(false);
  
  // Check if string is a web-renderable uri
  const isValidUrl = src && typeof src === "string" && !src.startsWith("file://") && !hasError;

  return (
    <div className="w-28 sm:w-32 h-28 sm:h-32 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 overflow-hidden shrink-0 relative group flex items-center justify-center">
      {isValidUrl ? (
        <>
          <img 
            src={src} 
            alt={alt} 
            onError={() => setHasError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
          />
          <div 
            onClick={() => onZoom && onZoom(src)}
            className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer backdrop-blur-[1px]"
          >
            <div className="w-8 h-8 rounded-full bg-white/90 text-slate-800 flex items-center justify-center shadow-md">
              <ZoomIn size={16} />
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 p-2 text-center select-none">
          <div className="w-9 h-9 rounded-xl bg-slate-200/70 dark:bg-slate-700/50 flex items-center justify-center mb-1.5 text-slate-400 dark:text-slate-500">
            <Camera size={18} strokeWidth={1.8} />
          </div>
          <span className="text-[10px] font-semibold leading-tight text-slate-400 dark:text-slate-500">
            {src ? "Photo logged" : "No photo"}
          </span>
        </div>
      )}
      <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 backdrop-blur-xs text-[8px] font-bold text-white rounded-md uppercase tracking-wider pointer-events-none">
        {label}
      </span>
    </div>
  );
};

const EmployeeAttendanceDetail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [correctionReason, setCorrectionReason] = useState("");
  const [activeZoomImage, setActiveZoomImage] = useState(null);
  
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
      case 'present': 
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs rounded-full uppercase tracking-wider shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Present
          </span>
        );
      case 'half_day': 
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold text-xs rounded-full uppercase tracking-wider shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Half Day
          </span>
        );
      case 'leave':
      case 'paid_leave':
      case 'unpaid_leave': 
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-400 font-bold text-xs rounded-full uppercase tracking-wider shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            Leave
          </span>
        );
      case 'absent': 
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-full uppercase tracking-wider shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            Absent
          </span>
        );
      case 'weekend':
      case 'weekly_off':
      case 'holiday': 
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-500/15 border border-slate-500/30 text-slate-600 dark:text-slate-400 font-bold text-xs rounded-full uppercase tracking-wider shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            Weekly Off / Holiday
          </span>
        );
      default: 
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-500/15 border border-slate-500/30 text-slate-600 dark:text-slate-400 font-bold text-xs rounded-full uppercase tracking-wider shadow-2xs">
            {statusStr || "Unknown"}
          </span>
        );
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
      attendanceId: record?._id,
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

  // Determine sessions array
  const sessions = record?.punchLog && record.punchLog.length > 0 
    ? record.punchLog 
    : [
        {
          punchInTime: record?.punchInTime,
          punchOutTime: record?.punchOutTime,
          punchInSelfie: record?.punchInSelfie,
          punchOutSelfie: record?.punchOutSelfie,
          punchInLocation: record?.punchInLocation,
          punchOutLocation: record?.punchOutLocation,
        }
      ];

  return (
    <div className="w-full font-sans pb-16 space-y-5">
      {/* Top Page Header */}
      <PageHeader 
        title="Attendance Detail" 
        breadcrumbs={["Dashboard", "HRMS", "My Attendance", "Attendance Detail"]}
        icon={CalendarIcon}
      >
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
        >
          <ChevronLeft size={15} strokeWidth={2.5} />
          Back to Attendance
        </button>
      </PageHeader>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Date & Attendance Summary (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          
          {/* Executive Date & Status Banner */}
          <div className="bg-gradient-to-br from-[#0b1329] via-[#101b38] to-[#1e293b] text-white rounded-3xl p-6 sm:p-7 shadow-lg border border-slate-800 relative overflow-hidden flex flex-col justify-between min-h-[220px]">
            {/* Ambient Background Accents */}
            <div className="absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 rounded-full bg-blue-500/15 blur-2xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-40 h-40 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-blue-400 shadow-inner backdrop-blur-md">
                  <CalendarCheck size={22} strokeWidth={2.2} />
                </div>
                <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-widest bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
                  Daily Record
                </span>
              </div>
              
              <div className="text-[12px] font-semibold text-blue-300 uppercase tracking-wider mb-1">
                {format(dateObj, "EEEE")}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white leading-snug tracking-tight">
                {format(dateObj, "MMMM d, yyyy")}
              </h2>
            </div>

            <div className="relative z-10 pt-5 mt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Daily Status
              </span>
              <div>{getStatusBadge(status)}</div>
            </div>
          </div>

          {/* Working Hours Card */}
          <div className="bg-white dark:bg-[#111C24] rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <Clock size={22} strokeWidth={2.2} />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Total Logged Time
                </span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mt-0.5 block">
                  {loggedHoursStr}
                </span>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0B101B]/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block mb-0.5">First In</span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200 text-[13px]">{inTimeStr}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0B101B]/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block mb-0.5">Last Out</span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200 text-[13px]">{outTimeStr}</span>
              </div>
            </div>

            {record?._id && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
                <span>Record ID</span>
                <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">
                  {record._id.slice(-8)}
                </span>
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Sessions & Punch Parameters (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Main Sessions Container */}
          <div className="bg-white dark:bg-[#111C24] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/60 dark:bg-[#111C24]/60">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
                  Punch Parameters
                </h3>
              </div>
              <span className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-wider rounded-lg shadow-2xs">
                {sessions.length} {sessions.length === 1 ? "Session" : "Sessions"}
              </span>
            </div>

            {/* Sessions Content */}
            <div className="p-5 sm:p-6 space-y-6">
              {sessions.map((sess, idx) => {
                const sInTime = sess.punchInTime ? format(new Date(sess.punchInTime), "h:mm a") : inTimeStr;
                const sOutTime = sess.punchOutTime ? format(new Date(sess.punchOutTime), "h:mm a") : outTimeStr;

                return (
                  <div key={idx} className="space-y-3">
                    {sessions.length > 1 && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Session {idx + 1}
                        </span>
                        <div className="flex-1 h-[1px] bg-slate-100 dark:bg-slate-800"></div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Punch In Card */}
                      <div className="rounded-2xl border border-emerald-200/70 dark:border-emerald-900/40 bg-gradient-to-b from-emerald-50/40 to-white dark:from-emerald-950/20 dark:to-[#111C24] p-4 flex gap-4 items-center shadow-2xs hover:shadow-xs transition-shadow">
                        <SelfieThumbnail 
                          src={sess.punchInSelfie || record?.punchInSelfie} 
                          alt="Punch In Selfie"
                          label="IN"
                          onZoom={(img) => setActiveZoomImage(img)}
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]"></span>
                            <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                              Punched In
                            </span>
                          </div>
                          
                          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {sInTime}
                          </div>

                          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                            <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                            <span className="truncate font-medium">
                              {sess.punchInLocation?.branchName ? `Verified at ${sess.punchInLocation.branchName}` : (sess.punchInLocation?.address || "Clock-in verified")}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Punch Out Card */}
                      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-b from-slate-50/40 to-white dark:from-slate-800/20 dark:to-[#111C24] p-4 flex gap-4 items-center shadow-2xs hover:shadow-xs transition-shadow">
                        <SelfieThumbnail 
                          src={sess.punchOutSelfie || record?.punchOutSelfie} 
                          alt="Punch Out Selfie"
                          label="OUT"
                          onZoom={(img) => setActiveZoomImage(img)}
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`w-2 h-2 rounded-full ${sOutTime !== "—" ? "bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.7)]" : "bg-slate-400"}`}></span>
                            <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                              Punched Out
                            </span>
                          </div>
                          
                          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {sOutTime}
                          </div>

                          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                            {sOutTime !== "—" ? (
                              <>
                                <CheckCircle2 size={13} className="text-blue-500 shrink-0" />
                                <span className="truncate font-medium">
                                  {sess.punchOutLocation?.branchName ? `Clock-out at ${sess.punchOutLocation.branchName}` : (sess.punchOutLocation?.address || "Shift completed")}
                                </span>
                              </>
                            ) : (
                              <>
                                <Clock size={13} className="text-amber-500 shrink-0" />
                                <span className="truncate font-medium">Not clocked out yet</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Regularization / Attendance Correction Action Card */}
          <div className="rounded-3xl border border-amber-200/80 dark:border-amber-900/40 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <BellRing size={20} strokeWidth={2.2} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Need to correct this attendance record?
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 max-w-xl">
                  Submit a regularization request to HR if you missed punching, experienced GPS mismatch, or require time adjustment.
                </p>
              </div>
            </div>

            <button 
              onClick={handleRequestCorrection}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-bold text-xs rounded-xl shadow-sm shadow-amber-500/25 flex items-center gap-2 transition-all shrink-0 cursor-pointer"
            >
              <BellRing size={15} strokeWidth={2.2} />
              <span>Request Correction</span>
            </button>
          </div>

        </div>

      </div>

      {/* Selfie Zoom Modal */}
      {activeZoomImage && (
        <div 
          onClick={() => setActiveZoomImage(null)}
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative bg-slate-900 rounded-3xl overflow-hidden max-w-md w-full shadow-2xl border border-slate-700"
          >
            <button 
              onClick={() => setActiveZoomImage(null)}
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
            <div className="p-2">
              <img 
                src={activeZoomImage} 
                alt="Selfie Zoom" 
                className="w-full h-auto max-h-[70vh] object-contain rounded-2xl" 
              />
            </div>
            <div className="p-4 text-center border-t border-slate-800 text-xs text-slate-300 font-semibold">
              Attendance Photo Record
            </div>
          </div>
        </div>
      )}

      {/* Correction Request Modal */}
      {isCorrectionModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#0C1520] rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-[#111C24]/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
                  <BellRing size={17} strokeWidth={2.5} />
                </div>
                <h2 className="text-base font-bold text-slate-800 dark:text-white">Request Attendance Correction</h2>
              </div>
              <button 
                onClick={() => setIsCorrectionModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6">
              {/* Alert Banner */}
              <div className="bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 rounded-2xl p-4 mb-5 flex gap-3.5">
                <div className="text-amber-500 shrink-0 mt-0.5">
                  <HelpCircle size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-amber-800 dark:text-amber-400 mb-0.5">HR Review Policy</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Attendance logs cannot be edited directly. Submitting this request sends an adjustment note to your HR / Manager for approval.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmitCorrection} className="space-y-4">
                
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Selected Date</span>
                    <span className="font-bold text-slate-800 dark:text-white block mt-0.5">{formattedDate}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current Status</span>
                    <span className="font-bold text-slate-800 dark:text-white block mt-0.5 uppercase">{status || "—"}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                    Reason for Correction Request <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                    placeholder="e.g., Forgot to punch out due to client meeting / GPS mismatch / punch-in missed..."
                    className="w-full min-h-[110px] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#111C24] text-slate-800 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all resize-y"
                    required
                  />
                </div>
                
                <div className="flex justify-end gap-2.5 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsCorrectionModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={regMutation.isPending}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 active:scale-98 text-white disabled:opacity-50 transition-all flex items-center justify-center min-w-[140px] shadow-sm shadow-amber-500/25 cursor-pointer"
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
