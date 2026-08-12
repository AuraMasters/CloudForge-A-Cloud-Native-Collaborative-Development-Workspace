import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API_URL from "../config/api";
import { useAlert } from "../hooks/useAlert";
import Navbar from "../components/layout/Navbar";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { type Project } from "../types/project";

interface User {
  name: string;
  email: string;
}

function ProjectView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showError } = useAlert();
  
  const [user, setUser] = useState<User | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProjectData = async () => {
      try {
        const userResponse = await fetch(`${API_URL}/api/auth/me`, { 
          credentials: "include" 
        });
        
        if (!userResponse.ok) {
          showError("Please sign in to view this project.");
          navigate("/login");
          return;
        }
        
        const userData = await userResponse.json();
        setUser(userData.user);

        const projectResponse = await fetch(`${API_URL}/api/projects/${id}`, { 
          credentials: "include" 
        });
        
        const projectData = await projectResponse.json();

        if (!projectResponse.ok) {
          showError(projectData.message || "Project not found");
          navigate("/projects");
          return;
        }

        setProject(projectData.project);
      } catch (error) {
        showError("Failed to load project details.");
        navigate("/projects");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadProjectData();
    }
  }, [id, navigate, showError]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <LoadingSpinner text="Loading project details..." fullScreen />
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Navbar user={user} />
      
      <main className="max-w-7xl mx-auto p-6 lg:p-8">
        <section className="mb-8">
          <button 
            onClick={() => navigate("/projects")} 
            className="text-sm text-slate-500 hover:text-blue-600 transition-colors mb-4"
          >
            ← Back to Projects
          </button>
          
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <div>
              <p className="text-blue-600 text-xs font-bold tracking-widest uppercase mb-2">
                Project Overview
              </p>
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
                {project.name}
              </h1>
              <p className="text-slate-500 mt-2 max-w-2xl">
                {project.description || "No description provided."}
              </p>
            </div>
            
            <div className="flex gap-3">
              <span className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold border border-blue-100">
                {project.language}
              </span>
            </div>
          </div>
        </section>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 min-h-[400px] flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mb-4 border border-slate-100">
                {'{ }'}
              </div>
              <h3 className="text-lg font-bold text-slate-900">Workspace ready</h3>
              <p className="text-slate-500 mt-1 max-w-md">
                Your {project.language} environment is ready. You can start integrating your code editor or building out the UI components here.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Details</h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Created</p>
                  <p className="text-sm font-semibold mt-1">
                    {new Date(project.createdAt || Date.now()).toLocaleDateString()}
                  </p>
                </div>
                
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Last Updated</p>
                  <p className="text-sm font-semibold mt-1">
                    {new Date(project.updatedAt || Date.now()).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Project ID</p>
                  <p className="text-sm font-mono text-slate-600 bg-slate-50 p-2 rounded-md mt-1 break-all border border-slate-100">
                    {project._id}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Actions</h3>
              <div className="space-y-3">
                <button disabled className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-slate-500 font-medium bg-slate-50 opacity-70 cursor-not-allowed">
                  Open in Editor
                </button>
                <button disabled className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-slate-500 font-medium bg-slate-50 opacity-70 cursor-not-allowed">
                  Deploy Project
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ProjectView;