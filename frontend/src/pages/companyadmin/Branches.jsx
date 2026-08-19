import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getBranchesApi,
  createBranchApi,
  updateBranchApi,
  deleteBranchApi,
} from "../../api/companyAdminApi";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import {
  Edit2, Trash2, Plus, MapPin, X, Save, AlertCircle, Building, Map,
  Sparkles, ArrowUp, ArrowDown, ShieldCheck, Loader2
} from "lucide-react";

// ── Top KPI Stat Card ──────────────────────────────────────────────────────────
const KPICard = ({ label, value, trend, isUp, period, strokeColor, Icon, iconBg, iconColor }) => {
  const sparkData = useMemo(() => [
    { v: 8 }, { v: 16 }, { v: 12 }, { v: 22 }, { v: 18 }, { v: 28 }, { v: 24 }, { v: 36 },
  ], []);

  return (
    <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 px-4 py-3.5 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] transition-all duration-300 group">
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${iconBg} flex-shrink-0 shadow-xs`}>
            <Icon size={13} style={{ color: iconColor }} strokeWidth={2.4} />
          </div>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">{label}</span>
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight leading-tight mb-1 truncate">{value}</h3>
        <div className="flex items-center gap-1 text-[11px]">
          <span className={`inline-flex items-center font-medium ${isUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
            {isUp ? <ArrowUp size={10} strokeWidth={2.5}/> : <ArrowDown size={10} strokeWidth={2.5}/>}
            {trend}
          </span>
          <span className="text-slate-400 text-[9.5px] truncate">vs {period}</span>
        </div>
      </div>
      <div className="hidden sm:block h-10 w-16 opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={40}>
          <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`sk-br-${label.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.35}/>
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={strokeColor} strokeWidth={2.2} fill={`url(#sk-br-${label.replace(/\s+/g, '')})`}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const Branches = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [formData, setFormData] = useState({
    branchName: "",
    city: "",
    address: "",
  });
  const [error, setError] = useState("");

  const { data: res, isLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: getBranchesApi,
  });

  const createMutation = useMutation({
    mutationFn: createBranchApi,
    onSuccess: () => {
      queryClient.invalidateQueries(["branches"]);
      handleCloseModal();
    },
    onError: (err) =>
      setError(err.response?.data?.message || "Failed to create branch"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateBranchApi(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["branches"]);
      handleCloseModal();
    },
    onError: (err) =>
      setError(err.response?.data?.message || "Failed to update branch"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBranchApi,
    onSuccess: () => queryClient.invalidateQueries(["branches"]),
  });

  const handleOpenModal = (branch = null) => {
    setError("");
    if (branch) {
      setEditingBranch(branch);
      setFormData({
        branchName: branch.branchName || branch.name || "",
        city: branch.city || branch.location || "",
        address: branch.address || "",
      });
    } else {
      setEditingBranch(null);
      setFormData({ branchName: "", city: "", address: "" });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setEditingBranch(null);
      setFormData({ branchName: "", city: "", address: "" });
      setError("");
    }, 300);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      branchName: formData.branchName,
      city: formData.city,
      address: formData.address,
    };
    if (editingBranch) {
      updateMutation.mutate({ id: editingBranch._id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this branch?")) {
      deleteMutation.mutate(id);
    }
  };

  const branches = res?.data?.branches || res?.data || [];

  return (
    <div className="space-y-4 pb-12 font-sans text-slate-900 dark:text-slate-100">

      {/* ── Page Header Banner ── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pt-1 pb-1">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            Company Branches & Offices <MapPin size={20} className="text-amber-500" />
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Manage regional office locations, headquarters, and branch addresses.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs shadow-sm transition-all"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Add Branch</span>
          </button>
        </div>
      </div>

      {/* ── Top 4 Compact KPI Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KPICard label="Total Locations" value={branches.length} trend="Active" isUp period="offices" strokeColor="#06B6D4" Icon={Building} iconBg="bg-cyan-500/10" iconColor="#0891B2" />
        <KPICard label="Headquarters" value="1 Primary" trend="Verified" isUp period="HQ status" strokeColor="#10B981" Icon={ShieldCheck} iconBg="bg-emerald-500/10" iconColor="#059669" />
        <KPICard label="Regional Branches" value={`${Math.max(0, branches.length - 1)} Regional`} trend="Expanded" isUp period="growth" strokeColor="#8B5CF6" Icon={Map} iconBg="bg-purple-500/10" iconColor="#7C3AED" />
        <KPICard label="Active Operations" value="100% Operational" trend="Online" isUp period="health" strokeColor="#EAB308" Icon={MapPin} iconBg="bg-amber-500/10" iconColor="#D97706" />
      </div>

      {/* ── Table Card Container ── */}
      <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-amber-500 mb-3" />
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Loading Branches...</p>
          </div>
        ) : branches.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4">
              <MapPin size={28} />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1">No Office Locations Found</h3>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-5">
              Add your main office or regional branch to assign staff members by location.
            </p>
            <button
              onClick={() => handleOpenModal()}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs shadow-sm transition-all inline-flex items-center space-x-2"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Add Branch</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Branch Title</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">City / Location</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Address</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {branches.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold flex-shrink-0">
                          <Building size={16} />
                        </div>
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">{b.branchName || b.name}</h4>
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Active Office</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        <Map size={12} className="mr-1.5 text-amber-500" />
                        {b.city || b.location || "Default Location"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 max-w-sm truncate">
                        {b.address || "—"}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleOpenModal(b)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                          title="Edit Branch"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(b._id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title="Delete Branch"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Slide-Over Modal Drawer ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                  <MapPin size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                    {editingBranch ? "Edit Branch" : "Add Branch"}
                  </h3>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">Configure office location</p>
                </div>
              </div>
              <button onClick={handleCloseModal} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-extrabold flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Branch Name *</label>
                <input
                  type="text"
                  required
                  value={formData.branchName || ""}
                  onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  placeholder="e.g. Headquarters / North Campus"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">City / Location</label>
                <input
                  type="text"
                  value={formData.city || ""}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  placeholder="e.g. Pune, Maharashtra"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Full Address</label>
                <textarea
                  rows={3}
                  value={formData.address || ""}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 resize-none"
                  placeholder="Enter physical address details..."
                />
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-200/80 dark:border-slate-800">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold">Cancel</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-extrabold rounded-xl text-xs shadow-sm transition-all flex items-center space-x-1.5">
                  {createMutation.isPending || updateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} strokeWidth={2.5} />}
                  <span>Save Branch</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Branches;
