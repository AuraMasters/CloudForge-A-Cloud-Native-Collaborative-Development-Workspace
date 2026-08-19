import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import JSZip from "jszip";
import API_URL from "../config/api";
import { useAlert } from "../hooks/useAlert";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { type Project } from "../types/project";
import {
  type WorkspaceFile,
  type GitCommit,
  type EditorTab,
  type ActivityBarTab,
} from "../types/workspace";

import { WorkspaceNavbar } from "../components/workspace/WorkspaceNavbar";
import { ActivityBar } from "../components/workspace/ActivityBar";
import { FileExplorer } from "../components/workspace/FileExplorer";
import { SourceControlPanel } from "../components/workspace/SourceControlPanel";
import { SearchPanel } from "../components/workspace/SearchPanel";
import { ProjectSettingsPanel } from "../components/workspace/ProjectSettingsPanel";
import { CodeEditor } from "../components/workspace/CodeEditor";
import { DiffViewer } from "../components/workspace/DiffViewer";
import { BottomPanel } from "../components/workspace/BottomPanel";
import { StatusBar } from "../components/workspace/StatusBar";
import { GitHubRemoteModal } from "../components/workspace/GitHubRemoteModal";
import { CommitDetailsModal } from "../components/workspace/CommitDetailsModal";

export default function ProjectView() {
  const { id } = useParams<{ id: string }>();
  const { showError, showSuccess } = useAlert();

  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string>("main");
  const [branches, setBranches] = useState<string[]>(["main"]);
  const [loading, setLoading] = useState(true);

  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [activeActivityTab, setActiveActivityTab] =
    useState<ActivityBarTab>("explorer");
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [changedFiles, setChangedFiles] = useState<
    {
      file: WorkspaceFile;
      status: "modified" | "added" | "deleted";
      staged: boolean;
    }[]
  >([]);

  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);
  const [selectedCommit, setSelectedCommit] = useState<GitCommit | null>(null);
  const [diffTarget, setDiffTarget] = useState<{
    filename: string;
    filepath: string;
    originalContent?: string;
    modifiedContent?: string;
    fileId?: string;
  } | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);

  const loadWorkspace = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`${API_URL}/api/projects/${id}/workspace`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to load workspace");
      }

      setProject(data.project);
      setFiles(data.files || []);
      setCommits(data.commits || []);
      setCurrentBranch(data.currentBranch || data.project?.currentBranch || "main");
      setBranches(data.branches || data.project?.branches || ["main"]);
    } catch (err: any) {
      showError(err.message || "Failed to initialize workspace");
    } finally {
      setLoading(false);
    }
  }, [id, showError]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    if (files.length > 0 && tabs.length === 0) {
      const firstCodeFile = files.find(
        (f) =>
          f.type === "file" &&
          (f.name.endsWith(".tsx") ||
            f.name.endsWith(".ts") ||
            f.name.endsWith(".jsx") ||
            f.name.endsWith(".js") ||
            f.name.endsWith(".py") ||
            f.name.endsWith(".html") ||
            f.name.endsWith(".json") ||
            f.name.endsWith(".md"))
      );

      const target = firstCodeFile || files.find((f) => f.type === "file");
      if (target) {
        handleSelectFile(target);
      }
    }
  }, [files]);

  const handleSelectFile = (file: WorkspaceFile) => {
    if (file.type === "directory") return;

    setDiffTarget(null);

    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsMobileSidebarOpen(false);
    }

    const existingTab = tabs.find((t) => t.fileId === file._id);
    if (existingTab) {
      setActiveTabId(file._id);
    } else {
      const newTab: EditorTab = {
        fileId: file._id,
        name: file.name,
        path: file.path,
        language: file.language || "code",
        content: file.content || "",
        initialContent: file.content || "",
        isDirty: false,
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(file._id);
    }
  };

  const handleCloseTab = (fileId: string) => {
    setTabs((prev) => {
      const nextTabs = prev.filter((t) => t.fileId !== fileId);
      if (activeTabId === fileId) {
        setActiveTabId(
          nextTabs.length > 0 ? nextTabs[nextTabs.length - 1].fileId : null
        );
      }
      return nextTabs;
    });
  };

  const handleContentChange = (fileId: string, newContent: string) => {
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.fileId === fileId) {
          const isDirty = newContent !== tab.initialContent;
          return {
            ...tab,
            content: newContent,
            isDirty,
          };
        }
        return tab;
      })
    );

    const targetFile = files.find((f) => f._id === fileId);
    if (targetFile) {
      setChangedFiles((prev) => {
        const existing = prev.find((c) => c.file._id === fileId);
        const originalContent =
          tabs.find((t) => t.fileId === fileId)?.initialContent ??
          targetFile.content;
        const hasChanged = newContent !== originalContent;

        if (!hasChanged) {
          return prev.filter((c) => c.file._id !== fileId);
        }

        if (existing) {
          return prev.map((c) =>
            c.file._id === fileId
              ? {
                  ...c,
                  file: { ...c.file, content: newContent },
                  status: "modified",
                }
              : c
          );
        } else {
          return [
            ...prev,
            {
              file: { ...targetFile, content: newContent },
              status: "modified",
              staged: false,
            },
          ];
        }
      });
    }
  };

  const handleSaveFile = async (fileId: string) => {
    const tab = tabs.find((t) => t.fileId === fileId);
    if (!tab) return;

    try {
      setIsSaving(true);
      const res = await fetch(
        `${API_URL}/api/projects/${id}/files/${fileId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ content: tab.content }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to save file");
      }

      setTabs((prev) =>
        prev.map((t) =>
          t.fileId === fileId
            ? { ...t, initialContent: tab.content, isDirty: false }
            : t
        )
      );

      setFiles((prev) =>
        prev.map((f) => (f._id === fileId ? { ...f, content: tab.content } : f))
      );

      showSuccess(`Saved ${tab.name}`);
    } catch (err: any) {
      showError(err.message || "Failed to save file");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateFile = async (name: string, path: string) => {
    try {
      const res = await fetch(`${API_URL}/api/projects/${id}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          path,
          type: "file",
          content: "",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to create file");
      }

      const newFile = data.file;
      setFiles((prev) => [...prev, newFile]);

      setChangedFiles((prev) => [
        ...prev,
        {
          file: newFile,
          status: "added",
          staged: true,
        },
      ]);

      handleSelectFile(newFile);
      showSuccess(`Created file ${name}`);
    } catch (err: any) {
      showError(err.message || "Failed to create file");
    }
  };

  const handleCreateFolder = async (name: string, path: string) => {
    try {
      const res = await fetch(`${API_URL}/api/projects/${id}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          path,
          type: "directory",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to create directory");
      }

      setFiles((prev) => [...prev, data.file]);
      showSuccess(`Created folder ${name}`);
    } catch (err: any) {
      showError(err.message || "Failed to create directory");
    }
  };

  const handleUploadFiles = async (
    uploaded: { name: string; path: string; content: string }[]
  ) => {
    try {
      for (const item of uploaded) {
        const res = await fetch(`${API_URL}/api/projects/${id}/files`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: item.name,
            path: item.path,
            type: "file",
            content: item.content,
          }),
        });
        const data = await res.json();
        if (res.ok && data.file) {
          setFiles((prev) => [...prev, data.file]);
        }
      }
      showSuccess(`Uploaded ${uploaded.length} files into workspace`);
    } catch (err: any) {
      showError(err.message || "Failed to upload files");
    }
  };

  const handleDownloadFile = (file: WorkspaceFile) => {
    const blob = new Blob([file.content || ""], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadZip = async () => {
    if (!project || files.length === 0) return;

    try {
      const zip = new JSZip();

      files.forEach((f) => {
        if (f.type === "file") {
          const cleanPath = f.path.startsWith("/") ? f.path.slice(1) : f.path;
          zip.file(cleanPath, f.content || "");
        }
      });

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const cleanProjectName = project.name.toLowerCase().replace(/\s+/g, "-");
      link.href = url;
      link.download = `${cleanProjectName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showSuccess(`Exported ${project.name} as ZIP archive`);
    } catch (err: any) {
      showError(err.message || "Failed to export ZIP");
    }
  };

  const handleRenameFile = async (fileId: string, newName: string) => {
    try {
      const res = await fetch(
        `${API_URL}/api/projects/${id}/files/${fileId}/rename`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ newName }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to rename file");
      }

      setFiles((prev) =>
        prev.map((f) =>
          f._id === fileId
            ? { ...f, name: data.file.name, path: data.file.path }
            : f
        )
      );

      setTabs((prev) =>
        prev.map((t) =>
          t.fileId === fileId
            ? { ...t, name: data.file.name, path: data.file.path }
            : t
        )
      );

      showSuccess(`Renamed to ${newName}`);
    } catch (err: any) {
      showError(err.message || "Failed to rename file");
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    const file = files.find((f) => f._id === fileId);
    if (!file) return;

    if (!window.confirm(`Delete ${file.name}?`)) return;

    try {
      const res = await fetch(
        `${API_URL}/api/projects/${id}/files/${fileId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to delete");
      }

      setFiles((prev) => prev.filter((f) => f._id !== fileId));
      handleCloseTab(fileId);
      setChangedFiles((prev) => prev.filter((c) => c.file._id !== fileId));

      showSuccess(`Deleted ${file.name}`);
    } catch (err: any) {
      showError(err.message || "Failed to delete");
    }
  };

  const handleStageFile = (fileId: string) => {
    setChangedFiles((prev) =>
      prev.map((c) => (c.file._id === fileId ? { ...c, staged: true } : c))
    );
  };

  const handleUnstageFile = (fileId: string) => {
    setChangedFiles((prev) =>
      prev.map((c) => (c.file._id === fileId ? { ...c, staged: false } : c))
    );
  };

  const handleStageAll = () => {
    setChangedFiles((prev) => prev.map((c) => ({ ...c, staged: true })));
  };

  const handleUnstageAll = () => {
    setChangedFiles((prev) => prev.map((c) => ({ ...c, staged: false })));
  };

  const handleDiscardChange = (fileId: string) => {
    const orig = files.find((f) => f._id === fileId);
    if (!orig) return;

    setTabs((prev) =>
      prev.map((t) =>
        t.fileId === fileId
          ? { ...t, content: orig.content, isDirty: false }
          : t
      )
    );

    setChangedFiles((prev) => prev.filter((c) => c.file._id !== fileId));
    showSuccess(`Discarded changes in ${orig.name}`);
  };

  const handleDiscardAllChanges = () => {
    if (!window.confirm("Discard all uncommitted changes across the workspace?")) {
      return;
    }

    setTabs((prev) =>
      prev.map((t) => {
        const orig = files.find((f) => f._id === t.fileId);
        return {
          ...t,
          content: orig?.content || t.initialContent,
          isDirty: false,
        };
      })
    );

    setChangedFiles([]);
    showSuccess("Workspace reverted to clean working tree");
  };

  const handleInspectDiff = (file: WorkspaceFile) => {
    const tab = tabs.find((t) => t.fileId === file._id);
    const modifiedContent = tab ? tab.content : file.content;
    const orig = files.find((f) => f._id === file._id);

    setDiffTarget({
      filename: file.name,
      filepath: file.path,
      originalContent: orig?.content || "",
      modifiedContent: modifiedContent || "",
      fileId: file._id,
    });
  };

  const handleCommit = async (message: string, stagedOnly: boolean) => {
    if (!message.trim()) return;

    const filesToCommit = stagedOnly
      ? changedFiles.filter((c) => c.staged)
      : changedFiles;

    if (filesToCommit.length === 0) {
      showError("No changes to commit");
      return;
    }

    try {
      const changesPayload = filesToCommit.map((c) => ({
        path: c.file.path,
        status: c.status,
        content: c.file.content,
      }));

      const res = await fetch(
        `${API_URL}/api/projects/${id}/git/commit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            message,
            branch: currentBranch,
            changes: changesPayload,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to commit");
      }

      setCommits((prev) => [data.commit, ...prev]);

      const committedIds = new Set(filesToCommit.map((c) => c.file._id));

      setChangedFiles((prev) =>
        prev.filter((c) => !committedIds.has(c.file._id))
      );

      setTabs((prev) =>
        prev.map((t) =>
          committedIds.has(t.fileId)
            ? { ...t, initialContent: t.content, isDirty: false }
            : t
        )
      );

      showSuccess(`Created commit "${message}"`);
    } catch (err: any) {
      showError(err.message || "Failed to create commit");
    }
  };

  const handleSwitchBranch = async (branchName: string, createNew = false) => {
    try {
      const res = await fetch(
        `${API_URL}/api/projects/${id}/git/branches`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ branchName, createNew }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to switch branch");
      }

      setCurrentBranch(data.currentBranch);
      setBranches(data.branches);
      showSuccess(`Switched to branch "${data.currentBranch}"`);
    } catch (err: any) {
      showError(err.message || "Failed to switch branch");
    }
  };

  const handleLinkRepo = async (repoUrl: string) => {
    const res = await fetch(
      `${API_URL}/api/projects/${id}/git/link-github`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ repoUrl }),
      }
    );

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to link GitHub repo");
    }

    setProject(data.project);
    loadWorkspace();
  };

  const handlePublishRepo = async (
    name: string,
    description: string,
    isPrivate: boolean
  ) => {
    const res = await fetch(
      `${API_URL}/api/projects/${id}/git/publish-github`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, description, isPrivate }),
      }
    );

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to publish GitHub repo");
    }

    setProject(data.project);
    loadWorkspace();
  };

  const handleSyncGitHub = async () => {
    try {
      setIsSyncing(true);
      const res = await fetch(
        `${API_URL}/api/projects/${id}/git/sync`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ branch: currentBranch }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to sync with GitHub");
      }

      showSuccess(data.message || "Synced with GitHub remote repository");
      if (data.files) setFiles(data.files);
      if (data.commits) setCommits(data.commits);
      loadWorkspace();
    } catch (err: any) {
      showError(err.message || "Failed to sync with GitHub");
    } finally {
      setIsSyncing(false);
    }
  };

  const isAnyTabDirty = tabs.some((t) => t.isDirty);
  const activeTab = tabs.find((t) => t.fileId === activeTabId);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner text="Initializing CloudForge workspace..." fullScreen />
      </div>
    );
  }

  if (!project) return null;

  const isGitHubConnected = Boolean(
    project.source?.type === "github" || project.gitRemote?.connected
  );

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 text-slate-900 overflow-hidden font-sans select-none relative">
      <WorkspaceNavbar
        project={project}
        isDirty={isAnyTabDirty || changedFiles.length > 0}
        isSaving={isSaving}
        filesCount={files.filter((f) => f.type === "file").length}
        commitsCount={commits.length}
        onOpenGitHubModal={() => setIsGitHubModalOpen(true)}
        onSyncGitHub={handleSyncGitHub}
        onDownloadZip={handleDownloadZip}
        isSyncing={isSyncing}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        isMobileSidebarOpen={isMobileSidebarOpen}
      />

      <div className="flex-1 flex overflow-hidden relative">
        {isMobileSidebarOpen && (
          <div
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-30 md:hidden animate-in fade-in"
          />
        )}

        <div
          className={`fixed md:relative top-13 sm:top-14 md:top-0 bottom-6 md:bottom-0 left-0 z-40 md:z-auto flex h-[calc(100vh-theme(spacing.13)-theme(spacing.6))] sm:h-[calc(100vh-theme(spacing.14)-theme(spacing.6))] md:h-full bg-white shadow-2xl md:shadow-none transition-transform duration-200 ease-in-out shrink-0 ${
            isMobileSidebarOpen
              ? "translate-x-0"
              : "-translate-x-full md:translate-x-0"
          }`}
        >
          <ActivityBar
            activeTab={activeActivityTab}
            onChangeTab={(tab) => {
              if (tab === "github") {
                setIsGitHubModalOpen(true);
              } else {
                setActiveActivityTab(tab);
              }
            }}
            changedFilesCount={changedFiles.length}
            isGitHubConnected={isGitHubConnected}
          />

          <div className="w-64 sm:w-72 md:w-80 h-full border-r border-slate-200 bg-slate-50/70 shrink-0 overflow-hidden flex flex-col">
            {activeActivityTab === "explorer" && (
              <FileExplorer
                files={files}
                activeFileId={activeTabId}
                onSelectFile={handleSelectFile}
                onCreateFile={handleCreateFile}
                onCreateFolder={handleCreateFolder}
                onRenameFile={handleRenameFile}
                onDeleteFile={handleDeleteFile}
                onUploadFiles={handleUploadFiles}
                onDownloadFile={handleDownloadFile}
                onRefreshFiles={loadWorkspace}
                projectName={project.name}
              />
            )}

            {activeActivityTab === "sourceControl" && (
              <SourceControlPanel
                project={project}
                changedFiles={changedFiles}
                commits={commits}
                currentBranch={currentBranch}
                branches={branches}
                onCommit={handleCommit}
                onStageFile={handleStageFile}
                onUnstageFile={handleUnstageFile}
                onStageAll={handleStageAll}
                onUnstageAll={handleUnstageAll}
                onDiscardChange={handleDiscardChange}
                onDiscardAllChanges={handleDiscardAllChanges}
                onSelectCommit={(commit) => setSelectedCommit(commit)}
                onInspectDiff={handleInspectDiff}
                onSwitchBranch={handleSwitchBranch}
                onOpenGitHubModal={() => setIsGitHubModalOpen(true)}
                onSyncGitHub={handleSyncGitHub}
                isSyncing={isSyncing}
              />
            )}

            {activeActivityTab === "search" && (
              <SearchPanel
                files={files}
                onSelectMatch={(file) => handleSelectFile(file)}
              />
            )}

            {activeActivityTab === "settings" && (
              <ProjectSettingsPanel
                project={project}
                filesCount={files.filter((f) => f.type === "file").length}
                commitsCount={commits.length}
                onUpdateProject={(updated) => setProject(updated)}
                onResetTemplate={(updatedProj, newFiles, newCommits) => {
                  setProject(updatedProj);
                  setFiles(newFiles);
                  setCommits(newCommits);
                  setTabs([]);
                  setActiveTabId(null);
                  setChangedFiles([]);
                  setDiffTarget(null);
                }}
                onOpenGitHubModal={() => setIsGitHubModalOpen(true)}
              />
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white min-w-0">
          <div className="flex-1 overflow-hidden">
            {diffTarget ? (
              <DiffViewer
                filename={diffTarget.filename}
                filepath={diffTarget.filepath}
                originalContent={diffTarget.originalContent}
                modifiedContent={diffTarget.modifiedContent}
                onClose={() => setDiffTarget(null)}
                onStageChange={
                  diffTarget.fileId
                    ? () => handleStageFile(diffTarget.fileId!)
                    : undefined
                }
              />
            ) : (
              <CodeEditor
                tabs={tabs}
                activeTabId={activeTabId}
                onSelectTab={(fileId) => setActiveTabId(fileId)}
                onCloseTab={handleCloseTab}
                onContentChange={handleContentChange}
                onSaveFile={handleSaveFile}
                projectName={project.name}
              />
            )}
          </div>

          <BottomPanel
            isOpen={isBottomPanelOpen}
            onClose={() => setIsBottomPanelOpen(false)}
            currentBranch={currentBranch}
            projectName={project.name}
            recentCommits={commits}
          />
        </div>
      </div>

      <StatusBar
        currentBranch={currentBranch}
        isGitHubConnected={isGitHubConnected}
        changedFilesCount={changedFiles.length}
        activeLanguage={activeTab?.language || "Plain Text"}
        isBottomPanelOpen={isBottomPanelOpen}
        onToggleBottomPanel={() => setIsBottomPanelOpen(!isBottomPanelOpen)}
        onOpenSourceControl={() => {
          setActiveActivityTab("sourceControl");
          if (typeof window !== "undefined" && window.innerWidth < 768) {
            setIsMobileSidebarOpen(true);
          }
        }}
        onSyncGitHub={handleSyncGitHub}
        isSyncing={isSyncing}
      />

      <GitHubRemoteModal
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
        project={project}
        onLinkRepo={handleLinkRepo}
        onPublishRepo={handlePublishRepo}
      />

      <CommitDetailsModal
        commit={selectedCommit}
        onClose={() => setSelectedCommit(null)}
        repoUrl={project.source?.github?.url || project.gitRemote?.url}
      />
    </div>
  );
}