import { useEffect, useState } from "react";
import { useAlert } from "../../hooks/useAlert";
import API_URL from "../../config/api";
import { type Project } from "../../types/project";

interface EditProjectModalProps {
  project: Project | null;
  onClose: () => void;
  onUpdated: (project: Project) => void;
}

function EditProjectModal({
  project,
  onClose,
  onUpdated,
}: EditProjectModalProps) {
  const { showError, showSuccess } = useAlert();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("JavaScript");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || "");
      setLanguage(project.language || "JavaScript");
    }
  }, [project]);

  if (!project) {
    return null;
  }

  const handleUpdate = async () => {
    if (!name.trim()) {
      showError("Project name is required.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/projects/${project._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim(),
            language,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        showError(data.message || "Failed to update project.");
        return;
      }

      onUpdated(data.project);
      showSuccess("Project updated successfully.");
      onClose();
    } catch (error) {
      showError("Failed to update project.");
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
              Edit Project
            </h3>

            <p className="text-sm text-slate-500 mt-1">
              Update your project details.
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
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Description
            </label>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
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
            onClick={handleUpdate}
            disabled={loading}
            className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>

        </div>

      </div>
    </div>
  );
}

export default EditProjectModal;