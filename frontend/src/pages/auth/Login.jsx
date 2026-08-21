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
    <div className="min-h-screen bg-[#070A12] text-slate-100 font-sans flex flex-col justify-between p-4 sm:p-8 lg:p-12 relative overflow-hidden selection:bg-rose-500 selection:text-white">
      
      {/* ── Ambient Background Lighting ── */}
      <div className="fixed -top-28 -left-28 w-[500px] h-[500px] bg-gradient-to-br from-fuchsia-600/30 via-purple-600/15 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-0 -right-28 w-[450px] h-[450px] bg-gradient-to-bl from-cyan-500/30 via-blue-600/15 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-36 -left-24 w-[550px] h-[550px] bg-gradient-to-tr from-orange-500/35 via-rose-600/20 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-24 -right-24 w-[480px] h-[480px] bg-gradient-to-tl from-purple-600/25 via-pink-600/15 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Decorative Geometric Triangles */}
      <div className="fixed top-[45%] left-10 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[18px] border-b-amber-400 -rotate-45 opacity-80 pointer-events-none hidden xl:block" />
      <div className="fixed bottom-28 right-12 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[20px] border-b-rose-400 rotate-45 opacity-80 pointer-events-none hidden xl:block" />

      {/* ── Full 2-Column Split Layout without any Boxed White Card ── */}
      <div className="w-full max-w-6xl mx-auto my-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">

        {/* ═══════════════════════════════════════════════════════════════
            LEFT COLUMN: Brand & Features Showcase
        ════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-8">
          
          {/* Top Logo */}
          <div>
            <OneClickLogo variant="landscape" />
          </div>

          {/* Heading */}
          <div className="space-y-3">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
              Welcome <br />
              <span className="text-[#FF7A00]">Back</span>
              <span className="text-[#00D2D3]">!</span>
            </h1>

            {/* Gradient accent bar */}
            <div className="w-20 h-1.5 rounded-full bg-gradient-to-r from-[#FF7A00] via-[#E11D48] to-[#00D2D3]" />

            <p className="text-slate-300 text-sm sm:text-base font-medium pt-2 max-w-md leading-relaxed">
              Sign in to your One Click Business workspace
            </p>
          </div>

          {/* 3 Core Value Items */}
          <div className="space-y-6 pt-2">
            {/* Feature 1: Secure Access */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <Shield size={22} strokeWidth={2.2} />
              </div>
              <div>
                <h4 className="text-base font-bold text-white tracking-wide">Secure Access</h4>
                <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5 leading-relaxed">
                  Your data is protected with enterprise-grade security.
                </p>
              </div>
            </div>

            {/* Feature 2: All in One */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
                <Zap size={22} strokeWidth={2.2} />
              </div>
              <div>
                <h4 className="text-base font-bold text-white tracking-wide">All in One</h4>
                <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5 leading-relaxed">
                  Manage your HR, Tasks, Projects, Attendance and more.
                </p>
              </div>
            </div>

            {/* Feature 3: Smart Analytics */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                <BarChart3 size={22} strokeWidth={2.2} />
              </div>
              <div>
                <h4 className="text-base font-bold text-white tracking-wide">Smart Analytics</h4>
                <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5 leading-relaxed">
                  Make better decisions with real-time insights.
                </p>
              </div>
            </div>
          </div>

          {/* Dot matrix pattern accent */}
          <div className="grid grid-cols-6 gap-2.5 w-32 opacity-40 pt-2">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            ))}
          </div>

        </div>

        {/* ═══════════════════════════════════════════════════════════════
            RIGHT COLUMN: Form Panel (Direct Dark Integration - NO Card)
        ════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-6 w-full max-w-lg mx-auto flex flex-col justify-center">
          
          {/* Form Header */}
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
              <span className="text-[#FB923C]">Welcome </span>
              <span className="text-[#F472B6]">Ba</span>
              <span className="text-[#38BDF8]">ck</span>
            </h2>
            <p className="text-slate-400 text-sm font-medium">
              Sign in to your One Click Business workspace
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="w-full mb-5 bg-rose-950/40 border border-rose-500/50 text-rose-200 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2.5">
              <span className="text-base">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            
            {/* EMAIL ADDRESS */}
            <div className="space-y-2">
              <label className="block text-[11.5px] font-extrabold uppercase tracking-wider text-slate-200 ml-1">
                EMAIL ADDRESS
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-amber-400 group-focus-within:text-cyan-400 transition-colors">
                  <Mail size={19} strokeWidth={2.2} />
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
                  className="w-full pl-12 pr-4 py-3.5 bg-[#131C2E] border-1.5 border-[#2D3E5F] focus:border-[#38BDF8] focus:bg-[#16233B] focus:shadow-[0_0_15px_rgba(56,189,248,0.35)] rounded-2xl text-sm font-semibold text-white placeholder-slate-400 outline-none transition-all"
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div className="space-y-2">
              <label className="block text-[11.5px] font-extrabold uppercase tracking-wider text-slate-200 ml-1">
                PASSWORD
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-amber-400 group-focus-within:text-cyan-400 transition-colors">
                  <Lock size={19} strokeWidth={2.2} />
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
                  className="w-full pl-12 pr-12 py-3.5 bg-[#131C2E] border-1.5 border-[#2D3E5F] focus:border-[#38BDF8] focus:bg-[#16233B] focus:shadow-[0_0_15px_rgba(56,189,248,0.35)] rounded-2xl text-sm font-semibold text-white placeholder-slate-400 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs font-bold text-[#38BDF8] hover:text-cyan-300 hover:underline transition-colors cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>

            {/* Multi-Stop Gradient CTA Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 rounded-full text-base font-black text-white bg-gradient-to-r from-[#FF7A00] via-[#E11D48] via-[#9333EA] to-[#00D2C4] hover:opacity-95 shadow-[0_6px_25px_rgba(225,29,72,0.45)] hover:shadow-[0_8px_30px_rgba(225,29,72,0.6)] transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-70 disabled:pointer-events-none cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={19} strokeWidth={2.5} />
                </>
              )}
            </button>

          </form>

          {/* OR Divider */}
          <div className="w-full flex items-center my-5">
            <div className="flex-1 h-px bg-slate-700/60" />
            <span className="px-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
              OR
            </span>
            <div className="flex-1 h-px bg-slate-700/60" />
          </div>

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full py-3.5 px-4 rounded-full border border-slate-700 hover:border-slate-500 bg-[#131C2E]/80 hover:bg-[#1A253D] text-sm font-bold text-slate-200 flex items-center justify-center gap-3 transition-all cursor-pointer shadow-sm"
          >
            <svg width="19" height="19" viewBox="0 0 24 24">
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
          <div className="text-center mt-5">
            <p className="text-sm font-semibold text-slate-300">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="font-black text-[#FB923C] hover:text-[#F472B6] transition-colors"
              >
                Register Company →
              </Link>
            </p>
          </div>

          {/* Security Guarantee Badge */}
          <div className="flex items-center justify-center gap-1.5 mt-4 pt-3 border-t border-slate-800/80 text-[11px] font-bold text-slate-400">
            <Shield size={13} className="text-rose-400" />
            <span>Secure. Simple. Smart.</span>
          </div>

          {/* Collapsible Quick Test Accounts */}
          <div className="w-full mt-4 pt-2 border-t border-slate-800/60">
            <button
              type="button"
              onClick={() => setShowQuickFill(!showQuickFill)}
              className="w-full flex items-center justify-between text-[11px] font-bold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer py-1"
            >
              <span>⚡ Quick Test Accounts</span>
              {showQuickFill ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showQuickFill && (
              <div className="flex flex-wrap gap-2 pt-2.5 animate-fadeIn">
                <button
                  type="button"
                  onClick={() => fillCredentials("admin@gmail.com", "Admin@123")}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all cursor-pointer"
                >
                  🏢 Company Admin
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials("anita@gmail.com", "Admin@123")}
                  className="px-2.5 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 text-xs font-bold border border-purple-800/50 transition-all cursor-pointer"
                >
                  👥 HR
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials("abhiparekar58@gmail.com", "Admin@123")}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 text-xs font-bold border border-amber-800/50 transition-all cursor-pointer"
                >
                  📊 Manager
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials("omkar@gmail.com", "Admin@123")}
                  className="px-2.5 py-1.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 text-xs font-bold border border-cyan-800/50 transition-all cursor-pointer"
                >
                  👷 Employee
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials("icoded@gmail.com", "Admin@123")}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  👑 SuperAdmin
                </button>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* ── Watermark Footer ── */}
      <footer className="relative z-10 text-center text-xs font-medium text-slate-500 py-3 mt-6">
        © One Click Business HRMS • Powered by <span className="text-cyan-400 font-semibold">icoded</span>
      </footer>

    </div>
  );
};

export default Login;
