import { useEffect, useState } from "react";
import {
  GitBranch,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Unplug,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { SiGithub } from "react-icons/si";

import Navbar from "../components/layout/Navbar";
import { githubApi } from "../config/github";
import { useAuth } from "../context/AuthContent";

interface GitHubUser {
  id: string;
  username: string;
  email: string | null;
  connectedAt: string;
}

interface GitHubStatusResponse {
  connected: boolean;
  github?: GitHubUser;
}

const GitHub = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  const [connected, setConnected] = useState(false);
  const [githubUser, setGithubUser] =
    useState<GitHubUser | null>(null);

  const [error, setError] = useState("");

  useEffect(() => {
    // Check if redirected from OAuth callback with query parameters
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "true") {
      // Clear query params from URL cleanly without reload
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get("connected") === "false") {
      const errCode = params.get("error");
      setError(
        errCode === "token_exchange_failed"
          ? "GitHub authorization failed. Please verify your GitHub OAuth App callback settings."
          : "Unable to complete GitHub authorization."
      );
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    checkGitHubStatus();
  }, []);

  const checkGitHubStatus = async () => {
    try {
      setLoading(true);
      setError("");

      const data: GitHubStatusResponse = await githubApi.getStatus();

      setConnected(data.connected);
      setGithubUser(data.github || null);
    } catch (error) {
      console.error("GitHub status error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to check GitHub connection."
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
    } catch (error) {
      console.error("GitHub disconnect error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to disconnect GitHub."
      );
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Navbar user={user} />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* Header */}
        <section className="mb-6 sm:mb-10">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="mb-3 flex items-center gap-2.5">
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-slate-900 shadow-sm">
                  <SiGithub className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>

                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Integrations
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                GitHub Integration
              </h1>

              <p className="mt-1.5 max-w-2xl text-xs sm:text-sm leading-relaxed text-slate-500">
                Connect your GitHub account to import repositories, push commits, switch branches, and synchronize changes with CloudForge.
              </p>
            </div>

            {connected && (
              <div className="self-start inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700 shadow-2xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Account Connected</span>
              </div>
            )}
          </div>
        </section>

        {/* Error notification */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-xs sm:text-sm text-red-700 shadow-2xs">
            <p className="font-semibold">{error}</p>
          </div>
        )}

        {/* Main Grid */}
        <section className="grid gap-6 grid-cols-1 lg:grid-cols-[1.5fr_1fr]">
          {/* Connection Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
            <div className="border-b border-slate-100 px-5 sm:px-6 py-4 sm:py-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    GitHub Connection
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    OAuth authorization & repository synchronization
                  </p>
                </div>

                <SiGithub className="h-5 w-5 text-slate-400" />
              </div>
            </div>

            <div className="p-5 sm:p-6">
              {loading ? (
                <div className="flex min-h-[180px] items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : !connected ? (
                <div className="flex flex-col items-center justify-center py-6 sm:py-10 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                    <SiGithub className="h-8 w-8 text-slate-800" />
                  </div>

                  <h3 className="text-lg font-bold text-slate-900">
                    Connect your GitHub account
                  </h3>

                  <p className="mt-2 max-w-md text-xs sm:text-sm leading-relaxed text-slate-500 px-2">
                    Authorize CloudForge to access your GitHub repositories. You can disconnect your account at any time.
                  </p>

                  <button
                    type="button"
                    onClick={handleConnect}
                    className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-xs sm:text-sm font-semibold text-white transition hover:bg-slate-800 shadow-md shadow-slate-900/20"
                  >
                    <SiGithub className="h-4 w-4" />
                    <span>Authorize with GitHub</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div>
                  {/* Connected Account Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 shrink-0">
                        <SiGithub className="h-6 w-6 text-slate-900" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate">
                            {githubUser?.username}
                          </h3>

                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        </div>

                        {githubUser?.email && (
                          <p className="mt-0.5 text-xs text-slate-500 truncate">
                            {githubUser.email}
                          </p>
                        )}
                      </div>
                    </div>

                    <a
                      href={`https://github.com/${githubUser?.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      <span>View GitHub Profile</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  <div className="my-5 sm:my-6 h-px bg-slate-100" />

                  {/* Actions & Disconnect */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-slate-900">
                        GitHub Session Active
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Your account is ready for repository sync and remote publishing.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {disconnecting ? (
                        <Loader2 className="h-4 w-4 animate-spin text-red-600" />
                      ) : (
                        <Unplug className="h-4 w-4" />
                      )}
                      <span>Disconnect Account</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Integration Features Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-2xs">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
              </div>

              <h2 className="text-base font-bold text-slate-900">
                Secure Integration
              </h2>

              <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-slate-500">
                CloudForge uses GitHub OAuth 2.0 with signed token state to authorize repository access securely without handling your GitHub password.
              </p>

              <div className="mt-4 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <p className="text-xs sm:text-sm text-slate-600">
                    Token-based OAuth authorization
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <p className="text-xs sm:text-sm text-slate-600">
                    Direct repository clone & push via API
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <p className="text-xs sm:text-sm text-slate-600">
                    Revoke access anytime with one click
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-2xs">
              <div className="mb-3.5 flex items-center gap-2.5">
                <GitBranch className="h-5 w-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Workspace Features
                </h2>
              </div>

              <p className="text-xs sm:text-sm leading-relaxed text-slate-500">
                Connected projects benefit from full Git commit history graphs, remote sync, automated branch switching, and unified diff inspection.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default GitHub;