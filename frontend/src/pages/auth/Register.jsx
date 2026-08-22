import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import {
  Building2,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  Clock,
  Users,
  CheckCircle2,
  Sparkles,
  Zap,
} from "lucide-react";
import OneClickLogo from "../../components/common/OneClickLogo";

const TRIAL_FEATURES = [
  { icon: Clock, title: "7-Day Free Trial", desc: "Full feature access with no credit card required.", color: "text-blue-400", border: "border-blue-500/30", bg: "bg-blue-500/10" },
  { icon: Users, title: "10 Employees Included", desc: "Add managers, HRs, and employees immediately.", color: "text-sky-400", border: "border-sky-500/30", bg: "bg-sky-500/10" },
  { icon: Shield, title: "Enterprise Grade", desc: "Bank-grade data encryption and role permissions.", color: "text-indigo-400", border: "border-indigo-500/30", bg: "bg-indigo-500/10" },
];

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

  const set = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.companyName.trim() || !form.ownerName.trim() || !form.email.trim() || !form.password) {
      setError("Please fill in all required fields.");
      return;
    }
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
        companyName: form.companyName.trim(),
        ownerName: form.ownerName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
      });
      setSuccess(true);
      toast.success("Workspace registered successfully! 🎉");
      setTimeout(() => {
        if (user?.role === "CompanyAdmin") {
          navigate("/company/dashboard");
        } else {
          navigate("/login");
        }
      }, 1500);
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
      toast.error(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1D] text-slate-100 font-sans flex flex-col justify-between p-4 sm:p-8 lg:p-12 relative overflow-hidden selection:bg-blue-600 selection:text-white">
      
      {/* ── Background Glows ── */}
      <div className="fixed -top-36 -right-36 w-[550px] h-[550px] bg-gradient-to-bl from-blue-600/20 via-indigo-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-1/4 -left-36 w-[500px] h-[500px] bg-gradient-to-br from-sky-500/15 via-blue-700/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-36 right-1/4 w-[600px] h-[600px] bg-gradient-to-tl from-blue-900/20 via-slate-800/15 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Grid Pattern */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#1E293B0A_1px,transparent_1px),linear-gradient(to_bottom,#1E293B0A_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />

      {/* ── 2-Column Split Layout ── */}
      <div className="w-full max-w-6xl mx-auto my-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">

        {/* ═══════════════════════════════════════════════════════════════
            LEFT COLUMN: Trial Benefits Showcase
        ════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
          
          <div>
            <OneClickLogo variant="landscape" />
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 bg-blue-500/15 border border-blue-500/30 px-3.5 py-1 rounded-full">
              <Sparkles size={14} className="text-blue-400" />
              <span className="text-xs font-bold text-blue-300">7-Day Full Access Trial Included</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Register <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-white">
                Your Company
              </span>
            </h1>

            <p className="text-slate-300 text-sm sm:text-base font-medium pt-1 max-w-md leading-relaxed">
              Get full access to all HRMS, Attendance, Geofencing, Payroll, and Tasks modules instantly.
            </p>
          </div>

          <div className="space-y-4 pt-1">
            {TRIAL_FEATURES.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="flex items-start gap-3.5 p-3 rounded-2xl bg-[#0F172A]/70 border border-slate-800/80 shadow-2xs">
                  <div className={`w-10 h-10 rounded-xl ${item.bg} border ${item.border} flex items-center justify-center ${item.color} shrink-0`}>
                    <Icon size={18} strokeWidth={2.2} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">{item.title}</h4>
                    <p className="text-xs text-slate-400 font-medium mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* ═══════════════════════════════════════════════════════════════
            RIGHT COLUMN: Form Panel
        ════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-7 w-full max-w-xl mx-auto">
          
          <div className="bg-[#0F172A]/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-blue-950/20 relative overflow-hidden">
            
            {/* Top Glow Accent Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-sky-400 to-blue-600" />

            <div className="mb-6">
              <h2 className="text-2xl font-black text-white tracking-tight">
                Create Your Workspace
              </h2>
              <p className="text-slate-400 text-xs font-semibold mt-1">
                Start your 7-day free trial with 10 team seats
              </p>
            </div>

            {error && (
              <div className="w-full mb-4 bg-rose-950/50 border border-rose-500/40 text-rose-200 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                <span className="text-sm">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="w-full mb-4 bg-emerald-950/50 border border-emerald-500/40 text-emerald-200 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>Registration successful! Redirecting...</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="w-full space-y-3.5">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300">
                    Company Name *
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-400">
                      <Building2 size={15} strokeWidth={2.2} />
                    </div>
                    <input
                      type="text"
                      required
                      value={form.companyName}
                      onChange={set("companyName")}
                      placeholder="Acme Corp"
                      className="w-full pl-9 pr-3 py-2.5 bg-[#0B101D] border border-slate-700/80 focus:border-blue-500 focus:bg-[#0E1528] focus:ring-2 focus:ring-blue-500/20 rounded-xl text-xs font-bold text-white placeholder-slate-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300">
                    Admin Full Name *
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-400">
                      <User size={15} strokeWidth={2.2} />
                    </div>
                    <input
                      type="text"
                      required
                      value={form.ownerName}
                      onChange={set("ownerName")}
                      placeholder="Ramesh Kumar"
                      className="w-full pl-9 pr-3 py-2.5 bg-[#0B101D] border border-slate-700/80 focus:border-blue-500 focus:bg-[#0E1528] focus:ring-2 focus:ring-blue-500/20 rounded-xl text-xs font-bold text-white placeholder-slate-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300">
                    Work Email *
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-400">
                      <Mail size={15} strokeWidth={2.2} />
                    </div>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={set("email")}
                      placeholder="admin@company.com"
                      className="w-full pl-9 pr-3 py-2.5 bg-[#0B101D] border border-slate-700/80 focus:border-blue-500 focus:bg-[#0E1528] focus:ring-2 focus:ring-blue-500/20 rounded-xl text-xs font-bold text-white placeholder-slate-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300">
                    Phone Number
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-400">
                      <Phone size={15} strokeWidth={2.2} />
                    </div>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={set("phone")}
                      placeholder="+91 98765 43210"
                      className="w-full pl-9 pr-3 py-2.5 bg-[#0B101D] border border-slate-700/80 focus:border-blue-500 focus:bg-[#0E1528] focus:ring-2 focus:ring-blue-500/20 rounded-xl text-xs font-bold text-white placeholder-slate-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300">
                    Password *
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-400">
                      <Lock size={15} strokeWidth={2.2} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={form.password}
                      onChange={set("password")}
                      placeholder="Min. 6 chars"
                      className="w-full pl-9 pr-9 py-2.5 bg-[#0B101D] border border-slate-700/80 focus:border-blue-500 focus:bg-[#0E1528] focus:ring-2 focus:ring-blue-500/20 rounded-xl text-xs font-bold text-white placeholder-slate-500 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300">
                    Confirm Password *
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-400">
                      <Lock size={15} strokeWidth={2.2} />
                    </div>
                    <input
                      type={showConfirm ? "text" : "password"}
                      required
                      value={form.confirmPassword}
                      onChange={set("confirmPassword")}
                      placeholder="Re-enter password"
                      className="w-full pl-9 pr-9 py-2.5 bg-[#0B101D] border border-slate-700/80 focus:border-blue-500 focus:bg-[#0E1528] focus:ring-2 focus:ring-blue-500/20 rounded-xl text-xs font-bold text-white placeholder-slate-500 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || success}
                className="w-full py-3 px-6 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-4"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Creating Workspace...</span>
                  </>
                ) : (
                  <>
                    <span>Create Company Workspace</span>
                    <ArrowRight size={15} strokeWidth={2.5} />
                  </>
                )}
              </button>

            </form>

            <div className="text-center mt-4">
              <p className="text-xs font-semibold text-slate-400">
                Already have a company account?{" "}
                <Link
                  to="/login"
                  className="font-black text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Sign In →
                </Link>
              </p>
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

export default Register;
