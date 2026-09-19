import React, { useState, useEffect } from "react";
import { X, UserPlus, Users, Trash2, Copy, Check, ShieldCheck, Mail, AlertCircle } from "lucide-react";
import API_URL from "../../config/api";
import { useAlert } from "../../hooks/useAlert";
import { useTheme } from "../../context/ThemeContext";

interface CollaboratorInfo {
  _id: string;
  name: string;
  email: string;
}

interface CollaboratorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  isOwner: boolean;
}

export const CollaboratorsModal: React.FC<CollaboratorsModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectName,
  isOwner,
}) => {
  const { isDark } = useTheme();
  const { showSuccess, showError } = useAlert();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [owner, setOwner] = useState<CollaboratorInfo | null>(null);
  const [collaborators, setCollaborators] = useState<CollaboratorInfo[]>([]);

  const fetchCollaborators = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/projects/${projectId}/collaborators`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setOwner(data.owner);
        setCollaborators(data.collaborators || []);
      }
    } catch (err: any) {
      console.warn("Failed to fetch collaborators:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCollaborators();
    }
  }, [isOpen, projectId]);

  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.trim()) return;

    try {
      setAdding(true);
      const res = await fetch(`${API_URL}/api/projects/${projectId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to add collaborator");
      }

      showSuccess(data.message || "Collaborator added successfully");
      setEmail("");
      fetchCollaborators();
    } catch (err: any) {
      showError(err.message || "Could not add collaborator");
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveCollaborator = async (userId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from this project?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/projects/${projectId}/collaborators/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to remove collaborator");

      showSuccess(`Removed ${name}`);
      setCollaborators((prev) => prev.filter((c) => c._id !== userId));
    } catch (err: any) {
      showError(err.message || "Failed to remove collaborator");
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    showSuccess("Workspace link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 font-sans">
      <div
        className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden flex flex-col transition-colors ${
          isDark
            ? "bg-neutral-900 border-neutral-800 text-neutral-100"
            : "bg-white border-neutral-200 text-neutral-900"
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base leading-tight">Project Collaborators</h2>
              <p className="text-xs opacity-60 truncate max-w-[240px]">{projectName}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Share Link Banner */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
              isDark ? "bg-neutral-800/40 border-neutral-800" : "bg-neutral-50 border-neutral-200"
            }`}
          >
            <div className="truncate min-w-0">
              <span className="font-semibold block opacity-90">Workspace URL</span>
              <span className="opacity-60 truncate block text-[11px] font-mono">{window.location.href}</span>
            </div>
            <button
              onClick={handleCopyLink}
              className="px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 font-medium shrink-0 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>

          {/* Add Collaborator Form (Owner only) */}
          {isOwner ? (
            <form onSubmit={handleAddCollaborator} className="space-y-2">
              <label className="text-xs font-semibold opacity-80 block">Invite by Email Address</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
                  <input
                    type="email"
                    required
                    placeholder="teammate@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs outline-hidden transition-all ${
                      isDark
                        ? "bg-neutral-800/60 border-neutral-700 text-white focus:border-blue-500"
                        : "bg-neutral-50 border-neutral-300 text-neutral-900 focus:border-blue-600"
                    }`}
                  />
                </div>
                <button
                  type="submit"
                  disabled={adding || !email.trim()}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shrink-0 shadow-sm"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{adding ? "Adding..." : "Invite"}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Only the project owner can invite or remove collaborators.</span>
            </div>
          )}

          {/* Collaborator List */}
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider opacity-60">Members ({1 + collaborators.length})</h3>

            {/* Owner Item */}
            {owner && (
              <div
                className={`p-2.5 rounded-xl border flex items-center justify-between ${
                  isDark ? "bg-neutral-800/30 border-neutral-800" : "bg-neutral-50 border-neutral-200"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-500 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                    {owner.name?.slice(0, 2) || "OW"}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-xs flex items-center gap-1.5 truncate">
                      <span>{owner.name}</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-blue-500/15 text-blue-400 font-mono text-[10px]">
                        Owner
                      </span>
                    </div>
                    <p className="text-[11px] opacity-60 truncate">{owner.email}</p>
                  </div>
                </div>
                <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0 mr-1" />
              </div>
            )}

            {/* Collaborators List */}
            {loading ? (
              <div className="py-4 text-center text-xs opacity-60">Loading members...</div>
            ) : collaborators.length === 0 ? (
              <p className="text-xs opacity-50 italic py-2">No other collaborators yet. Invite teammates above!</p>
            ) : (
              collaborators.map((c) => (
                <div
                  key={c._id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between transition-colors ${
                    isDark ? "bg-neutral-800/30 border-neutral-800" : "bg-neutral-50 border-neutral-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-emerald-600/20 text-emerald-500 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                      {c.name?.slice(0, 2) || "CL"}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs truncate">{c.name}</p>
                      <p className="text-[11px] opacity-60 truncate">{c.email}</p>
                    </div>
                  </div>

                  {isOwner && (
                    <button
                      onClick={() => handleRemoveCollaborator(c._id, c.name)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Remove collaborator"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-neutral-200 dark:border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-200 dark:bg-neutral-800 hover:opacity-80 transition-opacity cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
