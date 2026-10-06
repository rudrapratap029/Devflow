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
  const [acceptedUsers, setAcceptedUsers] = useState([]);
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
      const res = await API.get(`/tasks?project=${selectedProjectId}&limit=100`);
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

  // Real-time synchronization: listen for task updates and notifications
  useEffect(() => {
    const handleTaskUpdated = (e) => {
      const updated = e.detail;
      if (!updated || !updated._id) return;
      setTasks((prev) => {
        const index = prev.findIndex((t) => t._id === updated._id);
        if (index !== -1) {
          const nextTasks = [...prev];
          nextTasks[index] = { ...nextTasks[index], ...updated };
          return nextTasks;
        }
        return prev;
      });
    };

    const handleNotification = (e) => {
      const notif = e.detail;
      if (notif?.task) {
        fetchTasks();
      }
    };

    window.addEventListener("devflow:task_updated", handleTaskUpdated);
    window.addEventListener("devflow:notification", handleNotification);

    // Periodic sync poll when tab is visible
    const syncInterval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchTasks();
      }
    }, 8000);

    return () => {
      window.removeEventListener("devflow:task_updated", handleTaskUpdated);
      window.removeEventListener("devflow:notification", handleNotification);
      clearInterval(syncInterval);
    };
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
        const updated = res.data.data?.task;
        setTasks((prev) =>
          prev.map((t) => (t._id === taskId ? (updated ? { ...t, ...updated } : { ...t, status: newStatus }) : t))
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

  // AI Task Generator Handler
  const handleAiGenerate = async () => {
    if (!formData.title.trim()) return;

    try {
      setAiLoading(true);
      setAiError("");
      setAiSuggestion(null);
      setRecommendedUsers([]);

      const activeProject = projects.find((p) => p._id === selectedProjectId);
      const projectId = activeProject?._id || selectedProjectId;

      const res = await API.post("/ai/generate-task", {
        title: formData.title,
        projectContext: activeProject?.name || "",
        projectId: projectId
      });

      if (res.data?.success) {
        const data = res.data.data;
        setAiSuggestion(data);

        // Pre-populate description if currently empty or basic
        if (!formData.description.trim() && data.description) {
          let enrichedDesc = data.description;
          if (data.acceptanceCriteria && data.acceptanceCriteria.length > 0) {
            enrichedDesc +=
              `\n\nAcceptance Criteria:\n` +
              data.acceptanceCriteria.map((c) => `✓ ${c}`).join("\n");
          }
          if (data.subtasks && data.subtasks.length > 0) {
            enrichedDesc +=
              `\n\nSubtasks:\n` + data.subtasks.map((s) => `✓ ${s}`).join("\n");
          }
          setFormData((prev) => ({
            ...prev,
            description: enrichedDesc
          }));
        }

        // Set recommended users if available
        if (data.recommendedUsers && Array.isArray(data.recommendedUsers)) {
          setRecommendedUsers(data.recommendedUsers);
          if (!formData.assignedTo && data.recommendedUsers.length > 0) {
            setFormData((prev) => ({
              ...prev,
              assignedTo:
                data.recommendedUsers[0].userId || data.recommendedUsers[0]._id
            }));
          }
        }
      }
    } catch (err) {
      setAiError(
        err.response?.data?.message ||
          "AI assistant is currently unavailable. Please enter task details manually."
      );
    } finally {
      setAiLoading(false);
    }
  };

  // Create Task Submission
  const handleCreateTask = async (e) => {
    e.preventDefault();
    setCreateError("");
    setCreateLoading(true);

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        project: formData.project || selectedProjectId,
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

  // Delete Task Handler (Admin / Company)
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      const res = await API.delete(`/tasks/${taskId}`);
      if (res.data?.success) {
        setTasks((prev) => prev.filter((t) => t._id !== taskId));
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete task");
    }
  };

  // Fetch available users for task assignment
  const activeProject = projects.find((p) => p._id === selectedProjectId);

  useEffect(() => {
    const fetchUsers = async () => {
      if (
        currentUser?.role === "admin" ||
        currentUser?.role === "manager" ||
        currentUser?.role === "company"
      ) {
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

  // Fetch only users who have accepted the project invitation
  useEffect(() => {
    if (!selectedProjectId) {
      setAcceptedUsers([]);
      return;
    }

    const fetchAccepted = async () => {
      try {
        const res = await API.get(`/projects/${selectedProjectId}/accepted-users`);
        if (res.data?.success) {
          setAcceptedUsers(res.data.data?.users || []);
        }
      } catch (err) {
        if (activeProject && Array.isArray(activeProject.developerResponses)) {
          const devs = activeProject.developerResponses
            .filter((r) => r.status === "Accepted" || r.status === "In Progress")
            .map((r) => r.developer)
            .filter(Boolean);
          setAcceptedUsers(devs);
        } else {
          setAcceptedUsers([]);
        }
      }
    };

    fetchAccepted();
  }, [selectedProjectId, activeProject]);

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

  // Group tasks by 5 developer workflow status columns
  const columns = [
    {
      id: "Todo",
      title: "Todo",
      dotColor: "bg-slate-400",
      badgeColor: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700"
    },
    {
      id: "In Progress",
      title: "In Progress",
      dotColor: "bg-blue-500",
      badgeColor: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-900/50"
    },
    {
      id: "Submitted For Review",
      title: "Submitted For Review",
      dotColor: "bg-purple-500",
      badgeColor: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-900/50"
    },
    {
      id: "Approved",
      title: "Approved",
      dotColor: "bg-teal-500",
      badgeColor: "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200 dark:border-teal-900/50"
    },
    {
      id: "Completed",
      title: "Completed",
      dotColor: "bg-emerald-500",
      badgeColor: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50"
    }
  ];

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case "High":
        return {
          wrapper: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50",
          dot: "bg-rose-500"
        };
      case "Medium":
        return {
          wrapper: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50",
          dot: "bg-amber-500"
        };
      case "Low":
      default:
        return {
          wrapper: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
          dot: "bg-slate-400"
        };
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Bar: Title, Project Selector, Create Task Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Kanban Task Board
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track workflow progress across Todo, In Progress, Submitted For Review, Approved, and Completed
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Project Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Project:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => handleProjectSelect(e.target.value)}
              className="px-3 py-2 rounded-lg bg-white dark:bg-[#111827] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
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

          {selectedProjectId && (
            <Link
              to={`/projects?project=${selectedProjectId}`}
              className="px-3 py-2 rounded-lg bg-white dark:bg-[#111827] hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors border border-slate-300 dark:border-slate-700 shadow-xs inline-flex items-center gap-1.5"
              title="View and attach project resources, deliverables, and links"
            >
              <svg className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
              </svg>
              <span>Resources</span>
            </Link>
          )}

          {currentUser?.role !== "developer" && (
            <>
              <Link
                to={`/tasks/create${selectedProjectId ? `?project=${selectedProjectId}` : ""}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white dark:bg-[#111827] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-medium transition-colors border border-slate-300 dark:border-slate-700 shadow-xs"
                title="Open Company Task Assignment Page"
              >
                <svg className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
                <span>Assign Tasks</span>
              </Link>

              <button
                onClick={() => openCreateModal("Todo")}
                disabled={!selectedProjectId}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium transition-colors disabled:opacity-50 shadow-xs"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>New Task</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search and Filter Toolbar */}
      {selectedProjectId && (
        <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3 sm:p-3.5 shadow-xs">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks by title or details..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          {/* Priority Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Priority:</span>
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
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Assignee:</span>
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 max-w-[160px] truncate"
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
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* No Project Warning */}
      {projects.length === 0 && !loading && (
        <div className="text-center py-16 bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-8 shadow-xs">
          <p className="text-slate-900 dark:text-white font-semibold">No projects available</p>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 mb-4">
            Create a project first to start managing tasks on the board.
          </p>
          <Link
            to="/projects"
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium inline-block shadow-xs"
          >
            Go to Projects
          </Link>
        </div>
      )}

      {/* Kanban 5-Column Layout with Horizontal Scroll for Mobile */}
      {selectedProjectId && (
        <div className="overflow-x-auto pb-4">
          <div className="min-w-[1100px] xl:min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {columns.map((col) => {
              const colTasks = filteredTasks.filter((t) => {
                if (col.id === "Completed") {
                  return t.status === "Completed" || t.status === "Done";
                }
                return t.status === col.id;
              });

              return (
                <div
                  key={col.id}
                  className="bg-slate-100/60 dark:bg-[#0e131f]/70 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3 flex flex-col min-h-[520px]"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/80 dark:border-slate-800/80">
                    <div className="flex items-center space-x-2">
                      <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                      <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white">
                        {col.title}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                        {colTasks.length}
                      </span>
                    </div>
                    {currentUser?.role !== "developer" && (
                      <button
                        onClick={() => openCreateModal(col.id)}
                        title={`Add task to ${col.title}`}
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-md hover:bg-slate-200/80 dark:hover:bg-slate-800/60 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Column Tasks */}
                  <div className="space-y-2.5 flex-1 overflow-y-auto pr-0.5">
                    {colTasks.length === 0 ? (
                      <div className="h-32 flex items-center justify-center text-xs text-slate-400 dark:text-slate-500 border border-dashed border-slate-300 dark:border-slate-800 rounded-lg">
                        No tasks in {col.title}
                      </div>
                    ) : (
                      colTasks.map((task) => {
                        const priorityInfo = getPriorityBadge(task.priority);

                        return (
                          <div
                            key={task._id}
                            className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/90 rounded-lg p-3.5 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-2xs flex flex-col justify-between space-y-2.5"
                          >
                            {/* Title & Priority */}
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <Link
                                  to={`/tasks/${task._id}`}
                                  className="font-medium text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs sm:text-sm line-clamp-2 transition-colors"
                                >
                                  {task.title}
                                </Link>
                                <span
                                  className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border shrink-0 inline-flex items-center gap-1 ${priorityInfo.wrapper}`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${priorityInfo.dot}`}></span>
                                  {task.priority}
                                </span>
                              </div>

                              {task.description && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                                  {task.description}
                                </p>
                              )}
                            </div>

                            {/* Assignee & Due Date */}
                            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                              <div className="flex items-center space-x-1.5 truncate mr-2">
                                <div className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-[10px] shrink-0 border border-indigo-100 dark:border-indigo-800/60">
                                  {task.assignedTo?.name
                                    ? task.assignedTo.name.charAt(0).toUpperCase()
                                    : "—"}
                                </div>
                                <span className="truncate text-[11px]">
                                  {task.assignedTo?.name || "Unassigned"}
                                </span>
                              </div>

                              {task.dueDate && (
                                <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0 inline-flex items-center gap-1">
                                  <svg className="w-3 h-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                                    <line x1="16" x2="16" y1="2" y2="6" />
                                    <line x1="8" x2="8" y1="2" y2="6" />
                                    <line x1="3" x2="21" y1="10" y2="10" />
                                  </svg>
                                  <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                                </span>
                              )}
                            </div>

                            {/* Workflow Controls: Developer vs Company */}
                            {currentUser?.role === "developer" ? (
                              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                                {task.status === "Todo" && (
                                  <button
                                    type="button"
                                    onClick={() => handleStatusChange(task._id, "In Progress")}
                                    className="w-full py-1.5 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-2xs flex items-center justify-center gap-1.5"
                                  >
                                    <span>Start Work</span>
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <polygon points="5 3 19 12 5 21 5 3" />
                                    </svg>
                                  </button>
                                )}

                                {task.status === "In Progress" && (
                                  <button
                                    type="button"
                                    onClick={() => handleStatusChange(task._id, "Submitted For Review")}
                                    className="w-full py-1.5 px-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition-colors shadow-2xs flex items-center justify-center gap-1.5"
                                  >
                                    <span>Submit For Review</span>
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <line x1="22" y1="2" x2="11" y2="13" />
                                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                    </svg>
                                  </button>
                                )}

                                {task.status === "Submitted For Review" && (
                                  <div className="text-center py-1.5 px-2 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[11px] font-semibold flex items-center justify-center gap-1">
                                    <span>⏳ Awaiting Company Approval</span>
                                  </div>
                                )}

                                {task.status === "Approved" && (
                                  <div className="text-center py-1.5 px-2 rounded bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-[11px] font-semibold flex items-center justify-center gap-1">
                                    <span>✓ Approved by Company</span>
                                  </div>
                                )}

                                {(task.status === "Completed" || task.status === "Done") && (
                                  <div className="text-center py-1.5 px-2 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold flex items-center justify-center gap-1">
                                    <span>✓ Work Completed</span>
                                  </div>
                                )}

                                {/* Developer Status Selector: restricted to Todo -> In Progress -> Submitted For Review */}
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-slate-400 dark:text-slate-500 font-medium">
                                    Status:
                                  </span>
                                  <select
                                    value={task.status === "Done" ? "Completed" : task.status}
                                    disabled={task.status === "Approved" || task.status === "Completed"}
                                    onChange={(e) => handleStatusChange(task._id, e.target.value)}
                                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-0.5 text-slate-700 dark:text-slate-300 text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                                  >
                                    <option value="Todo">Todo</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Submitted For Review">Submitted For Review</option>
                                    {task.status === "Approved" && (
                                      <option value="Approved" disabled>Approved</option>
                                    )}
                                    {(task.status === "Completed" || task.status === "Done") && (
                                      <option value="Completed" disabled>Completed</option>
                                    )}
                                  </select>
                                </div>
                              </div>
                            ) : (
                              /* Company / Admin View */
                              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                                {task.status === "Submitted For Review" ? (
                                  <div className="p-2 rounded-lg bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse"></span>
                                        Waiting For Review
                                      </span>
                                      <Link
                                        to={`/tasks/${task._id}`}
                                        className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                                      >
                                        Details →
                                      </Link>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleStatusChange(task._id, "Approved")}
                                        className="flex-1 py-1.5 px-2 rounded bg-teal-600 hover:bg-teal-700 text-white font-semibold text-[11px] shadow-2xs transition-colors flex items-center justify-center gap-1"
                                        title="Approve completed work"
                                      >
                                        <span>Approve</span>
                                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleStatusChange(task._id, "In Progress")}
                                        className="py-1.5 px-2 rounded bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/50 text-slate-700 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 font-medium text-[11px] border border-slate-200 dark:border-slate-700 transition-colors"
                                        title="Request revisions"
                                      >
                                        Revisions
                                      </button>
                                    </div>
                                  </div>
                                ) : task.status === "Approved" ? (
                                  <div className="p-2 rounded-lg bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60 space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300 flex items-center gap-1">
                                        ✓ Work Approved
                                      </span>
                                      <Link
                                        to={`/tasks/${task._id}`}
                                        className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                                      >
                                        Details →
                                      </Link>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleStatusChange(task._id, "Completed")}
                                      className="w-full py-1.5 px-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] shadow-2xs transition-colors flex items-center justify-center gap-1"
                                      title="Mark completed"
                                    >
                                      <span>Mark Completed ✓</span>
                                    </button>
                                  </div>
                                ) : task.status === "Completed" || task.status === "Done" ? (
                                  <div className="text-center py-1.5 px-2 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold">
                                    ✓ Work Completed
                                  </div>
                                ) : task.status === "In Progress" ? (
                                  <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1.5 py-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                                    <span>Developer actively working...</span>
                                  </div>
                                ) : (
                                  <div className="text-[11px] text-slate-400 dark:text-slate-500 italic py-0.5">
                                    Awaiting developer to start
                                  </div>
                                )}

                                {/* Card Footer: Details Link and Delete */}
                                <div className="flex items-center justify-between pt-1">
                                  <Link
                                    to={`/tasks/${task._id}`}
                                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                                  >
                                    View Task →
                                  </Link>

                                  {(currentUser?.role === "admin" ||
                                    (currentUser?.role === "company" &&
                                      ((activeProject?.owner?._id || activeProject?.owner) === currentUser?._id ||
                                        (task.createdBy?._id || task.createdBy) === currentUser?._id))) && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteTask(task._id)}
                                      className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                      title="Delete task"
                                    >
                                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
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
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Create New Task
              </h2>
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
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                title="Close modal"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-xs sm:text-sm">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Task Title *
                  </label>
                  <button
                    type="button"
                    onClick={handleAiGenerate}
                    disabled={aiLoading || !formData.title.trim()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
                        <svg className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                        </svg>
                        <span>AI Assistant</span>
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
                  placeholder="e.g. Build Authentication API or Create React Dashboard"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                />
                {aiError && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{aiError}</p>
                )}
              </div>

              {/* AI Suggestion Breakdown Panel */}
              {aiSuggestion && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-indigo-200/80 dark:border-indigo-900/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                        </svg>
                        <span>AI Task Breakdown</span>
                      </span>
                      {aiSuggestion.estimatedTime && (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-100/70 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-medium">
                          Time: {aiSuggestion.estimatedTime}
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
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
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
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
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
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Details, requirements, and criteria for this task"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                />
              </div>

              {/* Recommended Team Members Panel */}
              {recommendedUsers.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      <span>Recommended Assignees</span>
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Matched by skills & workload
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
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700"
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
                                  className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-medium"
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
                          <div className="mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="pr-2 truncate">
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
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
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
                    <option value="Submitted For Review">Submitted For Review</option>
                    <option value="Approved">Approved</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
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
                {(currentUser?.role === "admin" || currentUser?.role === "manager" || currentUser?.role === "company") && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                      Assign To
                    </label>
                    {(() => {
                      const isCompany = currentUser?.role === "company";
                      const candidateUsers = isCompany
                        ? (acceptedUsers.length > 0
                            ? acceptedUsers
                            : availableUsers.filter((u) => {
                                const accIds = (activeProject?.developerResponses || [])
                                  .filter((r) => r.status === "Accepted" || r.status === "In Progress")
                                  .map((r) => (r.developer?._id || r.developer)?.toString());
                                return accIds.includes(u._id?.toString());
                              }))
                        : availableUsers;

                      return (
                        <>
                          <select
                            value={formData.assignedTo}
                            onChange={(e) =>
                              setFormData({ ...formData, assignedTo: e.target.value })
                            }
                            className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                          >
                            <option value="">Unassigned</option>
                            {isCompany && candidateUsers.length > 0 && (
                              <option value="ALL_ACCEPTED">
                                👥 All Accepted Users ({candidateUsers.length} developers)
                              </option>
                            )}
                            {formData.assignedTo &&
                              formData.assignedTo !== "ALL_ACCEPTED" &&
                              !candidateUsers.some((u) => u._id === formData.assignedTo) && (
                                <option value={formData.assignedTo}>
                                  {assignNameParam || "Selected Developer"}
                                </option>
                              )}
                            {candidateUsers.map((u) => {
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

                          {formData.assignedTo === "ALL_ACCEPTED" && (
                            <div className="mt-2 p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-800 dark:text-indigo-300">
                              <p className="font-semibold flex items-center gap-1.5">
                                <span>👥 Multi-Developer Assignment</span>
                              </p>
                              <p className="text-[11px] mt-0.5 text-indigo-700/80 dark:text-indigo-400">
                                This task will be created separately for all {candidateUsers.length} accepted developers. Each developer will have their own independent progress board and status tracking.
                              </p>
                            </div>
                          )}

                          {isCompany && candidateUsers.length === 0 && (
                            <p className="mt-1.5 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-200 dark:border-amber-800/50">
                              ⚠️ Only developers who have accepted this project invitation can be assigned tasks. No developers have accepted this project yet.
                            </p>
                          )}

                          {/* Task Assignment Decision-Support User Card */}
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
                              <div className="mt-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center border border-indigo-200 dark:border-indigo-800 shrink-0">
                                      {selectedUser.name ? selectedUser.name.charAt(0).toUpperCase() : "D"}
                                    </div>
                                    <div>
                                      <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                                        {selectedUser.name || selectedUser.email}
                                      </span>
                                      <span className="text-[10px] text-slate-400">
                                        {selectedUser.email}
                                      </span>
                                    </div>
                                  </div>
                                  <span className="text-emerald-700 dark:text-emerald-400 font-medium text-[11px] flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    Accepted Dev
                                  </span>
                                </div>

                                {/* Bio */}
                                <div>
                                  <span className="text-slate-500 dark:text-slate-400 font-medium">Bio: </span>
                                  <span className="text-slate-700 dark:text-slate-300 italic">
                                    {selectedUser.bio && selectedUser.bio.trim()
                                      ? `"${selectedUser.bio}"`
                                      : "No professional bio added yet"}
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
                                          className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 text-[10px] font-medium"
                                        >
                                          {skill}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 dark:text-slate-500 italic">No skills listed</span>
                                  )}
                                </div>

                                {/* Social Links: GitHub, LinkedIn, Portfolio */}
                                {(selectedUser.github || selectedUser.linkedin || selectedUser.portfolio) && (
                                  <div className="flex items-center gap-3 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                                    {selectedUser.github && (
                                      <a
                                        href={selectedUser.github.startsWith("http") ? selectedUser.github : `https://${selectedUser.github}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium inline-flex items-center gap-1"
                                      >
                                        <span>GitHub</span>
                                        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
                                      </a>
                                    )}
                                    {selectedUser.linkedin && (
                                      <a
                                        href={selectedUser.linkedin.startsWith("http") ? selectedUser.linkedin : `https://${selectedUser.linkedin}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-sky-600 dark:text-sky-400 hover:underline font-medium inline-flex items-center gap-1"
                                      >
                                        <span>LinkedIn</span>
                                        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
                                      </a>
                                    )}
                                    {selectedUser.portfolio && (
                                      <a
                                        href={selectedUser.portfolio.startsWith("http") ? selectedUser.portfolio : `https://${selectedUser.portfolio}`}
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

                                {/* Task Counts and Profile Button */}
                                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                                  <div className="flex items-center gap-3 text-[11px]">
                                    <span>
                                      <strong className="text-amber-700 dark:text-amber-400">Pending:</strong> {pendingCount}
                                    </span>
                                    <span>
                                      <strong className="text-emerald-700 dark:text-emerald-400">Done:</strong> {completedCount}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setProfileModalUserId(selectedUser._id);
                                      setProfileModalUserObj(selectedUser);
                                      setIsProfileModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 text-[11px] font-medium transition-colors"
                                  >
                                    Profile View →
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                        </>
                      );
                    })()}
                  </div>
                )}

                <div
                  className={
                    currentUser?.role === "admin" || currentUser?.role === "manager" || currentUser?.role === "company"
                      ? ""
                      : "sm:col-span-2"
                  }
                >
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
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

              <div className="flex items-center justify-end gap-2.5 pt-3">
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
                  className="px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium transition-colors disabled:opacity-50 shadow-xs"
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
