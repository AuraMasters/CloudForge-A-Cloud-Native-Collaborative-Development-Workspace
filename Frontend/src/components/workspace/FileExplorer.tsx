import React, { useState, useMemo, useRef } from "react";
import {
  FilePlus,
  FolderPlus,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Trash2,
  Edit2,
  Search,
  FolderMinus,
  FileCode,
  Upload,
  Download,
  X,
} from "lucide-react";
import { FileIcon } from "./FileIcon";
import { type WorkspaceFile, type FileTreeNode } from "../../types/workspace";

interface FileExplorerProps {
  files: WorkspaceFile[];
  activeFileId: string | null;
  onSelectFile: (file: WorkspaceFile) => void;
  onCreateFile: (name: string, path: string) => Promise<void>;
  onCreateFolder: (name: string, path: string) => Promise<void>;
  onRenameFile: (fileId: string, newName: string) => Promise<void>;
  onDeleteFile: (fileId: string) => Promise<void>;
  onUploadFiles?: (uploaded: { name: string; path: string; content: string }[]) => Promise<void>;
  onDownloadFile?: (file: WorkspaceFile) => void;
  onRefreshFiles: () => Promise<void>;
  projectName: string;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  activeFileId,
  onSelectFile,
  onCreateFile,
  onCreateFolder,
  onRenameFile,
  onDeleteFile,
  onUploadFiles,
  onDownloadFile,
  onRefreshFiles,
  projectName,
}) => {
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(
    new Set()
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [creatingType, setCreatingType] = useState<"file" | "folder" | null>(
    null
  );
  const [creatingParentPath, setCreatingParentPath] = useState<string>("");
  const [newItemName, setNewItemName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileTree = useMemo(() => {
    const root: FileTreeNode[] = [];
    const map: { [path: string]: FileTreeNode } = {};

    const sorted = [...files].sort((a, b) => {
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
      return a.path.localeCompare(b.path);
    });

    sorted.forEach((file) => {
      const node: FileTreeNode = {
        id: file._id,
        name: file.name,
        path: file.path,
        type: file.type,
        file: file,
        children: file.type === "directory" ? [] : undefined,
      };
      map[file.path] = node;
    });

    sorted.forEach((file) => {
      const parts = file.path.split("/").filter(Boolean);
      if (parts.length <= 1) {
        root.push(map[file.path]);
      } else {
        const parentPath = "/" + parts.slice(0, -1).join("/");
        if (map[parentPath] && map[parentPath].children) {
          map[parentPath].children!.push(map[file.path]);
        } else {
          root.push(map[file.path]);
        }
      }
    });

    return root;
  }, [files]);

  const toggleFolder = (path: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const collapseAllFolders = () => {
    const allDirs = new Set(
      files.filter((f) => f.type === "directory").map((f) => f.path)
    );
    setCollapsedFolders(allDirs);
  };

  const handleStartCreate = (
    type: "file" | "folder",
    parentPath: string = ""
  ) => {
    setCreatingType(type);
    setCreatingParentPath(parentPath);
    setNewItemName("");
  };

  const handleFinishCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !creatingType) return;

    const trimmed = newItemName.trim();
    const cleanParent = creatingParentPath.endsWith("/")
      ? creatingParentPath.slice(0, -1)
      : creatingParentPath;
    const finalPath = cleanParent ? `${cleanParent}/${trimmed}` : `/${trimmed}`;

    try {
      if (creatingType === "file") {
        await onCreateFile(trimmed, finalPath);
      } else {
        await onCreateFolder(trimmed, finalPath);
      }
    } finally {
      setCreatingType(null);
      setNewItemName("");
    }
  };

  const handleStartRename = (file: WorkspaceFile) => {
    setRenamingId(file._id);
    setRenameValue(file.name);
  };

  const handleFinishRename = async (fileId: string) => {
    if (renameValue.trim()) {
      await onRenameFile(fileId, renameValue.trim());
    }
    setRenamingId(null);
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await onRefreshFiles();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0 || !onUploadFiles) return;

    const itemsToCreate: { name: string; path: string; content: string }[] = [];

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      const text = await file.text();
      itemsToCreate.push({
        name: file.name,
        path: `/${file.name}`,
        content: text,
      });
    }

    await onUploadFiles(itemsToCreate);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase();
    return files.filter(
      (f) =>
        f.type === "file" &&
        (f.name.toLowerCase().includes(query) ||
          f.path.toLowerCase().includes(query))
    );
  }, [files, searchQuery]);

  const renderNode = (node: FileTreeNode, depth = 0) => {
    if (!node) return null;
    const isFolder = node.type === "directory";
    const isCollapsed = collapsedFolders.has(node.path);
    const isActive = node.file && node.file._id === activeFileId;
    const isRenaming = node.id === renamingId;

    return (
      <div key={node.path} className="select-none">
        <div
          onClick={() => {
            if (isFolder) {
              toggleFolder(node.path);
            } else if (node.file) {
              onSelectFile(node.file);
            }
          }}
          style={{ paddingLeft: `${depth * 14 + 10}px` }}
          className={`group flex items-center justify-between py-1.5 pr-2 rounded-lg text-xs cursor-pointer transition-colors ${
            isActive
              ? "bg-blue-100/70 text-blue-900 font-semibold border-l-2 border-blue-600 shadow-2xs"
              : "text-slate-700 hover:bg-slate-200/60 hover:text-slate-900"
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {isFolder ? (
              <span className="text-slate-400">
                {isCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </span>
            ) : (
              <span className="w-3.5" />
            )}

            <FileIcon
              name={node.name}
              type={node.type}
              isOpen={!isCollapsed}
              className="w-4 h-4 shrink-0"
            />

            {isRenaming ? (
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => handleFinishRename(node.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleFinishRename(node.id);
                  if (e.key === "Escape") setRenamingId(null);
                }}
                autoFocus
                onClick={(e) => e.stopPropagation()}
                className="px-1.5 py-0.5 bg-white border border-blue-500 rounded text-xs text-slate-900 outline-none w-full shadow-xs"
              />
            ) : (
              <span className="truncate">{node.name}</span>
            )}
          </div>

          {!isRenaming && (
            <div
              className="hidden group-hover:flex items-center gap-1 text-slate-500"
              onClick={(e) => e.stopPropagation()}
            >
              {isFolder && (
                <>
                  <button
                    onClick={() => handleStartCreate("file", node.path)}
                    title="New File inside folder"
                    className="p-1 hover:text-slate-900 hover:bg-slate-200 rounded"
                  >
                    <FilePlus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleStartCreate("folder", node.path)}
                    title="New Folder inside folder"
                    className="p-1 hover:text-slate-900 hover:bg-slate-200 rounded"
                  >
                    <FolderPlus className="w-3 h-3" />
                  </button>
                </>
              )}

              {node.file && onDownloadFile && (
                <button
                  onClick={() => onDownloadFile(node.file!)}
                  title="Download File"
                  className="p-1 hover:text-slate-900 hover:bg-slate-200 rounded"
                >
                  <Download className="w-3 h-3" />
                </button>
              )}

              {node.file && (
                <button
                  onClick={() => handleStartRename(node.file!)}
                  title="Rename"
                  className="p-1 hover:text-slate-900 hover:bg-slate-200 rounded"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              )}

              <button
                onClick={() => onDeleteFile(node.id)}
                title="Delete"
                className="p-1 hover:text-red-600 hover:bg-red-50 rounded"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {isFolder && !isCollapsed && (
          <div>
            {creatingType && creatingParentPath === node.path && (
              <form
                onSubmit={handleFinishCreate}
                style={{ paddingLeft: `${(depth + 1) * 14 + 10}px` }}
                className="py-1 pr-2 flex items-center gap-1.5"
              >
                <FileIcon
                  name={newItemName || "untitled"}
                  type={creatingType === "folder" ? "directory" : "file"}
                  className="w-3.5 h-3.5 text-blue-600"
                />
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder={
                    creatingType === "file" ? "filename.tsx" : "folder-name"
                  }
                  autoFocus
                  onBlur={() => setCreatingType(null)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setCreatingType(null);
                  }}
                  className="px-1.5 py-0.5 bg-white border border-blue-500 rounded text-xs text-slate-900 outline-none w-full shadow-xs"
                />
              </form>
            )}

            {node.children &&
              node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-50/70 text-slate-700 select-none overflow-hidden border-r border-slate-200">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />

      <div className="px-3 py-2.5 flex items-center justify-between border-b border-slate-200 bg-white/60">
        <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
          Explorer
        </span>

        <div className="flex items-center gap-1">
          <button
            onClick={() => handleStartCreate("file", "")}
            className="p-1 hover:bg-slate-200/80 text-slate-500 hover:text-slate-900 rounded transition-colors"
            title="New File at root"
          >
            <FilePlus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleStartCreate("folder", "")}
            className="p-1 hover:bg-slate-200/80 text-slate-500 hover:text-slate-900 rounded transition-colors"
            title="New Folder at root"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          {onUploadFiles && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1 hover:bg-slate-200/80 text-slate-500 hover:text-slate-900 rounded transition-colors"
              title="Upload Local Files into Project"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={handleRefresh}
            className="p-1 hover:bg-slate-200/80 text-slate-500 hover:text-slate-900 rounded transition-colors"
            title="Refresh Explorer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`}
            />
          </button>
          <button
            onClick={collapseAllFolders}
            className="p-1 hover:bg-slate-200/80 text-slate-500 hover:text-slate-900 rounded transition-colors"
            title="Collapse All Folders"
          >
            <FolderMinus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="px-3 py-1.5 flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase tracking-wider bg-slate-100/60 border-b border-slate-200">
        <span className="truncate">{projectName}</span>
        <button
          onClick={() => setShowSearch(!showSearch)}
          className={`p-0.5 rounded hover:text-slate-900 ${
            showSearch ? "text-blue-600" : "text-slate-400"
          }`}
          title="Filter files"
        >
          <Search className="w-3 h-3" />
        </button>
      </div>

      {showSearch && (
        <div className="p-2 border-b border-slate-200 bg-white flex items-center gap-1.5">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter files by name..."
            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="p-1 text-slate-400 hover:text-slate-700"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 font-mono text-xs">
        {filteredFiles ? (
          <div>
            <p className="px-2 py-1 text-[11px] text-slate-500">
              {filteredFiles.length} matched files:
            </p>
            {filteredFiles.map((file) => (
              <div
                key={file._id}
                onClick={() => onSelectFile(file)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer ${
                  file._id === activeFileId
                    ? "bg-blue-100 text-blue-900 font-semibold"
                    : "hover:bg-slate-200 text-slate-800"
                }`}
              >
                <FileIcon name={file.name} type={file.type} className="w-4 h-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{file.name}</p>
                  <p className="truncate text-[10px] text-slate-500">{file.path}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            {creatingType && creatingParentPath === "" && (
              <form
                onSubmit={handleFinishCreate}
                className="px-2 py-1 flex items-center gap-1.5"
              >
                <FileIcon
                  name={newItemName || "untitled"}
                  type={creatingType === "folder" ? "directory" : "file"}
                  className="w-4 h-4 text-blue-600"
                />
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder={
                    creatingType === "file" ? "filename.tsx" : "folder-name"
                  }
                  autoFocus
                  onBlur={() => setCreatingType(null)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setCreatingType(null);
                  }}
                  className="px-1.5 py-0.5 bg-white border border-blue-500 rounded text-xs text-slate-900 outline-none w-full shadow-xs"
                />
              </form>
            )}

            {fileTree.map((node) => renderNode(node, 0))}

            {fileTree.length === 0 && !creatingType && (
              <div className="py-8 text-center text-slate-500 text-xs">
                <FileCode className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                <p>No files in workspace</p>
                <button
                  onClick={() => handleStartCreate("file", "")}
                  className="mt-2 text-blue-600 hover:underline font-semibold"
                >
                  + Create first file
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
