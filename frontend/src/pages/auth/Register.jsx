import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  Building2, User, Mail, Phone, Lock, Eye, EyeOff,
  CheckCircle2, Sparkles, ArrowRight, Shield, Clock, Users
} from "lucide-react";
import OneClickLogo from "../../components/common/OneClickLogo";

const TRIAL_FEATURES = [
  { icon: Clock, text: "7-Day Free Trial — No Credit Card Required" },
  { icon: Users, text: "Up to 10 Active Employees Included" },
  { icon: Shield, text: "Full Access to Core HRMS Modules" },
  { icon: CheckCircle2, text: "Tasks, Attendance, Leave & Payroll" },
];

const InputField = ({ id, label, type = "text", icon: Icon, placeholder, value, onChange, required = true, extra }) => (
  <div className="space-y-1.5">
    <label htmlFor={id} className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
        <Icon size={15} />
      </div>
      <input
        id={id}
        name={id}
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
      />
      {extra}
    </div>
  </div>
);

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    companyName: "",
    ownerName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const user = await register({
        companyName: form.companyName,
        ownerName: form.ownerName,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      setSuccess(true);
      setTimeout(() => {
        if (user?.role === "CompanyAdmin") {
          navigate("/company/dashboard");
        }
      }, 1500);
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#070A10] text-slate-900 dark:text-slate-100 font-sans flex items-center justify-center p-3 sm:p-6 lg:p-8 relative overflow-hidden transition-colors duration-300">

      {/* Ambient background mesh lighting */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-tr from-amber-500/15 via-orange-500/10 to-transparent rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
      <div className="absolute bottom-0 right-1/4 w-[450px] h-[450px] bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-transparent rounded-full blur-3xl pointer-events-none translate-y-1/2" />

      {/* Background grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.04)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none z-0" />

      {/* Main Container Card */}
      <div className="w-full max-w-5xl bg-white dark:bg-[#111C24] rounded-3xl shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-200/80 dark:border-slate-800 overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10">

        {/* ── LEFT SHOWCASE PANEL (Desktop 5 columns - Hidden on Mobile) ── */}
        <div className="hidden lg:flex lg:col-span-5 bg-[#090D16] text-white p-8 sm:p-10 flex-col justify-between relative overflow-hidden border-r border-white/[0.06]">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-orange-500/15 rounded-full blur-2xl pointer-events-none" />

          {/* Logo & Header */}
          <div className="space-y-6 relative z-10">
            <div className="inline-block bg-white/5 backdrop-blur-md p-2.5 rounded-2xl border border-white/10 shadow-sm">
              <OneClickLogo variant="landscape" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
                <Sparkles size={11} className="text-amber-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">7-Day Free Trial</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug">
                Start Managing <br />
                <span className="text-amber-400">Your Team Today</span>
              </h1>
              <p className="text-slate-400 text-xs font-medium leading-relaxed">
                Register your company and get full access to all core HR features for 7 days — completely free.
              </p>
            </div>

            {/* Feature List */}
            <div className="space-y-3 pt-2">
              {TRIAL_FEATURES.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2.5 text-xs font-bold text-slate-300">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400 flex-shrink-0">
                    <Icon size={13} />
                  </div>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Note */}
          <div className="pt-8 border-t border-white/[0.06] relative z-10">
            <p className="text-slate-400 text-[11px] font-medium leading-relaxed">
              After 7 days, all operations are paused until you upgrade to a paid plan. Upgrade anytime from your dashboard.
            </p>
          </div>
        </div>

        {/* ── RIGHT FORM PANEL (Registration Form) ─────────────────── */}
        <div className="col-span-1 lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between bg-white dark:bg-[#111C24]">

          <div className="space-y-5 sm:space-y-6">

            {/* Mobile-Only Logo Header */}
            <div className="lg:hidden text-center pb-1">
              <div className="inline-block bg-[#090D16] p-3 rounded-2xl shadow-md border border-white/10">
                <OneClickLogo variant="landscape" />
              </div>
            </div>

            {/* Heading */}
            <div className="text-center sm:text-left">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Create Your Workspace Account</h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-1">
                Already have an account?{" "}
                <Link to="/login" className="font-extrabold text-amber-600 dark:text-amber-400 hover:underline transition-colors">
                  Sign in here
                </Link>
              </p>
            </div>

            {/* Trial Badge */}
            <div className="flex items-center gap-3 bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/20 rounded-2xl px-4 py-3 shadow-2xs">
              <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0 text-slate-950">
                <Sparkles size={15} strokeWidth={2.2} />
              </div>
              <div>
                <p className="text-amber-700 dark:text-amber-300 text-[11px] font-black uppercase tracking-wider">7-Day Free Trial Included</p>
                <p className="text-slate-600 dark:text-slate-300 text-xs font-semibold mt-0.5">
                  10 employees • All core modules &amp; features included
                </p>
              </div>
            </div>

            {/* Success Message */}
            {success && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-4 flex items-center gap-3 animate-fadeIn">
                <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="text-emerald-800 dark:text-emerald-200 font-black text-xs">Registration Successful! 🎉</p>
                  <p className="text-emerald-700 dark:text-emerald-300 text-[11px] font-medium mt-0.5">Redirecting you to your workspace dashboard…</p>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 px-4 py-3 rounded-xl text-xs font-bold flex items-start gap-2.5 animate-fadeIn">
                <span className="shrink-0 text-base">⚠️</span>
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
              <InputField
                id="companyName"
                label="Company Name"
                icon={Building2}
                placeholder="e.g. Acme Corporation"
                value={form.companyName}
                onChange={set("companyName")}
              />

              <InputField
                id="ownerName"
                label="Owner / Admin Name"
                icon={User}
                placeholder="e.g. Ramesh Kumar"
                value={form.ownerName}
                onChange={set("ownerName")}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <InputField
                  id="email"
                  label="Email Address"
                  type="email"
                  icon={Mail}
                  placeholder="admin@company.com"
                  value={form.email}
                  onChange={set("email")}
                />
                <InputField
                  id="phone"
                  label="Phone Number"
                  type="tel"
                  icon={Phone}
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={set("phone")}
                  required={false}
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={15} />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Min. 6 characters"
                    value={form.password}
                    onChange={set("password")}
                    className="w-full pl-10 pr-10 py-2.5 sm:py-3 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label htmlFor="confirmPassword" className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={15} />
                  </div>
                  <input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    required
                    placeholder="Re-enter your password"
                    value={form.confirmPassword}
                    onChange={set("confirmPassword")}
                    className={`w-full pl-10 pr-10 py-2.5 sm:py-3 rounded-xl text-xs font-semibold outline-none transition-all ${
                      form.confirmPassword && form.confirmPassword !== form.password
                        ? "border-rose-400 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 focus:ring-2 focus:ring-rose-400/30"
                        : "bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {form.confirmPassword && form.confirmPassword !== form.password && (
                  <p className="mt-1 text-[11px] font-bold text-rose-500">Passwords do not match</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || success}
                className="w-full py-3 sm:py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-slate-950 bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-500/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-70 disabled:pointer-events-none mt-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                    <span>Creating Your Workspace…</span>
                  </>
                ) : (
                  <>
                    <span>Start Free Trial</span>
                    <ArrowRight size={15} strokeWidth={2.5} />
                  </>
                )}
              </button>
            </form>

            {/* Terms */}
            <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center font-medium">
              By registering, you agree to our{" "}
              <span className="text-amber-600 dark:text-amber-400 font-bold cursor-pointer hover:underline">Terms of Service</span>{" "}
              and{" "}
              <span className="text-amber-600 dark:text-amber-400 font-bold cursor-pointer hover:underline">Privacy Policy</span>.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};

export default Register;
