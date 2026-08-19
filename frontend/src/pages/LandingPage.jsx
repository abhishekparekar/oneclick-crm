import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles, ArrowRight, Shield, CheckCircle2, Smartphone, Laptop,
  CheckSquare, Calendar, DollarSign, Layers, ChevronRight, Menu, X,
  TrendingUp, Zap, Check, MapPin, Briefcase, Play, Globe, Lock,
  BarChart3, Target, HeartHandshake, MessageSquare
} from "lucide-react";
import hero1Img from "../assets/hero1.JPG";
import hero2Img from "../assets/hero2.JPG";
import hero3Img from "../assets/hero3.JPG";
import hero4Img from "../assets/hero4.JPG";
import mobileAppImg from "../assets/mobile_app.png";

/* ── ONE CLICK Compact Light Theme Design System ──────────────────────
   Background: #FFFFFF / #F8FAFC
   Primary Text: #0F172A | Secondary: #475569 | Muted: #94A3B8
   Brand Accents: Teal #0D9488 | Amber #D97706 | Pink #E11D48 | Purple #7C3AED
   ──────────────────────────────────────────────────────────────────── */

const NAV_LINKS = [
  { label: "Features", href: "#features", icon: Sparkles },
  { label: "Live Demo", href: "#demo", icon: Play },
  { label: "Ecosystem", href: "#ecosystem", icon: Layers },
  { label: "How it Works", href: "#workflow", icon: Target },
  { label: "Pricing", href: "#pricing", icon: Zap },
  { label: "FAQ", href: "#faq", icon: MessageSquare },
];

const STATS = [
  { value: "99.99%", label: "Uptime SLA", desc: "Enterprise cloud", color: "#0D9488" },
  { value: "10,000+", label: "Active Staff", desc: "Clocking in daily", color: "#D97706" },
  { value: "4.9 / 5★", label: "App Rating", desc: "iOS & Android", color: "#E11D48" },
];

const FEATURES = [
  { icon: MapPin, title: "GPS Geofencing", desc: "Punch in only from verified GPS boundaries. Multi-branch boundary locks.", color: "#0D9488", bg: "#F0FDFA" },
  { icon: CheckSquare, title: "Task Boards", desc: "Kanban boards, priority queues — assign tasks & track progress live.", color: "#D97706", bg: "#FFFBEB" },
  { icon: DollarSign, title: "Smart Payroll", desc: "Configure allowances, PF & tax rules. Auto-generate payslips with one click.", color: "#E11D48", bg: "#FFF1F2" },
  { icon: Calendar, title: "Leave Engine", desc: "Apply, approve & auto-update leave balances (Casual, Sick, LOP).", color: "#7C3AED", bg: "#F5F3FF" },
  { icon: MessageSquare, title: "WhatsApp Drips", desc: "Automate leads pipeline & drip campaign reminders directly on WhatsApp.", color: "#059669", bg: "#ECFDF5" },
  { icon: Lock, title: "Role Security", desc: "Granular permission controls for Admin, HR, Manager, and Staff.", color: "#2563EB", bg: "#EFF6FF" },
  { icon: Globe, title: "Multi-Branch", desc: "Unlimited office branches with custom geofences & shift schedules.", color: "#D97706", bg: "#FFFBEB" },
  { icon: BarChart3, title: "Live Analytics", desc: "Workforce dashboards for attendance trends, payroll & productivity.", color: "#0D9488", bg: "#F0FDFA" },
];

const ECOSYSTEM = [
  {
    icon: Laptop,
    title: "Company Admin Portal",
    desc: "Full administrative control. Setup departments, branch geofences, payroll rules, and manage all staff.",
    badge: "Admin Suite",
    color: "#0D9488",
    bg: "#F0FDFA",
    borderColor: "#CCFBF1",
    details: ["GPS geofence setups", "Payroll slip generation", "Branch & shift controls"],
  },
  {
    icon: HeartHandshake,
    title: "HR Workspace",
    desc: "Streamlined HR operations. Manage staff onboarding, leave approvals, attendance regularizations.",
    badge: "HR Management",
    color: "#7C3AED",
    bg: "#F5F3FF",
    borderColor: "#DDD6FE",
    details: ["Staff onboarding wizard", "Leave & regularization approvals", "Employee document vault"],
  },
  {
    icon: Briefcase,
    title: "Manager Dashboard",
    desc: "Coordinate teams with precision. Deploy task boards, track checklist progress, and audit team attendance.",
    badge: "Team Coordination",
    color: "#D97706",
    bg: "#FFFBEB",
    borderColor: "#FDE68A",
    details: ["Kanban task boards", "Team leave approvals", "Live attendance stream"],
  },
  {
    icon: Smartphone,
    title: "Employee Companion",
    desc: "GPS-verified clock-in, daily task check-offs, leave applications and payslip downloads on mobile.",
    badge: "Mobile App",
    color: "#E11D48",
    bg: "#FFF1F2",
    borderColor: "#FECDD3",
    details: ["GPS location punch check", "Task checklist check-offs", "Monthly payslip PDF"],
  },
];

const WORKFLOW = [
  { step: "01", title: "Sign Up Free", desc: "Register in 30 seconds. Access a full workspace for up to 10 employees.", color: "#0D9488" },
  { step: "02", title: "Setup Rules", desc: "Configure departments, branch GPS coordinates, and shift timings.", color: "#D97706" },
  { step: "03", title: "Onboard Staff", desc: "Invite managers & staff. Credentials sent automatically.", color: "#E11D48" },
  { step: "04", title: "Operate 1-Click", desc: "GPS attendance, tasks & payroll sync seamlessly in real time.", color: "#7C3AED" },
];

const PRICING = [
  {
    name: "7-Day Free Trial",
    priceMonthly: 0, priceYearly: 0,
    period: "for 7 days",
    desc: "Test every module with full access for up to 10 employees.",
    features: ["Up to 10 Employees", "Full Web Portal", "Mobile App Access", "GPS Geofenced Attendance", "Payroll & Payslip PDF", "Standard Support"],
    cta: "Start Free Trial",
    link: "/register",
    popular: false,
    color: "#0D9488",
  },
  {
    name: "Growth Plan",
    priceMonthly: 49, priceYearly: 39,
    period: "per month",
    desc: "For growing organizations needing end-to-end workforce automation.",
    features: ["Up to 50 Employees", "Everything in Free Trial", "WhatsApp Lead Engine", "Advanced Analytics", "Excel/PDF Export", "Priority Support"],
    cta: "Get Growth Plan",
    link: "/register",
    popular: true,
    color: "#D97706",
  },
  {
    name: "Enterprise",
    priceMonthly: 129, priceYearly: 99,
    period: "per month",
    desc: "Unlimited scale with custom feature integrations & SLA support.",
    features: ["Unlimited Employees", "Everything in Growth", "Custom API Access", "Account Manager", "White-Label Branding", "99.99% SLA Guarantee"],
    cta: "Contact Sales",
    link: "/register",
    popular: false,
    color: "#7C3AED",
  },
];

const FAQS = [
  { q: "What is included in the 7-day free trial?", a: "Complete, unrestricted access to Web Portal, HR Workspace, Manager Dashboard, and Mobile App for up to 10 employees." },
  { q: "What happens after the 7 days trial expires?", a: "Your workspace is paused safely in read-only mode so no data is ever lost. Upgrade anytime to resume." },
  { q: "How does GPS attendance geofencing work?", a: "When employees clock in via the app, current GPS coordinates are verified against your branch geofence boundary." },
  { q: "Can we assign different roles like HR or Manager?", a: "Yes! ONE CLICK provides dedicated user interfaces for Company Admin, HR Manager, Department Manager, and Employee." },
  { q: "Is WhatsApp Lead Automation included?", a: "Yes — available in Growth and Enterprise packages to automate lead pipelines & WhatsApp drips." },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoTab, setDemoTab] = useState("overview");
  const [isYearly, setIsYearly] = useState(false);
  const [faqOpen, setFaqOpen] = useState({});

  const demoTabs = [
    { id: "overview", label: "Company Dashboard", img: hero1Img },
    { id: "hr", label: "HR Workspace", img: hero2Img },
    { id: "manager", label: "Manager Portal", img: hero3Img },
    { id: "employee", label: "Employee App", img: hero4Img },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-[Inter,sans-serif] selection:bg-[#0D9488] selection:text-white overflow-x-hidden relative">

      {/* Background ambient light mesh blobs */}
      <div className="absolute top-0 left-1/4 w-[320px] sm:w-[500px] h-[320px] sm:h-[500px] bg-gradient-to-tr from-teal-200/35 via-emerald-100/25 to-transparent rounded-full blur-3xl pointer-events-none -translate-y-1/2 z-0" />
      <div className="absolute top-[35%] right-0 w-[280px] sm:w-[450px] h-[280px] sm:h-[450px] bg-gradient-to-br from-amber-100/40 via-orange-100/20 to-transparent rounded-full blur-3xl pointer-events-none z-0" />

      {/* Background grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:2.5rem_2.5rem] sm:bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0 opacity-40" />

      {/* ══════════════════════════════════════════════════════════════════
          NAVBAR (Fixed header top-0)
      ══════════════════════════════════════════════════════════════════ */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/90 border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="h-7 sm:h-9 flex items-center justify-center overflow-hidden">
              <img
                src="/one_click_landscape.jpeg"
                alt="ONE CLICK"
                className="h-6 sm:h-8 w-auto object-contain rounded-md"
              />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-5 lg:gap-6">
            {NAV_LINKS.map(l => (
              <a
                key={l.href}
                href={l.href}
                className="text-[11px] lg:text-xs font-bold text-slate-600 hover:text-[#0D9488] uppercase tracking-wider transition-colors"
              >
                {l.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTA Buttons */}
          <div className="hidden md:flex items-center gap-2.5">
            <Link
              to="/login"
              className="text-xs font-bold text-slate-700 hover:text-slate-900 px-3.5 py-1.5 border border-slate-300 hover:border-slate-400 rounded-lg transition-all"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-xs font-black uppercase tracking-wider text-white px-4 py-2 rounded-lg transition-all shadow-xs hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg, #0D9488 0%, #059669 100%)" }}
            >
              Start Free Trial
            </Link>
          </div>

          {/* Mobile Menu Trigger */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open Navigation Menu"
            className="md:hidden p-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 md:hidden animate-fadeIn" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="absolute top-0 right-0 bottom-0 w-[85%] max-w-[320px] bg-[#090D16] text-slate-300 p-5 flex flex-col shadow-2xl border-l border-white/10 animate-slideLeft"
            onClick={e => e.stopPropagation()}
          >
            {/* Header with centered blend logo & absolute right close button */}
            <div className="relative flex items-center justify-center pb-4 border-b border-white/10 mb-4 pt-1">
              <div className="flex items-center justify-center">
                <img
                  src="/one_click_landscape.jpeg"
                  alt="ONE CLICK"
                  className="h-8 w-auto object-contain rounded-md"
                  style={{ mixBlendMode: "screen" }}
                />
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close Navigation Menu"
                className="absolute right-0 p-1.5 text-slate-400 hover:text-white rounded-xl bg-white/[0.06] hover:bg-white/12 border border-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Nav links with icons & active styling */}
            <div className="flex flex-col gap-1 text-xs font-bold flex-1 overflow-y-auto">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-2 pt-1 pb-1">Navigation Menu</p>
              {NAV_LINKS.map(l => {
                const Icon = l.icon || ChevronRight;
                return (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/[0.06] text-slate-300 hover:text-teal-400 transition-all group border border-transparent hover:border-white/5"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-md bg-white/[0.06] flex items-center justify-center text-teal-400 group-hover:bg-teal-500/20">
                        <Icon size={13} />
                      </div>
                      <span className="text-xs font-bold">{l.label}</span>
                    </div>
                    <ChevronRight size={13} className="text-slate-600 group-hover:text-teal-400 group-hover:translate-x-0.5 transition-all" />
                  </a>
                );
              })}
            </div>

            {/* Drawer footer quick actions */}
            <div className="space-y-2 pt-4 border-t border-white/10 mt-auto">
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center text-xs font-black uppercase tracking-wider text-white py-3 rounded-xl shadow-md transition-all hover:scale-[1.01]"
                style={{ background: "linear-gradient(135deg, #0D9488 0%, #059669 100%)" }}
              >
                Start Free 7-Day Trial
              </Link>
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center text-xs font-bold text-slate-300 py-2.5 border border-white/10 hover:border-white/20 rounded-xl bg-white/[0.04] hover:text-white transition-colors"
              >
                Sign In to Dashboard
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          HERO SECTION (Compact spacing: pt-18 sm:pt-24 pb-8 sm:pb-12)
      ══════════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 pt-18 sm:pt-24 pb-8 sm:pb-12 px-3.5 sm:px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">

          {/* Left Text Column */}
          <div className="lg:col-span-6 space-y-3.5 text-center lg:text-left">
            <div className="inline-flex items-center gap-1.5 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full shadow-2xs">
              <Sparkles size={11} className="text-[#0D9488] animate-pulse" />
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-[#0D9488]">Modern Enterprise Business Suite</span>
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.18]">
              Manage your<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0D9488] via-[#D97706] to-[#E11D48]">
                Office Workforce
              </span>
              <br />With ONE CLICK.
            </h1>

            <p className="text-slate-600 text-xs sm:text-base max-w-lg mx-auto lg:mx-0 font-medium leading-relaxed">
              GPS geofenced attendance, smart payroll, task boards, leave management, and WhatsApp lead automation — unified in one platform.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-2 pt-1">
              <Link
                to="/register"
                className="w-full sm:w-auto px-5 py-2.5 sm:py-3 text-xs font-black uppercase tracking-wider text-white rounded-lg shadow-sm flex items-center justify-center gap-2 hover:scale-[1.01] transition-transform"
                style={{ background: "linear-gradient(135deg, #0D9488 0%, #059669 100%)" }}
              >
                <span>Start 7-Day Free Trial</span>
                <ArrowRight size={14} />
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto px-5 py-2.5 sm:py-3 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors flex items-center justify-center shadow-2xs"
              >
                Sign In to Dashboard
              </Link>
            </div>

            {/* Trust points */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-4 pt-1 text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <span className="flex items-center gap-1"><Check size={11} className="text-[#0D9488]" />No Credit Card</span>
              <span className="flex items-center gap-1"><Check size={11} className="text-[#0D9488]" />Full Access</span>
              <span className="flex items-center gap-1"><Check size={11} className="text-[#0D9488]" />Cancel Anytime</span>
            </div>
          </div>

          {/* Right Image Column */}
          <div className="lg:col-span-6 relative mt-2 lg:mt-0">
            {/* Ambient Background Blur */}
            <div className="absolute inset-0 bg-gradient-to-tr from-teal-300/30 via-amber-200/20 to-purple-300/25 rounded-2xl blur-xl pointer-events-none" />

            {/* Main Window Card */}
            <div className="relative rounded-xl bg-white p-1.5 sm:p-2.5 shadow-xl border border-slate-200/90 group">
              {/* Browser Window Header */}
              <div className="h-6 sm:h-7 bg-slate-100/90 rounded-t-lg flex items-center justify-between px-2.5 border-b border-slate-200 mb-1">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-rose-400" />
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200 text-[9px] font-semibold text-slate-500 shadow-2xs">
                  <Lock size={9} className="text-[#0D9488]" />
                  <span>app.oneclick.com / dashboard</span>
                </div>
                <div className="w-6" />
              </div>

              {/* Real Project Interface Screenshot */}
              <div className="relative rounded border border-slate-100 overflow-hidden max-h-[220px] sm:max-h-[360px]">
                <img
                  src={hero1Img}
                  alt="ONE CLICK Company Workspace"
                  className="w-full h-full object-cover object-top rounded transform transition-transform duration-500 group-hover:scale-[1.01]"
                />
              </div>
            </div>

            {/* Mobile Feature Highlights Pill Bar */}
            <div className="flex items-center justify-center gap-2 mt-3 sm:hidden">
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-800 shadow-2xs">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <MapPin size={11} className="text-[#0D9488]" />
                <span>GPS Geofenced</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-800 shadow-2xs">
                <DollarSign size={11} className="text-[#D97706]" />
                <span>1-Click Payroll</span>
              </div>
            </div>

            {/* Floating Live Badge 1 (Desktop) */}
            <div className="absolute -top-3 -right-3 hidden sm:flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md border border-slate-200 text-xs font-black text-slate-800">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <MapPin size={13} className="text-[#0D9488]" />
              <span>GPS Geofence Verified</span>
            </div>

            {/* Floating Live Badge 2 (Desktop) */}
            <div className="absolute -bottom-3 -left-3 hidden sm:flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl shadow-lg border border-slate-200 text-xs font-black text-slate-800">
              <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-[#D97706]">
                <DollarSign size={14} />
              </div>
              <div className="text-left">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Payroll Engine</p>
                <p className="text-[11px] font-black text-slate-900">One-Click Payslips</p>
              </div>
            </div>
          </div>

        </div>

        {/* Compact Stats Row */}
        <div className="max-w-7xl mx-auto mt-6 sm:mt-8 grid grid-cols-3 gap-2 sm:gap-4 border-t border-slate-200/80 pt-5 sm:pt-6">
          {STATS.map((s, i) => (
            <div key={i} className="bg-white p-2.5 sm:p-3.5 rounded-lg sm:rounded-xl border border-slate-200/80 shadow-2xs text-center space-y-0.5">
              <div className="text-lg sm:text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[9px] sm:text-[11px] font-bold text-slate-800 uppercase tracking-wider leading-tight">{s.label}</div>
              <div className="text-[8px] sm:text-[10px] text-slate-500 font-medium hidden sm:block">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          FEATURES GRID (Compact spacing: py-8 sm:py-12)
      ══════════════════════════════════════════════════════════════════ */}
      <section id="features" className="relative z-10 py-8 sm:py-12 px-3.5 sm:px-6 bg-white border-t border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto space-y-6">

          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
              <Sparkles size={10} className="text-[#D97706]" />
              <span className="text-[9px] font-black uppercase tracking-widest text-[#D97706]">Capabilities</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">Everything your workforce needs.</h2>
            <p className="text-slate-600 text-xs sm:text-sm max-w-lg mx-auto font-medium">
              A comprehensive workforce & operations ecosystem for modern companies.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="group p-3 sm:p-4 rounded-lg sm:rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-md transition-all duration-200"
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center mb-2" style={{ background: f.bg }}>
                  <f.icon size={16} style={{ color: f.color }} />
                </div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 mb-0.5 leading-tight">{f.title}</h3>
                <p className="text-slate-500 text-[10px] sm:text-[11px] font-medium leading-normal">{f.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          INTERACTIVE LIVE DEMO TABS (Compact spacing: py-8 sm:py-12)
      ══════════════════════════════════════════════════════════════════ */}
      <section id="demo" className="relative z-10 py-8 sm:py-12 px-3.5 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-6">

          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
              <Play size={10} className="text-[#E11D48]" />
              <span className="text-[9px] font-black uppercase tracking-widest text-[#E11D48]">Live Module Preview</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">Experience the interface.</h2>
          </div>

          {/* Compact Scrollable Tab Switcher */}
          <div className="flex items-center justify-start sm:justify-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
            {demoTabs.map(t => (
              <button
                key={t.id}
                onClick={() => setDemoTab(t.id)}
                className={`px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-black uppercase tracking-wider shrink-0 transition-all ${demoTab === t.id
                  ? "bg-[#0D9488] text-white shadow-2xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Preview Frame */}
          <div className="relative rounded-lg sm:rounded-xl bg-white p-1.5 sm:p-2 shadow-lg border border-slate-200/90 overflow-hidden">
            <div className="h-6 bg-slate-100 rounded-t flex items-center gap-1 px-2 border-b border-slate-200 mb-1">
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[9px] font-bold text-slate-400 ml-1 truncate">ONE CLICK — {demoTab.toUpperCase()} MODULE</span>
            </div>
            <div className="max-h-[220px] sm:max-h-[380px] overflow-hidden rounded-b">
              <img
                src={demoTabs.find(t => t.id === demoTab)?.img}
                alt={`${demoTab} preview`}
                className="w-full object-cover object-top"
              />
            </div>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          THE ECOSYSTEM (Compact spacing: py-8 sm:py-12)
      ══════════════════════════════════════════════════════════════════ */}
      <section id="ecosystem" className="relative z-10 py-8 sm:py-12 px-3.5 sm:px-6 bg-white border-t border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto space-y-6">

          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center gap-1 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
              <Layers size={10} className="text-[#7C3AED]" />
              <span className="text-[9px] font-black uppercase tracking-widest text-[#7C3AED]">Workspaces</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">Tailored for every role.</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {ECOSYSTEM.map((e, i) => (
              <div
                key={i}
                className="p-4 sm:p-5 rounded-lg sm:rounded-xl bg-white border shadow-2xs transition-all"
                style={{ borderColor: e.borderColor, background: `linear-gradient(135deg, ${e.bg}, #FFFFFF)` }}
              >
                <div className="flex items-start gap-3 mb-2.5">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 shadow-2xs" style={{ background: e.bg, color: e.color }}>
                    <e.icon size={18} />
                  </div>
                  <div>
                    <span className="inline-block text-[8px] sm:text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mb-0.5" style={{ background: `${e.color}15`, color: e.color }}>
                      {e.badge}
                    </span>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">{e.title}</h3>
                  </div>
                </div>
                <p className="text-slate-600 text-[11px] sm:text-xs leading-relaxed mb-3 font-medium">{e.desc}</p>
                <ul className="grid grid-cols-1 gap-1.5">
                  {e.details.map((d, di) => (
                    <li key={di} className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-slate-700">
                      <CheckCircle2 size={12} style={{ color: e.color }} className="shrink-0" />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Mobile App Highlight Banner */}
          <div className="rounded-xl sm:rounded-2xl bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 text-white p-5 sm:p-7 shadow-lg flex flex-col lg:flex-row items-center gap-5">
            <div className="flex-1 space-y-2 text-center lg:text-left">
              <div className="inline-flex items-center gap-1 bg-white/10 border border-white/20 px-2.5 py-0.5 rounded-full">
                <Smartphone size={10} className="text-white" />
                <span className="text-[9px] font-black uppercase tracking-widest text-white">Mobile Companion</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">Workforce companion app.</h3>
              <p className="text-teal-100 text-xs leading-relaxed max-w-md mx-auto lg:mx-0">
                GPS clock-in, daily task check-offs, leave applications & PDF payslip downloads right on mobile.
              </p>
              <div className="grid grid-cols-2 gap-1.5 max-w-xs mx-auto lg:mx-0 pt-1">
                {["GPS Punch Lock", "Task Checklists", "Instant Leave", "Payslip PDFs"].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-white">
                    <Check size={12} className="text-teal-300 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="shrink-0 w-full max-w-[160px] sm:max-w-[200px]">
              <img src={mobileAppImg} alt="ONE CLICK Mobile App" className="w-full rounded-lg shadow border border-white/20" />
            </div>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          HOW IT WORKS (Compact spacing: py-8 sm:py-12)
      ══════════════════════════════════════════════════════════════════ */}
      <section id="workflow" className="relative z-10 py-8 sm:py-12 px-3.5 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-6">

          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center gap-1 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full">
              <Target size={10} className="text-[#0D9488]" />
              <span className="text-[9px] font-black uppercase tracking-widest text-[#0D9488]">Quick Setup</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">Up & running in 4 steps.</h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {WORKFLOW.map((w, i) => (
              <div key={i} className="p-3.5 sm:p-4 rounded-lg sm:rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-1.5">
                <div className="text-2xl sm:text-3xl font-black" style={{ color: w.color }}>{w.step}</div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-tight">{w.title}</h3>
                <p className="text-slate-500 text-[10px] sm:text-[11px] font-medium leading-normal">{w.desc}</p>
                <div className="w-6 h-0.5 rounded-full mt-1" style={{ background: w.color }} />
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          PRICING (Compact spacing: py-8 sm:py-12)
      ══════════════════════════════════════════════════════════════════ */}
      <section id="pricing" className="relative z-10 py-8 sm:py-12 px-3.5 sm:px-6 bg-white border-t border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto space-y-6">

          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
              <Zap size={10} className="text-[#D97706]" />
              <span className="text-[9px] font-black uppercase tracking-widest text-[#D97706]">Simple Pricing</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">Plans for every team size.</h2>
          </div>

          {/* Billing Switcher */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setIsYearly(false)}
                className={`px-3 py-1 rounded text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all ${!isYearly ? "bg-white text-[#0D9488] shadow-2xs" : "text-slate-500 hover:text-slate-800"
                  }`}
              >Monthly</button>
              <button
                onClick={() => setIsYearly(true)}
                className={`flex items-center gap-1 px-3 py-1 rounded text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all ${isYearly ? "bg-white text-[#0D9488] shadow-2xs" : "text-slate-500 hover:text-slate-800"
                  }`}
              >
                Yearly
                <span className="text-[8px] font-black px-1 py-0.2 rounded bg-teal-100 text-[#0D9488]">-20%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PRICING.map((p, i) => (
              <div
                key={i}
                className={`p-4 sm:p-5 rounded-xl bg-white border flex flex-col justify-between relative transition-all ${p.popular ? "border-amber-400 shadow-md ring-2 ring-amber-400/20" : "border-slate-200/80 shadow-2xs"
                  }`}
              >
                {p.popular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#D97706] text-white text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-2xs">
                    Most Popular
                  </span>
                )}

                <div className="space-y-1.5 mb-3">
                  <h3 className="text-base sm:text-lg font-black text-slate-900">{p.name}</h3>
                  <p className="text-slate-500 text-[10px] sm:text-[11px] font-medium">{p.desc}</p>
                  <div className="flex items-baseline gap-1 pt-1">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900">${isYearly ? p.priceYearly : p.priceMonthly}</span>
                    <span className="text-slate-500 text-[10px] font-semibold">{isYearly ? "/mo, billed yearly" : "/month"}</span>
                  </div>
                </div>

                <ul className="space-y-1.5 flex-1 mb-4 border-t border-slate-100 pt-3">
                  {p.features.map((f, idx) => (
                    <li key={idx} className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-slate-700">
                      <CheckCircle2 size={12} style={{ color: p.color }} className="shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to={p.link}
                  className={`block text-center text-xs font-black uppercase tracking-wider py-2.5 rounded-lg transition-all ${p.popular
                    ? "bg-[#D97706] hover:bg-amber-600 text-white shadow-2xs"
                    : "bg-slate-900 hover:bg-slate-800 text-white"
                    }`}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          CTA BANNER (Compact spacing: py-8 sm:py-10)
      ══════════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 py-8 sm:py-10 px-3.5 sm:px-6">
        <div className="max-w-4xl mx-auto rounded-xl sm:rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 sm:p-8 text-center space-y-3 shadow-lg relative overflow-hidden">
          <div className="relative space-y-2">
            <div className="inline-flex items-center gap-1 bg-white/10 border border-white/20 px-2.5 py-0.5 rounded-full">
              <TrendingUp size={10} className="text-teal-400" />
              <span className="text-[9px] font-black uppercase tracking-widest text-teal-300">Ready to Get Started?</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight">
              Transform your workforce management.
            </h2>
            <p className="text-slate-300 text-xs max-w-md mx-auto leading-relaxed font-medium">
              Join thousands running smarter with ONE CLICK. No credit card required.
            </p>

            <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
              <Link
                to="/register"
                className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white rounded-lg shadow flex items-center justify-center gap-2 hover:scale-[1.01] transition-transform"
                style={{ background: "linear-gradient(135deg, #0D9488 0%, #059669 100%)" }}
              >
                <span>Start Free 7-Day Trial</span>
                <ArrowRight size={14} />
              </Link>
              <Link
                to="/login"
                className="px-5 py-2.5 text-xs font-bold text-slate-200 border border-white/20 hover:bg-white/10 rounded-lg transition-colors flex items-center justify-center"
              >
                Sign In to Portal
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          FAQ (Compact spacing: py-8 sm:py-12)
      ══════════════════════════════════════════════════════════════════ */}
      <section id="faq" className="relative z-10 py-8 sm:py-12 px-3.5 sm:px-6 bg-white border-t border-slate-200/80">
        <div className="max-w-3xl mx-auto space-y-6">

          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-1 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
              <span className="text-[9px] font-black uppercase tracking-widest text-[#7C3AED]">Got Questions?</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">Frequently asked questions.</h2>
          </div>

          <div className="space-y-2">
            {FAQS.map((f, i) => (
              <div key={i} className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-2xs">
                <button
                  onClick={() => setFaqOpen(prev => ({ ...prev, [i]: !prev[i] }))}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                >
                  <span className="text-xs sm:text-sm font-bold text-slate-900">{f.q}</span>
                  <ChevronRight size={14} className={`text-slate-400 transition-transform ${faqOpen[i] ? "rotate-90 text-[#0D9488]" : ""}`} />
                </button>
                {faqOpen[i] && (
                  <div className="px-4 pb-3 text-slate-600 text-xs font-medium leading-relaxed border-t border-slate-100 pt-2">
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          FOOTER (Obsidian Enterprise Dark Theme - 100% Responsive)
      ══════════════════════════════════════════════════════════════════ */}
      <footer className="relative z-10 border-t border-white/[0.08] bg-[#090D16] text-slate-400 pt-8 sm:pt-12 pb-6 sm:pb-8 px-3.5 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">

          {/* Main Responsive Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-6 sm:gap-8 pb-6 sm:pb-8 border-b border-white/[0.08]">

            {/* Column 1: Brand & Summary (Full width on mobile, 4 cols on desktop) */}
            <div className="lg:col-span-4 space-y-3 text-left">
              <div className="flex items-center gap-2">
                <img
                  src="/one_click_landscape.jpeg"
                  alt="ONE CLICK"
                  className="h-7 sm:h-8 w-auto object-contain rounded-md"
                  style={{ mixBlendMode: "screen" }}
                />
              </div>
              <p className="text-slate-400 text-xs sm:text-sm font-medium leading-relaxed max-w-sm">
                ONE CLICK unified workforce platform — powering GPS geofenced attendance, automated payroll, task boards, and WhatsApp lead automation.
              </p>

            </div>

            {/* Columns 2 & 3 Wrapped in a 2-Column Mobile Grid */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-6 grid grid-cols-2 gap-4 sm:gap-6">

              {/* Column 2: Workspaces */}
              <div className="space-y-2.5">
                <h4 className="text-[11px] sm:text-xs font-black text-slate-200 uppercase tracking-widest">Workspaces</h4>
                <ul className="space-y-1.5 text-xs font-semibold text-slate-400">
                  <li><Link to="/login" className="hover:text-teal-400 transition-colors inline-block py-0.5">Admin Portal</Link></li>
                  <li><Link to="/login" className="hover:text-teal-400 transition-colors inline-block py-0.5">HR Workspace</Link></li>
                  <li><Link to="/login" className="hover:text-teal-400 transition-colors inline-block py-0.5">Manager Portal</Link></li>
                  <li><Link to="/login" className="hover:text-teal-400 transition-colors inline-block py-0.5">Employee App</Link></li>
                </ul>
              </div>

              {/* Column 3: Capabilities */}
              <div className="space-y-2.5">
                <h4 className="text-[11px] sm:text-xs font-black text-slate-200 uppercase tracking-widest">Capabilities</h4>
                <ul className="space-y-1.5 text-xs font-semibold text-slate-400">
                  <li><a href="#features" className="hover:text-amber-400 transition-colors inline-block py-0.5">GPS Geofence</a></li>
                  <li><a href="#features" className="hover:text-amber-400 transition-colors inline-block py-0.5">Smart Payroll</a></li>
                  <li><a href="#features" className="hover:text-amber-400 transition-colors inline-block py-0.5">Task Boards</a></li>
                  <li><a href="#features" className="hover:text-amber-400 transition-colors inline-block py-0.5">WhatsApp Drips</a></li>
                </ul>
              </div>

            </div>

            {/* Column 4: Quick Actions (Full width 2-btn grid on mobile, 2 cols on desktop) */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-2 space-y-2.5">
              <h4 className="text-[11px] sm:text-xs font-black text-slate-200 uppercase tracking-widest">Quick Actions</h4>
              <div className="grid grid-cols-2 sm:grid-cols-1 gap-2">
                <Link
                  to="/register"
                  className="block text-center text-xs font-black uppercase tracking-wider text-white py-2.5 px-3 rounded-xl shadow-md transition-all hover:scale-[1.02]"
                  style={{ background: "linear-gradient(135deg, #0D9488 0%, #059669 100%)" }}
                >
                  FREE TRIAL
                </Link>
                <Link
                  to="/login"
                  className="block text-center text-xs font-bold text-slate-300 py-2.5 px-3 border border-white/10 hover:border-white/20 hover:text-white rounded-xl transition-colors bg-white/[0.04]"
                >
                  Sign In
                </Link>
              </div>
            </div>

          </div>

          {/* Bottom Bar: Copyright & Responsive Navigation Links */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-medium text-slate-500 text-center md:text-left">
            <div>
              © {new Date().getFullYear()} <span className="font-bold text-slate-300">ONE CLICK Business Suite</span>. All rights reserved.
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3.5 sm:gap-6 text-slate-400 text-xs font-semibold">
              <a href="#features" className="hover:text-teal-400 transition-colors">Features</a>
              <a href="#demo" className="hover:text-teal-400 transition-colors">Live Preview</a>
              <a href="#pricing" className="hover:text-teal-400 transition-colors">Pricing</a>
              <a href="#faq" className="hover:text-teal-400 transition-colors">FAQ</a>
              <Link to="/login" className="hover:text-teal-400 font-bold text-white transition-colors">Sign In</Link>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
}
