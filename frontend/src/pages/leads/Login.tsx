import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../utils/leads/api';
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react';

export default function Login() {
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validateForm = () => {
    const tempErrors: { email?: string; password?: string } = {};
    if (!email) {
      tempErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      tempErrors.email = 'Please enter a valid email address';
    }
    if (!password) {
      tempErrors.password = 'Password is required';
    } else if (password.length < 6) {
      tempErrors.password = 'Password must be at least 6 characters';
    }
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/api/auth/login', { email, password });
      login(res.token, res.user, res.org);
      if (res.org?.onboardingCompleted || res.user?.role === 'SUPER_ADMIN' || res.user?.role === 'FRANCHISE') {
        navigate('/');
      } else {
        navigate('/onboarding');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <style>{`
        @keyframes bgPan {
          0% { background-position: 0% 0%; }
          100% { background-position: 48px 48px; }
        }
        @keyframes floatGlow1 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.2; }
          50% { transform: translate(25px, -15px) scale(1.08); opacity: 0.25; }
        }
        @keyframes floatGlow2 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; }
          50% { transform: translate(-15px, 25px) scale(1.04); opacity: 0.18; }
        }
        @keyframes slideUpFade {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slideRightFade {
          from { transform: translateX(-20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes formSlideUp {
          from { transform: translateY(15px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        .auth-container {
          min-height: 100vh;
          display: flex;
          background: #FFFFFF;
          font-family: 'Inter', sans-serif;
        }
        .auth-visual-panel {
          width: 60%;
          flex-shrink: 0;
          background: linear-gradient(135deg, #0F172A 0%, #064E3B 50%, #044E3A 100%);
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 48px 64px;
          overflow: hidden;
        }
        .auth-form-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 40px 24px;
          background: #F8FAFC;
          background-image: radial-gradient(rgba(14,107,80,0.03) 1.5px, transparent 0);
          background-size: 24px 24px;
        }
        .auth-form-card {
          animation: formSlideUp 0.5s ease-out forwards;
        }
        .auth-animate-title {
          animation: slideRightFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .auth-animate-widget {
          animation: slideUpFade 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .shimmer-text-brand {
          background: linear-gradient(90deg, #FFFFFF 0%, #34D399 50%, #FFFFFF 100%);
          background-size: 200% auto;
          color: transparent;
          -webkit-background-clip: text;
          background-clip: text;
          animation: shimmer 5s linear infinite;
        }
        .shimmer-text-dark {
          background: linear-gradient(90deg, #0F172A 0%, #0E6B50 50%, #0F172A 100%);
          background-size: 200% auto;
          color: transparent;
          -webkit-background-clip: text;
          background-clip: text;
          animation: shimmer 5s linear infinite;
        }

        .btn-premium-shimmer {
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #0E6B50 0%, #10B981 50%, #0E6B50 100%);
          background-size: 200% auto;
          color: #FFFFFF !important;
          border: none;
          font-weight: 600;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 14px 0 rgba(14, 107, 80, 0.35);
        }
        .btn-premium-shimmer:hover {
          background-position: right center;
          transform: translateY(-1.5px);
          box-shadow: 0 6px 20px 0 rgba(14, 107, 80, 0.45);
        }
        .btn-premium-shimmer:active {
          transform: translateY(0.5px);
        }
        .btn-premium-shimmer:disabled {
          background: #CBD5E1;
          box-shadow: none;
          transform: none;
          cursor: not-allowed;
        }

        .premium-input-wrapper {
          position: relative;
          transition: all 0.2s;
        }
        .premium-input-wrapper:focus-within .input-icon {
          color: #0E6B50 !important;
        }

        @media (max-width: 1023px) {
          .auth-visual-panel {
            display: none !important;
          }
          .auth-form-panel {
            width: 100% !important;
          }
        }
      `}</style>
      
      {/* LEFT PANEL: Branding & Visuals (Hidden on mobile) */}
      <div className="auth-visual-panel">
        {/* Subtle grid backdrop pattern */}
        <div style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.04,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' fill='none'/%3E%3Cpath d='M24 12H0M12 24V0' stroke='%23ffffff' stroke-width='1'/%3E%3C/svg%3E")`,
          animation: 'bgPan 12s linear infinite',
        }} />

        {/* Ambient glow circles */}
        <div style={{
          position: 'absolute',
          width: 350, height: 350,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(14,107,80,0.3) 0%, rgba(0,0,0,0) 70%)',
          top: '-50px',
          left: '-50px',
          filter: 'blur(30px)',
          pointerEvents: 'none',
          animation: 'floatGlow1 8s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute',
          width: 450, height: 450,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.2) 0%, rgba(0,0,0,0) 70%)',
          bottom: '-100px',
          right: '-100px',
          filter: 'blur(40px)',
          pointerEvents: 'none',
          animation: 'floatGlow2 10s ease-in-out infinite',
        }} />

        {/* Header Branding */}
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center' }}>
          <img
            src="/easyconnect.png"
            alt="Easy Connect"
            style={{ height: 44, width: 'auto', objectFit: 'contain', display: 'block' }}
          />
        </div>

        {/* Dynamic Center Visual: Glassmorphism Stats card */}
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, margin: 'auto 0', width: '100%' }}>
          <div className="auth-animate-title" style={{ textAlign: 'center' }}>
            <h2 className="shimmer-text-brand" style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.25, letterSpacing: '-0.03em', maxWidth: 500, margin: '0 auto' }}>
              Connect. Automate. Scale your Leads.
            </h2>
            <p style={{ fontSize: 15, color: '#94A3B8', marginTop: 14, lineHeight: 1.6, maxWidth: 460, margin: '14px auto 0' }}>
              The ultimate WhatsApp automation CRM to manage, broadcast, and build smart workflows for your incoming sales leads.
            </p>
          </div>

          {/* Premium Glassmorphism Widget */}
          <div className="auth-animate-widget" style={{
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 16,
            padding: '22px 24px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
            width: '100%',
            maxWidth: 420,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            position: 'relative',
            textAlign: 'left',
          }}>
            {/* Widget top bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>🚀</span>
                <span style={{ fontSize: 13, fontWeight: 650, color: '#F8FAFC' }}>Diwali Blast Campaign</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#10B981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 6 }}>
                Active
              </span>
            </div>

            {/* Campaign Progress */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#94A3B8', marginBottom: 6 }}>
                <span>Delivery Progress</span>
                <span style={{ fontWeight: 600, color: '#FFFFFF' }}>87%</span>
              </div>
              <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: '87%', height: '100%', background: 'linear-gradient(90deg, #0E6B50 0%, #10B981 100%)', borderRadius: 3 }} />
              </div>
            </div>

            {/* Campaign Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14 }}>
              <div>
                <p style={{ fontSize: 11, color: '#94A3B8' }}>Total Recipients</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginTop: 2 }}>2,850</p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: '#94A3B8' }}>Read Rate</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: '#0E6B50', marginTop: 2 }}>94.2%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Credit */}
        <div style={{ position: 'relative', zIndex: 10, fontSize: 12, color: '#475569' }}>
          © {new Date().getFullYear()} Easy Connect. Built for high-conversion sales teams.
        </div>
      </div>

      {/* RIGHT PANEL: Form Container */}
      <div className="auth-form-panel">
        <div className="auth-form-card" style={{ width: '100%', maxWidth: 400, margin: '0 auto' }}>

          {/* Brand Logo & title */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <img
              src="/easyconnect.png"
              alt="Easy Connect"
              style={{
                height: 56, width: 'auto',
                objectFit: 'contain', display: 'inline-block',
                marginBottom: 14,
              }}
            />
            <h1 className="shimmer-text-dark" style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
              Welcome back
            </h1>
            <p style={{ fontSize: 14, color: '#64748B', marginTop: 6 }}>
              Sign in to manage your leads workspace
            </p>
          </div>

          {/* Card */}
          <div className="card-elevated" style={{ padding: '32px 28px', border: '1px solid #E2E8F0', borderRadius: 16, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05), 0 10px 10px -5px rgba(0,0,0,0.03)' }}>

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 8,
                background: '#FEF2F2', border: '1px solid #FECACA',
                color: '#DC2626', fontSize: 13, marginBottom: 20,
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label className="form-label" style={{ fontWeight: 600, color: errors.email ? '#EF4444' : '#334155', transition: 'color 0.2s' }}>Email address</label>
                <div className="premium-input-wrapper">
                  <Mail
                    className="input-icon"
                    style={{
                      position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                      width: 15, height: 15, color: errors.email ? '#EF4444' : '#94A3B8',
                      transition: 'color 0.2s',
                    }}
                  />
                  <input
                    type="email"
                    className="input-base"
                    style={{
                      paddingLeft: 36,
                      height: 42,
                      fontSize: 13.5,
                      borderColor: errors.email ? '#EF4444' : '#E2E8F0',
                      transition: 'all 0.2s',
                    }}
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors({ ...errors, email: undefined });
                    }}
                  />
                </div>
                {errors.email && (
                  <p style={{ color: '#EF4444', fontSize: 11.5, marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 10 }}>⚠️</span> {errors.email}
                  </p>
                )}
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 600, color: errors.password ? '#EF4444' : '#334155', transition: 'color 0.2s' }}>Password</label>
                <div className="premium-input-wrapper">
                  <Lock
                    className="input-icon"
                    style={{
                      position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                      width: 15, height: 15, color: errors.password ? '#EF4444' : '#94A3B8',
                      transition: 'color 0.2s',
                    }}
                  />
                  <input
                    type="password"
                    className="input-base"
                    style={{
                      paddingLeft: 36,
                      height: 42,
                      fontSize: 13.5,
                      borderColor: errors.password ? '#EF4444' : '#E2E8F0',
                      transition: 'all 0.2s',
                    }}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors({ ...errors, password: undefined });
                    }}
                  />
                </div>
                {errors.password && (
                  <p style={{ color: '#EF4444', fontSize: 11.5, marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 10 }}>⚠️</span> {errors.password}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-premium-shimmer btn-lg"
                style={{ width: '100%', marginTop: 6, height: 42, fontSize: 14, justifyContent: 'center' }}
              >
                {loading
                  ? <Loader2 className="animate-spin" style={{ width: 16, height: 16 }} />
                  : <>Sign in <ArrowRight style={{ width: 15, height: 15, marginLeft: 6 }} /></>
                }
              </button>
            </form>
          </div>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#64748B', marginTop: 22 }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ color: '#0E6B50', fontWeight: 600, textDecoration: 'none' }}>
              Register workspace
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}




