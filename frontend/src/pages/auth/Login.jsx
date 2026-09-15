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
  Sparkles,
  KeyRound,
  X,
  CheckCircle,
  ExternalLink,
  Monitor,
} from "lucide-react";
import OneClickLogo from "../../components/common/OneClickLogo";
import { forgotPassword } from "../../api/authApi";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showQuickFill, setShowQuickFill] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotSuccessData, setForgotSuccessData] = useState(null);
  const [forgotError, setForgotError] = useState("");

  // Session conflict modal state (Stay Logged In vs Login Here)
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictLoading, setConflictLoading] = useState(false);

  const { user, login } = useAuth();
  const navigate = useNavigate();

  // Check if user was kicked out due to another login session
  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("session_invalidated")) {
      sessionStorage.removeItem("session_invalidated");
      setError("Your session has ended because this account was logged in on another device or browser.");
      toast.error("Logged out: This account is active in another session.");
    }
  }, []);

  // If already authenticated, redirect to appropriate portal
  useEffect(() => {
    if (user?.role) {
      if (user.role === "SuperAdmin" || user.role === "SubSuperAdmin") navigate("/superadmin/dashboard", { replace: true });
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
      if (loggedUser?.role === "SuperAdmin" || loggedUser?.role === "SubSuperAdmin") {
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
      if (err.code === "SESSION_CONFLICT") {
        setShowConflictModal(true);
        return;
      }
      setError(err.message || "Failed to login");
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginHere = async () => {
    setConflictLoading(true);
    try {
      const cleanEmail = email.trim();
      const cleanPass = password.trim();
      const loggedUser = await login({ email: cleanEmail, password: cleanPass }, true);
      setShowConflictModal(false);
      toast.success(`Session activated! Welcome back, ${loggedUser?.name || "User"}!`);
      if (loggedUser?.role === "SuperAdmin" || loggedUser?.role === "SubSuperAdmin") {
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
      toast.error(err.message || "Failed to take over session");
    } finally {
      setConflictLoading(false);
    }
  };

  const handleStayLoggedIn = () => {
    setShowConflictModal(false);
    toast("Login cancelled. Existing session remains active on the other device.", {
      icon: "ℹ️",
    });
  };

  const fillCredentials = (fillEmail, fillPass) => {
    setEmail(fillEmail);
    setPassword(fillPass);
    setError("");
  };

  const handleOpenForgotModal = () => {
    setForgotEmail(email?.trim() || "");
    setForgotError("");
    setForgotSent(false);
    setForgotSuccessData(null);
    setShowForgotModal(true);
  };

  const handleSendResetLink = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const targetEmail = forgotEmail.trim().toLowerCase();
    if (!targetEmail) {
      setForgotError("Please enter your registered email address.");
      return;
    }
    setForgotLoading(true);
    setForgotError("");
    try {
      const res = await forgotPassword(targetEmail);
      setForgotSent(true);
      setForgotSuccessData(res);
      toast.success(res.message || "Password reset link sent to your email!");
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to send reset link";
      setForgotError(msg);
      toast.error(msg);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans flex flex-col justify-between p-4 sm:p-8 lg:p-12 relative overflow-hidden selection:bg-blue-600 selection:text-white">
      
      {/* ── Soft Ambient Background Blurs (Clean White & Soft Blue) ── */}
      <div className="fixed -top-36 -left-36 w-[550px] h-[550px] bg-blue-100/60 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-1/4 -right-36 w-[500px] h-[500px] bg-sky-100/50 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-36 left-1/3 w-[600px] h-[600px] bg-indigo-100/40 rounded-full blur-3xl pointer-events-none" />

      {/* Background Grid Pattern */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#E2E8F066_1px,transparent_1px),linear-gradient(to_bottom,#E2E8F066_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />

      {/* ── 2-Column Split Executive White & Blue Layout ── */}
      <div className="w-full max-w-6xl mx-auto my-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">

        {/* ═══════════════════════════════════════════════════════════════
            LEFT COLUMN: Corporate Brand & Platform Capabilities
        ════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-7">
          
          {/* Top Logo */}
          <div className="flex items-center gap-3">
            <OneClickLogo variant="landscape" />
          </div>

          {/* Heading */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-black uppercase tracking-wider shadow-2xs">
              <Sparkles size={13} className="text-blue-600" />
              <span>Enterprise HRMS &amp; CRM Platform</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Welcome back to <br />
              <span className="text-blue-600">
                One Click Business
              </span>
            </h1>

            {/* Blue Accent Line */}
            <div className="w-16 h-1 rounded-full bg-gradient-to-r from-blue-600 to-sky-500" />

            <p className="text-slate-600 text-sm sm:text-base font-medium pt-1 max-w-md leading-relaxed">
              Unified operating system for attendance, automated payroll, lead CRM, task workflows, and team operations.
            </p>
          </div>

          {/* 3 Core Value Items (Clean White Cards) */}
          <div className="space-y-3.5 pt-1">
            {/* Feature 1: Enterprise Security */}
            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md hover:border-blue-300 transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
                <Shield size={18} strokeWidth={2.4} />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">Enterprise Security &amp; GPS Geofencing</h4>
                <p className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
                  SOC-2 compliant access controls with biometric and GPS selfie clock-in validation.
                </p>
              </div>
            </div>

            {/* Feature 2: Lead CRM */}
            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md hover:border-blue-300 transition-all">
              <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 shrink-0 shadow-2xs">
                <Zap size={18} strokeWidth={2.4} />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">Lead Pipeline &amp; Follow-Up Reminders</h4>
                <p className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
                  Real-time inquiry capture, WhatsApp campaigns, and automated follow-up notifications.
                </p>
              </div>
            </div>

            {/* Feature 3: Smart Payroll */}
            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md hover:border-blue-300 transition-all">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
                <BarChart3 size={18} strokeWidth={2.4} />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">1-Click Payroll &amp; Workforce Insights</h4>
                <p className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
                  Automated salary calculations, tax deductions, PDF payslips, and productivity telemetry.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* ═══════════════════════════════════════════════════════════════
            RIGHT COLUMN: Executive Pure White Login Card
        ════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto">
          
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 relative overflow-hidden">
            
            {/* Top Blue Gradient Accent Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600" />

            {/* Form Header */}
            <div className="mb-6 pt-1">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Sign In to Workspace
              </h2>
              <p className="text-slate-500 text-xs font-semibold mt-1">
                Enter your authorized credentials to continue
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="w-full mb-4 bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                <span className="text-sm">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="w-full space-y-4">
              
              {/* EMAIL ADDRESS */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700">
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
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
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 outline-none transition-all"
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
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
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Forgot Password Link */}
              <div className="text-right">
                <button
                  type="button"
                  onClick={handleOpenForgotModal}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline transition-colors cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Corporate Blue CTA Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
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

            {/* Register Link */}
            <div className="text-center mt-5">
              <p className="text-xs font-semibold text-slate-500">
                New company or enterprise?{" "}
                <Link
                  to="/register"
                  className="font-black text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Register Workspace →
                </Link>
              </p>
            </div>

            {/* Collapsible Quick Test Accounts */}
            <div className="w-full mt-4 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowQuickFill(!showQuickFill)}
                className="w-full flex items-center justify-between text-[10.5px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 transition-colors cursor-pointer py-1"
              >
                <span>⚡ Quick Test Accounts</span>
                {showQuickFill ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>

              {showQuickFill && (
                <div className="flex flex-wrap gap-1.5 pt-2 animate-fadeIn">
                  <button
                    type="button"
                    onClick={() => fillCredentials("admin@gmail.com", "Admin@123")}
                    className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold border border-blue-200 transition-all cursor-pointer"
                  >
                    🏢 Company Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => fillCredentials("anita@gmail.com", "Admin@123")}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold border border-indigo-200 transition-all cursor-pointer"
                  >
                    👥 HR
                  </button>
                  <button
                    type="button"
                    onClick={() => fillCredentials("abhiparekar58@gmail.com", "Admin@123")}
                    className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-[11px] font-bold border border-sky-200 transition-all cursor-pointer"
                  >
                    📊 Manager
                  </button>
                  <button
                    type="button"
                    onClick={() => fillCredentials("omkar@gmail.com", "123456")}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold border border-emerald-200 transition-all cursor-pointer"
                  >
                    👷 Employee
                  </button>
                  <button
                    type="button"
                    onClick={() => fillCredentials("icoded@gmail.com", "Admin@123")}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold border border-slate-200 transition-all cursor-pointer"
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
        © One Click Business HRMS • Powered by <span className="text-blue-600 font-bold">icoded</span>
      </footer>

      {/* ── Forgot Password Modal ── */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/90 shadow-2xl p-6 sm:p-7 relative">
            
            {/* Close button */}
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            {forgotSent ? (
              <div className="text-center py-2 space-y-4">
                <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-xs">
                  <CheckCircle size={28} strokeWidth={2.4} />
                </div>
                
                <div className="space-y-1.5">
                  <h3 className="text-xl font-black text-slate-900">Check Your Inbox</h3>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-xs mx-auto">
                    We've dispatched a password reset link to <strong className="text-slate-900">{forgotEmail}</strong>.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200/80 rounded-2xl p-3.5 text-[11px] text-blue-900 font-medium text-left space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-blue-700">
                    <span>💡 Next Steps:</span>
                  </p>
                  <p>1. Open the reset link sent to your email.</p>
                  <p>2. Create a new strong password.</p>
                  <p>3. Return to this page to sign in.</p>
                </div>

                {forgotSuccessData?.resetUrl && (
                  <div className="pt-1">
                    <a
                      href={forgotSuccessData.resetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      <span>Open Reset Link Directly</span>
                      <ExternalLink size={13} />
                    </a>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 transition-all cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600 shrink-0">
                    <KeyRound size={20} strokeWidth={2.3} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 leading-tight">Forgot Password?</h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Enter your email to receive a password reset link
                    </p>
                  </div>
                </div>

                {forgotError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                    <span className="text-sm">⚠️</span>
                    <span>{forgotError}</span>
                  </div>
                )}

                <form onSubmit={handleSendResetLink} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700">
                      Registered Email Address
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                        <Mail size={16} strokeWidth={2.2} />
                      </div>
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => {
                          setForgotEmail(e.target.value);
                          if (forgotError) setForgotError("");
                        }}
                        placeholder="e.g. you@company.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="w-1/3 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-2/3 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {forgotLoading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          <span>Sending Link...</span>
                        </>
                      ) : (
                        <span>Send Reset Link</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ─── Active Session Conflict Confirmation Modal ─────────────── */}
      {showConflictModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-2xl max-w-md w-full relative overflow-hidden">
            {/* Accent Top Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />

            <div className="space-y-4 pt-1">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shrink-0 shadow-sm">
                  <Monitor size={22} strokeWidth={2.3} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight">
                    Active Session Detected
                  </h3>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">
                    Security &amp; Device Policy
                  </p>
                </div>
              </div>

              {/* Notice Banner */}
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 space-y-2">
                <p className="text-sm font-bold text-slate-800">
                  Your account is already logged in on another device.
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Only one active Web session is allowed at a time. If you continue here, the other session will be terminated immediately.
                </p>
              </div>

              {/* Action Buttons: Stay Logged In vs Login Here */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  disabled={conflictLoading}
                  onClick={handleStayLoggedIn}
                  className="py-3 px-4 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 transition-all cursor-pointer border border-slate-200/80 disabled:opacity-60 text-center"
                >
                  Stay Logged In
                </button>

                <button
                  type="button"
                  disabled={conflictLoading}
                  onClick={handleLoginHere}
                  className="py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:from-blue-800 active:to-indigo-800 shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 text-center"
                >
                  {conflictLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Logging in...</span>
                    </>
                  ) : (
                    <span>Login Here</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Login;
