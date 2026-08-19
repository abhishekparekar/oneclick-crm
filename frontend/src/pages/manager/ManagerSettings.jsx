import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { changeManagerPasswordApi } from "../../api/managerApi";
import { Shield, Lock, Eye, EyeOff, Key } from "lucide-react";
import toast from "react-hot-toast";

const ManagerSettings = () => {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const pwMut = useMutation({
    mutationFn: (data) => changeManagerPasswordApi(data),
    onSuccess: () => {
      toast.success("Security password updated successfully!");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to update password"),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (form.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    pwMut.mutate({ currentPassword: form.currentPassword, newPassword: form.newPassword });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 font-sans pb-8 pt-1 px-2 md:px-0">
      {/* Header matching the screenshot layout but in theme colors */}
      <div className="bg-[#0f172a] rounded-2xl p-4 shadow-sm border border-slate-800 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
          <Shield size={18} className="text-orange-600" />
        </div>
        <div>
          <h1 className="text-[15px] font-black text-white mb-0.5 tracking-tight">Manager Account Security & Settings</h1>
          <p className="text-[11px] font-medium text-slate-300">Manage your portal login security credentials and update your password.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[var(--color-ca-card)] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-sm relative overflow-hidden">
        <div className="flex items-center gap-2 mb-1.5">
          <Lock size={16} className="text-slate-600 dark:text-slate-400" />
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white">CHANGE SECURITY PASSWORD</h2>
        </div>
        <p className="text-[11px] font-medium text-slate-500 mb-5 pb-3 border-b border-slate-100 dark:border-slate-800/50">
          Update your account password. Use a strong password with at least 6 characters.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 mb-1.5">
              CURRENT PASSWORD <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                placeholder="Enter current password..."
                value={form.currentPassword}
                onChange={(e) => setForm(f => ({ ...f, currentPassword: e.target.value }))}
                required
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl text-sm font-bold bg-slate-50 dark:bg-[var(--color-ca-card)]/ border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white focus:border-orange-600 focus:ring-1 focus:ring-orange-600/20 outline-none transition-all placeholder:text-slate-400"
              />
              <button 
                type="button" 
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 mb-1.5">
              NEW PASSWORD <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                placeholder="Minimum 6 characters..."
                value={form.newPassword}
                onChange={(e) => setForm(f => ({ ...f, newPassword: e.target.value }))}
                required
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl text-sm font-bold bg-slate-50 dark:bg-[var(--color-ca-card)]/ border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white focus:border-orange-600 focus:ring-1 focus:ring-orange-600/20 outline-none transition-all placeholder:text-slate-400"
              />
              <button 
                type="button" 
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 mb-1.5">
              CONFIRM NEW PASSWORD <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="Re-enter new password..."
                value={form.confirmPassword}
                onChange={(e) => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                required
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl text-sm font-bold bg-slate-50 dark:bg-[var(--color-ca-card)]/ border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white focus:border-orange-600 focus:ring-1 focus:ring-orange-600/20 outline-none transition-all placeholder:text-slate-400"
              />
              <button 
                type="button" 
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={pwMut.isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black text-white bg-orange-600 hover:bg-orange-700 shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              <Key size={14} />
              {pwMut.isPending ? "Updating..." : "Update Security Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManagerSettings;

