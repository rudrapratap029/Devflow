import { useState, useRef, useEffect } from "react";
import API from "../services/api";

const WorkSubmissionModal = ({ isOpen, onClose, task, onSubmitted }) => {
  const [githubUrl, setGithubUrl] = useState(task?.githubUrl || "");
  const [liveUrl, setLiveUrl] = useState(task?.liveUrl || "");
  const [developerNotes, setDeveloperNotes] = useState(task?.developerNotes || "");
  const [submissionFiles, setSubmissionFiles] = useState(task?.submissionFiles || []);

  useEffect(() => {
    if (task) {
      setGithubUrl(task.githubUrl || "");
      setLiveUrl(task.liveUrl || "");
      setDeveloperNotes(task.developerNotes || "");
      setSubmissionFiles(task.submissionFiles || []);
    }
  }, [task]);

  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const fileInputRef = useRef(null);

  // Allowed file extensions
  const allowedExtensions = [
    ".pdf",
    ".docx",
    ".doc",
    ".xlsx",
    ".xls",
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".zip",
    ".rar"
  ];

  // Handle direct file upload to backend
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError("");

    // Validate size (max 50 MB)
    if (file.size > 50 * 1024 * 1024) {
      setUploadError("File size exceeds 50 MB limit");
      return;
    }

    // Validate extension
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      setUploadError(
        "Supported file types: PDF, DOCX, XLSX/Excel, Images (PNG, JPG, JPEG, WEBP), and ZIP."
      );
      return;
    }

    try {
      setUploadingFile(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await API.post(`/tasks/${task._id}/submission-files`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (res.data?.success && res.data.data?.file) {
        setSubmissionFiles((prev) => [...prev, res.data.data.file]);
      }
    } catch (err) {
      setUploadError(err.response?.data?.message || "Failed to upload file");
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Remove uploaded file from staged submission list
  const handleRemoveFile = (index) => {
    setSubmissionFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit work
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    if (!developerNotes.trim() && !githubUrl.trim() && !liveUrl.trim() && submissionFiles.length === 0) {
      setSubmitError("Please provide at least developer notes, a GitHub link, or attach deliverable files.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        githubUrl: githubUrl.trim(),
        liveUrl: liveUrl.trim(),
        developerNotes: developerNotes.trim(),
        submissionFiles
      };

      const res = await API.post(`/tasks/${task._id}/submit-work`, payload);
      if (res.data?.success) {
        if (onSubmitted) {
          onSubmitted(res.data.data.task);
        }
        onClose();
      }
    } catch (err) {
      setSubmitError(err.response?.data?.message || "Failed to submit work for review");
    } finally {
      setSubmitting(false);
    }
  };

  const getFileIcon = (fileName = "") => {
    const ext = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
    if (ext === ".pdf") {
      return (
        <span className="w-7 h-7 rounded bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 flex items-center justify-center font-bold text-[10px]">
          PDF
        </span>
      );
    }
    if (ext === ".docx" || ext === ".doc") {
      return (
        <span className="w-7 h-7 rounded bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 flex items-center justify-center font-bold text-[10px]">
          DOC
        </span>
      );
    }
    if (ext === ".xlsx" || ext === ".xls") {
      return (
        <span className="w-7 h-7 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center font-bold text-[10px]">
          XLS
        </span>
      );
    }
    if (ext === ".zip" || ext === ".rar") {
      return (
        <span className="w-7 h-7 rounded bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 flex items-center justify-center font-bold text-[10px]">
          ZIP
        </span>
      );
    }
    return (
      <span className="w-7 h-7 rounded bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 flex items-center justify-center font-bold text-[10px]">
        IMG
      </span>
    );
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 KB";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
              <span>Developer Work Submission</span>
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              Submit Work For Review
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
              Task: {task.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {submitError && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-xs">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. File Upload Section */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-900 dark:text-white flex items-center justify-between">
              <span>Attach Deliverables & Files</span>
              <span className="text-[11px] font-normal text-slate-400">PDF, DOCX, XLSX, Images, ZIP</span>
            </label>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-purple-500 dark:hover:border-purple-500 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/30"
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                accept=".pdf,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg,.webp,.zip,.rar"
                className="hidden"
              />
              <svg className="w-7 h-7 mx-auto mb-1.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {uploadingFile ? "Uploading file..." : "Click to attach deliverable files"}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Max size: 50 MB per file</p>
            </div>

            {uploadError && (
              <p className="text-xs text-rose-600 dark:text-rose-400">{uploadError}</p>
            )}

            {/* Uploaded Files List */}
            {submissionFiles.length > 0 && (
              <div className="space-y-1.5 mt-2">
                {submissionFiles.map((f, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate mr-2">
                      {getFileIcon(f.name)}
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {f.name}
                      </span>
                      {f.size && (
                        <span className="text-[10px] text-slate-400 shrink-0">
                          ({formatFileSize(f.size)})
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1 text-xs shrink-0"
                      title="Remove file"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. GitHub Repository URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span>GitHub Repository URL</span>
            </label>
            <input
              type="url"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/username/project-repo"
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
            />
          </div>

          {/* 3. Live Project Demo URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <span>Live Project / Demo URL</span>
            </label>
            <input
              type="url"
              value={liveUrl}
              onChange={(e) => setLiveUrl(e.target.value)}
              placeholder="https://my-deployed-app.vercel.app"
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
            />
          </div>

          {/* 4. Additional Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-900 dark:text-white block">
              Additional Developer Notes
            </label>
            <textarea
              rows={4}
              value={developerNotes}
              onChange={(e) => setDeveloperNotes(e.target.value)}
              placeholder="Describe what was completed, technologies used, instructions for reviewer, and key implementation highlights..."
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 leading-relaxed"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || uploadingFile}
              className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {submitting ? (
                <span>Submitting for Review...</span>
              ) : (
                <>
                  <span>Submit For Review</span>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkSubmissionModal;
