import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [myTasks, setMyTasks] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Fetch overview, task status counts, recent activities, and my tasks in parallel
        const [overviewRes, statusRes, activitiesRes, myTasksRes] = await Promise.allSettled([
          API.get("/dashboard/overview"),
          API.get("/dashboard/task-status"),
          API.get("/dashboard/recent-activities"),
          API.get("/dashboard/my-tasks")
        ]);

        const overview = overviewRes.status === "fulfilled" ? overviewRes.value.data?.data : {};
        const statusData = statusRes.status === "fulfilled" ? statusRes.value.data?.data : {};

        const completed = statusData?.done || 0;
        const pending = (statusData?.todo || 0) + (statusData?.inProgress || 0);

        setStats({
          totalProjects: overview?.totalProjects || 0,
          totalTasks: overview?.totalTasks || 0,
          completedTasks: completed,
          pendingTasks: pending
        });

        if (activitiesRes.status === "fulfilled") {
          setRecentActivities(activitiesRes.value.data?.data?.activities || []);
        }

        if (myTasksRes.status === "fulfilled") {
          setMyTasks(myTasksRes.value.data?.data?.tasks || []);
        }
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 sm:p-8 shadow-xs">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
          DevFlow Overview
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-3 mb-1 tracking-tight">
          Welcome back, {user?.name || "Developer"}! 👋
        </h1>
        {user?.skills && user.skills.length > 0 && (
          <p className="text-xs sm:text-sm font-medium text-indigo-600 dark:text-indigo-400 mt-1 mb-2">
            {user.skills.slice(0, 3).join(" • ")}
            {user.skills.length > 3 && (
              <span className="text-slate-400 dark:text-slate-500 font-normal ml-1">
                +{user.skills.length - 3} more
              </span>
            )}
          </p>
        )}
        <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base max-w-2xl">
          Here is a summary of your workspace, projects, and active tasks.
        </p>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Projects */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Projects</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-semibold">
              📁
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-3 mb-1">
            {loading ? "..." : stats.totalProjects}
          </p>
          <Link
            to="/projects"
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium inline-flex items-center gap-1"
          >
            View Projects →
          </Link>
        </div>

        {/* Total Tasks */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Tasks</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-semibold">
              📋
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-3 mb-1">
            {loading ? "..." : stats.totalTasks}
          </p>
          <Link
            to="/task-board"
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium inline-flex items-center gap-1"
          >
            Open Kanban Board →
          </Link>
        </div>

        {/* Completed Tasks */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Completed Tasks</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm font-semibold">
              ✅
            </div>
          </div>
          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-3 mb-1">
            {loading ? "..." : stats.completedTasks}
          </p>
          <span className="text-xs text-slate-500 dark:text-slate-400">Status: Done</span>
        </div>

        {/* Pending Tasks */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Pending Tasks</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm font-semibold">
              ⏳
            </div>
          </div>
          <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-3 mb-1">
            {loading ? "..." : stats.pendingTasks}
          </p>
          <span className="text-xs text-slate-500 dark:text-slate-400">Todo & In Progress</span>
        </div>
      </div>

      {/* Grid: My Tasks & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Tasks */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">My Tasks</h2>
            <Link
              to="/task-board"
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
            >
              All Tasks →
            </Link>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">Loading your tasks...</p>
          ) : myTasks.length === 0 ? (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
              No tasks currently assigned to you.
            </div>
          ) : (
            <div className="space-y-3">
              {myTasks.slice(0, 5).map((task) => (
                <Link
                  key={task._id}
                  to={`/tasks/${task._id}`}
                  className="block p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                      {task.title}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                        task.status === "Done"
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                          : task.status === "In Progress"
                          ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-2">
                    {task.project?.name && (
                      <span>📁 {task.project.name}</span>
                    )}
                    <span
                      className={`capitalize ${
                        task.priority === "High"
                          ? "text-rose-600 dark:text-rose-400"
                          : task.priority === "Medium"
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      ● {task.priority} Priority
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activities */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 sm:p-6 shadow-xs">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
            Recent Activities
          </h2>

          {loading ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">Loading activity...</p>
          ) : recentActivities.length === 0 ? (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
              No recent activity logs recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivities.slice(0, 6).map((activity) => (
                <div
                  key={activity._id}
                  className="flex items-start space-x-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-sm"
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 border border-indigo-100 dark:border-indigo-800">
                    {activity.user?.name ? activity.user.name.charAt(0) : "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {activity.user?.name || "User"}
                      </span>{" "}
                      {activity.description || activity.action}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                      {new Date(activity.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
