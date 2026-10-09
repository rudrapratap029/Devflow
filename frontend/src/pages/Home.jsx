import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

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
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-indigo-600 selection:text-white font-sans">
      {/* ============================================================== */}
      {/* 1. HEADER / NAVIGATION                                         */}
      {/* ============================================================== */}
      <header className="sticky top-0 z-50 w-full bg-white/90 dark:bg-[#0b0f19]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-500 flex items-center justify-center text-white font-black text-sm shadow-sm group-hover:scale-105 transition-transform">
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
              className="p-2 rounded-lg bg-white dark:bg-[#111827] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium transition-colors border border-slate-200/80 dark:border-slate-800 shadow-2xs cursor-pointer"
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
                  <path d="M12 3a6 6 0 0 0 9 9 9 0 1 1-9-9Z" />
                </svg>
              )}
            </button>

            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold transition-all shadow-xs hover:shadow-indigo-500/20"
              >
                <span>Dashboard</span>
                <span className="hidden sm:inline opacity-80 font-normal">({user?.name || "User"})</span>
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs sm:text-sm font-semibold transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold transition-all shadow-xs hover:shadow-indigo-500/25"
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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
          <div className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] px-6 py-4 space-y-2.5">
            <button
              onClick={() => scrollToSection("hero")}
              className="block w-full text-left py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection("features")}
              className="block w-full text-left py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection("how-it-works")}
              className="block w-full text-left py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection("roles")}
              className="block w-full text-left py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600"
            >
              Roles
            </button>
            <button
              onClick={() => scrollToSection("about")}
              className="block w-full text-left py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600"
            >
              About
            </button>
            <button
              onClick={() => scrollToSection("contact")}
              className="block w-full text-left py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600"
            >
              Contact
            </button>
          </div>
        )}
      </header>

      {/* ============================================================== */}
      {/* 2. HERO SECTION (REFINED PREMIUM UI & SUBTLE ANIMATIONS)       */}
      {/* ============================================================== */}
      <section id="hero" className="relative pt-16 sm:pt-24 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Subtle ambient light */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[360px] bg-gradient-to-tr from-indigo-500/10 via-sky-500/10 to-purple-500/10 blur-3xl pointer-events-none -z-10 rounded-full" />

        <div className="max-w-5xl mx-auto text-center space-y-7 animate-fade-in">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse"></span>
            <span>WorkSync • AI-Powered Team Collaboration &amp; Project Management Platform</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.12]">
            Work Better Together. <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 bg-clip-text text-transparent">
              Deliver Smarter with AI.
            </span>
          </h1>

          {/* Description */}
          <p className="text-base sm:text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal">
            WorkSync is an AI-powered collaboration platform where companies and developers can manage projects, assign tasks, submit work, review progress, and collaborate efficiently.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all shadow-md hover:shadow-indigo-500/25 hover:-translate-y-0.5 active:translate-y-0 group"
            >
              <span>Get Started</span>
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

          {/* Direct Portal Quick Navigation */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
            <span>Direct portal access:</span>
            <Link to="/login?role=company" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
              Company Portal
            </Link>
            <span>•</span>
            <Link to="/login?role=developer" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
              Developer Workspace
            </Link>
            <span>•</span>
            <Link to="/login?role=admin" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
              Admin Console
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 3. FEATURES SECTION (8 AUTHENTIC WORKSYNC FEATURES)            */}
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
              Every feature in WorkSync is purposefully built to replace fragmented tools with transparent, verifiable workflows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* 1. Project Management */}
            <div className="p-6 rounded-xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-500/40 dark:hover:border-indigo-500/40 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 shadow-xs flex flex-col justify-between group">
              <div>
                <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 21h18" />
                    <path d="M19 21v-4" />
                    <path d="M19 17a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v4" />
                    <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v12" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">1. Project Management</h3>
                <ul className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    <span>Create projects</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    <span>Manage requirements</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    <span>Track project progress</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* 2. Smart Task Management */}
            <div className="p-6 rounded-xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-500/40 dark:hover:border-indigo-500/40 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 shadow-xs flex flex-col justify-between group">
              <div>
                <div className="w-10 h-10 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <path d="M8 7v7" />
                    <path d="M12 7v4" />
                    <path d="M16 7v9" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">2. Smart Task Management</h3>
                <ul className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                    <span>Assign tasks</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                    <span>Manage priorities</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                    <span>Track task lifecycle</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* 3. AI Project Summary */}
            <div className="p-6 rounded-xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-500/40 dark:hover:border-indigo-500/40 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 shadow-xs flex flex-col justify-between group">
              <div>
                <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">3. AI Project Summary</h3>
                <ul className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                    <span>Uses real project data</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                    <span>Calculates task progress</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                    <span>Uses Groq API for AI insights</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* 4. AI Work Verification */}
            <div className="p-6 rounded-xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-500/40 dark:hover:border-indigo-500/40 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 shadow-xs flex flex-col justify-between group">
              <div>
                <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">4. AI Work Verification</h3>
                <ul className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Compare submitted work</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Check acceptance criteria</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Help companies review submissions</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* 5. Developer Work Submission */}
            <div className="p-6 rounded-xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-500/40 dark:hover:border-indigo-500/40 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 shadow-xs flex flex-col justify-between group">
              <div>
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" x2="12" y1="3" y2="15" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">5. Developer Submission</h3>
                <ul className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    <span>Uploaded files</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    <span>GitHub repository URL</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    <span>Live project URL</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    <span>Additional developer notes</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* 6. Review and Approval Workflow */}
            <div className="p-6 rounded-xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-500/40 dark:hover:border-indigo-500/40 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 shadow-xs flex flex-col justify-between group">
              <div>
                <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">6. Review &amp; Approval</h3>
                <ul className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                    <span>Company reviews work</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                    <span>Approves tasks</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                    <span>Tracks final completion</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* 7. Notifications */}
            <div className="p-6 rounded-xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-500/40 dark:hover:border-indigo-500/40 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 shadow-xs flex flex-col justify-between group">
              <div>
                <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">7. Notifications</h3>
                <ul className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    <span>Task assignment alerts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    <span>Work submission updates</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    <span>Approval &amp; completion notices</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* 8. Role Based Collaboration */}
            <div className="p-6 rounded-xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-500/40 dark:hover:border-indigo-500/40 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 shadow-xs flex flex-col justify-between group">
              <div>
                <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">8. Role Collaboration</h3>
                <ul className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    <span>Admin platform console</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    <span>Company organization portal</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    <span>Developer workspace</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 4. HOW IT WORKS SECTION                                        */}
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
              A structured 3-step collaboration cycle designed for complete accountability between companies and developers.
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
                Company creates projects and defines requirements.
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
                Developers accept projects, receive tasks, and complete assigned work.
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2.5 leading-relaxed">
                Developers manage tasks through interactive Kanban stages, discuss implementation details, and link deliverables directly to task cards.
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
                Developers submit work and companies review, verify, approve, and complete tasks.
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2.5 leading-relaxed">
                Submissions are evaluated against requirements using AI verification assistance. The company retains final sign-off authority to approve and mark tasks completed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 5. ROLE-BASED ACCESS & PORTALS (SECURITY ENFORCED)             */}
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
              WorkSync strictly isolates permissions across administrators, companies, and developers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. Company Role */}
            <div className="p-7 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
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
                  className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold text-center transition-colors shadow-2xs"
                >
                  Register as Company
                </Link>
                <Link
                  to="/login?role=company"
                  className="w-full py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold text-center transition-colors"
                >
                  Sign In to Company Portal
                </Link>
              </div>
            </div>

            {/* 2. Developer Role */}
            <div className="p-7 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
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
                  className="w-full py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-semibold text-center transition-colors shadow-2xs"
                >
                  Register as Developer
                </Link>
                <Link
                  to="/login?role=developer"
                  className="w-full py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold text-center transition-colors"
                >
                  Sign In to Developer Workspace
                </Link>
              </div>
            </div>

            {/* 3. Admin Role (Secure) */}
            <div className="p-7 rounded-2xl bg-white dark:bg-[#111827] border border-amber-200/80 dark:border-amber-900/50 shadow-xs flex flex-col justify-between relative overflow-hidden hover:shadow-md transition-shadow">
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
                  className="block w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-semibold text-center transition-colors shadow-2xs"
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
      {/* 7. CONTACT SECTION (REAL DEVELOPER INFORMATION)                */}
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
              Connect directly with the developer behind WorkSync for collaboration, queries, or deployment discussions.
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

                <div className="mt-5 space-y-3.5 text-xs pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
                  <div className="group">
                    <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">Email:</span>
                    <a
                      href="mailto:rudrapratp112005@gmail.com"
                      className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 text-indigo-600 dark:text-indigo-400 font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:border-indigo-500/40 inline-flex items-center gap-2 transition-all duration-150 break-all w-full"
                    >
                      <svg className="w-4 h-4 shrink-0 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                      <span>rudrapratp112005@gmail.com</span>
                    </a>
                  </div>

                  <div className="group">
                    <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">LinkedIn Profile:</span>
                    <a
                      href="https://www.linkedin.com/in/rudra-pratap-singh-52bab1288/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 text-sky-600 dark:text-sky-400 font-semibold hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:border-sky-500/40 inline-flex items-center justify-between transition-all duration-150 w-full"
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

              <div className="pt-4 mt-4 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center gap-2">
                <a
                  href="mailto:rudrapratp112005@gmail.com"
                  className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs text-center transition-colors shadow-2xs"
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
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
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
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
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
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
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
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm transition-colors shadow-2xs cursor-pointer"
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
      {/* 8. PROFESSIONAL FOOTER (UPDATED DEVELOPER CONTACT)             */}
      {/* ============================================================== */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#090d16] text-slate-600 dark:text-slate-400 pt-16 pb-12 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            {/* Brand column */}
            <div className="col-span-2 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
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
              &copy; {new Date().getFullYear()} WorkSync. All rights reserved.
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
