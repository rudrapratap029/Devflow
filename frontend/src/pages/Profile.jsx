import { useAuth } from "../context/AuthContext";

const Profile = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-white">User Profile</h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage and review your DevFlow account details
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-lg">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-slate-700/60">
          {/* Avatar display */}
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name || "User Avatar"}
              className="w-24 h-24 rounded-full object-cover border-2 border-indigo-500/50 shadow-md"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white flex items-center justify-center text-3xl font-bold border-2 border-indigo-500/50 shadow-md">
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
          )}

          {/* User Basic Info */}
          <div className="text-center sm:text-left space-y-1">
            <h2 className="text-2xl font-semibold text-white">
              {user?.name || "Developer"}
            </h2>
            <p className="text-slate-400">{user?.email || "No email"}</p>
            <div className="pt-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                {user?.role || "Developer"}
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6">
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Full Name
            </p>
            <p className="text-base font-medium text-slate-200 mt-1">
              {user?.name || "Not provided"}
            </p>
          </div>

          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Email Address
            </p>
            <p className="text-base font-medium text-slate-200 mt-1">
              {user?.email || "Not provided"}
            </p>
          </div>

          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Account Role
            </p>
            <p className="text-base font-medium text-slate-200 mt-1 capitalize">
              {user?.role || "Developer"}
            </p>
          </div>

          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Account Status
            </p>
            <p className="text-base font-medium text-emerald-400 mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
              {user?.isActive !== false ? "Active" : "Inactive"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
