import React from "react";
import { Files, GitBranch, Search, Settings, Cloud } from "lucide-react";
import { SiGithub } from "react-icons/si";
import { type ActivityBarTab } from "../../types/workspace";

interface ActivityBarProps {
  activeTab: ActivityBarTab;
  onChangeTab: (tab: ActivityBarTab) => void;
  changedFilesCount: number;
  isGitHubConnected: boolean;
}

export const ActivityBar: React.FC<ActivityBarProps> = ({
  activeTab,
  onChangeTab,
  changedFilesCount,
  isGitHubConnected,
}) => {
  const topItems: { id: ActivityBarTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: "explorer",
      label: "Explorer (Ctrl+Shift+E)",
      icon: <Files className="w-5 h-5" />,
    },
    {
      id: "sourceControl",
      label: "Source Control & Commits (Ctrl+Shift+G)",
      icon: <GitBranch className="w-5 h-5" />,
      badge: changedFilesCount > 0 ? changedFilesCount : undefined,
    },
    {
      id: "search",
      label: "Search across Files (Ctrl+Shift+F)",
      icon: <Search className="w-5 h-5" />,
    },
    {
      id: "github",
      label: isGitHubConnected ? "GitHub Remote & Sync" : "Link to GitHub Repository",
      icon: <SiGithub className="w-5 h-5" />,
    },
  ];

  return (
    <aside className="w-12 bg-white border-r border-slate-200 flex flex-col justify-between items-center py-2 shrink-0 select-none z-10">
      <div className="flex flex-col items-center gap-1 w-full">
        {topItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChangeTab(item.id)}
              className={`relative w-10 h-10 flex items-center justify-center rounded-lg transition-all group ${
                isActive
                  ? "text-blue-600 bg-blue-50 border-l-2 border-blue-600 rounded-l-none font-semibold"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              }`}
              title={item.label}
            >
              {item.icon}

              {item.badge !== undefined && (
                <span className="absolute top-1 right-1 px-1.5 py-0.2 bg-blue-600 text-white font-bold text-[9px] rounded-full min-w-[15px] h-[15px] flex items-center justify-center shadow-xs">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-1 w-full">
        <button
          onClick={() => onChangeTab("settings")}
          className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
            activeTab === "settings"
              ? "text-blue-600 bg-blue-50"
              : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          }`}
          title="Project Settings"
        >
          <Settings className="w-5 h-5" />
        </button>

        <div
          className="w-10 h-10 flex items-center justify-center text-emerald-600 cursor-default"
          title="CloudForge Engine: Active & Ready"
        >
          <Cloud className="w-4 h-4" />
        </div>
      </div>
    </aside>
  );
};
