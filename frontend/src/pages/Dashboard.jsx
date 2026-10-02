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
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900/40 via-slate-800/60 to-slate-800/40 border border-indigo-500/20 rounded-2xl p-6 sm:p-8">
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
          DevFlow Overview
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mt-3 mb-2">
          Welcome back, {user?.name || "Developer"}! 👋
        </h1>
        <p className="text-slate-400 text-sm sm:text-base max-w-2xl">
          Here is a summary of your workspace, projects, and active tasks.
        </p>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Projects */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5 hover:border-indigo-500/40 transition-colors">
          <p className="text-sm font-medium text-slate-400">Total Projects</p>
          <p className="text-3xl font-bold text-white mt-2">
            {loading ? "..." : stats.totalProjects}
          </p>
          <Link
            to="/projects"
            className="text-xs text-indigo-400 hover:text-indigo-300 mt-2 inline-block font-medium"
          >
            View Projects →
          </Link>
        </div>

        {/* Total Tasks */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5 hover:border-indigo-500/40 transition-colors">
          <p className="text-sm font-medium text-slate-400">Total Tasks</p>
          <p className="text-3xl font-bold text-white mt-2">
            {loading ? "..." : stats.totalTasks}
          </p>
          <Link
            to="/task-board"
            className="text-xs text-indigo-400 hover:text-indigo-300 mt-2 inline-block font-medium"
          >
            Open Kanban Board →
          </Link>
        </div>

        {/* Completed Tasks */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5 hover:border-emerald-500/40 transition-colors">
          <p className="text-sm font-medium text-slate-400">Completed Tasks</p>
          <p className="text-3xl font-bold text-emerald-400 mt-2">
            {loading ? "..." : stats.completedTasks}
          </p>
          <p className="text-xs text-slate-400 mt-2">Status: Done</p>
        </div>

        {/* Pending Tasks */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5 hover:border-amber-500/40 transition-colors">
          <p className="text-sm font-medium text-slate-400">Pending Tasks</p>
          <p className="text-3xl font-bold text-amber-400 mt-2">
            {loading ? "..." : stats.pendingTasks}
          </p>
          <p className="text-xs text-slate-400 mt-2">Todo & In Progress</p>
        </div>
      </div>

      {/* Grid: My Tasks & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Tasks */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">My Tasks</h2>
            <Link
              to="/task-board"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              All Tasks →
            </Link>
          </div>

          {loading ? (
            <p className="text-sm text-slate-400">Loading your tasks...</p>
          ) : myTasks.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              No tasks currently assigned to you.
            </div>
          ) : (
            <div className="space-y-3">
              {myTasks.slice(0, 5).map((task) => (
                <Link
                  key={task._id}
                  to={`/tasks/${task._id}`}
                  className="block p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-200 text-sm">
                      {task.title}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        task.status === "Done"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : task.status === "In Progress"
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "bg-slate-700/60 text-slate-300 border border-slate-600"
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
                    {task.project?.name && (
                      <span>📁 {task.project.name}</span>
                    )}
                    <span
                      className={`capitalize ${
                        task.priority === "High"
                          ? "text-red-400"
                          : task.priority === "Medium"
                          ? "text-amber-400"
                          : "text-slate-400"
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
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Recent Activities
          </h2>

          {loading ? (
            <p className="text-sm text-slate-400">Loading activity...</p>
          ) : recentActivities.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              No recent activity logs recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivities.slice(0, 6).map((activity) => (
                <div
                  key={activity._id}
                  className="flex items-start space-x-3 p-3 rounded-lg bg-slate-900/40 border border-slate-800/80 text-sm"
                >
                  <div className="w-7 h-7 rounded-full bg-indigo-600/30 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    {activity.user?.name ? activity.user.name.charAt(0) : "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 text-xs sm:text-sm">
                      <span className="font-semibold text-white">
                        {activity.user?.name || "User"}
                      </span>{" "}
                      {activity.description || activity.action}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
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
