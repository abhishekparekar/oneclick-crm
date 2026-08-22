import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Clock, CheckSquare, Calendar, DollarSign, Shield,
  MapPin, Check, ChevronRight, Zap, Target, Award, Sparkles, Building2,
  CheckCircle2, Users, Smartphone, Laptop, Briefcase, Eye, ChevronDown
} from "lucide-react";
import logoImg from "../assets/icoded_logo.jpg";
import attendanceImg from "../assets/attendance.png";
import tasksImg from "../assets/tasks.png";
import payrollImg from "../assets/payroll.png";
import mobileAppImg from "../assets/mobile_app.png";

export default function FeaturesPage() {
  // Simulators state
  const [geoRadius, setGeoRadius] = useState(150);
  const [basePay, setBasePay] = useState(60000);
  const [allowance, setAllowance] = useState(15000);
  const [deductions, setDeductions] = useState(5000);
  const [companies, setCompanies] = useState([
    { id: 1, name: "Vortex Labs Ltd", employees: 8, status: "Pending" },
    { id: 2, name: "Apex Retail Group", employees: 6, status: "Pending" }
  ]);

  const calculatedNetPay = basePay + allowance - deductions;

  const handleApprove = (id) => {
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, status: "Approved" } : c));
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans relative selection:bg-blue-600 selection:text-white overflow-x-hidden">

      {/* Grid Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#F1F5F9_1px,transparent_1px),linear-gradient(to_bottom,#F1F5F9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0" />

      {/* Floating Glow Spheres */}
      <div className="absolute top-[10%] left-[-10%] w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-[40%] right-[-10%] w-[500px] h-[500px] bg-sky-100/40 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[10%] left-[20%] w-[450px] h-[450px] bg-indigo-100/40 rounded-full blur-[120px] pointer-events-none" />

      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/90 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white rounded-xl p-1.5 shadow flex items-center justify-center overflow-hidden border border-slate-200">
              <img src={logoImg} alt="One Click " className="w-full h-full object-contain" />
            </div>
            <div className="text-left">
              <span className="text-slate-900 font-black text-lg tracking-tight leading-none">One Click </span>
              <span className="block text-[7px] font-black text-blue-600 uppercase tracking-widest mt-0.5">SaaS Platform Details</span>
            </div>
          </Link>
          <Link to="/" className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl transition-all hover:bg-slate-50">
            <ArrowLeft size={14} />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      {/* ── Hero section ── */}
      <section className="pt-20 pb-16 px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 px-3.5 py-1.5 rounded-full shadow-2xs">
            <Sparkles size={12} className="text-blue-600 animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-widest text-blue-700">Workspace Roles &amp; Architecture</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight">
            Role-Based Workspaces,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700">
              Built to Scale Together
            </span>
          </h1>
          <p className="text-slate-600 text-sm md:text-base font-medium leading-relaxed max-w-2xl mx-auto">
            Our system partitions actions into specialized portals. Scroll down to inspect the detailed tools available to Admins, Managers, Employees, and SuperAdmins.
          </p>

          {/* Quick jump navigation links */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-6">
            {[
              { target: "#admin-portal", label: "Admins & HR", icon: Laptop },
              { target: "#manager-portal", label: "Managers", icon: Briefcase },
              { target: "#employee-app", label: "Employees Mobile", icon: Smartphone },
              { target: "#superadmin-portal", label: "Super Admin", icon: Shield }
            ].map((lnk, idx) => (
              <a
                key={idx}
                href={lnk.target}
                className="px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all text-slate-700 hover:text-blue-600 shadow-xs cursor-pointer"
              >
                <lnk.icon size={12} className="text-blue-600" />
                <span>{lnk.label}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 1: Admins & HR Portal ── */}
      <section id="admin-portal" className="py-20 border-t border-slate-200/80 px-6 relative z-10 bg-slate-50/50">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">

          {/* Info Details Left (6 Columns) */}
          <div className="lg:col-span-6 space-y-3 text-left">
            <span className="text-[9px] font-black uppercase text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded shadow-2xs">
              Role 01: Setup &amp; Compliance
            </span>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Admins &amp; HR Workspaces</h2>
            <p className="text-slate-600 text-xs font-medium leading-relaxed">
              HR admins require absolute control over policies, branch structures, shifts, and salary calculations. The Admin Portal brings structural configuration and automated cycles into a centralized dashboard.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { t: "GPS geofence setups", d: "Add branch coordinates and define boundary radius limits." },
                { t: "Compliance payroll engine", d: "Setup basic pays, allowances, deductions, and execute slips." },
                { t: "Shift schedules settings", d: "Onboard morning, afternoon, night timings and assign staff." },
                { t: "Audit Logs Logger", d: "Inspect write/edit timestamps across the company database." }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-2.5 p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
                  <div className="mt-1">
                    <CheckCircle2 size={15} className="text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">{item.t}</h4>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-normal">{item.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feature Showcase Right (6 Columns) */}
          <div className="lg:col-span-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                    <Laptop size={16} />
                  </div>
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider">Geofence &amp; Shifts Console</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Live Terminal
                </span>
              </div>

              {/* Attendance visual image */}
              <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
                <img src={attendanceImg} alt="Attendance module" className="w-full object-cover" />
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── Section 2: Manager Portal ── */}
      <section id="manager-portal" className="py-20 border-t border-slate-200/80 px-6 relative z-10 bg-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          
          <div className="lg:col-span-6 order-2 lg:order-1">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
                    <Briefcase size={16} />
                  </div>
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider">Kanban Project Matrix</span>
                </div>
                <span className="text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full">
                  Real-time Sync
                </span>
              </div>

              <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
                <img src={tasksImg} alt="Task Kanban" className="w-full object-cover" />
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-3 text-left order-1 lg:order-2">
            <span className="text-[9px] font-black uppercase text-sky-700 bg-sky-50 border border-sky-200 px-3 py-1 rounded shadow-2xs">
              Role 02: Team Delegation &amp; Velocity
            </span>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Manager Command Center</h2>
            <p className="text-slate-600 text-xs font-medium leading-relaxed">
              Managers need fast task delegation, instant leave approvals, and live attendance tracking of their specific team without complex admin barriers.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { t: "Kanban task assignments", d: "Create work cards, subtask checklists, and assign members." },
                { t: "Team leave sign-offs", d: "Inspect pending casual/sick requests and approve with 1-click." },
                { t: "Daily team radar", d: "Live list of punched-in, late, or absent assigned employees." },
                { t: "Progress milestone logs", d: "Review attachments, deliverables and mark tasks complete." }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-2.5 p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
                  <div className="mt-1">
                    <CheckCircle2 size={15} className="text-sky-600" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">{item.t}</h4>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-normal">{item.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── Section 3: Employee Mobile Experience ── */}
      <section id="employee-app" className="py-20 border-t border-slate-200/80 px-6 relative z-10 bg-slate-50/50">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">

          <div className="lg:col-span-6 space-y-3 text-left">
            <span className="text-[9px] font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded shadow-2xs">
              Role 03: Field &amp; Office Mobility
            </span>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Employee Mobile Application</h2>
            <p className="text-slate-600 text-xs font-medium leading-relaxed">
              Designed for ease and speed. Field and office personnel can clock in with GPS coordinates, check daily tasks, and download verified salary slips.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { t: "GPS verified clock-in", d: "Selfie + satellite location check in under 3 seconds." },
                { t: "Interactive task checklist", d: "Mark item checkpoints and attach work photos." },
                { t: "Instant PDF salary slips", d: "Download and save monthly payslips directly to phone." },
                { t: "Leave balances & requests", d: "Real-time ledger of available casual, sick, and earned leaves." }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-2.5 p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
                  <div className="mt-1">
                    <CheckCircle2 size={15} className="text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">{item.t}</h4>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-normal">{item.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                    <Smartphone size={16} />
                  </div>
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider">Mobile Companion App</span>
                </div>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                  iOS &amp; Android
                </span>
              </div>

              <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
                <img src={mobileAppImg} alt="Mobile App" className="w-full object-cover" />
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── Section 4: Super Admin Hub ── */}
      <section id="superadmin-portal" className="py-20 border-t border-slate-200/80 px-6 relative z-10 bg-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">

          <div className="lg:col-span-6 order-2 lg:order-1">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                    <Shield size={16} />
                  </div>
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider">Tenant Provisioning Sandbox</span>
                </div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                  Master Control
                </span>
              </div>

              <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
                <img src={payrollImg} alt="Super Admin" className="w-full object-cover" />
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-3 text-left order-1 lg:order-2">
            <span className="text-[9px] font-black uppercase text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded shadow-2xs">
              Role 04: Multi-Tenant Platform Master
            </span>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Super Admin Global Console</h2>
            <p className="text-slate-600 text-xs font-medium leading-relaxed">
              Global platform oversight. Create new company tenants, manage subscription tiers, monitor storage quotas, and handle global support tickets.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { t: "Tenant provisioning", d: "Approve and onboard enterprise company accounts instantly." },
                { t: "Plan & tier manager", d: "Configure starter, professional, and enterprise subscription perks." },
                { t: "Global broadcast notices", d: "Push urgent system maintenance notices to all company headers." },
                { t: "Database backup & telemetry", d: "Monitor API latencies, active server sessions, and cloud backups." }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-2.5 p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
                  <div className="mt-1">
                    <CheckCircle2 size={15} className="text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">{item.t}</h4>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-normal">{item.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200 py-8 px-6 text-center text-xs font-semibold text-slate-500 z-10 relative bg-white">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 text-slate-900 font-bold">
            <OneClickLogo variant="landscape" />
          </Link>
          <p>© 2026 One Click Business HRMS Platform. Powered by <span className="text-blue-600 font-bold">icoded</span></p>
          <div className="flex items-center gap-4 text-slate-500 text-xs font-bold">
            <Link to="/" className="hover:text-blue-600">Home</Link>
            <Link to="/login" className="hover:text-blue-600">Login</Link>
            <Link to="/register" className="hover:text-blue-600">Register</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
