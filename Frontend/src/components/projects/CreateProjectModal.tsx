import { useState } from "react";
import { useAlert } from "../../hooks/useAlert";
import API_URL from "../../config/api";
import { type CreateProjectData, type Project } from "../../types/project";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (project: Project) => void;
}

function CreateProjectModal({
  isOpen,
  onClose,
  onCreated,
}: CreateProjectModalProps) {
  const { showError, showSuccess } = useAlert();

  const [form, setForm] = useState<CreateProjectData>({
    name: "",
    description: "",
    language: "JavaScript",
  });

  const [loading, setLoading] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleChange = (
    field: keyof CreateProjectData,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
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
          language: form.language,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showError(data.message || "Failed to create project.");
        return;
      }

      onCreated(data.project);

      showSuccess("Project created successfully.");

      setForm({
        name: "",
        description: "",
        language: "JavaScript",
      });

      onClose();
    } catch (error) {
      showError("Failed to create project.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              Create Project
            </h3>

            <p className="text-sm text-slate-500 mt-1">
              Start a new CloudForge project.
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
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Project Name
            </label>

            <input
              type="text"
              value={form.name}
              onChange={(e) =>
                handleChange("name", e.target.value)
              }
              placeholder="My React App"
              disabled={loading}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Description
            </label>

            <textarea
              value={form.description}
              onChange={(e) =>
                handleChange("description", e.target.value)
              }
              placeholder="Describe your project..."
              rows={3}
              disabled={loading}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Language
            </label>

            <select
              value={form.language}
              onChange={(e) =>
                handleChange("language", e.target.value)
              }
              disabled={loading}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50"
            >
              <option value="JavaScript">JavaScript</option>
              <option value="TypeScript">TypeScript</option>
              <option value="Python">Python</option>
              <option value="Java">Java</option>
              <option value="C++">C++</option>
              <option value="Go">Go</option>
              <option value="Rust">Rust</option>
            </select>
          </div>

        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={handleCreate}
            disabled={loading}
            className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create Project"}
          </button>
        </div>

      </div>
    </div>
  );
}

export default CreateProjectModal;