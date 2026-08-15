import { useEffect, useMemo, useState } from "react";
import API_URL from "../../config/api";
import { useAlert } from "../../hooks/useAlert";
import {
  type GitHubRepositoriesResponse,
  type GitHubRepository,
} from "../../types/github";
import { type Project } from "../../types/project";

interface GitHubRepositoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: (project: Project) => void;
}

function GitHubRepositoryModal({
  isOpen,
  onClose,
  onImported,
}: GitHubRepositoryModalProps) {
  const { showError, showSuccess } = useAlert();

  const [repositories, setRepositories] = useState<
    GitHubRepository[]
  >([]);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const loadRepositories = async () => {
      try {
        setLoading(true);

        const response = await fetch(
          `${API_URL}/api/github/repos`,
          {
            credentials: "include",
          }
        );

        const data: GitHubRepositoriesResponse =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data as unknown as string
          );
        }

        setRepositories(data.repositories || []);
      } catch (error) {
        showError(
          error instanceof Error
            ? error.message
            : "Failed to load GitHub repositories."
        );
      } finally {
        setLoading(false);
      }
    };

    loadRepositories();
  }, [isOpen, showError]);

  const filteredRepositories = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return repositories;
    }

    return repositories.filter((repository) =>
      [
        repository.name,
        repository.fullName,
        repository.description,
        repository.language,
      ].some((value) =>
        value?.toLowerCase().includes(query)
      )
    );
  }, [repositories, search]);

  const handleImport = async (
    repository: GitHubRepository
  ) => {
    if (repository.alreadyImported) {
      if (repository.projectId) {
        onClose();
      }

      return;
    }

    try {
      setImportingId(repository.id);

      const response = await fetch(
        `${API_URL}/api/projects/import/github`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            owner: repository.owner,
            repo: repository.name,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        showError(
          data.message || "Failed to import repository."
        );
        return;
      }

      onImported(data.project);

      showSuccess(
        data.alreadyImported
          ? "Repository is already in your projects."
          : "Repository imported successfully."
      );

      setRepositories((prev) =>
        prev.map((item) =>
          item.id === repository.id
            ? {
                ...item,
                alreadyImported: true,
                projectId: data.project?._id || null,
              }
            : item
        )
      );
    } catch (error) {
      showError("Failed to import GitHub repository.");
    } finally {
      setImportingId(null);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900">
              Import from GitHub
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Choose a repository to clone and manage in CloudForge.
            </p>
          </div>

          <button
            onClick={onClose}
            disabled={Boolean(importingId)}
            className="text-slate-400 hover:text-slate-700 text-2xl disabled:opacity-50"
          >
            ×
          </button>
        </div>

        {/* Search input */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/50">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search repositories by name, language..."
            disabled={loading || Boolean(importingId)}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl outline-none text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100"
          />
        </div>

        {/* Repositories list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="py-12 text-center">
              <p className="text-xs sm:text-sm text-slate-500">
                Loading your GitHub repositories...
              </p>
            </div>
          ) : repositories.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-xs sm:text-sm font-semibold text-slate-700">
                No GitHub repositories found.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Make sure your GitHub account is connected and has accessible repositories.
              </p>
            </div>
          ) : filteredRepositories.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-xs sm:text-sm font-semibold text-slate-700">
                No matching repositories found.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Try searching with a different keyword.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRepositories.map((repository) => (
                <div
                  key={repository.id}
                  className="border border-slate-200 rounded-xl p-3.5 sm:p-4 hover:border-blue-300 hover:bg-blue-50/20 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                        {repository.name}
                      </h4>

                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold">
                        {repository.private ? "Private" : "Public"}
                      </span>
                    </div>

                    <p className="text-[11px] text-blue-700 font-mono mt-0.5 truncate">
                      {repository.fullName}
                    </p>

                    {repository.description && (
                      <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                        {repository.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-[11px]">
                      {repository.language && (
                        <span className="font-semibold text-blue-600">
                          {repository.language}
                        </span>
                      )}

                      <span className="text-slate-400">
                        {repository.defaultBranch || "main"}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleImport(repository)}
                    disabled={
                      repository.alreadyImported ||
                      importingId === repository.id
                    }
                    className={`w-full sm:w-auto shrink-0 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
                      repository.alreadyImported
                        ? "bg-slate-100 text-slate-500 cursor-default"
                        : "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 shadow-2xs"
                    }`}
                  >
                    {importingId === repository.id
                      ? "Importing..."
                      : repository.alreadyImported
                      ? "Imported ✓"
                      : "Import"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-between items-center gap-3 p-4 sm:p-6 border-t border-slate-200 bg-slate-50/50">
          <p className="text-xs text-slate-500 font-medium">
            {filteredRepositories.length}{" "}
            {filteredRepositories.length === 1
              ? "repository"
              : "repositories"}
          </p>

          <button
            onClick={onClose}
            disabled={Boolean(importingId)}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default GitHubRepositoryModal;