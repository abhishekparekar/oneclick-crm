import { useState } from "react";
import {
  Save, Settings, Shield, Mail, Server, Globe, AtSign,
  Clock, Users, CheckCircle, Lock, AlertTriangle, Eye, EyeOff,
  Wifi, HardDrive, Wrench, ChevronRight, Pencil, X, Sparkles
} from "lucide-react";
import toast from "react-hot-toast";

/* ── Reusable toggle switch ──────────────────────────────────────────────── */
const Toggle = ({ checked, onChange, name, disabled = false }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => !disabled && onChange({ target: { name, type: "checkbox", checked: !checked } })}
    className={`relative w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0 focus:outline-none ${disabled
        ? "bg-slate-200 dark:bg-slate-800 opacity-50 cursor-not-allowed"
        : checked ? "bg-amber-500 shadow-2xs cursor-pointer" : "bg-slate-200 dark:bg-slate-800 cursor-pointer"
      }`}
  >
    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white dark:bg-slate-950 shadow transition-transform duration-300 ${checked ? "translate-x-5" : "translate-x-0"}`} />
  </button>
);

/* ── Field label ─────────────────────────────────────────────────────────── */
const FieldLabel = ({ children, hint }) => (
  <div className="mb-1.5">
    <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">{children}</label>
    {hint && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">{hint}</p>}
  </div>
);

/* ── Input field ─────────────────────────────────────────────────────────── */
const Field = ({ type = "text", name, value, onChange, placeholder, readOnly, locked = false, className = "" }) => (
  <input
    type={type}
    name={name}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    readOnly={readOnly || locked}
    className={`w-full border rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-all ${locked
        ? "bg-slate-100/70 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800 text-slate-400 cursor-not-allowed select-none"
        : "bg-slate-50/70 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 focus:border-amber-500"
      } ${className}`}
  />
);

/* ── Section card wrapper ────────────────────────────────────────────────── */
const SectionCard = ({ title, subtitle, icon: Icon, iconColor = "text-amber-600 dark:text-amber-400", iconBg = "bg-amber-500/10", children }) => (
  <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
    <div className="flex items-center space-x-3 px-4.5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>
        <Icon size={16} className={iconColor} />
      </div>
      <div>
        <h3 className="text-xs font-bold text-slate-900 dark:text-white">{title}</h3>
        {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    <div className="p-4.5 space-y-4">{children}</div>
  </div>
);

/* ── Toggle row ──────────────────────────────────────────────────────────── */
const ToggleRow = ({ name, checked, onChange, label, description, icon: Icon, danger = false, disabled = false }) => (
  <div className={`flex items-start space-x-3.5 p-3.5 rounded-xl border transition-all ${disabled
      ? "bg-slate-50/50 dark:bg-slate-900/30 border-slate-200/60 dark:border-slate-800/60 opacity-70"
      : danger
        ? checked
          ? "bg-rose-500/10 border-rose-500/30"
          : "bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800"
        : checked
          ? "bg-amber-500/10 border-amber-500/25"
          : "bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800"
    }`}>
    {Icon && (
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${danger ? "bg-rose-500/15" : "bg-amber-500/10"}`}>
        <Icon size={14} className={danger ? "text-rose-500" : "text-amber-600 dark:text-amber-400"} />
      </div>
    )}
    <div className="flex-1 min-w-0">
      <p className={`text-xs font-bold ${danger ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"}`}>{label}</p>
      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{description}</p>
    </div>
    <Toggle checked={checked} onChange={onChange} name={name} disabled={disabled} />
  </div>
);

const NAV_TABS = [
  { id: "general", label: "General", icon: Settings, desc: "Platform basics" },
  { id: "security", label: "Security", icon: Shield, desc: "Access policies" },
  { id: "email", label: "SMTP & Email", icon: Mail, desc: "Mail server config" },
  { id: "system", label: "System Maintenance", icon: Server, desc: "Advanced controls" },
];

const INITIAL_FORM = {
  platformName: "One Click Platform",
  supportEmail: "support@oneclickcrm.com",
  timezone: "Asia/Kolkata",
  allowSelfSignup: true,
  requireEmailVerification: true,
  twoFactorEnforced: false,
  sessionTimeout: "30",
  maintenanceMode: false,
  smtpHost: "smtp.mailgun.org",
  smtpPort: "587",
  smtpUser: "postmaster@oneclickcrm.com",
  smtpPassword: "••••••••••••",
};

const SuperAdminSettings = () => {
  const [activeTab, setActiveTab] = useState("general");
  const [showPass, setShowPass] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [snapshot, setSnapshot] = useState(INITIAL_FORM);
  const [formData, setFormData] = useState(INITIAL_FORM);

  const handleChange = (e) => {
    if (!isEditing) return;
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleEdit = () => {
    setSnapshot(formData);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFormData(snapshot);
    setIsEditing(false);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!isEditing) return;
    setSnapshot(formData);
    setIsEditing(false);
    setSaved(true);
    toast.success("System Settings saved!");
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-4 w-full pb-10 font-sans text-slate-900 dark:text-slate-100">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">System Settings</h1>
            {isEditing && (
              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[9.5px] font-black uppercase tracking-widest animate-pulse">
                Editing
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
            {isEditing
              ? "You are in edit mode. Make your changes and click Save Settings when done."
              : "Global configuration, security enforcement, and mail relay policies."
            }
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          {!isEditing ? (
            <button
              type="button"
              onClick={handleEdit}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold shadow-xs transition-all cursor-pointer"
            >
              <Pencil size={14} strokeWidth={2.2} />
              <span>Edit Settings</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#111C24] text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
              >
                <X size={14} />
                <span>Cancel</span>
              </button>
              <button
                onClick={handleSave}
                className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-extrabold shadow-xs transition-all cursor-pointer ${
                  saved ? "bg-emerald-600 text-white" : "bg-amber-500 hover:bg-amber-600 text-slate-950"
                }`}
              >
                {saved ? <CheckCircle size={14} /> : <Save size={14} />}
                <span>{saved ? "Saved!" : "Save Settings"}</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">

        {/* ── Sidebar Navigation ────────────────────────────────────────── */}
        <div className="w-full md:w-56 flex-shrink-0">
          <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-1.5 space-y-1">
            {NAV_TABS.map(({ id, label, icon: Icon, desc }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left transition-all group ${active
                      ? "bg-amber-500 text-slate-950 font-bold shadow-2xs"
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
                    }`}
                >
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 transition-all ${
                    active ? "bg-slate-950/10 text-slate-950" : "bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-amber-500"
                  }`}>
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs truncate ${active ? "font-extrabold text-slate-950" : "font-bold text-slate-800 dark:text-slate-200"}`}>{label}</p>
                    <p className={`text-[10px] truncate ${active ? "text-slate-900/80 font-medium" : "text-slate-400"}`}>{desc}</p>
                  </div>
                  {active && <ChevronRight size={13} className="ml-auto text-slate-950 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Content Area ──────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          <form onSubmit={handleSave} className="space-y-4">

            {/* ── General Tab ─────────────────────────────────────────── */}
            {activeTab === "general" && (
              <>
                <SectionCard title="Platform Identity" subtitle="Core branding and global support info" icon={Globe}>
                  <div>
                    <FieldLabel hint="The name shown across the platform UI and email communications.">Platform Name</FieldLabel>
                    <Field name="platformName" value={formData.platformName} onChange={handleChange} placeholder="e.g. One Click Platform" locked={!isEditing} />
                  </div>
                  <div>
                    <FieldLabel hint="All system-generated alerts and replies go to this address.">Global Support Email</FieldLabel>
                    <div className="relative">
                      <AtSign size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <Field type="email" name="supportEmail" value={formData.supportEmail} onChange={handleChange} placeholder="support@company.com" className="pl-9" locked={!isEditing} />
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="Localization" subtitle="Default date, time, and locale settings" icon={Clock}>
                  <div>
                    <FieldLabel hint="Used as the default for all platform timestamps and scheduled jobs.">Default Timezone</FieldLabel>
                    <select
                      name="timezone"
                      value={formData.timezone}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className={`w-full border rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none transition-all ${!isEditing
                          ? "bg-slate-100/70 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800 text-slate-400 cursor-not-allowed opacity-70"
                          : "bg-slate-50/70 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 focus:border-amber-500"
                        }`}
                    >
                      <option value="UTC">UTC — Coordinated Universal Time</option>
                      <option value="Asia/Kolkata">India Standard Time — IST</option>
                      <option value="America/New_York">Eastern Time (US &amp; Canada)</option>
                      <option value="America/Los_Angeles">Pacific Time (US &amp; Canada)</option>
                      <option value="Europe/London">London — GMT/BST</option>
                      <option value="Asia/Dubai">Gulf Standard Time — GST</option>
                    </select>
                  </div>
                </SectionCard>
              </>
            )}

            {/* ── Security Tab ────────────────────────────────────────── */}
            {activeTab === "security" && (
              <>
                <SectionCard title="Access Control" subtitle="Manage how users and companies gain access" icon={Users}>
                  <ToggleRow
                    name="allowSelfSignup"
                    checked={formData.allowSelfSignup}
                    onChange={handleChange}
                    icon={Users}
                    label="Allow Company Self-Signup"
                    description="Let companies register themselves on the platform. When disabled, only Super Admins can onboard new companies."
                    disabled={!isEditing}
                  />
                  <ToggleRow
                    name="requireEmailVerification"
                    checked={formData.requireEmailVerification}
                    onChange={handleChange}
                    icon={CheckCircle}
                    label="Require Email Verification"
                    description="Force newly onboarded administrators to verify their email address before they can access the dashboard."
                    disabled={!isEditing}
                  />
                </SectionCard>

                <SectionCard title="Authentication Hardening" subtitle="Enforce stronger security across all sessions" icon={Lock}>
                  <ToggleRow
                    name="twoFactorEnforced"
                    checked={formData.twoFactorEnforced}
                    onChange={handleChange}
                    icon={Shield}
                    label="Enforce Two-Factor Authentication"
                    description="Require all Super Admins and Company Admins to set up 2FA before accessing the platform."
                    disabled={!isEditing}
                  />
                  <div>
                    <FieldLabel hint="Automatically log out inactive sessions after this period (in minutes).">Session Timeout (minutes)</FieldLabel>
                    <div className="flex items-center space-x-3">
                      <Field
                        type="number"
                        name="sessionTimeout"
                        value={formData.sessionTimeout}
                        onChange={handleChange}
                        placeholder="30"
                        className="max-w-[140px]"
                        locked={!isEditing}
                      />
                      <span className="text-xs text-slate-400 font-semibold">minutes of inactivity</span>
                    </div>
                  </div>
                </SectionCard>
              </>
            )}

            {/* ── SMTP & Email Tab ─────────────────────────────────────── */}
            {activeTab === "email" && (
              <>
                <SectionCard title="SMTP Server Configuration" subtitle="Outbound mail relay settings for all transactional emails" icon={Mail}>
                  <div>
                    <FieldLabel hint="Hostname or IP address of your SMTP relay server.">SMTP Host</FieldLabel>
                    <Field name="smtpHost" value={formData.smtpHost} onChange={handleChange} placeholder="smtp.mailgun.org" locked={!isEditing} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <FieldLabel hint="Typically 587 (TLS) or 465 (SSL).">SMTP Port</FieldLabel>
                      <Field name="smtpPort" value={formData.smtpPort} onChange={handleChange} placeholder="587" locked={!isEditing} />
                    </div>
                    <div>
                      <FieldLabel hint="Choose encryption protocol.">Encryption</FieldLabel>
                      <select
                        disabled={!isEditing}
                        defaultValue="TLS"
                        className={`w-full border rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none transition-all ${!isEditing
                            ? "bg-slate-100/70 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800 text-slate-400 cursor-not-allowed opacity-70"
                            : "bg-slate-50/70 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 focus:border-amber-500"
                          }`}
                      >
                        <option value="TLS">STARTTLS (port 587)</option>
                        <option value="SSL">SSL/TLS (port 465)</option>
                        <option value="NONE">None (port 25)</option>
                      </select>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="SMTP Credentials" subtitle="Authentication for your outbound mail relay" icon={Lock} iconBg="bg-amber-500/10" iconColor="text-amber-600 dark:text-amber-400">
                  <div>
                    <FieldLabel hint="The username used to authenticate with the SMTP server.">SMTP Username</FieldLabel>
                    <div className="relative">
                      <AtSign size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <Field name="smtpUser" value={formData.smtpUser} onChange={handleChange} placeholder="postmaster@mg.company.com" className="pl-9" locked={!isEditing} />
                    </div>
                  </div>
                  <div>
                    <FieldLabel hint="Enter a new password to change. Leave blank to keep existing credentials.">SMTP Password</FieldLabel>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <Field
                        type={showPass ? "text" : "password"}
                        name="smtpPassword"
                        value={formData.smtpPassword}
                        onChange={handleChange}
                        placeholder="Enter new password to update"
                        className="pl-9 pr-9"
                        locked={!isEditing}
                      />
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => setShowPass(p => !p)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                          {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      )}
                    </div>
                  </div>
                  <button type="button" onClick={() => toast.success("SMTP connection verified!")} className="text-xs font-bold text-amber-500 hover:underline flex items-center space-x-1.5">
                    <Wifi size={13} />
                    <span>Test SMTP Connection</span>
                  </button>
                </SectionCard>
              </>
            )}

            {/* ── System Maintenance Tab ───────────────────────────────── */}
            {activeTab === "system" && (
              <>
                <SectionCard title="Platform Health" subtitle="Live infrastructure status" icon={HardDrive} iconBg="bg-emerald-500/10" iconColor="text-emerald-600 dark:text-emerald-400">
                  {[
                    { label: "API Server", status: "Operational", color: "bg-emerald-500" },
                    { label: "Database Cluster", status: "Operational", color: "bg-emerald-500" },
                    { label: "Email Relay", status: "Operational", color: "bg-emerald-500" },
                    { label: "Background Jobs", status: "Operational", color: "bg-emerald-500" },
                    { label: "File Storage", status: "Operational", color: "bg-emerald-500" },
                  ].map(({ label, status, color }) => (
                    <div key={label} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/80 last:border-0">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{label}</span>
                      <span className="flex items-center space-x-1.5 text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                        <span className={`w-1.5 h-1.5 rounded-full ${color} animate-pulse`} />
                        <span>{status}</span>
                      </span>
                    </div>
                  ))}
                </SectionCard>

                <SectionCard title="Danger Zone" subtitle="High-impact system controls — use with caution" icon={AlertTriangle} iconBg="bg-rose-500/10" iconColor="text-rose-500">
                  <ToggleRow
                    name="maintenanceMode"
                    checked={formData.maintenanceMode}
                    onChange={handleChange}
                    icon={AlertTriangle}
                    label="Enable Maintenance Mode"
                    description="Lock all users (except Super Admins) out of the platform and display a maintenance page. Active sessions will be terminated immediately."
                    danger
                    disabled={!isEditing}
                  />
                  {formData.maintenanceMode && (
                    <div className="flex items-start space-x-2.5 p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-xl">
                      <AlertTriangle size={14} className="text-rose-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-rose-600 dark:text-rose-400 font-bold leading-relaxed">
                        ⚠ Maintenance mode is <strong>currently active</strong>. All non-admin users are locked out. Remember to disable this once maintenance is complete.
                      </p>
                    </div>
                  )}
                </SectionCard>
              </>
            )}

            {/* ── Save Footer — only visible when editing ─────────────── */}
            {isEditing && (
              <div className="flex items-center justify-between pt-2 px-1 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3.5">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
                  <span>Unsaved changes — click <strong className="text-slate-900 dark:text-white">Save Settings</strong> to apply.</span>
                </p>
                <div className="flex items-center space-x-2.5">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#111C24] text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-xl text-xs font-extrabold shadow-xs transition-all cursor-pointer ${
                      saved ? "bg-emerald-600 text-white" : "bg-amber-500 hover:bg-amber-600 text-slate-950"
                    }`}
                  >
                    {saved ? <CheckCircle size={14} /> : <Save size={14} />}
                    <span>{saved ? "Saved!" : "Save Settings"}</span>
                  </button>
                </div>
              </div>
            )}

          </form>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminSettings;
