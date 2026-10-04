import { useState, useEffect } from "react";
import API from "../services/api";

const ActivityTimeline = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchActivities = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await API.get("/dashboard/recent-activities");
      if (res.data?.success) {
        setActivities(res.data.data.activities || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load activity timeline");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const getActionIcon = (action) => {
    if (action?.includes("PROJECT")) return "📁";
    if (action?.includes("TASK")) return "📋";
    if (action?.includes("COMMENT")) return "💬";
    if (action?.includes("ATTACHMENT")) return "📎";
    return "⚡";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Activity Timeline</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time chronological audit trail of team actions and project updates
          </p>
        </div>
        <button
          onClick={fetchActivities}
          className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-medium transition-colors shadow-xs"
        >
          🔄 Refresh
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Activities Timeline List */}
      {loading ? (
        <div className="py-16 text-center text-slate-500 dark:text-slate-400 text-sm">Loading activity timeline...</div>
      ) : activities.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-8 shadow-xs">
          <p className="text-slate-900 dark:text-white font-medium text-sm">No activity recorded yet</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Actions like creating projects, moving tasks, and adding comments will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((item, index) => (
            <div
              key={item._id || index}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 sm:p-5 flex items-start space-x-4 hover:border-slate-300 dark:hover:border-slate-600 transition-colors shadow-xs"
            >
              {/* User Avatar / Action Icon */}
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs border border-indigo-200 dark:border-indigo-800">
                  {item.user?.name ? item.user.name.charAt(0).toUpperCase() : "U"}
                </div>
                <span className="absolute -bottom-1 -right-1 text-xs">
                  {getActionIcon(item.action)}
                </span>
              </div>

              {/* Description & Metadata */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {item.user?.name || "Team Member"}
                    </span>{" "}
                    {item.description || item.action}
                  </p>
                  <span className="text-xs text-slate-400 shrink-0">
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })
                      : "Recently"}
                  </span>
                </div>

                {/* Related Project or Task Tag */}
                <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {item.project?.name && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300">
                      📁 {item.project.name}
                    </span>
                  )}
                  {item.task?.title && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 truncate max-w-xs">
                      📋 {item.task.title}
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

export default ActivityTimeline;
