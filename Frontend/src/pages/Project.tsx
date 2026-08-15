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
import GitHubRepositoryModal from "../components/projects/GitHubRepositoryModal";
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
  const [showGitHubImport, setShowGitHubImport] = useState(false);

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
      [project.name, project.description, project.template].some((value) => value?.toLowerCase().includes(query))
    );
  }, [projects, search]);

  const handleProjectCreated = (project: Project) => {
    setProjects((prev) => [project, ...prev]);
  };

  const handleProjectImported = (project: Project) => {
    setProjects((prev) => {
      const exists = prev.some(
        (item) => item._id === project._id
      );

      if (exists) {
        return prev.map((item) =>
          item._id === project._id ? project : item
        );
      }

      return [project, ...prev];
    });
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header Bar */}
        <section className="mb-6 sm:mb-8">
          <button
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors mb-3"
          >
            ← Back to Dashboard
          </button>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-blue-600 text-xs font-bold tracking-widest uppercase mb-1">
                Cloud Workspaces
              </p>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900">
                Projects
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Create, manage, and synchronize your cloud workspaces.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
              <button
                onClick={() => setShowGitHubImport(true)}
                className="w-full sm:w-auto px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors shadow-2xs text-center"
              >
                Import from GitHub
              </button>

              <button
                onClick={() => setShowCreate(true)}
                className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20 text-center"
              >
                + New Project
              </button>
            </div>
          </div>
        </section>

        {/* Search and Filters Bar */}
        <section className="bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-4 mb-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects by name, description or template..."
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl outline-none text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 focus:bg-white transition-all"
              />
            </div>
            <div className="flex items-center justify-center px-3.5 py-2 sm:py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600 shrink-0">
              {filteredProjects.length} {filteredProjects.length === 1 ? "Project" : "Projects"}
            </div>
          </div>
        </section>

        {/* Project List / Grid */}
        {projects.length === 0 ? (
          <EmptyState
            title="No projects yet"
            description="Create your first CloudForge project or import one from GitHub to get started."
            buttonText="+ Create Project"
            onButtonClick={() => setShowCreate(true)}
          />
        ) : filteredProjects.length === 0 ? (
          <EmptyState
            title="No matching projects"
            description="No projects match your current search query. Try another keyword."
          />
        ) : (
          <ProjectGrid
            projects={filteredProjects}
            onDelete={handleDeleteProject}
            onEdit={(project) => setEditingProject(project)}
          />
        )}
      </main>

      <CreateProjectModal isOpen={showCreate} onClose={() => setShowCreate(false)} onCreated={handleProjectCreated} />
      <EditProjectModal project={editingProject} onClose={() => setEditingProject(null)} onUpdated={handleProjectUpdated} />
      <GitHubRepositoryModal
        isOpen={showGitHubImport}
        onClose={() => setShowGitHubImport(false)}
        onImported={handleProjectImported}
      />
    </div>
  );
}

export default Projects;