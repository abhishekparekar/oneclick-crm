import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Lock, Mail, Briefcase, Eye, EyeOff, ArrowRight } from "lucide-react";
import logoImg from "../../assets/icoded_logo.jpg";

const ManagerLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login({ email, password });
      if (user.role === "Manager") {
        navigate("/manager/dashboard");
      } else if (user.role === "CompanyAdmin") {
        navigate("/company/dashboard");
      } else if (user.role === "SuperAdmin") {
        navigate("/superadmin/dashboard");
      } else {
        setError("Access denied. This portal is for Managers only.");
      }
    } catch (err) {
      setError(err.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e1a2e 40%, #0c1a2e 100%)",
      }}
    >
      {/* Animated background orbs */}
      <div
        className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #f97316 0%, transparent 70%)" }}
      />
      <div
        className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #0d9488 0%, transparent 70%)" }}
      />
      <div
        className="absolute top-[40%] left-[20%] w-[200px] h-[200px] rounded-full opacity-10 blur-2xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #7c3aed 0%, transparent 70%)" }}
      />

      {/* Card */}
      <div
        className="relative w-full max-w-md mx-4 rounded-2xl overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)",
        }}
      >
        {/* Top accent bar */}
        <div
          className="h-1 w-full"
          style={{ background: "linear-gradient(90deg, #f97316, #ea580c, #c2410c)" }}
        />

        <div className="p-8">
          {/* Logo & Title */}
          <div className="flex flex-col items-center mb-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.95)",
                boxShadow: "0 4px 20px rgba(249,115,22,0.3)",
              }}
            >
              <img src={logoImg} alt="Logo" className="w-12 h-12 object-contain" />
            </div>

            <div className="flex items-center gap-2 mb-2">
              <div
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest"
                style={{
                  background: "rgba(249,115,22,0.15)",
                  border: "1px solid rgba(249,115,22,0.3)",
                  color: "#f97316",
                }}
              >
                <Briefcase size={11} />
                Manager Portal
              </div>
            </div>

            <h1
              className="text-2xl font-black text-center"
              style={{ color: "#fff" }}
            >
              Welcome Back
            </h1>
            <p className="text-sm text-center mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
              Sign in to access your Manager dashboard
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              className="mb-5 px-4 py-3 rounded-xl text-sm font-medium flex items-start gap-2"
              style={{
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.25)",
                color: "#fca5a5",
              }}
            >
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label
                htmlFor="manager-email"
                className="block text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                Email / Phone
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail size={16} style={{ color: "rgba(255,255,255,0.3)" }} />
                </div>
                <input
                  id="manager-email"
                  type="text"
                  required
                  autoComplete="username"
                  placeholder="manager@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#fff",
                  }}
                  onFocus={(e) => {
                    e.target.style.border = "1px solid rgba(249,115,22,0.5)";
                    e.target.style.background = "rgba(255,255,255,0.08)";
                  }}
                  onBlur={(e) => {
                    e.target.style.border = "1px solid rgba(255,255,255,0.12)";
                    e.target.style.background = "rgba(255,255,255,0.06)";
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="manager-password"
                className="block text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock size={16} style={{ color: "rgba(255,255,255,0.3)" }} />
                </div>
                <input
                  id="manager-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-3 rounded-xl text-sm font-medium outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#fff",
                  }}
                  onFocus={(e) => {
                    e.target.style.border = "1px solid rgba(249,115,22,0.5)";
                    e.target.style.background = "rgba(255,255,255,0.08)";
                  }}
                  onBlur={(e) => {
                    e.target.style.border = "1px solid rgba(255,255,255,0.12)";
                    e.target.style.background = "rgba(255,255,255,0.06)";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center transition-opacity hover:opacity-70"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              id="manager-signin-btn"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all mt-2"
              style={{
                background: loading
                  ? "rgba(249,115,22,0.5)"
                  : "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                color: "#fff",
                boxShadow: loading ? "none" : "0 4px 20px rgba(249,115,22,0.35)",
                transform: loading ? "scale(0.98)" : "scale(1)",
                cursor: loading ? "not-allowed" : "pointer",
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = "scale(1.02)";
                  e.currentTarget.style.boxShadow = "0 6px 25px rgba(249,115,22,0.45)";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "0 4px 20px rgba(249,115,22,0.35)";
                }
              }}
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="rgba(255,255,255,0.3)"
                      strokeWidth="3"
                    />
                    <path
                      d="M12 2a10 10 0 0 1 10 10"
                      stroke="#fff"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Footer links */}
          <div className="mt-3 pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-center text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
              Admin or Super Admin?{" "}
              <Link
                to="/login"
                className="font-semibold transition-colors"
                style={{ color: "#f97316" }}
                onMouseEnter={(e) => (e.target.style.color = "#fb923c")}
                onMouseLeave={(e) => (e.target.style.color = "#f97316")}
              >
                Go to Admin Login →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerLogin;
