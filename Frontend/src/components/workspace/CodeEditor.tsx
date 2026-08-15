import React, { useState, useRef, useMemo } from "react";
import {
  X,
  Save,
  Copy,
  Check,
  Search,
  Code,
  ChevronRight,
  Download,
  WrapText,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { FileIcon } from "./FileIcon";
import { type EditorTab } from "../../types/workspace";

interface CodeEditorProps {
  tabs: EditorTab[];
  activeTabId: string | null;
  onSelectTab: (fileId: string) => void;
  onCloseTab: (fileId: string) => void;
  onContentChange: (fileId: string, newContent: string) => void;
  onSaveFile: (fileId: string) => Promise<void>;
  projectName: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onContentChange,
  onSaveFile,
  projectName,
}) => {
  const activeTab = tabs.find((t) => t.fileId === activeTabId);
  const [copied, setCopied] = useState(false);
  const [showFind, setShowFind] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [fontSize, setFontSize] = useState<number>(13);
  const [wordWrap, setWordWrap] = useState<boolean>(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Sync scroll between line numbers and textarea
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const handleCursorMove = () => {
    if (!textareaRef.current) return;
    const text = textareaRef.current.value;
    const selStart = textareaRef.current.selectionStart;
    const linesBefore = text.slice(0, selStart).split("\n");
    const currentLine = linesBefore.length;
    const currentCol = linesBefore[linesBefore.length - 1].length + 1;
    setCursorPos({ line: currentLine, col: currentCol });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+S / Cmd+S Save
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      if (activeTab) {
        onSaveFile(activeTab.fileId);
      }
      return;
    }

    // Ctrl+F Find
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
      e.preventDefault();
      setShowFind((prev) => !prev);
      return;
    }

    // Tab key indent
    if (e.key === "Tab") {
      e.preventDefault();
      if (!textareaRef.current || !activeTab) return;

      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const content = activeTab.content;

      const newContent =
        content.substring(0, start) + "  " + content.substring(end);
      onContentChange(activeTab.fileId, newContent);

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd =
            start + 2;
        }
      }, 0);
    }
  };

  const handleCopy = () => {
    if (!activeTab) return;
    navigator.clipboard.writeText(activeTab.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadActiveFile = () => {
    if (!activeTab) return;
    const blob = new Blob([activeTab.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = activeTab.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const lines = useMemo(() => {
    if (!activeTab) return [];
    return activeTab.content.split("\n");
  }, [activeTab?.content]);

  // Breadcrumbs
  const breadcrumbParts = useMemo(() => {
    if (!activeTab) return [];
    return [projectName, ...activeTab.path.split("/").filter(Boolean)];
  }, [activeTab?.path, projectName]);

  if (tabs.length === 0 || !activeTab) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-50 text-slate-400 select-none p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 mb-4 shadow-sm">
          <Code className="w-8 h-8 opacity-40 text-blue-600" />
        </div>
        <h3 className="text-base font-bold text-slate-800">
          No files open in editor
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Select a file from the explorer on the left to start editing.
        </p>
        <div className="mt-6 flex items-center gap-3 text-xs text-slate-600 font-mono bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-2xs">
          <span>Ctrl+S Save</span>
          <span>•</span>
          <span>Ctrl+Enter Commit</span>
          <span>•</span>
          <span>Ctrl+F Find</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white text-slate-900 overflow-hidden select-none">
      {/* Editor Tab Bar */}
      <div className="h-9 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between px-1 overflow-x-auto select-none">
        <div className="flex items-center gap-0.5 overflow-x-auto min-w-0 flex-1 scrollbar-none">
          {tabs.map((tab) => {
            const isActive = tab.fileId === activeTabId;
            return (
              <div
                key={tab.fileId}
                onClick={() => onSelectTab(tab.fileId)}
                className={`group h-8 px-2.5 sm:px-3 flex items-center gap-1.5 sm:gap-2 text-xs cursor-pointer border-r border-slate-200 transition-colors shrink-0 ${
                  isActive
                    ? "bg-white text-slate-900 font-semibold border-t-2 border-t-blue-600 shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                }`}
              >
                <FileIcon
                  name={tab.name}
                  type="file"
                  className="w-3.5 h-3.5 shrink-0"
                />
                <span className="truncate max-w-[90px] sm:max-w-[130px]">{tab.name}</span>

                {/* Dirty indicator dot or Close button */}
                <div className="flex items-center">
                  {tab.isDirty ? (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onCloseTab(tab.fileId);
                      }}
                      className="w-2 h-2 rounded-full bg-amber-500 group-hover:hidden"
                    />
                  ) : null}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(tab.fileId);
                    }}
                    className={`p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 ${
                      tab.isDirty ? "hidden group-hover:block" : ""
                    }`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tab actions & Tools */}
        <div className="flex items-center gap-1 shrink-0 px-1 sm:px-2">
          {/* Zoom controls (hidden on small mobile) */}
          <div className="hidden md:flex items-center">
            <button
              onClick={() => setFontSize((s) => Math.max(10, s - 1))}
              className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800"
              title="Decrease Font Size"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-slate-400 w-5 text-center">
              {fontSize}
            </span>
            <button
              onClick={() => setFontSize((s) => Math.min(22, s + 1))}
              className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800"
              title="Increase Font Size"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <div className="h-3.5 w-px bg-slate-300 mx-1" />
          </div>

          {/* Word Wrap Toggle */}
          <button
            onClick={() => setWordWrap(!wordWrap)}
            className={`p-1 rounded transition-colors ${
              wordWrap
                ? "bg-blue-100 text-blue-700 font-bold"
                : "hover:bg-slate-200 text-slate-500 hover:text-slate-800"
            }`}
            title="Toggle Word Wrap"
          >
            <WrapText className="w-3.5 h-3.5" />
          </button>

          {/* Download Active File (hidden on small mobile) */}
          <button
            onClick={handleDownloadActiveFile}
            className="hidden sm:block p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800"
            title="Download this file"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Copy Code */}
          <button
            onClick={handleCopy}
            className="p-1 sm:p-1.5 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800"
            title="Copy code to clipboard"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          {activeTab.isDirty && (
            <button
              onClick={() => onSaveFile(activeTab.fileId)}
              className="p-1 px-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[10px] sm:text-[11px] font-semibold flex items-center gap-1 shadow-xs ml-0.5"
              title="Save (Ctrl+S)"
            >
              <Save className="w-3 h-3" />
              <span>Save</span>
            </button>
          )}
        </div>
      </div>

      {/* Breadcrumb Navigation Bar */}
      <div className="h-6 px-2.5 sm:px-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 font-mono">
        <div className="flex items-center gap-1 truncate max-w-[65%] sm:max-w-[75%]">
          {breadcrumbParts.map((part, index) => (
            <React.Fragment key={index}>
              {index > 0 && <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />}
              <span
                className={`truncate ${
                  index === breadcrumbParts.length - 1
                    ? "text-slate-900 font-bold"
                    : "text-slate-500 hidden sm:inline"
                }`}
              >
                {part}
              </span>
            </React.Fragment>
          ))}
        </div>

        <div className="flex items-center gap-2 text-[10px] text-slate-500 shrink-0">
          <span className="hidden sm:inline">{activeTab.language}</span>
          <span>
            Ln {cursorPos.line}, Col {cursorPos.col}
          </span>
          <span className="hidden md:inline">{lines.length} lines</span>
        </div>
      </div>

      {/* In-Editor Find Bar */}
      {showFind && (
        <div className="px-3 sm:px-4 py-1.5 bg-slate-100 border-b border-slate-200 flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <input
            type="text"
            value={findQuery}
            onChange={(e) => setFindQuery(e.target.value)}
            placeholder="Find in file..."
            autoFocus
            className="flex-1 sm:w-56 px-2 py-0.5 bg-white border border-slate-300 rounded text-xs text-slate-900 outline-none focus:border-blue-500 shadow-2xs"
          />
          <button
            onClick={() => setShowFind(false)}
            className="p-1 hover:text-slate-900 text-slate-400 text-xs"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Code Editor Surface with Line Numbers */}
      <div className="flex-1 flex overflow-hidden font-mono bg-white">
        {/* Line Numbers Gutter */}
        <div
          ref={lineNumbersRef}
          style={{ fontSize: `${fontSize}px` }}
          className="w-9 sm:w-12 py-3 bg-slate-50 text-slate-400 select-none text-right pr-2 sm:pr-3 overflow-hidden shrink-0 border-r border-slate-200 font-mono leading-5"
        >
          {lines.map((_, i) => (
            <div
              key={i}
              className={`${
                cursorPos.line === i + 1
                  ? "text-blue-600 font-bold bg-blue-50 -mr-2 sm:-mr-3 pr-2 sm:pr-3"
                  : ""
              }`}
            >
              {i + 1}
            </div>
          ))}
        </div>

        {/* Textarea Code Input */}
        <textarea
          ref={textareaRef}
          value={activeTab.content}
          onChange={(e) => onContentChange(activeTab.fileId, e.target.value)}
          onScroll={handleScroll}
          onKeyUp={handleCursorMove}
          onClick={handleCursorMove}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          style={{ fontSize: `${fontSize}px` }}
          className={`flex-1 p-2 sm:p-3 bg-white text-slate-900 placeholder-slate-400 outline-none resize-none overflow-auto font-mono leading-5 tab-size-2 ${
            wordWrap ? "whitespace-pre-wrap break-words" : "whitespace-pre"
          }`}
        />
      </div>
    </div>
  );
};
