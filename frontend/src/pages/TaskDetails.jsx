import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import UserProfileModal from "../components/UserProfileModal";

const BACKEND_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1"
).replace(/\/api\/v1\/?$/, "");

const TaskDetails = () => {
  const { id: taskId } = useParams();
  const { user } = useAuth();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    if (!selectedFile) {
      setAttachmentError("Please select a file to upload");
      return;
    }

    // Supported formats validation matching backend
    const allowedExtensions = [".pdf", ".docx", ".png", ".jpg", ".jpeg"];
    const fileExt = "." + selectedFile.name.split(".").pop().toLowerCase();
    if (!allowedExtensions.includes(fileExt)) {
      setAttachmentError("Invalid file. Only PDF, DOCX, PNG, JPG, and JPEG are allowed.");
      return;
    }

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
          className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline inline-block"
        >
          ← Back to Task Board
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
          ← Back to Task Board ({task.project?.name || "Project"})
        </Link>
      </div>

      {/* Main Task Header & Details */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 sm:p-7 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-700">
          <div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
              {task.project?.name || "Project Task"}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-2">
              {task.title}
            </h1>
          </div>

          {/* Status selector */}
          <div className="flex items-center space-x-2 shrink-0">
            <label htmlFor="task-status-select" className="text-xs text-slate-500 dark:text-slate-400 font-medium">Status:</label>
            <select
              id="task-status-select"
              disabled={statusUpdating}
              value={task.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
            >
              <option value="Todo">Todo</option>
              <option value="In Progress">In Progress</option>
              <option value="Done">Done</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Description
          </h2>
          <div className="text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            {task.description || "No description provided for this task."}
          </div>
        </div>

        {/* Task Metadata Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* Priority */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Priority
            </p>
            <div className="mt-1.5">
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
                  task.priority === "High"
                    ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/50"
                    : task.priority === "Medium"
                    ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600"
                }`}
              >
                ● {task.priority || "Medium"}
              </span>
            </div>
          </div>

          {/* Assigned User */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Assigned To
            </p>
            {user?.role === "admin" || user?.role === "manager" ? (
              <>
                <select
                  disabled={assigneeUpdating}
                  value={task.assignedTo?._id || task.assignedTo || ""}
                  onChange={(e) => handleAssigneeChange(e.target.value)}
                  className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs mt-1"
                >
                  <option value="">Unassigned</option>
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
                      className="px-2 py-1 rounded-md bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 text-[11px] font-medium transition-colors shadow-2xs"
                    >
                      View Profile →
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Due Date */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Due Date
            </p>
            <p className="text-sm font-medium text-slate-900 dark:text-white mt-1.5">
              {task.dueDate
                ? new Date(task.dueDate).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric"
                  })
                : "No due date"}
            </p>
          </div>
        </div>
      </div>

      {/* Comments Section */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 sm:p-7 shadow-xs space-y-6">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
          Comments ({comments.length})
        </h2>

        {commentError && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-sm">
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
            className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
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
                  className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center font-bold text-xs">
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
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap pl-8">
                    {comment.text}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Attachments Section */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 sm:p-7 shadow-xs space-y-6">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
          Attachments ({attachments.length})
        </h2>

        {attachmentSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm">
            {attachmentSuccess}
          </div>
        )}

        {attachmentError && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-sm">
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
            className="flex-1 text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-slate-100 dark:file:bg-slate-700 file:text-slate-700 dark:file:text-slate-200 hover:file:bg-slate-200 dark:hover:file:bg-slate-600 cursor-pointer"
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
                const fileIcon = isImg ? "🖼" : isDoc ? "📄" : "📎";

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
                    className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center space-x-3 truncate">
                      <span className="text-lg">{fileIcon}</span>
                      <div className="truncate">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
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
    </div>
  );
};

export default TaskDetails;
