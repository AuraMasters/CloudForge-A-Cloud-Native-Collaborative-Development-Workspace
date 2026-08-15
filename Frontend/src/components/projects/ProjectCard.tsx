import { useNavigate } from "react-router-dom";
import { type Project } from "../../types/project";
import { SiGithub } from "react-icons/si";

interface ProjectCardProps {
  project: Project;
  onDelete: (projectId: string) => void;
  onEdit?: (project: Project) => void;
}

function ProjectCard({
  project,
  onDelete,
  onEdit,
}: ProjectCardProps) {
  const navigate = useNavigate();

  const isGitHubProject =
    project.source?.type === "github" || project.gitRemote?.connected;

  const handleDelete = () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${project.name}"?`
    );

    if (confirmed) {
      onDelete(project._id);
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between group">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
              {project.name}
            </h3>

            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {project.template && (
                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                  {project.template}
                </span>
              )}

              {isGitHubProject && (
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[10px] sm:text-xs font-semibold flex items-center gap-1">
                  <SiGithub className="w-3 h-3 text-slate-800" />
                  <span>GitHub</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {onEdit && (
              <button
                onClick={() => onEdit(project)}
                className="px-2 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                title="Edit Project"
              >
                Edit
              </button>
            )}

            <button
              onClick={handleDelete}
              className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors text-lg leading-none"
              title="Delete Project"
            >
              ×
            </button>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-500 mt-3 min-h-[36px] line-clamp-2 leading-relaxed">
          {project.description || "No description provided."}
        </p>

        {isGitHubProject && (project.source?.github?.fullName || project.gitRemote?.fullName) && (
          <div className="mt-2.5">
            <p className="text-[11px] text-blue-700 font-mono font-medium truncate">
              {project.source?.github?.fullName || project.gitRemote?.fullName}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-5 pt-3.5 border-t border-slate-100 text-xs">
        <p className="text-[11px] text-slate-400">
          {new Date(project.updatedAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </p>

        <button
          onClick={() => navigate(`/projects/${project._id}`)}
          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
        >
          <span>Open Workspace</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}

export default ProjectCard;