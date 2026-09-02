import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  getEmployeesApi, getDepartmentsApi, getLeaveSettingsApi,
} from "../../api/companyAdminApi";
import api from "../../api/api";
import toast from "react-hot-toast";
import {
  Users, UserPlus, CalendarCheck, FileText, Clock, CheckCircle2,
  XCircle, AlertCircle, ArrowUpRight, TrendingUp, Sparkles, Building2,
  CalendarDays, DollarSign, Megaphone, UserCheck, ShieldCheck, ChevronRight,
  Search, Filter, RefreshCw, BarChart2, Award, Magnet, Phone, MessageCircle,
  MessageSquare, Plus, CloudSun, LayoutGrid, X
} from "lucide-react";

export default function HRDashboard() {
  const { user, hasPermission } = useAuth();
  const canAccessLeads = hasPermission("leads", "view") || hasPermission("leads");
  const canAccessAttendance = hasPermission("attendance", "view") || hasPermission("attendance");
  const canAccessLeaves = hasPermission("leaves", "view") || hasPermission("leaves") || hasPermission("leave");
  const canAccessTasks = hasPermission("tasks", "view") || hasPermission("tasks");
  const canAccessEmployees = hasPermission("employees", "view") || hasPermission("employees");
  const canAccessPayroll = hasPermission("payroll", "view") || hasPermission("payroll");

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [savingLead, setSavingLead] = useState(false);

  const [newLeadForm, setNewLeadForm] = useState({
    name: "",
    phone: "",
    email: "",
    company: "",
    productService: "",
    source: "Walk-in",
    statusId: "",
    estimatedValue: "",
    notes: "",
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Employees
  const { data: empRes, isLoading: empLoading } = useQuery({
    queryKey: ["hrDashboardEmployees"],
    queryFn: () => getEmployeesApi({ limit: 1000 }),
  });

  // Fetch Departments
  const { data: deptRes } = useQuery({
    queryKey: ["hrDashboardDepartments"],
    queryFn: getDepartmentsApi,
  });

  // Fetch Leads for CRM section
  const { data: leadsData } = useQuery({
    queryKey: ["hrDashboardLeads"],
    queryFn: async () => {
      try {
        const res = await api.get("/leads-engine/leads");
        return res?.data?.data || res?.data || [];
      } catch (_) {
        return [];
      }
    },
    staleTime: 30000,
  });

  const { data: leadStatusesData } = useQuery({
    queryKey: ["leadsEngineStatuses"],
    queryFn: async () => {
      try {
        const res = await api.get("/leads-engine/statuses");
        return res?.data?.data || res?.data || [];
      } catch (_) {
        return [];
      }
    },
    staleTime: 60000,
  });

  const employees = empRes?.data?.employees || empRes?.data || [];
  const departments = deptRes?.data?.departments || deptRes?.data || [];
  const leadsList = Array.isArray(leadsData) ? leadsData : [];
  const cleanStatuses = (Array.isArray(leadStatusesData) ? leadStatusesData : []).filter(
    (s) => s?.name && s.name.trim().toLowerCase() !== "aa"
  );

  const totalEmps = employees.length;
  const activeEmps = employees.filter((e) => e.status === "active").length;
  const inactiveEmps = totalEmps - activeEmps;

  // Filtered staff list
  const filteredStaff = employees.filter((e) => {
    const name = `${e.firstName || ""} ${e.lastName || ""}`.toLowerCase();
    const email = (e.email || "").toLowerCase();
    const code = (e.employeeCode || "").toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || email.includes(q) || code.includes(q);
  });

  // Lead Stats
  const leadStats = {
    total: leadsList.length,
    contacted: leadsList.filter((l) => (l.status?.name || "").toLowerCase().includes("contact")).length,
    inProgress: leadsList.filter((l) => (l.status?.name || "").toLowerCase().includes("progress") || (l.status?.name || "").toLowerCase().includes("qualif")).length,
    won: leadsList.filter((l) => (l.status?.name || "").toLowerCase().includes("won")).length,
  };

  const handleSaveLead = async (e) => {
    e.preventDefault();
    if (!newLeadForm.name.trim()) {
      toast.error("Please enter lead name");
      return;
    }
    if (!newLeadForm.phone.trim()) {
      toast.error("Please enter phone number");
      return;
    }

    setSavingLead(true);
    try {
      const activeStatusId = newLeadForm.statusId || (cleanStatuses[0] ? (cleanStatuses[0].id || cleanStatuses[0]._id) : undefined);
      const payload = {
        name: newLeadForm.name.trim(),
        phone: newLeadForm.phone.trim(),
        whatsappPhone: newLeadForm.phone.trim(),
        email: newLeadForm.email.trim(),
        company: newLeadForm.company.trim(),
        productService: newLeadForm.productService.trim(),
        source: newLeadForm.source || "Walk-in",
        statusId: activeStatusId,
        estimatedValue: newLeadForm.estimatedValue ? Number(newLeadForm.estimatedValue) : undefined,
        notes: newLeadForm.notes.trim(),
        whatsappOptIn: true,
      };

      await api.post("/leads-engine/leads", payload);
      toast.success("Lead added successfully!");
      setShowAddLeadModal(false);
      setNewLeadForm({
        name: "",
        phone: "",
        email: "",
        company: "",
        productService: "",
        source: "Walk-in",
        statusId: cleanStatuses[0] ? (cleanStatuses[0].id || cleanStatuses[0]._id) : "",
        estimatedValue: "",
        notes: "",
      });
      queryClient.invalidateQueries({ queryKey: ["hrDashboardLeads"] });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create lead");
    } finally {
      setSavingLead(false);
    }
  };

  const getGreeting = () => {
    const h = currentTime.getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="animate-fadeIn space-y-3.5 max-w-[1440px] mx-auto pb-16 font-sans text-slate-900 dark:text-slate-100">
      
      {/* ── Top Header & Live Widgets Bar ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight flex items-center gap-2">
            {getGreeting()}, HR Management <span className="text-xl">👋</span>
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
            <span>Managing <strong className="text-[#00D4C8] font-bold">{totalEmps} employees</strong> across <strong className="text-amber-500 font-bold">{departments.length} departments</strong></span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> HR Portal Active
            </span>
          </p>
        </div>

        {/* Live Weather & Time Badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 shadow-2xs text-xs">
            <CloudSun size={15} className="text-amber-500" />
            <span className="font-bold text-slate-700 dark:text-slate-200">29°C</span>
            <span className="text-[10px] text-slate-400">Pune</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 shadow-2xs text-xs">
            <Clock size={15} className="text-indigo-500" />
            <span className="font-bold font-mono text-slate-700 dark:text-slate-200">
              {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1 pl-1">
            <Link to="/hr/employees/add" className="w-8 h-8 rounded-xl bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 hover:border-teal-300 flex items-center justify-center text-slate-600 hover:text-[#00D4C8] shadow-2xs transition-all" title="Add Employee">
              <UserPlus size={14} />
            </Link>
            {canAccessAttendance && (
              <Link to="/hr/attendance" className="w-8 h-8 rounded-xl bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 hover:border-purple-300 flex items-center justify-center text-slate-600 hover:text-purple-600 shadow-2xs transition-all" title="Attendance">
                <CalendarCheck size={14} />
              </Link>
            )}
            {canAccessLeaves && (
              <Link to="/hr/leaves" className="w-8 h-8 rounded-xl bg-white dark:bg-[#111C24] border border-slate-200/80 dark:border-slate-800 hover:border-pink-300 flex items-center justify-center text-slate-600 hover:text-pink-600 shadow-2xs transition-all" title="Leaves">
                <FileText size={14} />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── 4 Top KPI Mini-Tiles (Compact & High-Density) ────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white dark:bg-[#111C24] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              <Users size={12} className="text-[#00D4C8]" /> Workforce
            </div>
            <div className="text-lg font-black text-slate-800 dark:text-white leading-tight">{totalEmps}</div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">{activeEmps} Active • {inactiveEmps} Inactive</span>
          </div>
          <Link to="/hr/employees" className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-[#00D4C8] hover:bg-[#00D4C8] hover:text-white flex items-center justify-center transition-colors">
            <ChevronRight size={13} />
          </Link>
        </div>

        <div className="bg-white dark:bg-[#111C24] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              <Building2 size={12} className="text-[#F5A623]" /> Departments
            </div>
            <div className="text-lg font-black text-[#d97706] leading-tight">{departments.length} Units</div>
            <span className="text-[10px] text-slate-400 font-semibold">Active Units</span>
          </div>
          <Link to="/hr/departments" className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-[#F5A623] hover:bg-[#F5A623] hover:text-white flex items-center justify-center transition-colors">
            <ChevronRight size={13} />
          </Link>
        </div>

        {canAccessAttendance && (
          <div className="bg-white dark:bg-[#111C24] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                <CalendarCheck size={12} className="text-[#A855F7]" /> Attendance
              </div>
              <div className="text-lg font-black text-[#7c3aed] leading-tight">98.4%</div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Geofence Verified</span>
            </div>
            <Link to="/hr/attendance" className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-[#A855F7] hover:bg-[#A855F7] hover:text-white flex items-center justify-center transition-colors">
              <ChevronRight size={13} />
            </Link>
          </div>
        )}

        {canAccessLeaves && (
          <div className="bg-white dark:bg-[#111C24] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                <FileText size={12} className="text-[#E91E8C]" /> Leave Review
              </div>
              <div className="text-lg font-black text-[#db2777] leading-tight">Pending</div>
              <span className="text-[10px] text-pink-600 dark:text-pink-400 font-semibold">Requires Action</span>
            </div>
            <Link to="/hr/leaves" className="w-7 h-7 rounded-lg bg-pink-50 dark:bg-pink-950/40 text-[#E91E8C] hover:bg-[#E91E8C] hover:text-white flex items-center justify-center transition-colors">
              <ChevronRight size={13} />
            </Link>
          </div>
        )}
      </div>

      {/* ── Main Two-Column Grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        
        {/* ───────── LEFT WORKSPACE (2 COLS) ───────── */}
        <div className="lg:col-span-2 space-y-3.5">
          
          {/* ── Lead Management CRM (Compact Interactive Section) ── */}
          {canAccessLeads && (
            <div className="bg-white dark:bg-[#111C24] rounded-xl p-4 shadow-2xs border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-[#f97316]">
                    <Magnet size={14} />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">Lead Management CRM</h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Assigned Leads &amp; Candidate Pipeline</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowAddLeadModal(true)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#f97316] hover:bg-[#ea580c] text-white text-[11px] font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <Plus size={12} /> Add Lead
                  </button>
                  <Link
                    to="/hr/leads"
                    className="text-[11px] font-bold text-[#f97316] hover:text-[#ea580c] flex items-center gap-0.5 px-2 py-1 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors"
                  >
                    View All <ChevronRight size={12} />
                  </Link>
                </div>
              </div>

              {/* 4 KPI Grid Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                <div className="bg-orange-50/60 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 rounded-lg p-2.5">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400 uppercase">Total</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#f97316]" />
                  </div>
                  <div className="text-lg font-black text-[#ea580c] leading-tight">{leadStats.total}</div>
                  <span className="text-[9px] text-orange-600/80 font-medium">All Leads</span>
                </div>

                <div className="bg-purple-50/60 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 rounded-lg p-2.5">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase">Contacted</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" />
                  </div>
                  <div className="text-lg font-black text-[#7c3aed] leading-tight">{leadStats.contacted}</div>
                  <span className="text-[9px] text-purple-600/80 font-medium">Follow-ups</span>
                </div>

                <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-lg p-2.5">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">In Progress</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                  </div>
                  <div className="text-lg font-black text-[#d97706] leading-tight">{leadStats.inProgress}</div>
                  <span className="text-[9px] text-amber-600/80 font-medium">Active</span>
                </div>

                <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-lg p-2.5">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Won</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                  </div>
                  <div className="text-lg font-black text-[#059669] leading-tight">{leadStats.won}</div>
                  <span className="text-[9px] text-emerald-600/80 font-medium">Deals Closed</span>
                </div>
              </div>

              {/* Recent Prospects List */}
              {leadsList.length > 0 ? (
                <div className="space-y-1.5">
                  <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>Recent Prospects</span>
                    <span>1-Click Contact</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {leadsList.slice(0, 4).map((lead) => {
                      const sName = lead.status?.name || "New";
                      const sColor = lead.status?.color || (sName.toLowerCase().includes("won") ? "#10b981" : sName.toLowerCase().includes("contact") ? "#8b5cf6" : "#06b6d4");
                      const cleanPhone = (lead.whatsappPhone || lead.phone || "").replace(/[^0-9]/g, "");

                      const leadId = lead.id || lead._id;

                      return (
                        <div
                          key={leadId || Math.random().toString()}
                          onClick={() => leadId && navigate(`/hr/leads/${leadId}`)}
                          className="flex items-center justify-between p-2 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 hover:border-orange-300 dark:hover:border-orange-500/50 hover:bg-orange-50/30 dark:hover:bg-orange-950/20 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs shrink-0 border group-hover:scale-105 transition-transform"
                              style={{ backgroundColor: `${sColor}15`, borderColor: `${sColor}30`, color: sColor }}
                            >
                              {(lead.name || "LD").slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-800 dark:text-white truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                                {lead.name}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {lead.company || lead.productService || "Prospect"}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 ml-1.5">
                            {lead.estimatedValue && (
                              <span className="text-[9.5px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1 py-0.2 rounded">
                                ₹{Number(lead.estimatedValue).toLocaleString("en-IN")}
                              </span>
                            )}
                            {cleanPhone && (
                              <a
                                href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hello ${lead.name || ""}, connecting from One Click regarding your inquiry.`)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="w-6 h-6 rounded-md bg-emerald-50 hover:bg-emerald-500 text-emerald-600 hover:text-white flex items-center justify-center transition-all"
                                title="Chat on WhatsApp"
                              >
                                <MessageSquare size={11} />
                              </a>
                            )}
                            {cleanPhone && (
                              <a
                                href={`tel:${cleanPhone}`}
                                className="w-6 h-6 rounded-md bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white flex items-center justify-center transition-all"
                                title="Call"
                              >
                                <Phone size={11} />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* ── Employee Directory & Workforce Roster Table ── */}
          <div className="bg-white dark:bg-[#111C24] rounded-xl p-4 shadow-2xs border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">Employee Directory</h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Quick overview of onboarded staff members</p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-60">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name or code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-[#00D4C8]"
                />
              </div>
            </div>

            {/* Table */}
            {empLoading ? (
              <div className="text-center py-8 text-xs font-bold text-slate-400 animate-pulse">
                Loading employee directory...
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No employees match your search criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[9.5px] font-black uppercase tracking-wider text-slate-400">
                      <th className="py-2 px-2.5">Employee</th>
                      <th className="py-2 px-2.5">Role</th>
                      <th className="py-2 px-2.5">Department</th>
                      <th className="py-2 px-2.5">Status</th>
                      <th className="py-2 px-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {filteredStaff.slice(0, 6).map((emp) => {
                      const fullName = `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Staff Member";
                      const rawPhoto = emp.photo || emp.user?.profileImage;
                      const photoUrl = rawPhoto ? (rawPhoto.startsWith("http") || rawPhoto.startsWith("data:") ? rawPhoto : `${(import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace("/api", "")}${rawPhoto.startsWith("/") ? "" : "/"}${rawPhoto}`) : null;

                      return (
                        <tr key={emp._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="py-2 px-2.5">
                            <div className="flex items-center gap-2">
                              {photoUrl ? (
                                <img src={photoUrl} alt={fullName} className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700" />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#00D4C8] to-[#A855F7] text-black font-black text-[11px] flex items-center justify-center shrink-0">
                                  {fullName.charAt(0)}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-bold text-slate-800 dark:text-white truncate">{fullName}</p>
                                <p className="text-[9.5px] text-slate-400 truncate">{emp.email || emp.employeeCode}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-2 px-2.5 font-semibold text-slate-600 dark:text-slate-300 text-[11px]">{emp.role || "Employee"}</td>
                          <td className="py-2 px-2.5 font-medium text-slate-400 text-[11px]">
                            {emp.departmentId?.name || "General"}
                          </td>
                          <td className="py-2 px-2.5">
                            <span className={`inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              emp.status === "active"
                                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                                : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                            }`}>
                              {emp.status || "active"}
                            </span>
                          </td>
                          <td className="py-2 px-2.5 text-right">
                            <Link
                              to={`/hr/employees/edit/${emp._id}`}
                              className="text-[10.5px] font-bold text-[#00D4C8] hover:underline"
                            >
                              Edit Profile
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {filteredStaff.length > 6 && (
              <div className="text-center pt-1 border-t border-slate-100 dark:border-slate-800">
                <Link to="/hr/employees" className="text-xs font-bold text-[#00D4C8] hover:underline inline-flex items-center gap-1">
                  <span>View All {filteredStaff.length} Employees</span>
                  <ArrowUpRight size={13} />
                </Link>
              </div>
            )}
          </div>

        </div>

        {/* ───────── RIGHT COLUMN: HR OPERATIONS HUB ───────── */}
        <div className="space-y-3.5">
          
          {/* Quick Module Shortcuts */}
          <div className="bg-white dark:bg-[#111C24] rounded-xl p-4 shadow-2xs border border-slate-200/80 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-white mb-1">
              <LayoutGrid size={14} className="text-[#00D4C8]" /> HR Operations Hub
            </div>

            <div className="space-y-1.5">
              {[
                { title: "Employee Directory", desc: "Manage profiles & info", path: "/hr/employees", icon: Users, color: "#00D4C8" },
                { title: "Add New Employee", desc: "Onboard new staff member", path: "/hr/employees/add", icon: UserPlus, color: "#F5A623" },
                { title: "Leave Approvals", desc: "Review time-off requests", path: "/hr/leaves", icon: FileText, color: "#E91E8C", module: "leaves" },
                { title: "Attendance Logs", desc: "GPS punch verification", path: "/hr/attendance", icon: CalendarCheck, color: "#A855F7", module: "attendance" },
                { title: "Generate Salary Slips", desc: "Monthly payroll cycle", path: "/hr/payroll/generate", icon: DollarSign, color: "#00D4C8", module: "payroll" },
                { title: "Post Announcements", desc: "Broadcast updates to staff", path: "/hr/announcements", icon: Megaphone, color: "#F5A623" },
              ]
                .filter((item) => !item.module || hasPermission(item.module))
                .map((item, i) => (
                  <Link
                    key={i}
                    to={item.path}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${item.color}15`, color: item.color }}>
                        <item.icon size={14} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-white group-hover:text-[#00D4C8] transition-colors">{item.title}</p>
                        <p className="text-[9.5px] text-slate-400">{item.desc}</p>
                      </div>
                    </div>
                    <ChevronRight size={13} className="text-slate-300 dark:text-slate-600 group-hover:text-[#00D4C8] transition-colors" />
                  </Link>
                ))}
            </div>
          </div>

          {/* Quick Department Distribution */}
          <div className="bg-white dark:bg-[#111C24] rounded-xl p-4 shadow-2xs border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-white">
                <Building2 size={14} className="text-[#F5A623]" /> Departments ({departments.length})
              </div>
              <Link to="/hr/departments" className="text-[10px] font-bold text-[#F5A623] hover:underline">
                Manage
              </Link>
            </div>

            <div className="space-y-1.5">
              {departments.slice(0, 4).map((dept) => (
                <div key={dept._id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50/60 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">{dept.name}</span>
                  <span className="text-[10px] font-black text-slate-500 bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                    {dept.employeeCount || 0} Staff
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* ── Add Lead Modal Dialog ─────────────────────────────────────────── */}
      {showAddLeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#111C24] rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-100 dark:border-slate-800 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-[#f97316]">
                  <Magnet size={15} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white">Add New Lead</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Direct CRM Prospect Capture</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddLeadModal(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveLead} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={newLeadForm.name}
                  onChange={(e) => setNewLeadForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-[#f97316]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                    WhatsApp / Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={newLeadForm.phone}
                    onChange={(e) => setNewLeadForm((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-[#f97316]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. rahul@example.com"
                    value={newLeadForm.email}
                    onChange={(e) => setNewLeadForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-[#f97316]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sharma Tech"
                    value={newLeadForm.company}
                    onChange={(e) => setNewLeadForm((p) => ({ ...p, company: e.target.value }))}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-[#f97316]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Requirement / Product
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HRMS Software"
                    value={newLeadForm.productService}
                    onChange={(e) => setNewLeadForm((p) => ({ ...p, productService: e.target.value }))}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-[#f97316]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Lead Source
                  </label>
                  <select
                    value={newLeadForm.source}
                    onChange={(e) => setNewLeadForm((p) => ({ ...p, source: e.target.value }))}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-[#f97316]"
                  >
                    <option value="Walk-in">Walk-in</option>
                    <option value="Website Form">Website Form</option>
                    <option value="WhatsApp Chat">WhatsApp Chat</option>
                    <option value="Client Referral">Client Referral</option>
                    <option value="Facebook Ad">Facebook Ad</option>
                    <option value="Google Search">Google Search</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Estimated Deal Value (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 50000"
                    value={newLeadForm.estimatedValue}
                    onChange={(e) => setNewLeadForm((p) => ({ ...p, estimatedValue: e.target.value }))}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-[#f97316]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Pipeline Status
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {cleanStatuses.map((st) => {
                    const stId = st.id || st._id;
                    const isSelected = newLeadForm.statusId === stId || (!newLeadForm.statusId && st === cleanStatuses[0]);
                    return (
                      <button
                        type="button"
                        key={stId}
                        onClick={() => setNewLeadForm((p) => ({ ...p, statusId: stId }))}
                        className={`px-2 py-0.5 text-[10.5px] font-bold rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                          isSelected
                            ? "bg-[#f97316] text-white border-[#f97316]"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: st.color || "#f97316" }} />
                        {st.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Notes / Requirement
                </label>
                <textarea
                  rows={2}
                  placeholder="Meeting notes or requirement..."
                  value={newLeadForm.notes}
                  onChange={(e) => setNewLeadForm((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-[#f97316]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddLeadModal(false)}
                  className="px-4 py-2 text-xs font-bold rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingLead}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-[#f97316] to-[#ea580c] hover:from-[#ea580c] hover:to-[#c2410c] text-white shadow-md shadow-orange-500/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {savingLead ? "Saving..." : "Save Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
