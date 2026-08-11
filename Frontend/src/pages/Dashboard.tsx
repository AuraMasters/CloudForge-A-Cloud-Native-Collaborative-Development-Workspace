import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAlert } from "../hooks/useAlert";
import API_URL from "../config/api";

interface User {
  name: string;
  email: string;
}

function Dashboard() {
  const navigate = useNavigate();
  const { showError, showSuccess } = useAlert();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const getUser = async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          credentials: "include",
        });

        if (!response.ok) {
          showError("Please sign in to access the dashboard.");
          navigate("/login");
          return;
        }

        const data = await response.json();
        setUser(data.user);
      } catch (error) {
        showError("Session expired. Please sign in again.");
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    getUser();
  }, [navigate, showError]);

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      showSuccess("Successfully signed out");
      navigate("/login");
    } catch (error) {
      showError("Failed to sign out. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-900">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-medium text-slate-500">
          Loading workspace...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-200">
      <nav className="flex-none h-16 px-6 lg:px-8 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-xl font-semibold tracking-tight">
          Cloud<span className="text-blue-600 font-bold">Forge</span>
        </h1>

        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all focus:outline-none focus:ring-2 focus:ring-slate-200 focus:ring-offset-2 focus:ring-offset-white"
        >
          Sign out
        </button>
      </nav>

      <main className="flex-1 flex flex-col p-6 lg:p-8 overflow-y-auto">
        <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col justify-center">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
            <div className="flex items-start justify-between mb-8">
              <div>
                <p className="text-blue-600 text-xs font-bold tracking-widest uppercase mb-2">
                  System Overview
                </p>
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                  Welcome back, {user?.name?.split(" ")[0] || "User"}
                </h2>
              </div>

              <div className="h-12 w-12 rounded-full bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center text-xl font-bold uppercase shadow-inner">
                {user?.name?.charAt(0) || "?"}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-center transition-colors hover:border-slate-300">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                  Profile Name
                </p>
                <p className="text-slate-900 font-medium truncate">
                  {user?.name}
                </p>
              </div>

              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-center transition-colors hover:border-slate-300">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                  Email Address
                </p>
                <p className="text-slate-900 font-medium truncate">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;