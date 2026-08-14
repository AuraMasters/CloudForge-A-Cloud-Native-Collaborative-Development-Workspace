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

  const handleConnect = () => {
    githubApi.connect();
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
      <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-8">
        <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100">
            <SiGithub className="h-6 w-6 text-slate-900" />
          </div>

          <div>
            <h3 className="font-semibold text-slate-900">
              GitHub
            </h3>

            {connected && githubUser ? (
              <p className="mt-1 text-sm text-slate-500">
                Connected as @{githubUser.username}
              </p>
            ) : (
              <p className="mt-1 text-sm text-slate-500">
                Connect your GitHub account
              </p>
            )}
          </div>
        </div>

        {connected ? (
          <div className="flex items-center gap-1.5 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            Connected
          </div>
        ) : null}
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {!connected ? (
        <button
          type="button"
          onClick={handleConnect}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          <SiGithub className="h-4 w-4" />
          Connect GitHub
        </button>
      ) : (
        <button
          type="button"
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {disconnecting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Unplug className="h-4 w-4" />
          )}

          Disconnect GitHub
        </button>
      )}
    </div>
  );
};

export default GitHubConnectionCard;