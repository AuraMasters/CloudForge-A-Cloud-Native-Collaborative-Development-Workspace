import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_URL from "../config/api";
import { useAlert } from "../hooks/useAlert";
import Navbar from "../components/layout/Navbar";
import LoadingSpinner from "../components/ui/LoadingSpinner";

interface User {
  name: string;
  email: string;
}

interface Project {
  _id: string;
  name: string;
  language: string;
  updatedAt: string;
}

function Dashboard() {
  const navigate = useNavigate();
  const { showError } = useAlert();
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const userResponse = await fetch(`${API_URL}/api/auth/me`, { credentials: "include" });
        if (!userResponse.ok) {
          showError("Please sign in to access the dashboard.");
          navigate("/login");
          return;
        }
        const userData = await userResponse.json();
        setUser(userData.user);

        const projectResponse = await fetch(`${API_URL}/api/projects`, { credentials: "include" });
        if (projectResponse.ok) {
          const projectData = await projectResponse.json();
          setProjects(projectData.projects || []);
        }
      } catch (error) {
        showError("Failed to load dashboard.");
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, [navigate, showError]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <LoadingSpinner text="Loading workspace..." fullScreen />
      </div>
    );
  }

  const recentProjects = projects.slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Navbar user={user} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <section className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-blue-600 text-xs font-bold tracking-widest uppercase mb-1">
                Workspace Overview
              </p>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900">
                Welcome back, {user?.name?.split(" ")[0] || "Developer"}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Manage your cloud projects and integrations from one unified hub.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/projects")}
                className="px-4 py-2 sm:py-2.5 bg-blue-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/20"
              >
                + New Project
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-6 shadow-2xs">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Projects</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1.5">{projects.length}</p>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-6 shadow-2xs">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Workspace</p>
            <p className="text-base sm:text-lg font-bold text-slate-900 mt-1.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              CloudForge Engine
            </p>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-6 shadow-2xs">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Account Email</p>
            <p className="text-base sm:text-lg font-bold text-slate-900 mt-1.5 truncate">{user?.email}</p>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">Recent Projects</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Quickly access and edit your workspace projects.</p>
              </div>
              <button
                onClick={() => navigate("/projects")}
                className="self-start sm:self-auto px-3.5 py-1.5 sm:py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold transition-colors"
              >
                View All
              </button>
            </div>

            {recentProjects.length === 0 ? (
              <div className="border border-dashed border-slate-300 rounded-xl p-6 sm:p-8 text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg sm:text-xl font-bold">
                  +
                </div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 mt-3">No projects yet</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">Create your first project to start coding.</p>
                <button
                  onClick={() => navigate("/projects")}
                  className="mt-3.5 text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  Create a project →
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentProjects.map((project) => (
                  <button
                    key={project._id}
                    onClick={() => navigate(`/projects/${project._id}`)}
                    className="w-full flex items-center justify-between p-3.5 sm:p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                        {project.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs sm:text-sm text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                          {project.name}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{project.language || "TypeScript"}</p>
                      </div>
                    </div>
                    <span className="text-slate-400 text-sm group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all">
                      →
                    </span>
                  </button>
                ))}
                {projects.length > 3 && (
                  <button
                    onClick={() => navigate("/projects")}
                    className="w-full pt-2 text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 text-center"
                  >
                    View all {projects.length} projects →
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">Quick Actions</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 mb-4">Shortcuts to common workflows.</p>
              <div className="space-y-2.5">
                <button
                  onClick={() => navigate("/projects")}
                  className="w-full flex items-center gap-3 p-3 sm:p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all text-left"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                    +
                  </div>
                  <div>
                    <p className="font-bold text-xs sm:text-sm text-slate-900">Manage Projects</p>
                    <p className="text-[11px] text-slate-500">Create, edit, or import from GitHub</p>
                  </div>
                </button>

                <button
                  onClick={() => navigate("/github")}
                  className="w-full flex items-center gap-3 p-3 sm:p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all text-left"
                >
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-sm">
                    GH
                  </div>
                  <div>
                    <p className="font-bold text-xs sm:text-sm text-slate-900">GitHub Integration</p>
                    <p className="text-[11px] text-slate-500">Connect account and repos</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">Account Details</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Your CloudForge profile credentials.</p>
            </div>
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center text-base sm:text-lg font-bold uppercase">
              {user?.name?.charAt(0) || "U"}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">User Name</p>
              <p className="text-xs sm:text-sm font-bold text-slate-900 mt-1 truncate">{user?.name}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address</p>
              <p className="text-xs sm:text-sm font-bold text-slate-900 mt-1 truncate">{user?.email}</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;