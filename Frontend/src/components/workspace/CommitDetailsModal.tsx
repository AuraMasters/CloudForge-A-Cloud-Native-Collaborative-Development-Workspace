import React from "react";
import {
  GitCommit as GitCommitIcon,
  GitBranch,
  Calendar,
  FileCode,
  ExternalLink,
} from "lucide-react";
import { SiGithub } from "react-icons/si";
import { FileIcon } from "./FileIcon";
import { type GitCommit } from "../../types/workspace";

interface CommitDetailsModalProps {
  commit: GitCommit | null;
  onClose: () => void;
  repoUrl?: string;
}

export const CommitDetailsModal: React.FC<CommitDetailsModalProps> = ({
  commit,
  onClose,
  repoUrl,
}) => {
  if (!commit) return null;

  const totalAdditions =
    commit.stats?.additions ??
    commit.changes?.reduce((sum, c) => sum + (c.additions || 0), 0) ??
    0;
  const totalDeletions =
    commit.stats?.deletions ??
    commit.changes?.reduce((sum, c) => sum + (c.deletions || 0), 0) ??
    0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-3xl max-h-[85vh] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-900">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <GitCommitIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-900 break-words">
                {commit.message}
              </h2>
              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500 font-mono">
                <span className="px-2 py-0.5 rounded bg-slate-100 text-blue-700 font-bold">
                  {commit.sha?.slice(0, 8) || "commit"}
                </span>
                <span className="flex items-center gap-1 text-slate-700">
                  <GitBranch className="w-3.5 h-3.5 text-blue-600" />
                  {commit.branch || "main"}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(commit.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Author & Stats bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            {commit.author?.avatarUrl ? (
              <img
                src={commit.author.avatarUrl}
                alt=""
                className="w-5 h-5 rounded-full"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">
                {commit.author?.name?.charAt(0) || "U"}
              </div>
            )}
            <span className="font-semibold text-slate-800">
              {commit.author?.name || "Developer"}
            </span>
            {commit.author?.email && (
              <span className="text-slate-500 hidden sm:inline">
                &lt;{commit.author.email}&gt;
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-600">
              {commit.changes?.length || 0} files changed
            </span>
            <span className="text-emerald-700 font-bold">+{totalAdditions}</span>
            <span className="text-red-700 font-bold">-{totalDeletions}</span>

            {repoUrl && commit.sha && (
              <a
                href={`${repoUrl}/commit/${commit.sha}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center gap-1"
                title="View on GitHub"
              >
                <SiGithub className="w-3.5 h-3.5" />
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Changes and Patches */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 font-mono text-xs bg-slate-50/50">
          {commit.changes && commit.changes.length > 0 ? (
            commit.changes.map((change, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs"
              >
                {/* File change header */}
                <div className="px-4 py-2 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileIcon
                      name={change.path.split("/").pop() || ""}
                      type="file"
                      className="w-4 h-4 shrink-0"
                    />
                    <span className="font-semibold text-slate-800">
                      {change.path}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                        change.status === "added"
                          ? "bg-emerald-100 text-emerald-800"
                          : change.status === "modified"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {change.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-emerald-700 font-bold">+{change.additions}</span>
                    <span className="text-red-700 font-bold">-{change.deletions}</span>
                  </div>
                </div>

                {/* Diff patch view */}
                {change.patch ? (
                  <div className="p-3 overflow-x-auto text-[11px] leading-5 space-y-0.5 max-h-60 overflow-y-auto bg-white">
                    {change.patch.split("\n").map((line, lIdx) => {
                      const isAdd = line.startsWith("+");
                      const isDel = line.startsWith("-");
                      const isHeader = line.startsWith("@@");

                      return (
                        <div
                          key={lIdx}
                          className={`px-2 py-0.5 rounded whitespace-pre ${
                            isAdd
                              ? "bg-emerald-50 text-emerald-800 border-l-2 border-emerald-500"
                              : isDel
                              ? "bg-red-50 text-red-800 border-l-2 border-red-500"
                              : isHeader
                              ? "bg-blue-50 text-blue-800 font-bold"
                              : "text-slate-600"
                          }`}
                        >
                          {line}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 text-slate-400 text-center italic">
                    Binary or file contents not displayed in patch
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-slate-400">
              <FileCode className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
              <p>No file changes recorded in this commit</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 flex justify-end bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
