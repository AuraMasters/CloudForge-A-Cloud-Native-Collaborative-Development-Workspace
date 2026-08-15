import { useState } from "react";
import {
  Trash2,
  Save,
  RotateCcw,
  RefreshCw,
} from "lucide-react";
import {
  SiReact,
  SiNodedotjs,
  SiPython,
  SiHtml5,
  SiGithub,
} from "react-icons/si";
import { FileCode } from "lucide-react";
import { type Project } from "../../types/project";
import { type WorkspaceFile, type GitCommit } from "../../types/workspace";
import { useAlert } from "../../hooks/useAlert";
import API_URL from "../../config/api";
import { useNavigate } from "react-router-dom";

interface ProjectSettingsPanelProps {
  project: Project;
  filesCount: number;
  commitsCount: number;
  onUpdateProject: (updated: Project) => void;
  onResetTemplate?: (
    updated: Project,
    files: WorkspaceFile[],
    commits: GitCommit[]
  ) => void;
  onOpenGitHubModal: () => void;
}

const TEMPLATES = [
  {
    id: "react",
    name: "React + TypeScript",
    desc: "React 19, Vite, TypeScript & TailwindCSS",
    icon: <SiReact className="w-4 h-4 text-cyan-500" />,
  },
  {
    id: "nodejs",
    name: "Node.js Express",
    desc: "REST API with Express & routes",
    icon: <SiNodedotjs className="w-4 h-4 text-emerald-500" />,
  },
  {
    id: "python",
    name: "Python App",
    desc: "Python scripts with modular utilities",
    icon: <SiPython className="w-4 h-4 text-blue-500" />,
  },
  {
    id: "html-css",
    name: "HTML / CSS / JS",
    desc: "Vanilla web app with starter code",
    icon: <SiHtml5 className="w-4 h-4 text-orange-500" />,
  },
  {
    id: "blank",
    name: "Blank Project",
    desc: "Clean workspace with readme & starter file",
    icon: <FileCode className="w-4 h-4 text-slate-500" />,
  },
];

export const ProjectSettingsPanel: React.FC<ProjectSettingsPanelProps> = ({
  project,
  filesCount,
  commitsCount,
  onUpdateProject,
  onResetTemplate,
  onOpenGitHubModal,
}) => {
  const { showError, showSuccess } = useAlert();
  const navigate = useNavigate();

  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || "");
  const [selectedTemplate, setSelectedTemplate] = useState(
    project.template || "blank"
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showError("Project name is required");
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch(`${API_URL}/api/projects/${project._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          template: selectedTemplate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showError(data.message || "Failed to update project");
        return;
      }

      onUpdateProject(data.project);
      showSuccess("Project settings updated successfully");
    } catch (err: any) {
      showError(err.message || "Failed to update project");
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyAndResetTemplate = async () => {
    const tmplObj = TEMPLATES.find((t) => t.id === selectedTemplate);
    const tmplName = tmplObj?.name || selectedTemplate;

    const confirmed = window.confirm(
      `Apply and re-seed workspace with "${tmplName}" starter files?\n\nWarning: This will replace current files in this project with the new template files.`
    );
    if (!confirmed) return;

    try {
      setIsResetting(true);
      const res = await fetch(
        `${API_URL}/api/projects/${project._id}/workspace/reset-template`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ template: selectedTemplate }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        showError(data.message || "Failed to reset template");
        return;
      }

      if (onResetTemplate) {
        onResetTemplate(data.project, data.files, data.commits);
      }
      showSuccess(`Workspace switched to ${tmplName} successfully!`);
    } catch (err: any) {
      showError(err.message || "Failed to reset template");
    } finally {
      setIsResetting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;

    try {
      setIsDeleting(true);
      const res = await fetch(`${API_URL}/api/projects/${project._id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        showError("Failed to delete project");
        return;
      }

      showSuccess("Project deleted successfully");
      navigate("/projects");
    } catch (err: any) {
      showError(err.message || "Failed to delete project");
    } finally {
      setIsDeleting(false);
    }
  };

  const isGitHubLinked =
    project.source?.type === "github" || project.gitRemote?.connected;

  return (
    <div className="h-full flex flex-col bg-slate-50/70 text-slate-800 select-none overflow-y-auto font-sans text-xs border-r border-slate-200">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-slate-200 bg-white/60">
        <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
          Project Settings
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Workspace Quick Overview */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-center shadow-2xs">
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
              Total Files
            </p>
            <p className="text-base font-bold text-slate-900 mt-0.5">{filesCount}</p>
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-center shadow-2xs">
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
              Total Commits
            </p>
            <p className="text-base font-bold text-slate-900 mt-0.5">{commitsCount}</p>
          </div>
        </div>

        {/* Basic Info Form */}
        <form onSubmit={handleSave} className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Project Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white resize-none font-sans"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? "Saving..." : "Save Name & Description"}</span>
          </button>
        </form>

        {/* Interactive Template Preset Switcher */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Template Preset
            </label>
            <p className="text-[10px] text-slate-500 mb-2">
              Select or switch the workspace starter configuration.
            </p>

            <div className="space-y-1.5">
              {TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplate === tmpl.id;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => setSelectedTemplate(tmpl.id)}
                    className={`p-2 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${
                      isSelected
                        ? "bg-blue-50/70 border-blue-500 shadow-2xs"
                        : "bg-slate-50/60 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="shrink-0">{tmpl.icon}</div>
                      <div className="min-w-0">
                        <p className={`font-semibold text-xs ${isSelected ? "text-blue-900" : "text-slate-800"}`}>
                          {tmpl.name}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {tmpl.desc}
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 ml-2" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={handleApplyAndResetTemplate}
            disabled={isResetting}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50"
            title="Re-seed workspace files from selected template"
          >
            {isResetting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>Re-seeding workspace...</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                <span>Apply & Re-seed Template Files</span>
              </>
            )}
          </button>
        </div>

        {/* GitHub Remote Info */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800">GitHub Remote</span>
            <SiGithub className="w-4 h-4 text-slate-700" />
          </div>

          {isGitHubLinked ? (
            <div className="space-y-1 text-slate-600">
              <p className="text-[11px] font-mono text-blue-700 font-semibold truncate">
                {project.source?.github?.fullName || project.gitRemote?.fullName}
              </p>
              <p className="text-[10px] text-slate-500">
                Default Branch: {project.currentBranch || "main"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-500">
                This project is not currently linked to a remote GitHub repository.
              </p>
              <button
                type="button"
                onClick={onOpenGitHubModal}
                className="w-full py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
              >
                <SiGithub className="w-3.5 h-3.5" />
                <span>Link or Publish to GitHub</span>
              </button>
            </div>
          )}
        </div>

        {/* Project Metadata */}
        <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2 text-[11px] text-slate-500 font-mono shadow-2xs">
          <div className="flex items-center justify-between">
            <span>Project ID:</span>
            <span className="truncate max-w-[120px] text-slate-700 font-bold">{project._id}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Created:</span>
            <span className="text-slate-700">
              {new Date(project.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-full py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Project</span>
          </button>
        </div>
      </div>
    </div>
  );
};
