import { Routes, Route, Navigate } from "react-router-dom";
import Home from "../pages/Home";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Dashboard from "../pages/Dashboard";
import Workspaces from "../pages/Workspaces";
import Projects from "../pages/Projects";
import TaskBoard from "../pages/TaskBoard";
import CreateTask from "../pages/CreateTask";
import TaskDetails from "../pages/TaskDetails";
import ActivityTimeline from "../pages/ActivityTimeline";
import Profile from "../pages/Profile";
import Users from "../pages/Users";
import Notifications from "../pages/Notifications";
import ReviewTasks from "../pages/ReviewTasks";
import ProtectedRoute from "../components/ProtectedRoute";
import Layout from "../layouts/Layout";

const AppRoutes = () => {
  return (
    
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected Routes */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/workspaces" element={<Workspaces />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/task-board" element={<TaskBoard />} />
        <Route path="/review-tasks" element={<ReviewTasks />} />
        <Route path="/tasks/create" element={<CreateTask />} />
        <Route path="/tasks/:id" element={<TaskDetails />} />
        <Route path="/activity" element={<ActivityTimeline />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/users" element={<Users />} />
      </Route>

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
