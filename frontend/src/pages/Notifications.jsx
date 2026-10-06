import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../context/NotificationContext";

const Notifications = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotification();
  const [filter, setFilter] = useState("all"); // "all" | "unread"
  const navigate = useNavigate();

  const filteredNotifications = filter === "unread"
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  const handleClickNotification = (n) => {
    if (!n.isRead) {
      markAsRead(n._id);
    }
    if (n.task) {
      const taskId = typeof n.task === "object" ? n.task._id : n.task;
      navigate(`/tasks/${taskId}`);
    } else if (n.project) {
      const projId = typeof n.project === "object" ? n.project._id : n.project;
      navigate(`/projects?project=${projId}`);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "TASK_SUBMITTED_FOR_REVIEW":
        return (
          <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-200 dark:border-purple-800">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
        );
      case "TASK_APPROVED":
        return (
          <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-200 dark:border-teal-800">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        );
      case "TASK_COMPLETED":
        return (
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
        );
      case "NEW_PROJECT_AVAILABLE":
        return (
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
            </svg>
          </div>
        );
      case "COMPANY_VERIFIED":
        return (
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
        );
      case "PROJECT_SUBMITTED":
      case "PROJECT_REVIEWED":
        return (
          <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-200 dark:border-purple-800">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        );
      case "TASK_ASSIGNED":
        return (
          <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 border border-sky-200 dark:border-sky-800">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M8 7v7" />
              <path d="M12 7v4" />
              <path d="M16 7v9" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time updates regarding projects, assignments, and collaborations
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            filter === "all"
              ? "bg-indigo-600 text-white shadow-2xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            filter === "unread"
              ? "bg-indigo-600 text-white shadow-2xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-8 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
          </div>
          <p className="text-slate-900 dark:text-white font-semibold">No notifications</p>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {filter === "unread"
              ? "You're all caught up! No unread notifications."
              : "When projects are published or tasks are assigned, they'll appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredNotifications.map((n) => (
            <div
              key={n._id}
              onClick={() => handleClickNotification(n)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 shadow-xs ${
                !n.isRead
                  ? "bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200/80 dark:border-indigo-800/60 hover:border-indigo-300 dark:hover:border-indigo-700"
                  : "bg-white dark:bg-[#111827] border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              {getNotificationIcon(n.type)}

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-xs sm:text-sm leading-relaxed ${
                    !n.isRead
                      ? "font-semibold text-slate-900 dark:text-white"
                      : "text-slate-700 dark:text-slate-300"
                  }`}>
                    {n.message}
                  </p>
                  {!n.isRead && (
                    <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1" />
                  )}
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{new Date(n.createdAt).toLocaleString()}</span>
                  {(n.project || n.task) && (
                    <span className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                      View details →
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
