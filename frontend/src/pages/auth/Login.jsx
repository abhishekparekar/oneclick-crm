import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  Zap,
  BarChart3,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Building2,
  Sparkles,
} from "lucide-react";
import OneClickLogo from "../../components/common/OneClickLogo";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showQuickFill, setShowQuickFill] = useState(false);
  const { user, login } = useAuth();
  const navigate = useNavigate();

  // If already authenticated, redirect to appropriate portal
  useEffect(() => {
    if (user?.role) {
      if (user.role === "SuperAdmin") navigate("/superadmin/dashboard", { replace: true });
      else if (user.role === "CompanyAdmin") navigate("/company/dashboard", { replace: true });
      else if (user.role === "HR") navigate("/hr/dashboard", { replace: true });
      else if (user.role === "Manager") navigate("/manager/dashboard", { replace: true });
      else if (user.role === "Employee") navigate("/employee/dashboard", { replace: true });
      else navigate("/company/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const cleanEmail = email.trim();
      const cleanPass = password.trim();
      const loggedUser = await login({ email: cleanEmail, password: cleanPass });
      toast.success(`Welcome back, ${loggedUser?.name || "User"}!`);
      if (loggedUser?.role === "SuperAdmin") {
        navigate("/superadmin/dashboard", { replace: true });
      } else if (loggedUser?.role === "CompanyAdmin") {
        navigate("/company/dashboard", { replace: true });
      } else if (loggedUser?.role === "HR") {
        navigate("/hr/dashboard", { replace: true });
      } else if (loggedUser?.role === "Manager") {
        navigate("/manager/dashboard", { replace: true });
      } else if (loggedUser?.role === "Employee") {
        navigate("/employee/dashboard", { replace: true });
      } else {
        navigate("/company/dashboard", { replace: true });
      }
    } catch (err) {
      setError(err.message || "Failed to login");
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (fillEmail, fillPass) => {
    setEmail(fillEmail);
    setPassword(fillPass);
    setError("");
  };

  const handleForgotPassword = () => {
    toast("Please contact your workspace Super Admin or HR Administrator to reset your password.", {
      icon: "ℹ️",
      duration: 5000,
    });
  };

  const handleGoogleSignIn = () => {
    toast("Google SSO is active for enterprise domain workspaces. Please sign in with your corporate credentials.", {
      icon: "🔐",
      duration: 5000,
    });
  };

  return (
    <div className="min-h-screen bg-[#0A0F1D] text-slate-100 font-sans flex flex-col justify-between p-4 sm:p-8 lg:p-12 relative overflow-hidden selection:bg-blue-600 selection:text-white">
      
      {/* ── Ambient Blue & Slate Lighting ── */}
      <div className="fixed -top-36 -left-36 w-[550px] h-[550px] bg-gradient-to-br from-blue-600/20 via-indigo-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-1/4 -right-36 w-[500px] h-[500px] bg-gradient-to-bl from-sky-500/15 via-blue-700/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-36 left-1/3 w-[600px] h-[600px] bg-gradient-to-tr from-blue-900/20 via-slate-800/15 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Background Subtle Grid */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#1E293B0A_1px,transparent_1px),linear-gradient(to_bottom,#1E293B0A_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />

      {/* ── 2-Column Split Executive Layout ── */}
      <div className="w-full max-w-6xl mx-auto my-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">

        {/* ═══════════════════════════════════════════════════════════════
            LEFT COLUMN: Corporate Brand & Platform Capabilities
        ════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-8">
          
          {/* Top Logo */}
          <div className="flex items-center gap-3">
            <OneClickLogo variant="landscape" />
          </div>

          {/* Heading */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-wider">
              <Sparkles size={13} className="text-blue-400" />
              <span>Enterprise HRMS &amp; CRM Platform</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Welcome back to <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-white">
                One Click Business
              </span>
            </h1>

            {/* Blue Accent Rule */}
            <div className="w-16 h-1 rounded-full bg-gradient-to-r from-blue-600 to-sky-400" />

            <p className="text-slate-300 text-sm sm:text-base font-medium pt-1 max-w-md leading-relaxed">
              Unified workspace for attendance, automated payroll, lead CRM, task workflows, and team operations.
            </p>
          </div>

          {/* 3 Core Value Items */}
          <div className="space-y-4 pt-1">
            {/* Feature 1: Enterprise Security */}
            <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-[#0F172A]/70 border border-slate-800/80 hover:border-blue-500/40 transition-colors shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 shadow-xs">
                <Shield size={18} strokeWidth={2.2} />
              </div>
              <div>
                <h4 className="text-sm font-black text-white">Enterprise Security &amp; GPS Geofencing</h4>
                <p className="text-xs text-slate-400 font-medium mt-0.5 leading-relaxed">
                  SOC-2 compliant access controls with biometric and GPS selfie clock-in validation.
                </p>
              </div>
            </div>

            {/* Feature 2: Lead CRM & Follow-Up Automations */}
            <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-[#0F172A]/70 border border-slate-800/80 hover:border-blue-500/40 transition-colors shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0 shadow-xs">
                <Zap size={18} strokeWidth={2.2} />
              </div>
              <div>
                <h4 className="text-sm font-black text-white">Lead Pipeline &amp; Follow-Up Reminders</h4>
                <p className="text-xs text-slate-400 font-medium mt-0.5 leading-relaxed">
                  Real-time inquiry capture, WhatsApp campaigns, and automated follow-up notifications.
                </p>
              </div>
            </div>

            {/* Feature 3: Smart Payroll & Real-Time Analytics */}
            <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-[#0F172A]/70 border border-slate-800/80 hover:border-blue-500/40 transition-colors shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-xs">
                <BarChart3 size={18} strokeWidth={2.2} />
              </div>
              <div>
                <h4 className="text-sm font-black text-white">1-Click Payroll &amp; Workforce Insights</h4>
                <p className="text-xs text-slate-400 font-medium mt-0.5 leading-relaxed">
                  Automated salary calculations, tax deductions, PDF payslips, and productivity telemetry.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* ═══════════════════════════════════════════════════════════════
            RIGHT COLUMN: Executive Login Card
        ════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto">
          
          <div className="bg-[#0F172A]/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-blue-950/20 relative overflow-hidden">
            
            {/* Top Glow Accent Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-sky-400 to-blue-600" />

            {/* Form Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-black text-white tracking-tight">
                Sign In to Workspace
              </h2>
              <p className="text-slate-400 text-xs font-semibold mt-1">
                Enter your authorized credentials to continue
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="w-full mb-4 bg-rose-950/50 border border-rose-500/40 text-rose-200 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                <span className="text-sm">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="w-full space-y-4">
              
              {/* EMAIL ADDRESS */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300">
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-400 transition-colors">
                    <Mail size={16} strokeWidth={2.2} />
                  </div>
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="you@company.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0B101D] border border-slate-700/80 focus:border-blue-500 focus:bg-[#0E1528] focus:ring-2 focus:ring-blue-500/20 rounded-xl text-xs font-bold text-white placeholder-slate-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-400 transition-colors">
                    <Lock size={16} strokeWidth={2.2} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-2.5 bg-[#0B101D] border border-slate-700/80 focus:border-blue-500 focus:bg-[#0E1528] focus:ring-2 focus:ring-blue-500/20 rounded-xl text-xs font-bold text-white placeholder-slate-500 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Forgot Password Link */}
              <div className="text-right">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs font-bold text-blue-400 hover:text-blue-300 hover:underline transition-colors cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Corporate Blue CTA Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={15} strokeWidth={2.5} />
                  </>
                )}
              </button>

            </form>

            {/* OR Divider */}
            <div className="w-full flex items-center my-4">
              <div className="flex-1 h-px bg-slate-800" />
              <span className="px-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                OR
              </span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>

            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-700 hover:border-slate-600 bg-[#0B101D] hover:bg-[#11182B] text-xs font-bold text-slate-300 flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-xs"
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  fill="#EA4335"
                />
              </svg>
              <span>Sign in with Google</span>
            </button>

            {/* Register Link */}
            <div className="text-center mt-4">
              <p className="text-xs font-semibold text-slate-400">
                New company or enterprise?{" "}
                <Link
                  to="/register"
                  className="font-black text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Register Workspace →
                </Link>
              </p>
            </div>

            {/* Collapsible Quick Test Accounts */}
            <div className="w-full mt-4 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowQuickFill(!showQuickFill)}
                className="w-full flex items-center justify-between text-[10.5px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors cursor-pointer py-1"
              >
                <span>⚡ Quick Test Accounts</span>
                {showQuickFill ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>

              {showQuickFill && (
                <div className="flex flex-wrap gap-1.5 pt-2 animate-fadeIn">
                  <button
                    type="button"
                    onClick={() => fillCredentials("admin@gmail.com", "Admin@123")}
                    className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-[11px] font-bold border border-blue-500/30 transition-all cursor-pointer"
                  >
                    🏢 Company Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => fillCredentials("anita@gmail.com", "Admin@123")}
                    className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-[11px] font-bold border border-indigo-500/30 transition-all cursor-pointer"
                  >
                    👥 HR
                  </button>
                  <button
                    type="button"
                    onClick={() => fillCredentials("abhiparekar58@gmail.com", "Admin@123")}
                    className="px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 text-[11px] font-bold border border-sky-500/30 transition-all cursor-pointer"
                  >
                    📊 Manager
                  </button>
                  <button
                    type="button"
                    onClick={() => fillCredentials("omkar@gmail.com", "Admin@123")}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30 transition-all cursor-pointer"
                  >
                    👷 Employee
                  </button>
                  <button
                    type="button"
                    onClick={() => fillCredentials("icoded@gmail.com", "Admin@123")}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold border border-slate-700 transition-all cursor-pointer"
                  >
                    👑 SuperAdmin
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* ── Watermark Footer ── */}
      <footer className="relative z-10 text-center text-xs font-semibold text-slate-500 py-3 mt-4">
        © One Click Business HRMS • Powered by <span className="text-blue-400 font-bold">icoded</span>
      </footer>

    </div>
  );
};

export default Login;
