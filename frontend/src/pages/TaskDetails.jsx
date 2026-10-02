import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";

const TaskDetails = () => {
  const { id: taskId } = useParams();
  const { user } = useAuth();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  // Fetch users for task assignment (Admin/Manager)
  useEffect(() => {
    const fetchUsers = async () => {
      if (user?.role === "admin" || user?.role === "manager") {
        try {
          const res = await API.get("/users");
          const list = res.data?.data || res.data?.users || [];
          if (Array.isArray(list) && list.length > 0) {
            setAvailableUsers(list);
          }
        } catch (err) {
          console.error("Failed to load users for assignment:", err);
        }
      }
    };

    fetchUsers();
  }, [user?.role]);

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

  // Handle Assignee Update (Admin/Manager)
  const handleAssigneeChange = async (newAssigneeId) => {
    try {
      setAssigneeUpdating(true);
      if (newAssigneeId && task?.project) {
        const projId = task.project._id || task.project;
        const wsId = task.workspace?._id || task.workspace;
        if (wsId) {
          await API.post(`/workspaces/${wsId}/members`, { userId: newAssigneeId }).catch(() => {});
        }
        if (projId) {
          await API.post(`/projects/${projId}/members`, { userId: newAssigneeId }).catch(() => {});
        }
      }

      const res = await API.put(`/tasks/${taskId}`, {
        assignedTo: newAssigneeId || null
      });
      if (res.data?.success) {
        const found = availableUsers.find((u) => u._id === newAssigneeId);
        setTask((prev) => ({
          ...prev,
          assignedTo: found || (newAssigneeId ? { _id: newAssigneeId, name: "Assigned User" } : null)
        }));
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update assigned user");
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
        const refreshed = await API.get(`/tasks/${taskId}/comments`);
        setComments(refreshed.data?.data?.comments || []);
      }
    } catch (err) {
      setCommentError(err.response?.data?.message || "Failed to post comment");
    } finally {
      setCommentLoading(false);
    }
  };

  // Handle Delete Comment
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;

    try {
      const res = await API.delete(`/comments/${commentId}`);
      if (res.data?.success) {
        setComments((prev) => prev.filter((c) => c._id !== commentId));
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete comment");
    }
  };

  // Handle File Upload Attachment
  const handleUploadAttachment = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    try {
      setUploadLoading(true);
      setAttachmentError("");

      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await API.post(`/tasks/${taskId}/attachments`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (res.data?.success) {
        setSelectedFile(null);
        // Reset file input
        const fileInput = document.getElementById("attachment-input");
        if (fileInput) fileInput.value = "";

        // Refresh attachments
        const refreshed = await API.get(`/tasks/${taskId}/attachments`);
        setAttachments(refreshed.data?.data?.attachments || []);
      }
    } catch (err) {
      setAttachmentError(
        err.response?.data?.message || "Failed to upload attachment"
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
      <div className="max-w-4xl mx-auto py-16 text-center text-slate-400">
        Loading task details...
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center space-y-4">
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error || "Task not found."}
        </div>
        <Link
          to="/task-board"
          className="text-sm text-indigo-400 hover:underline"
        >
          ← Back to Task Board
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Back Link */}
      <div>
        <Link
          to={`/task-board?project=${task.project?._id || ""}`}
          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1.5"
        >
          ← Back to Task Board ({task.project?.name || "Project"})
        </Link>
      </div>

      {/* Main Task Header & Details */}
      <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-lg space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-700/60">
          <div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-700 text-slate-300 border border-slate-600">
              {task.project?.name || "Project Task"}
            </span>
            <h1 className="text-2xl font-bold text-white mt-2">{task.title}</h1>
          </div>

          {/* Status selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-medium">Status:</span>
            <select
              disabled={statusUpdating}
              value={task.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="text-sm bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="Todo">Todo</option>
              <option value="In Progress">In Progress</option>
              <option value="Done">Done</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Description
          </h2>
          <p className="text-slate-200 text-sm sm:text-base leading-relaxed whitespace-pre-line bg-slate-900/50 p-4 rounded-xl border border-slate-800">
            {task.description || "No description provided for this task."}
          </p>
        </div>

        {/* Task Metadata Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* Priority */}
          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Priority
            </p>
            <p
              className={`text-sm font-semibold mt-1 capitalize ${
                task.priority === "High"
                  ? "text-red-400"
                  : task.priority === "Medium"
                  ? "text-amber-400"
                  : "text-slate-300"
              }`}
            >
              ● {task.priority || "Medium"}
            </p>
          </div>

          {/* Assigned User */}
          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">
              Assigned To
            </p>
            {user?.role === "admin" || user?.role === "manager" ? (
              <select
                disabled={assigneeUpdating}
                value={task.assignedTo?._id || task.assignedTo || ""}
                onChange={(e) => handleAssigneeChange(e.target.value)}
                className="w-full text-sm bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500 mt-1"
              >
                <option value="">Unassigned</option>
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
            ) : (
              <p className="text-sm font-medium text-slate-200 mt-1">
                {task.assignedTo?.name || "Unassigned"}
              </p>
            )}
          </div>

          {/* Due Date */}
          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Due Date
            </p>
            <p className="text-sm font-medium text-slate-200 mt-1">
              {task.dueDate
                ? new Date(task.dueDate).toLocaleDateString()
                : "No due date"}
            </p>
          </div>
        </div>
      </div>

      {/* Module 17: Comments UI */}
      <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-lg space-y-6">
        <h2 className="text-lg font-bold text-white">
          Comments ({comments.length})
        </h2>

        {commentError && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {commentError}
          </div>
        )}

        {/* Add Comment Form */}
        <form onSubmit={handleAddComment} className="space-y-3">
          <textarea
            rows={3}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a comment..."
            required
            className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={commentLoading || !commentText.trim()}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
            >
              {commentLoading ? "Posting..." : "Post Comment"}
            </button>
          </div>
        </form>

        {/* Comments List */}
        <div className="space-y-3 pt-2">
          {comments.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">
              No comments yet. Be the first to share an update.
            </p>
          ) : (
            comments.map((comment) => {
              const isOwner =
                comment.user?._id?.toString() === user?._id?.toString();

              return (
                <div
                  key={comment._id}
                  className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-300 flex items-center justify-center font-bold text-xs">
                        {comment.user?.name ? comment.user.name.charAt(0) : "U"}
                      </div>
                      <span className="font-semibold text-slate-200 text-xs sm:text-sm">
                        {comment.user?.name || "User"}
                      </span>
                      <span className="text-[11px] text-slate-500">
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
                        className="text-xs text-red-400 hover:text-red-300"
                        title="Delete comment"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap pl-8">
                    {comment.text}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Module 18: Attachments UI */}
      <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-lg space-y-6">
        <h2 className="text-lg font-bold text-white">
          Attachments ({attachments.length})
        </h2>

        {attachmentError && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
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
            onChange={(e) => setSelectedFile(e.target.files[0] || null)}
            className="flex-1 text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-slate-700 file:text-slate-200 hover:file:bg-slate-600 cursor-pointer"
          />
          <button
            type="submit"
            disabled={uploadLoading || !selectedFile}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
          >
            {uploadLoading ? "Uploading..." : "Upload File"}
          </button>
        </form>
        <p className="text-[11px] text-slate-500">
          Supported formats: PDF, DOCX, PNG, JPG, JPEG (Max 5 MB)
        </p>

        {/* Attachments List */}
        <div className="space-y-2 pt-2">
          {attachments.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">
              No files attached to this task.
            </p>
          ) : (
            attachments.map((file) => {
              const isUploader =
                file.uploadedBy?._id?.toString() === user?._id?.toString();

              return (
                <div
                  key={file._id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800"
                >
                  <div className="flex items-center space-x-3 truncate">
                    <span className="text-lg">📎</span>
                    <div className="truncate">
                      <p className="text-sm font-medium text-slate-200 truncate">
                        {file.originalName || "File"}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Type: {file.mimeType || "Unknown"} •{" "}
                        {file.size
                          ? `${(file.size / 1024).toFixed(1)} KB`
                          : "Unknown size"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    {file.url && (
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-indigo-400 hover:underline"
                      >
                        View / Download
                      </a>
                    )}
                    {isUploader && (
                      <button
                        onClick={() => handleDeleteAttachment(file._id)}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskDetails;
