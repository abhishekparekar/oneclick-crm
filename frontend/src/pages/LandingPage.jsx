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
  const [billingCycle, setBillingCycle] = useState("yearly");
  const [openFaq, setOpenFaq] = useState(0);

  // Interactive Live Playground State
  const [simRadius, setSimRadius] = useState(150);
  const [simBasePay, setSimBasePay] = useState(50000);
  const [simAllowances, setSimAllowances] = useState(15000);
  const [simDeductions, setSimDeductions] = useState(4000);

  const calculatedNetPay = simBasePay + simAllowances - simDeductions;

  const STATS = [
    { value: "99.99%", label: "Cloud Uptime SLA", icon: Shield, color: "#3B82F6" },
    { value: "10,000+", label: "Daily GPS Punches", icon: MapPin, color: "#0284C7" },
    { value: "1-Click", label: "Automated Payroll", icon: DollarSign, color: "#10B981" },
    { value: "4.9 / 5★", label: "Enterprise Rating", icon: Star, color: "#6366F1" },
  ];

  const PORTALS = [
    {
      id: "admin",
      title: "Company Admin",
      badge: "Executive HQ",
      icon: Laptop,
      color: "#2563EB",
      desc: "Full company command. Multi-branch GPS geofences, automated payroll rules, tax formulas, and department oversight.",
      bullets: ["GPS Geofence Perimeter Builder", "1-Click Monthly Salary Slips", "Branch & Multi-Shift Rosters"],
    },
    {
      id: "hr",
      title: "HR Operations",
      badge: "People Hub",
      icon: HeartHandshake,
      color: "#0284C7",
      desc: "Streamlined employee lifecycle. Digital onboarding, document vault, attendance regularization, and leave ledger.",
      bullets: ["Self-Serve Onboarding Wizard", "Leave & Regularization Queues", "Employee Document Locker"],
    },
    {
      id: "manager",
      title: "Team Manager",
      badge: "Operations",
      icon: Briefcase,
      color: "#4F46E5",
      desc: "High-velocity team coordination. Kanban boards, subtask distribution, live attendance radar, and shift approvals.",
      bullets: ["Live Attendance Radar Stream", "Kanban Project & Task Boards", "Team Leave & Overtime Approvals"],
    },
    {
      id: "employee",
      title: "Staff Mobile App",
      badge: "Mobile iOS & Android",
      icon: Smartphone,
      color: "#10B981",
      desc: "Instant mobility for on-field & office staff. 1-tap selfie GPS clock-in, daily task check-offs, and payslip PDF downloads.",
      bullets: ["Anti-Spoofing GPS Validation", "Daily Task Checklist Check-offs", "Instant Monthly Payslip PDF"],
    },
  ];

  const FEATURES = [
    {
      icon: MapPin,
      title: "GPS Geofencing & Anti-Spoofing",
      desc: "Prevent proxy attendance. Validates mobile high-precision coordinates within authorized branch boundaries.",
      accent: "#2563EB",
    },
    {
      icon: DollarSign,
      title: "1-Click Automated Payroll",
      desc: "Auto-computes allowances, PF/ESI, overtime, and unpaid days into compliant salary slip PDFs instantly.",
      accent: "#10B981",
    },
    {
      icon: CheckSquare,
      title: "Dynamic Kanban Task Boards",
      desc: "Assign projects, set priorities, and track checklist milestones with live real-time progress indicators.",
      accent: "#0284C7",
    },
    {
      icon: Calendar,
      title: "Smart Leave & Shift Engine",
      desc: "Multi-tier approval workflows for Casual, Sick, Paid, and LOP leaves with auto-adjusting ledger balances.",
      accent: "#6366F1",
    },
    {
      icon: MessageSquare,
      title: "WhatsApp CRM & Drip Engine",
      desc: "Broadcast announcements, automate customer lead pipelines, and send payslip alerts directly on WhatsApp.",
      accent: "#059669",
    },
    {
      icon: Lock,
      title: "Enterprise Role Security Matrix",
      desc: "Strict permission separation between SuperAdmin, Company Admin, HR, Manager, and Staff with audit logs.",
      accent: "#3B82F6",
    },
  ];

  const WORKFLOW = [
    { step: "01", title: "Sign Up Free", desc: "30-second setup. 7-day full access trial with 10 team seats.", accent: "#2563EB" },
    { step: "02", title: "Set Geofence & Shifts", desc: "Pinpoint office GPS location & radius on interactive map.", accent: "#0284C7" },
    { step: "03", title: "Invite Team Members", desc: "Auto-generate credentials and mobile app links for staff.", accent: "#4F46E5" },
    { step: "04", title: "1-Click Automation", desc: "Real-time sync of attendance, tasks, leaves, and salary slips.", accent: "#10B981" },
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
      a: "Yes, employees and managers can use our high-performance mobile companion app for lightning-fast clock-in, task management, and leave requests.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0A0F1D] text-slate-100 font-sans relative selection:bg-blue-600 selection:text-white overflow-x-hidden">
      
      {/* ── Ambient Background Lighting ── */}
      <div className="fixed -top-36 -left-36 w-[550px] h-[550px] bg-gradient-to-br from-blue-600/20 via-indigo-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-1/3 -right-36 w-[500px] h-[500px] bg-gradient-to-bl from-sky-500/15 via-blue-700/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 left-1/4 w-[600px] h-[600px] bg-gradient-to-tr from-blue-900/15 via-slate-800/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1E293B12_1px,transparent_1px),linear-gradient(to_bottom,#1E293B12_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0" />

      {/* ── 1. STICKY NAVBAR ──────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#0A0F1D]/85 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          <div className="flex items-center gap-3">
            <OneClickLogo variant="landscape" />
          </div>

          <div className="hidden md:flex items-center gap-8 text-xs font-bold text-slate-300">
            <a href="#features" className="hover:text-blue-400 transition-colors">Features</a>
            <a href="#portals" className="hover:text-blue-400 transition-colors">Workspaces</a>
            <a href="#interactive" className="hover:text-blue-400 transition-colors">Playground</a>
            <a href="#pricing" className="hover:text-blue-400 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-blue-400 transition-colors">FAQ</a>
            <Link to="/features" className="hover:text-blue-400 transition-colors">Documentation</Link>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-xs font-extrabold text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold shadow-lg shadow-blue-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Start Free Trial</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0F172A] border-b border-slate-800 px-6 py-4 space-y-3 text-sm font-bold animate-fadeIn">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block text-slate-300 py-1">Features</a>
            <a href="#portals" onClick={() => setMobileMenuOpen(false)} className="block text-slate-300 py-1">Workspaces</a>
            <a href="#interactive" onClick={() => setMobileMenuOpen(false)} className="block text-slate-300 py-1">Playground</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block text-slate-300 py-1">Pricing</a>
            <Link to="/features" onClick={() => setMobileMenuOpen(false)} className="block text-slate-300 py-1">Documentation</Link>
            <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
              <Link to="/login" className="w-full text-center py-2 text-slate-300 font-bold border border-slate-700 rounded-xl">Sign In</Link>
              <Link to="/register" className="w-full text-center py-2 bg-blue-600 text-white font-bold rounded-xl shadow-md shadow-blue-600/20">Start Free Trial</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── 2. HERO SECTION ───────────────────────────────────────────────── */}
      <section className="relative pt-16 pb-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto text-center z-10 space-y-6">
        
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 text-xs font-black uppercase tracking-wider shadow-sm">
          <Sparkles size={14} className="text-blue-400 animate-pulse" />
          <span>Next-Gen Enterprise Workforce &amp; CRM Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.1]">
          Automate HRMS, Payroll &amp; Leads <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300">
            In One Powerful Click
          </span>
        </h1>

        <p className="text-slate-300 text-sm sm:text-lg max-w-2xl mx-auto font-medium leading-relaxed">
          The all-in-one operating system for modern enterprises. GPS geofenced attendance, 1-click salary slips, dynamic task pipelines, and automated lead follow-ups.
        </p>

        {/* Hero CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
          <Link
            to="/register"
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Start Free 7-Day Trial</span>
            <ArrowRight size={16} strokeWidth={2.5} />
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-[#0F172A] hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Laptop size={16} className="text-blue-400" />
            <span>Sign In to Workspace</span>
          </Link>
        </div>

        {/* Hero Guarantee Badges */}
        <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs font-bold text-slate-400">
          <span className="flex items-center gap-1.5"><CheckCircle2 size={15} className="text-blue-400" /> No credit card required</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 size={15} className="text-blue-400" /> 10 free employee seats</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 size={15} className="text-blue-400" /> Setup in 30 seconds</span>
        </div>

        {/* ── Metric Stat Tiles ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 pt-10 text-left">
          {STATS.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-[#0F172A]/80 border border-slate-800 hover:border-blue-500/40 transition-all shadow-lg shadow-black/20 group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <Icon size={16} strokeWidth={2.5} />
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</span>
                </div>
                <h3 className="text-2xl font-black text-white group-hover:text-blue-400 transition-colors">{s.value}</h3>
              </div>
            );
          })}
        </div>

      </section>

      {/* ── 3. ROLE WORKSPACES (PORTALS) ──────────────────────────────────── */}
      <section id="portals" className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto z-10 relative">
        <div className="text-center space-y-2 mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-black uppercase tracking-wider">
            <span>Specialized Architecture</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Tailored Portals for Every Team Member
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm max-w-xl mx-auto font-medium">
            Dedicated user interfaces built specifically for executive management, HR admins, team leaders, and on-field employees.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {PORTALS.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.id}
                className="p-6 rounded-3xl bg-[#0F172A]/90 border border-slate-800 hover:border-blue-500/50 transition-all shadow-xl space-y-4 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                      <Icon size={22} strokeWidth={2.2} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">{p.title}</h3>
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">{p.badge}</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  {p.desc}
                </p>

                <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                  {p.bullets.map((b, bIdx) => (
                    <div key={bIdx} className="flex items-center gap-2 text-xs font-bold text-slate-300">
                      <Check size={14} className="text-blue-400 shrink-0" strokeWidth={3} />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 4. FEATURE GRID ───────────────────────────────────────────────── */}
      <section id="features" className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto z-10 relative">
        <div className="text-center space-y-2 mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-black uppercase tracking-wider">
            <span>Core Capabilities</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Engineered for Total Operational Control
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm max-w-xl mx-auto font-medium">
            Everything your company needs to eliminate paperwork, stop buddy punching, and automate payroll compliance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, idx) => {
            const Icon = f.icon;
            return (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-[#0F172A]/80 border border-slate-800 hover:border-blue-500/40 transition-all shadow-lg space-y-2.5 group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-600/15 border border-blue-500/25 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                  <Icon size={18} strokeWidth={2.2} />
                </div>
                <h3 className="text-sm font-black text-white group-hover:text-blue-400 transition-colors">{f.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 5. INTERACTIVE LIVE PLAYGROUND ────────────────────────────────── */}
      <section id="interactive" className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto z-10 relative">
        <div className="bg-gradient-to-b from-[#0F172A] to-[#0A0F1D] border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8">
          
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[10.5px] font-black uppercase tracking-wider">
              <span>Interactive Simulator</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">Experience the Live Calculations</h2>
            <p className="text-xs text-slate-400 max-w-lg mx-auto">
              Test how One Click computes GPS boundary radii and net payroll deductions in real time.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Simulator 1: GPS Geofence */}
            <div className="p-5 rounded-2xl bg-[#0B101D] border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="text-xs font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                  <MapPin size={14} /> GPS Geofence Radius
                </span>
                <span className="font-mono font-black text-white text-xs">{simRadius} meters</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 flex justify-between">
                  <span>Authorized Clock-In Radius</span>
                  <span>{simRadius}m</span>
                </label>
                <input
                  type="range"
                  min="50"
                  max="500"
                  step="10"
                  value={simRadius}
                  onChange={(e) => setSimRadius(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Visual Radar Mockup */}
              <div className="h-40 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center relative overflow-hidden">
                <div
                  className="rounded-full bg-blue-600/20 border-2 border-blue-500/50 transition-all duration-300 flex items-center justify-center"
                  style={{ width: `${Math.min(simRadius * 0.5, 140)}px`, height: `${Math.min(simRadius * 0.5, 140)}px` }}
                >
                  <Building2 size={20} className="text-blue-400" />
                </div>
                <span className="absolute bottom-2 text-[10px] font-mono text-slate-400 font-bold">Office Coordinates Locked</span>
              </div>
            </div>

            {/* Simulator 2: 1-Click Payroll Net Salary */}
            <div className="p-5 rounded-2xl bg-[#0B101D] border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <DollarSign size={14} /> 1-Click Net Salary Engine
                </span>
                <span className="font-mono font-black text-emerald-400 text-sm">₹{calculatedNetPay.toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Base Pay</label>
                  <input
                    type="number"
                    value={simBasePay}
                    onChange={(e) => setSimBasePay(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Allowances</label>
                  <input
                    type="number"
                    value={simAllowances}
                    onChange={(e) => setSimAllowances(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Deductions</label>
                  <input
                    type="number"
                    value={simDeductions}
                    onChange={(e) => setSimDeductions(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-300 block">Computed Take-Home</span>
                  <p className="text-lg font-black text-white font-mono">₹{calculatedNetPay.toLocaleString()}</p>
                </div>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black shadow-xs cursor-pointer"
                >
                  Generate PDF
                </Link>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── 6. 4-STEP ONBOARDING WORKFLOW ─────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto z-10 relative">
        <div className="text-center space-y-2 mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-black uppercase tracking-wider">
            <span>Rapid Setup</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Up and Running in 4 Quick Steps
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {WORKFLOW.map((w, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-[#0F172A]/80 border border-slate-800 space-y-2 relative shadow-lg"
            >
              <span className="font-mono text-3xl font-black text-blue-500/30 block">{w.step}</span>
              <h3 className="text-sm font-black text-white">{w.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">{w.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 7. FREQUENTLY ASKED QUESTIONS ─────────────────────────────────── */}
      <section id="faq" className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto z-10 relative">
        <div className="text-center space-y-2 mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-black uppercase tracking-wider">
            <span>Got Questions?</span>
          </div>
          <h2 className="text-3xl font-black text-white">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                className="p-4 rounded-2xl bg-[#0F172A]/90 border border-slate-800 cursor-pointer transition-all shadow-md"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-white">{faq.q}</h3>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform ${isOpen ? "rotate-180 text-blue-400" : ""}`}
                  />
                </div>
                {isOpen && (
                  <p className="text-xs text-slate-300 mt-2.5 pt-2.5 border-t border-slate-800/80 leading-relaxed font-medium animate-fadeIn">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 8. BOTTOM HERO CTA BANNER ─────────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto z-10 relative">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 border border-blue-400/30 text-center space-y-5 shadow-2xl shadow-blue-600/30 relative overflow-hidden">
          
          <div className="max-w-2xl mx-auto space-y-2">
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Ready to Upgrade Your Company Operations?
            </h2>
            <p className="text-blue-100 text-xs sm:text-sm font-medium">
              Join leading enterprises managing attendance, payroll and leads seamlessly in One Click.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to="/register"
              className="px-8 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-blue-900 font-black text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer"
            >
              Start Free Trial Now
            </Link>
            <Link
              to="/login"
              className="px-7 py-3.5 rounded-xl bg-blue-900/60 hover:bg-blue-900 text-white border border-white/20 font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              Sign In to Portal
            </Link>
          </div>

        </div>
      </section>

      {/* ── 9. FOOTER ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800/80 py-8 px-4 sm:px-6 lg:px-8 text-center text-xs font-semibold text-slate-500 z-10 relative">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <OneClickLogo variant="landscape" />
          <p>© 2026 One Click Business HRMS Platform. Powered by <span className="text-blue-400 font-bold">icoded</span></p>
          <div className="flex items-center gap-4 text-slate-400 text-xs font-bold">
            <Link to="/features" className="hover:text-white">Features</Link>
            <Link to="/login" className="hover:text-white">Login</Link>
            <Link to="/register" className="hover:text-white">Register</Link>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
