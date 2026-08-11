import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_URL from "../config/api";
import { useAlert } from "../hooks/useAlert";
import Navbar from "../components/layout/Navbar";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import ProjectGrid from "../components/projects/ProjectGrid";
import CreateProjectModal from "../components/projects/CreateProjectModal";
import EditProjectModal from "../components/projects/EditProjectModal";
import { type Project } from "../types/project";

interface User {
  name: string;
  email: string;
}

function Projects() {
  const navigate = useNavigate();
  const { showError, showSuccess } = useAlert();
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const userResponse = await fetch(`${API_URL}/api/auth/me`, { credentials: "include" });
        if (!userResponse.ok) {
          showError("Please sign in to access your projects.");
          navigate("/login");
          return;
        }
        const userData = await userResponse.json();
        setUser(userData.user);

        const projectResponse = await fetch(`${API_URL}/api/projects`, { credentials: "include" });
        if (!projectResponse.ok) throw new Error("Failed to fetch projects");
        const projectData = await projectResponse.json();
        setProjects(projectData.projects || []);
      } catch (error) {
        showError("Failed to load projects.");
      } finally {
        setLoading(false);
      }
    };
    loadProjects();
  }, [navigate, showError]);

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter((project) =>
      [project.name, project.description, project.language].some((value) => value?.toLowerCase().includes(query))
    );
  }, [projects, search]);

  const handleProjectCreated = (project: Project) => {
    setProjects((prev) => [project, ...prev]);
  };

  const handleProjectUpdated = (updatedProject: Project) => {
    setProjects((prev) => prev.map((project) => (project._id === updatedProject._id ? updatedProject : project)));
    setEditingProject(null);
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/projects/${projectId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) {
        showError(data.message || "Failed to delete project.");
        return;
      }
      setProjects((prev) => prev.filter((project) => project._id !== projectId));
      showSuccess("Project deleted successfully.");
    } catch (error) {
      showError("Failed to delete project.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <LoadingSpinner text="Loading projects..." fullScreen />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Navbar user={user} />
      <main className="max-w-7xl mx-auto p-6 lg:p-8">
        <section className="mb-8">
          <button onClick={() => navigate("/dashboard")} className="text-sm text-slate-500 hover:text-blue-600 transition-colors mb-4">
            ← Dashboard
          </button>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <div>
              <p className="text-blue-600 text-xs font-bold tracking-widest uppercase mb-2">Workspace</p>
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Projects</h1>
              <p className="text-slate-500 mt-2">Create, manage and organize your development projects.</p>
            </div>
            <button onClick={() => setShowCreate(true)} className="px-5 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-sm">
              + New Project
            </button>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects..."
                className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center justify-center px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-600">
              {projects.length} {projects.length === 1 ? "Project" : "Projects"}
            </div>
          </div>
        </section>

        {projects.length === 0 ? (
          <EmptyState
            title="No projects yet"
            description="Create your first CloudForge project to get started."
            buttonText="Create Project"
            onButtonClick={() => setShowCreate(true)}
          />
        ) : filteredProjects.length === 0 ? (
          <EmptyState title="No matching projects" description="Try searching with another project name, description or language." />
        ) : (
          <ProjectGrid projects={filteredProjects} onDelete={handleDeleteProject} onEdit={(project) => setEditingProject(project)} />
        )}
      </main>

      <CreateProjectModal isOpen={showCreate} onClose={() => setShowCreate(false)} onCreated={handleProjectCreated} />
      <EditProjectModal project={editingProject} onClose={() => setEditingProject(null)} onUpdated={handleProjectUpdated} />
    </div>
  );
}

export default Projects;