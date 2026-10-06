import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import UserProfileModal from "../components/UserProfileModal";

const BACKEND_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1"
).replace(/\/api\/v1\/?$/, "");

const TaskDetails = () => {
  const { id: taskId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit Task modal state (Admin / Company)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: "",
    description: "",
    priority: "Medium",
    dueDate: ""
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // User Profile Explorer modal state
  const [profileModalUserId, setProfileModalUserId] = useState(null);
  const [profileModalUserObj, setProfileModalUserObj] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Status updating state
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [assigneeUpdating, setAssigneeUpdating] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);

  // Comments state
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState("");

  // Attachments state
  const [attachments, setAttachments] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [attachmentError, setAttachmentError] = useState("");
  const [attachmentSuccess, setAttachmentSuccess] = useState("");

  // Permission helpers
  const isCompanyOwner =
    user?.role === "company" &&
    ((task?.project?.owner?._id || task?.project?.owner) === user?._id ||
      (task?.createdBy?._id || task?.createdBy) === user?._id);

  const canManageTask =
    user?.role === "admin" ||
    user?.role === "manager" ||
    isCompanyOwner;

  const canUpdateStatus =
    canManageTask ||
    (user?.role === "developer" &&
      (task?.assignedTo?._id || task?.assignedTo) === user?._id);

  // Fetch task, comments, and attachments
  const fetchTaskDetails = async () => {
    try {
      setLoading(true);
      setError("");

      const [taskRes, commentsRes, attachmentsRes] = await Promise.allSettled([
        API.get(`/tasks/${taskId}`),
        API.get(`/tasks/${taskId}/comments`),
        API.get(`/tasks/${taskId}/attachments`)
      ]);

      if (taskRes.status === "fulfilled" && taskRes.value.data?.success) {
        setTask(taskRes.value.data.data.task);
      } else {
        setError("Failed to load task details");
      }

      if (commentsRes.status === "fulfilled" && commentsRes.value.data?.success) {
        setComments(commentsRes.value.data.data.comments || []);
      }

      if (attachmentsRes.status === "fulfilled" && attachmentsRes.value.data?.success) {
        setAttachments(attachmentsRes.value.data.data.attachments || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load task details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (taskId) {
      fetchTaskDetails();
    }
  }, [taskId]);

  // Fetch users for task assignment (Admin, Manager, Company)
  useEffect(() => {
    const fetchUsers = async () => {
      if (user?.role === "company" && task?.project?._id) {
        try {
          const res = await API.get(`/projects/${task.project._id}/accepted-users`);
          if (res.data?.success && res.data.data?.users) {
            setAvailableUsers(res.data.data.users);
            return;
          }
        } catch (err) {
          console.error("Failed to load accepted users:", err);
        }
      }

      if (user?.role === "admin" || user?.role === "manager") {
        try {
          const res = await API.get("/users");
          const list = res.data?.data || res.data?.users || [];
          if (Array.isArray(list) && list.length > 0) {
            setAvailableUsers(list);
            return;
          }
        } catch (err) {
          console.error("Failed to load users for assignment:", err);
        }
      }

      // Fallback to project developer responses or members
      if (task?.project) {
        if (Array.isArray(task.project.developerResponses)) {
          const acceptedDevs = task.project.developerResponses
            .filter((r) => r.status === "Accepted" || r.status === "In Progress")
            .map((r) => r.developer)
            .filter(Boolean);
          if (acceptedDevs.length > 0) {
            setAvailableUsers(acceptedDevs);
            return;
          }
        }
        if (Array.isArray(task.project.members) && task.project.members.length > 0) {
          setAvailableUsers(task.project.members);
        }
      }
    };

    fetchUsers();
  }, [user?.role, task?.project]);

  // Handle Open Edit Modal
  const handleOpenEdit = () => {
    setEditError("");
    setEditFormData({
      title: task?.title || "",
      description: task?.description || "",
      priority: task?.priority || "Medium",
      dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : ""
    });
    setIsEditModalOpen(true);
  };

  // Handle Save Edit Form
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editFormData.title.trim()) return;

    try {
      setEditLoading(true);
      setEditError("");

      const payload = {
        title: editFormData.title.trim(),
        description: editFormData.description.trim(),
        priority: editFormData.priority
      };
      if (editFormData.dueDate) {
        payload.dueDate = editFormData.dueDate;
      }

      const res = await API.put(`/tasks/${taskId}`, payload);
      if (res.data?.success) {
        setTask(res.data.data.task);
        setIsEditModalOpen(false);
      }
    } catch (err) {
      setEditError(err.response?.data?.message || "Failed to update task");
    } finally {
      setEditLoading(false);
    }
  };

  // Handle Delete Task (Admin / Company)
  const handleDeleteTask = async () => {
    if (!window.confirm("Are you sure you want to permanently delete this task?")) return;
    try {
      const res = await API.delete(`/tasks/${taskId}`);
      if (res.data?.success) {
        navigate(`/task-board?project=${task?.project?._id || ""}`);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete task");
    }
  };

  // Handle Status Update
  const handleStatusChange = async (newStatus) => {
    try {
      setStatusUpdating(true);
      const res = await API.put(`/tasks/${taskId}`, { status: newStatus });
      if (res.data?.success) {
        setTask((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update status");
    } finally {
      setStatusUpdating(false);
    }
  };

  // Handle Assignee Change (Admin/Manager)
  const handleAssigneeChange = async (newAssigneeId) => {
    try {
      setAssigneeUpdating(true);
      const res = await API.put(`/tasks/${taskId}`, {
        assignedTo: newAssigneeId || null
      });
      if (res.data?.success) {
        const assignedObj = availableUsers.find((u) => u._id === newAssigneeId);
        setTask((prev) => ({
          ...prev,
          assignedTo: assignedObj || (newAssigneeId ? { _id: newAssigneeId } : null)
        }));
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update assignee");
    } finally {
      setAssigneeUpdating(false);
    }
  };

  // Handle Add Comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      setCommentLoading(true);
      setCommentError("");

      const res = await API.post(`/tasks/${taskId}/comments`, {
        text: commentText.trim()
      });

      if (res.data?.success) {
        setCommentText("");
        // Refresh comments list
        const commentsRes = await API.get(`/tasks/${taskId}/comments`);
        setComments(commentsRes.data?.data?.comments || []);
      }
    } catch (err) {
      setCommentError(
        err.response?.data?.message || "Failed to post comment"
      );
    } finally {
      setCommentLoading(false);
    }
  };

  // Handle Delete Comment
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;

    try {
      const res = await API.delete(`/tasks/${taskId}/comments/${commentId}`);
      if (res.data?.success) {
        setComments((prev) => prev.filter((c) => c._id !== commentId));
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete comment");
    }
  };

  // Handle Upload Attachment
  const handleUploadAttachment = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    // 5 MB file size limit
    if (selectedFile.size > 5 * 1024 * 1024) {
      setAttachmentError("File size exceeds the 5 MB limit");
      return;
    }

    try {
      setUploadLoading(true);
      setAttachmentError("");
      setAttachmentSuccess("");

      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await API.post(`/tasks/${taskId}/attachments`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (res.data?.success) {
        setSelectedFile(null);
        setAttachmentSuccess("Upload successful");
        // Reset file input
        const fileInput = document.getElementById("attachment-input");
        if (fileInput) fileInput.value = "";

        // Refresh attachments
        const refreshed = await API.get(`/tasks/${taskId}/attachments`);
        setAttachments(refreshed.data?.data?.attachments || []);
      }
    } catch (err) {
      setAttachmentError(
        err.response?.data?.message || "Upload failed"
      );
    } finally {
      setUploadLoading(false);
    }
  };

  // Handle Delete Attachment
  const handleDeleteAttachment = async (attachmentId) => {
    if (!window.confirm("Are you sure you want to delete this attachment?")) return;

    try {
      const res = await API.delete(
        `/tasks/${taskId}/attachments/${attachmentId}`
      );
      if (res.data?.success) {
        setAttachments((prev) => prev.filter((a) => a._id !== attachmentId));
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete attachment");
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center text-slate-500 dark:text-slate-400 text-sm">
        Loading task details...
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center space-y-4">
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-sm max-w-md mx-auto">
          {error || "Task not found."}
        </div>
        <Link
          to="/task-board"
          className="text-xs sm:text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1.5"
        >
          <span>← Back to Task Board</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Link */}
      <div>
        <Link
          to={`/task-board?project=${task.project?._id || ""}`}
          className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 inline-flex items-center gap-1.5 transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" x2="5" y1="12" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Back to Task Board ({task.project?.name || "Project"})</span>
        </Link>
      </div>

      {/* Main Task Header & Details */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-6 sm:p-7 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
              {task.project?.name || "Project Task"}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-2">
              {task.title}
            </h1>
          </div>

          {/* Status selector and Admin/Company Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="flex items-center space-x-2">
              <label htmlFor="task-status-select" className="text-xs text-slate-500 dark:text-slate-400 font-medium">Status:</label>
              <select
                id="task-status-select"
                disabled={statusUpdating || !canUpdateStatus}
                value={task.status === "Done" ? "Completed" : task.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                title={!canUpdateStatus ? "Only the assigned developer, project owner, or admin can update status" : "Update status"}
                className="text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="Todo">Todo</option>
                <option value="In Progress">In Progress</option>
                <option value="Submitted For Review">Submitted For Review</option>
                <option value="Approved" disabled={user?.role === "developer"}>
                  Approved {user?.role === "developer" ? "(Company Only)" : ""}
                </option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            {canManageTask && (
              <>
                <button
                  type="button"
                  onClick={handleOpenEdit}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-medium transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                  title="Edit Task Details"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={handleDeleteTask}
                  className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 text-xs font-medium transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                  title="Delete Task"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  <span>Delete</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Workflow Lifecycle Stepper & Action Banners */}
        {(() => {
          const workflowSteps = [
            { id: "Todo", title: "Todo", desc: "Backlog" },
            { id: "In Progress", title: "In Progress", desc: "Developing" },
            { id: "Submitted For Review", title: "Submitted", desc: "Under Review" },
            { id: "Approved", title: "Approved", desc: "Company Accepted" },
            { id: "Completed", title: "Completed", desc: "Work Finished" }
          ];

          const getStepIndex = (status) => {
            if (status === "Done") return 4;
            const idx = workflowSteps.findIndex((s) => s.id === status);
            return idx >= 0 ? idx : 0;
          };

          const currentStepIdx = getStepIndex(task.status);
          const isAssignedDev =
            user?.role === "developer" &&
            ((task?.assignedTo?._id || task?.assignedTo) === user?._id);

          return (
            <div className="space-y-4">
              <div className="p-4 sm:p-5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/70 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Workflow Status
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    Current: {task.status === "Done" ? "Completed" : task.status}
                  </span>
                </div>

                {/* 5-Step Progress Steps */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {workflowSteps.map((step, idx) => {
                    const isPast = idx < currentStepIdx;
                    const isCurrent = idx === currentStepIdx;

                    return (
                      <div
                        key={step.id}
                        className={`p-2.5 rounded-lg border text-center transition-all ${
                          isCurrent
                            ? "bg-white dark:bg-slate-900 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs"
                            : isPast
                            ? "bg-white/70 dark:bg-slate-900/40 border-teal-300 dark:border-teal-800 text-teal-700 dark:text-teal-400"
                            : "bg-slate-100/50 dark:bg-slate-900/20 border-slate-200/60 dark:border-slate-800 text-slate-400 opacity-70"
                        }`}
                      >
                        <div className="flex items-center justify-center mb-1">
                          <span
                            className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                              isCurrent
                                ? "bg-indigo-600 text-white"
                                : isPast
                                ? "bg-teal-600 text-white"
                                : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                            }`}
                          >
                            {isPast ? "✓" : idx + 1}
                          </span>
                        </div>
                        <p className="text-xs font-bold truncate text-slate-900 dark:text-white">
                          {step.title}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                          {step.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Developer Workflow Action Banner */}
              {isAssignedDev && (
                <div className="p-4 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-blue-900 dark:text-blue-200">
                      Developer Workflow Control
                    </h3>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                      {task.status === "Todo" && "You are assigned to this task. Start working when ready."}
                      {task.status === "In Progress" && "You are actively working on this task. Submit for review once your changes are ready."}
                      {task.status === "Submitted For Review" && "Work submitted! The company will review your submission and approve it."}
                      {task.status === "Approved" && "Company approved your work! Mark it completed to finish the task."}
                      {(task.status === "Completed" || task.status === "Done") && "Task is completed and verified. Great job!"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {task.status === "Todo" && (
                      <button
                        type="button"
                        disabled={statusUpdating}
                        onClick={() => handleStatusChange("In Progress")}
                        className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
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
                        disabled={statusUpdating}
                        onClick={() => handleStatusChange("Submitted For Review")}
                        className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition-colors shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <span>Submit For Review</span>
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="22" y1="2" x2="11" y2="13" />
                          <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                      </button>
                    )}

                    {task.status === "Approved" && (
                      <button
                        type="button"
                        disabled={statusUpdating}
                        onClick={() => handleStatusChange("Completed")}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <span>Mark Completed ✓</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Company Review Banner (when submitted for review or approved) */}
              {(user?.role === "company" || user?.role === "admin") && (
                <div className="space-y-2">
                  {task.status === "Submitted For Review" && (
                    <div className="p-4 rounded-xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
                          <h3 className="text-xs sm:text-sm font-bold text-purple-900 dark:text-purple-200">
                            Work Submitted For Review
                          </h3>
                        </div>
                        <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                          The developer has finished their tasks and requested review. Inspect the details and attachments, then approve or request changes.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={statusUpdating}
                          onClick={() => handleStatusChange("In Progress")}
                          className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 border border-slate-300 dark:border-slate-700 text-xs font-semibold transition-colors disabled:opacity-50"
                          title="Send back for revisions"
                        >
                          Request Revisions
                        </button>
                        <button
                          type="button"
                          disabled={statusUpdating}
                          onClick={() => handleStatusChange("Approved")}
                          className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition-colors shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
                          title="Approve completed work"
                        >
                          <span>Approve Work</span>
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}

                  {task.status === "Approved" && (
                    <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs text-teal-800 dark:text-teal-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-semibold">
                        <span>✓ Work Approved by Company</span>
                      </span>
                      <span className="text-[11px] text-teal-600 dark:text-teal-400">
                        Waiting for developer to mark completed
                      </span>
                    </div>
                  )}

                  {(task.status === "Completed" || task.status === "Done") && (
                    <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 font-semibold">
                      <span>✓ Task Fully Completed and Verified</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* Description */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Description
          </h2>
          <div className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm leading-relaxed whitespace-pre-line bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
            {task.description || "No description provided for this task."}
          </div>
        </div>

        {/* Task Metadata Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* Priority */}
          <div className="bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Priority
            </p>
            <div className="mt-2">
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                  task.priority === "High"
                    ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/50"
                    : task.priority === "Medium"
                    ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${
                  task.priority === "High" ? "bg-rose-500" : task.priority === "Medium" ? "bg-amber-500" : "bg-slate-400"
                }`}></span>
                {task.priority || "Medium"}
              </span>
            </div>
          </div>

          {/* Assigned User */}
          <div className="bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Assigned To
            </p>
            {canManageTask ? (
              <>
                <select
                  disabled={assigneeUpdating}
                  value={task.assignedTo?._id || task.assignedTo || ""}
                  onChange={(e) => handleAssigneeChange(e.target.value)}
                  className="w-full text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs mt-1"
                >
                  <option value="">Unassigned</option>
                  {task.assignedTo &&
                    !availableUsers.some(
                      (u) => u._id === (task.assignedTo?._id || task.assignedTo)
                    ) && (
                      <option value={task.assignedTo?._id || task.assignedTo}>
                        {task.assignedTo?.name || "Assigned Developer"}
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
                {user?.role === "company" && availableUsers.length === 0 && (
                  <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                    ⚠️ Only developers who have accepted this project can be assigned tasks. No developers have accepted yet.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm font-medium text-slate-900 dark:text-white mt-1.5">
                {task.assignedTo?.name || "Unassigned"}
              </p>
            )}

            {/* Display Assigned User's Details & Decision Support Card */}
            {(() => {
              const currentAssigneeId = task.assignedTo?._id || task.assignedTo;
              if (!currentAssigneeId) return null;
              const assignedUser =
                availableUsers.find((u) => u._id === currentAssigneeId) ||
                (task.assignedTo && typeof task.assignedTo === "object" ? task.assignedTo : null);
              if (!assignedUser) return null;

              const pendingCount =
                assignedUser.pendingTasks !== undefined
                  ? assignedUser.pendingTasks
                  : assignedUser.taskStats?.pending ?? 0;
              const completedCount =
                assignedUser.completedTasks !== undefined
                  ? assignedUser.completedTasks
                  : assignedUser.taskStats?.completed ?? 0;

              return (
                <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Status:</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {assignedUser.isActive !== false ? "Available" : "Unavailable"}
                    </span>
                  </div>

                  {/* Bio */}
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Bio: </span>
                    <span className="text-slate-700 dark:text-slate-300 italic">
                      {assignedUser.bio && assignedUser.bio.trim()
                        ? `"${assignedUser.bio}"`
                        : "No bio added yet"}
                    </span>
                  </div>

                  {/* Skills */}
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Skills: </span>
                    {assignedUser.skills && assignedUser.skills.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {assignedUser.skills.map((skill, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500 italic">No skills listed</span>
                    )}
                  </div>

                  {/* Task counts & Profile Button */}
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-[11px]">
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
                        setProfileModalUserId(assignedUser._id);
                        setProfileModalUserObj(assignedUser);
                        setIsProfileModalOpen(true);
                      }}
                      className="px-2 py-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 text-[11px] font-medium transition-colors"
                    >
                      Profile View →
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Due Date */}
          <div className="bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Due Date
            </p>
            <p className="text-sm font-medium text-slate-900 dark:text-white mt-2 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                <line x1="16" x2="16" y1="2" y2="6" />
                <line x1="8" x2="8" y1="2" y2="6" />
                <line x1="3" x2="21" y1="10" y2="10" />
              </svg>
              <span>
                {task.dueDate
                  ? new Date(task.dueDate).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric"
                    })
                  : "No due date set"}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Comments Section */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-6 sm:p-7 shadow-xs space-y-6">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
          Discussion & Comments ({comments.length})
        </h2>

        {commentError && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-xs sm:text-sm">
            {commentError}
          </div>
        )}

        {/* Add Comment Form */}
        <form onSubmit={handleAddComment} className="space-y-3">
          <textarea
            rows={3}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a comment or project update..."
            required
            className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={commentLoading || !commentText.trim()}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors shadow-xs disabled:opacity-50"
            >
              {commentLoading ? "Posting..." : "Post Comment"}
            </button>
          </div>
        </form>

        {/* Comments List */}
        <div className="space-y-3 pt-2">
          {comments.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-6">
              No comments yet. Be the first to share an update.
            </p>
          ) : (
            comments.map((comment) => {
              const isOwner =
                comment.user?._id?.toString() === user?._id?.toString();

              return (
                <div
                  key={comment._id}
                  className="bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 rounded-xl p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center font-bold text-xs">
                        {comment.user?.name ? comment.user.name.charAt(0).toUpperCase() : "U"}
                      </div>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                        {comment.user?.name || "User"}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {new Date(comment.createdAt).toLocaleDateString(
                          undefined,
                          {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          }
                        )}
                      </span>
                    </div>

                    {isOwner && (
                      <button
                        onClick={() => handleDeleteComment(comment._id)}
                        className="text-xs text-rose-600 dark:text-rose-400 hover:underline"
                        title="Delete comment"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap pl-8">
                    {comment.text}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Attachments Section */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-6 sm:p-7 shadow-xs space-y-6">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
          Attachments ({attachments.length})
        </h2>

        {attachmentSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs sm:text-sm">
            {attachmentSuccess}
          </div>
        )}

        {attachmentError && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-xs sm:text-sm">
            {attachmentError}
          </div>
        )}

        {/* Upload Attachment Form */}
        <form
          onSubmit={handleUploadAttachment}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
        >
          <input
            id="attachment-input"
            type="file"
            accept=".pdf,.docx,.png,.jpg,.jpeg"
            onChange={(e) => {
              setSelectedFile(e.target.files[0] || null);
              setAttachmentError("");
              setAttachmentSuccess("");
            }}
            className="flex-1 text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-200 hover:file:bg-slate-200 dark:hover:file:bg-slate-700 cursor-pointer"
          />
          <button
            type="submit"
            disabled={uploadLoading || !selectedFile}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors shadow-xs disabled:opacity-50"
          >
            {uploadLoading ? "Uploading..." : "Upload File"}
          </button>
        </form>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Supported formats: PDF, DOCX, PNG, JPG, JPEG (Max 5 MB)
        </p>

        {/* Uploaded Files Section */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Uploaded Files
          </h3>

          {attachments.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-6">
              No files attached to this task.
            </p>
          ) : (
            <div className="space-y-2">
              {attachments.map((file) => {
                const canDelete =
                  user?.role?.toLowerCase() === "admin" ||
                  file.uploadedBy?._id?.toString() === user?._id?.toString() ||
                  file.uploadedBy?.toString() === user?._id?.toString();

                const ext = (file.originalName || "").split(".").pop().toLowerCase();
                const isImg = ["png", "jpg", "jpeg"].includes(ext) || file.fileType?.startsWith("image/");
                const isDoc = ["pdf", "docx", "doc"].includes(ext) || file.fileType?.includes("pdf") || file.fileType?.includes("word");

                const fileSizeFormatted = file.fileSize
                  ? `${(file.fileSize / 1024).toFixed(1)} KB`
                  : file.size
                  ? `${(file.size / 1024).toFixed(1)} KB`
                  : null;

                const uploadDate = file.createdAt
                  ? new Date(file.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric"
                    })
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
                    className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                  >
                    <div className="flex items-center space-x-3 truncate mr-2">
                      <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                        {isImg ? (
                          <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                            <circle cx="9" cy="9" r="2" />
                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                          </svg>
                        ) : isDoc ? (
                          <svg className="w-4 h-4 text-sky-600 dark:text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                          </svg>
                        )}
                      </div>
                      <div className="truncate">
                        <p className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white truncate">
                          {file.originalName || "File"}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {uploadDate ? `Uploaded ${uploadDate}` : ""}
                          {fileSizeFormatted ? ` • ${fileSizeFormatted}` : ""}
                          {file.uploadedBy?.name ? ` by ${file.uploadedBy.name}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      {fileUrl && (
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          View / Download
                        </a>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteAttachment(file._id)}
                          className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline"
                          title="Delete attachment"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

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

      {/* Edit Task Modal (Admin & Company) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Edit Task
              </h2>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                title="Close"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-xs sm:text-sm">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.title}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="w-full px-3.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={editFormData.description}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className="w-full px-3.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Priority
                  </label>
                  <select
                    value={editFormData.priority}
                    onChange={(e) =>
                      setEditFormData((prev) => ({ ...prev, priority: e.target.value }))
                    }
                    className="w-full px-3.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={editFormData.dueDate}
                    onChange={(e) =>
                      setEditFormData((prev) => ({ ...prev, dueDate: e.target.value }))
                    }
                    className="w-full px-3.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading || !editFormData.title.trim()}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors shadow-xs disabled:opacity-50"
                >
                  {editLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskDetails;
