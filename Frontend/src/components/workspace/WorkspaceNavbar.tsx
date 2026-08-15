import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Download,
  FolderGit2,
  FileCode2,
  PanelLeft,
} from "lucide-react";
import { SiGithub } from "react-icons/si";
import { type Project } from "../../types/project";

interface WorkspaceNavbarProps {
  project: Project;
  isDirty: boolean;
  isSaving: boolean;
  filesCount: number;
  commitsCount: number;
  onOpenGitHubModal: () => void;
  onSyncGitHub: () => void;
  onDownloadZip: () => void;
  isSyncing: boolean;
  onToggleMobileSidebar?: () => void;
  isMobileSidebarOpen?: boolean;
}

export const WorkspaceNavbar: React.FC<WorkspaceNavbarProps> = ({
  project,
  isDirty,
  isSaving,
  filesCount,
  commitsCount,
  onOpenGitHubModal,
  onSyncGitHub,
  onDownloadZip,
  isSyncing,
  onToggleMobileSidebar,
  isMobileSidebarOpen,
}) => {
  const navigate = useNavigate();

  const isGitHubConnected =
    project.source?.type === "github" || project.gitRemote?.connected;
  const repoFullName =
    project.source?.github?.fullName || project.gitRemote?.fullName;
  const repoUrl = project.source?.github?.url || project.gitRemote?.url;

  return (
    <header className="h-13 sm:h-14 bg-white border-b border-slate-200 px-2.5 sm:px-4 flex items-center justify-between select-none text-slate-800 shadow-2xs z-30">
      {/* Left section */}
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
        {/* Mobile Sidebar Toggle */}
        <button
          onClick={onToggleMobileSidebar}
          className={`md:hidden p-1.5 rounded-lg border transition-colors ${
            isMobileSidebarOpen
              ? "bg-blue-50 border-blue-200 text-blue-600"
              : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
          }`}
          title="Toggle Sidebar & Files"
          aria-label="Toggle Sidebar"
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => navigate("/projects")}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1.5 text-xs font-semibold"
          title="Back to Projects"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden md:inline">Projects</span>
        </button>

        <div className="h-4 w-px bg-slate-200 hidden sm:block" />

        {/* Project Branding */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs shrink-0 shadow-2xs">
            CF
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-xs sm:text-sm text-slate-900 truncate max-w-[110px] xs:max-w-[140px] sm:max-w-[200px] md:max-w-[260px]">
              {project.name}
            </h1>
          </div>
        </div>

        {/* Workspace Quick Stats */}
        <div className="hidden lg:flex items-center gap-2 pl-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-600">
            <FileCode2 className="w-3 h-3 text-slate-500" />
            {filesCount} {filesCount === 1 ? "file" : "files"}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-600">
            <FolderGit2 className="w-3 h-3 text-slate-500" />
            {commitsCount} {commitsCount === 1 ? "commit" : "commits"}
          </span>
        </div>

        {/* GitHub Connection Badge */}
        {isGitHubConnected ? (
          <div className="hidden md:flex items-center gap-1.5 pl-2">
            <a
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-xs font-medium text-slate-700 transition-colors"
              title="Open repository on GitHub"
            >
              <SiGithub className="w-3.5 h-3.5 text-slate-800" />
              <span className="truncate max-w-[160px] font-mono text-[11px]">
                {repoFullName}
              </span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>

            <button
              onClick={onSyncGitHub}
              disabled={isSyncing}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition-colors disabled:opacity-50"
              title="Sync with GitHub Remote"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-blue-600" : ""}`}
              />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenGitHubModal}
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700 text-xs font-semibold transition-all"
            title="Link this project to a GitHub repository"
          >
            <SiGithub className="w-3.5 h-3.5 text-slate-800" />
            <span>Link GitHub</span>
          </button>
        )}
      </div>

      {/* Center: Save / Sync status */}
      <div className="flex items-center gap-1 sm:gap-2 text-[11px] sm:text-xs font-medium">
        {isSaving ? (
          <span className="flex items-center gap-1 text-amber-600 animate-pulse bg-amber-50 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md border border-amber-200">
            <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin" />
            <span className="hidden sm:inline">Saving...</span>
          </span>
        ) : isDirty ? (
          <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md border border-amber-200">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span className="hidden sm:inline">Unsaved</span>
            <span className="sm:hidden">Unsaved</span>
          </span>
        ) : (
          <span className="hidden sm:flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Saved
          </span>
        )}
      </div>

      {/* Right Action buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Sync button for mobile if GitHub connected */}
        {isGitHubConnected && (
          <button
            onClick={onSyncGitHub}
            disabled={isSyncing}
            className="md:hidden p-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
            title="Sync with GitHub Remote"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-blue-600" : ""}`} />
          </button>
        )}

        {/* Mobile GitHub link button if not connected */}
        {!isGitHubConnected && (
          <button
            onClick={onOpenGitHubModal}
            className="md:hidden p-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-xs"
            title="Link GitHub"
          >
            <SiGithub className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Export / Download Project ZIP */}
        <button
          onClick={onDownloadZip}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors border border-slate-200"
          title="Download workspace files as ZIP"
        >
          <Download className="w-3.5 h-3.5 text-slate-600" />
          <span className="hidden sm:inline">Export ZIP</span>
        </button>
      </div>
    </header>
  );
};
