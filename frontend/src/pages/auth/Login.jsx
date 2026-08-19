import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import {
  Lock, Mail, Eye, EyeOff, ArrowRight, ShieldCheck,
  CheckCircle2, Sparkles, MapPin, DollarSign, HeartHandshake, Building2, User
} from "lucide-react";
import OneClickLogo from "../../components/common/OneClickLogo";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login({ email, password });
      if (user?.role === "SuperAdmin") {
        navigate("/superadmin/dashboard");
      } else if (user?.role === "CompanyAdmin") {
        navigate("/company/dashboard");
      } else if (user?.role === "HR") {
        navigate("/hr/dashboard");
      } else if (user?.role === "Manager") {
        navigate("/manager/dashboard");
      } else if (user?.role === "Employee") {
        navigate("/employee/dashboard");
      } else {
        navigate("/company/dashboard");
      }
    } catch (err) {
      setError(err.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (fillEmail, fillPass) => {
    setEmail(fillEmail);
    setPassword(fillPass);
    setError("");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#070A10] text-slate-900 dark:text-slate-100 font-sans flex items-center justify-center p-3 sm:p-6 lg:p-8 relative overflow-hidden transition-colors duration-300">

      {/* Ambient background mesh lighting */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-tr from-amber-500/15 via-orange-500/10 to-transparent rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
      <div className="absolute bottom-0 right-1/4 w-[450px] h-[450px] bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-transparent rounded-full blur-3xl pointer-events-none translate-y-1/2" />

      {/* Background grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.04)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none z-0" />

      {/* Main Container Card */}
      <div className="w-full max-w-4xl bg-white dark:bg-[#111C24] rounded-3xl shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-200/80 dark:border-slate-800 overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10">

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
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Unified Portal Access</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug">
                Welcome back to <span className="text-amber-400">ONE CLICK</span>
              </h1>
              <p className="text-slate-400 text-xs font-medium leading-relaxed">
                Sign in to manage workforce attendance, task boards, payroll, and department operations.
              </p>
            </div>

            {/* Feature checklist */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2.5 text-xs font-bold text-slate-300">
                <div className="w-6 h-6 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400 flex-shrink-0">
                  <MapPin size={13} />
                </div>
                <span>GPS Geofenced Attendance</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-bold text-slate-300">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400 flex-shrink-0">
                  <DollarSign size={13} />
                </div>
                <span>Automated Payroll &amp; Slips</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-bold text-slate-300">
                <div className="w-6 h-6 rounded-lg bg-cyan-500/15 flex items-center justify-center text-cyan-400 flex-shrink-0">
                  <HeartHandshake size={13} />
                </div>
                <span>HR Workspace &amp; Onboarding</span>
              </div>
            </div>
          </div>


        </div>

        {/* ── RIGHT FORM PANEL (Seamless Sign In Form for All Devices) ───── */}
        <div className="col-span-1 lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between bg-white dark:bg-[#111C24]">

          <div className="space-y-5 sm:space-y-6">

            {/* Mobile-Only Logo Header */}
            <div className="lg:hidden text-center pb-1">
              <div className="inline-block bg-[#090D16] p-3 rounded-2xl shadow-md border border-white/10">
                <OneClickLogo variant="landscape" />
              </div>
            </div>

            {/* Title Header */}
            <div className="text-center sm:text-left">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Sign In to Your Workspace</h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-1">
                Enter your registered Email ID or 10-digit Mobile Number.
              </p>
            </div>

            {/* Error Alert Banner */}
            {error && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 px-4 py-3 rounded-xl text-xs font-bold flex items-start gap-2.5 animate-fadeIn">
                <span className="shrink-0 text-base">⚠️</span>
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Email or Phone Input */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Email Address or Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail size={15} />
                  </div>
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. anita@gmail.com or 8485877633"
                    className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer">
                    Mobile No. or Custom Pass
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={15} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 sm:py-3 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 sm:py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-slate-950 bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-500/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-70 disabled:pointer-events-none mt-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <ArrowRight size={15} strokeWidth={2.5} />
                  </>
                )}
              </button>

            </form>

            {/* Quick Demo Credentials Helper */}
            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 space-y-2">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Quick Fill Test Accounts:</p>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => fillCredentials("admin@gmail.com", "Admin@123")}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold border border-emerald-200/80 dark:border-emerald-800/60 transition-all active:scale-95 shadow-2xs cursor-pointer"
                >
                  🏢 Company Admin
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials("anita@gmail.com", "Admin@123")}
                  className="px-2.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-[11px] font-bold border border-purple-200/80 dark:border-purple-800/60 transition-all active:scale-95 shadow-2xs cursor-pointer"
                >
                  👥 HR (Anita)
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials("abhiparekar58@gmail.com", "Admin@123")}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-[11px] font-bold border border-amber-200/80 dark:border-amber-800/60 transition-all active:scale-95 shadow-2xs cursor-pointer"
                >
                  📊 Manager
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials("omkar@gmail.com", "Admin@123")}
                  className="px-2.5 py-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 text-[11px] font-bold border border-cyan-200/80 dark:border-cyan-800/60 transition-all active:scale-95 shadow-2xs cursor-pointer"
                >
                  👷 Employee (Omkar)
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials("icoded@gmail.com", "Admin@123")}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold border border-slate-300/80 dark:border-slate-700 transition-all active:scale-95 shadow-2xs cursor-pointer"
                >
                  👑 SuperAdmin
                </button>
              </div>
            </div>

          </div>

          {/* Footer Register Link */}
          <div className="pt-5 border-t border-slate-100 dark:border-slate-800/80 text-center mt-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="font-extrabold text-amber-600 dark:text-amber-400 hover:underline transition-all"
              >
                Start free 7-day trial →
              </Link>
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};

export default Login;
