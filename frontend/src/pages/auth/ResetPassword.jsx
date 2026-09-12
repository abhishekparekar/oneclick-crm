import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft, KeyRound, ShieldCheck } from "lucide-react";
import OneClickLogo from "../../components/common/OneClickLogo";
import { resetPassword } from "../../api/authApi";
import toast from "react-hot-toast";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // Strength score
  const lengthCheck = password.length >= 6;
  const upperCheck = /[A-Z]/.test(password);
  const numberCheck = /[0-9]/.test(password);
  const matchCheck = password && confirmPassword && password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Reset token is missing or malformed.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword({ token, password });
      setIsSuccess(true);
      toast.success(res.message || "Password has been reset successfully!");
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || "Failed to reset password";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans flex flex-col justify-between p-4 sm:p-8 lg:p-12 relative overflow-hidden selection:bg-blue-600 selection:text-white">
      {/* ── Soft Ambient Background Blurs ── */}
      <div className="fixed -top-36 -left-36 w-[550px] h-[550px] bg-blue-100/60 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-1/4 -right-36 w-[500px] h-[500px] bg-sky-100/50 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-36 left-1/3 w-[600px] h-[600px] bg-indigo-100/40 rounded-full blur-3xl pointer-events-none" />

      {/* Grid Pattern */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#E2E8F066_1px,transparent_1px),linear-gradient(to_bottom,#E2E8F066_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />

      {/* Main Content Box */}
      <div className="w-full max-w-md mx-auto my-auto relative z-10">
        
        {/* Logo header */}
        <div className="flex justify-center mb-6">
          <OneClickLogo variant="landscape" />
        </div>

        <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/50 p-6 sm:p-8">
          
          {isSuccess ? (
            <div className="text-center py-4 space-y-5">
              <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-sm animate-bounce">
                <CheckCircle size={32} strokeWidth={2.4} />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Password Reset Complete!</h2>
                <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto leading-relaxed">
                  Your credentials have been securely updated. You can now use your new password to access your workspace.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  to="/login"
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-md shadow-blue-600/25 transition-all cursor-pointer"
                >
                  <ArrowLeft size={16} />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-center justify-center mx-auto text-blue-600 shadow-xs">
                  <KeyRound size={22} strokeWidth={2.3} />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Create New Password</h2>
                <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto">
                  Choose a secure password with at least 6 characters to regain access to your account.
                </p>
              </div>

              {/* Error Box */}
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5">
                  <AlertCircle size={16} className="shrink-0 text-rose-500" />
                  <span>{error}</span>
                </div>
              )}

              {/* Reset Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* NEW PASSWORD */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700">
                    New Password
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
                      placeholder="Minimum 6 characters"
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

                {/* CONFIRM PASSWORD */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700">
                    Confirm Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                      <Lock size={16} strokeWidth={2.2} />
                    </div>
                    <input
                      type={showConfirm ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (error) setError("");
                      }}
                      placeholder="Re-type new password"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Security Checklist */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-1.5 text-[11px] font-semibold text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className={lengthCheck ? "text-emerald-500 font-black" : "text-slate-400"}>
                      {lengthCheck ? "✓" : "○"}
                    </span>
                    <span className={lengthCheck ? "text-emerald-700" : ""}>At least 6 characters</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={matchCheck ? "text-emerald-500 font-black" : "text-slate-400"}>
                      {matchCheck ? "✓" : "○"}
                    </span>
                    <span className={matchCheck ? "text-emerald-700" : ""}>Passwords match</span>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading || !lengthCheck || !matchCheck}
                  className="w-full py-3 px-6 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} />
                      <span>Reset Password</span>
                    </>
                  )}
                </button>
              </form>

              {/* Back to login */}
              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
                >
                  <ArrowLeft size={14} />
                  <span>Return to Sign In</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-slate-400 text-xs font-semibold">
          © {new Date().getFullYear()} One Click HRMS Enterprise. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
