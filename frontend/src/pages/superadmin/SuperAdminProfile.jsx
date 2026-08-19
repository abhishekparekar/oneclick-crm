import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  User, Mail, Phone, Lock, Shield, Save, Camera,
  CheckCircle, Eye, EyeOff, Clock, Globe, Key,
  AlertTriangle, Pencil, X, BadgeCheck
} from "lucide-react";

/* ── Tiny field label ────────────────────────────────────────────────────── */
const FL = ({ children, hint }) => (
  <div className="mb-1.5">
    <label className="block text-xs font-extrabold text-sa-text-secondary uppercase tracking-wider">{children}</label>
    {hint && <p className="text-[11px] text-sa-text-secondary mt-0.5">{hint}</p>}
  </div>
);

/* ── Input field ─────────────────────────────────────────────────────────── */
const PF = ({ type = "text", name, value, onChange, placeholder, icon: Icon, disabled, children, className = "" }) => (
  <div className="relative">
    {Icon && <Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sa-text-secondary pointer-events-none z-10" />}
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full border rounded-xl py-2.5 text-sm text-sa-text placeholder-sa-text-secondary focus:outline-none transition-all ${
        Icon ? "pl-10" : "pl-3.5"
      } ${
        disabled
          ? "bg-sa-bg/60 border-sa-border/50 text-sa-text-secondary cursor-not-allowed"
          : "bg-sa-bg border-sa-border focus:border-sa-primary"
      } ${className}`}
    />
    {children}
  </div>
);

/* ── Password strength bar ───────────────────────────────────────────────── */
const StrengthBar = ({ password }) => {
  const len   = password.length;
  const score = !len ? 0
    : len < 6    ? 1
    : len < 10 && !/[A-Z]/.test(password) ? 2
    : len >= 10 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password) ? 4
    : 3;

  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["", "bg-rose-500", "bg-amber-400", "bg-[#8EB5F0]", "bg-emerald-500"];
  const textC  = ["", "text-rose-500", "text-amber-500", "text-[#f59e0b]", "text-emerald-500"];

  if (!len) return null;
  return (
    <div className="mt-2 space-y-1">
      <div className="flex space-x-1">
        {[1,2,3,4].map(i => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= score ? colors[score] : "bg-sa-border"}`} />
        ))}
      </div>
      <p className={`text-[11px] font-extrabold ${textC[score]}`}>{labels[score]}</p>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════ */

const SuperAdminProfile = () => {
  const { user } = useAuth();

  const [editing,     setEditing]     = useState(false);
  const [savedInfo,   setSavedInfo]   = useState(false);
  const [savedPwd,    setSavedPwd]    = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const INITIAL = {
    name:  user?.name  || "Super Admin",
    email: user?.email || "admin@example.com",
    phone: "+1 234 567 8900",
  };

  const [formData,   setFormData]   = useState(INITIAL);
  const [snapshot,   setSnapshot]   = useState(INITIAL);
  const [pwdData,    setPwdData]    = useState({ current: "", newPwd: "", confirm: "" });
  const [pwdError,   setPwdError]   = useState("");

  const handleEdit   = () => { setSnapshot(formData); setEditing(true); };
  const handleCancel = () => { setFormData(snapshot); setEditing(false); };

  const handleChange = (e) => {
    if (!editing) return;
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSaveInfo = (e) => {
    e.preventDefault();
    setSnapshot(formData);
    setEditing(false);
    setSavedInfo(true);
    setTimeout(() => setSavedInfo(false), 2500);
  };

  const handlePwdChange = (e) => {
    setPwdData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setPwdError("");
  };

  const handleUpdatePwd = (e) => {
    e.preventDefault();
    if (!pwdData.current) { setPwdError("Enter your current password."); return; }
    if (pwdData.newPwd.length < 8) { setPwdError("New password must be at least 8 characters."); return; }
    if (pwdData.newPwd !== pwdData.confirm) { setPwdError("Passwords do not match."); return; }
    setPwdData({ current: "", newPwd: "", confirm: "" });
    setSavedPwd(true);
    setTimeout(() => setSavedPwd(false), 2500);
  };

  /* avatar initials */
  const initials = (formData.name || "SA").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="w-full pb-14 space-y-3">

      {/* ── Gradient Hero Banner ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-sa-border shadow-md bg-gradient-to-r from-[#d97706] via-[#f59e0b] to-[#06B6D4]">

        <div className="relative px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          {/* Left: avatar + name */}
          <div className="flex items-center space-x-5">
            {/* Avatar */}
            <div className="relative group flex-shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm text-white flex items-center justify-center text-3xl font-black border-2 border-white/30 shadow-lg">
                {initials}
              </div>
              <button className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={18} className="text-white" />
              </button>
              {/* Online dot */}
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white shadow" />
            </div>

            {/* Name + role */}
            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <h1 className="text-2xl font-black text-white leading-tight">{formData.name}</h1>
                <BadgeCheck size={20} className="text-[#fbbf24] flex-shrink-0" />
              </div>
              <p className="text-sm text-white/75 font-semibold flex items-center flex-wrap gap-x-2 mt-1">
                <span className="flex items-center space-x-1">
                  <Shield size={12} className="text-white/60" />
                  <span>Super Administrator</span>
                </span>
                <span className="w-1 h-1 rounded-full bg-white/40 inline-block" />
                <span className="flex items-center space-x-1">
                  <Globe size={12} className="text-white/60" />
                  <span>Platform-wide access</span>
                </span>
              </p>
              <div className="flex items-center space-x-2 mt-2">
                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-400/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-extrabold uppercase tracking-widest flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  <span>Active</span>
                </span>
                <span className="text-white/50 text-[11px] font-medium">Last login: Today, 09:41 AM</span>
              </div>
            </div>
          </div>

          {/* Right: action buttons */}
          <div className="flex items-center space-x-2 self-start sm:self-center flex-shrink-0">
            {!editing ? (
              <button
                onClick={handleEdit}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl font-bold text-sm bg-white/15 border border-white/25 text-white hover:bg-white/25 backdrop-blur-sm transition-all shadow"
              >
                <Pencil size={14} />
                <span>Edit Profile</span>
              </button>
            ) : (
              <>
                <button onClick={handleCancel} className="flex items-center space-x-2 px-4 py-2 rounded-xl font-bold text-sm bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all">
                  <X size={14} />
                  <span>Cancel</span>
                </button>
                <button
                  onClick={handleSaveInfo}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold text-sm shadow transition-all ${savedInfo ? "bg-emerald-400 text-white" : "bg-white text-[#f59e0b] hover:bg-white/90"}`}
                >
                  {savedInfo ? <CheckCircle size={14} /> : <Save size={14} />}
                  <span>{savedInfo ? "Saved!" : "Save Changes"}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Two-column layout ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── LEFT: Security sidebar ────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Account Security card */}
          <div className="bg-sa-surface rounded-2xl border border-sa-border shadow-sm overflow-hidden">
            <div className="flex items-center space-x-3 px-5 py-4 border-b border-sa-border bg-sa-bg/40">
              <div className="w-8 h-8 rounded-xl bg-sa-primary/10 flex items-center justify-center">
                <Shield size={16} className="text-sa-primary" />
              </div>
              <h3 className="text-sm font-extrabold text-sa-text">Account Security</h3>
            </div>
            <div className="p-4 space-y-3">
              {[
                {
                  label: "Two-Factor Auth",
                  value: <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[11px] font-black uppercase tracking-wide flex items-center space-x-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /><span>Enabled</span></span>
                },
                {
                  label: "Last Login",
                  value: <span className="text-xs font-bold text-sa-text flex items-center space-x-1"><Clock size={11} className="text-sa-text-secondary" /><span>Today, 09:41 AM</span></span>
                },
                {
                  label: "Account Role",
                  value: <span className="text-xs font-black text-sa-primary">Super Admin</span>
                },
                {
                  label: "Access Level",
                  value: <span className="text-xs font-bold text-sa-text">Platform-wide</span>
                },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-sa-border last:border-0">
                  <span className="text-xs font-bold text-sa-text-secondary">{label}</span>
                  {value}
                </div>
              ))}
            </div>
          </div>

          {/* Danger zone mini card */}
          <div className="bg-rose-500/8 rounded-2xl border border-rose-500/20 p-4 space-y-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle size={15} className="text-rose-500 flex-shrink-0" />
              <p className="text-xs font-extrabold text-rose-600 dark:text-rose-400">Danger Zone</p>
            </div>
            <p className="text-[11px] text-sa-text-secondary leading-relaxed">
              Deleting your account is permanent and cannot be undone. Contact the platform owner if needed.
            </p>
            <button className="w-full text-xs font-extrabold text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded-xl py-2 hover:bg-rose-500/10 transition-all">
              Request Account Deletion
            </button>
          </div>
        </div>

        {/* ── RIGHT: Forms ──────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Personal Information */}
          <div className="bg-sa-surface rounded-2xl border border-sa-border shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-sa-border bg-sa-bg/40">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-sa-primary/10 flex items-center justify-center">
                  <User size={16} className="text-sa-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-sa-text">Personal Information</h3>
                  <p className="text-[11px] text-sa-text-secondary mt-0.5">
                    {editing ? "Fields are now editable — make your changes." : "Click Edit Profile to update your details."}
                  </p>
                </div>
              </div>
              {editing && (
                <span className="px-2.5 py-1 rounded-lg bg-amber-400/15 border border-amber-400/30 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest animate-pulse">
                  Editing
                </span>
              )}
            </div>
            <form onSubmit={handleSaveInfo} className="p-5 space-y-4">
              <div>
                <FL>Full Name</FL>
                <PF name="name" value={formData.name} onChange={handleChange} icon={User} placeholder="Your full name" disabled={!editing} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <FL hint="Used for login and notifications.">Email Address</FL>
                  <PF type="email" name="email" value={formData.email} onChange={handleChange} icon={Mail} placeholder="you@company.com" disabled={!editing} />
                </div>
                <div>
                  <FL hint="Optional — for SMS alerts.">Phone Number</FL>
                  <PF name="phone" value={formData.phone} onChange={handleChange} icon={Phone} placeholder="+1 234 567 8900" disabled={!editing} />
                </div>
              </div>
              {editing && (
                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow transition-all ${savedInfo ? "bg-emerald-500 text-white" : "btn-primary"}`}
                  >
                    {savedInfo ? <CheckCircle size={15} /> : <Save size={15} />}
                    <span>{savedInfo ? "Saved!" : "Save Changes"}</span>
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Change Password */}
          <div className="bg-sa-surface rounded-2xl border border-sa-border shadow-sm overflow-hidden">
            <div className="flex items-center space-x-3 px-5 py-4 border-b border-sa-border bg-sa-bg/40">
              <div className="w-8 h-8 rounded-xl bg-[#f59e0b]/10 flex items-center justify-center">
                <Key size={16} className="text-[#f59e0b] dark:text-[#06B6D4]" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-sa-text">Change Password</h3>
                <p className="text-[11px] text-sa-text-secondary mt-0.5">Use a strong password of at least 8 characters.</p>
              </div>
            </div>
            <form onSubmit={handleUpdatePwd} className="p-5 space-y-4">
              {/* Current password */}
              <div>
                <FL>Current Password</FL>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sa-text-secondary pointer-events-none z-10" />
                  <input
                    type={showCurrent ? "text" : "password"}
                    name="current"
                    value={pwdData.current}
                    onChange={handlePwdChange}
                    placeholder="Enter current password"
                    className="w-full bg-sa-bg border border-sa-border rounded-xl pl-10 pr-10 py-2.5 text-sm text-sa-text placeholder-sa-text-secondary focus:outline-none focus:border-sa-primary transition-all"
                  />
                  <button type="button" onClick={() => setShowCurrent(p => !p)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sa-text-secondary hover:text-sa-text transition-colors">
                    {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* New + Confirm side by side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <FL>New Password</FL>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sa-text-secondary pointer-events-none z-10" />
                    <input
                      type={showNew ? "text" : "password"}
                      name="newPwd"
                      value={pwdData.newPwd}
                      onChange={handlePwdChange}
                      placeholder="Min. 8 characters"
                      className="w-full bg-sa-bg border border-sa-border rounded-xl pl-10 pr-10 py-2.5 text-sm text-sa-text placeholder-sa-text-secondary focus:outline-none focus:border-sa-primary transition-all"
                    />
                    <button type="button" onClick={() => setShowNew(p => !p)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sa-text-secondary hover:text-sa-text transition-colors">
                      {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <StrengthBar password={pwdData.newPwd} />
                </div>
                <div>
                  <FL>Confirm Password</FL>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sa-text-secondary pointer-events-none z-10" />
                    <input
                      type={showConfirm ? "text" : "password"}
                      name="confirm"
                      value={pwdData.confirm}
                      onChange={handlePwdChange}
                      placeholder="Repeat new password"
                      className={`w-full border rounded-xl pl-10 pr-10 py-2.5 text-sm text-sa-text placeholder-sa-text-secondary focus:outline-none transition-all ${
                        pwdData.confirm && pwdData.confirm !== pwdData.newPwd
                          ? "bg-rose-500/8 border-rose-500/40 focus:border-rose-500"
                          : pwdData.confirm && pwdData.confirm === pwdData.newPwd
                            ? "bg-emerald-500/8 border-emerald-500/40 focus:border-emerald-500"
                            : "bg-sa-bg border-sa-border focus:border-sa-primary"
                      }`}
                    />
                    <button type="button" onClick={() => setShowConfirm(p => !p)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sa-text-secondary hover:text-sa-text transition-colors">
                      {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {pwdData.confirm && pwdData.confirm === pwdData.newPwd && (
                    <p className="text-[11px] text-emerald-500 font-extrabold mt-1 flex items-center space-x-1"><CheckCircle size={11} /><span>Passwords match</span></p>
                  )}
                </div>
              </div>

              {/* Error */}
              {pwdError && (
                <div className="flex items-center space-x-2 p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl">
                  <AlertTriangle size={14} className="text-rose-500 flex-shrink-0" />
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-bold">{pwdError}</p>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow transition-all ${
                    savedPwd ? "bg-emerald-500 text-white" : "bg-[#f59e0b] hover:bg-[#d97706] text-white"
                  }`}
                >
                  {savedPwd ? <CheckCircle size={15} /> : <Key size={15} />}
                  <span>{savedPwd ? "Password Updated!" : "Update Password"}</span>
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SuperAdminProfile;
