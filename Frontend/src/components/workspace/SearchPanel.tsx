import { useState, useMemo } from "react";
import { Search, ChevronDown, ChevronRight } from "lucide-react";
import { FileIcon } from "./FileIcon";
import { type WorkspaceFile } from "../../types/workspace";

interface SearchPanelProps {
  files: WorkspaceFile[];
  onSelectMatch: (file: WorkspaceFile, lineNumber?: number) => void;
}

interface MatchResult {
  file: WorkspaceFile;
  matches: {
    lineNumber: number;
    lineText: string;
    matchIndex: number;
  }[];
}

export const SearchPanel: React.FC<SearchPanelProps> = ({
  files,
  onSelectMatch,
}) => {
  const [query, setQuery] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set());

  const searchResults: MatchResult[] = useMemo(() => {
    if (!query.trim() || query.length < 2) return [];

    const results: MatchResult[] = [];
    const searchQuery = matchCase ? query : query.toLowerCase();

    files.forEach((file) => {
      if (file.type !== "file" || !file.content) return;

      const lines = file.content.split("\n");
      const fileMatches: MatchResult["matches"] = [];

      lines.forEach((line, index) => {
        const textToSearch = matchCase ? line : line.toLowerCase();
        const matchIdx = textToSearch.indexOf(searchQuery);

        if (matchIdx !== -1) {
          fileMatches.push({
            lineNumber: index + 1,
            lineText: line.trim(),
            matchIndex: matchIdx,
          });
        }
      });

      if (fileMatches.length > 0) {
        results.push({
          file,
          matches: fileMatches,
        });
      }
    });

    return results;
  }, [files, query, matchCase]);

  const totalMatches = searchResults.reduce(
    (sum, r) => sum + r.matches.length,
    0
  );

  const toggleFileCollapse = (fileId: string) => {
    setCollapsedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col bg-slate-50/70 text-slate-800 select-none overflow-hidden font-sans border-r border-slate-200">
      <div className="px-3 py-2.5 border-b border-slate-200 bg-white/60">
        <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
          Search
        </span>
      </div>

      <div className="p-3 border-b border-slate-200 bg-white/80 space-y-2">
        <div className="relative flex items-center">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across all files..."
            className="w-full pl-7 pr-14 py-1.5 bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-lg text-xs text-slate-900 outline-none focus:bg-white transition-all shadow-2xs"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2" />

          <div className="absolute right-1.5 flex items-center gap-1">
            <button
              onClick={() => setMatchCase(!matchCase)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                matchCase
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-slate-700 bg-slate-100"
              }`}
              title="Match Case (Aa)"
            >
              Aa
            </button>
          </div>
        </div>

        {query.trim() && (
          <div className="text-[11px] text-slate-500 font-medium">
            {totalMatches} {totalMatches === 1 ? "result" : "results"} in{" "}
            {searchResults.length} {searchResults.length === 1 ? "file" : "files"}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 font-mono text-xs">
        {!query.trim() ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
            <p>Type to search across workspace</p>
          </div>
        ) : searchResults.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <p>No results found for "{query}"</p>
          </div>
        ) : (
          searchResults.map(({ file, matches }) => {
            const isCollapsed = collapsedFiles.has(file._id);

            return (
              <div key={file._id} className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-2xs">
                <div
                  onClick={() => toggleFileCollapse(file._id)}
                  className="px-2 py-1.5 flex items-center justify-between bg-slate-50/80 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-slate-400">
                      {isCollapsed ? (
                        <ChevronRight className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </span>
                    <FileIcon name={file.name} type={file.type} className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-semibold text-slate-800 truncate">{file.name}</span>
                    <span className="text-[10px] text-slate-400 truncate">{file.path}</span>
                  </div>

                  <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                    {matches.length}
                  </span>
                </div>

                {!isCollapsed && (
                  <div className="p-1 space-y-0.5 bg-white">
                    {matches.map((match, idx) => (
                      <div
                        key={idx}
                        onClick={() => onSelectMatch(file, match.lineNumber)}
                        className="px-2 py-1 rounded hover:bg-blue-50 cursor-pointer flex items-center gap-2 text-[11px] text-slate-700 transition-colors"
                      >
                        <span className="text-slate-400 w-6 shrink-0 text-right font-mono">
                          {match.lineNumber}:
                        </span>
                        <span className="truncate text-slate-800">
                          {match.lineText}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
