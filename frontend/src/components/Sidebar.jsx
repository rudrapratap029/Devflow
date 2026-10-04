import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: "📊" },
    { name: "Workspaces", path: "/workspaces", icon: "🏢" },
    { name: "Projects", path: "/projects", icon: "📁" },
    { name: "Task Board", path: "/task-board", icon: "📋" },
    ...(user?.role === "admin"
      ? [{ name: "Users", path: "/users", icon: "👥" }]
      : []),
    { name: "Activity", path: "/activity", icon: "⚡" },
    { name: "Profile", path: "/profile", icon: "👤" }
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col justify-between shrink-0 transform transition-transform duration-200 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="space-y-4">
          {/* Mobile Header with Close Button */}
          <div className="flex items-center justify-between md:hidden px-2 pt-1 pb-2 border-b border-slate-200 dark:border-slate-800">
            <span className="text-base font-bold text-slate-900 dark:text-white">DevFlow</span>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              ✕
            </button>
          </div>

          <nav className="space-y-1">
            <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Navigation
            </div>
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => onClose && onClose()}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`
                }
              >
                <span className="text-base shrink-0">{item.icon}</span>
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 px-3 text-[11px] text-slate-400 dark:text-slate-500">
          DevFlow v1.0 • Modern Workspace
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
