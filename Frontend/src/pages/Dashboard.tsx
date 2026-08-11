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
      <main className="max-w-7xl mx-auto p-6 lg:p-8">
        <section className="mb-8">
          <p className="text-blue-600 text-xs font-bold tracking-widest uppercase mb-2">Workspace Overview</p>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Welcome back, {user?.name?.split(" ")[0] || "User"}</h1>
          <p className="text-slate-500 mt-2">Manage your projects and development workspace from one place.</p>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <p className="text-sm text-slate-500">Total Projects</p>
            <p className="text-3xl font-bold mt-2">{projects.length}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <p className="text-sm text-slate-500">Active Workspace</p>
            <p className="text-lg font-semibold mt-2">CloudForge</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <p className="text-sm text-slate-500">Account</p>
            <p className="text-lg font-semibold mt-2 truncate">{user?.email}</p>
          </div>
        </section>

        <section className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">Recent Projects</h2>
                <p className="text-sm text-slate-500 mt-1">Quickly access your recent projects.</p>
              </div>
              <button onClick={() => navigate("/projects")} className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
                View All
              </button>
            </div>
            {recentProjects.length === 0 ? (
              <div className="border border-dashed border-slate-300 rounded-xl p-8 text-center">
                <div className="w-12 h-12 mx-auto rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-bold">+</div>
                <h3 className="font-semibold mt-4">No projects yet</h3>
                <p className="text-sm text-slate-500 mt-1">Create your first project to start building.</p>
                <button onClick={() => navigate("/projects")} className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-700">
                  Create a project →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentProjects.map((project) => (
                  <button
                    key={project._id}
                    onClick={() => navigate(`/projects/${project._id}`)}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-blue-200 hover:bg-blue-50/30 transition-all text-left"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 shrink-0 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        {project.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{project.name}</p>
                        <p className="text-xs text-slate-500 mt-1">{project.language}</p>
                      </div>
                    </div>
                    <span className="text-slate-400 text-lg">→</span>
                  </button>
                ))}
                {projects.length > 3 && (
                  <button onClick={() => navigate("/projects")} className="w-full pt-2 text-sm font-semibold text-blue-600 hover:text-blue-700">
                    View all {projects.length} projects →
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="text-xl font-bold">Quick Actions</h2>
            <p className="text-sm text-slate-500 mt-1 mb-6">Quickly access your workspace.</p>
            <div className="space-y-3">
              <button onClick={() => navigate("/projects")} className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-blue-200 hover:bg-blue-50/40 transition-all text-left">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">+</div>
                <div>
                  <p className="font-semibold">Projects</p>
                  <p className="text-xs text-slate-500">Manage projects</p>
                </div>
              </button>
              <button disabled className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 opacity-50 cursor-not-allowed text-left">
                <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center font-bold">G</div>
                <div>
                  <p className="font-semibold">Git Integration</p>
                  <p className="text-xs text-slate-500">Coming soon</p>
                </div>
              </button>
              <button disabled className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 opacity-50 cursor-not-allowed text-left">
                <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center font-bold">D</div>
                <div>
                  <p className="font-semibold">Deployments</p>
                  <p className="text-xs text-slate-500">Coming soon</p>
                </div>
              </button>
            </div>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold">Account</h2>
              <p className="text-sm text-slate-500 mt-1">Your CloudForge account information.</p>
            </div>
            <div className="h-11 w-11 rounded-full bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center text-lg font-bold uppercase">
              {user?.name?.charAt(0) || "?"}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Name</p>
              <p className="text-sm font-semibold mt-2 truncate">{user?.name}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Email</p>
              <p className="text-sm font-semibold mt-2 truncate">{user?.email}</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;