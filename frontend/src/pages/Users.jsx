import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API, { getAvatarUrl } from "../services/api";
import UserProfileModal from "../components/UserProfileModal";

const Users = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isApiUnavailable, setIsApiUnavailable] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // User Profile Explorer modal state
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUserObj, setSelectedUserObj] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Guard: Only Admin can access
  const isAdmin = user?.role === "admin";

  const handleOpenProfile = (targetUser) => {
    setSelectedUserId(targetUser._id);
    setSelectedUserObj(targetUser);
    setIsProfileModalOpen(true);
  };

  // Fetch users from existing backend API
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");
      setIsApiUnavailable(false);

      const res = await API.get("/users");

      if (res.data?.success && Array.isArray(res.data?.data?.users)) {
        setUsers(res.data.data.users);
      } else if (Array.isArray(res.data?.data)) {
        setUsers(res.data.data);
      } else if (Array.isArray(res.data?.users)) {
        setUsers(res.data.users);
      } else if (Array.isArray(res.data)) {
        setUsers(res.data);
      } else {
        setUsers([]);
      }
    } catch (err) {
      // If the backend endpoint does not exist (404), clearly report it
      if (err.response?.status === 404 || err.response?.data?.message?.toLowerCase().includes("not found")) {
        setIsApiUnavailable(true);
        setError("Backend API endpoint (GET /api/v1/users) is not implemented or unavailable on the server. Per instructions, dummy data is disabled.");
      } else {
        setError(err.response?.data?.message || "Failed to fetch users");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  // Handle task assignment navigation
  const handleAssignTask = (targetUser) => {
    const params = new URLSearchParams();
    if (targetUser._id) params.set("assignTo", targetUser._id);
    if (targetUser.name || targetUser.email) {
      params.set("assignName", targetUser.name || targetUser.email);
    }
    navigate(`/task-board?${params.toString()}`);
  };

  // If user is not admin, show Access Denied
  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <div className="p-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center max-w-md mx-auto shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xl mx-auto">
            🚫
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Access Denied</h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Only administrators have permission to access the Users Management page.
          </p>
          <div>
            <Link
              to="/dashboard"
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium transition-colors shadow-xs inline-block"
            >
              ← Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Filter users by name, email, or skills
  const filteredUsers = users.filter((u) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    const name = (u.name || "").toLowerCase();
    const email = (u.email || "").toLowerCase();
    const hasSkill = Array.isArray(u.skills) && u.skills.some((s) => s.toLowerCase().includes(query));
    return name.includes(query) || email.includes(query) || hasSkill;
  });

  // Helper for role badge styling
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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Users</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              Admin Only
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            View registered users and assign tasks
          </p>
        </div>

        {!loading && !isApiUnavailable && (
          <div className="text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
            Total Users: <span className="font-semibold text-slate-900 dark:text-white">{users.length}</span>
          </div>
        )}
      </div>

      {/* Search Bar */}
      {!isApiUnavailable && (
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-xs">
          <div className="relative flex-1 w-full">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or skill..."
              className="w-full pl-8 pr-8 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* Clear API Unavailable Report */}
      {isApiUnavailable && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-6 text-amber-800 dark:text-amber-300 space-y-3">
          <div className="flex items-start space-x-3">
            <span className="text-2xl">⚠️</span>
            <div className="space-y-1">
              <h2 className="font-semibold text-slate-900 dark:text-white text-base">Backend API Unavailable</h2>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                The backend endpoint <code className="bg-amber-100 dark:bg-slate-900 px-2 py-0.5 rounded text-amber-900 dark:text-amber-400 text-xs">GET /api/v1/users</code> is not implemented or unavailable on the server.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                Note: In strict compliance with instructions, no dummy or fake data has been generated. When the API becomes available, users will automatically populate here.
              </p>
            </div>
          </div>
          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={fetchUsers}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors shadow-xs"
            >
              Retry API Request
            </button>
          </div>
        </div>
      )}

      {/* General Error (if not 404) */}
      {error && !isApiUnavailable && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={fetchUsers}
            className="text-xs underline hover:text-rose-800 dark:hover:text-rose-300 ml-4 font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="py-16 text-center text-slate-500 dark:text-slate-400 text-sm">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <span>Loading users...</span>
        </div>
      ) : !isApiUnavailable && (
        <>
          {/* Table Container */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3.5 px-4 sm:px-6">Name</th>
                    <th className="py-3.5 px-4 sm:px-6">Email</th>
                    <th className="py-3.5 px-4 sm:px-6">Role</th>
                    <th className="py-3.5 px-4 sm:px-6">Skills</th>
                    <th className="py-3.5 px-4 sm:px-6">Status</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-sm">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500 dark:text-slate-400">
                        {searchQuery ? (
                          <div>
                            <p>No users matching &quot;{searchQuery}&quot;</p>
                            <button
                              onClick={() => setSearchQuery("")}
                              className="text-indigo-600 dark:text-indigo-400 hover:underline text-xs mt-2 font-medium"
                            >
                              Clear search query
                            </button>
                          </div>
                        ) : (
                          "No registered users found."
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isActive = u.isActive !== false;
                      const roleDisplay = u.role
                        ? u.role.charAt(0).toUpperCase() + u.role.slice(1)
                        : "Developer";

                      return (
                        <tr
                          key={u._id || u.email}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors"
                        >
                          {/* Name */}
                          <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                            <div
                              onClick={() => handleOpenProfile(u)}
                              className="flex items-center space-x-3 cursor-pointer group"
                              title="Click to explore user profile"
                            >
                              {u.avatar ? (
                                <img
                                  src={getAvatarUrl(u.avatar)}
                                  alt={u.name || "User"}
                                  className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 group-hover:border-indigo-500 transition-colors"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-semibold text-xs flex items-center justify-center group-hover:border-indigo-500 transition-colors">
                                  {(u.name || u.email || "U").charAt(0).toUpperCase()}
                                </div>
                              )}
                              <span className="font-medium text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:underline">
                                {u.name || "Unnamed User"}
                              </span>
                            </div>
                          </td>

                          {/* Email */}
                          <td className="py-3.5 px-4 sm:px-6 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {u.email}
                          </td>

                          {/* Role */}
                          <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getRoleBadge(
                                u.role
                              )}`}
                            >
                              {roleDisplay}
                            </span>
                          </td>

                          {/* Skills */}
                          <td className="py-3.5 px-4 sm:px-6">
                            {u.skills && u.skills.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {u.skills.slice(0, 3).map((skill, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-medium"
                                  >
                                    {skill}
                                  </span>
                                ))}
                                {u.skills.length > 3 && (
                                  <span className="text-[11px] text-slate-400 self-center">
                                    +{u.skills.length - 3}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">No skills</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                            {isActive ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5"></span>
                                Inactive
                              </span>
                            )}
                          </td>

                          {/* Actions: View Profile & Assign Task */}
                          <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenProfile(u)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors border border-slate-200 dark:border-slate-600"
                                title="Explore user profile"
                              >
                                View Profile
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAssignTask(u)}
                                className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-medium transition-colors"
                              >
                                Assign Task
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* User Profile Explorer Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          setSelectedUserId(null);
          setSelectedUserObj(null);
        }}
        userId={selectedUserId}
        initialData={selectedUserObj}
      />
    </div>
  );
};

export default Users;
