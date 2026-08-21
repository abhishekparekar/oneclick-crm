import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCompanyProfileApi, updateCompanyProfileApi } from "../../api/companyAdminApi";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import {
    Building2, Mail, Phone, MapPin, Globe, Save, Building, ShieldCheck,
    AlertCircle, Edit2, Sparkles, ArrowUp, ArrowDown, Users, FileText, CheckCircle2,
    X, ExternalLink, Hash, Check
} from "lucide-react";

// ── Top KPI Stat Card (Ultra-Compact SaaS Style) ──────────────────────────
const KPICard = ({ label, value, trend, isUp, period, strokeColor, Icon, iconBg, iconColor }) => {
    const sparkData = useMemo(() => [
        { v: 16 }, { v: 24 }, { v: 20 }, { v: 30 }, { v: 26 }, { v: 38 }, { v: 32 }, { v: 44 },
    ], []);

    return (
        <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-2.5 sm:p-3 flex items-center justify-between shadow-2xs hover:shadow-md transition-all duration-200 group">
            <div className="flex-1 min-w-0 pr-1.5">
                <div className="flex items-center gap-1.5 mb-1">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center ${iconBg} shrink-0`}>
                        <Icon size={12} style={{ color: iconColor }} strokeWidth={2.4} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">{label}</span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-0.5 truncate">{value}</h3>
                <div className="flex items-center gap-1 text-[10px]">
                    <span className={`inline-flex items-center font-extrabold ${isUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
                        {isUp ? <ArrowUp size={9} strokeWidth={2.5} /> : <ArrowDown size={9} strokeWidth={2.5} />}
                        {trend}
                    </span>
                    <span className="text-slate-400 text-[9px] truncate">vs {period}</span>
                </div>
            </div>
            <div className="hidden sm:block h-8 w-12 opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none shrink-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={32}>
                    <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id={`sk-cp-${label.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.35} />
                                <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="v" stroke={strokeColor} strokeWidth={2} fill={`url(#sk-cp-${label.replace(/\s+/g, '')})`} />
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
            setSuccessMsg("Organization profile updated successfully.");
            setErrorMsg("");
            setIsEditing(false);
            setTimeout(() => setSuccessMsg(""), 3000);
        },
        onError: (err) => {
            setErrorMsg(err.response?.data?.message || "Failed to update organization profile.");
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
            <div className="flex flex-col items-center justify-center min-h-[350px]">
                <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-2.5" />
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Loading Profile...</p>
            </div>
        );
    }

    const orgInitials = (formData.companyName || "Organization").slice(0, 2).toUpperCase();

    return (
        <div className="space-y-3 pb-8 font-sans text-slate-900 dark:text-slate-100">

            {/* ── Low-Profile Executive Profile Header ────────────────────────── */}
            <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 px-3.5 py-2.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-sm shrink-0 border border-amber-500/20 shadow-2xs">
                        {orgInitials}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight leading-none truncate">
                                {formData.companyName || "Organization Profile"}
                            </h2>
                            <span className="inline-flex items-center gap-1 text-[9.5px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800 shrink-0">
                                <CheckCircle2 size={10} /> Verified
                            </span>
                            <span className="text-[9.5px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 shrink-0">
                                {company.planName || "Enterprise Suite"}
                            </span>
                        </div>
                        <p className="text-[11px] font-medium text-slate-400 mt-0.5 truncate">
                            {formData.email ? `${formData.email} • ` : ""}{formData.website || "Official Organization Workspace"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {!isEditing ? (
                        <button
                            type="button"
                            onClick={() => setIsEditing(true)}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-lg text-xs shadow-2xs transition-all cursor-pointer"
                        >
                            <Edit2 size={13} strokeWidth={2.5} />
                            <span>Edit Profile</span>
                        </button>
                    ) : (
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={updateMutation.isPending}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#004D40] hover:bg-[#00382e] text-white font-extrabold rounded-lg text-xs shadow-2xs transition-all cursor-pointer"
                            >
                                {updateMutation.isPending ? (
                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Save size={13} strokeWidth={2.5} />
                                )}
                                <span>Save Changes</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Top 4 Compact KPI Stat Cards ─────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
                <KPICard label="Account Status" value="Active Verified" trend="100%" isUp period="all time" strokeColor="#10B981" Icon={ShieldCheck} iconBg="bg-emerald-500/10" iconColor="#059669" />
                <KPICard label="Subscription Tier" value={company.planName || "Pro Plan"} trend="Active" isUp period="renewal" strokeColor="#8B5CF6" Icon={Sparkles} iconBg="bg-purple-500/10" iconColor="#7C3AED" />
                <KPICard label="Employee Limit" value={`${company.employeeLimit || 50} Max`} trend="Unlimited" isUp period="capacity" strokeColor="#06B6D4" Icon={Users} iconBg="bg-cyan-500/10" iconColor="#0891B2" />
                <KPICard label="Tax Compliance" value={formData.taxId ? "Verified" : "Pending"} trend="99.9%" isUp period="compliance" strokeColor="#EAB308" Icon={FileText} iconBg="bg-amber-500/10" iconColor="#D97706" />
            </div>

            {successMsg && (
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 size={15} />
                    <span>{successMsg}</span>
                </div>
            )}

            {errorMsg && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                    <AlertCircle size={15} />
                    <span>{errorMsg}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
                <fieldset disabled={!isEditing} className="space-y-3">

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
                        {/* Left Column: Brand Identity & Contact Channels */}
                        <div className="space-y-3">
                            
                            {/* Card 1: Brand & General Info */}
                            <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-2xs space-y-3">
                                <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                                    <div className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                                        <Building2 size={13} />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider leading-tight">General Organization Info</h3>
                                        <p className="text-[10px] text-slate-400">Legal entity name and public portal details</p>
                                    </div>
                                </div>

                                <div className="space-y-2.5">
                                    <div>
                                        <label className="block text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                                            Organization / Company Name
                                        </label>
                                        <div className="relative">
                                            <Building className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                                            <input
                                                type="text"
                                                name="companyName"
                                                value={formData.companyName}
                                                onChange={handleChange}
                                                placeholder="e.g. Acme Technologies Ltd"
                                                className="w-full pl-8 pr-3 py-1.5 bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 disabled:opacity-80 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                                            Website Domain
                                        </label>
                                        <div className="relative">
                                            <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                                            <input
                                                type="text"
                                                name="website"
                                                value={formData.website}
                                                onChange={handleChange}
                                                placeholder="https://www.example.com"
                                                className="w-full pl-8 pr-3 py-1.5 bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 disabled:opacity-80 transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: Official Contact Channels */}
                            <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-2xs space-y-3">
                                <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                                    <div className="w-6 h-6 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold">
                                        <Mail size={13} />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider leading-tight">Official Contact Channels</h3>
                                        <p className="text-[10px] text-slate-400">Primary communication email and phone</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <div>
                                        <label className="block text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                                            Official Email Address
                                        </label>
                                        <div className="relative">
                                            <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                placeholder="admin@company.com"
                                                className="w-full pl-8 pr-3 py-1.5 bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 disabled:opacity-80 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                                            Contact Phone Number
                                        </label>
                                        <div className="relative">
                                            <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                                            <input
                                                type="text"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                placeholder="+91 98765 43210"
                                                className="w-full pl-8 pr-3 py-1.5 bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 disabled:opacity-80 transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Headquarters Address & Legal Compliance */}
                        <div className="space-y-3">

                            {/* Card 3: Registered Headquarters Address */}
                            <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-2xs space-y-3">
                                <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                                    <div className="w-6 h-6 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                                        <MapPin size={13} />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider leading-tight">Headquarters Location</h3>
                                        <p className="text-[10px] text-slate-400">Physical address for official records & invoices</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                                        Registered Office Address
                                    </label>
                                    <textarea
                                        name="address"
                                        rows={3}
                                        value={formData.address}
                                        onChange={handleChange}
                                        placeholder="Enter complete office building, street, and city..."
                                        className="w-full px-3 py-2 bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 disabled:opacity-80 transition-all resize-none"
                                    />
                                </div>
                            </div>

                            {/* Card 4: Legal & Tax Compliance */}
                            <div className="bg-white dark:bg-[#111C24] rounded-xl border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-2xs space-y-3">
                                <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                                    <div className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                                        <ShieldCheck size={13} />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider leading-tight">Tax & Legal Registration</h3>
                                        <p className="text-[10px] text-slate-400">Government identifiers, GSTIN & CIN numbers</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <div>
                                        <label className="block text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                                            Tax ID / GSTIN / EIN
                                        </label>
                                        <div className="relative">
                                            <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                                            <input
                                                type="text"
                                                name="taxId"
                                                value={formData.taxId}
                                                onChange={handleChange}
                                                placeholder="27AAAAA0000A1Z5"
                                                className="w-full pl-8 pr-3 py-1.5 bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 disabled:opacity-80"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                                            Company Reg. No. (CIN)
                                        </label>
                                        <div className="relative">
                                            <FileText className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                                            <input
                                                type="text"
                                                name="registrationNumber"
                                                value={formData.registrationNumber}
                                                onChange={handleChange}
                                                placeholder="U72900MH2026PTC000000"
                                                className="w-full pl-8 pr-3 py-1.5 bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 disabled:opacity-80"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                </fieldset>
            </form>
        </div>
    );
};

export default CompanyProfile;
