import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";

const BACKEND_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1").replace(/\/api\/v1\/?$/, "");

const Projects = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const workspaceQuery = searchParams.get("workspace");

  const [projects, setProjects] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Project Resources state
  const [projectAttachments, setProjectAttachments] = useState([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [selectedResourceFile, setSelectedResourceFile] = useState(null);
  const [uploadingResource, setUploadingResource] = useState(false);
  const [resourceError, setResourceError] = useState("");
  const [resourceSuccess, setResourceSuccess] = useState("");
  const [linksFormData, setLinksFormData] = useState({ githubUrl: "", liveUrl: "" });
  const [savingLinks, setSavingLinks] = useState(false);

  // Form state for creating a project
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    workspace: workspaceQuery || ""
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  const projectQuery = searchParams.get("project");

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

  // If URL has ?project=<id>, auto-open that project modal
  useEffect(() => {
    if (projectQuery && projects.length > 0) {
      const match = projects.find((p) => p._id === projectQuery);
      if (match) {
        setSelectedProject(match);
      }
    }
  }, [projectQuery, projects]);

  // Load project resources whenever a project is selected
  useEffect(() => {
    if (selectedProject) {
      setLinksFormData({
        githubUrl: selectedProject.githubUrl || "",
        liveUrl: selectedProject.liveUrl || ""
      });
      setResourceError("");
      setResourceSuccess("");
      setSelectedResourceFile(null);
      fetchProjectAttachments(selectedProject._id);
    } else {
      setProjectAttachments([]);
    }
  }, [selectedProject]);

  const fetchProjectAttachments = async (projectId) => {
    try {
      setAttachmentsLoading(true);
      const res = await API.get(`/projects/${projectId}/attachments`);
      if (res.data?.success) {
        setProjectAttachments(res.data.data.attachments || []);
      }
    } catch {
      // Ignore initial fetch errors silently
    } finally {
      setAttachmentsLoading(false);
    }
  };

  const handleUploadResource = async (e) => {
    e.preventDefault();
    if (!selectedResourceFile) {
      setResourceError("Please select a file to upload");
      return;
    }

    const allowed = [".zip", ".pdf", ".docx", ".png", ".jpg", ".jpeg"];
    const fileExt = "." + selectedResourceFile.name.split(".").pop().toLowerCase();
    if (!allowed.includes(fileExt)) {
      setResourceError("Invalid file type. Allowed: ZIP, PDF, DOCX, PNG, JPG, JPEG.");
      return;
    }

    if (selectedResourceFile.size > 50 * 1024 * 1024) {
      setResourceError("File size exceeds 50 MB limit");
      return;
    }

    try {
      setUploadingResource(true);
      setResourceError("");
      setResourceSuccess("");

      const data = new FormData();
      data.append("file", selectedResourceFile);

      const res = await API.post(
        `/projects/${selectedProject._id}/attachments`,
        data,
        {
          headers: { "Content-Type": "multipart/form-data" }
        }
      );

      if (res.data?.success) {
        setResourceSuccess("File attached successfully!");
        setSelectedResourceFile(null);
        const fileInput = document.getElementById("project-resource-file-input");
        if (fileInput) fileInput.value = "";
        fetchProjectAttachments(selectedProject._id);
      }
    } catch (err) {
      setResourceError(err.response?.data?.message || "Failed to upload file");
    } finally {
      setUploadingResource(false);
    }
  };

  const handleDeleteProjectAttachment = async (attachmentId) => {
    if (!window.confirm("Are you sure you want to remove this resource file?")) return;
    try {
      const res = await API.delete(
        `/projects/${selectedProject._id}/attachments/${attachmentId}`
      );
      if (res.data?.success) {
        setProjectAttachments((prev) => prev.filter((a) => a._id !== attachmentId));
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete attachment");
    }
  };

  const handleSaveResourceLinks = async (e) => {
    e.preventDefault();
    try {
      setSavingLinks(true);
      setResourceError("");
      setResourceSuccess("");

      const res = await API.put(`/projects/${selectedProject._id}`, {
        githubUrl: linksFormData.githubUrl.trim(),
        liveUrl: linksFormData.liveUrl.trim()
      });

      if (res.data?.success) {
        setResourceSuccess("Project links saved successfully!");
        const updatedProj = res.data.data.project;
        setSelectedProject((prev) => ({
          ...prev,
          githubUrl: updatedProj.githubUrl,
          liveUrl: updatedProj.liveUrl
        }));
        setProjects((prev) =>
          prev.map((p) =>
            p._id === updatedProj._id
              ? { ...p, githubUrl: updatedProj.githubUrl, liveUrl: updatedProj.liveUrl }
              : p
          )
        );
      }
    } catch (err) {
      setResourceError(err.response?.data?.message || "Failed to save project links");
    } finally {
      setSavingLinks(false);
    }
  };

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
                  {(proj.githubUrl || proj.liveUrl) && (
                    <div className="flex items-center gap-3 pt-1">
                      {proj.githubUrl && (
                        <a
                          href={proj.githubUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 font-medium"
                        >
                          💻 GitHub
                        </a>
                      )}
                      {proj.liveUrl && (
                        <a
                          href={proj.liveUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium"
                        >
                          🌐 Live Demo
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                <button
                  onClick={() => setSelectedProject(proj)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium flex items-center gap-1"
                >
                  📁 View Details & Resources
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
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-xl space-y-4">
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
              <div className="max-h-36 overflow-y-auto space-y-2">
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

            {/* Project Resources */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>📁</span> Project Resources
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Final deliverables: Project ZIP file, documentation, GitHub repo, and live demo link.
                </p>
              </div>

              {resourceSuccess && (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs">
                  {resourceSuccess}
                </div>
              )}

              {resourceError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-xs">
                  {resourceError}
                </div>
              )}

              {/* Upload File */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Upload File
                </label>
                <form onSubmit={handleUploadResource} className="flex items-center gap-2">
                  <input
                    id="project-resource-file-input"
                    type="file"
                    accept=".zip,.pdf,.docx,.png,.jpg,.jpeg"
                    onChange={(e) => {
                      setSelectedResourceFile(e.target.files[0] || null);
                      setResourceError("");
                      setResourceSuccess("");
                    }}
                    className="flex-1 text-xs text-slate-600 dark:text-slate-300 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-slate-100 dark:file:bg-slate-700 file:text-slate-700 dark:file:text-slate-200 hover:file:bg-slate-200 dark:hover:file:bg-slate-600 cursor-pointer"
                  />
                  <button
                    type="submit"
                    disabled={uploadingResource || !selectedResourceFile}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors disabled:opacity-50 shrink-0 shadow-xs"
                  >
                    {uploadingResource ? "Uploading..." : "Upload"}
                  </button>
                </form>
                <p className="text-[11px] text-slate-400">
                  Supported formats: ZIP, PDF, DOCX, PNG, JPG (Max 50 MB)
                </p>
              </div>

              {/* Uploaded Files List */}
              {attachmentsLoading ? (
                <p className="text-xs text-slate-400 text-center py-2">Loading attachments...</p>
              ) : projectAttachments.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Attached Files ({projectAttachments.length}):
                  </p>
                  <div className="max-h-36 overflow-y-auto space-y-1.5">
                    {projectAttachments.map((file) => {
                      const ext = (file.originalName || "").split(".").pop().toLowerCase();
                      const isZip = ext === "zip";
                      const isImg = ["png", "jpg", "jpeg"].includes(ext);
                      const fileIcon = isZip ? "📦" : isImg ? "🖼" : "📄";
                      const sizeFormatted = file.fileSize
                        ? file.fileSize > 1024 * 1024
                          ? `${(file.fileSize / (1024 * 1024)).toFixed(1)} MB`
                          : `${(file.fileSize / 1024).toFixed(1)} KB`
                        : null;
                      const fileUrl =
                        file.url ||
                        (file.filePath
                          ? file.filePath.startsWith("http")
                            ? file.filePath
                            : `${BACKEND_BASE_URL}${file.filePath.startsWith("/") ? "" : "/"}${file.filePath}`
                          : null);

                      return (
                        <div
                          key={file._id}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs"
                        >
                          <div className="flex items-center gap-2 truncate mr-2">
                            <span className="text-base">{fileIcon}</span>
                            <div className="truncate">
                              <p className="font-medium text-slate-800 dark:text-slate-200 truncate" title={file.originalName}>
                                {file.originalName}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {sizeFormatted ? `${sizeFormatted} • ` : ""}
                                {file.uploadedBy?.name ? `Uploaded by ${file.uploadedBy.name}` : "Uploaded"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {fileUrl && (
                              <a
                                href={fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                download
                                className="px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-xs font-medium transition-colors"
                              >
                                Download
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteProjectAttachment(file._id)}
                              className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                              title="Delete file"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* Links Form */}
              <form onSubmit={handleSaveResourceLinks} className="space-y-3 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      GitHub Repository
                    </label>
                    {linksFormData.githubUrl && (
                      <a
                        href={linksFormData.githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                      >
                        Open ↗
                      </a>
                    )}
                  </div>
                  <input
                    type="url"
                    value={linksFormData.githubUrl}
                    onChange={(e) => setLinksFormData({ ...linksFormData, githubUrl: e.target.value })}
                    placeholder="https://github.com/username/repository"
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Live Demo URL
                    </label>
                    {linksFormData.liveUrl && (
                      <a
                        href={linksFormData.liveUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium"
                      >
                        Open ↗
                      </a>
                    )}
                  </div>
                  <input
                    type="url"
                    value={linksFormData.liveUrl}
                    onChange={(e) => setLinksFormData({ ...linksFormData, liveUrl: e.target.value })}
                    placeholder="https://yourproject.com"
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={savingLinks}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors disabled:opacity-50 shadow-xs"
                  >
                    {savingLinks ? "Saving..." : "Save"}
                  </button>
                </div>
              </form>
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
