import { useState } from "react";
import { useAlert } from "../../hooks/useAlert";
import API_URL from "../../config/api";
import { type CreateProjectData, type Project } from "../../types/project";
import { SiReact, SiNodedotjs, SiPython, SiHtml5 } from "react-icons/si";
import { FileCode, Sparkles } from "lucide-react";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (project: Project) => void;
}

const TEMPLATES = [
  {
    id: "react",
    name: "React + TypeScript",
    desc: "React 19, Vite, TypeScript & TailwindCSS",
    icon: <SiReact className="w-5 h-5 text-cyan-500" />,
  },
  {
    id: "nodejs",
    name: "Node.js Express",
    desc: "REST API with Express & routes",
    icon: <SiNodedotjs className="w-5 h-5 text-emerald-500" />,
  },
  {
    id: "python",
    name: "Python App",
    desc: "Python scripts with modular utilities",
    icon: <SiPython className="w-5 h-5 text-blue-500" />,
  },
  {
    id: "html-css",
    name: "HTML / CSS / JS",
    desc: "Vanilla web app with starter code",
    icon: <SiHtml5 className="w-5 h-5 text-orange-500" />,
  },
  {
    id: "blank",
    name: "Blank Project",
    desc: "Clean workspace with readme & starter file",
    icon: <FileCode className="w-5 h-5 text-slate-500" />,
  },
];

function CreateProjectModal({
  isOpen,
  onClose,
  onCreated,
}: CreateProjectModalProps) {
  const { showError, showSuccess } = useAlert();

  const [form, setForm] = useState<CreateProjectData>({
    name: "",
    description: "",
    template: "react",
  });

  const [loading, setLoading] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleSelectTemplate = (templateId: string) => {
    setForm((prev) => ({
      ...prev,
      template: templateId,
    }));
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      showError("Project name is required.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          template: form.template,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showError(data.message || "Failed to create project.");
        return;
      }

      onCreated(data.project);
      showSuccess("Project workspace created successfully!");

      setForm({
        name: "",
        description: "",
        template: "react",
      });

      onClose();
    } catch (error) {
      showError("Failed to create project.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              Create New Project
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Start with a cloud workspace template or clean boilerplate.
            </p>
          </div>

          <button
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-700 text-2xl disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* Template Picker */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Select Starter Template
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TEMPLATES.map((tmpl) => {
                const isSelected = form.template === tmpl.id;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => handleSelectTemplate(tmpl.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/70 ring-1 ring-blue-600 shadow-sm"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">{tmpl.icon}</div>
                    <div className="min-w-0">
                      <p
                        className={`font-bold text-xs ${
                          isSelected ? "text-blue-950" : "text-slate-800"
                        }`}
                      >
                        {tmpl.name}
                      </p>
                      <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                        {tmpl.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Project Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="e.g. My NextGen Cloud App"
              disabled={loading}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Describe your workspace project..."
              rows={2}
              disabled={loading}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={handleCreate}
            disabled={loading || !form.name.trim()}
            className="px-5 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-blue-500/20 flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            <span>{loading ? "Creating Workspace..." : "Create Project"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateProjectModal;