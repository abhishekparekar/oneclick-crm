import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ShieldCheck, Lock, Eye, EyeOff, KeyRound, CheckCircle2, ShieldAlert } from "lucide-react";
import { changePasswordApi } from "../../api/employeeApi";

export default function EmployeeSettings() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const mutation = useMutation({
    mutationFn: (data) => changePasswordApi(data),
    onSuccess: (res) => {
      if (res.data.success) {
        toast.success("Password changed successfully");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(res.data.message || "Failed to change password");
      }
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to change password");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    mutation.mutate({ oldPassword: currentPassword, newPassword });
  };

  return (
    <div className="space-y-4 w-full pb-12 font-sans">
      {/* Header matching Page Layout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight flex items-center gap-2">
            Settings & Security
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Manage your account security, login password, and authentication settings
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Main Password Form */}
        <div className="lg:col-span-2 bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                <Lock size={16} strokeWidth={2.2} />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Change Security Password</h2>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Update your login credentials securely</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Current Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrent ? "text" : "password"}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0C1520] focus:outline-none focus:border-amber-500 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-all shadow-2xs"
                    placeholder="Enter current password..."
                  />
                  <button 
                    type="button" 
                    tabIndex="-1"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0C1520] focus:outline-none focus:border-amber-500 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-all shadow-2xs"
                    placeholder="Minimum 6 characters..."
                  />
                  <button 
                    type="button" 
                    tabIndex="-1"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0C1520] focus:outline-none focus:border-amber-500 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-all shadow-2xs"
                    placeholder="Re-enter new password..."
                  />
                </div>
              </div>

              <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 disabled:opacity-50 rounded-xl font-extrabold text-xs transition-all shadow-2xs"
                >
                  <KeyRound size={15} strokeWidth={2.5} />
                  {mutation.isPending ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right 1 Col: Security Recommendations & Guidelines */}
        <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs space-y-4 h-fit">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-xs">
            <ShieldCheck size={16} className="text-amber-500" />
            Security Guidelines
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200">Minimum 6 Characters</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Use letters, numbers & special characters for maximum security.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <ShieldAlert size={15} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200">Keep It Secret</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Never share your portal password with anyone.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
