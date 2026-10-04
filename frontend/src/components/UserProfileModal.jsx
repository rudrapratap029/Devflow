import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API, { getAvatarUrl } from "../services/api";

const UserProfileModal = ({ isOpen, onClose, userId, initialData = null }) => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [userData, setUserData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || !userId) {
      setUserData(null);
      setError("");
      return;
    }

    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await API.get(`/users/${userId}`);
        if (res.data?.success && res.data.data) {
          setUserData(res.data.data);
        } else {
          setError("User profile not found");
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load user profile");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [isOpen, userId]);

  if (!isOpen) return null;

  // Role badge styling
  const getRoleBadge = (role) => {
    const r = (role || "developer").toLowerCase();
    if (r === "admin") {
      return "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800";
    }
    if (r === "manager") {
      return "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
    }
    return "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800";
  };

  const handleAssignTask = () => {
    if (!userData) return;
    onClose();
    const params = new URLSearchParams();
    if (userData._id) params.set("assignTo", userData._id);
    if (userData.name || userData.email) {
      params.set("assignName", userData.name || userData.email);
    }
    navigate(`/task-board?${params.toString()}`);
  };

  const user = userData || initialData || {};
  const isAvailable = user.isActive !== false;
  const roleDisplay = user.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : "Developer";

  const taskStats = user.taskStats || {
    total: user.pendingTasks !== undefined && user.completedTasks !== undefined
      ? user.pendingTasks + user.completedTasks
      : 0,
    pending: user.pendingTasks || 0,
    completed: user.completedTasks || 0
  };

  const canAssign = currentUser?.role === "admin" || currentUser?.role === "manager";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-2">
            <span className="text-lg">👤</span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              User Profile Explorer
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {loading && !userData ? (
            <div className="py-16 text-center text-slate-500 dark:text-slate-400 text-sm">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <span>Loading user profile details...</span>
            </div>
          ) : error && !userData ? (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-sm text-center">
              <p>{error}</p>
              <button
                onClick={onClose}
                className="mt-3 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-xs font-medium border border-rose-200 dark:border-rose-800"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Profile Card Summary */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80">
                {user.avatar ? (
                  <img
                    src={getAvatarUrl(user.avatar)}
                    alt={user.name || "User Avatar"}
                    className="w-20 h-20 rounded-full object-cover border-2 border-indigo-200 dark:border-indigo-800 shadow-sm shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-indigo-50 dark:bg-indigo-950 border-2 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold text-2xl flex items-center justify-center shadow-sm shrink-0">
                    {(user.name || user.email || "U").charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="text-center sm:text-left space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate">
                      {user.name || "Unnamed User"}
                    </h3>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getRoleBadge(
                        user.role
                      )} self-center sm:self-auto`}
                    >
                      {roleDisplay}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate">
                    {user.email || "No email"}
                  </p>
                  <div className="pt-1 flex items-center justify-center sm:justify-start gap-3 text-xs">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium ${
                        isAvailable
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isAvailable ? "bg-emerald-500" : "bg-slate-400"
                        }`}
                      ></span>
                      {isAvailable ? "Available" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Feature 2: Professional Bio */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Professional Bio
                </h4>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80">
                  {user.bio && user.bio.trim() ? (
                    <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed italic">
                      &ldquo;{user.bio}&rdquo;
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                      No professional bio provided yet.
                    </p>
                  )}
                </div>
              </div>

              {/* Feature 3: Skills */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Skills & Technical Expertise
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    {user.skills?.length || 0} skills
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 min-h-[44px]">
                  {user.skills && user.skills.length > 0 ? (
                    user.skills.map((skill, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                      No technical skills listed.
                    </span>
                  )}
                </div>
              </div>

              {/* Feature 4: Task Statistics Summary */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Task Assignment Summary
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 text-center">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Total Tasks</span>
                    <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                      {taskStats.total}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50 text-center">
                    <span className="text-xs text-amber-700 dark:text-amber-400">Pending Tasks</span>
                    <p className="text-lg sm:text-xl font-bold text-amber-700 dark:text-amber-300 mt-0.5">
                      {taskStats.pending}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/50 text-center">
                    <span className="text-xs text-emerald-700 dark:text-emerald-400">Completed</span>
                    <p className="text-lg sm:text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                      {taskStats.completed}
                    </p>
                  </div>
                </div>
              </div>

              {/* Workspaces & Projects Memberships */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Workspaces */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Workspaces ({user.workspaces?.length || 0})
                  </h4>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 min-h-[50px] space-y-1.5">
                    {user.workspaces && user.workspaces.length > 0 ? (
                      user.workspaces.map((ws, i) => (
                        <div key={ws._id || i} className="text-xs flex items-center gap-1.5">
                          <span>🏢</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {ws.name}
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">No workspaces</span>
                    )}
                  </div>
                </div>

                {/* Projects */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Projects ({user.projects?.length || 0})
                  </h4>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 min-h-[50px] space-y-1.5">
                    {user.projects && user.projects.length > 0 ? (
                      user.projects.map((proj, i) => (
                        <div key={proj._id || i} className="text-xs flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 truncate">
                            <span>📁</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                              {proj.name}
                            </span>
                          </div>
                          {proj.status && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                                proj.status === "Completed"
                                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                                  : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300"
                              }`}
                            >
                              {proj.status}
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">No projects</span>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40">
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Decision-support view for task assignment
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium transition-colors"
            >
              Close
            </button>
            {canAssign && (
              <button
                type="button"
                onClick={handleAssignTask}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium transition-colors shadow-xs"
              >
                Assign Task →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;
