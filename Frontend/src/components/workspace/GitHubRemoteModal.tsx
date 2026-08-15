import React, { useState, useEffect } from "react";
import { SiGithub } from "react-icons/si";
import {
  Lock,
  Globe,
  UploadCloud,
  Link2,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { githubApi } from "../../config/github";
import { useAlert } from "../../hooks/useAlert";
import { type Project } from "../../types/project";
import { type GitHubRepository } from "../../types/github";

interface GitHubRemoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onLinkRepo: (repoUrl: string) => Promise<void>;
  onPublishRepo: (
    name: string,
    description: string,
    isPrivate: boolean
  ) => Promise<void>;
}

export const GitHubRemoteModal: React.FC<GitHubRemoteModalProps> = ({
  isOpen,
  onClose,
  project,
  onLinkRepo,
  onPublishRepo,
}) => {
  const { showError, showSuccess } = useAlert();
  const [tab, setTab] = useState<"publish" | "link">("publish");

  // Publish Form State
  const [publishName, setPublishName] = useState(
    project.name.toLowerCase().replace(/\s+/g, "-")
  );
  const [publishDescription, setPublishDescription] = useState(
    project.description || ""
  );
  const [isPrivate, setIsPrivate] = useState(false);

  // Link Form State
  const [repoUrl, setRepoUrl] = useState("");
  const [userRepos, setUserRepos] = useState<GitHubRepository[]>([]);
  const [selectedRepoFullName, setSelectedRepoFullName] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPublishName(project.name.toLowerCase().replace(/\s+/g, "-"));
      setPublishDescription(project.description || "");

      // Load user GitHub repos if connected
      const loadRepos = async () => {
        try {
          const data = await githubApi.getRepositories();
          setUserRepos(data.repositories || []);
        } catch {
          // If GitHub not connected or fails, fallback to manual URL input
        }
      };
      loadRepos();
    }
  }, [isOpen, project]);

  if (!isOpen) return null;

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publishName.trim()) {
      showError("Repository name is required");
      return;
    }

    try {
      setIsSubmitting(true);
      await onPublishRepo(
        publishName.trim(),
        publishDescription.trim(),
        isPrivate
      );
      showSuccess("Published to GitHub successfully!");
      onClose();
    } catch (err: any) {
      showError(err.message || "Failed to publish repository to GitHub");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetUrl = selectedRepoFullName || repoUrl.trim();
    if (!targetUrl) {
      showError("Please provide a repository URL or select one from the list");
      return;
    }

    try {
      setIsSubmitting(true);
      await onLinkRepo(targetUrl);
      showSuccess("Linked to GitHub repository successfully!");
      onClose();
    } catch (err: any) {
      showError(err.message || "Failed to link GitHub repository");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-lg max-h-[90vh] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-900">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-900 shrink-0">
              <SiGithub className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                GitHub Remote
              </h2>
              <p className="text-xs text-slate-500">
                Synchronize your workspace with GitHub.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 bg-slate-50 p-1.5 gap-1 text-xs">
          <button
            type="button"
            onClick={() => setTab("publish")}
            className={`flex-1 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
              tab === "publish"
                ? "bg-white text-blue-700 shadow-2xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <UploadCloud className="w-4 h-4 text-blue-600" />
            <span>Publish New Repo</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("link")}
            className={`flex-1 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
              tab === "link"
                ? "bg-white text-blue-700 shadow-2xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Link2 className="w-4 h-4 text-blue-600" />
            <span>Link Existing Repo</span>
          </button>
        </div>

        {/* Tab 1: Publish Form */}
        {tab === "publish" ? (
          <form onSubmit={handlePublish} className="p-6 space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">
                Repository Name
              </label>
              <input
                type="text"
                value={publishName}
                onChange={(e) => setPublishName(e.target.value)}
                placeholder="my-cloud-project"
                disabled={isSubmitting}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 outline-none focus:border-blue-500 focus:bg-white font-mono shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">
                Description (Optional)
              </label>
              <textarea
                value={publishDescription}
                onChange={(e) => setPublishDescription(e.target.value)}
                placeholder="Project created with CloudForge..."
                rows={2}
                disabled={isSubmitting}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 outline-none focus:border-blue-500 focus:bg-white resize-none font-sans shadow-2xs"
              />
            </div>

            {/* Visibility Toggle */}
            <div className="space-y-2">
              <label className="block text-slate-700 font-semibold">
                Visibility
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsPrivate(false)}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 text-left transition-all ${
                    !isPrivate
                      ? "border-blue-600 bg-blue-50/70 text-blue-900 shadow-2xs"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <Globe className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-xs text-slate-900">Public</p>
                    <p className="text-[10px] text-slate-500">Anyone can view</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPrivate(true)}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 text-left transition-all ${
                    isPrivate
                      ? "border-blue-600 bg-blue-50/70 text-blue-900 shadow-2xs"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-xs text-slate-900">Private</p>
                    <p className="text-[10px] text-slate-500">Only you can view</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !publishName.trim()}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Publish to GitHub</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Tab 2: Link Form */
          <form onSubmit={handleLink} className="p-6 space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">
                GitHub Repository URL
              </label>
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => {
                  setRepoUrl(e.target.value);
                  setSelectedRepoFullName("");
                }}
                placeholder="https://github.com/owner/repository"
                disabled={isSubmitting}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 outline-none focus:border-blue-500 focus:bg-white font-mono shadow-2xs"
              />
            </div>

            {/* List of user's GitHub Repos */}
            {userRepos.length > 0 && (
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">
                  Or Select from your GitHub Repositories:
                </label>
                <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-1.5 space-y-1">
                  {userRepos.map((repo) => (
                    <div
                      key={repo.id}
                      onClick={() => {
                        setSelectedRepoFullName(repo.fullName);
                        setRepoUrl(repo.url);
                      }}
                      className={`p-2 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${
                        selectedRepoFullName === repo.fullName
                          ? "bg-blue-50 border border-blue-200 text-blue-900 font-semibold"
                          : "hover:bg-white text-slate-700"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-xs truncate text-slate-900">
                          {repo.fullName}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {repo.language} • {repo.defaultBranch}
                        </p>
                      </div>
                      {selectedRepoFullName === repo.fullName && (
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || (!repoUrl.trim() && !selectedRepoFullName)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Linking...</span>
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4" />
                    <span>Link Repository</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
