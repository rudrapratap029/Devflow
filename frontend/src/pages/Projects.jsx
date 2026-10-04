import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import API from "../services/api";

const Projects = () => {
  const [searchParams] = useSearchParams();
  const workspaceQuery = searchParams.get("workspace");

  const [projects, setProjects] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Form state for creating a project
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    workspace: workspaceQuery || ""
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const projectUrl = workspaceQuery
        ? `/projects?workspace=${workspaceQuery}`
        : "/projects";

      const [projectsRes, workspacesRes] = await Promise.all([
        API.get(projectUrl),
        API.get("/workspaces")
      ]);

      if (projectsRes.data?.success) {
        setProjects(projectsRes.data.data.projects || []);
      }
      if (workspacesRes.data?.success) {
        const wsList = workspacesRes.data.data.workspaces || [];
        setWorkspaces(wsList);
        if (!formData.workspace && wsList.length > 0) {
          setFormData((prev) => ({
            ...prev,
            workspace: workspaceQuery || wsList[0]._id
          }));
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [workspaceQuery]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setCreateError("");
    setCreateLoading(true);

    try {
      const res = await API.post("/projects", formData);
      if (res.data?.success) {
        setFormData({
          name: "",
          description: "",
          workspace: workspaces[0]?._id || ""
        });
        setShowModal(false);
        fetchData();
      }
    } catch (err) {
      setCreateError(err.response?.data?.message || "Failed to create project");
    } finally {
      setCreateLoading(false);
    }
  };

  // Filter projects by search query
  const filteredProjects = projects.filter(
    (p) =>
      (p.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Projects</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {workspaceQuery
              ? "Filtered by selected workspace"
              : "Manage all collaborative projects across your workspaces"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {workspaceQuery && (
            <Link
              to="/projects"
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              Clear Workspace Filter
            </Link>
          )}
          <button
            onClick={() => {
              setCreateError("");
              setShowModal(true);
            }}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow-xs transition-colors"
          >
            + Create Project
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-sm">
            🔍
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects by name or description..."
            className="w-full pl-9 pr-3.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
          />
        </div>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            Clear Search
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Projects List */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-8 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl mx-auto mb-3">
            📁
          </div>
          <p className="text-slate-900 dark:text-white font-semibold">No projects found</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-4">
            {workspaces.length === 0
              ? "Please create a workspace first before adding projects."
              : "Start by creating a new project in one of your workspaces."}
          </p>
          {workspaces.length === 0 ? (
            <Link
              to="/workspaces"
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow-xs inline-block"
            >
              Go to Workspaces
            </Link>
          ) : (
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow-xs"
            >
              Create Project
            </button>
          )}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-xs">
          <p className="text-slate-700 dark:text-slate-300 font-medium">No projects match "{searchQuery}"</p>
          <button
            onClick={() => setSearchQuery("")}
            className="mt-3 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((proj) => (
            <div
              key={proj._id}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-900 dark:text-white text-base truncate">
                    {proj.name}
                  </h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 shrink-0 font-medium">
                    {proj.workspace?.name || "Workspace"}
                  </span>
                </div>

                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                  {proj.description || "No description provided."}
                </p>

                <div className="mt-4 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                  <p>
                    <span className="text-slate-400 dark:text-slate-500">Owner:</span>{" "}
                    <span className="text-slate-700 dark:text-slate-200 font-medium">
                      {proj.owner?.name || "Project Owner"}
                    </span>
                  </p>
                  <p>
                    <span className="text-slate-400 dark:text-slate-500">Members:</span>{" "}
                    <span className="text-slate-700 dark:text-slate-200 font-medium">
                      {proj.members?.length || 1} team member
                      {proj.members?.length === 1 ? "" : "s"}
                    </span>
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                <button
                  onClick={() => setSelectedProject(proj)}
                  className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium"
                >
                  View Details
                </button>
                <Link
                  to={`/task-board?project=${proj._id}`}
                  className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-xs font-medium transition-colors border border-indigo-200 dark:border-indigo-800"
                >
                  Open Board →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              Create New Project
            </h2>

            {createError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-sm">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Workspace *
                </label>
                <select
                  required
                  value={formData.workspace}
                  onChange={(e) =>
                    setFormData({ ...formData, workspace: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                >
                  {workspaces.map((ws) => (
                    <option key={ws._id} value={ws._id}>
                      {ws.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g. Mobile App Redesign"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Goals and scope of this project"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors disabled:opacity-50 shadow-xs"
                >
                  {createLoading ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project Details Modal */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {selectedProject.name}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Workspace: {selectedProject.workspace?.name || "Workspace"}
                </p>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-semibold"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
              {selectedProject.description || "No description provided."}
            </p>

            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <p>
                <span className="text-slate-400 dark:text-slate-500">Created by:</span>{" "}
                <span className="text-slate-700 dark:text-slate-200 font-medium">
                  {selectedProject.owner?.name || "Owner"}
                </span>
              </p>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                Team Members ({selectedProject.members?.length || 0})
              </h3>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {selectedProject.members?.map((member) => (
                  <div
                    key={member._id}
                    className="flex items-center space-x-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 text-sm"
                  >
                    <div className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-100 dark:border-indigo-800">
                      {member.name ? member.name.charAt(0) : "M"}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-200 text-xs sm:text-sm">
                        {member.name}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{member.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60">
              <Link
                to={`/task-board?project=${selectedProject._id}`}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors shadow-xs"
              >
                Open Kanban Board →
              </Link>
              <button
                onClick={() => setSelectedProject(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium"
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

export default Projects;
