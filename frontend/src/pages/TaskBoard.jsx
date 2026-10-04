import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API, { getAvatarUrl } from "../services/api";
import UserProfileModal from "../components/UserProfileModal";

const TaskBoard = () => {
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedProjectParam = searchParams.get("project") || "";
  const assignToParam = searchParams.get("assignTo") || "";
  const assignNameParam = searchParams.get("assignName") || "";

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(selectedProjectParam);
  const [tasks, setTasks] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // User Profile Explorer modal state
  const [profileModalUserId, setProfileModalUserId] = useState(null);
  const [profileModalUserObj, setProfileModalUserObj] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Search and Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState("All");
  const [filterAssignee, setFilterAssignee] = useState("All");

  // Create Task Modal state
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    project: "",
    status: "Todo",
    priority: "Medium",
    dueDate: "",
    assignedTo: ""
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [recommendedUsers, setRecommendedUsers] = useState([]);

  // Fetch all user projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await API.get("/projects");
        if (res.data?.success) {
          const list = res.data.data.projects || [];
          setProjects(list);
          if (!selectedProjectId && list.length > 0) {
            setSelectedProjectId(list[0]._id);
          }
        }
      } catch (err) {
        console.error("Failed to load projects:", err);
      }
    };

    fetchProjects();
  }, []);

  // Update selectedProjectId if searchParams change
  useEffect(() => {
    if (selectedProjectParam) {
      setSelectedProjectId(selectedProjectParam);
    }
  }, [selectedProjectParam]);

  // Handle pre-selected assignee from navigation (e.g. from Users page)
  useEffect(() => {
    if (assignToParam) {
      setFormData((prev) => ({
        ...prev,
        project: prev.project || selectedProjectId || (projects[0]?._id || ""),
        assignedTo: assignToParam
      }));
      setShowModal(true);
    }
  }, [assignToParam, selectedProjectId, projects]);

  // Fetch tasks whenever selectedProjectId changes
  const fetchTasks = async () => {
    if (!selectedProjectId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await API.get(`/tasks?project=${selectedProjectId}`);
      if (res.data?.success) {
        setTasks(res.data.data.tasks || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [selectedProjectId]);

  // Handle Project Change
  const handleProjectSelect = (projectId) => {
    setSelectedProjectId(projectId);
    setSearchParams(projectId ? { project: projectId } : {});
  };

  // Update Task Status
  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const res = await API.put(`/tasks/${taskId}`, { status: newStatus });
      if (res.data?.success) {
        setTasks((prev) =>
          prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t))
        );
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update task status");
    }
  };

  // Open Create Modal
  const openCreateModal = (defaultStatus = "Todo") => {
    setCreateError("");
    setAiError("");
    setAiSuggestion(null);
    setRecommendedUsers([]);
    setFormData({
      title: "",
      description: "",
      project: selectedProjectId || (projects[0]?._id || ""),
      status: defaultStatus,
      priority: "Medium",
      dueDate: "",
      assignedTo: ""
    });
    setShowModal(true);
  };

  // Generate task suggestion and recommend users with AI
  const handleAiGenerate = async () => {
    if (!formData.title || !formData.title.trim()) {
      setAiError("Please enter a task title first to generate suggestions.");
      return;
    }

    try {
      setAiLoading(true);
      setAiError("");

      // 1. Fetch AI Task Suggestion
      const suggestionRes = await API.post("/ai/task-suggestion", {
        title: formData.title.trim(),
        description: formData.description
      });

      const suggestionData = suggestionRes.data?.data || suggestionRes.data || {};
      setAiSuggestion(suggestionData);

      // Populate description if user hasn't filled it in yet
      if (!formData.description || !formData.description.trim()) {
        setFormData((prev) => ({
          ...prev,
          description: suggestionData.description || prev.description
        }));
      }

      // 2. Fetch User Recommendations (for Admin/Manager decision-support)
      if (currentUser?.role === "admin" || currentUser?.role === "manager") {
        const targetProjectId = formData.project || selectedProjectId || (projects[0]?._id || "");
        const recRes = await API.post("/ai/recommend-users", {
          title: formData.title.trim(),
          description: suggestionData.description || formData.description,
          projectId: targetProjectId
        });

        const recUsers = recRes.data?.data || recRes.data?.recommendations || [];
        setRecommendedUsers(Array.isArray(recUsers) ? recUsers : []);
      }
    } catch (err) {
      console.error("AI Assistant error:", err);
      setAiError(err.response?.data?.message || "Failed to generate AI suggestions");
    } finally {
      setAiLoading(false);
    }
  };

  // Handle Create Task
  const handleCreateTask = async (e) => {
    e.preventDefault();
    setCreateError("");
    setCreateLoading(true);

    try {
      if (formData.assignedTo && (currentUser?.role === "admin" || currentUser?.role === "manager")) {
        const targetProj = projects.find((p) => p._id === formData.project);
        const isMember = targetProj?.members?.some((m) => (m._id || m) === formData.assignedTo);
        if (!isMember && targetProj) {
          const wsId = targetProj.workspace?._id || targetProj.workspace;
          if (wsId) {
            await API.post(`/workspaces/${wsId}/members`, { userId: formData.assignedTo }).catch(() => {});
          }
          await API.post(`/projects/${targetProj._id}/members`, { userId: formData.assignedTo }).catch(() => {});
        }
      }

      const payload = {
        title: formData.title,
        description: formData.description,
        project: formData.project,
        status: formData.status,
        priority: formData.priority
      };
      if (formData.dueDate) payload.dueDate = formData.dueDate;
      if (formData.assignedTo) payload.assignedTo = formData.assignedTo;

      const res = await API.post("/tasks", payload);
      if (res.data?.success) {
        setShowModal(false);
        if (assignToParam) {
          setSearchParams(selectedProjectId ? { project: selectedProjectId } : {});
        }
        fetchTasks();
      }
    } catch (err) {
      setCreateError(err.response?.data?.message || "Failed to create task");
    } finally {
      setCreateLoading(false);
    }
  };

  // Find active project to get member list for assignee dropdown
  const activeProject = projects.find((p) => p._id === selectedProjectId);

  // Fetch available users for task assignment (Admin/Manager)
  useEffect(() => {
    const fetchUsers = async () => {
      if (currentUser?.role === "admin" || currentUser?.role === "manager") {
        try {
          const res = await API.get("/users");
          const list = res.data?.data || res.data?.users || [];
          if (Array.isArray(list) && list.length > 0) {
            setAvailableUsers(list);
            return;
          }
        } catch (err) {
          console.error("Failed to load users from /users:", err);
        }
      }

      // Fallback: active project members
      if (activeProject?.members && activeProject.members.length > 0) {
        setAvailableUsers(activeProject.members);
      }
    };

    fetchUsers();
  }, [currentUser?.role, activeProject]);

  // Filter tasks based on search and filters
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      !searchQuery.trim() ||
      (t.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPriority =
      filterPriority === "All" || t.priority === filterPriority;

    const matchesAssignee =
      filterAssignee === "All" ||
      (t.assignedTo?._id || t.assignedTo) === filterAssignee;

    return matchesSearch && matchesPriority && matchesAssignee;
  });

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    filterPriority !== "All" ||
    filterAssignee !== "All";

  const clearFilters = () => {
    setSearchQuery("");
    setFilterPriority("All");
    setFilterAssignee("All");
  };

  // Group tasks by status columns
  const columns = [
    { id: "Todo", title: "Todo", dotColor: "bg-slate-400" },
    { id: "In Progress", title: "In Progress", dotColor: "bg-amber-500" },
    { id: "Done", title: "Done", dotColor: "bg-emerald-500" }
  ];

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case "High":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50";
      case "Medium":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50";
      case "Low":
      default:
        return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Bar: Title, Project Selector, Create Task Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Kanban Task Board</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track task progress across Todo, In Progress, and Done stages
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Project Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Project:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => handleProjectSelect(e.target.value)}
              className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
            >
              {projects.length === 0 ? (
                <option value="">No projects available</option>
              ) : (
                projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <button
            onClick={() => openCreateModal("Todo")}
            disabled={!selectedProjectId}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors disabled:opacity-50 shadow-xs"
          >
            + New Task
          </button>
        </div>
      </div>

      {/* Feature 22: Search and Filter Toolbar */}
      {selectedProjectId && (
        <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-3.5 shadow-xs">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          {/* Priority Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-slate-500 dark:text-slate-400">Priority:</span>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            >
              <option value="All">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Assignee Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-slate-500 dark:text-slate-400">Assignee:</span>
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 max-w-[150px] truncate"
            >
              <option value="All">All Assignees</option>
              {(availableUsers.length > 0 ? availableUsers : activeProject?.members || []).map((m) => {
                const roleFormatted = m.role
                  ? m.role.charAt(0).toUpperCase() + m.role.slice(1)
                  : "Developer";
                return (
                  <option key={m._id} value={m._id}>
                    {m.name || m.email} ({roleFormatted})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium px-2 py-1"
            >
              Reset Filters
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* No Project Warning */}
      {projects.length === 0 && !loading && (
        <div className="text-center py-16 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-8 shadow-xs">
          <p className="text-slate-900 dark:text-white font-semibold">No projects available</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-4">
            Create a project first to start managing tasks on the board.
          </p>
          <Link
            to="/projects"
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium inline-block shadow-xs"
          >
            Go to Projects
          </Link>
        </div>
      )}

      {/* Kanban 3-Column Layout with Horizontal Scroll for Mobile */}
      {selectedProjectId && (
        <div className="overflow-x-auto pb-4">
          <div className="min-w-[850px] md:min-w-0 grid grid-cols-1 md:grid-cols-3 gap-6">
            {columns.map((col) => {
              const colTasks = filteredTasks.filter((t) => t.status === col.id);

              return (
                <div
                  key={col.id}
                  className="bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70 rounded-2xl p-4 flex flex-col min-h-[500px]"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-700/60">
                    <div className="flex items-center space-x-2">
                      <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                      <span className="font-semibold text-sm text-slate-900 dark:text-white">
                        {col.title}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-600 shadow-2xs">
                        {colTasks.length}
                      </span>
                    </div>
                    <button
                      onClick={() => openCreateModal(col.id)}
                      title={`Add task to ${col.title}`}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-base p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      +
                    </button>
                  </div>

                  {/* Column Tasks */}
                  <div className="space-y-3 flex-1 overflow-y-auto">
                    {colTasks.length === 0 ? (
                      <div className="h-32 flex items-center justify-center text-xs text-slate-400 dark:text-slate-500 border border-dashed border-slate-300 dark:border-slate-700/60 rounded-xl">
                        No tasks in {col.title}
                      </div>
                    ) : (
                      colTasks.map((task) => (
                        <div
                          key={task._id}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl p-4 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-xs flex flex-col justify-between space-y-3"
                        >
                          {/* Title & Priority */}
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <Link
                                to={`/tasks/${task._id}`}
                                className="font-medium text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 text-sm line-clamp-2 transition-colors"
                              >
                                {task.title}
                              </Link>
                              <span
                                className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border shrink-0 ${getPriorityStyle(
                                  task.priority
                                )}`}
                              >
                                {task.priority}
                              </span>
                            </div>

                            {task.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2">
                                {task.description}
                              </p>
                            )}
                          </div>

                          {/* Assignee & Due Date */}
                          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center space-x-1.5 truncate">
                              <div className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-600/30 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-[10px] shrink-0 border border-indigo-100 dark:border-indigo-800">
                                {task.assignedTo?.name
                                  ? task.assignedTo.name.charAt(0)
                                  : "—"}
                              </div>
                              <span className="truncate">
                                {task.assignedTo?.name || "Unassigned"}
                              </span>
                            </div>

                            {task.dueDate && (
                              <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0">
                                📅 {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>

                          {/* Status Change Selector */}
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                              Move to:
                            </span>
                            <select
                              value={task.status}
                              onChange={(e) =>
                                handleStatusChange(task._id, e.target.value)
                              }
                              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                              <option value="Todo">Todo</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Done">Done</option>
                            </select>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Create New Task</h2>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setAiError("");
                  setAiSuggestion(null);
                  setRecommendedUsers([]);
                  if (assignToParam) {
                    setSearchParams(selectedProjectId ? { project: selectedProjectId } : {});
                  }
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1"
                title="Close modal"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-sm">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Task Title *
                  </label>
                  <button
                    type="button"
                    onClick={handleAiGenerate}
                    disabled={aiLoading || !formData.title.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
                    title="Generate description, criteria, subtasks, and user recommendations"
                  >
                    {aiLoading ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                        </svg>
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <span>✨ Generate with AI</span>
                      </>
                    )}
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="e.g. Build Login API or Create React Dashboard"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                />
                {aiError && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{aiError}</p>
                )}
              </div>

              {/* AI Suggestion Breakdown Panel */}
              {aiSuggestion && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-indigo-100 dark:border-indigo-950/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span className="text-indigo-600 dark:text-indigo-400">✨</span> AI Task Assistant
                      </span>
                      {aiSuggestion.estimatedTime && (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-100/70 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-medium">
                          Estimated Time: {aiSuggestion.estimatedTime}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        let fullDesc = aiSuggestion.description || "";
                        if (aiSuggestion.acceptanceCriteria?.length) {
                          fullDesc +=
                            `\n\nAcceptance Criteria:\n` +
                            aiSuggestion.acceptanceCriteria.map((c) => `✓ ${c}`).join("\n");
                        }
                        if (aiSuggestion.subtasks?.length) {
                          fullDesc +=
                            `\n\nSubtasks:\n` +
                            aiSuggestion.subtasks.map((s) => `✓ ${s}`).join("\n");
                        }
                        setFormData({ ...formData, description: fullDesc });
                      }}
                      className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 underline underline-offset-2 cursor-pointer"
                    >
                      Apply All to Description
                    </button>
                  </div>

                  {/* AI Acceptance Criteria & Subtasks in 2 compact columns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {aiSuggestion.acceptanceCriteria && aiSuggestion.acceptanceCriteria.length > 0 && (
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400 block mb-1">
                          Acceptance Criteria:
                        </span>
                        <ul className="space-y-1 text-slate-700 dark:text-slate-300">
                          {aiSuggestion.acceptanceCriteria.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-1.5 text-[11px]">
                              <span className="text-emerald-500 font-bold shrink-0">✓</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {aiSuggestion.subtasks && aiSuggestion.subtasks.length > 0 && (
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                        <span className="font-semibold text-indigo-700 dark:text-indigo-400 block mb-1">
                          Subtasks:
                        </span>
                        <ul className="space-y-1 text-slate-700 dark:text-slate-300">
                          {aiSuggestion.subtasks.map((task, idx) => (
                            <li key={idx} className="flex items-start gap-1.5 text-[11px]">
                              <span className="text-indigo-500 font-bold shrink-0">✓</span>
                              <span>{task}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

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
                  placeholder="Details and criteria for this task"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                />
              </div>

              {/* Recommended Team Members Panel */}
              {recommendedUsers.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>👥</span> Recommended Team Members
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Smart match by skills, bio & workload
                    </span>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {recommendedUsers.map((rec) => {
                      const isSelected = formData.assignedTo === (rec.userId || rec._id);
                      const matchBadgeClass =
                        rec.matchScore >= 90
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                          : rec.matchScore >= 75
                          ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
                          : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";

                      return (
                        <div
                          key={rec.userId || rec._id}
                          className={`p-2.5 rounded-lg border text-xs transition-all ${
                            isSelected
                              ? "bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20"
                              : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 text-[10px] shrink-0 overflow-hidden">
                                {rec.avatar ? (
                                  <img
                                    src={getAvatarUrl(rec.avatar)}
                                    alt={rec.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  (rec.name || "U")[0].toUpperCase()
                                )}
                              </div>
                              <div>
                                <span className="font-semibold text-slate-900 dark:text-white">
                                  {rec.name}
                                </span>
                                <span className="text-slate-400 dark:text-slate-500 text-[10px] ml-1.5 capitalize">
                                  ({rec.role || "developer"})
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${matchBadgeClass}`}
                              >
                                {rec.matchScore}% Match
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setFormData({
                                    ...formData,
                                    assignedTo: rec.userId || rec._id
                                  })
                                }
                                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                                  isSelected
                                    ? "bg-indigo-600 text-white shadow-2xs"
                                    : "bg-slate-100 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400"
                                }`}
                              >
                                {isSelected ? "Selected ✓" : "Select User"}
                              </button>
                            </div>
                          </div>

                          {/* Skills */}
                          {rec.skills && rec.skills.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {rec.skills.map((skill, idx) => (
                                <span
                                  key={idx}
                                  className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 text-[10px] font-medium"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Bio */}
                          {rec.bio && (
                            <p className="mt-1 text-slate-600 dark:text-slate-400 text-[11px] italic">
                              "{rec.bio}"
                            </p>
                          )}

                          {/* Reason & Workload */}
                          <div className="mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="pr-2">
                              <strong className="text-slate-700 dark:text-slate-300">Reason: </strong>
                              {rec.reason}
                            </span>
                            <span className="shrink-0 font-medium">
                              {rec.pendingTasks === 0 ? "0 active tasks" : `${rec.pendingTasks} active`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  >
                    <option value="Todo">Todo</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Done">Done</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(currentUser?.role === "admin" || currentUser?.role === "manager") && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Assign To
                    </label>
                    <select
                      value={formData.assignedTo}
                      onChange={(e) =>
                        setFormData({ ...formData, assignedTo: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                    >
                      <option value="">Unassigned</option>
                      {formData.assignedTo &&
                        !availableUsers.some((u) => u._id === formData.assignedTo) && (
                          <option value={formData.assignedTo}>
                            {assignNameParam || "Selected User"}
                          </option>
                        )}
                      {availableUsers.map((u) => {
                        const roleFormatted = u.role
                          ? u.role.charAt(0).toUpperCase() + u.role.slice(1)
                          : "Developer";
                        const skillsPreview =
                          u.skills && u.skills.length > 0 ? ` • ${u.skills.slice(0, 3).join(", ")}` : "";
                        return (
                          <option key={u._id} value={u._id}>
                            {u.name || u.email} ({roleFormatted}){skillsPreview}
                          </option>
                        );
                      })}
                    </select>

                    {/* Feature 5: Task Assignment Decision-Support User Card */}
                    {(() => {
                      const selectedUser = availableUsers.find(
                        (u) => u._id === formData.assignedTo
                      );
                      if (!selectedUser) return null;

                      const pendingCount =
                        selectedUser.pendingTasks !== undefined
                          ? selectedUser.pendingTasks
                          : selectedUser.taskStats?.pending ?? 0;
                      const completedCount =
                        selectedUser.completedTasks !== undefined
                          ? selectedUser.completedTasks
                          : selectedUser.taskStats?.completed ?? 0;

                      return (
                        <div className="mt-2.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {selectedUser.name || selectedUser.email}
                            </span>
                            <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              {selectedUser.isActive !== false ? "Available" : "Unavailable"}
                            </span>
                          </div>

                          {/* Bio */}
                          <div>
                            <span className="text-slate-500 dark:text-slate-400 font-medium">Bio: </span>
                            <span className="text-slate-700 dark:text-slate-300 italic">
                              {selectedUser.bio && selectedUser.bio.trim()
                                ? `"${selectedUser.bio}"`
                                : "No bio added yet"}
                            </span>
                          </div>

                          {/* Skills */}
                          <div>
                            <span className="text-slate-500 dark:text-slate-400 font-medium">Skills: </span>
                            {selectedUser.skills && selectedUser.skills.length > 0 ? (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {selectedUser.skills.map((skill, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-medium"
                                  >
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 italic">No skills listed</span>
                            )}
                          </div>

                          {/* Task Counts and Profile Button */}
                          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                            <div className="flex items-center gap-3 text-[11px]">
                              <span>
                                <strong className="text-amber-700 dark:text-amber-400">Pending Tasks:</strong> {pendingCount}
                              </span>
                              <span>
                                <strong className="text-emerald-700 dark:text-emerald-400">Completed:</strong> {completedCount}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setProfileModalUserId(selectedUser._id);
                                setProfileModalUserObj(selectedUser);
                                setIsProfileModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 text-[11px] font-medium transition-colors shadow-2xs"
                            >
                              Profile Button →
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div
                  className={
                    currentUser?.role === "admin" || currentUser?.role === "manager"
                      ? ""
                      : "sm:col-span-2"
                  }
                >
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) =>
                      setFormData({ ...formData, dueDate: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setAiError("");
                    setAiSuggestion(null);
                    setRecommendedUsers([]);
                    if (assignToParam) {
                      setSearchParams(selectedProjectId ? { project: selectedProjectId } : {});
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors disabled:opacity-50 shadow-xs"
                >
                  {createLoading ? "Creating..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Profile Explorer Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          setProfileModalUserId(null);
          setProfileModalUserObj(null);
        }}
        userId={profileModalUserId}
        initialData={profileModalUserObj}
      />
    </div>
  );
};

export default TaskBoard;
