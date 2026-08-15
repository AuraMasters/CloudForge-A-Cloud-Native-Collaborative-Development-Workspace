import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Unplug,
} from "lucide-react";
import { SiGithub } from "react-icons/si";
import { githubApi } from "../../config/github";

interface GitHubUser {
  id: string;
  username: string;
  email: string | null;
  connectedAt: string;
}

interface GitHubConnectionCardProps {
  onConnected?: (user: GitHubUser) => void;
  onDisconnected?: () => void;
}

const GitHubConnectionCard = ({
  onConnected,
  onDisconnected,
}: GitHubConnectionCardProps) => {
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [githubUser, setGithubUser] =
    useState<GitHubUser | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await githubApi.getStatus();

      setConnected(data.connected);
      setGithubUser(data.github || null);
    } catch (error) {
      console.error("GitHub status error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to check GitHub connection"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setError("");
      await githubApi.connect();
    } catch (err: any) {
      setError(err.message || "Failed to start GitHub connection");
    }
  };

  const handleDisconnect = async () => {
    try {
      setDisconnecting(true);
      setError("");

      await githubApi.disconnect();

      setConnected(false);
      setGithubUser(null);

      onDisconnected?.();
    } catch (error) {
      console.error("GitHub disconnect error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to disconnect GitHub"
      );
    } finally {
      setDisconnecting(false);
    }
  };

  useEffect(() => {
    if (connected && githubUser) {
      onConnected?.(githubUser);
    }
  }, [connected, githubUser, onConnected]);

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-2xs">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-slate-100 shrink-0">
            <SiGithub className="h-5 w-5 sm:h-6 sm:w-6 text-slate-900" />
          </div>

          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              GitHub Integration
            </h3>

            {connected && githubUser ? (
              <p className="mt-0.5 text-xs text-slate-500 truncate">
                Connected as @{githubUser.username}
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-slate-500">
                Connect your GitHub account
              </p>
            )}
          </div>
        </div>

        {connected ? (
          <div className="self-start sm:self-auto inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Connected</span>
          </div>
        ) : null}
      </div>

      {error && (
        <div className="mt-3.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-medium">
          {error}
        </div>
      )}

      {!connected ? (
        <button
          type="button"
          onClick={handleConnect}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white transition hover:bg-slate-800 shadow-md shadow-slate-900/20"
        >
          <SiGithub className="h-4 w-4" />
          <span>Connect GitHub</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {disconnecting ? (
            <Loader2 className="h-4 w-4 animate-spin text-red-600" />
          ) : (
            <Unplug className="h-4 w-4" />
          )}
          <span>Disconnect GitHub</span>
        </button>
      )}
    </div>
  );
};

export default GitHubConnectionCard;