import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAttendanceSettingsApi, updateAttendanceSettingsApi } from "../../api/companyAdminApi";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import {
  MapPin, Settings2, RefreshCw, AlertCircle, Map, ShieldCheck,
  Building, Navigation, CheckCircle2, ChevronDown, Sparkles,
  ArrowUp, ArrowDown, Clock
} from "lucide-react";

const POLICY_OPTIONS = [
  { value: "office_only", label: "Office Area Geofenced Only" },
  { value: "hybrid", label: "Hybrid (Office + Remote Labelled)" },
  { value: "remote_allowed", label: "Remote Punch Permitted" },
];

/* ── Top KPI Stat Card ────────────────────────────────────────────────────────── */
const KPICard = ({ label, value, trend, isUp, period, strokeColor, Icon, iconBg, iconColor }) => {
  const sparkData = useMemo(() => [
    { v: 12 }, { v: 18 }, { v: 14 }, { v: 22 }, { v: 19 }, { v: 28 }, { v: 24 }, { v: 34 },
  ], []);

  return (
    <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 px-4 py-3.5 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] transition-all duration-300 group">
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${iconBg} flex-shrink-0 shadow-xs`}>
            <Icon size={13} style={{ color: iconColor }} strokeWidth={2.4} />
          </div>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">{label}</span>
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight leading-tight mb-1 truncate">{value}</h3>
        <div className="flex items-center gap-1 text-[11px]">
          <span className={`inline-flex items-center font-medium ${isUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
            {isUp ? <ArrowUp size={10} strokeWidth={2.5}/> : <ArrowDown size={10} strokeWidth={2.5}/>}
            {trend}
          </span>
          <span className="text-slate-400 text-[9.5px] truncate">vs {period}</span>
        </div>
      </div>
      <div className="hidden sm:block h-10 w-16 opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={40}>
          <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`sk-att-${label.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.35}/>
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={strokeColor} strokeWidth={2.2} fill={`url(#sk-att-${label.replace(/\s+/g, '')})`}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const CompanyAttendanceSettings = () => {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Form State
  const [form, setForm] = useState({
    officeName: "",
    latitude: "",
    longitude: "",
    allowedRadiusMeters: 100,
    attendanceMode: "office_only",
    requireGps: true,
    requireSelfie: false,
    allowAdminBypassGeoFencing: true,
    enableAttendanceModule: false,
    gracePeriodMinutes: 15,
    autoHalfDayOnLate: true,
    earlyLeaveGracePeriodMinutes: 10,
    autoHalfDayOnEarlyLeave: true,
  });

  const triggerToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch settings
  const { data: settingsRes, isLoading } = useQuery({
    queryKey: ["attendanceSettingsPage"],
    queryFn: getAttendanceSettingsApi,
  });

  useEffect(() => {
    if (settingsRes?.data?.settings) {
      const s = settingsRes.data.settings;
      setForm({
        ...s,
        latitude: s.latitude !== null && s.latitude !== undefined ? s.latitude : "",
        longitude: s.longitude !== null && s.longitude !== undefined ? s.longitude : "",
      });
    }
  }, [settingsRes]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: updateAttendanceSettingsApi,
    onSuccess: () => {
      queryClient.invalidateQueries(["attendanceSettingsPage"]);
      triggerToast("Geo-fencing policy settings saved successfully!");
    },
    onError: (err) => {
      triggerToast(err?.response?.data?.message || "Failed to update settings", "error");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      latitude: form.latitude !== "" && form.latitude !== null ? parseFloat(form.latitude) : null,
      longitude: form.longitude !== "" && form.longitude !== null ? parseFloat(form.longitude) : null,
    };
    updateMutation.mutate(payload);
  };

  return (
    <div className="space-y-4 pb-12 font-sans text-slate-900 dark:text-slate-100">

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center px-4 py-3 rounded-xl shadow-lg border text-xs font-bold transition-all duration-300 ${
          toast.type === "error" 
            ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800" 
            : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
        }`}>
          <AlertCircle size={16} className="mr-2 flex-shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── Page Header Banner ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 pb-1">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            Geo-Fencing & Shift Settings <MapPin size={20} className="text-amber-500" />
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Configure office coordinates, geofence radius boundaries, and late punch penalty rules.
          </p>
        </div>
      </div>

      {/* ── Top 4 Compact KPI Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3.5">
        <KPICard label="Allowed Radius" value={`${form.allowedRadiusMeters || 100}m`} trend="Active" isUp period="boundary" strokeColor="#06B6D4" Icon={MapPin} iconBg="bg-cyan-500/10" iconColor="#0891B2" />
        <KPICard label="Late Grace Period" value={`${form.gracePeriodMinutes || 15} mins`} trend="Permitted" isUp period="late grace" strokeColor="#10B981" Icon={Clock} iconBg="bg-emerald-500/10" iconColor="#059669" />
        <KPICard label="Attendance Mode" value={form.attendanceMode === "office_only" ? "Office Only" : "Hybrid"} trend="Strict" isUp period="policy" strokeColor="#8B5CF6" Icon={ShieldCheck} iconBg="bg-purple-500/10" iconColor="#7C3AED" />
        <KPICard label="Auto Half-Day" value={form.autoHalfDayOnLate ? "Enabled" : "Disabled"} trend="Rules" isUp period="penalty" strokeColor="#EAB308" Icon={Sparkles} iconBg="bg-amber-500/10" iconColor="#D97706" />
      </div>

      {isLoading ? (
        <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400 shadow-xs flex flex-col items-center justify-center space-y-3">
          <RefreshCw size={24} className="animate-spin text-amber-500" />
          <p className="text-xs font-extrabold uppercase tracking-widest">Loading attendance settings...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Form Configuration Card (Span 2) */}
          <form id="attendance-settings-form" onSubmit={handleSubmit} className="lg:col-span-2 bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-4">
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center">
                <Settings2 size={16} className="text-amber-500 mr-2" />
                Configure Geo-fence Policy
              </h3>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">Set coordinates and operational parameters for employee checkpoints</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Office Location / Branch Name</label>
                <input
                  type="text"
                  required
                  value={form.officeName}
                  onChange={(e) => setForm({ ...form, officeName: e.target.value })}
                  placeholder="e.g. Headquarters Office, Mumbai"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Office Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={form.latitude}
                    onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                    placeholder="e.g. 19.0760"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Office Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={form.longitude}
                    onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                    placeholder="e.g. 72.8777"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Allowed Radius (Meters)</label>
                  <input
                    type="number"
                    required
                    value={form.allowedRadiusMeters}
                    onChange={(e) => setForm({ ...form, allowedRadiusMeters: parseInt(e.target.value) || 0 })}
                    placeholder="e.g. 100"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Attendance Policy Mode</label>
                  <select
                    value={form.attendanceMode}
                    onChange={(e) => setForm({ ...form, attendanceMode: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  >
                    {POLICY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Requirement Checkboxes */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-wider">Check-in Checkpoints</label>
                
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={form.requireGps}
                    onChange={(e) => setForm({ ...form, requireGps: e.target.checked })}
                    className="rounded accent-amber-500 w-4 h-4 cursor-pointer mt-0.5"
                  />
                  <div>
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white block leading-tight">Require GPS Coordinate Audits</span>
                    <span className="text-[11px] text-slate-400 font-semibold mt-0.5 block">Mobile app must fetch current coordinates during punch in/out.</span>
                  </div>
                </label>

                <label className="flex items-start space-x-3 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={form.requireSelfie}
                    onChange={(e) => setForm({ ...form, requireSelfie: e.target.checked })}
                    className="rounded accent-amber-500 w-4 h-4 cursor-pointer mt-0.5"
                  />
                  <div>
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white block leading-tight">Require Selfie Verification</span>
                    <span className="text-[11px] text-slate-400 font-semibold mt-0.5 block">Employees must capture a selfie during check-in.</span>
                  </div>
                </label>
              </div>

              {/* Strict Penalty Rules */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                <h3 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center uppercase tracking-wider">
                  <ShieldCheck size={15} className="text-amber-500 mr-2" />
                  Time & Penalty Strictness
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Late Grace Period (Mins)</label>
                    <input
                      type="number"
                      required
                      value={form.gracePeriodMinutes}
                      onChange={(e) => setForm({ ...form, gracePeriodMinutes: parseInt(e.target.value) || 0 })}
                      placeholder="e.g. 15"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  
                  <div className="flex items-center pt-2 sm:pt-6">
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={form.autoHalfDayOnLate}
                        onChange={(e) => setForm({ ...form, autoHalfDayOnLate: e.target.checked })}
                        className="rounded accent-amber-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">Auto Half-Day Penalty if late beyond grace</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800/80">
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-extrabold rounded-xl text-xs shadow-sm transition-all flex items-center space-x-1.5"
              >
                {updateMutation.isPending ? "Saving..." : "Save Policy Config"}
              </button>
            </div>
          </form>

          {/* Radar Preview & Info (Span 1) */}
          <div className="space-y-4">
            
            <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Navigation size={14} className="text-amber-500" />
                Fencing Boundary Radar
              </h3>
              <div className="h-44 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center relative overflow-hidden">
                <div className="relative text-center z-10 space-y-1">
                  <MapPin className="mx-auto text-amber-500 animate-bounce" size={28} />
                  <p className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">{form.officeName || "Main Office"}</p>
                  <p className="text-[11px] text-slate-400 font-semibold">Radius Limit: {form.allowedRadiusMeters} meters</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Map size={14} className="text-amber-500" />
                Fencing Rules Summary
              </h3>
              
              <div className="space-y-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 font-medium">Fencing Mode</span>
                  <span className="capitalize">{form.attendanceMode?.replace("_", " ")}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 font-medium">GPS Check</span>
                  <span>{form.requireGps ? "Mandatory" : "Optional"}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 font-medium">Selfie Check</span>
                  <span>{form.requireSelfie ? "Mandatory" : "Optional"}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400 font-medium">Bypass Rules</span>
                  <span>{form.allowAdminBypassGeoFencing ? "Admins Allowed" : "No Bypass"}</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
};

export default CompanyAttendanceSettings;