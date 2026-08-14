import { useNavigate } from "react-router-dom";
import { type Project } from "../../types/project";

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
    project.source?.type === "github";

  const handleDelete = () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${project.name}"?`
    );

    if (confirmed) {
      onDelete(project._id);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-slate-900 truncate">
            {project.name}
          </h3>

          <div className="flex items-center gap-2 mt-2">
            <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-md text-xs font-semibold">
              {project.language}
            </span>

            {isGitHubProject && (
              <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-semibold">
                GitHub
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              onClick={() => onEdit(project)}
              className="text-sm text-slate-400 hover:text-blue-600 transition-colors"
            >
              Edit
            </button>
          )}

          <button
            onClick={handleDelete}
            className="text-slate-400 hover:text-red-500 transition-colors text-xl"
            title="Delete project"
          >
            ×
          </button>
        </div>
      </div>

      <p className="text-sm text-slate-500 mt-4 min-h-[40px] line-clamp-2">
        {project.description ||
          "No description provided."}
      </p>

      {isGitHubProject &&
        project.source.github?.fullName && (
          <div className="mt-3">
            <p className="text-xs text-slate-400 truncate">
              {project.source.github.fullName}
            </p>
          </div>
        )}

      <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
        <p className="text-xs text-slate-400">
          Updated{" "}
          {new Date(
            project.updatedAt
          ).toLocaleDateString()}
        </p>

        <button
          onClick={() =>
            navigate(`/projects/${project._id}`)
          }
          className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
        >
          Open →
        </button>
      </div>
    </div>
  );
}

export default ProjectCard;