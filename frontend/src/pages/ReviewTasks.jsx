import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";

const BACKEND_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1"
).replace(/\/api\/v1\/?$/, "");

const ReviewTasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Active Tab: "awaiting" (Submitted For Review) | "approved" (Approved, ready to mark Completed)
  const [activeTab, setActiveTab] = useState("awaiting");

  // Verify Modal state
  const [verifyTask, setVerifyTask] = useState(null);
  const [checklist, setChecklist] = useState({
    codeReviewed: true,
    acceptanceMet: true,
    qualityChecked: true
  });

  // AI Review state
  const [aiReviewLoading, setAiReviewLoading] = useState(false);
  const [aiReviewError, setAiReviewError] = useState("");

  // Fetch Projects for filtering
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await API.get("/projects");
        if (res.data?.success) {
          setProjects(res.data.data.projects || []);
        }
      } catch (err) {
        console.error("Failed to fetch projects:", err);
      }
    };
    fetchProjects();
  }, []);

  // Fetch submitted and approved tasks
  const fetchReviewTasks = async () => {
    try {
      setLoading(true);
      setError("");
      // Fetch both "Submitted For Review" and "Approved" tasks
      const res = await API.get(`/tasks?limit=100`);
      if (res.data?.success) {
        const allTasks = res.data.data.tasks || [];
        setTasks(allTasks);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load review tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviewTasks();
  }, []);

  // Real-time listener: react immediately to developer submissions and task updates
  useEffect(() => {
    const handleTaskUpdated = (e) => {
      const updated = e.detail;
      if (!updated || !updated._id) return;
      setTasks((prev) => {
        const index = prev.findIndex((t) => t._id === updated._id);
        if (index !== -1) {
          const next = [...prev];
          next[index] = { ...next[index], ...updated };
          return next;
        }
        return [updated, ...prev];
      });
    };

    const handleNotification = (e) => {
      const notif = e.detail;
      if (notif?.type === "TASK_SUBMITTED_FOR_REVIEW" || notif?.task) {
        fetchReviewTasks();
      }
    };

    window.addEventListener("devflow:task_updated", handleTaskUpdated);
    window.addEventListener("devflow:notification", handleNotification);

    // Periodic freshness check every 6 seconds when tab visible
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchReviewTasks();
      }
    }, 6000);

    return () => {
      window.removeEventListener("devflow:task_updated", handleTaskUpdated);
      window.removeEventListener("devflow:notification", handleNotification);
      clearInterval(interval);
    };
  }, []);

  // Handle Approve Task (Submitted For Review -> Approved)
  const handleApprove = async (taskId) => {
    try {
      setActionLoadingId(taskId);
      const res = await API.put(`/tasks/${taskId}`, { status: "Approved" });
      if (res.data?.success) {
        const updated = res.data.data.task;
        setTasks((prev) =>
          prev.map((t) => (t._id === taskId ? (updated ? { ...t, ...updated } : { ...t, status: "Approved" }) : t))
        );
        if (verifyTask?._id === taskId) {
          setVerifyTask(null);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to approve task");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Mark Completed (Approved -> Completed)
  const handleComplete = async (taskId) => {
    try {
      setActionLoadingId(taskId);
      const res = await API.put(`/tasks/${taskId}`, { status: "Completed" });
      if (res.data?.success) {
        const updated = res.data.data.task;
        setTasks((prev) =>
          prev.map((t) => (t._id === taskId ? (updated ? { ...t, ...updated } : { ...t, status: "Completed" }) : t))
        );
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to mark task completed");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Request Revisions (Submitted For Review -> In Progress)
  const handleRequestRevisions = async (taskId) => {
    try {
      setActionLoadingId(taskId);
      const res = await API.put(`/tasks/${taskId}`, { status: "In Progress" });
      if (res.data?.success) {
        const updated = res.data.data.task;
        setTasks((prev) =>
          prev.map((t) => (t._id === taskId ? (updated ? { ...t, ...updated } : { ...t, status: "In Progress" }) : t))
        );
        if (verifyTask?._id === taskId) {
          setVerifyTask(null);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to request revisions");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open Verify Modal
  const openVerifyModal = (task) => {
    setVerifyTask(task);
    setAiReviewError("");
    setChecklist({
      codeReviewed: true,
      acceptanceMet: true,
      qualityChecked: true
    });
  };

  // Run AI Review using Groq API
  const handleRunAiReview = async (taskId) => {
    try {
      setAiReviewLoading(true);
      setAiReviewError("");
      const res = await API.post(`/tasks/${taskId}/ai-review`);
      if (res.data?.success) {
        const { aiReviewResult, task: updatedTask } = res.data.data || {};
        const merged = updatedTask || { ...verifyTask, aiReviewResult };
        setVerifyTask(merged);
        setTasks((prev) =>
          prev.map((t) => (t._id === taskId ? { ...t, ...merged } : t))
        );
      }
    } catch (err) {
      setAiReviewError(
        err.response?.data?.message || "Failed to generate AI verification review"
      );
    } finally {
      setAiReviewLoading(false);
    }
  };

  const getSubmissionFileUrl = (file) => {
    if (!file?.url) return "#";
    return file.url.startsWith("http")
      ? file.url
      : `${BACKEND_BASE_URL}${file.url.startsWith("/") ? "" : "/"}${file.url}`;
  };

  // Filter tasks based on activeTab, project, and search query
  const awaitingTasks = tasks.filter((t) => t.status === "Submitted For Review");
  const approvedTasks = tasks.filter((t) => t.status === "Approved");

  const currentList = activeTab === "awaiting" ? awaitingTasks : approvedTasks;

  const filteredTasks = currentList.filter((t) => {
    const matchesProject =
      selectedProjectId === "all" ||
      (t.project?._id || t.project) === selectedProjectId;

    const matchesSearch =
      !searchQuery.trim() ||
      (t.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.assignedTo?.name || "").toLowerCase().includes(searchQuery.toLowerCase());

    return matchesProject && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Review Tasks
            </h1>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                awaitingTasks.length > 0
                  ? "bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700"
              }`}
            >
              {awaitingTasks.length} Awaiting Review
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Verify submitted developer work, approve deliverables, and finalize tasks
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/task-board"
            className="px-3.5 py-2 rounded-lg bg-white dark:bg-[#111827] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition-colors shadow-2xs inline-flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M8 7v7" />
              <path d="M12 7v4" />
              <path d="M16 7v9" />
            </svg>
            <span>Task Board</span>
          </Link>
        </div>
      </div>

      {/* Tabs & Controls */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-4 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Workflow Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("awaiting")}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "awaiting"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <span>Submitted For Review</span>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === "awaiting"
                    ? "bg-purple-800 text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                {awaitingTasks.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("approved")}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "approved"
                  ? "bg-teal-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <span>Approved (Ready To Complete)</span>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === "approved"
                    ? "bg-teal-800 text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                {approvedTasks.length}
              </span>
            </button>
          </div>

          {/* Filters: Project + Search */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Project Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium">Project:</span>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              >
                <option value="all">All Projects</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks or developer..."
                className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 w-52 sm:w-60"
              />
              <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* Task Cards List */}
      {loading ? (
        <div className="text-center py-16 bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-8">
          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading submitted tasks...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-8 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto mb-3 border border-purple-200 dark:border-purple-800">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <p className="text-slate-900 dark:text-white font-semibold text-base">
            {activeTab === "awaiting"
              ? "No tasks waiting for review"
              : "No tasks waiting for final completion"}
          </p>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            {activeTab === "awaiting"
              ? "When developers submit tasks with 'Submit For Review', they will appear here automatically in real time without refreshing."
              : "Tasks you have approved will be listed here ready to mark as completed."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTasks.map((t) => (
            <div
              key={t._id}
              className={`p-5 rounded-xl border bg-white dark:bg-[#111827] transition-all shadow-xs flex flex-col justify-between space-y-4 ${
                t.status === "Submitted For Review"
                  ? "border-purple-200/90 dark:border-purple-900/60 hover:border-purple-300"
                  : "border-teal-200/90 dark:border-teal-900/60 hover:border-teal-300"
              }`}
            >
              <div className="space-y-2.5">
                {/* Header: Project, Status & Priority */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {t.project?.name || "Project"}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                        t.priority === "High"
                          ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400"
                          : t.priority === "Medium"
                          ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400"
                          : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {t.priority}
                    </span>

                    <span
                      className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                        t.status === "Submitted For Review"
                          ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300"
                          : "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          t.status === "Submitted For Review"
                            ? "bg-purple-600 animate-pulse"
                            : "bg-teal-600"
                        }`}
                      ></span>
                      {t.status}
                    </span>
                  </div>
                </div>

                {/* Task Title */}
                <h3 className="font-semibold text-slate-900 dark:text-white text-base leading-snug">
                  {t.title}
                </h3>

                {/* Description */}
                {t.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {t.description}
                  </p>
                )}

                {/* Developer Deliverables Chips */}
                {(t.submissionFiles?.length > 0 || t.githubUrl || t.liveUrl || t.aiReviewResult) && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {t.submissionFiles?.length > 0 && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                        <span>📎 {t.submissionFiles.length} file{t.submissionFiles.length > 1 ? "s" : ""}</span>
                      </span>
                    )}
                    {t.githubUrl && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                        <span>GitHub</span>
                      </span>
                    )}
                    {t.liveUrl && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                        <span>Live Demo</span>
                      </span>
                    )}
                    {t.aiReviewResult && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                        <span>🤖 AI: {t.aiReviewResult.score || `${t.aiReviewResult.completionScore}%`}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Developer Info & Timestamps */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2 truncate mr-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-[10px] shrink-0 border border-indigo-200 dark:border-indigo-800">
                    {t.assignedTo?.name ? t.assignedTo.name.charAt(0).toUpperCase() : "D"}
                  </div>
                  <div className="truncate">
                    <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                      {t.assignedTo?.name || "Assigned Developer"}
                    </p>
                    {t.submittedAt && (
                      <p className="text-[10px] text-slate-400">
                        Submitted: {new Date(t.submittedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </p>
                    )}
                  </div>
                </div>

                {t.approvedAt && (
                  <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium shrink-0">
                    Approved {new Date(t.approvedAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2">
                {t.status === "Submitted For Review" ? (
                  <>
                    {/* 1. Verify Task */}
                    <button
                      type="button"
                      onClick={() => openVerifyModal(t)}
                      className="flex-1 py-2 px-3 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span>Verify Task</span>
                    </button>

                    {/* 2. Approve Task */}
                    <button
                      type="button"
                      disabled={actionLoadingId === t._id}
                      onClick={() => handleApprove(t._id)}
                      className="flex-1 py-2 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {actionLoadingId === t._id ? (
                        <span>Approving...</span>
                      ) : (
                        <>
                          <span>Approve</span>
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  /* Approved -> Mark Completed */
                  <button
                    type="button"
                    disabled={actionLoadingId === t._id}
                    onClick={() => handleComplete(t._id)}
                    className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {actionLoadingId === t._id ? (
                      <span>Completing...</span>
                    ) : (
                      <>
                        <span>Mark Completed ✓</span>
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Verify Task Modal */}
      {verifyTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  Task Verification & Review Portal
                </span>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {verifyTask.title}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Project: {verifyTask.project?.name || "Project"} • Developer: {verifyTask.assignedTo?.name || "Assigned"}
                </p>
              </div>
              <button
                onClick={() => setVerifyTask(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Task Information */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1.5 text-xs">
              <span className="font-semibold text-slate-900 dark:text-white block uppercase tracking-wider text-[11px]">
                Task Requirements & Description:
              </span>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {verifyTask.description || "No description provided."}
              </p>
            </div>

            {/* Developer Work Submission Section */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                  <span>Developer Work Deliverables</span>
                </span>
                {verifyTask.submittedAt && (
                  <span className="text-[10px] text-slate-400">
                    Submitted: {new Date(verifyTask.submittedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </span>
                )}
              </div>

              {/* External Links: GitHub & Live Demo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* GitHub Repo */}
                <div className="p-3 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                    <span>GitHub Repository</span>
                  </span>
                  {verifyTask.githubUrl ? (
                    <a
                      href={verifyTask.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 truncate"
                    >
                      <span className="truncate">{verifyTask.githubUrl}</span>
                      <span>↗</span>
                    </a>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No GitHub link provided</p>
                  )}
                </div>

                {/* Live Project Demo */}
                <div className="p-3 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                    <span>Live Project Demo</span>
                  </span>
                  {verifyTask.liveUrl ? (
                    <a
                      href={verifyTask.liveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 truncate"
                    >
                      <span className="truncate">{verifyTask.liveUrl}</span>
                      <span>↗</span>
                    </a>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No live demo link provided</p>
                  )}
                </div>
              </div>

              {/* Developer Notes */}
              {verifyTask.developerNotes && (
                <div className="p-3 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    Developer Notes:
                  </span>
                  <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                    {verifyTask.developerNotes}
                  </p>
                </div>
              )}

              {/* Uploaded Files */}
              {verifyTask.submissionFiles && verifyTask.submissionFiles.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    Attached Files ({verifyTask.submissionFiles.length}):
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {verifyTask.submissionFiles.map((f, idx) => {
                      const fileUrl = getSubmissionFileUrl(f);
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                        >
                          <div className="flex items-center gap-2 truncate mr-2">
                            <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-[10px]">
                              {(f.name || "").split(".").pop().toUpperCase()}
                            </span>
                            <span className="font-medium text-slate-900 dark:text-white truncate">
                              {f.name}
                            </span>
                            {f.size && (
                              <span className="text-[10px] text-slate-400">
                                ({(f.size / (1024 * 1024)).toFixed(2)} MB)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => window.open(fileUrl, "_blank")}
                              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-300 font-medium"
                            >
                              Preview
                            </button>
                            <a
                              href={fileUrl}
                              download={f.name || "file"}
                              className="px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-[11px] text-indigo-700 dark:text-indigo-300 font-medium"
                            >
                              Download
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* AI Work Verification Section */}
            <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l2.4 7.2h7.6l-6.1 4.5 2.3 7.1-6.2-4.6-6.2 4.6 2.3-7.1-6.1-4.5h7.6z" />
                  </svg>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    AI Work Verification (Groq API)
                  </span>
                </div>

                <button
                  type="button"
                  disabled={aiReviewLoading}
                  onClick={() => handleRunAiReview(verifyTask._id)}
                  className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors shadow-2xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {aiReviewLoading ? (
                    <span>Evaluating...</span>
                  ) : (
                    <>
                      <span>{verifyTask.aiReviewResult ? "Re-run AI Review" : "AI Review Submission"}</span>
                      <svg className="w-3 h-3 text-yellow-300" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l2.4 7.2h7.6l-6.1 4.5 2.3 7.1-6.2-4.6-6.2 4.6 2.3-7.1-6.1-4.5h7.6z" />
                      </svg>
                    </>
                  )}
                </button>
              </div>

              {aiReviewError && (
                <p className="text-xs text-rose-600 dark:text-rose-400">{aiReviewError}</p>
              )}

              {verifyTask.aiReviewResult ? (
                <div className="space-y-3 pt-1">
                  {/* Score & Summary */}
                  <div className="flex items-center justify-between bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/60">
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Completion Score:</span>
                    <span
                      className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${
                        (verifyTask.aiReviewResult.completionScore || parseInt(verifyTask.aiReviewResult.score) || 0) >= 80
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : (verifyTask.aiReviewResult.completionScore || parseInt(verifyTask.aiReviewResult.score) || 0) >= 50
                          ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300"
                          : "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300"
                      }`}
                    >
                      {verifyTask.aiReviewResult.score || `${verifyTask.aiReviewResult.completionScore}%`}
                    </span>
                  </div>

                  {verifyTask.aiReviewResult.reviewSummary && (
                    <p className="text-xs text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800 leading-relaxed">
                      {verifyTask.aiReviewResult.reviewSummary}
                    </p>
                  )}

                  {/* Match Analysis */}
                  {Array.isArray(verifyTask.aiReviewResult.matchAnalysis) && verifyTask.aiReviewResult.matchAnalysis.length > 0 && (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {verifyTask.aiReviewResult.matchAnalysis.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-[11px] flex items-center justify-between gap-2"
                        >
                          <div className="truncate">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{item.requirement}</span>
                            <span className="text-slate-400"> → {item.submission}</span>
                          </div>
                          <span
                            className={`px-1.5 py-0.2 rounded-full font-bold text-[9px] shrink-0 border ${
                              item.result === "Matched"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : item.result === "Partially Matched"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            {item.result || "Matched"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Missing Points */}
                  {Array.isArray(verifyTask.aiReviewResult.missingPoints) && verifyTask.aiReviewResult.missingPoints.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        Missing Points:
                      </span>
                      <ul className="list-disc list-inside text-xs text-slate-700 dark:text-slate-300 space-y-0.5">
                        {verifyTask.aiReviewResult.missingPoints.map((pt, idx) => (
                          <li key={idx}>{pt}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="text-[10px] text-slate-400 italic">
                    * AI review provided as assistive guidance. Company reviewer makes the final decision.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                  Click "AI Review Submission" to automatically verify task requirements against developer deliverables.
                </p>
              )}
            </div>

            {/* Verification Checklist */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                Verification Checklist
              </span>
              <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.codeReviewed}
                  onChange={(e) => setChecklist((prev) => ({ ...prev, codeReviewed: e.target.checked }))}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4"
                />
                <span>Code, implementation, and deliverables have been inspected</span>
              </label>
              <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.acceptanceMet}
                  onChange={(e) => setChecklist((prev) => ({ ...prev, acceptanceMet: e.target.checked }))}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4"
                />
                <span>All acceptance criteria and task objectives are satisfied</span>
              </label>
              <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.qualityChecked}
                  onChange={(e) => setChecklist((prev) => ({ ...prev, qualityChecked: e.target.checked }))}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4"
                />
                <span>Work meets standard design and quality requirements</span>
              </label>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <Link
                to={`/tasks/${verifyTask._id}`}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
              >
                Open Full Task Page →
              </Link>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRequestRevisions(verifyTask._id)}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-700 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  Request Revisions
                </button>
                <button
                  type="button"
                  disabled={!checklist.codeReviewed || !checklist.acceptanceMet || !checklist.qualityChecked}
                  onClick={() => handleApprove(verifyTask._id)}
                  className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Approve Work</span>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewTasks;
