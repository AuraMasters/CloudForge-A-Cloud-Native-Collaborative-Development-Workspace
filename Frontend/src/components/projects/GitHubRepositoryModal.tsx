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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[85vh] bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              Import from GitHub
            </h3>

            <p className="text-sm text-slate-500 mt-1">
              Choose a repository to add to your CloudForge
              projects.
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

        <div className="p-6 border-b border-slate-100">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search repositories..."
            disabled={loading || Boolean(importingId)}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="py-12 text-center">
              <p className="text-sm text-slate-500">
                Loading GitHub repositories...
              </p>
            </div>
          ) : repositories.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-medium text-slate-700">
                No GitHub repositories found.
              </p>

              <p className="text-sm text-slate-500 mt-1">
                Make sure your GitHub account has accessible
                repositories.
              </p>
            </div>
          ) : filteredRepositories.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-medium text-slate-700">
                No matching repositories.
              </p>

              <p className="text-sm text-slate-500 mt-1">
                Try another search term.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRepositories.map((repository) => (
                <div
                  key={repository.id}
                  className="border border-slate-200 rounded-xl p-4 hover:border-blue-200 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-900 truncate">
                          {repository.name}
                        </h4>

                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-xs">
                          {repository.private
                            ? "Private"
                            : "Public"}
                        </span>
                      </div>

                      <p className="text-sm text-slate-500 mt-1 truncate">
                        {repository.fullName}
                      </p>

                      <p className="text-sm text-slate-500 mt-2 line-clamp-2">
                        {repository.description ||
                          "No description provided."}
                      </p>

                      <div className="flex items-center gap-3 mt-3">
                        <span className="text-xs font-medium text-blue-600">
                          {repository.language}
                        </span>

                        <span className="text-xs text-slate-400">
                          {repository.defaultBranch}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        handleImport(repository)
                      }
                      disabled={
                        repository.alreadyImported ||
                        importingId === repository.id
                      }
                      className={`shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        repository.alreadyImported
                          ? "bg-slate-100 text-slate-500 cursor-default"
                          : "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                      }`}
                    >
                      {importingId === repository.id
                        ? "Importing..."
                        : repository.alreadyImported
                        ? "Added ✓"
                        : "Import"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center gap-3 p-6 border-t border-slate-200">
          <p className="text-xs text-slate-400">
            {filteredRepositories.length}{" "}
            {filteredRepositories.length === 1
              ? "repository"
              : "repositories"}
          </p>

          <button
            onClick={onClose}
            disabled={Boolean(importingId)}
            className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default GitHubRepositoryModal;