import React from "react";
import {
  Users,
  UserCheck,
  FileCode,
  GitCommit,
  GitBranch,
  FilePlus,
  Trash2,
  Edit3,
  UserPlus,
  Radio,
} from "lucide-react";
import { useCollaboration } from "../../collaboration/CollaborationProvider";
import { useTheme } from "../../context/ThemeContext";
import { type Collaborator, type CollaborationActivity } from "../../collaboration/types";

interface CollaborationPanelProps {
  projectId?: string;
  onOpenFile?: (fileId: string) => void;
  onOpenInviteModal?: () => void;
}

export const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  onOpenFile,
  onOpenInviteModal,
}) => {
  const { isDark } = useTheme();
  const collab = useCollaboration();
  const {
    status = "disconnected",
    collaborators = [],
    activities = [],
    activeCount = 0,
    currentUserColor = "#3b82f6",
  } = collab || {};

  const renderActivityIcon = (type: string) => {
    switch (type) {
      case "user_joined":
        return <UserCheck className="w-3.5 h-3.5 text-emerald-400" />;
      case "user_left":
        return <Users className="w-3.5 h-3.5 text-neutral-400" />;
      case "file_opened":
        return <FileCode className="w-3.5 h-3.5 text-indigo-400" />;
      case "file_edited":
        return <Edit3 className="w-3.5 h-3.5 text-amber-400" />;
      case "file_created":
        return <FilePlus className="w-3.5 h-3.5 text-blue-400" />;
      case "file_renamed":
        return <Edit3 className="w-3.5 h-3.5 text-teal-400" />;
      case "file_deleted":
        return <Trash2 className="w-3.5 h-3.5 text-rose-400" />;
      case "commit_created":
        return <GitCommit className="w-3.5 h-3.5 text-purple-400" />;
      case "branch_changed":
        return <GitBranch className="w-3.5 h-3.5 text-cyan-400" />;
      default:
        return <FileCode className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  const formatTimestamp = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 5) return "just now";
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div
      className={`h-full flex flex-col font-sans select-none text-xs border-r ${
        isDark
          ? "bg-neutral-900/95 border-neutral-800 text-neutral-200"
          : "bg-white border-neutral-200 text-neutral-800"
      }`}
    >
      {/* Panel Header */}
      <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-500" />
          <span className="font-bold uppercase tracking-wider text-[11px]">Real-Time Collaboration</span>
        </div>

        {/* Status Pill */}
        <div
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
            status === "connected"
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-500"
              : status === "reconnecting"
              ? "bg-amber-500/15 border-amber-500/30 text-amber-500 animate-pulse"
              : "bg-rose-500/15 border-rose-500/30 text-rose-500"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              status === "connected"
                ? "bg-emerald-500"
                : status === "reconnecting"
                ? "bg-amber-500"
                : "bg-rose-500"
            }`}
          />
          <span className="capitalize">{status}</span>
        </div>
      </div>

      {/* Collaborators List Section */}
      <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
            Active Collaborators ({activeCount})
          </span>

          {onOpenInviteModal && (
            <button
              onClick={onOpenInviteModal}
              className="flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-600 font-semibold cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite</span>
            </button>
          )}
        </div>

        {/* Self User */}
        <div
          className={`p-2 rounded-xl border flex items-center justify-between gap-2 ${
            isDark ? "bg-neutral-800/40 border-neutral-800" : "bg-neutral-50 border-neutral-200"
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div
              style={{ backgroundColor: currentUserColor }}
              className="w-6 h-6 rounded-full text-white font-bold text-[10px] flex items-center justify-center uppercase shrink-0 shadow-xs"
            >
              You
            </div>
            <div className="min-w-0">
              <div className="font-semibold truncate text-xs flex items-center gap-1.5">
                <span>You</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Online" />
              </div>
            </div>
          </div>
          <span className="text-[10px] opacity-50 font-mono">Current Session</span>
        </div>

        {/* Remote Collaborators */}
        {collaborators.length === 0 ? (
          <p className="text-[11px] opacity-50 italic py-1">No other collaborators online right now.</p>
        ) : (
          collaborators.map((c: Collaborator, idx: number) => (
            <div
              key={c.socketId ? `${c.userId}-${c.socketId}` : `${c.userId}-${idx}`}
              className={`p-2 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                isDark ? "bg-neutral-800/30 border-neutral-800 hover:bg-neutral-800/50" : "bg-neutral-50 border-neutral-200 hover:bg-neutral-100"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  style={{ backgroundColor: c.color }}
                  className="w-6 h-6 rounded-full text-white font-bold text-[10px] flex items-center justify-center uppercase shrink-0 shadow-xs"
                >
                  {c.name.slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold truncate text-xs flex items-center gap-1.5">
                    <span>{c.name}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Online" />
                  </div>
                  {c.currentFileName && (
                    <button
                      onClick={() => c.currentFileId && onOpenFile?.(c.currentFileId)}
                      className="text-[10px] opacity-70 hover:opacity-100 text-blue-400 hover:underline truncate block text-left cursor-pointer"
                      title="Click to jump to this file"
                    >
                      editing {c.currentFileName}
                      {c.cursor ? ` :${c.cursor.line}` : ""}
                    </button>
                  )}
                </div>
              </div>

              {c.currentFileId && (
                <button
                  onClick={() => onOpenFile?.(c.currentFileId!)}
                  className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  title="View collaborator's open file"
                >
                  <FileCode className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Live Workspace Activity Feed */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Live Activity Feed</span>
          <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {activities.length === 0 ? (
            <p className="text-[11px] opacity-50 italic text-center py-6">No recent activity.</p>
          ) : (
            activities.map((item: CollaborationActivity) => (
              <div
                key={item.id}
                className="flex items-start gap-2.5 text-[11px] leading-relaxed animate-in fade-in duration-100"
              >
                <div className="p-1 rounded-md bg-neutral-100 dark:bg-neutral-800 shrink-0 mt-0.5">
                  {renderActivityIcon(item.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      style={{ color: item.userColor || undefined }}
                      className="font-semibold truncate"
                    >
                      {item.userName}
                    </span>
                    <span className="text-[10px] opacity-40 shrink-0 font-mono">
                      {formatTimestamp(item.timestamp)}
                    </span>
                  </div>
                  <p className="opacity-80 text-[11px] break-words">{item.message}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
