import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import NotificationDropdown from "./NotificationDropdown";

const Navbar = ({ onToggleMobileMenu }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">
      {/* Left: Mobile Menu Toggle & DevFlow Logo */}
      <div className="flex items-center space-x-3">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
            aria-label="Toggle navigation menu"
          >
            ☰
          </button>
        )}
        <Link
          to="/dashboard"
          className="text-xl font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          DevFlow
        </Link>
        <span className="hidden sm:inline-block text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
          v1.0
        </span>
      </div>

      {/* Right: Actions, Notifications, Theme Toggle, User & Logout */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Dark/Light Mode Toggle */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
          className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-sm transition-colors"
          aria-label="Toggle dark mode"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>

        {/* Real-time Notification Center */}
        <NotificationDropdown />

        {/* User Info */}
        <div className="hidden sm:flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center text-sm font-semibold">
            {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
          </div>
          <span className="text-sm font-medium text-slate-200 truncate max-w-[120px]">
            {user?.name || "Developer"}
          </span>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-500/10 hover:text-red-400 text-slate-300 border border-slate-700 hover:border-red-500/30 text-xs sm:text-sm font-medium transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default Navbar;
