import { useEffect } from "react";
import { useNotification } from "../context/NotificationContext";

const Toast = () => {
  const { toast, dismissToast } = useNotification();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      dismissToast();
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast, dismissToast]);

  if (!toast) return null;

  return (
    <div className="fixed top-20 right-6 z-50 max-w-sm w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-lg transition-all">
      <div className="flex items-start space-x-3">
        <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 text-sm">
          🔔
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            Real-Time Notification
          </p>
          <p className="text-sm text-slate-800 dark:text-slate-100 mt-0.5 leading-snug">
            {toast.message}
          </p>
        </div>
        <button
          onClick={dismissToast}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm p-1"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default Toast;
