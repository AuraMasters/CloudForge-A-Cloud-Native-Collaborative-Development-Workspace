import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { marked } from "marked";
import katex from "katex";
import mermaid from "mermaid";
import Editor from "@monaco-editor/react";
import Prism from "prismjs";

// Load common Prism syntax definitions
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-python";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-json";
import "prismjs/components/prism-css";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-csharp";
import "prismjs/components/prism-java";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-go";
import "prismjs/components/prism-docker";

import {
  Columns2,
  Eye,
  Code,
  Copy,
  Check,
  Save,
  List,
  Clock,
  BookOpen,
  FileCode,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";
import "./github-markdown.css";

interface MarkdownViewerProps {
  content: string;
  filename: string;
  isDirty?: boolean;
  onContentChange: (newContent: string) => void;
  onSave?: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Language definitions & Icons for GitHub-grade Code Blocks
// ---------------------------------------------------------------------------
const LANGUAGE_ALIASES: Record<string, string> = {
  js: "javascript",
  javascript: "javascript",
  ts: "typescript",
  typescript: "typescript",
  jsx: "jsx",
  tsx: "tsx",
  py: "python",
  python: "python",
  sh: "bash",
  bash: "bash",
  shell: "bash",
  zsh: "bash",
  json: "json",
  css: "css",
  html: "markup",
  xml: "markup",
  svg: "markup",
  yaml: "yaml",
  yml: "yaml",
  sql: "sql",
  md: "markdown",
  markdown: "markdown",
  c: "c",
  cpp: "cpp",
  "c++": "cpp",
  cs: "csharp",
  csharp: "csharp",
  java: "java",
  rs: "rust",
  rust: "rust",
  go: "go",
  golang: "go",
  docker: "docker",
  dockerfile: "docker",
};

const LANGUAGE_META: Record<string, { label: string; badge: string; color: string }> = {
  javascript: { label: "JavaScript", badge: "JS", color: "#f7df1e" },
  typescript: { label: "TypeScript", badge: "TS", color: "#3178c6" },
  jsx: { label: "React JSX", badge: "JSX", color: "#61dafb" },
  tsx: { label: "React TSX", badge: "TSX", color: "#61dafb" },
  python: { label: "Python", badge: "PY", color: "#3572A5" },
  bash: { label: "Bash / Shell", badge: ">_", color: "#89e051" },
  json: { label: "JSON", badge: "{ }", color: "#cbcb41" },
  css: { label: "CSS", badge: "#", color: "#563d7c" },
  markup: { label: "HTML", badge: "< >", color: "#e34c26" },
  yaml: { label: "YAML", badge: "YML", color: "#cb171e" },
  sql: { label: "SQL", badge: "SQL", color: "#e38c00" },
  markdown: { label: "Markdown", badge: "MD", color: "#083fa1" },
  c: { label: "C", badge: "C", color: "#555555" },
  cpp: { label: "C++", badge: "C++", color: "#f34b7d" },
  csharp: { label: "C#", badge: "C#", color: "#178600" },
  java: { label: "Java", badge: "JAVA", color: "#b07219" },
  rust: { label: "Rust", badge: "RS", color: "#dea584" },
  go: { label: "Go", badge: "GO", color: "#00ADD8" },
  docker: { label: "Dockerfile", badge: "DOCKER", color: "#384d54" },
};

const getLanguageBadgeHtml = (cleanLang: string) => {
  const meta = LANGUAGE_META[cleanLang];
  if (meta) {
    return `<span class="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold font-mono tracking-tight" style="background-color: ${meta.color}22; color: ${meta.color}; border: 1px solid ${meta.color}44;">${meta.badge}</span>`;
  }
  return `<span class="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold font-mono tracking-tight text-neutral-400 bg-neutral-800/40 border border-neutral-700/50">&lt;&gt;</span>`;
};

// ---------------------------------------------------------------------------
// GitHub Alert SVG Icons (1:1 with GitHub GFM Callouts)
// ---------------------------------------------------------------------------
const ALERT_ICONS: Record<string, string> = {
  NOTE: `<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" class="shrink-0"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"/></svg>`,
  TIP: `<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" class="shrink-0"><path d="M8 1.5c-2.363 0-4 1.69-4 3.75 0 .984.424 1.625.984 2.304l.214.253c.223.264.47.556.673.848.284.411.537.896.621 1.49a.75.75 0 0 1-1.484.211c-.04-.282-.163-.547-.37-.847a8.456 8.456 0 0 0-.542-.68c-.619-.747-1.176-1.554-1.176-2.779C2.92 2.65 5.258.5 8 .5s5.08 2.15 5.08 4.75c0 1.225-.557 2.032-1.176 2.778-.17.206-.355.435-.54.681-.208.3-.332.565-.372.847a.751.751 0 0 1-1.485-.211c.084-.594.337-1.079.621-1.49.204-.292.45-.584.673-.848.075-.088.147-.173.213-.253.561-.679.985-1.32.985-2.304 0-2.06-1.637-3.75-4-3.75ZM5.75 12h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1 0-1.5ZM6.25 14.5h3.5a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1 0-1.5Z"/></svg>`,
  IMPORTANT: `<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" class="shrink-0"><path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v9.5A1.75 1.75 0 0 1 14.25 13H8.06l-2.573 2.573A1.458 1.458 0 0 1 3 14.543V13H1.75A1.75 1.75 0 0 1 0 11.25Zm1.75-.25a.25.25 0 0 0-.25.25v9.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h6.5a.25.25 0 0 0 .25-.25v-9.5a.25.25 0 0 0-.25-.25Zm7 2.25v4a.75.75 0 0 1-1.5 0v-4a.75.75 0 0 1 1.5 0ZM9 9.75a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/></svg>`,
  WARNING: `<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" class="shrink-0"><path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/></svg>`,
  CAUTION: `<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" class="shrink-0"><path d="M4.47.22A.749.749 0 0 1 5 0h6c.199 0 .389.079.53.22l4.25 4.25c.141.14.22.331.22.53v6a.749.749 0 0 1-.22.53l-4.25 4.25A.749.749 0 0 1 11 16H5a.749.749 0 0 1-.53-.22L.22 11.53A.749.749 0 0 1 0 11V5c0-.199.079-.389.22-.53Zm.84 1.28L1.5 5.31v5.38l3.81 3.81h5.38l3.81-3.81V5.31L10.69 1.5ZM8 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"/></svg>`,
};

const escapeHtml = (text: string) => {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// ---------------------------------------------------------------------------
// Configure Marked with GitHub-Grade Renderer
// ---------------------------------------------------------------------------
marked.use({
  gfm: true,
  breaks: true,
  renderer: {
    // Custom Code Blocks (Language badge, Copy button, Prism highlighting)
    code(token: { text: string; lang?: string }) {
      const rawText = token.text || "";
      const rawLang = (token.lang || "").trim().toLowerCase();

      // Mermaid diagrams are handed off directly to Mermaid renderer
      if (rawLang === "mermaid") {
        return `<pre><code class="language-mermaid">${escapeHtml(rawText)}</code></pre>`;
      }

      const cleanLang = LANGUAGE_ALIASES[rawLang] || rawLang;
      const meta = LANGUAGE_META[cleanLang];
      const displayLabel = meta ? meta.label : (rawLang ? rawLang.toUpperCase() : "Code");
      const badgeHtml = getLanguageBadgeHtml(cleanLang);

      // Syntax highlight via PrismJS
      let highlightedCode = "";
      if (cleanLang && Prism.languages[cleanLang]) {
        try {
          highlightedCode = Prism.highlight(rawText, Prism.languages[cleanLang], cleanLang);
        } catch {
          highlightedCode = escapeHtml(rawText);
        }
      } else {
        highlightedCode = escapeHtml(rawText);
      }

      const encodedCode = encodeURIComponent(rawText);

      return `
        <div class="gh-code-block">
          <div class="gh-code-header flex items-center justify-between px-3 py-1.5 select-none">
            <div class="flex items-center gap-2">
              ${badgeHtml}
              <span class="text-[11px] font-mono font-semibold tracking-wide">${displayLabel}</span>
            </div>
            <button class="gh-code-copy-btn flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium cursor-pointer" data-code="${encodedCode}" title="Copy code snippet">
              <svg class="gh-copy-icon w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
              </svg>
              <span class="gh-copy-label">Copy</span>
            </button>
          </div>
          <pre class="gh-code-pre"><code class="language-${cleanLang}">${highlightedCode}</code></pre>
        </div>
      `;
    },

    // Headings with Anchor links on hover
    heading(token: any) {
      const plainText = (token.text || "").replace(/<[^>]+>/g, "").trim();
      const slug = plainText.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      return `
        <h${token.depth} id="${slug}" class="group">
          <span>${token.text}</span>
          <a href="#${slug}" class="opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity ml-2 inline-block text-inherit no-underline" title="Direct link to ${plainText}">
            <svg class="w-4 h-4 inline opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          </a>
        </h${token.depth}>
      `;
    },
  },
});

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({
  content,
  filename,
  isDirty = false,
  onContentChange,
  onSave,
}) => {
  const { isDark } = useTheme();
  const [viewMode, setViewMode] = useState<"split" | "preview" | "editor">("split");
  const [copied, setCopied] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [renderedHtml, setRenderedHtml] = useState<string>("");
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Extract Table of Contents
  const toc = useMemo(() => {
    const lines = content.split("\n");
    const headers: { level: number; text: string; id: string }[] = [];
    lines.forEach((line) => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim().replace(/[#*`_~]/g, "");
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        headers.push({ level, text, id });
      }
    });
    return headers;
  }, [content]);

  // Statistics
  const stats = useMemo(() => {
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const chars = content.length;
    const readTimeMinutes = Math.max(1, Math.ceil(words / 200));
    return { words, chars, readTimeMinutes };
  }, [content]);

  // Transform GitHub Alert Callouts (> [!NOTE], > [!TIP], etc.) & Tables
  const postProcessHtml = useCallback((html: string) => {
    // 1. Wrap tables in responsive container
    let processed = html.replace(/<table>/gi, '<div class="gh-table-container"><table>').replace(/<\/table>/gi, '</table></div>');

    // 2. Format GitHub Alerts
    processed = processed.replace(
      /<blockquote>\s*<p>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:\s*<br\s*\/?>)?([\s\S]*?)<\/p>\s*([\s\S]*?)<\/blockquote>/gi,
      (_, type: string, firstLine: string, rest: string) => {
        const alertKey = type.toUpperCase();
        const title = alertKey.charAt(0) + alertKey.slice(1).toLowerCase();
        const content = (firstLine.trim() ? `<p>${firstLine.trim()}</p>` : "") + rest;
        const iconSvg = ALERT_ICONS[alertKey] || ALERT_ICONS.NOTE;

        return `
          <div class="gh-alert gh-alert-${alertKey.toLowerCase()}" data-alert="${alertKey}">
            <div class="gh-alert-title">
              <span class="gh-alert-icon">${iconSvg}</span>
              <span>${title}</span>
            </div>
            <div class="gh-alert-content">${content}</div>
          </div>
        `;
      }
    );

    return processed;
  }, []);

  // Process Markdown, KaTeX, and Mermaid
  useEffect(() => {
    let isCancelled = false;

    const processMarkdown = async () => {
      try {
        let processedText = content;

        // 1. Block math $$...$$
        processedText = processedText.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
          try {
            return `<div class="katex-block my-4 p-3 rounded-lg overflow-x-auto text-center ${
              isDark ? "bg-neutral-900/60" : "bg-neutral-100"
            }">${katex.renderToString(math.trim(), { displayMode: true, throwOnError: false })}</div>`;
          } catch (e: any) {
            return `<pre class="text-rose-400 text-xs">${e.message}</pre>`;
          }
        });

        // 2. Inline math $...$
        processedText = processedText.replace(/\$([^\$\n]+?)\$/g, (_, math) => {
          try {
            return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
          } catch {
            return `<span class="text-rose-400">${math}</span>`;
          }
        });

        // 3. Render Markdown to HTML via marked
        const rawHtml = await marked.parse(processedText);

        // 4. Transform GitHub Alert Callouts & Tables
        const formattedHtml = postProcessHtml(rawHtml);

        if (isCancelled) return;
        setRenderedHtml(formattedHtml);
      } catch (err) {
        console.error("Markdown processing error:", err);
      }
    };

    processMarkdown();

    return () => {
      isCancelled = true;
    };
  }, [content, isDark, postProcessHtml]);

  // Render Mermaid diagrams inside preview
  useEffect(() => {
    if (!previewContainerRef.current) return;

    const renderMermaidBlocks = async () => {
      const codeBlocks = previewContainerRef.current?.querySelectorAll("pre code.language-mermaid");
      if (!codeBlocks || codeBlocks.length === 0) return;

      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? "dark" : "default",
        themeVariables: {
          darkMode: isDark,
          background: isDark ? "#0d1117" : "#ffffff",
          primaryColor: "#3b82f6",
          primaryTextColor: isDark ? "#ffffff" : "#000000",
          lineColor: isDark ? "#60a5fa" : "#2563eb",
        },
      });

      for (let i = 0; i < codeBlocks.length; i++) {
        const block = codeBlocks[i];
        const rawCode = block.textContent || "";
        const parentPre = block.parentElement;
        if (!parentPre) continue;

        try {
          const uniqueId = `mermaid-md-${Date.now()}-${i}`;
          const { svg } = await mermaid.render(uniqueId, rawCode.trim());
          const wrapper = document.createElement("div");
          wrapper.className = `mermaid-rendered-container my-4 p-4 rounded-xl border flex justify-center overflow-x-auto shadow-xs transition-all ${
            isDark ? "bg-neutral-900/60 border-neutral-800" : "bg-neutral-50 border-neutral-200"
          }`;
          wrapper.innerHTML = svg;
          parentPre.replaceWith(wrapper);
        } catch (err: any) {
          const errorWrapper = document.createElement("div");
          errorWrapper.className = `p-3 rounded-lg border text-xs my-2 ${
            isDark ? "bg-rose-950/20 border-rose-800 text-rose-300" : "bg-rose-50 border-rose-200 text-rose-700"
          }`;
          errorWrapper.textContent = `Mermaid syntax error: ${err.message || "Invalid syntax"}`;
          parentPre.replaceWith(errorWrapper);
        }
      }
    };

    const timeout = setTimeout(renderMermaidBlocks, 100);
    return () => clearTimeout(timeout);
  }, [renderedHtml, isDark]);

  // Click Delegation for One-Click Code Block Copying
  const handlePreviewClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const copyBtn = target.closest<HTMLButtonElement>(".gh-code-copy-btn");
    if (!copyBtn) return;

    e.preventDefault();
    e.stopPropagation();

    const encodedCode = copyBtn.getAttribute("data-code");
    if (!encodedCode) return;

    const rawCode = decodeURIComponent(encodedCode);
    navigator.clipboard.writeText(rawCode).then(() => {
      const originalHtml = copyBtn.innerHTML;
      copyBtn.innerHTML = `
        <svg class="w-3.5 h-3.5 text-emerald-400 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span class="text-emerald-400 font-semibold">Copied!</span>
      `;
      copyBtn.classList.add("!border-emerald-500/50");

      setTimeout(() => {
        copyBtn.innerHTML = originalHtml;
        copyBtn.classList.remove("!border-emerald-500/50");
      }, 2000);
    });
  }, []);

  const handleCopyRaw = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleScrollToHeader = (id: string) => {
    if (!previewContainerRef.current) return;
    const target = previewContainerRef.current.querySelector(`#${id}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div
      className={`h-full flex flex-col overflow-hidden select-none font-sans ${
        isDark ? "bg-black text-neutral-200" : "bg-white text-neutral-800"
      }`}
    >
      {/* Top Toolbar (GitHub-Style) */}
      <div
        className={`h-11 px-3 border-b flex items-center justify-between shrink-0 ${
          isDark ? "bg-neutral-950 border-neutral-800" : "bg-neutral-50 border-neutral-200"
        }`}
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-500 shrink-0" />
          <span className="text-xs font-bold truncate max-w-[150px] sm:max-w-[240px] font-mono">
            {filename}
          </span>
          <span
            className={`hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
              isDark
                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                : "bg-blue-50 text-blue-700 border border-blue-200"
            }`}
          >
            <Sparkles className="w-3 h-3 text-blue-400" />
            GitHub Markdown
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* View Mode Toggle */}
          <div
            className={`flex items-center p-0.5 rounded-lg border ${
              isDark ? "bg-neutral-900 border-neutral-800" : "bg-neutral-200/60 border-neutral-300"
            }`}
          >
            <button
              onClick={() => setViewMode("preview")}
              className={`px-2.5 py-1 rounded text-xs flex items-center gap-1.5 font-semibold transition-all cursor-pointer ${
                viewMode === "preview"
                  ? isDark
                    ? "bg-neutral-800 text-white shadow-xs"
                    : "bg-white text-black shadow-xs"
                  : "opacity-60 hover:opacity-100"
              }`}
              title="Preview Only (GitHub Document View)"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
            <button
              onClick={() => setViewMode("split")}
              className={`px-2.5 py-1 rounded text-xs flex items-center gap-1.5 font-semibold transition-all cursor-pointer ${
                viewMode === "split"
                  ? isDark
                    ? "bg-neutral-800 text-white shadow-xs"
                    : "bg-white text-black shadow-xs"
                  : "opacity-60 hover:opacity-100"
              }`}
              title="Split View (Editor + Live GitHub Preview)"
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Split</span>
            </button>
            <button
              onClick={() => setViewMode("editor")}
              className={`px-2.5 py-1 rounded text-xs flex items-center gap-1.5 font-semibold transition-all cursor-pointer ${
                viewMode === "editor"
                  ? isDark
                    ? "bg-neutral-800 text-white shadow-xs"
                    : "bg-white text-black shadow-xs"
                  : "opacity-60 hover:opacity-100"
              }`}
              title="Code / Source Editor"
            >
              <Code className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Code</span>
            </button>
          </div>

          {/* Table of Contents Toggle */}
          {toc.length > 0 && (
            <button
              onClick={() => setShowToc((v) => !v)}
              className={`px-2 py-1 rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5 text-xs ${
                showToc
                  ? "bg-blue-600/20 border-blue-500/40 text-blue-400 font-bold"
                  : isDark
                  ? "border-neutral-800 hover:bg-neutral-900"
                  : "border-neutral-200 hover:bg-neutral-100"
              }`}
              title="Outline / Table of Contents"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Outline</span>
            </button>
          )}

          {/* Copy Button */}
          <button
            onClick={handleCopyRaw}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer flex items-center gap-1 text-xs ${
              isDark ? "border-neutral-800 hover:bg-neutral-900" : "border-neutral-200 hover:bg-neutral-100"
            }`}
            title="Copy Raw Markdown"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span className="hidden lg:inline text-[11px] font-medium">
              {copied ? "Copied" : "Raw"}
            </span>
          </button>

          {/* Save Button */}
          {isDirty && onSave && (
            <button
              onClick={onSave}
              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer"
            >
              <Save className="w-3 h-3" />
              <span>Save</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Table of Contents Sidebar */}
        {showToc && (
          <div
            className={`w-64 border-r overflow-y-auto p-3 text-xs shrink-0 transition-all ${
              isDark ? "bg-neutral-950/90 border-neutral-800" : "bg-neutral-50/95 border-neutral-200"
            }`}
          >
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-800/40">
              <span className="font-bold uppercase tracking-wider text-[10px] opacity-70">
                Outline & Sections
              </span>
              <span className="text-[10px] font-mono opacity-50">{toc.length}</span>
            </div>
            <div className="space-y-1">
              {toc.map((h, i) => (
                <button
                  key={i}
                  onClick={() => handleScrollToHeader(h.id)}
                  style={{ paddingLeft: `${(h.level - 1) * 12 + 6}px` }}
                  className={`w-full text-left py-1 px-2 truncate rounded hover:text-blue-400 hover:bg-blue-500/5 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    h.level === 1
                      ? "font-bold text-xs"
                      : h.level === 2
                      ? "font-medium text-[11px]"
                      : "opacity-75 text-[11px]"
                  }`}
                >
                  <ChevronRight className="w-2.5 h-2.5 opacity-40 shrink-0" />
                  <span className="truncate">{h.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Code Editor Pane */}
        {(viewMode === "split" || viewMode === "editor") && (
          <div
            className={`h-full ${viewMode === "split" ? "w-1/2 border-r" : "w-full"} ${
              isDark ? "border-neutral-800" : "border-neutral-200"
            }`}
          >
            <Editor
              height="100%"
              language="markdown"
              value={content}
              theme={isDark ? "vs-dark" : "light"}
              onChange={(val) => onContentChange(val || "")}
              options={{
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                lineHeight: 22,
                wordWrap: "on",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbersMinChars: 3,
                padding: { top: 12, bottom: 12 },
              }}
            />
          </div>
        )}

        {/* GitHub-Grade Rendered Preview Pane */}
        {(viewMode === "split" || viewMode === "preview") && (
          <div
            ref={previewContainerRef}
            onClick={handlePreviewClick}
            className={`h-full overflow-y-auto p-4 sm:p-6 md:p-8 select-text ${
              viewMode === "split" ? "w-1/2" : "w-full"
            } ${isDark ? "bg-black text-neutral-200" : "bg-neutral-50/50 text-neutral-800"}`}
          >
            {/* GitHub README Paper Card */}
            <div
              className={`max-w-4xl mx-auto rounded-xl border transition-all ${
                isDark
                  ? "bg-neutral-950/60 border-neutral-800 shadow-xl"
                  : "bg-white border-neutral-200/80 shadow-sm"
              }`}
            >
              {/* GitHub Card Header Bar */}
              <div
                className={`px-4 py-2.5 border-b rounded-t-xl flex items-center justify-between text-xs select-none ${
                  isDark
                    ? "bg-neutral-900/60 border-neutral-800 text-neutral-400"
                    : "bg-neutral-50 border-neutral-200 text-neutral-600"
                }`}
              >
                <div className="flex items-center gap-2 font-mono">
                  <FileCode className="w-3.5 h-3.5 text-blue-500" />
                  <span className="font-semibold text-neutral-300">{filename}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span>{stats.words} words</span>
                  <span className="hidden sm:inline">|</span>
                  <span className="hidden sm:inline">{stats.readTimeMinutes} min read</span>
                </div>
              </div>

              {/* GitHub Markdown Body */}
              <div
                className={`p-6 sm:p-8 markdown-body ${isDark ? "theme-dark" : "theme-light"}`}
                dangerouslySetInnerHTML={{ __html: renderedHtml }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Status Bar */}
      <div
        className={`h-6 px-3 border-t flex items-center justify-between text-[10px] font-mono shrink-0 ${
          isDark
            ? "bg-neutral-950 border-neutral-800 text-neutral-400"
            : "bg-neutral-50 border-neutral-200 text-neutral-500"
        }`}
      >
        <div className="flex items-center gap-3">
          <span>{stats.words} words</span>
          <span>{stats.chars} characters</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            ~{stats.readTimeMinutes} min read
          </span>
          <span>{toc.length} sections</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Mode: {viewMode.toUpperCase()}</span>
          <span>GFM Compliant</span>
          <span>UTF-8</span>
        </div>
      </div>
    </div>
  );
};

export default MarkdownViewer;
