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
} from "lucide-react";
import OneClickLogo from "../../components/common/OneClickLogo";

const TRIAL_FEATURES = [
  { icon: Clock, title: "7-Day Free Trial", desc: "Full feature access with no credit card required.", color: "text-amber-400", border: "border-amber-500/30", bg: "bg-amber-500/10" },
  { icon: Users, title: "10 Employees Included", desc: "Add managers, HRs, and employees immediately.", color: "text-rose-400", border: "border-rose-500/30", bg: "bg-rose-500/10" },
  { icon: Shield, title: "Enterprise Grade", desc: "Bank-grade data encryption and role permissions.", color: "text-cyan-400", border: "border-cyan-500/30", bg: "bg-cyan-500/10" },
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
    <div className="min-h-screen bg-[#070A12] text-slate-100 font-sans flex flex-col justify-between p-4 sm:p-8 lg:p-12 relative overflow-hidden selection:bg-rose-500 selection:text-white">
      
      {/* ── Background Glows ── */}
      <div className="fixed -top-28 -right-28 w-[500px] h-[500px] bg-gradient-to-bl from-fuchsia-600/30 via-purple-600/15 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-0 -left-28 w-[450px] h-[450px] bg-gradient-to-br from-cyan-500/30 via-blue-600/15 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-36 -right-24 w-[550px] h-[550px] bg-gradient-to-tl from-orange-500/35 via-rose-600/20 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* ── Full 2-Column Split Layout without White Card ── */}
      <div className="w-full max-w-6xl mx-auto my-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">

        {/* ═══════════════════════════════════════════════════════════════
            LEFT COLUMN: Trial Benefits Showcase
        ════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
          
          <div>
            <OneClickLogo variant="landscape" />
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 bg-orange-500/15 border border-orange-500/30 px-3.5 py-1 rounded-full">
              <Sparkles size={14} className="text-orange-400" />
              <span className="text-xs font-bold text-orange-300">7-Day Free Trial Included</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Register <br />
              <span className="text-[#FF7A00]">Your Company</span>
            </h1>

            <p className="text-slate-300 text-sm sm:text-base font-medium pt-1 max-w-md leading-relaxed">
              Get full access to all HRMS, Attendance, Geofencing, Payroll, and Tasks modules instantly.
            </p>
          </div>

          <div className="space-y-5 pt-2">
            {TRIAL_FEATURES.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-full ${item.bg} border ${item.border} flex items-center justify-center ${item.color} shrink-0`}>
                    <Icon size={20} strokeWidth={2.2} />
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-white tracking-wide">{item.title}</h4>
                    <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-6 gap-2.5 w-32 opacity-40 pt-2">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            ))}
          </div>

        </div>

        {/* ═══════════════════════════════════════════════════════════════
            RIGHT COLUMN: Form Panel (Direct Dark Integration - NO Card)
        ════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-7 w-full max-w-xl mx-auto flex flex-col justify-center">
          
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
              <span className="text-[#FB923C]">Create </span>
              <span className="text-[#F472B6]">Your </span>
              <span className="text-[#38BDF8]">Workspace</span>
            </h2>
            <p className="text-slate-400 text-sm font-medium">
              Start your 7-day free trial with 10 team seats
            </p>
          </div>

          {error && (
            <div className="w-full mb-5 bg-rose-950/40 border border-rose-500/50 text-rose-200 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2.5">
              <span className="text-base">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="w-full mb-5 bg-emerald-950/40 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2.5">
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
              <span>Registration successful! Redirecting...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-200 ml-1">
                  COMPANY NAME *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-400">
                    <Building2 size={17} strokeWidth={2.2} />
                  </div>
                  <input
                    type="text"
                    required
                    value={form.companyName}
                    onChange={set("companyName")}
                    placeholder="Acme Corp"
                    className="w-full pl-10 pr-3 py-3 bg-[#131C2E] border-1.5 border-[#2D3E5F] focus:border-[#38BDF8] focus:bg-[#16233B] rounded-2xl text-sm font-semibold text-white placeholder-slate-400 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-200 ml-1">
                  ADMIN NAME *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-cyan-400">
                    <User size={17} strokeWidth={2.2} />
                  </div>
                  <input
                    type="text"
                    required
                    value={form.ownerName}
                    onChange={set("ownerName")}
                    placeholder="Ramesh Kumar"
                    className="w-full pl-10 pr-3 py-3 bg-[#131C2E] border-1.5 border-[#2D3E5F] focus:border-[#38BDF8] focus:bg-[#16233B] rounded-2xl text-sm font-semibold text-white placeholder-slate-400 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-200 ml-1">
                  WORK EMAIL *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-purple-400">
                    <Mail size={17} strokeWidth={2.2} />
                  </div>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={set("email")}
                    placeholder="admin@company.com"
                    className="w-full pl-10 pr-3 py-3 bg-[#131C2E] border-1.5 border-[#2D3E5F] focus:border-[#38BDF8] focus:bg-[#16233B] rounded-2xl text-sm font-semibold text-white placeholder-slate-400 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-200 ml-1">
                  PHONE NUMBER
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-400">
                    <Phone size={17} strokeWidth={2.2} />
                  </div>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={set("phone")}
                    placeholder="+91 98765 43210"
                    className="w-full pl-10 pr-3 py-3 bg-[#131C2E] border-1.5 border-[#2D3E5F] focus:border-[#38BDF8] focus:bg-[#16233B] rounded-2xl text-sm font-semibold text-white placeholder-slate-400 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-200 ml-1">
                  PASSWORD *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-400">
                    <Lock size={17} strokeWidth={2.2} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={form.password}
                    onChange={set("password")}
                    placeholder="Min. 6 chars"
                    className="w-full pl-10 pr-10 py-3 bg-[#131C2E] border-1.5 border-[#2D3E5F] focus:border-[#38BDF8] focus:bg-[#16233B] rounded-2xl text-sm font-semibold text-white placeholder-slate-400 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-200 ml-1">
                  CONFIRM PASSWORD *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-cyan-400">
                    <Lock size={17} strokeWidth={2.2} />
                  </div>
                  <input
                    type={showConfirm ? "text" : "password"}
                    required
                    value={form.confirmPassword}
                    onChange={set("confirmPassword")}
                    placeholder="Re-enter password"
                    className="w-full pl-10 pr-10 py-3 bg-[#131C2E] border-1.5 border-[#2D3E5F] focus:border-[#38BDF8] focus:bg-[#16233B] rounded-2xl text-sm font-semibold text-white placeholder-slate-400 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full py-4 px-6 rounded-full text-base font-black text-white bg-gradient-to-r from-[#FF7A00] via-[#E11D48] via-[#9333EA] to-[#00D2C4] hover:opacity-95 shadow-[0_6px_25px_rgba(225,29,72,0.45)] hover:shadow-[0_8px_30px_rgba(225,29,72,0.6)] transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-70 disabled:pointer-events-none cursor-pointer mt-4"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Creating Workspace...</span>
                </>
              ) : (
                <>
                  <span>Create Company Workspace</span>
                  <ArrowRight size={19} strokeWidth={2.5} />
                </>
              )}
            </button>

          </form>

          <div className="text-center mt-6">
            <p className="text-sm font-semibold text-slate-300">
              Already have a company account?{" "}
              <Link
                to="/login"
                className="font-black text-[#FB923C] hover:text-[#38BDF8] transition-colors"
              >
                Sign In →
              </Link>
            </p>
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

export default Register;
