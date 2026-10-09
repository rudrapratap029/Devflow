import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import API from "../services/api";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const urlRole = searchParams.get("role");
  const validRole = ["admin", "company", "developer"].includes(urlRole) ? urlRole : "developer";

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: validRole
  });
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState(
    location.state?.message || ""
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (urlRole && ["admin", "company", "developer"].includes(urlRole)) {
      setFormData((prev) => ({ ...prev, role: urlRole }));
    }
  }, [urlRole]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      const res = await API.post("/auth/login", formData);
      if (res.data.success) {
        const { user, accessToken, refreshToken } = res.data.data;
        login(user, accessToken, refreshToken);
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to sign in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 transition-colors selection:bg-indigo-600 selection:text-white">
      {/* Ambient background dot grid */}
      <div className="absolute inset-0 bg-dot-grid opacity-70 dark:opacity-30 pointer-events-none" />

      {/* Luminous floating ambient gradients */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-500/20 via-purple-500/15 to-transparent blur-3xl pointer-events-none animate-float-slow" />
      <div className="absolute -bottom-32 -right-32 w-[420px] h-[420px] rounded-full bg-gradient-to-tr from-sky-500/20 via-indigo-500/15 to-transparent blur-3xl pointer-events-none animate-pulse-glow" />

      {/* Floating decorative SaaS badges (Desktop only, subtle) */}
      <div className="hidden lg:flex items-center gap-2 absolute top-10 left-10 px-3.5 py-1.5 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-300 shadow-xs animate-float">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>Enterprise RBAC • Protected JWT Session</span>
      </div>

      <div className="hidden lg:flex items-center gap-2 absolute bottom-10 left-10 px-3.5 py-1.5 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-300 shadow-xs">
        <svg className="w-3.5 h-3.5 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
        <span>Dual Token Architecture • Silent Refresh</span>
      </div>

      {/* Top Right Theme Toggle & Return to Home */}
      <div className="absolute top-5 right-5 flex items-center gap-2 z-20">
        <Link
          to="/"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/80 dark:bg-[#111827]/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium transition-colors border border-slate-200/80 dark:border-slate-800 shadow-2xs backdrop-blur-sm"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6" />
          </svg>
          <span>Back to Home</span>
        </Link>
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
          className="p-2 rounded-lg bg-white/80 dark:bg-[#111827]/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm transition-colors border border-slate-200/80 dark:border-slate-800 shadow-2xs backdrop-blur-sm cursor-pointer"
          aria-label="Toggle dark mode"
        >
          {theme === "dark" ? (
            <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2" />
              <path d="M12 20v2" />
              <path d="m4.93 4.93 1.41 1.41" />
              <path d="m17.66 17.66 1.41 1.41" />
              <path d="M2 12h2" />
              <path d="M20 12h2" />
              <path d="m6.34 17.66-1.41 1.41" />
              <path d="m19.07 4.93-1.41 1.41" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
          )}
        </button>
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-md bg-white/95 dark:bg-[#111827]/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-7 sm:p-9 shadow-xl relative z-10 transition-all">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-500 flex items-center justify-center text-white font-black text-sm shadow-md group-hover:scale-105 transition-transform">
              WS
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              WorkSync
            </span>
          </Link>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            Sign in to your account
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Choose your platform role and enter your verified credentials
          </p>
        </div>

        {successMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs sm:text-sm flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-xs sm:text-sm flex items-start gap-2">
            <svg className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role Selection */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
              Select Role
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  label: "Admin",
                  value: "admin",
                  icon: (
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  )
                },
                {
                  label: "Company",
                  value: "company",
                  icon: (
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect width="16" height="20" x="4" y="2" rx="2" />
                      <path d="M9 22v-4h6v4" />
                      <path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" />
                    </svg>
                  )
                },
                {
                  label: "Developer",
                  value: "developer",
                  icon: (
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="16 18 22 12 16 6" />
                      <polyline points="8 6 2 12 8 18" />
                    </svg>
                  )
                }
              ].map(({ label, value, icon }) => (
                <label
                  key={value}
                  className={`flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all duration-150 ${
                    formData.role === value
                      ? "bg-indigo-50 dark:bg-indigo-950/70 border-indigo-600 dark:border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-600/20 shadow-xs"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={value}
                    checked={formData.role === value}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <span>{icon}</span>
                  <span className="text-[11px] font-bold">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Email input */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </span>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 shadow-2xs transition-all"
                placeholder="you@example.com"
              />
            </div>
          </div>

          {/* Password input */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 shadow-2xs transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white text-sm font-semibold shadow-md hover:shadow-indigo-500/25 transition-all disabled:opacity-50 mt-2 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6 pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
