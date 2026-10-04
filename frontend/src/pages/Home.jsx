import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const Home = () => {
  const { isAuthenticated, user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col justify-between">
      {/* Top Header */}
      <header className="max-w-6xl w-full mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
            D
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            DevFlow
          </span>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors border border-slate-200 dark:border-slate-700 shadow-2xs"
            aria-label="Toggle dark mode"
          >
            <span className="text-sm leading-none">{theme === "dark" ? "☀️" : "🌙"}</span>
            <span className="hidden sm:inline">{theme === "dark" ? "Light" : "Dark"}</span>
          </button>

          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium transition-colors shadow-xs"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="px-3.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs sm:text-sm font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium transition-colors shadow-xs"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-6 py-12 text-center space-y-8 my-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
          <span>●</span> DevFlow • Project & Workspace Collaboration
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
          Manage Projects & Teams with <span className="text-indigo-600 dark:text-indigo-400">DevFlow</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Streamlined workspace management, Kanban boards, role-based access, task attachments, and team activity tracking built for modern engineering teams.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 font-medium text-white text-sm transition-colors shadow-xs"
            >
              Go to Dashboard ({user?.name || "User"}) →
            </Link>
          ) : (
            <>
              <Link
                to="/register"
                className="px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 font-medium text-white text-sm transition-colors shadow-xs"
              >
                Create Free Account
              </Link>
              <Link
                to="/login"
                className="px-6 py-3 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-sm transition-colors shadow-xs"
              >
                Sign In
              </Link>
            </>
          )}
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-10 text-left">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm mb-3">
              1
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Workspaces & Projects</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Organize teams into isolated workspaces with dedicated projects and member permissions.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm mb-3">
              2
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Kanban Task Board</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Track task lifecycle from Todo to Done with priority badges, assignment, and due dates.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm mb-3">
              3
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Comments & Attachments</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Collaborate seamlessly on tasks with discussion threads, file uploads, and audit activity.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
        DevFlow • Modern Workspace & Collaboration Platform
      </footer>
    </div>
  );
};

export default Home;
