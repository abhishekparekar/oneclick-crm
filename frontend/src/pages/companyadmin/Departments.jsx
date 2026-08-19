import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDepartmentsApi, createDepartmentApi, updateDepartmentApi, deleteDepartmentApi } from "../../api/companyAdminApi";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import {
  Edit2, Trash2, Plus, Building2, X, Save, AlertCircle, Sparkles,
  ArrowUp, ArrowDown, Users, ShieldCheck, Check, Loader2
} from "lucide-react";

// ── Top KPI Stat Card ──────────────────────────────────────────────────────────
const KPICard = ({ label, value, trend, isUp, period, strokeColor, Icon, iconBg, iconColor }) => {
  const sparkData = useMemo(() => [
    { v: 10 }, { v: 18 }, { v: 14 }, { v: 24 }, { v: 20 }, { v: 30 }, { v: 26 }, { v: 38 },
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
              <linearGradient id={`sk-dept-${label.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.35}/>
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={strokeColor} strokeWidth={2.2} fill={`url(#sk-dept-${label.replace(/\s+/g, '')})`}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const Departments = () => {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDept, setEditingDept] = useState(null);
    const [formData, setFormData] = useState({ name: "", description: "" });
    const [error, setError] = useState("");

    const { data: res, isLoading } = useQuery({
        queryKey: ['departments'],
        queryFn: getDepartmentsApi
    });

    const createMutation = useMutation({
        mutationFn: createDepartmentApi,
        onSuccess: () => {
            queryClient.invalidateQueries(['departments']);
            handleCloseModal();
        },
        onError: (err) => setError(err.response?.data?.message || "Failed to create department")
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => updateDepartmentApi(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['departments']);
            handleCloseModal();
        },
        onError: (err) => setError(err.response?.data?.message || "Failed to update department")
    });

    const deleteMutation = useMutation({
        mutationFn: deleteDepartmentApi,
        onSuccess: () => queryClient.invalidateQueries(['departments'])
    });

    const handleOpenModal = (dept = null) => {
        setError("");
        if (dept) {
            setEditingDept(dept);
            setFormData({ name: dept.name, description: dept.description || "" });
        } else {
            setEditingDept(null);
            setFormData({ name: "", description: "" });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setTimeout(() => {
            setEditingDept(null);
            setFormData({ name: "", description: "" });
            setError("");
        }, 300);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingDept) {
            updateMutation.mutate({ id: editingDept._id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleDelete = (id) => {
        if (window.confirm("Are you sure you want to delete this department?")) {
            deleteMutation.mutate(id);
        }
    };

    const departments = res?.data?.departments || res?.data || [];

    return (
        <div className="space-y-4 pb-12 font-sans text-slate-900 dark:text-slate-100">

            {/* ── Page Header Banner ── */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pt-1 pb-1">
                <div>
                    <h1 className="text-[22px] font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        Department Structure <Building2 size={20} className="text-amber-500" />
                    </h1>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                        Organize team units, functional divisions, and operational departments across your company.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs shadow-sm transition-all"
                    >
                        <Plus size={15} strokeWidth={2.5} />
                        <span>Add Department</span>
                    </button>
                </div>
            </div>

            {/* ── Top 4 Compact KPI Stat Cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3.5">
                <KPICard label="Total Departments" value={departments.length} trend="Active" isUp period="structure" strokeColor="#06B6D4" Icon={Building2} iconBg="bg-cyan-500/10" iconColor="#0891B2" />
                <KPICard label="Active Units" value={`${departments.length} Divisions`} trend="100%" isUp period="coverage" strokeColor="#10B981" Icon={ShieldCheck} iconBg="bg-emerald-500/10" iconColor="#059669" />
                <KPICard label="Assigned Workforce" value="Full Team" trend="Mapped" isUp period="employees" strokeColor="#8B5CF6" Icon={Users} iconBg="bg-purple-500/10" iconColor="#7C3AED" />
                <KPICard label="Operational Health" value="Optimal" trend="99.9%" isUp period="health" strokeColor="#EAB308" Icon={Sparkles} iconBg="bg-amber-500/10" iconColor="#D97706" />
            </div>

            {/* ── Table Card Container ── */}
            <div className="bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] overflow-hidden">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 size={32} className="animate-spin text-amber-500 mb-3" />
                        <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Loading Departments...</p>
                    </div>
                ) : departments.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4">
                            <Building2 size={28} />
                        </div>
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1">No Departments Found</h3>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-5">
                            Create your first company department to start categorizing your employees.
                        </p>
                        <button
                            onClick={() => handleOpenModal()}
                            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs shadow-sm transition-all inline-flex items-center space-x-2"
                        >
                            <Plus size={16} strokeWidth={2.5} />
                            <span>Add Department</span>
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                                    <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Department Name</th>
                                    <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                                    <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                                {departments.map((dept) => (
                                    <tr key={dept._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold flex-shrink-0">
                                                    <Building2 size={16} />
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">{dept.name}</h4>
                                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Active Unit</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 max-w-lg">
                                                {dept.description || "—"}
                                            </p>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                <button
                                                    onClick={() => handleOpenModal(dept)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                                                    title="Edit Department"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(dept._id)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                                                    title="Delete Department"
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
                                    <Building2 size={18} />
                                </div>
                                <div>
                                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                                        {editingDept ? "Edit Department" : "Add Department"}
                                    </h3>
                                    <p className="text-xs font-semibold text-slate-400 mt-0.5">Configure functional unit</p>
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
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Department Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                                    placeholder="e.g. Software Engineering"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Description</label>
                                <textarea
                                    rows={3}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 resize-none"
                                    placeholder="Brief summary of department duties..."
                                />
                            </div>

                            <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-200/80 dark:border-slate-800">
                                <button type="button" onClick={handleCloseModal} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold">Cancel</button>
                                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-extrabold rounded-xl text-xs shadow-sm transition-all flex items-center space-x-1.5">
                                    {createMutation.isPending || updateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} strokeWidth={2.5} />}
                                    <span>Save Department</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Departments;
