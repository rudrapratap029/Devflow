import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API, { getAvatarUrl } from "../services/api";

const CreateTask = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedProject = searchParams.get("project") || "";
  const preselectedAssignee = searchParams.get("assignTo") || "";
  const preselectedAssignName = searchParams.get("assignName") || "";

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(preselectedProject);
  const [acceptedUsers, setAcceptedUsers] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // AI helper states
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);

  // Form Data
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "Medium",
    dueDate: "",
    assignedTo: preselectedAssignee || ""
  });

  const isCompanyOrAdmin =
    user?.role === "company" || user?.role === "admin" || user?.role === "manager";

  // Redirect if developer tries to access company task creation
  useEffect(() => {
    if (user && user.role === "developer") {
      navigate("/task-board");
    }
  }, [user, navigate]);

  // Load available projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoadingProjects(true);
        const res = await API.get("/projects");
        if (res.data?.success) {
          const list = res.data.data.projects || [];
          setProjects(list);
          if (list.length > 0) {
            const initialId =
              preselectedProject && list.some((p) => p._id === preselectedProject)
                ? preselectedProject
                : list[0]._id;
            setSelectedProjectId(initialId);
          }
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load projects");
      } finally {
        setLoadingProjects(false);
      }
    };

    fetchProjects();
  }, [preselectedProject]);

  // When selectedProjectId changes, fetch only developers who accepted the project invitation
  useEffect(() => {
    if (!selectedProjectId) {
      setAcceptedUsers([]);
      return;
    }

    const fetchAcceptedUsers = async () => {
      try {
        setLoadingUsers(true);
        const res = await API.get(`/projects/${selectedProjectId}/accepted-users`);
        if (res.data?.success) {
          const usersList = res.data.data?.users || [];
          setAcceptedUsers(usersList);

          // If current assignment is no longer valid, reset
          if (
            formData.assignedTo &&
            formData.assignedTo !== "ALL_ACCEPTED" &&
            !usersList.some((u) => u._id === formData.assignedTo) &&
            formData.assignedTo !== preselectedAssignee
          ) {
            setFormData((prev) => ({ ...prev, assignedTo: "" }));
          }
        }
      } catch (err) {
        // Fallback: extract from active project in projects array
        const activeProj = projects.find((p) => p._id === selectedProjectId);
        if (activeProj && Array.isArray(activeProj.developerResponses)) {
          const devs = activeProj.developerResponses
            .filter((r) => r.status === "Accepted" || r.status === "In Progress")
            .map((r) => r.developer)
            .filter(Boolean);
          setAcceptedUsers(devs);
        } else {
          setAcceptedUsers([]);
        }
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchAcceptedUsers();
  }, [selectedProjectId, projects]);

  const activeProject = projects.find((p) => p._id === selectedProjectId);

  // AI Task Details Assistant
  const handleAiGenerate = async () => {
    if (!formData.title.trim()) return;

    try {
      setAiLoading(true);
      setAiSuggestion(null);

      const res = await API.post("/ai/generate-task", {
        title: formData.title,
        projectContext: activeProject?.name || "",
        projectId: selectedProjectId
      });

      if (res.data?.success) {
        const data = res.data.data;
        setAiSuggestion(data);
        if (data.description && !formData.description.trim()) {
          let enriched = data.description;
          if (data.acceptanceCriteria?.length > 0) {
            enriched +=
              "\n\nAcceptance Criteria:\n" +
              data.acceptanceCriteria.map((c) => `✓ ${c}`).join("\n");
          }
          if (data.subtasks?.length > 0) {
            enriched +=
              "\n\nSubtasks:\n" + data.subtasks.map((s) => `✓ ${s}`).join("\n");
          }
          setFormData((prev) => ({ ...prev, description: enriched }));
        }
      }
    } catch (err) {
      console.warn("AI generation note:", err.message);
    } finally {
      setAiLoading(false);
    }
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!formData.title.trim()) {
      setError("Task title is required");
      return;
    }

    if (!selectedProjectId) {
      setError("Please select a target project");
      return;
    }

    if (!formData.assignedTo) {
      setError("Please select an assignment option (either an individual developer or 'All Accepted Users')");
      return;
    }

    try {
      setSubmitLoading(true);

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        project: selectedProjectId,
        priority: formData.priority,
        status: "Todo",
        assignedTo: formData.assignedTo
      };

      if (formData.dueDate) {
        payload.dueDate = formData.dueDate;
      }

      const res = await API.post("/tasks", payload);

      if (res.data?.success) {
        const count = res.data.data?.count || 1;
        setSuccessMsg(
          formData.assignedTo === "ALL_ACCEPTED"
            ? `Successfully created ${count} separate task copies for all accepted developers!`
            : "Task created and assigned successfully!"
        );

        setTimeout(() => {
          navigate(`/task-board?project=${selectedProjectId}`);
        }, 1200);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create task");
    } finally {
      setSubmitLoading(false);
    }
  };

  const selectedUserObj = acceptedUsers.find((u) => u._id === formData.assignedTo);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Breadcrumb & Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <Link to="/task-board" className="hover:text-indigo-600 transition-colors">
              Task Board
            </Link>
            <span>/</span>
            <span className="text-slate-700 dark:text-slate-300 font-medium">
              Create & Assign Task
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Company Task Assignment
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Create tasks and assign them to developers who have accepted the project invitation.
          </p>
        </div>

        <Link
          to={`/task-board${selectedProjectId ? `?project=${selectedProjectId}` : ""}`}
          className="px-3.5 py-2 rounded-lg bg-white dark:bg-[#111827] border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold shadow-xs transition-colors inline-flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>Return to Board</span>
        </Link>
      </div>

      {/* Notifications / Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
          <button onClick={() => setError("")} className="text-rose-400 hover:text-rose-600 text-sm font-bold">
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm flex items-center gap-2.5 shadow-2xs">
          <svg className="w-4 h-4 shrink-0 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Project Selection & Overview Card */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Step 1
              </span>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Select Target Project
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              {projects.length} available
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Project
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                disabled={loadingProjects}
                className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
              >
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} {p.status ? `(${p.status})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Project Quick Stats */}
            {activeProject && (
              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 rounded-lg p-3 text-xs space-y-1">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span>Accepted Devs:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {acceptedUsers.length}
                  </span>
                </div>
                {activeProject.budget && (
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span>Budget:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{activeProject.budget}</span>
                  </div>
                )}
                {activeProject.deadline && (
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span>Deadline:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{activeProject.deadline}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Task Assignment Dropdown & Accepted Users Verification */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Step 2
              </span>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Task Assignment Dropdown
              </h2>
            </div>
            <span className="text-xs text-slate-400">
              Only accepted developers can be assigned
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Assign To <span className="text-rose-500">*</span>
            </label>

            {loadingUsers ? (
              <div className="text-xs text-slate-500 dark:text-slate-400 py-2">
                Loading accepted developers for this project...
              </div>
            ) : (
              <select
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
              >
                <option value="">-- Select Assignment Option --</option>

                {/* Option: All Accepted Users */}
                <option
                  value="ALL_ACCEPTED"
                  disabled={acceptedUsers.length === 0}
                  className="font-semibold text-indigo-700 dark:text-indigo-400"
                >
                  👥 All Accepted Users ({acceptedUsers.length} developer{acceptedUsers.length === 1 ? "" : "s"})
                </option>

                {/* Separator / Individual Accepted Users */}
                {acceptedUsers.length > 0 && (
                  <optgroup label="Individual Accepted Developers">
                    {acceptedUsers.map((dev) => {
                      const skillsText = dev.skills?.length > 0 ? ` • ${dev.skills.slice(0, 3).join(", ")}` : "";
                      return (
                        <option key={dev._id} value={dev._id}>
                          {dev.name || dev.email} (Developer){skillsText}
                        </option>
                      );
                    })}
                  </optgroup>
                )}
              </select>
            )}
          </div>

          {/* Condition: No developers accepted yet */}
          {!loadingUsers && acceptedUsers.length === 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <span>⚠️ No accepted developers found for this project</span>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                In DevFlow, company tasks can only be assigned to developers who have accepted the project invitation. Developers must apply and accept the project before you can assign tasks to them.
              </p>
              <div className="pt-1">
                <Link
                  to={`/projects`}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                >
                  View Project Applicants & Responses →
                </Link>
              </div>
            </div>
          )}

          {/* Explainer Banner: All Accepted Users Selected */}
          {formData.assignedTo === "ALL_ACCEPTED" && (
            <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 text-xs space-y-1">
              <div className="flex items-center gap-2 font-bold text-indigo-900 dark:text-indigo-200">
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                <span>Multi-Developer Assignment Workflow Activated</span>
              </div>
              <p className="text-[11px] text-indigo-700 dark:text-indigo-300 leading-relaxed">
                An identical task copy will be automatically created for each of the{" "}
                <strong>{acceptedUsers.length} accepted developer(s)</strong>. Each developer will see the task on their own Task Board with separate, independent status tracking (Todo, In Progress, Submitted For Review, Approved, Completed).
              </p>
            </div>
          )}

          {/* Explainer Banner: Individual Developer Selected */}
          {selectedUserObj && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xs overflow-hidden shrink-0">
                    {selectedUserObj.avatar || selectedUserObj.profilePicture ? (
                      <img
                        src={getAvatarUrl(selectedUserObj.avatar || selectedUserObj.profilePicture)}
                        alt={selectedUserObj.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (selectedUserObj.name || "D").charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white block">
                      {selectedUserObj.name || selectedUserObj.email}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {selectedUserObj.email}
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">
                  Accepted Developer ✓
                </span>
              </div>

              {selectedUserObj.skills && selectedUserObj.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {selectedUserObj.skills.map((skill, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-[10px] font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step 3: Task Details */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Step 3
              </span>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Task Specification
              </h2>
            </div>
          </div>

          {/* Title with AI Assistant Button */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Task Title <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleAiGenerate}
                disabled={aiLoading || !formData.title.trim()}
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 inline-flex items-center gap-1 disabled:opacity-40 transition-colors"
                title="Generate task details using AI assistant"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                </svg>
                <span>{aiLoading ? "AI Generating..." : "AI Auto-Complete"}</span>
              </button>
            </div>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Implement Responsive Dashboard UI components"
              className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Description & Requirements
            </label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Provide clear technical requirements, deliverables, and guidelines for the developer..."
              className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
            />
          </div>

          {/* Priority & Due Date & Initial Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Due Date (Optional)
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Initial Workflow Status
              </label>
              <div className="px-3.5 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-semibold flex items-center justify-between">
                <span>Todo</span>
                <span className="text-[10px] text-slate-400 font-normal">Controlled by Developer</span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit & Cancel Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            to="/task-board"
            className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs sm:text-sm font-semibold transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitLoading || acceptedUsers.length === 0}
            className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {submitLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Assigning Task...</span>
              </>
            ) : formData.assignedTo === "ALL_ACCEPTED" ? (
              <>
                <span>Assign to All {acceptedUsers.length} Developers</span>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </>
            ) : (
              <>
                <span>Create & Assign Task</span>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateTask;
