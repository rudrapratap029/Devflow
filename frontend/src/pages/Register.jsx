import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import API from "../services/api";

const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const urlRole = searchParams.get("role");
  const initialRole = urlRole === "company" ? "company" : "developer";

  const [role, setRole] = useState(initialRole);

  useEffect(() => {
    if (urlRole === "company" || urlRole === "developer") {
      setRole(urlRole);
    }
  }, [urlRole]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    companyName: "",
    industry: "",
    companyDescription: "",
    companyWebsite: "",
    companyLogo: ""
  });
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    setSuccess("");

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    // Role-specific payload
    const payload =
      role === "company"
        ? {
            role: "company",
            companyName: formData.companyName.trim(),
            email: formData.email.trim(),
            industry: formData.industry.trim(),
            companyDescription: formData.companyDescription.trim(),
            companyWebsite: formData.companyWebsite.trim(),
            companyLogo: formData.companyLogo.trim(),
            password: formData.password
          }
        : {
            role: "developer",
            name: formData.name.trim(),
            email: formData.email.trim(),
            password: formData.password
          };

    try {
      setLoading(true);
      const res = await API.post("/auth/register", payload);

      if (res.data?.success) {
        const msg =
          role === "company"
            ? "Company registered! Your account is Pending Verification by an Administrator. Redirecting to login..."
            : "Account created successfully! Redirecting to login...";
        setSuccess(msg);
        setTimeout(() => {
          navigate("/login", {
            state: { message: msg }
          });
        }, 1500);
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Registration failed. Please try again."
      );
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
        <span>Join WorkSync Platform • Transparent Work Delivery</span>
      </div>

      <div className="hidden lg:flex items-center gap-2 absolute bottom-10 left-10 px-3.5 py-1.5 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-300 shadow-xs">
        <svg className="w-3.5 h-3.5 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        <span>Automatic Password Hashing • Bcrypt Salt 10</span>
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

      <div className="w-full max-w-lg bg-white/95 dark:bg-[#111827]/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-7 sm:p-9 shadow-xl relative z-10 transition-all">
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
            {role === "company" ? "Company Registration" : "Developer Registration"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {role === "company"
              ? "Register your organization to publish projects and hire developers"
              : "Create your developer profile to discover and collaborate on projects"}
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="mb-5">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2 text-center">
            Register As
          </label>
          <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-900/60 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setRole("developer");
                setError("");
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                role === "developer"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold ring-1 ring-slate-200 dark:ring-slate-700"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
              <span>Developer</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRole("company");
                setError("");
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                role === "company"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold ring-1 ring-slate-200 dark:ring-slate-700"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="16" height="20" x="4" y="2" rx="2" />
                <path d="M9 22v-4h6v4" />
                <path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" />
              </svg>
              <span>Company</span>
            </button>
          </div>
        </div>

        {success && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs sm:text-sm">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-xs sm:text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ======================================================= */}
          {/* COMPANY REGISTRATION FIELDS */}
          {/* ======================================================= */}
          {role === "company" ? (
            <>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Company Name *
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  placeholder="e.g. Acme Technologies Inc."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Official Company Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  placeholder="contact@acme.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Industry *
                </label>
                <input
                  type="text"
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  placeholder="e.g. Software & Cloud Computing, FinTech, E-Commerce"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Company Description *
                </label>
                <textarea
                  name="companyDescription"
                  value={formData.companyDescription}
                  onChange={handleChange}
                  required
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  placeholder="Brief overview of your company, products, and engineering team..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Company Website (Optional)
                  </label>
                  <input
                    type="url"
                    name="companyWebsite"
                    value={formData.companyWebsite}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                    placeholder="https://acme.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Company Logo URL (Optional)
                  </label>
                  <input
                    type="url"
                    name="companyLogo"
                    value={formData.companyLogo}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                    placeholder="https://.../logo.png"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs">
                <span className="font-semibold">Verification Notice:</span> Company registrations require administrator approval before projects can be created and published.
              </div>
            </>
          ) : (
            /* ======================================================= */
            /* DEVELOPER REGISTRATION FIELDS */
            /* ======================================================= */
            <>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  placeholder="Alex Johnson"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  placeholder="you@example.com"
                />
              </div>
            </>
          )}

          {/* Password & Confirm Password (common to both) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Password *
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Confirm Password *
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                minLength={6}
                className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow-xs transition-colors disabled:opacity-50 mt-3"
          >
            {loading ? "Registering..." : role === "company" ? "Register Company" : "Register as Developer"}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
