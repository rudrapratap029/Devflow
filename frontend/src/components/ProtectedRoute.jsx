import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  // Show simple loading indicator while checking auth from localStorage
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-600 dark:text-slate-400">
        <div className="flex items-center space-x-2.5">
          <div className="w-4 h-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></div>
          <span className="text-xs font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  // Redirect to login if user is not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Render children or nested routes
  return children ? children : <Outlet />;
};

export default ProtectedRoute;
