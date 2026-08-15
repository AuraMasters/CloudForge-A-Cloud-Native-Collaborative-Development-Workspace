import React, { useState, useMemo } from "react";
import {
  GitBranch,
  Check,
  Plus,
  Minus,
  RotateCcw,
  RefreshCw,
  Clock,
  ChevronDown,
  ChevronRight,
  FolderGit2,
  Search,
} from "lucide-react";
import { SiGithub } from "react-icons/si";
import { FileIcon } from "./FileIcon";
import {
  type GitCommit,
  type WorkspaceFile,
} from "../../types/workspace";
import { type Project } from "../../types/project";

interface SourceControlPanelProps {
  project: Project;
  changedFiles: {
    file: WorkspaceFile;
    status: "modified" | "added" | "deleted";
    staged: boolean;
  }[];
  commits: GitCommit[];
  currentBranch: string;
  branches: string[];
  onCommit: (message: string, stagedOnly: boolean) => Promise<void>;
  onStageFile: (fileId: string) => void;
  onUnstageFile: (fileId: string) => void;
  onStageAll: () => void;
  onUnstageAll: () => void;
  onDiscardChange: (fileId: string) => void;
  onDiscardAllChanges?: () => void;
  onSelectCommit: (commit: GitCommit) => void;
  onInspectDiff: (file: WorkspaceFile) => void;
  onSwitchBranch: (branch: string, createNew?: boolean) => Promise<void>;
  onOpenGitHubModal: () => void;
  onSyncGitHub: () => Promise<void>;
  isSyncing: boolean;
}

export const SourceControlPanel: React.FC<SourceControlPanelProps> = ({
  project,
  changedFiles,
  commits,
  currentBranch,
  branches,
  onCommit,
  onStageFile,
  onUnstageFile,
  onStageAll,
  onUnstageAll,
  onDiscardChange,
  onDiscardAllChanges,
  onSelectCommit,
  onInspectDiff,
  onSwitchBranch,
  onOpenGitHubModal,
  onSyncGitHub,
  isSyncing,
}) => {
  const [commitMessage, setCommitMessage] = useState("");
  const [isCommitting, setIsCommitting] = useState(false);
  const [viewMode, setViewMode] = useState<"changes" | "history">("changes");
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [showNewBranchInput, setShowNewBranchInput] = useState(false);
  const [isStagedCollapsed, setIsStagedCollapsed] = useState(false);
  const [isChangesCollapsed, setIsChangesCollapsed] = useState(false);
  const [commitSearch, setCommitSearch] = useState("");

  const stagedChanges = changedFiles.filter((c) => c.staged);
  const unstagedChanges = changedFiles.filter((c) => !c.staged);

  const isGitHubLinked =
    project.source?.type === "github" || project.gitRemote?.connected;
  const repoFullName =
    project.source?.github?.fullName || project.gitRemote?.fullName;

  const handleCommitSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commitMessage.trim()) return;

    try {
      setIsCommitting(true);
      await onCommit(commitMessage.trim(), stagedChanges.length > 0);
      setCommitMessage("");
    } finally {
      setIsCommitting(false);
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;
    await onSwitchBranch(newBranchName.trim(), true);
    setNewBranchName("");
    setShowNewBranchInput(false);
    setShowBranchDropdown(false);
  };

  const filteredCommits = useMemo(() => {
    if (!commitSearch.trim()) return commits;
    const q = commitSearch.toLowerCase();
    return commits.filter(
      (c) =>
        c.message.toLowerCase().includes(q) ||
        c.sha.toLowerCase().includes(q) ||
        c.author?.name?.toLowerCase().includes(q)
    );
  }, [commits, commitSearch]);

  return (
    <div className="h-full flex flex-col bg-slate-50/70 text-slate-800 select-none overflow-hidden border-r border-slate-200">
      {/* Header Bar */}
      <div className="px-3 py-2.5 flex items-center justify-between border-b border-slate-200 bg-white/60">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
            Source Control
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 font-bold font-mono">
            {changedFiles.length}
          </span>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs">
          <button
            onClick={() => setViewMode("changes")}
            className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
              viewMode === "changes"
                ? "bg-white text-blue-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Changes
          </button>
          <button
            onClick={() => setViewMode("history")}
            className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
              viewMode === "history"
                ? "bg-white text-blue-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Commits ({commits.length})
          </button>
        </div>
      </div>

      {/* Branch & Remote Banner */}
      <div className="p-3 bg-white/80 border-b border-slate-200 space-y-2">
        {/* Branch Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowBranchDropdown(!showBranchDropdown)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:border-slate-300 text-xs text-slate-800 transition-colors shadow-2xs"
          >
            <div className="flex items-center gap-2 truncate">
              <GitBranch className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate font-mono font-semibold">
                {currentBranch}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {/* Branch Dropdown */}
          {showBranchDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden p-1.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1">
                Switch Branch
              </div>
              <div className="max-h-40 overflow-y-auto space-y-0.5">
                {branches.map((b) => (
                  <button
                    key={b}
                    onClick={() => {
                      onSwitchBranch(b, false);
                      setShowBranchDropdown(false);
                    }}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs text-left ${
                      b === currentBranch
                        ? "bg-blue-50 text-blue-700 font-bold"
                        : "hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    <span className="font-mono truncate">{b}</span>
                    {b === currentBranch && <Check className="w-3 h-3 text-blue-600" />}
                  </button>
                ))}
              </div>

              {/* Create new branch */}
              <div className="mt-1 pt-1 border-t border-slate-100">
                {showNewBranchInput ? (
                  <form onSubmit={handleCreateBranch} className="p-1 space-y-1">
                    <input
                      type="text"
                      value={newBranchName}
                      onChange={(e) => setNewBranchName(e.target.value)}
                      placeholder="feature/new-branch"
                      autoFocus
                      className="w-full px-2 py-1 bg-slate-50 border border-blue-500 rounded text-xs text-slate-900 outline-none"
                    />
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setShowNewBranchInput(false)}
                        className="px-2 py-0.5 text-[11px] text-slate-500 hover:text-slate-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold"
                      >
                        Create
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setShowNewBranchInput(true)}
                    className="w-full text-left px-2 py-1.5 rounded text-xs text-blue-600 hover:bg-blue-50 flex items-center gap-1.5 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create new branch...</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* GitHub Link / Sync Banner */}
        {isGitHubLinked ? (
          <div className="p-2 rounded-lg bg-blue-50/80 border border-blue-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <SiGithub className="w-3.5 h-3.5 text-slate-800 shrink-0" />
              <span className="truncate text-slate-700 font-mono text-[11px] font-medium">
                {repoFullName}
              </span>
            </div>
            <button
              onClick={onSyncGitHub}
              disabled={isSyncing}
              className="px-2 py-1 rounded bg-white hover:bg-blue-100 text-blue-700 font-semibold text-[11px] flex items-center gap-1 shrink-0 transition-colors border border-blue-200 shadow-2xs disabled:opacity-50"
              title="Sync with GitHub"
            >
              <RefreshCw
                className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`}
              />
              <span>Sync</span>
            </button>
          </div>
        ) : (
          <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <p className="font-bold text-slate-800 text-[11px]">
                Local Workspace
              </p>
              <p className="text-[10px] text-slate-500">Unlinked to GitHub</p>
            </div>
            <button
              onClick={onOpenGitHubModal}
              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[11px] flex items-center gap-1 shadow-xs transition-colors"
            >
              <SiGithub className="w-3 h-3" />
              <span>Link Repo</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content: Changes View or History View */}
      {viewMode === "changes" ? (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Commit Message Box */}
          <div className="p-3 border-b border-slate-200 bg-white/60 space-y-2">
            <textarea
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  handleCommitSubmit();
                }
              }}
              placeholder={`Commit message (Ctrl+Enter)`}
              rows={2}
              className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none font-sans shadow-2xs"
            />

            <button
              onClick={() => handleCommitSubmit()}
              disabled={
                isCommitting ||
                !commitMessage.trim() ||
                changedFiles.length === 0
              }
              className="w-full py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all"
            >
              {isCommitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Committing...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    {isGitHubLinked ? "Commit & Push to GitHub" : "Commit Changes"}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Staged & Unstaged Changes Tree */}
          <div className="flex-1 overflow-y-auto p-2 space-y-3 font-mono text-xs">
            {changedFiles.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <FolderGit2 className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                <p className="font-semibold text-slate-600">No changes detected</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Working tree is clean
                </p>
              </div>
            ) : (
              <>
                {/* Staged Changes Accordion */}
                {stagedChanges.length > 0 && (
                  <div>
                    <div
                      onClick={() => setIsStagedCollapsed(!isStagedCollapsed)}
                      className="flex items-center justify-between py-1 px-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-800"
                    >
                      <div className="flex items-center gap-1">
                        {isStagedCollapsed ? (
                          <ChevronRight className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                        <span>Staged Changes ({stagedChanges.length})</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUnstageAll();
                        }}
                        title="Unstage all changes"
                        className="p-0.5 hover:text-slate-800 text-slate-400"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                    </div>

                    {!isStagedCollapsed && (
                      <div className="space-y-0.5 mt-1">
                        {stagedChanges.map(({ file, status }) => (
                          <div
                            key={file._id}
                            className="group flex items-center justify-between px-2 py-1 rounded-lg hover:bg-slate-200/70 text-slate-800 transition-colors"
                          >
                            <div
                              onClick={() => onInspectDiff(file)}
                              className="flex items-center gap-1.5 min-w-0 flex-1 cursor-pointer"
                            >
                              <FileIcon
                                name={file.name}
                                type={file.type}
                                className="w-3.5 h-3.5 shrink-0"
                              />
                              <span className="truncate text-xs font-medium">
                                {file.name}
                              </span>
                              <span className="text-[10px] text-slate-400 truncate">
                                {file.path}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                  status === "added"
                                    ? "text-emerald-700 bg-emerald-100"
                                    : status === "modified"
                                    ? "text-amber-700 bg-amber-100"
                                    : "text-red-700 bg-red-100"
                                }`}
                              >
                                {status === "added"
                                  ? "A"
                                  : status === "modified"
                                  ? "M"
                                  : "D"}
                              </span>
                              <button
                                onClick={() => onUnstageFile(file._id)}
                                title="Unstage change"
                                className="p-0.5 hover:text-slate-900 text-slate-400 hidden group-hover:block"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Unstaged Changes Accordion */}
                <div>
                  <div
                    onClick={() => setIsChangesCollapsed(!isChangesCollapsed)}
                    className="flex items-center justify-between py-1 px-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-800"
                  >
                    <div className="flex items-center gap-1">
                      {isChangesCollapsed ? (
                        <ChevronRight className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                      <span>Changes ({unstagedChanges.length})</span>
                    </div>

                    {unstagedChanges.length > 0 && (
                      <div className="flex items-center gap-1">
                        {onDiscardAllChanges && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDiscardAllChanges();
                            }}
                            title="Discard all changes"
                            className="p-0.5 hover:text-red-600 text-slate-400"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onStageAll();
                          }}
                          title="Stage all changes"
                          className="p-0.5 hover:text-slate-800 text-slate-400"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {!isChangesCollapsed && (
                    <div className="space-y-0.5 mt-1">
                      {unstagedChanges.map(({ file, status }) => (
                        <div
                          key={file._id}
                          className="group flex items-center justify-between px-2 py-1 rounded-lg hover:bg-slate-200/70 text-slate-800 transition-colors"
                        >
                          <div
                            onClick={() => onInspectDiff(file)}
                            className="flex items-center gap-1.5 min-w-0 flex-1 cursor-pointer"
                          >
                            <FileIcon
                              name={file.name}
                              type={file.type}
                              className="w-3.5 h-3.5 shrink-0"
                            />
                            <span className="truncate text-xs font-medium">{file.name}</span>
                            <span className="text-[10px] text-slate-400 truncate">
                              {file.path}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                status === "added"
                                  ? "text-emerald-700 bg-emerald-100"
                                  : status === "modified"
                                  ? "text-amber-700 bg-amber-100"
                                  : "text-red-700 bg-red-100"
                              }`}
                            >
                              {status === "added"
                                ? "U"
                                : status === "modified"
                                ? "M"
                                : "D"}
                            </span>

                            <button
                              onClick={() => onDiscardChange(file._id)}
                              title="Discard changes"
                              className="p-0.5 hover:text-red-600 text-slate-400 hidden group-hover:block"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => onStageFile(file._id)}
                              title="Stage change"
                              className="p-0.5 hover:text-blue-600 text-slate-400 hidden group-hover:block"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        /* Commits Timeline History View (Light Theme) */
        <div className="flex-1 flex flex-col overflow-hidden font-sans text-xs">
          {/* Commit Search Bar */}
          <div className="p-2 border-b border-slate-200 bg-white">
            <div className="relative flex items-center">
              <input
                type="text"
                value={commitSearch}
                onChange={(e) => setCommitSearch(e.target.value)}
                placeholder="Search commits..."
                className="w-full pl-7 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:border-blue-500"
              />
              <Search className="w-3 h-3 text-slate-400 absolute left-2" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {filteredCommits.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                <p>No commits found</p>
              </div>
            ) : (
              <div className="relative pl-4 space-y-3 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {filteredCommits.map((commit, idx) => {
                  const shortSha = commit.sha ? commit.sha.slice(0, 7) : "commit";
                  const isHead = idx === 0;

                  return (
                    <div
                      key={commit.sha || commit._id}
                      onClick={() => onSelectCommit(commit)}
                      className="relative group p-2.5 rounded-xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-sm cursor-pointer transition-all space-y-1.5 shadow-2xs"
                    >
                      {/* Node Dot */}
                      <div
                        className={`absolute -left-[19px] top-3.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                          isHead ? "bg-blue-600 ring-2 ring-blue-100" : "bg-slate-400"
                        }`}
                      />

                      {/* Commit Message & Badges */}
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-slate-900 text-xs line-clamp-2">
                          {commit.message}
                        </p>
                        {commit.isGitHubCommit && (
                          <SiGithub
                            className="w-3.5 h-3.5 text-slate-600 shrink-0"
                            title="GitHub Commit"
                          />
                        )}
                      </div>

                      {/* Commit Meta */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                        <div className="flex items-center gap-1.5 truncate max-w-[130px]">
                          {commit.author?.avatarUrl ? (
                            <img
                              src={commit.author.avatarUrl}
                              alt=""
                              className="w-3.5 h-3.5 rounded-full"
                            />
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[9px] font-bold">
                              {commit.author?.name?.charAt(0) || "U"}
                            </div>
                          )}
                          <span className="truncate text-slate-700 font-medium font-sans">
                            {commit.author?.name || "Developer"}
                          </span>
                        </div>

                        <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono text-[10px] font-semibold">
                          {shortSha}
                        </span>
                      </div>

                      {/* Date */}
                      <div className="text-[10px] text-slate-400">
                        {new Date(commit.createdAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
