import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Home = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl text-center space-y-6">
        <div className="inline-block px-4 py-1.5 rounded-full text-sm font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          DevFlow v1.0 • MERN Collaboration Platform
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
          Manage Projects & Teams with <span className="text-indigo-400">DevFlow</span>
        </h1>
        <p className="text-lg text-slate-400">
          Streamlined workspace management, tasks, real-time notifications, and analytics built for modern engineering teams.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-medium text-white transition-colors"
            >
              Go to Dashboard ({user?.name || "User"})
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-medium text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-6 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 font-medium text-slate-200 border border-slate-700 transition-colors"
              >
                Create Account
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
