import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";

const Users = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isApiUnavailable, setIsApiUnavailable] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Guard: Only Admin can access
  const isAdmin = user?.role === "admin";

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
        <div className="p-8 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 max-w-md mx-auto shadow-lg space-y-4">
          <div className="text-4xl">🚫</div>
          <h2 className="text-xl font-bold text-white">Access Denied</h2>
          <p className="text-sm text-slate-400">
            Only administrators have permission to access the Users Management page.
          </p>
          <div>
            <Link
              to="/dashboard"
              className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors inline-block"
            >
              ← Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Filter users by name or email
  const filteredUsers = users.filter((u) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    const name = (u.name || "").toLowerCase();
    const email = (u.email || "").toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  // Helper for role badge styling
  const getRoleBadge = (role) => {
    const r = (role || "developer").toLowerCase();
    if (r === "admin") {
      return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    }
    if (r === "manager") {
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    }
    return "bg-indigo-500/20 text-indigo-400 border-indigo-500/30";
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white">Users</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
              Admin Only
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            View registered users and assign tasks
          </p>
        </div>

        {!loading && !isApiUnavailable && (
          <div className="text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
            Total Users: <span className="font-semibold text-white">{users.length}</span>
          </div>
        )}
      </div>

      {/* Search Bar */}
      {!isApiUnavailable && (
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5">
          <div className="relative flex-1 w-full">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-8 pr-8 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* Clear API Unavailable Report */}
      {isApiUnavailable && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 text-amber-300 space-y-3">
          <div className="flex items-start space-x-3">
            <span className="text-2xl">⚠️</span>
            <div className="space-y-1">
              <h2 className="font-semibold text-white text-base">Backend API Unavailable</h2>
              <p className="text-sm text-slate-300">
                The backend endpoint <code className="bg-slate-900/80 px-2 py-0.5 rounded text-amber-400">GET /api/v1/users</code> is not implemented or unavailable on the server.
              </p>
              <p className="text-xs text-slate-400 pt-1">
                Note: In strict compliance with instructions, no dummy or fake data has been generated. When the API becomes available, users will automatically populate here.
              </p>
            </div>
          </div>
          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={fetchUsers}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
            >
              Retry API Request
            </button>
          </div>
        </div>
      )}

      {/* General Error (if not 404) */}
      {error && !isApiUnavailable && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={fetchUsers}
            className="text-xs underline hover:text-red-300 ml-4"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <span>Loading users...</span>
        </div>
      ) : !isApiUnavailable && (
        <>
          {/* Table Container */}
          <div className="bg-slate-800/50 border border-slate-700/70 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/80 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="py-3.5 px-4 sm:px-6">Name</th>
                    <th className="py-3.5 px-4 sm:px-6">Email</th>
                    <th className="py-3.5 px-4 sm:px-6">Role</th>
                    <th className="py-3.5 px-4 sm:px-6">Status</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60 text-sm">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        {searchQuery ? (
                          <div>
                            <p>No users matching &quot;{searchQuery}&quot;</p>
                            <button
                              onClick={() => setSearchQuery("")}
                              className="text-indigo-400 hover:underline text-xs mt-2"
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
                          className="hover:bg-slate-700/30 transition-colors"
                        >
                          {/* Name */}
                          <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                            <div className="flex items-center space-x-3">
                              {u.avatar ? (
                                <img
                                  src={u.avatar}
                                  alt={u.name || "User"}
                                  className="w-8 h-8 rounded-full object-cover border border-slate-700"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-semibold text-xs flex items-center justify-center">
                                  {(u.name || u.email || "U").charAt(0).toUpperCase()}
                                </div>
                              )}
                              <span className="font-medium text-white">
                                {u.name || "Unnamed User"}
                              </span>
                            </div>
                          </td>

                          {/* Email */}
                          <td className="py-3.5 px-4 sm:px-6 text-slate-300 whitespace-nowrap">
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

                          {/* Status */}
                          <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                            {isActive ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5"></span>
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-700/60 text-slate-400 border border-slate-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5"></span>
                                Inactive
                              </span>
                            )}
                          </td>

                          {/* Assign Task Button */}
                          <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                            <button
                              onClick={() => handleAssignTask(u)}
                              className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/30 hover:border-indigo-500 text-indigo-300 hover:text-white text-xs font-medium transition-colors"
                            >
                              Assign Task
                            </button>
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
    </div>
  );
};

export default Users;
