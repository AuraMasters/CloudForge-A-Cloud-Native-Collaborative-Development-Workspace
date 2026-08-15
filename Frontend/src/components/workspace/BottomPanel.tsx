import React, { useState, useRef, useEffect } from "react";
import {
  Terminal as TerminalIcon,
  GitBranch,
  AlertCircle,
  X,
  Maximize2,
  Minimize2,
  Trash2,
} from "lucide-react";
import { type BottomPanelTab, type GitCommit } from "../../types/workspace";

interface BottomPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentBranch: string;
  projectName: string;
  recentCommits: GitCommit[];
}

export const BottomPanel: React.FC<BottomPanelProps> = ({
  isOpen,
  onClose,
  currentBranch,
  projectName,
  recentCommits,
}) => {
  const [activeTab, setActiveTab] = useState<BottomPanelTab>("terminal");
  const [isExpanded, setIsExpanded] = useState(false);
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalHistory, setTerminalHistory] = useState<string[]>([
    "CloudForge Containerized Workspace Shell v1.0.0",
    `Workspace root: /workspace/${projectName.toLowerCase().replace(/\s+/g, "-")}`,
    `Branch: ${currentBranch}`,
    "Type 'help' for available commands.",
    "",
  ]);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === "terminal") {
      terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [terminalHistory, activeTab]);

  if (!isOpen) return null;

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = terminalInput.trim();
    if (!cmd) return;

    const newHistory = [...terminalHistory, `$ ${cmd}`];

    if (cmd === "clear") {
      setTerminalHistory([]);
      setTerminalInput("");
      return;
    } else if (cmd === "help") {
      newHistory.push(
        "Available commands:",
        "  git status        - View working tree status",
        "  git log           - View recent commit logs",
        "  git branch        - List active branches",
        "  npm run build     - Run project build",
        "  ls                - List files",
        "  clear             - Clear terminal screen"
      );
    } else if (cmd === "git status") {
      newHistory.push(
        `On branch ${currentBranch}`,
        "Your branch is up to date with 'origin/" + currentBranch + "'.",
        "nothing to commit, working tree clean"
      );
    } else if (cmd === "git log") {
      recentCommits.slice(0, 5).forEach((c) => {
        newHistory.push(
          `commit ${c.sha || "1234567"} (HEAD -> ${c.branch || currentBranch})`,
          `Author: ${c.author?.name || "Developer"} <${c.author?.email || "dev@cloudforge.io"}>`,
          `Date:   ${new Date(c.createdAt).toUTCString()}`,
          `    ${c.message}`,
          ""
        );
      });
    } else if (cmd === "git branch") {
      newHistory.push(`* ${currentBranch}`);
    } else if (cmd === "ls") {
      newHistory.push("src/  public/  package.json  README.md  tsconfig.json");
    } else if (cmd.startsWith("npm")) {
      newHistory.push(
        "> cloudforge-workspace@1.0.0 " + cmd.replace("npm ", ""),
        "✓ Build finished in 240ms."
      );
    } else {
      newHistory.push(`cloudforge: command not found: ${cmd}`);
    }

    newHistory.push("");
    setTerminalHistory(newHistory);
    setTerminalInput("");
  };

  return (
    <div
      className={`bg-white border-t border-slate-200 flex flex-col font-mono text-xs select-none transition-all shadow-lg ${
        isExpanded ? "h-80" : "h-52"
      }`}
    >
      {/* Panel Tab Header */}
      <div className="h-9 px-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab("terminal")}
            className={`px-3 py-1 rounded-md text-xs flex items-center gap-1.5 font-sans font-semibold transition-colors ${
              activeTab === "terminal"
                ? "bg-white text-blue-700 shadow-2xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <TerminalIcon className="w-3.5 h-3.5" />
            <span>Terminal</span>
          </button>

          <button
            onClick={() => setActiveTab("git")}
            className={`px-3 py-1 rounded-md text-xs flex items-center gap-1.5 font-sans font-semibold transition-colors ${
              activeTab === "git"
                ? "bg-white text-blue-700 shadow-2xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Git Output</span>
          </button>

          <button
            onClick={() => setActiveTab("problems")}
            className={`px-3 py-1 rounded-md text-xs flex items-center gap-1.5 font-sans font-semibold transition-colors ${
              activeTab === "problems"
                ? "bg-white text-blue-700 shadow-2xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Problems (0)</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setTerminalHistory([])}
            className="p-1 rounded-md hover:bg-slate-200 text-slate-500 hover:text-slate-900"
            title="Clear Output"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-md hover:bg-slate-200 text-slate-500 hover:text-slate-900"
            title={isExpanded ? "Minimize" : "Maximize"}
          >
            {isExpanded ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-slate-200 text-slate-500 hover:text-slate-900"
            title="Close Panel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Panel Body */}
      <div className="flex-1 overflow-y-auto p-3 text-slate-800 space-y-1 bg-white">
        {activeTab === "terminal" ? (
          <div className="bg-slate-950 text-slate-200 p-3 rounded-lg font-mono text-xs overflow-auto h-full space-y-1 shadow-inner">
            {terminalHistory.map((line, idx) => (
              <div key={idx} className="leading-relaxed whitespace-pre-wrap">
                {line.startsWith("$") ? (
                  <span className="text-emerald-400 font-bold">{line}</span>
                ) : (
                  <span className="text-slate-300">{line}</span>
                )}
              </div>
            ))}

            {/* Interactive Terminal Line Input */}
            <form onSubmit={handleCommand} className="flex items-center gap-2 mt-1">
              <span className="text-emerald-400 font-bold shrink-0">$</span>
              <input
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                placeholder="type a command (e.g. git status, help)..."
                className="flex-1 bg-transparent outline-none text-slate-100 font-mono text-xs border-none"
              />
            </form>
            <div ref={terminalEndRef} />
          </div>
        ) : activeTab === "git" ? (
          <div className="space-y-2 text-xs">
            <p className="text-slate-500">// Git Operational Log</p>
            {recentCommits.map((c) => (
              <div
                key={c.sha || c._id}
                className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between"
              >
                <div>
                  <span className="text-blue-700 font-mono font-bold">
                    {c.sha?.slice(0, 7) || "commit"}
                  </span>
                  <span className="text-slate-800 ml-2 font-medium">{c.message}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(c.createdAt).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400">
            <p>No issues detected in workspace files.</p>
          </div>
        )}
      </div>
    </div>
  );
};
