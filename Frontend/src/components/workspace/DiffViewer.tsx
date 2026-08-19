import React, { useState, useMemo } from "react";
import { X, Columns, Rows, Check } from "lucide-react";
import { FileIcon } from "./FileIcon";

interface DiffViewerProps {
  filename: string;
  filepath: string;
  originalContent?: string;
  modifiedContent?: string;
  patch?: string;
  onClose: () => void;
  onStageChange?: () => void;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  filename,
  filepath,
  originalContent = "",
  modifiedContent = "",
  patch,
  onClose,
  onStageChange,
}) => {
  const [viewType, setViewType] = useState<"unified" | "split">("unified");

  const diffLines = useMemo(() => {
    if (patch) {
      return patch.split("\n").map((line, idx) => {
        let type: "header" | "add" | "del" | "same" = "same";
        if (line.startsWith("@@")) type = "header";
        else if (line.startsWith("+")) type = "add";
        else if (line.startsWith("-")) type = "del";
        return { line, type, key: idx };
      });
    }

    const oldLines = originalContent.split("\n");
    const newLines = modifiedContent.split("\n");
    const result: { line: string; type: "header" | "add" | "del" | "same"; key: number }[] = [];

    const maxLen = Math.max(oldLines.length, newLines.length);
    for (let i = 0; i < maxLen; i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];

      if (oldLine === newLine) {
        result.push({ line: `  ${oldLine || ""}`, type: "same", key: result.length });
      } else {
        if (oldLine !== undefined) {
          result.push({ line: `- ${oldLine}`, type: "del", key: result.length });
        }
        if (newLine !== undefined) {
          result.push({ line: `+ ${newLine}`, type: "add", key: result.length });
        }
      }
    }
    return result;
  }, [patch, originalContent, modifiedContent]);

  const additions = diffLines.filter((l) => l.type === "add").length;
  const deletions = diffLines.filter((l) => l.type === "del").length;

  return (
    <div className="h-full flex flex-col bg-white text-slate-900 select-none overflow-hidden font-mono text-xs">
      <div className="h-10 px-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <FileIcon name={filename} type="file" className="w-4 h-4 shrink-0" />
          <span className="font-bold text-slate-900 truncate">{filename}</span>
          <span className="text-[11px] text-slate-500 truncate hidden sm:inline">
            {filepath}
          </span>
          <div className="flex items-center gap-1.5 text-[11px] font-bold ml-2">
            <span className="text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded font-mono">
              +{additions}
            </span>
            <span className="text-red-700 bg-red-100 px-1.5 py-0.2 rounded font-mono">
              -{deletions}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onStageChange && (
            <button
              onClick={onStageChange}
              className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold text-[11px] flex items-center gap-1 shadow-2xs"
            >
              <Check className="w-3 h-3" />
              <span>Stage Changes</span>
            </button>
          )}

          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg">
            <button
              onClick={() => setViewType("unified")}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                viewType === "unified"
                  ? "bg-white text-blue-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Rows className="w-3 h-3" />
              <span>Unified</span>
            </button>
            <button
              onClick={() => setViewType("split")}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                viewType === "split"
                  ? "bg-white text-blue-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Columns className="w-3 h-3" />
              <span>Split</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-900"
            title="Close Diff View"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-2 bg-white font-mono text-xs leading-5">
        {diffLines.map((item) => {
          if (item.type === "header") {
            return (
              <div
                key={item.key}
                className="py-1 px-3 bg-blue-50 text-blue-800 font-bold border-y border-blue-200 rounded my-1"
              >
                {item.line}
              </div>
            );
          }

          if (item.type === "del") {
            return (
              <div
                key={item.key}
                className="py-0.5 px-3 bg-red-50 text-red-800 flex items-start gap-2 border-l-2 border-red-500 font-mono"
              >
                <span className="text-red-600 select-none font-bold w-4">-</span>
                <span className="whitespace-pre">{item.line.slice(2)}</span>
              </div>
            );
          }

          if (item.type === "add") {
            return (
              <div
                key={item.key}
                className="py-0.5 px-3 bg-emerald-50 text-emerald-800 flex items-start gap-2 border-l-2 border-emerald-500 font-mono"
              >
                <span className="text-emerald-600 select-none font-bold w-4">+</span>
                <span className="whitespace-pre">{item.line.slice(2)}</span>
              </div>
            );
          }

          return (
            <div
              key={item.key}
              className="py-0.5 px-3 text-slate-600 flex items-start gap-2 hover:bg-slate-50"
            >
              <span className="text-slate-400 select-none w-4"> </span>
              <span className="whitespace-pre">{item.line.slice(2)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
