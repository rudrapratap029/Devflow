import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import NotificationDropdown from "./NotificationDropdown";
import { getAvatarUrl } from "../services/api";

const Navbar = ({ onToggleMobileMenu }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between shadow-xs">
      {/* Left: Mobile Menu Toggle & DevFlow Logo */}
      <div className="flex items-center space-x-3">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700"
            aria-label="Toggle navigation menu"
          >
            ☰
          </button>
        )}
        <Link
          to="/dashboard"
          className="flex items-center gap-2.5 font-bold text-lg text-slate-900 dark:text-white hover:opacity-90 transition-opacity"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
            D
          </div>
          <span className="tracking-tight">DevFlow</span>
        </Link>
        <span className="hidden sm:inline-block text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
          v1.0
        </span>
      </div>

      {/* Right: Actions, Notifications, Theme Toggle, User & Logout */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Dark/Light Mode Toggle */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors border border-slate-200 dark:border-slate-700 shadow-2xs"
          aria-label="Toggle dark mode"
        >
          <span className="text-sm leading-none">{theme === "dark" ? "☀️" : "🌙"}</span>
          <span className="hidden md:inline font-medium">{theme === "dark" ? "Light" : "Dark"}</span>
        </button>

        {/* Real-time Notification Center */}
        <NotificationDropdown />

        {/* User Info */}
        <Link
          to="/profile"
          className="hidden sm:flex items-center space-x-2.5 pl-2 border-l border-slate-200 dark:border-slate-700 hover:opacity-90 transition-opacity"
          title="View Profile"
        >
          {user?.avatar ? (
            <img
              src={getAvatarUrl(user.avatar)}
              alt={user.name || "User Avatar"}
              className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-2xs"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold text-xs flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
          )}
          <div className="text-left">
            <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
              {user?.name || "Developer"}
            </span>
            <span className="block text-[10px] text-slate-500 dark:text-slate-400 capitalize">
              {user?.role || "Developer"}
            </span>
          </div>
        </Link>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="ml-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-900/50 text-xs sm:text-sm font-medium transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default Navbar;
