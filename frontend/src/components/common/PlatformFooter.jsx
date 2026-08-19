import React from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck, MapPin, DollarSign, Kanban, Sparkles,
  ArrowRight, Lock, Cpu
} from "lucide-react";
import OneClickLogo from "./OneClickLogo";

/**
 * PlatformFooter Component
 * Ultra-sleek, compact, enterprise-grade platform footer that clearly highlights
 * ONE CLICK's core purpose, architecture, capabilities, and trust compliance badges.
 */
const PlatformFooter = ({ variant = "public" }) => {
  const year = new Date().getFullYear();

  if (variant === "compact") {
    return (
      <footer className="w-full border-t border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-6 py-2.5 bg-white dark:bg-[#111C24] text-slate-500 dark:text-slate-400 text-xs font-medium flex flex-col sm:flex-row items-center justify-between gap-2.5 transition-colors print:hidden flex-shrink-0">
        <div className="flex items-center gap-2 truncate">
          <span className="font-extrabold text-slate-900 dark:text-white">ONE CLICK</span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span className="truncate">All-in-One Enterprise HRMS &amp; Workforce Engine</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-400 shrink-0">
          <span className="hidden md:inline">© {year} All Rights Reserved</span>
          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[10px]">
            v2.5.0
          </span>
        </div>
      </footer>
    );
  }

  return (
    <footer className="relative z-10 border-t border-white/[0.08] bg-[#070A10] text-slate-400 pt-10 sm:pt-14 pb-6 sm:pb-8 px-4 sm:px-6 lg:px-8 font-sans overflow-hidden">
      
      {/* Background ambient lighting glow */}
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[300px] bg-gradient-to-tr from-amber-500/10 via-orange-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-0 left-1/3 w-[400px] h-[200px] bg-gradient-to-br from-teal-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-8 sm:space-y-10 relative z-10">

        {/* ── TOP SECTION: Brand Purpose Statement & Platform Summary ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-8 sm:pb-10 border-b border-white/[0.08] items-start">
          
          {/* Brand Logo & Purpose Statement */}
          <div className="lg:col-span-5 space-y-4">
            <div className="inline-block bg-white/5 backdrop-blur-md p-2 rounded-2xl border border-white/10 shadow-sm">
              <OneClickLogo variant="landscape" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                <Sparkles size={11} className="text-amber-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Enterprise Purpose</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight leading-snug">
                The Smartest Way to Manage Your <span className="text-amber-400">Workforce &amp; Operations</span>
              </h3>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed font-medium max-w-lg">
                ONE CLICK unifies GPS geofenced attendance, 1-click automated payroll, department task boards, leave workflows, and WhatsApp lead automations into a single high-performance cloud platform for modern businesses.
              </p>
            </div>


          </div>

          {/* 4 Core Pillars Grid */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 lg:pt-0">
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.07] space-y-1 hover:border-amber-500/30 transition-all">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                <MapPin size={14} />
                <span>GPS Geofenced Attendance</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Real-time mobile clock-ins verified against branch GPS boundaries with live audit logs.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.07] space-y-1 hover:border-amber-500/30 transition-all">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <DollarSign size={14} />
                <span>1-Click Payroll Engine</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Automated monthly salary calculations, tax deductions, and instant PDF payslip downloads.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.07] space-y-1 hover:border-amber-500/30 transition-all">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold">
                <Kanban size={14} />
                <span>Task &amp; Project Operations</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Kanban task boards, checklist tracking, and team milestone coordination across departments.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.07] space-y-1 hover:border-amber-500/30 transition-all">
              <div className="flex items-center gap-2 text-purple-400 text-xs font-bold">
                <Cpu size={14} />
                <span>Lead Engine &amp; Automations</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                WhatsApp automated lead drips, customer reminder pipelines, and sales team lead scoring.
              </p>
            </div>
          </div>

        </div>

        {/* ── MIDDLE SECTION: Navigation Links & Quick Access ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-12 gap-6 pb-8 border-b border-white/[0.08]">
          
          {/* Workspaces & Portals */}
          <div className="lg:col-span-3 space-y-2.5">
            <h4 className="text-xs font-black text-white uppercase tracking-wider">Role Workspaces</h4>
            <ul className="space-y-1.5 text-xs font-semibold text-slate-400">
              <li><Link to="/login" className="hover:text-amber-400 transition-colors inline-block">👑 Super Admin Portal</Link></li>
              <li><Link to="/login" className="hover:text-amber-400 transition-colors inline-block">🏢 Company Admin Suite</Link></li>
              <li><Link to="/login" className="hover:text-amber-400 transition-colors inline-block">👥 HR Manager Desk</Link></li>
              <li><Link to="/login" className="hover:text-amber-400 transition-colors inline-block">📊 Department Manager Portal</Link></li>
              <li><Link to="/login" className="hover:text-amber-400 transition-colors inline-block">👷 Employee Companion App</Link></li>
            </ul>
          </div>

          {/* Core Modules */}
          <div className="lg:col-span-3 space-y-2.5">
            <h4 className="text-xs font-black text-white uppercase tracking-wider">Platform Capabilities</h4>
            <ul className="space-y-1.5 text-xs font-semibold text-slate-400">
              <li><a href="#features" className="hover:text-amber-400 transition-colors inline-block">GPS Attendance &amp; Map Locks</a></li>
              <li><a href="#features" className="hover:text-amber-400 transition-colors inline-block">1-Click Salary &amp; Payslip PDF</a></li>
              <li><a href="#features" className="hover:text-amber-400 transition-colors inline-block">Kanban Task Board &amp; Milestones</a></li>
              <li><a href="#features" className="hover:text-amber-400 transition-colors inline-block">Leave Requests &amp; Balance Audit</a></li>
              <li><a href="#features" className="hover:text-amber-400 transition-colors inline-block">WhatsApp Automation Engine</a></li>
            </ul>
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-3 space-y-2.5">
            <h4 className="text-xs font-black text-white uppercase tracking-wider">Quick Resources</h4>
            <ul className="space-y-1.5 text-xs font-semibold text-slate-400">
              <li><Link to="/features" className="hover:text-amber-400 transition-colors inline-block">Platform Overview &amp; Features</Link></li>
              <li><a href="#pricing" className="hover:text-amber-400 transition-colors inline-block">Subscription Plans &amp; Pricing</a></li>
              <li><Link to="/login" className="hover:text-amber-400 transition-colors inline-block">Sign In to Workspace</Link></li>
              <li><Link to="/register" className="hover:text-amber-400 transition-colors inline-block">Start Free 7-Day Trial</Link></li>
            </ul>
          </div>

          {/* Quick Action Box */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-3 bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 p-4 rounded-2xl space-y-2.5">
            <h4 className="text-xs font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} />
              <span>Get Started in 30s</span>
            </h4>
            <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
              Start your 7-day free trial with full access for up to 10 employees. No credit card required.
            </p>
            <Link
              to="/register"
              className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <span>Start Free Trial</span>
              <ArrowRight size={14} strokeWidth={2.5} />
            </Link>
          </div>

        </div>

        {/* ── BOTTOM SECTION: Copyright & Legal Specs ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-medium text-slate-500">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <span>© {year} ONE CLICK Technologies Inc. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-semibold">
            <span className="hover:text-slate-300 cursor-pointer">Terms of Service</span>
            <span>•</span>
            <span className="hover:text-slate-300 cursor-pointer">Privacy Policy</span>
            <span>•</span>
            <span className="hover:text-slate-300 cursor-pointer">Security SLA</span>
            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-amber-400 font-extrabold text-[10px] ml-1">
              v2.5 Enterprise
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default PlatformFooter;
