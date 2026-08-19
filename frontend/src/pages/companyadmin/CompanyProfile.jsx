import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCompanyProfileApi, updateCompanyProfileApi } from "../../api/companyAdminApi";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import {
    Building2, Mail, Phone, MapPin, Globe, Save, Building, ShieldCheck,
    AlertCircle, Edit2, Sparkles, ArrowUp, ArrowDown, Users, FileText, CheckCircle2
} from "lucide-react";

// ── Top KPI Stat Card (Matching Dashboard KPI Style) ──────────────────────────
const KPICard = ({ label, value, trend, isUp, period, strokeColor, Icon, iconBg, iconColor }) => {
    const sparkData = useMemo(() => [
        { v: 16 }, { v: 24 }, { v: 20 }, { v: 30 }, { v: 26 }, { v: 38 }, { v: 32 }, { v: 44 },
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
                        {isUp ? <ArrowUp size={10} strokeWidth={2.5} /> : <ArrowDown size={10} strokeWidth={2.5} />}
                        {trend}
                    </span>
                    <span className="text-slate-400 text-[9.5px] truncate">vs {period}</span>
                </div>
            </div>
            <div className="h-10 w-16 opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={40}>
                    <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id={`sk-cp-${label.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.35} />
                                <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="v" stroke={strokeColor} strokeWidth={2.2} fill={`url(#sk-cp-${label.replace(/\s+/g, '')})`} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const CompanyProfile = () => {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        companyName: "",
        email: "",
        phone: "",
        website: "",
        address: "",
        taxId: "",
        registrationNumber: ""
    });
    const [successMsg, setSuccessMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [isEditing, setIsEditing] = useState(false);

    const { data: res, isLoading } = useQuery({
        queryKey: ['companyProfile'],
        queryFn: getCompanyProfileApi
    });

    const company = res?.company || res?.data?.company || {};

    useEffect(() => {
        if (company && Object.keys(company).length > 0) {
            setFormData({
                companyName: company.companyName || "",
                email: company.email || "",
                phone: company.phone || "",
                website: company.website || "",
                address: company.address || "",
                taxId: company.taxId || "",
                registrationNumber: company.registrationNumber || ""
            });
        }
    }, [res]);

    const updateMutation = useMutation({
        mutationFn: updateCompanyProfileApi,
        onSuccess: () => {
            queryClient.invalidateQueries(['companyProfile']);
            setSuccessMsg("Company profile updated successfully.");
            setErrorMsg("");
            setIsEditing(false);
            setTimeout(() => setSuccessMsg(""), 3000);
        },
        onError: (err) => {
            setErrorMsg(err.response?.data?.message || "Failed to update company profile.");
            setSuccessMsg("");
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        updateMutation.mutate(formData);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Loading Company Profile...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 pb-12 font-sans text-slate-900 dark:text-slate-100">

            {/* ── Page Header Banner ────────────────────────────────────────── */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pt-1 pb-1">
                <div>
                    <h1 className="text-[22px] font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        Organization Profile <Building2 size={20} className="text-amber-500" />
                    </h1>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                        Manage your company metadata, legal tax registration details, and official contact channels.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    {!isEditing ? (
                        <button
                            type="button"
                            onClick={() => setIsEditing(true)}
                            className="flex items-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-xs transition-all"
                        >
                            <Edit2 size={15} strokeWidth={2.5} />
                            <span>Edit Organization Profile</span>
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                        >
                            Cancel Editing
                        </button>
                    )}
                </div>
            </div>

            {/* ── Top 4 Compact KPI Stat Cards ─────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3.5">
                <KPICard label="Account Status" value="Active Verified" trend="100%" isUp period="all time" strokeColor="#10B981" Icon={ShieldCheck} iconBg="bg-emerald-500/10" iconColor="#059669" />
                <KPICard label="Subscription Tier" value={company.planName || "Free Trial"} trend="Active" isUp period="plan renewal" strokeColor="#8B5CF6" Icon={Sparkles} iconBg="bg-purple-500/10" iconColor="#7C3AED" />
                <KPICard label="Employee Limit" value={`${company.employeeLimit || 50} Max`} trend="Unlimited" isUp period="capacity" strokeColor="#06B6D4" Icon={Users} iconBg="bg-cyan-500/10" iconColor="#0891B2" />
                <KPICard label="Tax Registration" value={company.taxId ? "Verified" : "Pending"} trend="99.9%" isUp period="compliance" strokeColor="#EAB308" Icon={FileText} iconBg="bg-amber-500/10" iconColor="#D97706" />
            </div>

            {successMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    <span>{successMsg}</span>
                </div>
            )}

            {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-extrabold flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span>{errorMsg}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <fieldset disabled={!isEditing} className="space-y-4">

                    {/* ── 1. Basic Information ────────────────────────────────────────── */}
                    <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-4">
                        <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                                <Building2 size={16} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Basic Information</h3>
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Primary company title and web domain</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                                    Company Name
                                </label>
                                <input
                                    type="text"
                                    name="companyName"
                                    value={formData.companyName}
                                    onChange={handleChange}
                                    placeholder="e.g. Patil Softtech Ltd"
                                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 disabled:opacity-75 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                                    Website URL
                                </label>
                                <input
                                    type="text"
                                    name="website"
                                    value={formData.website}
                                    onChange={handleChange}
                                    placeholder="https://www.example.com"
                                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 disabled:opacity-75 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── 2. Contact Details ─────────────────────────────────────────── */}
                    <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-4">
                        <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center font-bold">
                                <Mail size={16} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Contact & Communication</h3>
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Official email address and support line</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                                    Official Email Address
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="contact@company.com"
                                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 disabled:opacity-75 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                                    Phone Number
                                </label>
                                <input
                                    type="text"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="+91 98765 43210"
                                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 disabled:opacity-75 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── 3. Location & Legal ────────────────────────────────────────── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-4">
                            <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
                                    <MapPin size={16} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Headquarters Address</h3>
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Physical address of main office</p>
                                </div>
                            </div>
                            <div>
                                <textarea
                                    name="address"
                                    rows={3}
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="Enter full registered address..."
                                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 disabled:opacity-75 transition-all resize-none"
                                />
                            </div>
                        </div>

                        <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-4">
                            <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                                    <ShieldCheck size={16} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tax & Legal Registration</h3>
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">EIN/Tax ID and CIN Registration</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tax ID / GSTIN / EIN</label>
                                    <input
                                        type="text"
                                        name="taxId"
                                        value={formData.taxId}
                                        onChange={handleChange}
                                        placeholder="XX-XXXXXXX"
                                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 disabled:opacity-75"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Company Registration No.</label>
                                    <input
                                        type="text"
                                        name="registrationNumber"
                                        value={formData.registrationNumber}
                                        onChange={handleChange}
                                        placeholder="REG-2026-XXXXX"
                                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 disabled:opacity-75"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                </fieldset>

                {/* ── Sticky Save Footer Bar ── */}
                {isEditing && (
                    <div className="sticky bottom-6 mt-6 bg-white/95 dark:bg-[#111C24]/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-4 flex items-center justify-between z-50 animate-fadeIn">
                        <div>
                            <p className="text-xs font-extrabold text-slate-900 dark:text-white">Editing Organization Metadata</p>
                            <p className="text-[11px] font-semibold text-slate-400">Save changes to publish updates across employee portals.</p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={updateMutation.isPending}
                                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-extrabold rounded-xl text-xs shadow-sm transition-all flex items-center space-x-1.5"
                            >
                                {updateMutation.isPending ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save size={14} strokeWidth={2.5} />
                                        <span>Save Profile</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </form>
        </div>
    );
};

export default CompanyProfile;
