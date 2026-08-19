import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function Landing() {
  const [syncedCount, setSyncedCount] = useState(12);
  const [calcLeads, setCalcLeads] = useState(100);
  const [calcConversion, setCalcConversion] = useState(15);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    // Scroll animation observer
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('opacity-100', 'translate-y-0');
          entry.target.classList.remove('opacity-0', 'translate-y-8');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
      el.classList.add('transition-all', 'duration-700', 'opacity-0', 'translate-y-8');
      observer.observe(el);
    });

    // Step sequence automatic highlights
    const stepInterval = setInterval(() => {
      setActiveStep(prev => (prev + 1) % 4);
    }, 3000);

    // Simple ticker for the mock template sync
    const syncInterval = setInterval(() => {
      setSyncedCount(prev => (prev >= 15 ? 12 : prev + 1));
    }, 4500);

    return () => {
      observer.disconnect();
      clearInterval(stepInterval);
      clearInterval(syncInterval);
    };
  }, []);

  // ROI Calculator Calculations
  const currentConversions = Math.round((calcLeads * calcConversion) / 100);
  const leadFlowConversions = Math.round((calcLeads * (calcConversion + 18)) / 100);
  const extraSales = leadFlowConversions - currentConversions;

  return (
    <div className="bg-[#FAF9F6] text-[#0F172A] min-h-screen font-sans antialiased selection:bg-[#0E6B50] selection:text-white relative overflow-hidden">
      {/* Premium custom styles & background grid overrides */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Ultra-fine dotted grid pattern representing modern professional design */
        .dotted-grid {
          background-image: radial-gradient(#E2E8F0 1.5px, transparent 1.5px);
          background-size: 24px 24px;
        }

        /* Subtle linear gradient overlays for visual structure */
        .linear-grid {
          background-image: 
            linear-gradient(to right, rgba(226, 232, 240, 0.5) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(226, 232, 240, 0.5) 1px, transparent 1px);
          background-size: 80px 80px;
        }

        .premium-shadow-sm {
          box-shadow: 
            0 2px 8px rgba(15, 23, 42, 0.015),
            0 1px 2px rgba(15, 23, 42, 0.01);
        }

        .premium-shadow-md {
          box-shadow: 
            0 4px 20px -2px rgba(15, 23, 42, 0.02),
            0 8px 30px -4px rgba(14, 107, 80, 0.04);
        }

        .premium-shadow-lg {
          box-shadow: 
            0 1px 3px rgba(0, 0, 0, 0.01),
            0 16px 40px -10px rgba(15, 23, 42, 0.03),
            0 24px 64px -16px rgba(14, 107, 80, 0.05);
        }

        .premium-card-border {
          border: 1px solid rgba(226, 232, 240, 0.8);
        }

        .text-gradient-primary {
          background: linear-gradient(135deg, #0F172A 0%, #334155 50%, #475569 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .text-gradient-indigo {
          background: linear-gradient(135deg, #0E6B50 0%, #0E6B50 50%, #8B5CF6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .active-dot-glow {
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.2);
        }

        /* Ambient colored glows */
        .glow-radial-1 {
          position: absolute;
          top: -300px;
          right: -200px;
          width: 1000px;
          height: 1000px;
          background: radial-gradient(circle, rgba(14, 107, 80, 0.04) 0%, rgba(250, 249, 246, 0) 70%);
          z-index: 0;
          pointer-events: none;
        }

        .glow-radial-2 {
          position: absolute;
          top: 30%;
          left: -400px;
          width: 1100px;
          height: 1100px;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.03) 0%, rgba(250, 249, 246, 0) 70%);
          z-index: 0;
          pointer-events: none;
        }
      `}} />

      {/* Grid Patterns & Ambient Light */}
      <div className="absolute inset-0 dotted-grid opacity-75 z-0 pointer-events-none"></div>
      <div className="absolute inset-0 linear-grid opacity-30 z-0 pointer-events-none"></div>
      <div className="glow-radial-1"></div>
      <div className="glow-radial-2"></div>

      {/* STICKY HEADER */}
      <nav className="fixed top-0 w-full z-50 bg-[#FAF9F6]/80 backdrop-blur-xl border-b border-[#E2E8F0] shadow-sm">
        <div className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto">
          {/* Logo */}
          <div className="flex items-center group cursor-pointer">
            <img src="/easyconnect.png" alt="Easy Connect" className="h-10 w-auto transition-transform group-hover:scale-105 object-contain" />
          </div>
          
          {/* Links */}
          <div className="hidden md:flex items-center gap-1.5">
            <a className="text-[#475569] font-semibold hover:text-[#0E6B50] transition-colors text-[13px] px-3.5 py-2 rounded-lg hover:bg-slate-100/50" href="#features">Features</a>
            <a className="text-[#475569] font-semibold hover:text-[#0E6B50] transition-colors text-[13px] px-3.5 py-2 rounded-lg hover:bg-slate-100/50" href="#how-it-works">How it Works</a>
            <a className="text-[#475569] font-semibold hover:text-[#0E6B50] transition-colors text-[13px] px-3.5 py-2 rounded-lg hover:bg-slate-100/50" href="#pricing">Pricing</a>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-[#475569] hover:text-[#0F172A] transition-colors text-sm font-semibold px-3.5 py-2 rounded-lg hover:bg-slate-100/50">
              Login
            </Link>
            <Link to="/signup" className="bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs uppercase tracking-wider font-semibold px-5 py-3 rounded-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_4px_12px_rgba(15,23,42,0.15)]">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <main className="pt-28 md:pt-36 relative z-10">
        <section className="max-w-7xl mx-auto px-6 pb-20">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Left Copy block */}
            <div className="lg:col-span-6 flex flex-col gap-6 text-left">
              
              {/* API Connection Banner */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#E2E8F0] shadow-sm w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] active-dot-glow"></span>
                <span className="text-[10px] font-bold text-[#059669] uppercase tracking-wider font-mono">Meta API Hook: Connected</span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tighter text-gradient-primary">
                Scale Sales with <span className="text-gradient-indigo">Automated WhatsApp Drips</span>
              </h1>

              {/* Sub-headline */}
              <p className="text-base sm:text-lg text-[#475569] max-w-xl leading-relaxed">
                Connect official Meta cloud channels to your lead pipeline. Build timezone-aware sequences, schedule cohort campaigns, and view delivery metrics—all separated inside a private tenant space.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-4 pt-2">
                <Link to="/signup" className="bg-[#0E6B50] hover:bg-[#4A4BD4] text-white text-sm font-semibold px-8 py-4 rounded-xl shadow-[0_8px_20px_rgba(91,92,235,0.25)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 group">
                  Build Your First Flow
                  <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </Link>
                <a href="#how-it-works" className="border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[#0F172A] text-sm font-semibold px-8 py-4 rounded-xl shadow-sm transition-all flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#0E6B50]">play_circle</span>
                  See Walkthrough
                </a>
              </div>

              {/* Social Proof Badges */}
              <div className="flex items-center gap-3.5 mt-2.5 text-xs text-[#64748B] border-t border-[#E2E8F0] pt-6 max-w-lg">
                <div className="flex -space-x-2">
                  <div className="w-7 h-7 rounded-full border-2 border-white bg-indigo-50 flex items-center justify-center font-bold text-[9px] text-[#0E6B50]">R</div>
                  <div className="w-7 h-7 rounded-full border-2 border-white bg-emerald-50 flex items-center justify-center font-bold text-[9px] text-[#059669]">A</div>
                  <div className="w-7 h-7 rounded-full border-2 border-white bg-amber-50 flex items-center justify-center font-bold text-[9px] text-amber-600">S</div>
                </div>
                <span>Powering automations for 2,000+ local sales agents</span>
              </div>
            </div>

            {/* Right Mockup Panel: High-fidelity Interface Mockup */}
            <div className="lg:col-span-6 relative">
              <div className="bg-white rounded-2xl border border-slate-100 p-1 shadow-[0_24px_70px_rgba(15,23,42,0.06)] overflow-hidden">
                
                {/* Mock Application Window Header */}
                <div className="bg-slate-50/80 border-b border-slate-100 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-[#64748B]">LeadFlow CRM v1.0</div>
                  <div className="w-8"></div>
                </div>

                <div className="p-4 sm:p-6 grid sm:grid-cols-12 gap-5 bg-white">
                  
                  {/* Left Column: CRM Leads list */}
                  <div className="sm:col-span-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#64748B] tracking-wider uppercase font-mono">Live Pipeline</span>
                      <span className="text-[10px] font-bold text-[#059669] bg-[#10B981]/10 px-2 py-0.5 rounded">Sync Active</span>
                    </div>

                    <div className="space-y-2">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-[#0E6B50]/30 hover:bg-white transition-all cursor-pointer">
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="text-[12px] font-bold text-[#0F172A]">John Doe</h4>
                          <span className="text-[9px] font-semibold px-2 py-0.5 rounded bg-[#0E6B50]/10 text-[#0E6B50]">Follow-Up</span>
                        </div>
                        <p className="text-[10px] text-[#64748B] truncate">Active Flow: BMW Drip</p>
                      </div>

                      <div className="p-3 rounded-xl bg-white border border-[#0E6B50]/25 shadow-sm">
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="text-[12px] font-bold text-[#0F172A]">Amit Sharma</h4>
                          <span className="text-[9px] font-semibold px-2 py-0.5 rounded bg-[#10B981]/15 text-[#059669]">New Lead</span>
                        </div>
                        <p className="text-[10px] text-[#64748B] truncate">Auto-enrolling in 2m</p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50/50 border border-slate-100 opacity-60">
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="text-[12px] font-bold text-[#0F172A]">Pooja Patel</h4>
                          <span className="text-[9px] font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-500">Won</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: WhatsApp Drip Timeline */}
                  <div className="sm:col-span-7 bg-slate-50/80 rounded-xl p-4 border border-slate-100 flex flex-col justify-between min-h-[240px]">
                    <div>
                      {/* Contact Info Header */}
                      <div className="flex items-center gap-2 border-b border-slate-200/50 pb-2 mb-3">
                        <div className="w-6.5 h-6.5 rounded-full bg-[#0E6B50] flex items-center justify-center text-white text-[10px] font-bold">JD</div>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-[#0F172A]">John Doe</span>
                          <span className="text-[9px] text-[#059669] font-medium flex items-center gap-1"><span className="w-1 h-1 bg-[#10B981] rounded-full animate-ping"></span> Live Journey</span>
                        </div>
                      </div>

                      {/* Chat Messages */}
                      <div className="space-y-3.5">
                        <div className="flex gap-2">
                          <div className="w-1 bg-[#10B981] rounded-full"></div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[8.5px] font-bold text-[#059669] uppercase font-mono">Day 1 — Welcome Drip</span>
                              <span className="material-symbols-outlined text-[10px] text-[#10B981]">check_circle</span>
                            </div>
                            <p className="text-[11px] text-[#475569] mt-0.5 leading-relaxed bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                              "Hi John! Thanks for enquiry. We've registered your interest in LeadFlow."
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <div className="w-1 bg-[#0E6B50] rounded-full"></div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[8.5px] font-bold text-[#0E6B50] uppercase font-mono">Day 3 — Scheduled</span>
                              <span className="text-[8.5px] font-bold text-slate-400 uppercase font-mono">Sends Tomorrow</span>
                            </div>
                            <p className="text-[11px] text-[#475569] mt-0.5 leading-relaxed bg-white p-2 rounded-lg border border-[#0E6B50]/10">
                              "Checking in! Are you free for a brief demo call at 10 AM?"
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-2 border-t border-slate-200/40 flex justify-between items-center text-[10px] text-slate-400 font-semibold font-mono">
                      <span>Delivery Webhook Rate:</span>
                      <span className="text-[#059669]">99.8% Success</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative radial drop visuals */}
              <div className="absolute -bottom-6 -right-6 w-36 h-36 bg-[#0E6B50]/10 blur-3xl rounded-full z-[-1]"></div>
              <div className="absolute -top-6 -left-6 w-32 h-32 bg-[#10B981]/5 blur-3xl rounded-full z-[-1]"></div>
            </div>
          </div>
        </section>

        {/* TRUSTED INDUSTRIES GRID */}
        <section className="bg-white border-y border-slate-100 py-10 animate-on-scroll">
          <div className="max-w-7xl mx-auto px-6">
            <p className="text-center text-[10px] font-bold tracking-widest text-[#64748B] uppercase font-mono mb-6">Built For Diverse Business Verticals</p>
            <div className="flex flex-wrap justify-center gap-y-4 gap-x-10 md:gap-x-14 text-slate-400 font-bold text-sm">
              <span className="flex items-center gap-1.5 hover:text-slate-600 transition-colors"><span className="material-symbols-outlined text-sm">real_estate</span> Real Estate</span>
              <span className="flex items-center gap-1.5 hover:text-slate-600 transition-colors"><span className="material-symbols-outlined text-sm">health_and_safety</span> Salons &amp; Clinics</span>
              <span className="flex items-center gap-1.5 hover:text-slate-600 transition-colors"><span className="material-symbols-outlined text-sm">storefront</span> Retail Stores</span>
              <span className="flex items-center gap-1.5 hover:text-slate-600 transition-colors"><span className="material-symbols-outlined text-sm">directions_car</span> Auto Dealers</span>
              <span className="flex items-center gap-1.5 hover:text-slate-600 transition-colors"><span className="material-symbols-outlined text-sm">restaurant</span> Restaurants</span>
              <span className="flex items-center gap-1.5 hover:text-slate-600 transition-colors"><span className="material-symbols-outlined text-sm">school</span> Training Centers</span>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS DYNAMIC SEQUENCE */}
        <section id="how-it-works" className="max-w-7xl mx-auto px-6 py-20 animate-on-scroll">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[10px] font-bold text-[#0E6B50] bg-[#0E6B50]/10 px-3 py-1 rounded-full uppercase tracking-wider font-mono">Drip Architecture</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#0F172A] mt-4">Precision Automation Pipeline</h2>
            <p className="text-[#475569] mt-3">Watch how the background worker automates messaging rules step-by-step.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div 
              className={`p-6 rounded-2xl border transition-all duration-300 ${activeStep === 0 ? 'bg-white border-[#0E6B50] shadow-md scale-105' : 'bg-white/50 border-slate-100 opacity-70'}`}
              onClick={() => setActiveStep(0)}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${activeStep === 0 ? 'bg-[#0E6B50] text-white' : 'bg-slate-100 text-slate-600'}`}>
                <span className="material-symbols-outlined">bolt</span>
              </div>
              <span className="text-[9px] font-bold text-[#0E6B50] uppercase tracking-wider font-mono">Phase 01</span>
              <h4 className="font-bold text-[#0F172A] mt-1 text-sm">Pipeline Trigger</h4>
              <p className="text-[12px] text-[#64748B] mt-2 leading-relaxed">Moving a lead's status automatically triggers the sequence builder enrollment.</p>
            </div>

            {/* Step 2 */}
            <div 
              className={`p-6 rounded-2xl border transition-all duration-300 ${activeStep === 1 ? 'bg-white border-[#10B981] shadow-md scale-105' : 'bg-white/50 border-slate-100 opacity-70'}`}
              onClick={() => setActiveStep(1)}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${activeStep === 1 ? 'bg-[#10B981] text-white' : 'bg-slate-100 text-slate-600'}`}>
                <span className="material-symbols-outlined">hourglass_empty</span>
              </div>
              <span className="text-[9px] font-bold text-[#059669] uppercase tracking-wider font-mono">Phase 02</span>
              <h4 className="font-bold text-[#0F172A] mt-1 text-sm">Timezone Delay</h4>
              <p className="text-[12px] text-[#64748B] mt-2 leading-relaxed">System holds queue until specified hours in client's timezone (e.g. 10:00 AM).</p>
            </div>

            {/* Step 3 */}
            <div 
              className={`p-6 rounded-2xl border transition-all duration-300 ${activeStep === 2 ? 'bg-white border-[#0E6B50] shadow-md scale-105' : 'bg-white/50 border-slate-100 opacity-70'}`}
              onClick={() => setActiveStep(2)}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${activeStep === 2 ? 'bg-[#0E6B50] text-white' : 'bg-slate-100 text-slate-600'}`}>
                <span className="material-symbols-outlined">chat</span>
              </div>
              <span className="text-[9px] font-bold text-[#0E6B50] uppercase tracking-wider font-mono">Phase 03</span>
              <h4 className="font-bold text-[#0F172A] mt-1 text-sm">WhatsApp Dispatch</h4>
              <p className="text-[12px] text-[#64748B] mt-2 leading-relaxed">Meta API resolves tags, variables, and dispatches templates immediately.</p>
            </div>

            {/* Step 4 */}
            <div 
              className={`p-6 rounded-2xl border transition-all duration-300 ${activeStep === 3 ? 'bg-white border-red-500 shadow-md scale-105' : 'bg-white/50 border-slate-100 opacity-70'}`}
              onClick={() => setActiveStep(3)}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${activeStep === 3 ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                <span className="material-symbols-outlined">block</span>
              </div>
              <span className="text-[9px] font-bold text-red-500 uppercase tracking-wider font-mono">Phase 04</span>
              <h4 className="font-bold text-[#0F172A] mt-1 text-sm">Stop Safeguards</h4>
              <p className="text-[12px] text-[#64748B] mt-2 leading-relaxed">Instantly unsubscribes client if reply contains STOP, opt-out tags, or won status.</p>
            </div>
          </div>
        </section>

        {/* BENTO GRID DETAILS */}
        <section id="features" className="max-w-7xl mx-auto px-6 py-20 animate-on-scroll">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight text-[#0F172A]">Core Product Capabilities</h2>
            <p className="text-[#475569] mt-3">Fully private isolated infrastructure paired with seamless UI design.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Bento 1: CRM pipeline mockup */}
            <div className="lg:col-span-7 bg-white border border-slate-100 rounded-3xl p-8 flex flex-col justify-between min-h-[360px] premium-shadow-md">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#0E6B50]/10 flex items-center justify-center text-[#0E6B50]">
                    <span className="material-symbols-outlined">dashboard</span>
                  </div>
                  <h3 className="text-xl font-bold text-[#0F172A]">Visual Pipeline Tracker</h3>
                </div>
                <p className="text-sm text-[#475569] max-w-md leading-relaxed">
                  Track, search, and drag leads into status lanes. Keep absolute log trails with lead notes and chronological audit records.
                </p>
              </div>

              {/* CRM cards mockup */}
              <div className="flex gap-4 overflow-x-auto pb-2 custom-scroll mt-6">
                <div className="min-w-[200px] p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[8px] font-bold text-[#059669] bg-[#10B981]/15 px-2 py-0.5 rounded font-mono">NEW INQUIRY</span>
                    <span className="text-[9px] text-slate-400 font-mono">#901</span>
                  </div>
                  <h4 className="text-[12.5px] font-bold text-[#0F172A]">Amit Kumar</h4>
                  <span className="text-[10px] text-[#64748B]">Real Estate Query</span>
                </div>
                <div className="min-w-[200px] p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[8px] font-bold text-[#0E6B50] bg-[#0E6B50]/15 px-2 py-0.5 rounded font-mono">FOLLOW-UP 1</span>
                    <span className="text-[9px] text-slate-400 font-mono">#844</span>
                  </div>
                  <h4 className="text-[12.5px] font-bold text-[#0F172A]">Rakesh Patil</h4>
                  <span className="text-[10px] text-[#64748B]">Consulting Package</span>
                </div>
              </div>
            </div>

            {/* Bento 2: Direct Template Sync */}
            <div className="lg:col-span-5 bg-white border border-slate-100 rounded-3xl p-8 flex flex-col justify-between min-h-[360px] premium-shadow-md">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 flex items-center justify-center text-[#10B981]">
                    <span className="material-symbols-outlined">sync</span>
                  </div>
                  <h3 className="text-xl font-bold text-[#0F172A]">Real-Time Template Sync</h3>
                </div>
                <p className="text-sm text-[#475569] leading-relaxed">
                  Connect Meta Access Tokens securely. Fetch pre-approved templates instantly and preview variable mapping templates.
                </p>
              </div>

              {/* Latency checker widget */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide font-mono">Sync Health</span>
                  <span className="text-[10px] font-bold text-[#059669] flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-ping"></span> Synced ({syncedCount})</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-[#10B981] w-[95%]"></div>
                </div>
              </div>
            </div>

            {/* Bento 3: Timezone delays */}
            <div className="lg:col-span-4 bg-white border border-slate-100 rounded-3xl p-8 min-h-[280px] premium-shadow-md flex flex-col justify-between">
              <div className="w-10 h-10 rounded-xl bg-[#0E6B50]/10 flex items-center justify-center text-[#0E6B50] mb-4">
                <span className="material-symbols-outlined">schedule</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#0F172A] mb-1.5">Timezone Delays</h3>
                <p className="text-xs text-[#475569] leading-relaxed">
                  Process sequence steps relative to local schedules, restricting messaging to pre-defined intervals.
                </p>
              </div>
            </div>

            {/* Bento 4: Callback Webhooks */}
            <div className="lg:col-span-4 bg-white border border-slate-100 rounded-3xl p-8 min-h-[280px] premium-shadow-md flex flex-col justify-between">
              <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 flex items-center justify-center text-[#10B981] mb-4">
                <span className="material-symbols-outlined">analytics</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#0F172A] mb-1.5">Webhook Feedback</h3>
                <p className="text-xs text-[#475569] leading-relaxed">
                  Tracks Sent, Delivered, Read, and Failed webhook statuses instantly against each timeline item.
                </p>
              </div>
            </div>

            {/* Bento 5: Wishes logs */}
            <div className="lg:col-span-4 bg-white border border-slate-100 rounded-3xl p-8 min-h-[280px] premium-shadow-md flex flex-col justify-between">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 mb-4">
                <span className="material-symbols-outlined">cake</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#0F172A] mb-1.5">Engagement Scheduler</h3>
                <p className="text-xs text-[#475569] leading-relaxed">
                  Set-and-forget Birthday/Anniversary check workflows to prevent duplicate wishing inside the same calendar year.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ROI CALCULATOR PANEL */}
        <section className="bg-white border-y border-slate-100 py-20 animate-on-scroll">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-12">
              <span className="text-[10px] font-bold text-[#0E6B50] bg-[#0E6B50]/10 px-3 py-1 rounded-full uppercase tracking-wider font-mono">Sales Estimator</span>
              <h2 className="text-3xl font-extrabold tracking-tight text-[#0F172A] mt-4">Calculate Conversion Gains</h2>
              <p className="text-[#475569] mt-2">Estimate sales recoveries using structured automated follow-ups.</p>
            </div>

            <div className="bg-slate-50/60 rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-sm">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-xs font-bold text-[#0F172A] mb-2 font-mono uppercase tracking-wider">
                      <span>Monthly Lead Volume</span>
                      <span className="text-[#0E6B50]">{calcLeads} Leads</span>
                    </div>
                    <input 
                      type="range" 
                      min="10" 
                      max="1000" 
                      step="10"
                      value={calcLeads}
                      onChange={(e) => setCalcLeads(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0E6B50]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold text-[#0F172A] mb-2 font-mono uppercase tracking-wider">
                      <span>Current Closing Rate</span>
                      <span className="text-[#0E6B50]">{calcConversion}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="2" 
                      max="50" 
                      step="1"
                      value={calcConversion}
                      onChange={(e) => setCalcConversion(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0E6B50]"
                    />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-100 flex flex-col justify-between min-h-[160px] shadow-sm">
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase font-mono">Conversion Output</span>
                    <div className="flex justify-between text-xs text-slate-500 font-semibold">
                      <span>Manual Drips close:</span>
                      <span className="font-bold text-slate-700">{currentConversions} Sales</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 font-semibold border-b border-slate-100 pb-2">
                      <span>LeadFlow automated (+18% lift):</span>
                      <span className="font-bold text-[#059669]">{leadFlowConversions} Sales</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-bold text-[#0F172A]">Recovered Sales:</span>
                    <span className="text-xl font-extrabold text-[#0E6B50] font-mono">+{extraSales} Sales</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING TAB */}
        <section id="pricing" className="max-w-7xl mx-auto px-6 py-20 animate-on-scroll">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight text-[#0F172A]">Simple, Features-Unlocked Plan</h2>
            <p className="text-[#475569] mt-3">Link credentials and connect instantly. Meta fees billed directly at cost price.</p>
          </div>

          <div className="flex flex-col items-center">
            <div className="bg-white rounded-2xl p-10 max-w-md w-full relative overflow-hidden border border-[#0E6B50]/20 shadow-[0_20px_50px_rgba(15,23,42,0.04)]">
              <div className="absolute top-0 right-0 px-4 py-1.5 bg-[#10B981] text-white font-bold text-[9px] tracking-widest uppercase font-mono rounded-bl-xl">
                Best Value
              </div>

              <h3 className="text-lg font-bold text-[#0F172A] mb-1 font-mono uppercase tracking-wider text-slate-400">Growth Plan</h3>
              <div className="flex items-baseline gap-1.5 mb-6 border-b border-slate-100 pb-6">
                <span className="text-4xl font-extrabold text-[#0F172A] font-mono">$99</span>
                <span className="text-[#64748B] text-xs font-semibold">/month</span>
              </div>

              <ul className="space-y-3.5 mb-8">
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#10B981] text-md font-bold">check_circle</span>
                  <span className="text-xs text-[#475569]">Unlimited leads, contacts, and segments</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#10B981] text-md font-bold">check_circle</span>
                  <span className="text-xs text-[#475569]">Dynamic drag-and-order pipeline CRUD</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#10B981] text-md font-bold">check_circle</span>
                  <span className="text-xs text-[#475569]">Real-time templates sync &amp; rendering mockups</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#10B981] text-md font-bold">check_circle</span>
                  <span className="text-xs text-[#475569]">BullMQ drip workers &amp; webhook callback logs</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#10B981] text-md font-bold">check_circle</span>
                  <span className="text-xs text-[#475569]">Secure data separation architecture</span>
                </li>
              </ul>

              <Link to="/signup" className="block text-center w-full bg-[#0E6B50] hover:bg-[#4A4BD4] text-white font-bold py-4 rounded-xl hover:scale-[1.01] transition-transform text-xs uppercase tracking-widest">
                Start 14-Day Free Trial
              </Link>
            </div>
          </div>
        </section>

        {/* CTA FOOTER BANNER */}
        <section className="max-w-7xl mx-auto px-6 mb-20 animate-on-scroll">
          <div className="rounded-3xl bg-slate-900 p-12 md:p-16 text-center relative overflow-hidden border border-slate-800 shadow-xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(99,102,241,0.12)_0%,_transparent_75%)] pointer-events-none"></div>
            
            <h2 className="text-3xl font-extrabold mb-3 text-white">Automate Customer Follow-Ups</h2>
            <p className="text-slate-400 max-w-md mx-auto mb-8 text-xs leading-relaxed">
              Launch message sequences in under 15 minutes. Protect sender score with automated opt-out keywords compliance.
            </p>
            
            <div className="max-w-md mx-auto flex flex-col md:flex-row gap-3 relative z-10">
              <input 
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-5 py-4 text-white focus:ring-2 focus:ring-[#0E6B50] focus:border-transparent outline-none transition-all placeholder:text-slate-600 text-xs" 
                placeholder="Enter work email" 
                type="email"
              />
              <Link to="/signup" className="bg-[#10B981] hover:bg-[#059669] text-white font-bold px-8 py-4 rounded-xl text-xs uppercase tracking-wider shadow-lg">
                Get Started
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-100 w-full rounded-t-2xl relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 px-6 py-10 max-w-7xl mx-auto">
          <div className="flex flex-col items-center md:items-start gap-3.5">
            <div className="flex items-center">
              <img src="/easyconnect.png" alt="Easy Connect" className="h-8 w-auto object-contain" />
            </div>
            
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] glow-dot"></span>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono">Meta Cloud Connection: Operational</span>
            </div>
            
            <p className="text-[11px] text-[#64748B]">© 2026 LeadFlow CRM. All rights reserved. Multi-tenant secure workspace.</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-6 text-[10px] font-bold uppercase tracking-wider font-mono text-slate-400">
            <a className="hover:text-[#0E6B50] transition-all hover:underline" href="#">Privacy Policy</a>
            <a className="hover:text-[#0E6B50] transition-all hover:underline" href="#">Terms of Service</a>
            <a className="hover:text-[#0E6B50] transition-all hover:underline" href="#">Security</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

