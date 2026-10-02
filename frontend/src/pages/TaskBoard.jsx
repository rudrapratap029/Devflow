import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";

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
    { id: "Todo", title: "Todo", color: "border-slate-500/40 text-slate-300" },
    { id: "In Progress", title: "In Progress", color: "border-amber-500/40 text-amber-400" },
    { id: "Done", title: "Done", color: "border-emerald-500/40 text-emerald-400" }
  ];

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case "High":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "Medium":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "Low":
      default:
        return "bg-slate-700/60 text-slate-300 border-slate-600";
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Bar: Title, Project Selector, Create Task Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Kanban Task Board</h1>
          <p className="text-sm text-slate-400 mt-1">
            Track task progress across Todo, In Progress, and Done stages
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Project Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-medium">Project:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => handleProjectSelect(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
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
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            + New Task
          </button>
        </div>
      </div>

      {/* Feature 22: Search and Filter Toolbar */}
      {selectedProjectId && (
        <div className="flex flex-wrap items-center gap-3 bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5">
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
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Priority Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-slate-400">Priority:</span>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="All">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Assignee Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-slate-400">Assignee:</span>
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500 max-w-[150px] truncate"
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
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium px-2 py-1"
            >
              Reset Filters
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* No Project Warning */}
      {projects.length === 0 && !loading && (
        <div className="text-center py-16 bg-slate-800/40 border border-slate-700/60 rounded-2xl p-8">
          <p className="text-slate-300 font-medium">No projects available</p>
          <p className="text-sm text-slate-400 mt-1 mb-4">
            Create a project first to start managing tasks on the board.
          </p>
          <Link
            to="/projects"
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium inline-block"
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
                className="bg-slate-800/50 border border-slate-700/70 rounded-2xl p-4 flex flex-col min-h-[500px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-700/60">
                  <div className="flex items-center space-x-2">
                    <span className={`font-semibold text-sm ${col.color}`}>
                      {col.title}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/80 text-slate-300">
                      {colTasks.length}
                    </span>
                  </div>
                  <button
                    onClick={() => openCreateModal(col.id)}
                    title={`Add task to ${col.title}`}
                    className="text-slate-400 hover:text-white text-sm p-1 rounded hover:bg-slate-700/50 transition-colors"
                  >
                    +
                  </button>
                </div>

                {/* Column Tasks */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colTasks.length === 0 ? (
                    <div className="h-32 flex items-center justify-center text-xs text-slate-500 border border-dashed border-slate-700/60 rounded-xl">
                      No tasks in {col.title}
                    </div>
                  ) : (
                    colTasks.map((task) => (
                      <div
                        key={task._id}
                        className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-4 hover:border-slate-600 transition-shadow shadow-sm flex flex-col justify-between space-y-3"
                      >
                        {/* Title & Priority */}
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <Link
                              to={`/tasks/${task._id}`}
                              className="font-medium text-slate-100 hover:text-indigo-400 text-sm line-clamp-2 transition-colors"
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
                            <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                        </div>

                        {/* Assignee & Due Date */}
                        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                          <div className="flex items-center space-x-1.5 truncate">
                            <div className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                              {task.assignedTo?.name
                                ? task.assignedTo.name.charAt(0)
                                : "—"}
                            </div>
                            <span className="truncate">
                              {task.assignedTo?.name || "Unassigned"}
                            </span>
                          </div>

                          {task.dueDate && (
                            <span className="text-[11px] text-slate-400 shrink-0">
                              📅 {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {/* Status Change Selector */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] text-slate-500 font-medium">
                            Move to:
                          </span>
                          <select
                            value={task.status}
                            onChange={(e) =>
                              handleStatusChange(task._id, e.target.value)
                            }
                            className="text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300 focus:outline-none focus:border-indigo-500"
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">Create New Task</h2>

            {createError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="e.g. Implement user login flow"
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
                  placeholder="Details and criteria for this task"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Todo">Todo</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Done">Done</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
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
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Assign To
                    </label>
                    <select
                      value={formData.assignedTo}
                      onChange={(e) =>
                        setFormData({ ...formData, assignedTo: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
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
                        return (
                          <option key={u._id} value={u._id}>
                            {u.name || u.email} ({roleFormatted})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                <div
                  className={
                    currentUser?.role === "admin" || currentUser?.role === "manager"
                      ? ""
                      : "sm:col-span-2"
                  }
                >
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) =>
                      setFormData({ ...formData, dueDate: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    if (assignToParam) {
                      setSearchParams(selectedProjectId ? { project: selectedProjectId } : {});
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {createLoading ? "Creating..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskBoard;
