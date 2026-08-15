import React from "react";
import {
  GitBranch,
  RefreshCw,
  Terminal,
  Cloud,
} from "lucide-react";

interface StatusBarProps {
  currentBranch: string;
  isGitHubConnected: boolean;
  changedFilesCount: number;
  activeLanguage?: string;
  cursorPos?: { line: number; col: number };
  isBottomPanelOpen: boolean;
  onToggleBottomPanel: () => void;
  onOpenSourceControl: () => void;
  onSyncGitHub?: () => void;
  isSyncing?: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  currentBranch,
  isGitHubConnected,
  changedFilesCount,
  activeLanguage = "TypeScript",
  cursorPos = { line: 1, col: 1 },
  isBottomPanelOpen,
  onToggleBottomPanel,
  onOpenSourceControl,
  onSyncGitHub,
  isSyncing = false,
}) => {
  return (
    <footer className="h-6 bg-slate-100 border-t border-slate-200 text-slate-600 flex items-center justify-between px-3 text-[11px] font-mono select-none shrink-0 z-10">
      {/* Left side items */}
      <div className="flex items-center gap-3">
        {/* Branch / Git */}
        <button
          onClick={onOpenSourceControl}
          className="flex items-center gap-1.5 hover:bg-slate-200 px-1.5 py-0.5 rounded transition-colors text-slate-800 font-semibold"
          title="Switch Branch / View Source Control"
        >
          <GitBranch className="w-3 h-3 text-blue-600" />
          <span>{currentBranch}</span>
        </button>

        {/* Sync with GitHub Remote */}
        {isGitHubConnected ? (
          <button
            onClick={onSyncGitHub}
            disabled={isSyncing}
            className="flex items-center gap-1 hover:bg-slate-200 px-1.5 py-0.5 rounded transition-colors text-slate-700"
            title="Sync with GitHub Remote"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin text-blue-600" : ""}`} />
            <span className="hidden sm:inline">0↓ 0↑</span>
          </button>
        ) : null}

        {/* Changes pill */}
        {changedFilesCount > 0 && (
          <button
            onClick={onOpenSourceControl}
            className="flex items-center gap-1 bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded text-[10px] font-bold"
          >
            <span>{changedFilesCount} pending changes</span>
          </button>
        )}

        {/* Terminal panel toggle */}
        <button
          onClick={onToggleBottomPanel}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-200 transition-colors ${
            isBottomPanelOpen ? "bg-slate-200 text-slate-900 font-bold" : "text-slate-600"
          }`}
          title="Toggle Terminal & Output Panel"
        >
          <Terminal className="w-3 h-3" />
          <span className="hidden md:inline">Terminal</span>
        </button>
      </div>

      {/* Right side items */}
      <div className="flex items-center gap-3">
        <span className="hidden sm:inline text-slate-500">
          Ln {cursorPos.line}, Col {cursorPos.col}
        </span>
        <span className="hidden md:inline text-slate-500">UTF-8</span>
        <span className="hidden sm:inline text-slate-500">Spaces: 2</span>
        <span className="font-semibold text-slate-700">{activeLanguage}</span>

        <div
          className="flex items-center gap-1 text-emerald-600 font-bold"
          title="CloudForge Cloud Workspace Engine: Connected"
        >
          <Cloud className="w-3 h-3" />
          <span className="hidden lg:inline">CloudForge Ready</span>
        </div>
      </div>
    </footer>
  );
};
