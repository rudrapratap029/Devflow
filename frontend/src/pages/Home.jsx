import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const CURRENT_YEAR = new Date().getFullYear();

const Home = () => {
  const { isAuthenticated, user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });

  // 3D Tilt state for the Hero Interactive Visual Element
  const [tilt, setTilt] = useState({ x: 4, y: -5 });
  const [isHovered, setIsHovered] = useState(false);
  const [heroTab, setHeroTab] = useState("kanban"); // "kanban" | "ai" | "activity"

  const handleHeroMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    // Map cursor position to subtle 3D rotational tilt (-6deg to +6deg)
    const rotateX = Number((((centerY - y) / centerY) * 6).toFixed(2));
    const rotateY = Number((((x - centerX) / centerX) * 7).toFixed(2));
    setTilt({ x: rotateX, y: rotateY });
  };

  const handleHeroMouseLeave = () => {
    setIsHovered(false);
    // Smoothly return to default isometric angle
    setTilt({ x: 3, y: -4 });
  };

  // Smooth scroll handler
  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) return;
    setContactSubmitted(true);
    setTimeout(() => {
      setContactForm({ name: "", email: "", subject: "", message: "" });
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-indigo-600 selection:text-white font-sans overflow-x-hidden">
      {/* ============================================================== */}
      {/* 1. HEADER / NAVIGATION                                         */}
      {/* ============================================================== */}
      <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-[#0b0f19]/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-500 flex items-center justify-center text-white font-black text-sm shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                WS
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                  WorkSync
                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200/70 dark:border-indigo-800/70">
                    AI Platform
                  </span>
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300">
            <button
              onClick={() => scrollToSection("hero")}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection("features")}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection("how-it-works")}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection("roles")}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
            >
              Roles
            </button>
            <button
              onClick={() => scrollToSection("about")}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
            >
              About
            </button>
            <button
              onClick={() => scrollToSection("contact")}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
            >
              Contact
            </button>
          </nav>

          {/* Right: Theme Toggle & Authentication Buttons */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={toggleTheme}
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
              className="p-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium transition-colors border border-slate-200/80 dark:border-slate-700/80 shadow-2xs cursor-pointer"
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

            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold transition-all shadow-sm hover:shadow-indigo-500/20 hover:-translate-y-0.5"
              >
                <span>Dashboard</span>
                <span className="hidden sm:inline opacity-80 font-normal">({user?.name || "User"})</span>
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs sm:text-sm font-semibold transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold transition-all shadow-sm hover:shadow-indigo-500/25 hover:-translate-y-0.5"
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle menu"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {mobileMenuOpen ? (
                  <path d="M18 6L6 18M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md px-6 py-4 space-y-2.5">
            <button
              onClick={() => scrollToSection("hero")}
              className="block w-full text-left py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 cursor-pointer"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection("features")}
              className="block w-full text-left py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 cursor-pointer"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection("how-it-works")}
              className="block w-full text-left py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 cursor-pointer"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection("roles")}
              className="block w-full text-left py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 cursor-pointer"
            >
              Roles
            </button>
            <button
              onClick={() => scrollToSection("about")}
              className="block w-full text-left py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 cursor-pointer"
            >
              About
            </button>
            <button
              onClick={() => scrollToSection("contact")}
              className="block w-full text-left py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 cursor-pointer"
            >
              Contact
            </button>
          </div>
        )}
      </header>

      {/* ============================================================== */}
      {/* 2. HERO SECTION WITH 3D INTERACTIVE WORKFLOW PERSPECTIVE       */}
      {/* ============================================================== */}
      <section id="hero" className="relative pt-12 sm:pt-20 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Subtle dot grid + ambient radial glow */}
        <div className="absolute inset-0 bg-dot-grid opacity-60 dark:opacity-40 pointer-events-none -z-20" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[400px] bg-gradient-to-tr from-indigo-500/15 via-sky-500/12 to-purple-500/12 blur-3xl pointer-events-none -z-10 rounded-full" />

        <div className="max-w-6xl mx-auto text-center space-y-7 animate-fade-in">
          {/* Top Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-50/90 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 shadow-xs hover:border-indigo-400 transition-colors">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>WorkSync 2.0 • AI-Powered Team Collaboration &amp; Project Management</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.12]">
            Work Better Together. <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 bg-clip-text text-transparent">
              Deliver Smarter with AI.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal">
            WorkSync is an intelligent collaboration platform where companies and developers manage projects, track tasks, submit deliverables, and verify acceptance criteria using Groq AI.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0 group cursor-pointer"
            >
              <span>Get Started Free</span>
              <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" x2="19" y1="12" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>

            <button
              onClick={() => scrollToSection("features")}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white dark:bg-[#111827] hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-sm transition-all shadow-2xs hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <span>Explore Features</span>
              <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          </div>

          {/* Direct Portal Links */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
            <span>Direct access:</span>
            <Link to="/login?role=company" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
              Company Portal
            </Link>
            <span>•</span>
            <Link to="/login?role=developer" className="font-semibold text-sky-600 dark:text-sky-400 hover:underline">
              Developer Workspace
            </Link>
            <span>•</span>
            <Link to="/login?role=admin" className="font-semibold text-amber-600 dark:text-amber-400 hover:underline">
              Admin Console
            </Link>
          </div>

          {/* ============================================================== */}
          {/* SUBTLE 3D INTERACTIVE WORKFLOW CANVAS (LINEAR / NOTION STYLE)  */}
          {/* ============================================================== */}
          <div className="pt-10 sm:pt-14 perspective-1200">
            <div
              onMouseMove={handleHeroMouseMove}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={handleHeroMouseLeave}
              style={{
                transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                transition: isHovered
                  ? "transform 0.08s ease-out"
                  : "transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)"
              }}
              className="preserve-3d shadow-3d relative rounded-2xl bg-white/95 dark:bg-[#0f172a]/95 border border-slate-200/90 dark:border-slate-700/80 p-3 sm:p-5 text-left select-none transition-shadow duration-300"
            >
              {/* Window Title Bar */}
              <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
                    <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 pl-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
                    <span className="text-slate-400 dark:text-slate-500">workspaces /</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">sprint-24-core</span>
                  </div>
                </div>

                {/* Interactive Mode Switcher Tabs */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200/70 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setHeroTab("kanban")}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      heroTab === "kanban"
                        ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Sprint Kanban
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeroTab("ai")}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      heroTab === "ai"
                        ? "bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
                    Groq AI Verify
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeroTab("activity")}
                    className={`hidden sm:inline-block px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      heroTab === "activity"
                        ? "bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Activity Log
                  </button>
                </div>

                {/* Live socket ping */}
                <div className="hidden lg:flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>Live Socket Sync</span>
                </div>
              </div>

              {/* Tab 1: Kanban Board View */}
              {heroTab === "kanban" && (
                <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {/* Column 1: To Do */}
                  <div className="bg-slate-50/70 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-200/60 dark:border-slate-800/60">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">To Do</span>
                      </div>
                      <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        2
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      <div className="p-3 rounded-lg bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/70 shadow-2xs hover:border-indigo-400 transition-colors">
                        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 mb-1.5">
                          <span className="text-indigo-600 dark:text-indigo-400">#WS-104</span>
                          <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
                            High
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-100">
                          Setup OAuth 2.0 PKCE authentication flow
                        </p>
                        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                            $450
                          </span>
                          <span className="text-[10px]">Due Oct 15</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/70 shadow-2xs hover:border-indigo-400 transition-colors">
                        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 mb-1.5">
                          <span className="text-indigo-600 dark:text-indigo-400">#WS-105</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            Medium
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-100">
                          Implement webhook retry policy with backoff
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: In Progress */}
                  <div className="bg-slate-50/70 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-200/60 dark:border-slate-800/60">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">In Progress</span>
                      </div>
                      <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300">
                        1
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-white dark:bg-slate-800/90 border border-sky-300/80 dark:border-sky-500/40 shadow-xs">
                      <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 mb-1.5">
                        <span className="text-sky-600 dark:text-sky-400 font-mono">#WS-101</span>
                        <span className="px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 font-bold border border-sky-200 dark:border-sky-800">
                          Active Dev
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">
                        Groq AI Deliverable Verification Engine
                      </p>
                      <div className="mt-2.5 space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-500">
                          <span>Completion</span>
                          <span className="font-semibold text-sky-600">82%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-sky-500 to-indigo-600 rounded-full w-[82%]"></div>
                        </div>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[10px] text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[9px]">R</span>
                          <span>Rudra P.</span>
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">PR #42 linked</span>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: AI Verified & Completed */}
                  <div className="bg-slate-50/70 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-200/60 dark:border-slate-800/60">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Verified &amp; Done</span>
                      </div>
                      <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                        3
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      <div className="p-3 rounded-lg bg-white dark:bg-slate-800/90 border border-emerald-300/80 dark:border-emerald-500/40 shadow-2xs">
                        <div className="flex items-center justify-between text-[10px] font-semibold mb-1.5">
                          <span className="text-emerald-600 dark:text-emerald-400 font-mono">#WS-098</span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                            ✓ Score 98%
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-100">
                          Multi-tier RBAC authentication middleware
                        </p>
                        <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
                          <span>Signed off by Acme Corp</span>
                          <span className="text-emerald-500 font-bold">Approved</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/70 shadow-2xs">
                        <div className="flex items-center justify-between text-[10px] font-semibold mb-1.5">
                          <span className="text-slate-400 font-mono">#WS-097</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[10px]">
                            Completed
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          JWT refresh token rotation &amp; cookies
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Groq AI Verification Studio */}
              {heroTab === "ai" && (
                <div className="pt-4 space-y-3">
                  <div className="p-4 rounded-xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-800/50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-purple-200/70 dark:border-purple-800/40">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                          AI Verification Engine • Groq LLM
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                          Task #WS-101: Groq AI Deliverable Verification
                        </h4>
                      </div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        Confidence Score: 98/100 (Pass)
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 text-xs">
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <div className="text-[10px] font-semibold text-slate-400 uppercase">Criteria 1</div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">Code Acceptance Checks</div>
                        <div className="text-emerald-600 dark:text-emerald-400 text-[11px] mt-1 font-medium">✓ 100% Passed (14 tests)</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <div className="text-[10px] font-semibold text-slate-400 uppercase">Criteria 2</div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">GitHub Repository Link</div>
                        <div className="text-emerald-600 dark:text-emerald-400 text-[11px] mt-1 font-medium">✓ Validated &amp; Accessible</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <div className="text-[10px] font-semibold text-slate-400 uppercase">Criteria 3</div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">Deliverable Notes</div>
                        <div className="text-emerald-600 dark:text-emerald-400 text-[11px] mt-1 font-medium">✓ Comprehensive Summary</div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                        Evaluated against defined project requirements in 420ms via Groq Cloud
                      </span>
                      <button
                        type="button"
                        className="px-3 py-1 rounded-lg bg-indigo-600 text-white font-semibold text-[11px] hover:bg-indigo-700 transition-colors cursor-pointer"
                      >
                        Company Sign-Off
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Activity Stream View */}
              {heroTab === "activity" && (
                <div className="pt-4 space-y-2.5">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Task Completed:</span>
                      <span className="text-slate-600 dark:text-slate-400">Acme Corp signed off on #WS-098</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">12s ago</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">AI Verification:</span>
                      <span className="text-slate-600 dark:text-slate-400">Groq LLM verified deliverable #WS-101 (Score 98%)</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">1m ago</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Work Submitted:</span>
                      <span className="text-slate-600 dark:text-slate-400">Rudra P. attached GitHub PR #42</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">4m ago</span>
                  </div>
                </div>
              )}

              {/* Floating 3D Accent Badges */}
              <div className="hidden sm:flex absolute -top-4 -right-4 translate-z-36 bg-white/95 dark:bg-[#1e293b]/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 shadow-lg items-center gap-2 animate-float pointer-events-none">
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping"></span>
                <span className="text-xs font-bold text-slate-800 dark:text-white">Groq AI Verified</span>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/70 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                  98% Match
                </span>
              </div>

              <div className="hidden sm:flex absolute -bottom-4 -left-4 translate-z-24 bg-white/95 dark:bg-[#1e293b]/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 shadow-lg items-center gap-2.5 animate-float-slow pointer-events-none">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <div className="text-xs">
                  <span className="font-bold text-slate-800 dark:text-white">Realtime Sockets: </span>
                  <span className="text-slate-500 dark:text-slate-400">Zero Refresh Updates</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 3. FEATURES SECTION (BENTO GRID SaaS STYLE)                    */}
      {/* ============================================================== */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-[#0e1320]/50 transition-colors">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Core Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Engineered for Modern Engineering Teams
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              Every feature in WorkSync is built to replace fragmented project boards with transparent, verifiable workflows.
            </p>
          </div>

          {/* Modern Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bento 1: Groq AI Work Verification (Featured Span 2 cols) */}
            <div className="md:col-span-2 p-7 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 hover:border-purple-500/40 dark:hover:border-purple-500/40 hover:-translate-y-1 transition-all duration-300 shadow-xs flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    AI Automated
                  </span>
                </div>

                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Groq AI Deliverable Verification
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  Eliminate subjective disputes. WorkSync uses the high-speed Groq API to cross-reference developer submissions, GitHub repositories, and attached deliverables against defined task acceptance criteria.
                </p>

                {/* Visual mini-bar */}
                <div className="mt-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Acceptance Score Calculation</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">96 / 100</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full w-[96%]"></div>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                    <span>✓ Code structure match</span>
                    <span>✓ Repository commits linked</span>
                    <span>✓ Acceptance criteria satisfied</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bento 2: Smart Task & Sprint Management (Span 1 col) */}
            <div className="p-7 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 hover:border-sky-500/40 dark:hover:border-sky-500/40 hover:-translate-y-1 transition-all duration-300 shadow-xs flex flex-col justify-between group">
              <div>
                <div className="w-11 h-11 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <path d="M8 7v7" />
                    <path d="M12 7v4" />
                    <path d="M16 7v9" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Smart Task &amp; Sprint Kanban</h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  Assign sprint tasks, calibrate priority badges (Low, Medium, High, Urgent), set deadlines, and track real-time task lifecycle progression.
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center gap-2 text-xs text-sky-600 dark:text-sky-400 font-semibold">
                <span>Interactive Drag &amp; Drop</span>
                <span>•</span>
                <span>Lifecycle Audit</span>
              </div>
            </div>

            {/* Bento 3: Role-Based Access Isolation (Span 1 col) */}
            <div className="p-7 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-500/40 dark:hover:border-indigo-500/40 hover:-translate-y-1 transition-all duration-300 shadow-xs flex flex-col justify-between group">
              <div>
                <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Strict Role-Based Isolation</h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  Cryptographically verified JWT authorization separates Administrator oversight, Company workspace controls, and Developer execution environments.
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-slate-800/80 text-xs text-slate-500">
                <span>Admins • Companies • Developers</span>
              </div>
            </div>

            {/* Bento 4: Multi-Asset Work Submission (Span 1 col) */}
            <div className="p-7 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 hover:border-blue-500/40 dark:hover:border-blue-500/40 hover:-translate-y-1 transition-all duration-300 shadow-xs flex flex-col justify-between group">
              <div>
                <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" x2="12" y1="3" y2="15" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Multi-Artifact Submissions</h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  Submit work with full provenance: attach ZIP archives, link GitHub PR branches, specify live preview URLs, and provide detailed engineering changelogs.
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-slate-800/80 text-xs text-blue-600 dark:text-blue-400 font-semibold">
                <span>GitHub Repos + File Uploads</span>
              </div>
            </div>

            {/* Bento 5: Real-Time Sockets & Audit (Span 1 col) */}
            <div className="p-7 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 hover:border-amber-500/40 dark:hover:border-amber-500/40 hover:-translate-y-1 transition-all duration-300 shadow-xs flex flex-col justify-between group">
              <div>
                <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Live Socket Notifications</h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  Instant push updates whenever tasks are assigned, deliverables submitted, or reviews approved. No need to refresh the page.
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-slate-800/80 text-xs text-amber-600 dark:text-amber-400 font-semibold">
                <span>Instant In-App Alerts</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 4. HOW IT WORKS SECTION (CONNECTED PIPELINE)                   */}
      {/* ============================================================== */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 border-t border-slate-200/80 dark:border-slate-800/80 transition-colors">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              End-To-End Workflow
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              How WorkSync Works
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              A structured 3-stage delivery cycle designed for complete accountability between companies and developers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Step 1 */}
            <div className="p-7 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-indigo-500/40 hover:-translate-y-1 transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-extrabold text-sm flex items-center justify-center mb-5 shadow-sm">
                01
              </div>
              <div className="text-xs font-bold uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                Step 1: Setup &amp; Definition
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                Company creates projects &amp; defines requirements
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2.5 leading-relaxed">
                Organizations create workspaces, publish projects, outline measurable acceptance criteria, assign deadlines, and invite qualified developers.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-7 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-sky-500/40 hover:-translate-y-1 transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-sky-600 text-white font-extrabold text-sm flex items-center justify-center mb-5 shadow-sm">
                02
              </div>
              <div className="text-xs font-bold uppercase text-sky-600 dark:text-sky-400 tracking-wider">
                Step 2: Execution &amp; Delivery
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                Developers accept projects, build, &amp; submit work
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2.5 leading-relaxed">
                Developers manage tasks through interactive Kanban stages, link repository pull requests, upload assets, and submit deliverables for review.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-7 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-emerald-500/40 hover:-translate-y-1 transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-extrabold text-sm flex items-center justify-center mb-5 shadow-sm">
                03
              </div>
              <div className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                Step 3: AI Verification &amp; Approval
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                Groq AI verifies acceptance &amp; company signs off
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2.5 leading-relaxed">
                Submissions are evaluated against requirements using AI verification assistance. The company retains final sign-off authority to approve and mark tasks completed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 5. ROLE-BASED ACCESS & PORTALS                                 */}
      {/* ============================================================== */}
      <section id="roles" className="py-20 px-4 sm:px-6 lg:px-8 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-100/40 dark:bg-slate-900/40 transition-colors">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Role-Based Access Control
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Tailored Portals for Every Stakeholder
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              WorkSync strictly isolates permissions across administrators, organizations, and developers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. Company Role */}
            <div className="p-7 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between hover:border-indigo-400 hover:shadow-md transition-all">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 mb-4">
                  <span>Company Role</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Organization &amp; Hirers</h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  Post real projects, break down deliverables, run automated deliverable reachability checks, and maintain full approval control.
                </p>

                <div className="mt-4 pt-4 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>Public Registration Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>Company Verification by Admin</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>Redirects to Company Portal</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 flex flex-col gap-2">
                <Link
                  to="/register?role=company"
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold text-center transition-colors shadow-xs"
                >
                  Register as Company
                </Link>
                <Link
                  to="/login?role=company"
                  className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold text-center transition-colors"
                >
                  Sign In to Company Portal
                </Link>
              </div>
            </div>

            {/* 2. Developer Role */}
            <div className="p-7 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between hover:border-sky-400 hover:shadow-md transition-all">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 mb-4">
                  <span>Developer Role</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Engineers &amp; Builders</h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  Join active workspaces, pick up sprint tasks, upload submission assets, link repositories, and receive objective AI verification feedback.
                </p>

                <div className="mt-4 pt-4 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>Public Registration Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>Skill Profile &amp; Bio Matching</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>Redirects to Developer Dashboard</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 flex flex-col gap-2">
                <Link
                  to="/register?role=developer"
                  className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-semibold text-center transition-colors shadow-xs"
                >
                  Register as Developer
                </Link>
                <Link
                  to="/login?role=developer"
                  className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold text-center transition-colors"
                >
                  Sign In to Developer Workspace
                </Link>
              </div>
            </div>

            {/* 3. Admin Role */}
            <div className="p-7 rounded-2xl bg-white dark:bg-[#111827] border border-amber-200/80 dark:border-amber-900/50 shadow-xs flex flex-col justify-between relative overflow-hidden hover:border-amber-400 hover:shadow-md transition-all">
              <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                Restricted
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 mb-4">
                  <span>Admin Role</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Platform Administration</h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  Global supervision over workspaces, user verification, company vetting, activity logs, and system health.
                </p>

                <div className="mt-4 pt-4 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="text-rose-500 font-bold">✕</span>
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">No Public Signup Allowed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-600 font-bold">ℹ</span>
                    <span>Pre-Provisioned Database Account</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>Redirects to Admin Dashboard</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4">
                <Link
                  to="/login?role=admin"
                  className="block w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-semibold text-center transition-colors shadow-xs"
                >
                  Sign In to Admin Console
                </Link>
                <p className="text-[11px] text-center text-slate-500 dark:text-slate-400 mt-2">
                  Security enforced: Admin credentials must be pre-configured.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 6. ABOUT SECTION                                               */}
      {/* ============================================================== */}
      <section id="about" className="py-20 px-4 sm:px-6 lg:px-8 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-[#0e1320]/60 transition-colors">
        <div className="max-w-5xl mx-auto space-y-10 text-center">
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              About WorkSync
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Mission &amp; Architecture
            </h2>
          </div>

          {/* Exact required quotation */}
          <div className="p-8 sm:p-10 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-900/50 text-slate-800 dark:text-slate-200 text-base sm:text-lg font-medium leading-relaxed max-w-4xl mx-auto shadow-xs">
            &ldquo;WorkSync is an AI-powered team collaboration and project management platform that helps companies and developers manage projects, track tasks, submit work, and improve productivity.&rdquo;
          </div>

          {/* 4 Pillars Highlight */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left pt-2">
            <div className="p-5 rounded-xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-2xs hover:border-indigo-500/40 hover:-translate-y-0.5 transition-all">
              <div className="text-indigo-600 dark:text-indigo-400 font-extrabold text-sm mb-1">01</div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">AI-Powered Insights</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Objective Groq summaries and task verification powered strictly by verified database metrics.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-2xs hover:border-sky-500/40 hover:-translate-y-0.5 transition-all">
              <div className="text-sky-600 dark:text-sky-400 font-extrabold text-sm mb-1">02</div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">Transparent Workflow</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Clear task milestones from inception to submission, review, and company sign-off.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-2xs hover:border-emerald-500/40 hover:-translate-y-0.5 transition-all">
              <div className="text-emerald-600 dark:text-emerald-400 font-extrabold text-sm mb-1">03</div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">Better Collaboration</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Real-time activity audit logs, task discussions, and notification alerts for every status change.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-2xs hover:border-purple-500/40 hover:-translate-y-0.5 transition-all">
              <div className="text-purple-600 dark:text-purple-400 font-extrabold text-sm mb-1">04</div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">Efficient Management</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Unified workspace organization, sprint planning, and zero fabricated vanity numbers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 7. CONTACT SECTION (DEVELOPER INFORMATION)                     */}
      {/* ============================================================== */}
      <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8 border-t border-slate-200/80 dark:border-slate-800/80 transition-colors">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Get in Touch
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Contact &amp; Connect
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl mx-auto">
              Connect directly with the developer behind WorkSync for collaboration, technical discussion, or deployment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Real Developer Profile Card */}
            <div className="md:col-span-2 p-6 sm:p-7 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between hover:border-indigo-500/40 transition-colors">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 text-white font-bold text-base flex items-center justify-center shadow-xs">
                    RPS
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Rudra Pratap Singh
                    </h3>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold tracking-tight">
                      Full Stack Developer | AI &amp; MERN Stack Developer
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Specializing in scalable MERN architectures, Groq AI integrations, and high-performance collaboration workflows for engineering teams.
                </p>

                <div className="mt-5 space-y-3 text-xs pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
                  <div>
                    <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">Email:</span>
                    <a
                      href="mailto:rudrapratp112005@gmail.com"
                      className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 text-indigo-600 dark:text-indigo-400 font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:border-indigo-500/40 inline-flex items-center gap-2 transition-all duration-150 break-all w-full"
                    >
                      <svg className="w-4 h-4 shrink-0 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                      <span>rudrapratp112005@gmail.com</span>
                    </a>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">LinkedIn Profile:</span>
                    <a
                      href="https://www.linkedin.com/in/rudra-pratap-singh-52bab1288/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 text-sky-600 dark:text-sky-400 font-semibold hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:border-sky-500/40 inline-flex items-center justify-between transition-all duration-150 w-full"
                    >
                      <span className="inline-flex items-center gap-2">
                        <svg className="w-4 h-4 shrink-0 text-sky-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
                        <span>Rudra Pratap Singh</span>
                      </span>
                      <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-500 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
                    </a>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-0.5">GitHub Repository:</span>
                    <a
                      href="https://github.com/rudrapratap029/Devflow"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-700 dark:text-slate-300 font-medium hover:underline inline-flex items-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
                      <span>github.com/rudrapratap029/Devflow</span>
                    </a>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-200/80 dark:border-slate-800/80">
                <a
                  href="mailto:rudrapratp112005@gmail.com"
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs text-center transition-colors shadow-xs inline-block"
                >
                  Send an Email
                </a>
              </div>
            </div>

            {/* Direct Inquiry Message Form */}
            <div className="md:col-span-3 p-6 sm:p-7 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                Send a Direct Message
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Fill in your details below to send an inquiry or collaboration proposal.
              </p>

              {contactSubmitted ? (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm">
                  Thank you! Your message has been sent to Rudra Pratap Singh. We will be in touch shortly.
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-3.5 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                        Your Name
                      </label>
                      <input
                        type="text"
                        required
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        placeholder="John Doe"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                        Your Email
                      </label>
                      <input
                        type="email"
                        required
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        placeholder="you@company.com"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={contactForm.subject}
                      onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                      placeholder="Project Inquiry / Job Opportunity"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                      Message
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      placeholder="Write your message here..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm transition-colors shadow-xs cursor-pointer"
                  >
                    Send Message
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 8. FOOTER                                                      */}
      {/* ============================================================== */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#090d16] text-slate-600 dark:text-slate-400 pt-16 pb-12 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            {/* Brand column */}
            <div className="col-span-2 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                  WS
                </div>
                <span className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  WorkSync
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
                An AI-powered platform for project management, collaboration, and transparent work delivery.
              </p>
              <div className="pt-2">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Built with React 19, Node.js, Express, and Groq LLM
                </span>
              </div>
            </div>

            {/* Product Column */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Product
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button onClick={() => scrollToSection("features")} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer">
                    Features
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection("features")} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer">
                    AI Insights
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection("features")} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer">
                    Project Management
                  </button>
                </li>
              </ul>
            </div>

            {/* Platform Column */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Platform
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link to="/login?role=admin" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                    Admin
                  </Link>
                </li>
                <li>
                  <Link to="/login?role=company" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                    Company
                  </Link>
                </li>
                <li>
                  <Link to="/login?role=developer" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                    Developer
                  </Link>
                </li>
              </ul>
            </div>

            {/* Developer Contact Column */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Developer Contact
              </h4>
              <div className="space-y-2 text-xs">
                <div className="font-semibold text-slate-900 dark:text-white">
                  Rudra Pratap Singh
                </div>
                <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                  Full Stack Developer | AI &amp; MERN Stack Developer
                </div>
                <div className="pt-1 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 text-[11px] font-medium w-14">Email:</span>
                    <a
                      href="mailto:rudrapratp112005@gmail.com"
                      className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors break-all font-medium inline-flex items-center gap-1 hover:underline"
                    >
                      <svg className="w-3.5 h-3.5 shrink-0 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                      rudrapratp112005@gmail.com
                    </a>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 text-[11px] font-medium w-14">LinkedIn:</span>
                    <a
                      href="https://www.linkedin.com/in/rudra-pratap-singh-52bab1288/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 transition-colors inline-flex items-center gap-1 font-medium hover:underline"
                    >
                      <svg className="w-3.5 h-3.5 shrink-0 text-sky-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
                      <span>Rudra Pratap Singh</span>
                      <svg className="w-3 h-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Copyright */}
          <div className="pt-8 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
            <div>
              &copy; {CURRENT_YEAR} WorkSync. All rights reserved.
            </div>
            <div className="flex items-center gap-4">
              <span>Developer: Rudra Pratap Singh</span>
              <span>•</span>
              <a
                href="https://github.com/rudrapratap029/Devflow"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                GitHub Repository
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
