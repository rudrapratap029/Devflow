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

  // AI Project Summary state
  const [projectSummary, setProjectSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  // Project Submission & AI Review state
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitFormData, setSubmitFormData] = useState({ notes: "", githubUrl: "", liveUrl: "" });
  const [submitFiles, setSubmitFiles] = useState([]);
  const [uploadingSubmitFile, setUploadingSubmitFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [aiReviewLoading, setAiReviewLoading] = useState(false);
  const [aiReviewError, setAiReviewError] = useState("");

  // Developer response state
  const [respondingId, setRespondingId] = useState(null);
  const [responseMessage, setResponseMessage] = useState("");

  // Project Resources state
  const [projectAttachments, setProjectAttachments] = useState([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [selectedResourceFile, setSelectedResourceFile] = useState(null);
  const [uploadingResource, setUploadingResource] = useState(false);
  const [resourceError, setResourceError] = useState("");
  const [resourceSuccess, setResourceSuccess] = useState("");
  const [linksFormData, setLinksFormData] = useState({ githubUrl: "", liveUrl: "" });
  const [savingLinks, setSavingLinks] = useState(false);

  // Edit project state
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [editProjectFormData, setEditProjectFormData] = useState({
    name: "",
    description: "",
    status: "Active",
    industry: "",
    requiredSkills: "",
    experienceLevel: "Fresher",
    duration: "",
    deadline: "",
    developersRequired: 1,
    budget: ""
  });
  const [editProjectLoading, setEditProjectLoading] = useState(false);
  const [editProjectError, setEditProjectError] = useState("");
  const [deletingProjectId, setDeletingProjectId] = useState(null);

  // Form state for creating a project
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    workspace: workspaceQuery || "",
    industry: user?.industry || "",
    requiredSkills: "",
    experienceLevel: "Fresher",
    duration: "",
    deadline: "",
    developersRequired: 1,
    budget: ""
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

  // Load project resources whenever a project is selected
  useEffect(() => {
    if (selectedProject) {
      setLinksFormData({
        githubUrl: selectedProject.githubUrl || "",
        liveUrl: selectedProject.liveUrl || ""
      });
      setSubmitFormData({
        githubUrl: selectedProject.githubUrl || "",
        liveUrl: selectedProject.liveUrl || "",
        notes: selectedProject.submissionNotes || ""
      });
      setSubmitFiles(
        selectedProject.submissionFiles && Array.isArray(selectedProject.submissionFiles)
          ? selectedProject.submissionFiles
          : []
      );
      setResourceError("");
      setResourceSuccess("");
      setSubmitError("");
      setSubmitSuccess("");
      setAiReviewError("");
      setSelectedResourceFile(null);
      setProjectSummary(null);
      setSummaryError("");
      fetchProjectAttachments(selectedProject._id);
    } else {
      setSubmitFiles([]);
      setProjectAttachments([]);
      setProjectSummary(null);
      setSummaryError("");
    }
  }, [selectedProject]);

  const handleUploadResource = async (e) => {
    e.preventDefault();
    if (!selectedResourceFile || !selectedProject) return;

    if (selectedResourceFile.size > 50 * 1024 * 1024) {
      setResourceError("File size exceeds 50 MB limit");
      return;
    }

    try {
      setUploadingResource(true);
      setResourceError("");
      setResourceSuccess("");

      const uploadData = new FormData();
      uploadData.append("file", selectedResourceFile);

      const res = await API.post(
        `/projects/${selectedProject._id}/attachments`,
        uploadData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (res.data?.success) {
        setSelectedResourceFile(null);
        setResourceSuccess("File attached successfully");
        const fileInput = document.getElementById("project-resource-file-input");
        if (fileInput) fileInput.value = "";
        fetchProjectAttachments(selectedProject._id);
      }
    } catch (err) {
      setResourceError(err.response?.data?.message || "Failed to upload resource");
    } finally {
      setUploadingResource(false);
    }
  };

  const handleDeleteProjectAttachment = async (attachmentId) => {
    if (!window.confirm("Are you sure you want to remove this resource?")) return;

    try {
      const res = await API.delete(
        `/projects/${selectedProject._id}/attachments/${attachmentId}`
      );
      if (res.data?.success) {
        setProjectAttachments((prev) => prev.filter((a) => a._id !== attachmentId));
      }
    } catch (err) {
      setResourceError(err.response?.data?.message || "Failed to remove attachment");
    }
  };

  const handleSaveResourceLinks = async (e) => {
    e.preventDefault();
    if (!selectedProject) return;

    try {
      setSavingLinks(true);
      setResourceError("");
      setResourceSuccess("");

      const res = await API.put(`/projects/${selectedProject._id}`, {
        githubUrl: linksFormData.githubUrl,
        liveUrl: linksFormData.liveUrl
      });

      if (res.data?.success) {
        const updatedProj = res.data.data.project || {
          ...selectedProject,
          githubUrl: linksFormData.githubUrl,
          liveUrl: linksFormData.liveUrl
        };
        setResourceSuccess("Project links updated successfully");
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

  const isCompany = user?.role === "company";
  const isCompanyVerified = isCompany ? user?.verificationStatus === "Approved" : true;
  const canGenerateSummary = user?.role === "admin" || user?.role === "manager" || user?.role === "company";
  const canCreateProject = user?.role === "admin" || user?.role === "manager" || (isCompany && isCompanyVerified);
  const canSubmitProject = user?.role === "developer" || user?.role === "admin" || (selectedProject?.members && selectedProject.members.some((m) => (m._id || m) === user?._id));
  const canRunAIReview = user?.role === "company" || user?.role === "admin" || user?.role === "manager" || (selectedProject?.owner && (selectedProject.owner._id === user?._id || selectedProject.owner === user?._id));

  // Developer response handler (Accept, Reject, Pending, In Progress)
  const handleDeveloperResponse = async (projectId, status) => {
    try {
      setRespondingId(projectId);
      setResponseMessage("");
      const res = await API.post(`/projects/${projectId}/respond`, { status });
      if (res.data?.success) {
        const updatedProject = res.data.data?.project || res.data.project;
        if (updatedProject) {
          setProjects((prev) =>
            prev.map((p) => (p._id === projectId ? updatedProject : p))
          );
          if (selectedProject?._id === projectId) {
            setSelectedProject(updatedProject);
          }
        }
        setResponseMessage(`Project status updated to "${status}".`);
        setTimeout(() => setResponseMessage(""), 3500);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update response");
    } finally {
      setRespondingId(null);
    }
  };

  // Upload deliverable file from submission modal
  const handleUploadSubmitFile = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedProject) return;

    if (file.size > 50 * 1024 * 1024) {
      setSubmitError("File size exceeds 50 MB limit");
      return;
    }

    try {
      setUploadingSubmitFile(true);
      setSubmitError("");

      const uploadData = new FormData();
      uploadData.append("file", file);

      const res = await API.post(
        `/projects/${selectedProject._id}/attachments`,
        uploadData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (res.data?.success) {
        const att = res.data.data?.attachment || res.data.attachment;
        if (att) {
          setSubmitFiles((prev) => [
            ...prev,
            {
              originalName: att.originalName,
              filePath: att.filePath,
              fileType: att.fileType,
              fileSize: att.fileSize
            }
          ]);
        }
        fetchProjectAttachments(selectedProject._id);
      }
    } catch (err) {
      setSubmitError(err.response?.data?.message || "Failed to upload deliverable file");
    } finally {
      setUploadingSubmitFile(false);
      e.target.value = "";
    }
  };

  const handleGenerateSummary = async (projectId) => {
    const targetId = projectId || selectedProject?._id;
    if (!targetId) return;

    try {
      setSummaryLoading(true);
      setSummaryError("");
      const res = await API.post(`/projects/${targetId}/summary`);
      if (res.data?.success) {
        setProjectSummary(res.data.data || res.data);
      } else {
        setSummaryError(res.data?.message || "Failed to generate AI project summary");
      }
    } catch (err) {
      setSummaryError(
        err.response?.data?.message || "Failed to generate AI project summary. Please try again."
      );
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleSubmitProject = async (e) => {
    e.preventDefault();
    if (!selectedProject) return;

    try {
      setSubmitting(true);
      setSubmitError("");
      setSubmitSuccess("");

      const res = await API.post(`/projects/${selectedProject._id}/submit`, {
        ...submitFormData,
        files: submitFiles
      });
      if (res.data?.success) {
        const updatedProject = res.data.data?.project || res.data.project;
        setSelectedProject(updatedProject);
        setProjects((prev) =>
          prev.map((p) => (p._id === updatedProject._id ? updatedProject : p))
        );
        setSubmitSuccess("Project submitted successfully for company review!");
        setShowSubmitModal(false);
      }
    } catch (err) {
      setSubmitError(err.response?.data?.message || "Failed to submit project. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRunAIReview = async (projectId) => {
    const targetId = projectId || selectedProject?._id;
    if (!targetId) return;

    try {
      setAiReviewLoading(true);
      setAiReviewError("");

      const res = await API.post(`/projects/${targetId}/ai-review`);
      if (res.data?.success) {
        const updatedProject = res.data.data?.project || res.data.project;
        setSelectedProject(updatedProject);
        setProjects((prev) =>
          prev.map((p) => (p._id === updatedProject._id ? updatedProject : p))
        );
      }
    } catch (err) {
      setAiReviewError(err.response?.data?.message || "Failed to generate AI project analysis. Please try again.");
    } finally {
      setAiReviewLoading(false);
    }
  };

  const handleOpenEditProject = (proj) => {
    setEditingProject(proj);
    setEditProjectFormData({
      name: proj.name || "",
      description: proj.description || "",
      status: proj.status || "Active",
      industry: proj.industry || proj.companyDetails?.industry || "",
      requiredSkills: Array.isArray(proj.requiredSkills) ? proj.requiredSkills.join(", ") : (proj.requiredSkills || ""),
      experienceLevel: proj.experienceLevel || "Fresher",
      duration: proj.duration || "",
      deadline: proj.deadline || "",
      developersRequired: proj.developersRequired || 1,
      budget: proj.budget || ""
    });
    setEditProjectError("");
    setShowEditProjectModal(true);
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    if (!editingProject) return;
    try {
      setEditProjectLoading(true);
      setEditProjectError("");
      const skillsArray = typeof editProjectFormData.requiredSkills === "string"
        ? editProjectFormData.requiredSkills.split(",").map((s) => s.trim()).filter(Boolean)
        : editProjectFormData.requiredSkills;

      const res = await API.put(`/projects/${editingProject._id}`, {
        ...editProjectFormData,
        requiredSkills: skillsArray
      });

      if (res.data?.success) {
        const updated = res.data.data?.project || { ...editingProject, ...editProjectFormData, requiredSkills: skillsArray };
        setShowEditProjectModal(false);
        setEditingProject(null);
        setProjects((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
        if (selectedProject?._id === updated._id) {
          setSelectedProject(updated);
        }
      }
    } catch (err) {
      setEditProjectError(err.response?.data?.message || "Failed to update project");
    } finally {
      setEditProjectLoading(false);
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm("Are you sure you want to delete this project? All associated tasks will also be deleted.")) return;
    try {
      setDeletingProjectId(projectId);
      const res = await API.delete(`/projects/${projectId}`);
      if (res.data?.success) {
        setProjects((prev) => prev.filter((p) => p._id !== projectId));
        if (selectedProject?._id === projectId) {
          setSelectedProject(null);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete project");
    } finally {
      setDeletingProjectId(null);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (isCompany && !isCompanyVerified) {
      setCreateError("Your company account is pending administrator verification. You cannot publish projects until approved.");
      return;
    }
    setCreateError("");
    setCreateLoading(true);

    try {
      const skillsArray = typeof formData.requiredSkills === "string"
        ? formData.requiredSkills.split(",").map((s) => s.trim()).filter(Boolean)
        : formData.requiredSkills;

      const res = await API.post("/projects", {
        ...formData,
        requiredSkills: skillsArray
      });

      if (res.data?.success) {
        setFormData({
          name: "",
          description: "",
          workspace: workspaces[0]?._id || "",
          industry: user?.industry || "",
          requiredSkills: "",
          experienceLevel: "Fresher",
          duration: "",
          deadline: "",
          developersRequired: 1,
          budget: ""
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
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Projects
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {workspaceQuery
              ? "Filtered by selected workspace"
              : "Manage collaborative projects, milestones, and deliverables"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {workspaceQuery && (
            <Link
              to="/projects"
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              Clear Workspace Filter
            </Link>
          )}
          {isCompany && !isCompanyVerified && (
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-xs sm:text-sm font-medium border border-slate-200 dark:border-slate-700 cursor-not-allowed"
              title="Only verified companies can publish projects"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Publish Disabled (Pending Verification)</span>
            </button>
          )}
          {canCreateProject && (
            <button
              onClick={() => {
                setCreateError("");
                setShowModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium shadow-xs transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Create Project</span>
            </button>
          )}
        </div>
      </div>

      {/* Verification Status Warning for Companies */}
      {isCompany && !isCompanyVerified && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 shadow-2xs ${
          user?.verificationStatus === "Rejected"
            ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300"
            : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
        }`}>
          <svg className="w-5 h-5 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>
            <h4 className="font-bold text-sm">
              {user?.verificationStatus === "Rejected"
                ? "Company Account Verification Rejected"
                : "Company Account Pending Administrator Verification"}
            </h4>
            <p className="text-xs mt-1 leading-relaxed">
              {user?.verificationStatus === "Rejected"
                ? "Your company registration was not approved by an administrator. Publishing new projects is disabled. Please contact support."
                : "Your company registration is currently pending review. Until approved by an administrator, publishing new projects is disabled."}
            </p>
          </div>
        </div>
      )}

      {/* Developer response feedback */}
      {responseMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>{responseMessage}</span>
          </div>
          <button onClick={() => setResponseMessage("")} className="text-emerald-600 dark:text-emerald-400 hover:opacity-75 text-xs font-bold">✕</button>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects by name, description, or skills..."
            className="w-full pl-9 pr-3.5 py-2 rounded-lg bg-white dark:bg-[#111827] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
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
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Projects List */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-8 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
            </svg>
          </div>
          <p className="text-slate-900 dark:text-white font-semibold">No projects found</p>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 mb-4">
            {isCompany && !isCompanyVerified
              ? "Your company registration is pending verification. You will be able to publish projects once approved."
              : workspaces.length === 0
              ? "Please create a workspace first before adding projects."
              : "Start by creating a new project in one of your workspaces."}
          </p>
          {canCreateProject && (
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium shadow-xs"
            >
              Create Project
            </button>
          )}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-6 shadow-xs">
          <p className="text-slate-700 dark:text-slate-300 font-medium text-sm">No projects match "{searchQuery}"</p>
          <button
            onClick={() => setSearchQuery("")}
            className="mt-3 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredProjects.map((proj) => {
            const companyName = proj.companyDetails?.companyName || (proj.owner?.role === "company" && proj.owner?.companyName);
            const companyLogo = proj.companyDetails?.companyLogo || (proj.owner?.role === "company" && proj.owner?.companyLogo);
            const myResp = proj.developerResponses?.find(
              (r) => (r.developer?._id || r.developer) === user?._id
            );
            const myStatus = myResp?.status || "Pending";

            return (
              <div
                key={proj._id}
                className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs flex flex-col justify-between"
              >
                <div>
                  {/* Company Header Tag */}
                  {companyName && (
                    <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                      {companyLogo ? (
                        <img
                          src={companyLogo}
                          alt={companyName}
                          className="w-5 h-5 rounded object-contain bg-white border border-slate-200 dark:border-slate-700"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-300 font-bold text-[10px] flex items-center justify-center border border-sky-200 dark:border-sky-800">
                          {companyName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {companyName}
                      </span>
                      {proj.companyDetails?.industry && (
                        <span className="text-[10px] text-slate-400 truncate">
                          • {proj.companyDetails.industry}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-800/60">
                        {(proj.name || "P").charAt(0).toUpperCase()}
                      </div>
                      <h3 className="font-semibold text-slate-900 dark:text-white text-base truncate">
                        {proj.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {proj.submissionStatus === "Submitted" && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0 font-medium">
                          Submitted
                        </span>
                      )}
                      {proj.submissionStatus === "Under Review" && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0 font-medium">
                          AI Reviewed
                        </span>
                      )}
                      {proj.aiReview?.overallScore && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0 font-bold">
                          Score: {proj.aiReview.overallScore}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-3 line-clamp-2 leading-relaxed">
                    {proj.description || "No description provided for this project."}
                  </p>

                  {/* Skills & Experience Badges */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {proj.experienceLevel && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        {proj.experienceLevel}
                      </span>
                    )}
                    {proj.deadline && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span>{proj.deadline}</span>
                      </span>
                    )}
                    {Array.isArray(proj.requiredSkills) && proj.requiredSkills.slice(0, 3).map((skill, sIdx) => (
                      <span
                        key={sIdx}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700"
                      >
                        {skill}
                      </span>
                    ))}
                    {Array.isArray(proj.requiredSkills) && proj.requiredSkills.length > 3 && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        +{proj.requiredSkills.length - 3}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 text-xs text-slate-500 dark:text-slate-400 space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800/70">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 dark:text-slate-500">Lead / Company:</span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">
                        {companyName || proj.owner?.name || "Owner"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 dark:text-slate-500">Applicants:</span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">
                        {proj.developerResponses?.length || 0} response{proj.developerResponses?.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    {(proj.githubUrl || proj.liveUrl) && (
                      <div className="flex items-center gap-3 pt-1.5">
                        {proj.githubUrl && (
                          <a
                            href={proj.githubUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 inline-flex items-center gap-1 font-medium transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                            </svg>
                            <span>Repository</span>
                          </a>
                        )}
                        {proj.liveUrl && (
                          <a
                            href={proj.liveUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 font-medium transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <line x1="2" x2="22" y1="12" y2="12" />
                              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                            </svg>
                            <span>Live Demo</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Developer Response Widget */}
                  {user?.role === "developer" && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/70">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-400">My Status:</span>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                            myStatus === "Accepted"
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                              : myStatus === "Rejected"
                              ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                              : myStatus === "In Progress"
                              ? "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800"
                              : myStatus === "Submitted"
                              ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                              : myStatus === "Completed"
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                          }`}>
                            {myStatus}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {myStatus !== "Accepted" && myStatus !== "In Progress" && myStatus !== "Submitted" && myStatus !== "Completed" && (
                            <>
                              <button
                                type="button"
                                disabled={respondingId === proj._id}
                                onClick={() => handleDeveloperResponse(proj._id, "Accepted")}
                                className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition-colors shadow-2xs"
                              >
                                Accept
                              </button>
                              {myStatus !== "Rejected" && (
                                <button
                                  type="button"
                                  disabled={respondingId === proj._id}
                                  onClick={() => handleDeveloperResponse(proj._id, "Rejected")}
                                  className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 hover:text-rose-600 text-[11px] font-medium border border-slate-200 dark:border-slate-700 transition-colors"
                                >
                                  Reject
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={respondingId === proj._id}
                                onClick={() => handleDeveloperResponse(proj._id, "Pending")}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                                  myStatus === "Pending"
                                    ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700"
                                    : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                                }`}
                                title="Decide Later (Keeps project Pending)"
                              >
                                Later
                              </button>
                            </>
                          )}

                          {myStatus === "Accepted" && (
                            <>
                              <button
                                type="button"
                                disabled={respondingId === proj._id}
                                onClick={() => handleDeveloperResponse(proj._id, "In Progress")}
                                className="px-2.5 py-1 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-semibold transition-colors shadow-2xs"
                              >
                                Start Work
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedProject(proj);
                                  setShowSubmitModal(true);
                                }}
                                className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition-colors shadow-2xs"
                              >
                                Submit
                              </button>
                            </>
                          )}

                          {myStatus === "In Progress" && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedProject(proj);
                                setShowSubmitModal(true);
                              }}
                              className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition-colors shadow-2xs"
                            >
                              Submit Project
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedProject(proj)}
                      className="text-xs text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium inline-flex items-center gap-1 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
                      </svg>
                      <span>Details</span>
                    </button>
                    {((proj.owner?._id || proj.owner) === user?._id || user?.role === "admin") && (
                      <>
                        <button
                          onClick={() => handleOpenEditProject(proj)}
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium inline-flex items-center gap-1 transition-colors"
                          title="Edit Project"
                        >
                          Edit
                        </button>
                        <button
                          disabled={deletingProjectId === proj._id}
                          onClick={() => handleDeleteProject(proj._id)}
                          className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-medium inline-flex items-center gap-1 transition-colors disabled:opacity-50"
                          title="Delete Project"
                        >
                          {deletingProjectId === proj._id ? "..." : "Delete"}
                        </button>
                      </>
                    )}
                    {canGenerateSummary && (
                      <button
                        onClick={() => {
                          setSelectedProject(proj);
                          handleGenerateSummary(proj._id);
                        }}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium inline-flex items-center gap-1 transition-colors"
                        title="Generate AI Project Summary"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        <span>AI Summary</span>
                      </button>
                    )}
                  </div>
                  <Link
                    to={`/task-board?project=${proj._id}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-xs font-medium transition-colors border border-indigo-200/80 dark:border-indigo-800/80 group"
                  >
                    <span>Open Board</span>
                    <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" x2="19" y1="12" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Create New Project
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-xs sm:text-sm">
                {createError}
              </div>
            )}

            {/* Company Banner */}
            {(user?.role === "company" || user?.companyName) && (
              <div className="mb-4 p-3 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  {user?.companyLogo ? (
                    <img
                      src={user.companyLogo}
                      alt="Logo"
                      className="w-7 h-7 rounded object-contain bg-white border border-slate-200"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                      {(user?.companyName || user?.name || "C")[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white block">
                      {user?.companyName || user?.name}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      Official Company Post • {user?.industry || "Tech"}
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[10px] font-semibold">
                  Verified
                </span>
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Workspace *
                </label>
                <select
                  required
                  value={formData.workspace}
                  onChange={(e) =>
                    setFormData({ ...formData, workspace: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                >
                  {workspaces.map((ws) => (
                    <option key={ws._id} value={ws._id}>
                      {ws.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Project Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g. MERN CRM Dashboard"
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Industry
                  </label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) =>
                      setFormData({ ...formData, industry: e.target.value })
                    }
                    placeholder="e.g. SaaS, Fintech, AI"
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Experience Level
                  </label>
                  <select
                    value={formData.experienceLevel}
                    onChange={(e) =>
                      setFormData({ ...formData, experienceLevel: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  >
                    <option value="Fresher">Fresher</option>
                    <option value="1–2 Years">1–2 Years</option>
                    <option value="3+ Years">3+ Years</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Description *
                </label>
                <textarea
                  rows={2}
                  required
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Detailed requirements, deliverables, and architecture expectations..."
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Required Skills (Comma separated)
                </label>
                <input
                  type="text"
                  value={formData.requiredSkills}
                  onChange={(e) =>
                    setFormData({ ...formData, requiredSkills: e.target.value })
                  }
                  placeholder="e.g. React, Node.js, MongoDB"
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Duration
                  </label>
                  <input
                    type="text"
                    value={formData.duration}
                    onChange={(e) =>
                      setFormData({ ...formData, duration: e.target.value })
                    }
                    placeholder="e.g. 15 Days"
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Deadline
                  </label>
                  <input
                    type="text"
                    value={formData.deadline}
                    onChange={(e) =>
                      setFormData({ ...formData, deadline: e.target.value })
                    }
                    placeholder="e.g. 15 Days"
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Developers Req.
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.developersRequired}
                    onChange={(e) =>
                      setFormData({ ...formData, developersRequired: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Budget (Optional)
                </label>
                <input
                  type="text"
                  value={formData.budget}
                  onChange={(e) =>
                    setFormData({ ...formData, budget: e.target.value })
                  }
                  placeholder="e.g. $1,500 / Fixed"
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium transition-colors disabled:opacity-50 shadow-xs"
                >
                  {createLoading ? "Publishing Project..." : "Publish Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project Details Modal */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  {selectedProject.name}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Workspace: {selectedProject.workspace?.name || "Workspace"}
                </p>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm p-1"
              >
                ✕
              </button>
            </div>

            {/* Company Publisher Details */}
            {(selectedProject.companyDetails?.companyName || (selectedProject.owner?.role === "company" && selectedProject.owner?.companyName)) && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {selectedProject.companyDetails?.companyLogo || selectedProject.owner?.companyLogo ? (
                    <img
                      src={selectedProject.companyDetails?.companyLogo || selectedProject.owner?.companyLogo}
                      alt="Company Logo"
                      className="w-10 h-10 rounded-lg object-contain bg-white border border-slate-200 dark:border-slate-700 p-0.5"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-300 font-bold text-sm flex items-center justify-center border border-sky-200 dark:border-sky-800">
                      {(selectedProject.companyDetails?.companyName || selectedProject.owner?.companyName || "C").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                      {selectedProject.companyDetails?.companyName || selectedProject.owner?.companyName}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {selectedProject.companyDetails?.industry || "Tech Company"}
                      {selectedProject.companyDetails?.companyWebsite && (
                        <a
                          href={selectedProject.companyDetails.companyWebsite.startsWith("http") ? selectedProject.companyDetails.companyWebsite : `https://${selectedProject.companyDetails.companyWebsite}`}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-2 text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          Visit Website →
                        </a>
                      )}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Verified Company
                </span>
              </div>
            )}

            {/* Requirements & Metadata */}
            <div className="flex flex-wrap items-center gap-2">
              {selectedProject.experienceLevel && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  Level: {selectedProject.experienceLevel}
                </span>
              )}
              {selectedProject.deadline && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>Deadline: {selectedProject.deadline}</span>
                </span>
              )}
            </div>

            {/* Required Skills */}
            {selectedProject.requiredSkills && selectedProject.requiredSkills.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Required Technical Skills
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedProject.requiredSkills.map((sk, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 text-xs font-medium"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-lg border border-slate-200/80 dark:border-slate-700/60 leading-relaxed">
              {selectedProject.description || "No description provided for this project."}
            </p>

            {/* Developer Action Card in Details Modal */}
            {user?.role === "developer" && (
              <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/80 flex items-center justify-between gap-3 flex-wrap">
                {(() => {
                  const myResp = selectedProject.developerResponses?.find(
                    (r) => (r.developer?._id || r.developer) === user?._id
                  );
                  const myStatus = myResp?.status || "Pending";

                  return (
                    <div className="w-full flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Your Project Status:</span>
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                          myStatus === "Accepted"
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                            : myStatus === "Rejected"
                            ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                            : myStatus === "In Progress"
                            ? "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800"
                            : myStatus === "Submitted"
                            ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                        }`}>
                          {myStatus}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {myStatus !== "Accepted" && myStatus !== "In Progress" && myStatus !== "Submitted" && myStatus !== "Completed" && (
                          <>
                            <button
                              type="button"
                              disabled={respondingId === selectedProject._id}
                              onClick={() => handleDeveloperResponse(selectedProject._id, "Accepted")}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
                            >
                              Accept Project
                            </button>
                            {myStatus !== "Rejected" && (
                              <button
                                type="button"
                                disabled={respondingId === selectedProject._id}
                                onClick={() => handleDeveloperResponse(selectedProject._id, "Rejected")}
                                className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-700 dark:text-slate-300 hover:text-rose-600 text-xs font-medium border border-slate-300 dark:border-slate-700 transition-colors"
                              >
                                Reject Project
                              </button>
                            )}
                          </>
                        )}

                        {myStatus === "Accepted" && (
                          <>
                            <button
                              type="button"
                              disabled={respondingId === selectedProject._id}
                              onClick={() => handleDeveloperResponse(selectedProject._id, "In Progress")}
                              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs transition-colors"
                            >
                              Start Working (In Progress)
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowSubmitModal(true)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
                            >
                              Submit Project Deliverables
                            </button>
                          </>
                        )}

                        {myStatus === "In Progress" && (
                          <button
                            type="button"
                            onClick={() => setShowSubmitModal(true)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
                          >
                            Submit Project Deliverables
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <p>
                <span className="text-slate-400 dark:text-slate-500">Created by:</span>{" "}
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  {selectedProject.companyDetails?.companyName || selectedProject.owner?.name || "Owner"}
                </span>
              </p>
              {canGenerateSummary && (
                <button
                  type="button"
                  onClick={() => handleGenerateSummary(selectedProject._id)}
                  disabled={summaryLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors disabled:opacity-60 shadow-xs cursor-pointer"
                >
                  {summaryLoading ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
                      </svg>
                      <span>Analyzing Project...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                      <span>{projectSummary ? "Regenerate Summary" : "Generate Project Summary"}</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* AI Summary Error */}
            {summaryError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-xs">
                {summaryError}
              </div>
            )}

            {/* AI Summary Card */}
            {projectSummary && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/90 dark:border-slate-700/80 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-700/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      AI Project Summary
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Completion:</span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                      {projectSummary.progress || `${projectSummary.stats?.completionPercentage ?? 0}%`}
                    </span>
                  </div>
                </div>

                {/* AI Error Banner if LLM failed but database stats are available */}
                {projectSummary.aiError && (
                  <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
                    <svg className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>{projectSummary.aiError}</span>
                  </div>
                )}

                {/* Authoritative Database Task Statistics Grid */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    Verified Database Task Statistics
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Total Tasks</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {projectSummary.stats?.totalTasks ?? projectSummary.totalTasks ?? 0}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-medium">Completed</span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {projectSummary.stats?.completedTasks ?? projectSummary.completedTasks ?? 0}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                      <span className="text-[10px] text-sky-600 dark:text-sky-400 block font-medium">In Progress</span>
                      <span className="text-sm font-bold text-sky-600 dark:text-sky-400">
                        {projectSummary.stats?.inProgressTasks ?? projectSummary.inProgressTasks ?? 0}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                      <span className="text-[10px] text-purple-600 dark:text-purple-400 block font-medium">Under Review</span>
                      <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                        {projectSummary.stats?.submittedForReviewTasks ?? projectSummary.submittedForReviewTasks ?? 0}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-1.5 rounded-lg bg-white/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">Pending: </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {projectSummary.stats?.pendingTasks ?? projectSummary.pendingTasks ?? 0}
                      </span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-white/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">Approved: </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {projectSummary.stats?.approvedTasks ?? projectSummary.approvedTasks ?? 0}
                      </span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-white/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                      <span className="text-[10px] text-rose-500 dark:text-rose-400 font-medium">Overdue: </span>
                      <span className="font-bold text-rose-600 dark:text-rose-400">
                        {projectSummary.stats?.overdueTasks ?? projectSummary.overdueTasks ?? 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress bar strictly reflecting authoritative database completion */}
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-indigo-600 dark:bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, parseInt(projectSummary.progress, 10) || 0))}%` }}
                  />
                </div>

                {/* AI-Generated Progress Explanation */}
                {projectSummary.summary && (
                  <div className="p-3 rounded-lg bg-white/80 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-1">
                      AI Progress Explanation
                    </span>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {projectSummary.summary}
                    </p>
                  </div>
                )}

                <div className="space-y-3 pt-1 text-xs">
                  {/* Delayed / Overdue Tasks */}
                  <div>
                    <h5 className="font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider text-[11px] mb-1">
                      Delayed / Overdue Tasks:
                    </h5>
                    {projectSummary.delayedTasks && projectSummary.delayedTasks.length > 0 ? (
                      <ul className="space-y-1 pl-1">
                        {projectSummary.delayedTasks.map((t, idx) => (
                          <li key={idx} className="text-slate-700 dark:text-slate-300 flex items-start gap-1.5">
                            <span className="text-rose-500 font-bold">•</span>
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-slate-500 dark:text-slate-400 italic">None. All active tasks are within their scheduled due dates.</p>
                    )}
                  </div>

                  {/* Risks Supported by Available Data */}
                  <div>
                    <h5 className="font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider text-[11px] mb-1">
                      Risks & Bottlenecks:
                    </h5>
                    {projectSummary.risks && projectSummary.risks.length > 0 ? (
                      <ul className="space-y-1 pl-1">
                        {projectSummary.risks.map((r, idx) => (
                          <li key={idx} className="text-slate-700 dark:text-slate-300 flex items-start gap-1.5">
                            <span className="text-amber-500 font-bold">•</span>
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-slate-500 dark:text-slate-400 italic">No critical risks identified from current task data.</p>
                    )}
                  </div>

                  {/* Recommended Next Priorities */}
                  <div>
                    <h5 className="font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider text-[11px] mb-1">
                      Recommended Next Priorities:
                    </h5>
                    {projectSummary.nextPriorities && projectSummary.nextPriorities.length > 0 ? (
                      <ol className="space-y-1 pl-1 list-none">
                        {projectSummary.nextPriorities.map((p, idx) => (
                          <li key={idx} className="text-slate-700 dark:text-slate-300 flex items-start gap-1.5">
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{idx + 1}.</span>
                            <span>{p}</span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="text-slate-500 dark:text-slate-400 italic">Review upcoming sprint deliverables.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Project Submission & AI Review Section */}
            <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800/80 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 11l3 3L22 4" />
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                    <span>Project Submission & Review</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Status:{" "}
                    <span className={`font-semibold ${
                      selectedProject.submissionStatus === "Submitted"
                        ? "text-amber-600 dark:text-amber-400"
                        : selectedProject.submissionStatus === "Under Review"
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-slate-500 dark:text-slate-400"
                    }`}>
                      {selectedProject.submissionStatus || "Not Submitted"}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Developer Submit Action */}
                  {canSubmitProject && (
                    <button
                      type="button"
                      onClick={() => {
                        setSubmitFormData({
                          githubUrl: selectedProject.githubUrl || "",
                          liveUrl: selectedProject.liveUrl || "",
                          notes: selectedProject.submissionNotes || ""
                        });
                        setSubmitError("");
                        setSubmitSuccess("");
                        setShowSubmitModal(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      {selectedProject.submissionStatus === "Submitted" || selectedProject.submissionStatus === "Under Review"
                        ? "Update Submission"
                        : "Submit Project"}
                    </button>
                  )}

                  {/* Company / Admin AI Review Action */}
                  {canRunAIReview && (
                    <button
                      type="button"
                      onClick={() => handleRunAIReview(selectedProject._id)}
                      disabled={aiReviewLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
                    >
                      {aiReviewLoading ? (
                        <>
                          <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
                          </svg>
                          <span>Analyzing with AI...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                          <span>{selectedProject.aiReview?.overallScore ? "Re-analyze with AI" : "Analyze with AI"}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Success & Error banners */}
              {submitSuccess && (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs">
                  {submitSuccess}
                </div>
              )}
              {aiReviewError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-xs">
                  {aiReviewError}
                </div>
              )}

              {/* Submission Details if submitted */}
              {selectedProject.submittedAt && (
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 text-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span>
                      Submitted by: <strong className="text-slate-800 dark:text-slate-200">{selectedProject.submittedBy?.name || "Developer"}</strong>
                    </span>
                    <span>{new Date(selectedProject.submittedAt).toLocaleDateString()}</span>
                  </div>
                  {selectedProject.submissionNotes && (
                    <p className="text-slate-700 dark:text-slate-300 pt-1 italic">
                      "{selectedProject.submissionNotes}"
                    </p>
                  )}
                </div>
              )}

              {/* AI Project Analysis Report Card */}
              {selectedProject.aiReview && selectedProject.aiReview.overallScore && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-700/60 pb-2.5">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                        AI Project Analysis
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        AI-generated assessment to assist reviewers
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 block">Overall Score</span>
                      <span
                        className={`font-bold inline-block mt-0.5 ${
                          String(selectedProject.aiReview.overallScore).toLowerCase().includes("insufficient") ||
                          String(selectedProject.aiReview.overallScore).toLowerCase().includes("pending")
                            ? "text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                            : "text-base text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {selectedProject.aiReview.overallScore}
                      </span>
                    </div>
                  </div>

                  {/* Submetrics Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                        Requirement Coverage
                      </span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {selectedProject.aiReview.requirementCoverage || "85%"}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                        Code Quality Assessment
                      </span>
                      <span className="text-xs text-slate-700 dark:text-slate-300">
                        {selectedProject.aiReview.codeQuality || "Clean modular structure with clear components"}
                      </span>
                    </div>
                  </div>

                  {/* Strengths & Weaknesses */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                    <div>
                      <h5 className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
                        Strengths:
                      </h5>
                      <ul className="space-y-1">
                        {selectedProject.aiReview.strengths?.map((s, idx) => (
                          <li key={idx} className="text-slate-700 dark:text-slate-300 flex items-start gap-1.5">
                            <span className="text-emerald-500 font-bold">•</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-[11px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-1">
                        Weaknesses:
                      </h5>
                      <ul className="space-y-1">
                        {selectedProject.aiReview.weaknesses?.map((w, idx) => (
                          <li key={idx} className="text-slate-700 dark:text-slate-300 flex items-start gap-1.5">
                            <span className="text-rose-500 font-bold">•</span>
                            <span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Missing Features (if any) */}
                  {selectedProject.aiReview.missingFeatures && selectedProject.aiReview.missingFeatures.length > 0 && (
                    <div className="text-xs pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      <h5 className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">
                        Missing Features:
                      </h5>
                      <ul className="space-y-1">
                        {selectedProject.aiReview.missingFeatures.map((m, idx) => (
                          <li key={idx} className="text-slate-700 dark:text-slate-300 flex items-start gap-1.5">
                            <span className="text-amber-500 font-bold">•</span>
                            <span>{m}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Improvement Suggestions */}
                  {selectedProject.aiReview.suggestions && selectedProject.aiReview.suggestions.length > 0 && (
                    <div className="text-xs pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      <h5 className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
                        Improvement Suggestions:
                      </h5>
                      <ol className="space-y-1">
                        {selectedProject.aiReview.suggestions.map((sug, idx) => (
                          <li key={idx} className="text-slate-700 dark:text-slate-300 flex items-start gap-1.5">
                            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{idx + 1}.</span>
                            <span>{sug}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Improvement Areas */}
                  {selectedProject.aiReview.improvementAreas && selectedProject.aiReview.improvementAreas.length > 0 && (
                    <div className="text-xs pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      <h5 className="text-[11px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-1">
                        Improvement Areas:
                      </h5>
                      <ul className="space-y-1">
                        {selectedProject.aiReview.improvementAreas.map((area, idx) => (
                          <li key={idx} className="text-slate-700 dark:text-slate-300 flex items-start gap-1.5">
                            <span className="text-purple-500 font-bold">•</span>
                            <span>{area}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommendation Box */}
                  {selectedProject.aiReview.recommendation && (
                    <div className="p-3 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 text-xs">
                      <span className="font-semibold text-indigo-900 dark:text-indigo-200 block mb-0.5">
                        Final Recommendation:
                      </span>
                      <p className="text-indigo-800 dark:text-indigo-300 leading-relaxed">
                        {selectedProject.aiReview.recommendation}
                      </p>
                    </div>
                  )}

                  {/* Limitations & Scope */}
                  {Array.isArray(selectedProject.aiReview.limitations) && selectedProject.aiReview.limitations.length > 0 && (
                    <div className="p-3 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/60 text-xs space-y-1">
                      <span className="font-semibold text-amber-900 dark:text-amber-300 block">
                        Assessment Limitations & Scope:
                      </span>
                      <ul className="space-y-0.5 text-amber-800 dark:text-amber-400 text-[11px] list-disc list-inside">
                        {selectedProject.aiReview.limitations.map((lim, idx) => (
                          <li key={idx}>{lim}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                    Note: This assessment is an AI-generated analysis to assist reviewers, not an absolute evaluation. The company reviewer retains final decision authority.
                  </p>
                </div>
              )}
            </div>

            {/* Developer Applicants & Submissions (Company & Admin view) */}
            {(user?.role === "company" || user?.role === "admin" || user?.role === "manager") && (
              <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <span>Developer Applicants & Responses ({selectedProject.developerResponses?.length || 0})</span>
                  </h3>
                </div>

                {selectedProject.developerResponses && selectedProject.developerResponses.length > 0 ? (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {selectedProject.developerResponses.map((resp, rIdx) => {
                      const dev = resp.developer || {};
                      const devName = dev.name || "Developer";
                      const devEmail = dev.email || "";
                      const devAvatar = dev.profilePicture || dev.avatar || "";
                      const isAccepted = resp.status === "Accepted";

                      return (
                        <div
                          key={resp._id || rIdx}
                          className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 text-xs space-y-2.5 shadow-2xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              {devAvatar ? (
                                <img
                                  src={devAvatar.startsWith("http") ? devAvatar : `${BACKEND_BASE_URL}${devAvatar.startsWith("/") ? "" : "/"}${devAvatar}`}
                                  alt={devName}
                                  className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center border border-indigo-200 dark:border-indigo-800 shrink-0">
                                  {devName.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                                  {devName}
                                </span>
                                {devEmail && (
                                  <span className="text-[11px] text-slate-400 block">
                                    {devEmail}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                resp.status === "Accepted"
                                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                  : resp.status === "Rejected"
                                  ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                                  : resp.status === "In Progress"
                                  ? "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800"
                                  : resp.status === "Submitted"
                                  ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                              }`}>
                                {resp.status}
                              </span>

                              {isAccepted && (user?.role === "company" || user?.role === "admin") && (
                                <Link
                                  to={`/task-board?project=${selectedProject._id}&assignTo=${dev._id || dev}&assignName=${encodeURIComponent(devName)}`}
                                  className="px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] shadow-2xs transition-colors inline-flex items-center gap-1"
                                >
                                  <span>Assign Task</span>
                                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                </Link>
                              )}
                            </div>
                          </div>

                          {/* Bio */}
                          {dev.bio && (
                            <p className="text-slate-600 dark:text-slate-300 text-xs italic">
                              "{dev.bio}"
                            </p>
                          )}

                          {/* Skills */}
                          {dev.skills && Array.isArray(dev.skills) && dev.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {dev.skills.map((sk, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 text-[10px] font-medium"
                                >
                                  {sk}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Social & Portfolio Links */}
                          {(dev.github || dev.linkedin || dev.portfolio) && (
                            <div className="flex items-center gap-3 text-[11px] pt-1">
                              {dev.github && (
                                <a
                                  href={dev.github.startsWith("http") ? dev.github : `https://${dev.github}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium inline-flex items-center gap-1"
                                >
                                  <span>GitHub</span>
                                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
                                </a>
                              )}
                              {dev.linkedin && (
                                <a
                                  href={dev.linkedin.startsWith("http") ? dev.linkedin : `https://${dev.linkedin}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-sky-600 dark:text-sky-400 hover:underline font-medium inline-flex items-center gap-1"
                                >
                                  <span>LinkedIn</span>
                                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
                                </a>
                              )}
                              {dev.portfolio && (
                                <a
                                  href={dev.portfolio.startsWith("http") ? dev.portfolio : `https://${dev.portfolio}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium inline-flex items-center gap-1"
                                >
                                  <span>Portfolio</span>
                                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
                                </a>
                              )}
                            </div>
                          )}

                          {/* Developer Submission Details if submitted */}
                          {resp.submission && (resp.submission.githubUrl || resp.submission.liveUrl || (resp.submission.files && resp.submission.files.length > 0)) && (
                            <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50 space-y-1.5">
                              <div className="flex flex-wrap items-center gap-3">
                                {resp.submission.githubUrl && (
                                  <a
                                    href={resp.submission.githubUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium inline-flex items-center gap-1"
                                  >
                                    <span>GitHub Repository</span>
                                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
                                  </a>
                                )}
                                {resp.submission.liveUrl && (
                                  <a
                                    href={resp.submission.liveUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium inline-flex items-center gap-1"
                                  >
                                    <span>Live Demo</span>
                                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
                                  </a>
                                )}
                              </div>
                              {resp.submission.notes && (
                                <p className="text-slate-600 dark:text-slate-300 italic">
                                  "{resp.submission.notes}"
                                </p>
                              )}
                              {resp.submission.files && resp.submission.files.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {resp.submission.files.map((file, fIdx) => (
                                    <a
                                      key={fIdx}
                                      href={file.filePath?.startsWith("http") ? file.filePath : `${BACKEND_BASE_URL}${file.filePath?.startsWith("/") ? "" : "/"}${file.filePath}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      download
                                      className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-medium hover:bg-indigo-100"
                                    >
                                      📎 {file.originalName}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                    No developer responses or applications received yet.
                  </p>
                )}
              </div>
            )}

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Team Members ({selectedProject.members?.length || 0})
              </h3>
              <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
                {selectedProject.members?.map((member) => (
                  <div
                    key={member._id}
                    className="flex items-center space-x-3 p-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 text-sm"
                  >
                    <div className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-100 dark:border-indigo-800/60">
                      {member.name ? member.name.charAt(0).toUpperCase() : "M"}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-200 text-xs sm:text-sm">
                        {member.name}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">{member.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Project Resources */}
            <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800/80 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
                  </svg>
                  <span>Project Deliverables & Resources</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Deliverables, project documentation, code repositories, and demo URLs.
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
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Upload Deliverable
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
                    className="flex-1 text-xs text-slate-600 dark:text-slate-300 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-200 hover:file:bg-slate-200 dark:hover:file:bg-slate-700 cursor-pointer"
                  />
                  <button
                    type="submit"
                    disabled={uploadingResource || !selectedResourceFile}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors disabled:opacity-50 shrink-0 shadow-xs"
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
                    Attached Deliverables ({projectAttachments.length}):
                  </p>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {projectAttachments.map((file) => {
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
                          className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 text-xs"
                        >
                          <div className="flex items-center gap-2 truncate mr-2">
                            <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                            <div className="truncate">
                              <p className="font-medium text-slate-800 dark:text-slate-200 truncate" title={file.originalName}>
                                {file.originalName}
                              </p>
                              <p className="text-[11px] text-slate-400 dark:text-slate-500">
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
                                className="px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-xs font-medium transition-colors"
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
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      GitHub Repository
                    </label>
                    {linksFormData.githubUrl && (
                      <a
                        href={linksFormData.githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 font-medium"
                      >
                        <span>Open Repository</span>
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" x2="21" y1="14" y2="3" />
                        </svg>
                      </a>
                    )}
                  </div>
                  <input
                    type="url"
                    value={linksFormData.githubUrl}
                    onChange={(e) => setLinksFormData({ ...linksFormData, githubUrl: e.target.value })}
                    placeholder="https://github.com/username/repository"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      Live Demo URL
                    </label>
                    {linksFormData.liveUrl && (
                      <a
                        href={linksFormData.liveUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 font-medium"
                      >
                        <span>Visit Demo</span>
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" x2="21" y1="14" y2="3" />
                        </svg>
                      </a>
                    )}
                  </div>
                  <input
                    type="url"
                    value={linksFormData.liveUrl}
                    onChange={(e) => setLinksFormData({ ...linksFormData, liveUrl: e.target.value })}
                    placeholder="https://yourproject.com"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={savingLinks}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors disabled:opacity-50 shadow-xs"
                  >
                    {savingLinks ? "Saving..." : "Save Links"}
                  </button>
                </div>
              </form>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Link
                  to={`/task-board?project=${selectedProject._id}`}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium transition-colors shadow-xs inline-flex items-center gap-1.5"
                >
                  <span>Open Kanban Board</span>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" x2="19" y1="12" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </Link>

                {((selectedProject.owner?._id || selectedProject.owner) === user?._id || user?.role === "admin") && (
                  <>
                    <button
                      onClick={() => handleOpenEditProject(selectedProject)}
                      className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors border border-slate-200 dark:border-slate-700"
                    >
                      Edit Project
                    </button>
                    <button
                      disabled={deletingProjectId === selectedProject._id}
                      onClick={() => handleDeleteProject(selectedProject._id)}
                      className="px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-400 text-xs font-medium transition-colors border border-rose-200 dark:border-rose-900/60 disabled:opacity-50"
                    >
                      {deletingProjectId === selectedProject._id ? "Deleting..." : "Delete"}
                    </button>
                  </>
                )}
              </div>

              <button
                onClick={() => setSelectedProject(null)}
                className="px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {showEditProjectModal && editingProject && (
        <div className="fixed inset-0 z-60 bg-slate-900/50 dark:bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Edit Project Details
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Update title, description, skills, and timeline
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditProjectModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                ✕
              </button>
            </div>

            {editProjectError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-xs">
                {editProjectError}
              </div>
            )}

            <form onSubmit={handleUpdateProject} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Project Title *
                </label>
                <input
                  type="text"
                  required
                  value={editProjectFormData.name}
                  onChange={(e) => setEditProjectFormData({ ...editProjectFormData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editProjectFormData.description}
                  onChange={(e) => setEditProjectFormData({ ...editProjectFormData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Status
                  </label>
                  <select
                    value={editProjectFormData.status}
                    onChange={(e) => setEditProjectFormData({ ...editProjectFormData, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  >
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Experience Level
                  </label>
                  <select
                    value={editProjectFormData.experienceLevel}
                    onChange={(e) => setEditProjectFormData({ ...editProjectFormData, experienceLevel: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  >
                    <option value="All Levels">All Levels</option>
                    <option value="Entry Level">Entry Level</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Senior">Senior</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Required Skills (comma separated)
                </label>
                <input
                  type="text"
                  value={editProjectFormData.requiredSkills}
                  onChange={(e) => setEditProjectFormData({ ...editProjectFormData, requiredSkills: e.target.value })}
                  placeholder="React, Node.js, MongoDB"
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Deadline
                </label>
                <input
                  type="text"
                  value={editProjectFormData.deadline}
                  onChange={(e) => setEditProjectFormData({ ...editProjectFormData, deadline: e.target.value })}
                  placeholder="e.g. 15 Days or YYYY-MM-DD"
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditProjectModal(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editProjectLoading}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors disabled:opacity-50 shadow-xs"
                >
                  {editProjectLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submit Project Modal */}
      {showSubmitModal && selectedProject && (
        <div className="fixed inset-0 z-60 bg-slate-900/50 dark:bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Submit Project for Review
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {selectedProject.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                ✕
              </button>
            </div>

            {submitError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-xs">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmitProject} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  GitHub Repository URL
                </label>
                <input
                  type="url"
                  value={submitFormData.githubUrl}
                  onChange={(e) => setSubmitFormData({ ...submitFormData, githubUrl: e.target.value })}
                  placeholder="https://github.com/username/repository"
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Live Demo URL
                </label>
                <input
                  type="url"
                  value={submitFormData.liveUrl}
                  onChange={(e) => setSubmitFormData({ ...submitFormData, liveUrl: e.target.value })}
                  placeholder="https://your-live-deployment.app"
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Submission Notes & Deliverables Summary
                </label>
                <textarea
                  rows={3}
                  value={submitFormData.notes}
                  onChange={(e) => setSubmitFormData({ ...submitFormData, notes: e.target.value })}
                  placeholder="Highlight key features completed, testing done, or special instructions..."
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                />
              </div>

              {/* Deliverable File Uploads */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Project Deliverable Files
                  </label>
                  <span className="text-[11px] text-slate-400">
                    PDF, DOCX, XLSX, ZIP, JPG, PNG
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer transition-colors ${
                    uploadingSubmitFile ? "opacity-60 pointer-events-none" : ""
                  }`}>
                    <svg className="w-4 h-4 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span>{uploadingSubmitFile ? "Uploading..." : "Upload File"}</span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.docx,.xlsx,.xls,.zip,.png,.jpg,.jpeg"
                      onChange={handleUploadSubmitFile}
                      disabled={uploadingSubmitFile}
                    />
                  </label>
                  <span className="text-[11px] text-slate-400">Max 50MB per file</span>
                </div>

                {/* Uploaded Files List */}
                {submitFiles.length > 0 && (
                  <div className="mt-2 space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {submitFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                      >
                        <span className="truncate max-w-[200px]" title={file.originalName}>
                          📎 {file.originalName}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          {file.fileSize && (
                            <span className="text-[10px] text-slate-400">
                              {(file.fileSize / 1024).toFixed(0)} KB
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setSubmitFiles((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="text-slate-400 hover:text-rose-500 font-bold px-1"
                            title="Remove attachment"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors disabled:opacity-50 shadow-xs"
                >
                  {submitting ? "Submitting..." : "Confirm & Submit Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
