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
    <div className="min-h-screen bg-[#06080c] text-slate-100 font-sans relative selection:bg-orange-500 selection:text-white overflow-x-hidden">

      {/* Grid Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0e1520_1px,transparent_1px),linear-gradient(to_bottom,#0e1520_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0" />

      {/* Floating Glow Spheres */}
      <div className="absolute top-[10%] left-[-10%] w-[500px] h-[500px] bg-orange-600/5 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-[40%] right-[-10%] w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[10%] left-[20%] w-[450px] h-[450px] bg-orange-600/5 rounded-full blur-[120px] pointer-events-none" />

      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#06080c]/85 border-b border-slate-900/80">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white rounded-xl p-1.5 shadow flex items-center justify-center overflow-hidden border border-slate-800">
              <img src={logoImg} alt="One Click " className="w-full h-full object-contain" />
            </div>
            <div className="text-left">
              <span className="text-white font-black text-lg tracking-tight leading-none">One Click </span>
              <span className="block text-[7px] font-black text-orange-500 uppercase tracking-widest mt-0.5">SaaS Platform Details</span>
            </div>
          </Link>
          <Link to="/" className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-2 px-4 py-2 border border-slate-900 rounded-xl transition-all">
            <ArrowLeft size={14} />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      {/* ── Hero section ── */}
      <section className="pt-20 pb-16 px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 px-3.5 py-1.5 rounded-full">
            <Sparkles size={12} className="text-orange-400 animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-widest text-orange-300">Workspace Roles & Architecture</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-tight">
            Role-Based Workspaces,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-amber-400 to-orange-400">
              Built to Scale Together
            </span>
          </h1>
          <p className="text-slate-400 text-sm md:text-base font-semibold leading-relaxed max-w-2xl mx-auto">
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
                className="px-5 py-2.5 bg-slate-900/40 hover:bg-slate-900 border border-slate-900 hover:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all text-slate-400 hover:text-white"
              >
                <lnk.icon size={11} className="text-orange-500" />
                <span>{lnk.label}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 1: Admins & HR Portal ── */}
      <section id="admin-portal" className="py-20 border-t border-slate-900/80 px-6 relative z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">

          {/* Info Details Left (6 Columns) */}
          <div className="lg:col-span-6 space-y-3 text-left">
            <span className="text-[9px] font-black uppercase text-orange-400 bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded">
              Role 01: Setup & Compliance
            </span>
            <h2 className="text-3xl font-black text-white tracking-tight">Admins & HR Workspaces</h2>
            <p className="text-slate-400 text-xs font-semibold leading-relaxed">
              HR admins require absolute control over policies, branch structures, shifts, and salary calculations. The Admin Portal brings structural configuration and automated cycles into a centralized dashboard.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { t: "GPS geofence setups", d: "Add branch coordinates and define boundary radius limits." },
                { t: "Compliance payroll engine", d: "Setup basic pays, allowances, deductions, and execute slips." },
                { t: "Shift schedules settings", d: "Onboard morning, afternoon, night timings and assign staff." },
                { t: "Audit Logs Logger", d: "Inspect write/edit timestamps across the company database." }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-2.5 p-4 bg-slate-900/15 border border-slate-900/80 rounded-2xl">
                  <CheckCircle2 size={14} className="text-orange-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">{item.t}</h4>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1 leading-normal">{item.d}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Embedded Live Slider Simulator */}
            <div className="border border-slate-900 bg-slate-950 p-6 rounded-2xl space-y-4">
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <Zap size={13} className="text-orange-500" />
                <span>Admin Settings Simulator</span>
              </h4>
              <div className="flex justify-between text-[11px] font-bold text-slate-400">
                <span>Geofencing radius limit: {geoRadius}m</span>
                <span className="text-orange-400">Net salary cycle: ₹{calculatedNetPay.toLocaleString("en-IN")}</span>
              </div>
              <input
                type="range"
                min="50"
                max="1000"
                value={geoRadius}
                onChange={(e) => setGeoRadius(Number(e.target.value))}
                className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <p className="text-[9px] text-slate-500 font-semibold">
                Adjust the slider to configure branch borders. Salary calculation maps basic rate (₹{basePay.toLocaleString()}) + allowance (₹{allowance.toLocaleString()}) - deductions (₹{deductions.toLocaleString()}).
              </p>
            </div>
          </div>

          {/* Screenshot Mockup Right (6 Columns) */}
          <div className="lg:col-span-6">
            <div className="bg-slate-900/40 border border-slate-800 p-2.5 rounded-3xl shadow-2xl backdrop-blur-md relative overflow-hidden">
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-slate-800 bg-slate-950/60 rounded-t-2xl">
                <span className="w-2 h-2 rounded-full bg-rose-500/60" />
                <span className="w-2 h-2 rounded-full bg-amber-500/60" />
                <span className="w-2 h-2 rounded-full bg-emerald-500/60" />
                <div className="mx-auto bg-slate-900 rounded px-6 py-0.5 text-[8px] text-slate-500 font-bold">
                  icoded-hrms.com/admin/payroll
                </div>
              </div>
              <div className="aspect-[16/10] bg-slate-950 relative overflow-hidden rounded-b-2xl">
                <img
                  src={payrollImg}
                  alt="Admin Payroll Interface"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── Section 2: Managers Dashboard ── */}
      <section id="manager-portal" className="py-20 bg-slate-900/5 border-t border-slate-900/60 px-6 relative z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">

          {/* Screenshot Mockup Left (6 Columns) */}
          <div className="lg:col-span-6 order-last lg:order-first">
            <div className="bg-slate-900/40 border border-slate-800 p-2.5 rounded-3xl shadow-2xl backdrop-blur-md relative overflow-hidden">
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-slate-800 bg-slate-950/60 rounded-t-2xl">
                <span className="w-2 h-2 rounded-full bg-rose-500/60" />
                <span className="w-2 h-2 rounded-full bg-amber-500/60" />
                <span className="w-2 h-2 rounded-full bg-emerald-500/60" />
                <div className="mx-auto bg-slate-900 rounded px-6 py-0.5 text-[8px] text-slate-500 font-bold">
                  icoded-hrms.com/manager/tasks
                </div>
              </div>
              <div className="aspect-[16/10] bg-slate-950 relative overflow-hidden rounded-b-2xl">
                <img
                  src={tasksImg}
                  alt="Manager Task Boards"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Info Details Right (6 Columns) */}
          <div className="lg:col-span-6 space-y-3 text-left">
            <span className="text-[9px] font-black uppercase text-orange-400 bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded">
              Role 02: Team Coordination
            </span>
            <h2 className="text-3xl font-black text-white tracking-tight">Managers Dashboard</h2>
            <p className="text-slate-400 text-xs font-semibold leading-relaxed">
              Managers coordinate project sheets, assign deliverables, audit attendance exceptions, and approve leaves. The Managers Dashboard provides visual tracking grids to align the department's day-to-day work.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { t: "Kanban Task Boards", d: "Assign tasks to department members with High/Medium/Low priority tags." },
                { t: "Checklist metrics tracker", d: "Monitor completion rates as team members check subtasks on mobile." },
                { t: "Time-off approvals stream", d: "Review casual/sick leave requests with live employee balance indicators." },
                { t: "Regularization controls", d: "Review, approve, or reject team missing clock-in correction forms." }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-2.5 p-4 bg-slate-900/15 border border-slate-900/80 rounded-2xl">
                  <CheckCircle2 size={14} className="text-orange-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">{item.t}</h4>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1 leading-normal">{item.d}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Interactive Kanban Simulator */}
            <div className="border border-slate-900 bg-slate-950 p-6 rounded-2xl space-y-3">
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <Zap size={13} className="text-orange-500" />
                <span>Task Progress Tracker</span>
              </h4>
              {[
                { label: "Onboard Branch parameters", done: true },
                { label: "Trigger month payroll structures", done: true },
                { label: "Audit geofence compliance log", done: false }
              ].map((sub, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-slate-900/30 rounded-lg text-[10px] font-bold">
                  <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${sub.done ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-800'}`}>
                    {sub.done && <Check size={10} />}
                  </span>
                  <span className={sub.done ? "text-slate-400 line-through" : "text-slate-200"}>{sub.label}</span>
                </div>
              ))}
              <div className="pt-2">
                <div className="flex justify-between text-[8px] font-black text-slate-550 mb-1">
                  <span>Task checklist progress: 2/3 Done</span>
                  <span>67%</span>
                </div>
                <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                  <div className="bg-orange-500 h-full" style={{ width: '67%' }} />
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── Section 3: Employees Mobile Companion App ── */}
      <section id="employee-app" className="py-20 border-t border-slate-900/60 px-6 relative z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">

          {/* Info Details Left (6 Columns) */}
          <div className="lg:col-span-6 space-y-3 text-left">
            <span className="text-[9px] font-black uppercase text-orange-400 bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded">
              Role 03: Mobile Field Logs
            </span>
            <h2 className="text-3xl font-black text-white tracking-tight">Employees Mobile Companion</h2>
            <p className="text-slate-400 text-xs font-semibold leading-relaxed">
              For field operators and office staff, speed and ease of logging attendance are critical. The companion mobile application lets employees clock in securely via GPS, check tasks, submit leave balance requests, and download payslips.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { t: "GPS Clock-ins", d: "One-tap punch logs verified automatically against branch coordinates." },
                { t: "Daily Checklists Form", d: "View task lists, tick off subtasks, and submit completion updates." },
                { t: "Time-off Balance Sliders", d: "Check Sick/Casual leave balances and submit requests." },
                { t: "Slips Download PDF", d: "View and print monthly salary slips directly from the app." }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-2.5 p-4 bg-slate-900/15 border border-slate-900/80 rounded-2xl">
                  <CheckCircle2 size={14} className="text-orange-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">{item.t}</h4>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1 leading-normal">{item.d}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Dynamic Leave balance preview */}
            <div className="border border-slate-900 bg-slate-950 p-6 rounded-2xl space-y-3">
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <Zap size={13} className="text-orange-500" />
                <span>Employee Leave Balances</span>
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { name: "Sick Leave", val: "12 Days", bg: "bg-orange-500/10 text-orange-400 border border-orange-500/20" },
                  { name: "Casual Leave", val: "15 Days", bg: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" },
                  { name: "Earned Leave", val: "18 Days", bg: "bg-amber-500/10 text-amber-400 border border-amber-500/20" }
                ].map((item, idx) => (
                  <div key={idx} className={`p-3 rounded-xl border text-center ${item.bg}`}>
                    <p className="text-[8px] font-bold text-slate-550 uppercase">{item.name}</p>
                    <p className="text-xs font-black mt-1">{item.val}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Smartphone Mockup Right (6 Columns) */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="bg-gradient-to-tr from-slate-900/50 to-slate-950 border border-slate-900 rounded-3xl p-8 aspect-[4/3] flex items-center justify-center relative overflow-hidden w-full max-w-sm">
              <div className="absolute inset-0 bg-orange-600/5 rounded-full blur-[80px]" />

              {/* Phone Frame */}
              <div className="w-[190px] h-[260px] bg-slate-950 border-[6px] border-slate-900 rounded-[32px] overflow-hidden shadow-2xl relative">
                <img
                  src={mobileAppImg}
                  alt="Mobile App View"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-16 h-3.5 bg-slate-950 rounded-full z-20 flex items-center justify-center">
                  <span className="w-1 h-1 rounded-full bg-slate-800" />
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── Section 4: Super Admin Platform ── */}
      <section id="superadmin-portal" className="py-20 bg-slate-900/5 border-t border-slate-900/60 px-6 relative z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">

          {/* Request Approvals Mockup Left (6 Columns) */}
          <div className="lg:col-span-6 order-last lg:order-first">
            <div className="border border-slate-900 bg-slate-950 p-6 rounded-3xl space-y-4 shadow-xl">
              <div className="flex justify-between items-center pb-3 border-b border-slate-900">
                <div>
                  <h3 className="text-sm font-black text-white">SuperAdmin Approvals Gate</h3>
                  <p className="text-[9px] text-slate-500 font-semibold">Active SaaS company trial request list</p>
                </div>
                <span className="px-2 py-0.5 bg-orange-500/10 text-orange-400 text-[8px] font-black rounded uppercase">Live Feed</span>
              </div>
              <div className="space-y-3">
                {companies.map((c) => (
                  <div key={c.id} className="p-4 bg-slate-900/30 rounded-2xl border border-slate-900 flex items-center justify-between text-[10px] font-bold text-slate-300">
                    <div>
                      <p className="text-white font-black">{c.name}</p>
                      <p className="text-[8px] text-slate-500 font-semibold mt-0.5">Trial package limit: {c.employees} Employees</p>
                    </div>
                    <button
                      disabled={c.status === "Approved"}
                      onClick={() => handleApprove(c.id)}
                      className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${c.status === "Approved"
                        ? "bg-slate-900 text-slate-500 border border-slate-850"
                        : "bg-orange-600 hover:bg-orange-500 text-white shadow-lg"
                        }`}
                    >
                      {c.status === "Approved" ? "Approved" : "Approve Workspace"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Info Details Right (6 Columns) */}
          <div className="lg:col-span-6 space-y-3 text-left">
            <span className="text-[9px] font-black uppercase text-orange-400 bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded">
              Role 04: SaaS Admin
            </span>
            <h2 className="text-3xl font-black text-white tracking-tight">Super Admin Platform</h2>
            <p className="text-slate-400 text-xs font-semibold leading-relaxed">
              The SaaS platform owner manages global clients, validates trials, renews subscriptions, configures limits, and monitors transactions. The Super Admin Console keeps workspace cycles aligned.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { t: "Workspace Approvals", d: "Verify newly registered companies to automatically launch 7-day trials." },
                { p: "pricing-tiers", t: "Flexible Plans Config", d: "Setup and renew plans (Growth, Enterprise) dynamically." },
                { t: "Payout records audit", d: "Log client transactions, update invoice files, and renew statuses." },
                { t: "Global activity logger", d: "Monitor write actions, IP logs, and logs timestamps for cloud security." }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-2.5 p-4 bg-slate-900/15 border border-slate-900/80 rounded-2xl">
                  <CheckCircle2 size={14} className="text-orange-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">{item.t}</h4>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1 leading-normal">{item.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-900/85 bg-slate-950 py-16 px-6 relative z-10 text-xs font-bold text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 bg-white rounded-xl p-1.5 border border-slate-800 flex items-center justify-center overflow-hidden">
              <img src={logoImg} alt="One Click " className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="text-slate-300 font-black">One Click  Platform</p>
              <p className="text-slate-500 text-[10px] mt-0.5">© 2026 iCoded. All rights reserved.</p>
            </div>
          </div>
          <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest">
            <Link to="/" className="hover:text-slate-300 transition-colors">Home</Link>
            <Link to="/register" className="hover:text-slate-300 transition-colors">Start Trial</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
