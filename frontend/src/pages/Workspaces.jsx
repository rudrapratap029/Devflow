import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";

const Workspaces = () => {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);

  // Form state for creating a workspace
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await API.get("/workspaces");
      if (res.data?.success) {
        setWorkspaces(res.data.data.workspaces || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load workspaces");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    setCreateError("");
    setCreateLoading(true);

    try {
      const res = await API.post("/workspaces", formData);
      if (res.data?.success) {
        setFormData({ name: "", description: "" });
        setShowModal(false);
        fetchWorkspaces();
      }
    } catch (err) {
      setCreateError(err.response?.data?.message || "Failed to create workspace");
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Workspaces</h1>
          <p className="text-sm text-slate-400 mt-1">
            Organize teams, projects, and collaboration environments
          </p>
        </div>
        <button
          onClick={() => {
            setCreateError("");
            setShowModal(true);
          }}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
        >
          + Create Workspace
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Workspace List */}
      {loading ? (
        <div className="py-12 text-center text-slate-400">Loading workspaces...</div>
      ) : workspaces.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/40 border border-slate-700/60 rounded-2xl p-8">
          <p className="text-slate-300 font-medium">No workspaces found</p>
          <p className="text-sm text-slate-400 mt-1 mb-4">
            Create your first workspace to start collaborating on projects.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium"
          >
            Create Workspace
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.map((ws) => (
            <div
              key={ws._id}
              className="bg-slate-800/70 border border-slate-700/80 rounded-xl p-5 hover:border-slate-600 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-white text-lg truncate">
                    {ws.name}
                  </h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-700 text-slate-300 border border-slate-600 shrink-0">
                    {ws.members?.length || 1} {ws.members?.length === 1 ? "Member" : "Members"}
                  </span>
                </div>
                <p className="text-sm text-slate-400 mt-2 line-clamp-2">
                  {ws.description || "No description provided."}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-700/60 flex items-center justify-between">
                <button
                  onClick={() => setSelectedWorkspace(ws)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  View Details
                </button>
                <Link
                  to={`/projects?workspace=${ws._id}`}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 text-xs font-medium transition-colors"
                >
                  Open Projects →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Workspace Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">
              Create New Workspace
            </h2>

            {createError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Workspace Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g. Engineering Team"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="What is this workspace for?"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {createLoading ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Workspace Details Modal */}
      {selectedWorkspace && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {selectedWorkspace.name}
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Owner: {selectedWorkspace.owner?.name || "Workspace Owner"}
                </p>
              </div>
              <button
                onClick={() => setSelectedWorkspace(null)}
                className="text-slate-400 hover:text-white text-lg font-semibold"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-slate-300 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
              {selectedWorkspace.description || "No description provided."}
            </p>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Members ({selectedWorkspace.members?.length || 0})
              </h3>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {selectedWorkspace.members?.map((member) => (
                  <div
                    key={member._id}
                    className="flex items-center space-x-3 p-2.5 rounded-lg bg-slate-900/40 border border-slate-800 text-sm"
                  >
                    <div className="w-7 h-7 rounded-full bg-indigo-600/30 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                      {member.name ? member.name.charAt(0) : "M"}
                    </div>
                    <div>
                      <p className="font-medium text-slate-200 text-xs sm:text-sm">
                        {member.name}
                      </p>
                      <p className="text-xs text-slate-500">{member.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-700/60">
              <Link
                to={`/projects?workspace=${selectedWorkspace._id}`}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
              >
                View Projects →
              </Link>
              <button
                onClick={() => setSelectedWorkspace(null)}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workspaces;
