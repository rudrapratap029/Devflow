import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";

const Dashboard = () => {
  const { user } = useAuth();
  const userRole = (user?.role || "developer").toLowerCase();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalWorkspaces: 0,
    totalProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Fetch overview, task status counts, recent activities, my tasks, and projects in parallel
        const [overviewRes, statusRes, activitiesRes, myTasksRes, projectsRes] =
          await Promise.allSettled([
            API.get("/dashboard/overview"),
            API.get("/dashboard/task-status"),
            API.get("/dashboard/recent-activities"),
            API.get("/dashboard/my-tasks"),
            API.get("/projects?limit=50")
          ]);

        const overview = overviewRes.status === "fulfilled" ? overviewRes.value.data?.data : {};
        const statusData = statusRes.status === "fulfilled" ? statusRes.value.data?.data : {};

        const completed = statusData?.done || 0;
        const pending = (statusData?.todo || 0) + (statusData?.inProgress || 0);

        setStats({
          totalWorkspaces: overview?.totalWorkspaces || 0,
          totalProjects: overview?.totalProjects || 0,
          totalTasks: overview?.totalTasks || 0,
          completedTasks: completed,
          pendingTasks: pending
        });

        if (activitiesRes.status === "fulfilled") {
          setRecentActivities(activitiesRes.value.data?.data?.activities || []);
        }

        if (myTasksRes.status === "fulfilled") {
          setMyTasks(myTasksRes.value.data?.data?.tasks || []);
        }

        if (projectsRes.status === "fulfilled") {
          const projs = projectsRes.value.data?.data?.projects || projectsRes.value.data?.projects || [];
          setProjects(projs);
        }
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Filter project submissions
  const submittedProjects = projects.filter(
    (p) => p.submissionStatus && p.submissionStatus !== "Not Submitted"
  );
  const aiReviewedProjects = projects.filter(
    (p) => p.aiReview && p.aiReview.overallScore != null
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ============================================================== */}
      {/* 1. WELCOME BANNER (ROLE-TAILORED) */}
      {/* ============================================================== */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
            {userRole === "admin"
              ? "Admin Console"
              : userRole === "company"
              ? "Company Portal"
              : "Developer Workspace"}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium capitalize">
            Role: <span className="font-semibold text-slate-900 dark:text-white">{userRole}</span>
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Welcome back, {user?.name || (userRole === "company" ? "Company" : "Developer")}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-2xl mt-1">
              {userRole === "admin"
                ? "Full administrative control: oversee users, workspaces, projects, developer submissions, and AI analytics."
                : userRole === "company"
                ? "Create and manage your organization projects, review developer submissions, and run AI-assisted project analyses."
                : "Track assigned sprint tasks, complete project deliverables, and review AI feedback on your submissions."}
            </p>
          </div>

          {/* Role specific quick action */}
          {userRole === "company" && (
            user?.verificationStatus === "Approved" ? (
              <Link
                to="/projects"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium shadow-xs shrink-0 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>+ New Project</span>
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-semibold">
                  <svg className="w-3.5 h-3.5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>Verification Pending</span>
                </span>
              </div>
            )
          )}

          {userRole === "admin" && (
            <div className="flex items-center gap-2 shrink-0">
              <Link
                to="/users"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors"
              >
                <span>Manage & Verify Companies</span>
              </Link>
              <Link
                to="/projects"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-xs transition-colors"
              >
                <span>All Projects</span>
              </Link>
            </div>
          )}
        </div>

        {/* Skills pill for developer */}
        {userRole === "developer" && user?.skills && user.skills.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/70">
            <span className="text-xs text-slate-400 dark:text-slate-500 mr-1">Skills:</span>
            {user.skills.slice(0, 5).map((skill, idx) => (
              <span
                key={idx}
                className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80"
              >
                {skill}
              </span>
            ))}
            {user.skills.length > 5 && (
              <span className="text-slate-400 dark:text-slate-500 text-xs ml-1">
                +{user.skills.length - 5} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Company Verification Banner */}
      {userRole === "company" && user?.verificationStatus === "Pending" && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex items-start gap-3 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
              Company Account Verification Pending
            </h3>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5 leading-relaxed">
              Your company registration has been submitted and is currently awaiting administrator review. Once verified by an admin, you can publish projects, review developer submissions, and generate AI evaluations.
            </p>
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-200/70 dark:bg-amber-900 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 shrink-0">
            Pending Approval
          </span>
        </div>
      )}

      {userRole === "company" && user?.verificationStatus === "Rejected" && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 flex items-start gap-3 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">
              Company Verification Rejected
            </h3>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5 leading-relaxed">
              Your company account was not approved by the administrator. Project creation and publishing permissions remain disabled. Please contact support if you believe this is an error.
            </p>
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-rose-200/70 dark:bg-rose-900 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-700 shrink-0">
            Rejected
          </span>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. ROLE-TAILORED METRIC CARDS */}
      {/* ============================================================== */}
      {userRole === "company" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Company: Total Projects */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Company Projects
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-3 mb-1">
              {loading ? "..." : projects.length}
            </p>
            <Link
              to="/projects"
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium inline-flex items-center gap-1 group"
            >
              <span>Manage Projects</span>
              <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" x2="19" y1="12" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>

          {/* Company: Active Projects */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Active Projects
              </span>
              <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold tracking-tight text-sky-600 dark:text-sky-400 mt-3 mb-1">
              {loading ? "..." : projects.filter((p) => p.status === "Active").length}
            </p>
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
              In Development
            </span>
          </div>

          {/* Company: Submissions Received */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Submissions Received
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" x2="8" y1="13" y2="13" />
                  <line x1="16" x2="8" y1="17" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400 mt-3 mb-1">
              {loading ? "..." : submittedProjects.length}
            </p>
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              Ready for Review
            </span>
          </div>

          {/* Company: AI Reviews Generated */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                AI Analyzed
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-3 mb-1">
              {loading ? "..." : aiReviewedProjects.length}
            </p>
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              AI Reports Generated
            </span>
          </div>
        </div>
      ) : (
        /* Developer / Admin default cards */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Projects */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {userRole === "admin" ? "Total Projects" : "Assigned Projects"}
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-3 mb-1">
              {loading ? "..." : stats.totalProjects}
            </p>
            <Link
              to="/projects"
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium inline-flex items-center gap-1 group"
            >
              <span>View Projects</span>
              <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" x2="19" y1="12" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>

          {/* Total Tasks / Pending */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {userRole === "admin" ? "Total Tasks" : "Pending Tasks"}
              </span>
              <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M8 7v7" />
                  <path d="M12 7v4" />
                  <path d="M16 7v9" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-3 mb-1">
              {loading ? "..." : userRole === "admin" ? stats.totalTasks : stats.pendingTasks}
            </p>
            <Link
              to="/task-board"
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium inline-flex items-center gap-1 group"
            >
              <span>Open Task Board</span>
              <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" x2="19" y1="12" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>

          {/* Completed Tasks */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Completed Tasks
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-3 mb-1">
              {loading ? "..." : stats.completedTasks}
            </p>
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Status: Done
            </span>
          </div>

          {/* Submissions / Workspaces */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {userRole === "admin" ? "Workspaces" : "Project Submissions"}
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400 mt-3 mb-1">
              {loading
                ? "..."
                : userRole === "admin"
                ? stats.totalWorkspaces
                : submittedProjects.length}
            </p>
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              {userRole === "admin" ? "Active Workspaces" : "Submissions Made"}
            </span>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. COMPANY DEDICATED SECTIONS */}
      {/* ============================================================== */}
      {userRole === "company" && (
        <div className="space-y-6">
          {/* Developer Submissions & Review Queue */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Developer Submissions & Review Queue</span>
                  {submittedProjects.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {submittedProjects.length}
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Submissions awaiting your evaluation and AI-assisted code review
                </p>
              </div>
              <Link
                to="/projects"
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium inline-flex items-center gap-1"
              >
                <span>All Projects</span>
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" x2="19" y1="12" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </div>

            {loading ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">Loading submissions...</p>
            ) : submittedProjects.length === 0 ? (
              <div className="text-center py-10 px-4 text-slate-400 dark:text-slate-500 text-xs sm:text-sm bg-slate-50/50 dark:bg-slate-900/30 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
                <svg className="w-9 h-9 mx-auto mb-2 text-slate-300 dark:text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" x2="8" y1="13" y2="13" />
                  <line x1="16" x2="8" y1="17" y2="17" />
                </svg>
                <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">No submissions received yet</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-md mx-auto">
                  When developers finish their project milestones and submit their work, deliverables will appear here for company review and AI-powered evaluation.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {submittedProjects.map((proj) => (
                  <div
                    key={proj._id}
                    className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900 dark:text-white text-sm">
                          {proj.name}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                          {proj.submissionStatus}
                        </span>
                        {proj.aiReview && proj.aiReview.overallScore != null && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            AI Score: {proj.aiReview.overallScore}%
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Submitted by:{" "}
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {proj.submittedBy?.name || "Developer"}
                        </span>
                        {proj.submittedAt && (
                          <span className="ml-2 text-slate-400">
                            • {new Date(proj.submittedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </p>
                      {proj.submissionNotes && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 italic line-clamp-1 mt-1">
                          "{proj.submissionNotes}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        to={`/projects?project=${proj._id}`}
                        className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-xs inline-flex items-center gap-1.5 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        <span>{proj.aiReview ? "View AI Review" : "Analyze with AI"}</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. DEVELOPER & ADMIN / COMMON SECTIONS */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Role-Tailored */}
        {userRole === "developer" ? (
          /* Developer: My Assigned Tasks */
          <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                  My Assigned Tasks
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Tasks assigned to you across sprints and projects
                </p>
              </div>
              <Link
                to="/task-board"
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium inline-flex items-center gap-1"
              >
                <span>Kanban Board</span>
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" x2="19" y1="12" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </div>

            {loading ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">Loading your tasks...</p>
            ) : myTasks.length === 0 ? (
              <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-xs sm:text-sm">
                <svg className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
                No tasks currently assigned to you.
              </div>
            ) : (
              <div className="space-y-2.5">
                {myTasks.slice(0, 5).map((task) => (
                  <Link
                    key={task._id}
                    to={`/tasks/${task._id}`}
                    className="block p-3.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-900 dark:text-slate-100 text-sm truncate">
                        {task.title}
                      </span>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                          task.status === "Done"
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                            : task.status === "In Progress"
                            ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                            : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600"
                        }`}
                      >
                        {task.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-2">
                      {task.project?.name && (
                        <span className="flex items-center gap-1 truncate max-w-[180px]">
                          <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
                          </svg>
                          <span className="truncate">{task.project.name}</span>
                        </span>
                      )}
                      <span
                        className={`capitalize flex items-center gap-1 font-medium ${
                          task.priority === "High"
                            ? "text-rose-600 dark:text-rose-400"
                            : task.priority === "Medium"
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          task.priority === "High" ? "bg-rose-500" : task.priority === "Medium" ? "bg-amber-500" : "bg-slate-400"
                        }`}></span>
                        {task.priority} Priority
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Company / Admin: Projects Overview */
          <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                  {userRole === "admin" ? "All Platform Projects" : "Company Project Portfolio"}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Active projects and deliverables overview
                </p>
              </div>
              <Link
                to="/projects"
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium inline-flex items-center gap-1"
              >
                <span>View All</span>
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" x2="19" y1="12" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </div>

            {loading ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">Loading projects...</p>
            ) : projects.length === 0 ? (
              <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-xs sm:text-sm">
                No projects found.
              </div>
            ) : (
              <div className="space-y-2.5">
                {projects.slice(0, 5).map((proj) => (
                  <Link
                    key={proj._id}
                    to={`/projects?project=${proj._id}`}
                    className="block p-3.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-900 dark:text-slate-100 text-sm truncate">
                        {proj.name}
                      </span>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                          proj.submissionStatus && proj.submissionStatus !== "Not Submitted"
                            ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                            : proj.status === "Completed"
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                            : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"
                        }`}
                      >
                        {proj.submissionStatus && proj.submissionStatus !== "Not Submitted"
                          ? proj.submissionStatus
                          : proj.status || "Active"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-2">
                      <span className="truncate">
                        Workspace: {proj.workspace?.name || "DevFlow"}
                      </span>
                      {proj.aiReview && proj.aiReview.overallScore != null && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                          AI Score: {proj.aiReview.overallScore}%
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Right Column: Developer Submissions/AI Feedback or Recent Activities */}
        {userRole === "developer" ? (
          /* Developer: My Project Submissions & AI Feedback */
          <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                  My Projects & AI Feedback
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Project deliverables status and company AI evaluations
                </p>
              </div>
              <Link
                to="/projects"
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium inline-flex items-center gap-1"
              >
                <span>All Projects</span>
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" x2="19" y1="12" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </div>

            {loading ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">Loading projects...</p>
            ) : projects.length === 0 ? (
              <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-xs sm:text-sm">
                No assigned projects yet.
              </div>
            ) : (
              <div className="space-y-3">
                {projects.slice(0, 5).map((proj) => (
                  <div
                    key={proj._id}
                    className="p-3.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-900 dark:text-slate-100 text-sm truncate">
                        {proj.name}
                      </span>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                          proj.submissionStatus === "Approved"
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                            : proj.submissionStatus === "Under Review" || proj.submissionStatus === "Submitted"
                            ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                            : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600"
                        }`}
                      >
                        {proj.submissionStatus || "Not Submitted"}
                      </span>
                    </div>

                    {proj.aiReview && proj.aiReview.overallScore != null ? (
                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                          <span>AI Score: {proj.aiReview.overallScore}%</span>
                        </div>
                        <Link
                          to={`/projects?project=${proj._id}`}
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                        >
                          View Feedback →
                        </Link>
                      </div>
                    ) : (
                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>{proj.submissionStatus === "Submitted" ? "Pending Company AI Review" : "Ready to deliver?"}</span>
                        <Link
                          to={`/projects?project=${proj._id}`}
                          className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                        >
                          {proj.submissionStatus === "Submitted" ? "View Details" : "Submit Work →"}
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Admin & Company: Recent Activities */
          <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                  Recent Team Activity
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Audit trail of project updates and changes
                </p>
              </div>
              <Link
                to="/activity"
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium inline-flex items-center gap-1"
              >
                <span>Full Log</span>
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" x2="19" y1="12" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </div>

            {loading ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">Loading activity...</p>
            ) : recentActivities.length === 0 ? (
              <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-xs sm:text-sm">
                <svg className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
                No recent activity logs recorded yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentActivities.slice(0, 6).map((activity) => (
                  <div
                    key={activity._id}
                    className="flex items-start space-x-3 p-3 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 text-sm"
                  >
                    <div className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 border border-indigo-100 dark:border-indigo-800/60">
                      {activity.user?.name ? activity.user.name.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {activity.user?.name || "User"}
                        </span>{" "}
                        {activity.description || activity.action}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                        {new Date(activity.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Developer view: include recent activity below if developer */}
      {userRole === "developer" && recentActivities.length > 0 && (
        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                Recent Team Activity
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Audit trail of project updates and changes
              </p>
            </div>
            <Link
              to="/activity"
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium inline-flex items-center gap-1"
            >
              <span>Full Log</span>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" x2="19" y1="12" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
          <div className="space-y-2.5">
            {recentActivities.slice(0, 4).map((activity) => (
              <div
                key={activity._id}
                className="flex items-start space-x-3 p-3 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 text-sm"
              >
                <div className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 border border-indigo-100 dark:border-indigo-800/60">
                  {activity.user?.name ? activity.user.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {activity.user?.name || "User"}
                    </span>{" "}
                    {activity.description || activity.action}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    {new Date(activity.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
