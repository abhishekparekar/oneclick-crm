import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  ArrowRight,
  Shield,
  CheckCircle2,
  Smartphone,
  Laptop,
  CheckSquare,
  Calendar,
  DollarSign,
  Layers,
  ChevronRight,
  Menu,
  X,
  TrendingUp,
  Zap,
  Check,
  MapPin,
  Briefcase,
  Play,
  Globe,
  Lock,
  BarChart3,
  Target,
  HeartHandshake,
  MessageSquare,
  Users,
  ChevronDown,
  Star,
  Clock,
  Building2,
  FileText,
  UserCheck,
  Award,
  Activity,
  Compass,
} from "lucide-react";
import OneClickLogo from "../components/common/OneClickLogo";

const LandingPage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("attendance");
  const [billingCycle, setBillingCycle] = useState("yearly"); // monthly | yearly
  const [openFaq, setOpenFaq] = useState(0);

  // Interactive Live Playground State
  const [simRadius, setSimRadius] = useState(150);
  const [simBasePay, setSimBasePay] = useState(50000);
  const [simAllowances, setSimAllowances] = useState(15000);
  const [simDeductions, setSimDeductions] = useState(4000);

  const calculatedNetPay = simBasePay + simAllowances - simDeductions;

  const STATS = [
    { value: "99.99%", label: "Cloud Uptime SLA", icon: Shield, color: "#38BDF8" },
    { value: "10,000+", label: "Daily GPS Punches", icon: MapPin, color: "#FB923C" },
    { value: "1-Click", label: "Automated Payroll", icon: DollarSign, color: "#4ADE80" },
    { value: "4.9 / 5★", label: "App Store Rating", icon: Star, color: "#F472B6" },
  ];

  const PORTALS = [
    {
      id: "admin",
      title: "Company Admin",
      badge: "Executive HQ",
      icon: Laptop,
      color: "#FB923C",
      desc: "Full company command. Multi-branch GPS geofences, automated payroll rules, tax formulas, and department oversight.",
      bullets: ["GPS Geofence Perimeter Builder", "1-Click Monthly Salary Slips", "Branch & Multi-Shift Rosters"],
    },
    {
      id: "hr",
      title: "HR Operations",
      badge: "People Hub",
      icon: HeartHandshake,
      color: "#F472B6",
      desc: "Streamlined employee lifecycle. Digital onboarding, document vault, attendance regularization, and leave ledger.",
      bullets: ["Self-Serve Onboarding Wizard", "Leave & Regularization Queues", "Employee Document Locker"],
    },
    {
      id: "manager",
      title: "Team Manager",
      badge: "Operations",
      icon: Briefcase,
      color: "#38BDF8",
      desc: "High-velocity team coordination. Kanban boards, subtask distribution, live attendance radar, and shift approvals.",
      bullets: ["Live Attendance Radar Stream", "Kanban Project & Task Boards", "Team Leave & Overtime Approvals"],
    },
    {
      id: "employee",
      title: "Staff Mobile App",
      badge: "Mobile iOS & Android",
      icon: Smartphone,
      color: "#4ADE80",
      desc: "Instant mobility for on-field & office staff. 1-tap selfie GPS clock-in, daily task check-offs, and payslip PDF downloads.",
      bullets: ["Anti-Spoofing GPS Validation", "Daily Task Checklist Check-offs", "Instant Monthly Payslip PDF"],
    },
  ];

  const FEATURES = [
    {
      icon: MapPin,
      title: "GPS Geofencing & Anti-Spoofing",
      desc: "Prevent proxy attendance. Validates mobile high-precision coordinates within authorized branch boundaries.",
      accent: "#FB923C",
    },
    {
      icon: DollarSign,
      title: "1-Click Automated Payroll",
      desc: "Auto-computes allowances, PF/ESI, overtime, and unpaid days into compliant salary slip PDFs instantly.",
      accent: "#4ADE80",
    },
    {
      icon: CheckSquare,
      title: "Dynamic Kanban Task Boards",
      desc: "Assign projects, set priorities, and track checklist milestones with live real-time progress indicators.",
      accent: "#38BDF8",
    },
    {
      icon: Calendar,
      title: "Smart Leave & Shift Engine",
      desc: "Multi-tier approval workflows for Casual, Sick, Paid, and LOP leaves with auto-adjusting ledger balances.",
      accent: "#F472B6",
    },
    {
      icon: MessageSquare,
      title: "WhatsApp CRM & Drip Engine",
      desc: "Broadcast announcements, automate customer lead pipelines, and send payslip alerts directly on WhatsApp.",
      accent: "#22C55E",
    },
    {
      icon: Lock,
      title: "Enterprise Role Security Matrix",
      desc: "Strict permission separation between SuperAdmin, Company Admin, HR, Manager, and Staff with audit logs.",
      accent: "#A855F7",
    },
  ];

  const WORKFLOW = [
    { step: "01", title: "Sign Up Free", desc: "30-second setup. 7-day full access trial with 10 team seats.", accent: "#FB923C" },
    { step: "02", title: "Set Geofence & Shifts", desc: "Pinpoint office GPS location & radius on interactive map.", accent: "#F472B6" },
    { step: "03", title: "Invite Team Members", desc: "Auto-generate credentials and mobile app links for staff.", accent: "#A855F7" },
    { step: "04", title: "1-Click Automation", desc: "Real-time sync of attendance, tasks, leaves, and salary slips.", accent: "#38BDF8" },
  ];

  const FAQS = [
    {
      q: "What is included in the 7-day free trial?",
      a: "You get complete unrestricted access to all modules — GPS Geofenced Attendance, Payroll generation, Task boards, HR tools, and the Mobile App for up to 10 employees. No credit card is required.",
    },
    {
      q: "How does GPS Geofencing stop proxy punching?",
      a: "Our app performs multi-point satellite validation against the office coordinates configured in your Admin Portal. If an employee is outside the designated radius (e.g. 150m), the punch is blocked with anti-spoofing protection.",
    },
    {
      q: "Can we manage multiple branches and different shifts?",
      a: "Yes! You can create unlimited branches, each with independent GPS geofence radiuses, unique shift timings, weekend rules, and assigned staff.",
    },
    {
      q: "How does payroll computation work?",
      a: "ONE CLICK tracks actual verified attendance, approved leaves, and deductions. At month-end, click 'Generate Payroll' to automatically compute earnings, PF/ESI, and generate downloadable salary slip PDFs.",
    },
    {
      q: "Is there a dedicated mobile app for staff?",
      a: "Yes, employees and managers can use our high-performance React Native mobile companion app for lightning-fast clock-in, task management, and leave requests.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#070A12] text-slate-100 font-sans relative selection:bg-rose-500 selection:text-white overflow-x-hidden">
      
      {/* ── Ambient Background Lighting ── */}
      <div className="fixed -top-32 -left-32 w-[500px] h-[500px] bg-gradient-to-br from-fuchsia-600/25 via-purple-600/10 to-transparent rounded-full blur-[130px] pointer-events-none" />
      <div className="fixed top-[20%] -right-32 w-[480px] h-[480px] bg-gradient-to-bl from-cyan-500/20 via-blue-600/10 to-transparent rounded-full blur-[130px] pointer-events-none" />
      <div className="fixed top-[65%] -left-28 w-[450px] h-[450px] bg-gradient-to-tr from-orange-500/25 via-rose-600/15 to-transparent rounded-full blur-[130px] pointer-events-none" />

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0" />

      {/* ═══════════════════════════════════════════════════════════════
          STICKY NAVBAR (Compact & Modern)
      ════════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#070A12]/85 border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          <Link to="/" className="flex items-center gap-2 group">
            <OneClickLogo variant="landscape" />
          </Link>

          {/* Nav items */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-bold text-slate-300">
            <a href="#features" className="hover:text-cyan-400 transition-colors">Features</a>
            <a href="#ecosystem" className="hover:text-cyan-400 transition-colors">Portals</a>
            <a href="#demo" className="hover:text-cyan-400 transition-colors">Live Demo</a>
            <a href="#workflow" className="hover:text-cyan-400 transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-cyan-400 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-cyan-400 transition-colors">FAQ</a>
          </nav>

          {/* Header Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 rounded-full text-xs font-bold text-slate-200 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 transition-all"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 rounded-full text-xs font-black text-white bg-gradient-to-r from-[#FF7A00] via-[#E11D48] via-[#9333EA] to-[#00D2C4] hover:opacity-95 shadow-[0_4px_16px_rgba(225,29,72,0.4)] transition-all flex items-center gap-1.5"
            >
              <span>Free Trial</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-white/[0.05] text-slate-200 border border-white/10"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0B0F19] border-b border-white/10 px-6 py-5 space-y-3 animate-fadeIn">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block text-xs font-bold text-slate-200">Features</a>
            <a href="#ecosystem" onClick={() => setMobileMenuOpen(false)} className="block text-xs font-bold text-slate-200">Portals</a>
            <a href="#demo" onClick={() => setMobileMenuOpen(false)} className="block text-xs font-bold text-slate-200">Live Demo</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block text-xs font-bold text-slate-200">Pricing</a>
            <div className="pt-3 border-t border-white/10 flex gap-2">
              <Link to="/login" className="flex-1 py-2 text-center rounded-xl bg-white/[0.05] text-xs font-bold text-white border border-white/10">
                Sign In
              </Link>
              <Link to="/register" className="flex-1 py-2 text-center rounded-xl bg-gradient-to-r from-[#FF7A00] via-[#E11D48] to-[#00D2C4] text-xs font-black text-white">
                Free Trial
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ═══════════════════════════════════════════════════════════════
          COMPACT HERO SECTION
      ════════════════════════════════════════════════════════════════ */}
      <section className="relative pt-12 sm:pt-16 pb-16 px-4 sm:px-6 lg:px-8 z-10">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500/10 via-rose-500/10 to-cyan-500/10 border border-white/15 px-3.5 py-1 rounded-full shadow-[0_0_15px_rgba(244,63,94,0.15)]">
            <Sparkles size={13} className="text-orange-400 animate-pulse" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-200">
              Workforce OS • 7-Day Free Trial (10 Seats Included)
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.12] text-white">
            Operate Your Entire Workforce With{" "}
            <span className="bg-gradient-to-r from-[#FF7A00] via-[#F43F5E] via-[#A855F7] to-[#00D2C4] bg-clip-text text-transparent">
              One Click
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-slate-300 text-sm sm:text-base font-medium max-w-2xl mx-auto leading-relaxed">
            Unified <span className="text-amber-400 font-bold">GPS Geofenced Attendance</span>,{" "}
            <span className="text-cyan-400 font-bold">Kanban Tasks</span>,{" "}
            <span className="text-emerald-400 font-bold">1-Click Payroll</span>, and{" "}
            <span className="text-pink-400 font-bold">WhatsApp Drips</span> for high-performance companies.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to="/register"
              className="w-full sm:w-auto px-7 py-3.5 rounded-full text-sm font-black text-white bg-gradient-to-r from-[#FF7A00] via-[#E11D48] via-[#9333EA] to-[#00D2C4] hover:opacity-95 shadow-[0_6px_25px_rgba(225,29,72,0.45)] hover:scale-105 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Start 7-Day Free Trial</span>
              <ArrowRight size={16} strokeWidth={2.5} />
            </Link>
            <a
              href="#demo"
              className="w-full sm:w-auto px-6 py-3.5 rounded-full text-xs font-bold text-slate-200 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play size={14} className="text-cyan-400 fill-cyan-400/20" />
              <span>Interactive Live Demo</span>
            </a>
          </div>

          {/* Guarantee Badges */}
          <div className="flex flex-wrap items-center justify-center gap-5 pt-2 text-[11px] font-semibold text-slate-400">
            <span className="flex items-center gap-1">✓ No Credit Card</span>
            <span className="flex items-center gap-1">✓ 30-Sec Instant Setup</span>
            <span className="flex items-center gap-1">✓ Mobile App Ready</span>
          </div>

        </div>

        {/* ── Stat Counters ── */}
        <div className="max-w-5xl mx-auto mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                className="bg-[#0C111D]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4 text-center space-y-1 hover:border-white/20 transition-all shadow-md"
              >
                <div
                  className="text-2xl sm:text-3xl font-black tracking-tight"
                  style={{ color: stat.color }}
                >
                  {stat.value}
                </div>
                <div className="text-xs font-bold text-white">{stat.label}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          COMPACT INTERACTIVE LIVE DEMO PLAYGROUND
      ════════════════════════════════════════════════════════════════ */}
      <section id="demo" className="py-14 px-4 sm:px-6 lg:px-8 relative z-10 border-t border-white/[0.08]">
        <div className="max-w-5xl mx-auto space-y-8">
          
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1 bg-cyan-500/10 border border-cyan-500/20 px-3 py-0.5 rounded-full text-xs font-bold text-cyan-300">
              <Zap size={12} className="text-cyan-400" />
              <span>Interactive SaaS Simulator</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Test Drive The Platform Right Here
            </h2>
          </div>

          {/* Compact Tab Switcher */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 p-1 bg-[#0C111D] border border-white/10 rounded-xl max-w-xl mx-auto">
            {[
              { id: "attendance", label: "GPS Geofence", icon: MapPin },
              { id: "payroll", label: "1-Click Payroll", icon: DollarSign },
              { id: "tasks", label: "Kanban Tasks", icon: CheckSquare },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    active
                      ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Simulator Container */}
          <div className="bg-[#0C111D]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl">
            
            {activeTab === "attendance" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center animate-fadeIn">
                <div className="lg:col-span-6 space-y-4">
                  <span className="text-xs font-extrabold text-orange-400 uppercase tracking-wider">
                    GPS Geofence Radius Slider
                  </span>
                  <h3 className="text-xl font-bold text-white">Adjust Verification Boundary</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Set the authorized office radius. Staff within the circle punch in successfully; proxies outside are rejected.
                  </p>

                  <div className="space-y-3 pt-1">
                    <div className="flex justify-between text-xs font-bold text-slate-300">
                      <span>Office Perimeter Limit:</span>
                      <span className="text-orange-400">{simRadius} meters</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="400"
                      step="25"
                      value={simRadius}
                      onChange={(e) => setSimRadius(Number(e.target.value))}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    />
                    <div className="p-3 bg-white/[0.04] border border-white/10 rounded-xl text-xs font-bold flex justify-between items-center">
                      <span className="text-slate-400">Sample Employee Distance:</span>
                      <span className={simRadius >= 120 ? "text-emerald-400 font-black" : "text-rose-400 font-black"}>
                        {simRadius >= 120 ? "Within Boundary (85m) — Clock-In Allowed ✅" : "Outside Boundary (85m) — Blocked ❌"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-6 bg-[#131C2E] border border-[#2D3E5F] rounded-2xl p-6 flex flex-col items-center justify-center min-h-[220px] relative overflow-hidden">
                  <div className="relative w-36 h-36 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border border-cyan-500/30 animate-ping" />
                    <div className="absolute inset-2 rounded-full border-2 border-orange-500/40 bg-orange-500/10" />
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 flex items-center justify-center text-white shadow-md z-10">
                      <Building2 size={18} />
                    </div>
                  </div>
                  <div className="text-[11px] font-bold text-slate-300 mt-3">Pune HQ Branch Geofence Active</div>
                </div>
              </div>
            )}

            {activeTab === "payroll" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center animate-fadeIn">
                <div className="lg:col-span-6 space-y-4">
                  <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider">
                    Automated Salary Engine
                  </span>
                  <h3 className="text-xl font-bold text-white">Live Payroll Breakdown</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                        <span>Base Salary:</span>
                        <span className="text-emerald-400">₹{simBasePay.toLocaleString()}</span>
                      </div>
                      <input
                        type="range"
                        min="20000"
                        max="100000"
                        step="5000"
                        value={simBasePay}
                        onChange={(e) => setSimBasePay(Number(e.target.value))}
                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                        <span>Allowances (HRA/Medical):</span>
                        <span className="text-cyan-400">₹{simAllowances.toLocaleString()}</span>
                      </div>
                      <input
                        type="range"
                        min="2000"
                        max="30000"
                        step="1000"
                        value={simAllowances}
                        onChange={(e) => setSimAllowances(Number(e.target.value))}
                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-6 bg-[#131C2E] border border-[#2D3E5F] rounded-2xl p-5 space-y-3">
                  <div className="flex justify-between items-center border-b border-white/10 pb-2 text-xs font-bold">
                    <span className="text-slate-300">Net Take-Home Salary</span>
                    <span className="text-emerald-400 text-lg font-black">₹{calculatedNetPay.toLocaleString()}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 space-y-1.5">
                    <div className="flex justify-between"><span>Gross Earnings:</span><span className="text-white font-bold">₹{(simBasePay + simAllowances).toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Tax &amp; PF Deductions:</span><span className="text-rose-400 font-bold">-₹{simDeductions.toLocaleString()}</span></div>
                  </div>
                  <div className="pt-2 border-t border-white/10 text-center">
                    <span className="text-[10px] font-extrabold text-cyan-400 uppercase">Automated PDF Payslip Ready</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "tasks" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fadeIn">
                <div className="p-3 bg-[#131C2E] rounded-xl border border-[#2D3E5F] space-y-2">
                  <span className="text-[11px] font-extrabold text-amber-400 uppercase">To Do (2)</span>
                  <div className="p-2.5 bg-white/[0.04] rounded-lg text-xs font-bold text-white">Setup Pune GPS Geofence</div>
                </div>
                <div className="p-3 bg-[#131C2E] rounded-xl border border-[#2D3E5F] space-y-2">
                  <span className="text-[11px] font-extrabold text-cyan-400 uppercase">In Progress (3)</span>
                  <div className="p-2.5 bg-white/[0.04] rounded-lg text-xs font-bold text-white">Process August Salary Slips</div>
                </div>
                <div className="p-3 bg-[#131C2E] rounded-xl border border-[#2D3E5F] space-y-2">
                  <span className="text-[11px] font-extrabold text-emerald-400 uppercase">Completed (6)</span>
                  <div className="p-2.5 bg-white/[0.04] rounded-lg text-xs font-bold text-white">Onboard 4 New Hires ✅</div>
                </div>
              </div>
            )}

          </div>

        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          COMPACT 4 ROLE WORKSPACES ECOSYSTEM
      ════════════════════════════════════════════════════════════════ */}
      <section id="ecosystem" className="py-14 px-4 sm:px-6 lg:px-8 relative z-10 border-t border-white/[0.08]">
        <div className="max-w-6xl mx-auto space-y-10">
          
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1 bg-purple-500/10 border border-purple-500/20 px-3 py-0.5 rounded-full text-xs font-bold text-purple-300">
              <Layers size={12} className="text-purple-400" />
              <span>Multi-Role Workspaces</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Specialized Portals for Every Team Member
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {PORTALS.map((portal) => {
              const Icon = portal.icon;
              return (
                <div
                  key={portal.id}
                  className="bg-[#0C111D]/80 backdrop-blur-xl border border-white/[0.08] hover:border-white/20 rounded-2xl p-6 space-y-4 transition-all hover:shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${portal.color}15`, border: `1px solid ${portal.color}30` }}
                    >
                      <Icon size={20} style={{ color: portal.color }} />
                    </div>
                    <span
                      className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full"
                      style={{ backgroundColor: `${portal.color}15`, color: portal.color }}
                    >
                      {portal.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-white">{portal.title}</h3>
                  <p className="text-xs text-slate-300 font-medium leading-relaxed">{portal.desc}</p>

                  <div className="space-y-1.5 pt-1">
                    {portal.bullets.map((b, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-300 font-semibold">
                        <CheckCircle2 size={13} style={{ color: portal.color }} className="shrink-0" />
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          COMPACT 6-FEATURE BENTO GRID
      ════════════════════════════════════════════════════════════════ */}
      <section id="features" className="py-14 px-4 sm:px-6 lg:px-8 relative z-10 border-t border-white/[0.08]">
        <div className="max-w-6xl mx-auto space-y-10">
          
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 px-3 py-0.5 rounded-full text-xs font-bold text-rose-300">
              <Sparkles size={12} className="text-rose-400" />
              <span>Full Capabilities</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Everything Your Company Needs in One Place
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={idx}
                  className="bg-[#0C111D]/80 backdrop-blur-xl border border-white/[0.08] hover:border-white/20 rounded-2xl p-5 space-y-3 transition-all hover:-translate-y-1"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${feat.accent}15`, border: `1px solid ${feat.accent}30` }}
                  >
                    <Icon size={20} style={{ color: feat.accent }} strokeWidth={2.2} />
                  </div>
                  <h3 className="text-base font-black text-white tracking-tight">{feat.title}</h3>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed">{feat.desc}</p>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          COMPACT HOW IT WORKS (4 STEPS)
      ════════════════════════════════════════════════════════════════ */}
      <section id="workflow" className="py-14 px-4 sm:px-6 lg:px-8 relative z-10 border-t border-white/[0.08]">
        <div className="max-w-5xl mx-auto space-y-8">
          
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-3 py-0.5 rounded-full text-xs font-bold text-amber-300">
              <Target size={12} className="text-amber-400" />
              <span>Simple Setup</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Get Up and Running in 4 Easy Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {WORKFLOW.map((wf, idx) => (
              <div
                key={idx}
                className="bg-[#0C111D]/80 border border-white/[0.08] rounded-2xl p-4 space-y-2"
              >
                <div className="text-2xl font-black opacity-35" style={{ color: wf.accent }}>
                  {wf.step}
                </div>
                <h3 className="text-sm font-bold text-white">{wf.title}</h3>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">{wf.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          COMPACT PRICING PLANS
      ════════════════════════════════════════════════════════════════ */}
      <section id="pricing" className="py-14 px-4 sm:px-6 lg:px-8 relative z-10 border-t border-white/[0.08]">
        <div className="max-w-5xl mx-auto space-y-8">
          
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 px-3 py-0.5 rounded-full text-xs font-bold text-rose-300">
              <DollarSign size={12} className="text-rose-400" />
              <span>Predictable Pricing</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Simple Plans That Scale With Your Headcount
            </h2>

            {/* Toggle */}
            <div className="inline-flex items-center gap-2 p-1 bg-[#0C111D] border border-white/10 rounded-full">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  billingCycle === "monthly" ? "bg-white/[0.1] text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  billingCycle === "yearly" ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                <span>Annual</span>
                <span className="bg-white/20 text-[10px] font-black px-1.5 rounded-full">20% OFF</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            
            {/* Free Trial */}
            <div className="bg-[#0C111D]/80 border border-white/[0.08] rounded-2xl p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="text-xs font-extrabold text-cyan-400 uppercase">7-Day Free Trial</div>
                <div className="text-3xl font-black text-white">₹0</div>
                <p className="text-xs text-slate-400 font-medium">All modules enabled for up to 10 employees.</p>
                <div className="space-y-2 pt-3 border-t border-white/[0.06] text-xs font-semibold text-slate-300">
                  <div>✓ 10 Active Employees</div>
                  <div>✓ GPS Geofenced Punching</div>
                  <div>✓ 1-Click Payroll PDF</div>
                  <div>✓ Full Mobile App Access</div>
                </div>
              </div>
              <Link
                to="/register"
                className="w-full py-3 rounded-full text-center text-xs font-bold text-white bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 transition-all cursor-pointer"
              >
                Start Free Trial
              </Link>
            </div>

            {/* Growth Plan */}
            <div className="bg-gradient-to-b from-[#131C2E] to-[#0C111D] border-2 border-rose-500/50 rounded-2xl p-6 flex flex-col justify-between space-y-4 relative shadow-[0_0_30px_rgba(244,63,94,0.2)] md:-translate-y-2">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-rose-500 text-white text-[10px] font-black uppercase px-3 py-0.5 rounded-full">
                Most Popular
              </div>
              <div className="space-y-3 pt-1">
                <div className="text-xs font-extrabold text-orange-400 uppercase">Growth Plan</div>
                <div className="text-3xl font-black text-white">
                  {billingCycle === "yearly" ? "₹1,999" : "₹2,499"}
                  <span className="text-xs font-medium text-slate-400"> / mo</span>
                </div>
                <p className="text-xs text-slate-300 font-medium">For scaling teams needing end-to-end workforce control.</p>
                <div className="space-y-2 pt-3 border-t border-white/[0.08] text-xs font-semibold text-slate-200">
                  <div>✓ Up to 50 Employees</div>
                  <div>✓ Everything in Free Trial</div>
                  <div>✓ WhatsApp CRM &amp; Drips</div>
                  <div>✓ Priority Support</div>
                </div>
              </div>
              <Link
                to="/register"
                className="w-full py-3 rounded-full text-center text-xs font-black text-white bg-gradient-to-r from-[#FF7A00] via-[#E11D48] via-[#9333EA] to-[#00D2C4] hover:opacity-95 shadow-md transition-all cursor-pointer"
              >
                Get Growth Plan →
              </Link>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-[#0C111D]/80 border border-white/[0.08] rounded-2xl p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="text-xs font-extrabold text-purple-400 uppercase">Enterprise Scale</div>
                <div className="text-3xl font-black text-white">Custom</div>
                <p className="text-xs text-slate-400 font-medium">For 100+ employees with custom biometric integrations.</p>
                <div className="space-y-2 pt-3 border-t border-white/[0.06] text-xs font-semibold text-slate-300">
                  <div>✓ Unlimited Employees</div>
                  <div>✓ Custom ERP &amp; Biometric Sync</div>
                  <div>✓ Dedicated Manager &amp; SLA</div>
                </div>
              </div>
              <Link
                to="/register"
                className="w-full py-3 rounded-full text-center text-xs font-bold text-white bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 transition-all cursor-pointer"
              >
                Contact Sales
              </Link>
            </div>

          </div>

        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          COMPACT FAQ ACCORDION
      ════════════════════════════════════════════════════════════════ */}
      <section id="faq" className="py-14 px-4 sm:px-6 lg:px-8 relative z-10 border-t border-white/[0.08]">
        <div className="max-w-3xl mx-auto space-y-8">
          
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="bg-[#0C111D]/90 border border-white/[0.08] rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                    className="w-full p-4 text-left flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <span className="text-sm font-bold text-white">{faq.q}</span>
                    <ChevronDown
                      size={16}
                      className={`text-slate-400 transition-transform ${isOpen ? "rotate-180 text-cyan-400" : ""}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 text-xs text-slate-300 font-medium leading-relaxed animate-fadeIn">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          COMPACT BOTTOM CTA
      ════════════════════════════════════════════════════════════════ */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-orange-600/20 via-rose-600/20 to-cyan-600/20 border border-white/15 rounded-3xl p-8 sm:p-10 text-center space-y-4 backdrop-blur-2xl shadow-xl">
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Ready to Automate Your Business with{" "}
            <span className="bg-gradient-to-r from-[#FF7A00] via-[#E11D48] to-[#00D2C4] bg-clip-text text-transparent">
              One Click
            </span>
            ?
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm max-w-lg mx-auto font-medium">
            Start your 7-day free trial today. 10 employee seats included with instant setup.
          </p>
          <div className="pt-2">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-full text-sm font-black text-white bg-gradient-to-r from-[#FF7A00] via-[#E11D48] via-[#9333EA] to-[#00D2C4] hover:opacity-95 shadow-md hover:scale-105 transition-all cursor-pointer"
            >
              <span>Get Started Free</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          COMPACT FOOTER
      ════════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-white/[0.08] bg-[#05070D] py-10 px-4 sm:px-6 lg:px-8 relative z-10 text-xs text-slate-400">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <OneClickLogo variant="landscape" />
            <span className="text-slate-500">|</span>
            <span>© {new Date().getFullYear()} One Click Business HRMS • Powered by <span className="text-cyan-400 font-bold">icoded</span></span>
          </div>

          <div className="flex items-center gap-5 text-slate-400 font-medium">
            <Link to="/login" className="hover:text-cyan-400">Sign In</Link>
            <Link to="/register" className="hover:text-cyan-400">Register</Link>
            <a href="#features" className="hover:text-cyan-400">Features</a>
            <a href="#pricing" className="hover:text-cyan-400">Pricing</a>
          </div>

        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
