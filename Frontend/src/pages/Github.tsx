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
    checkGitHubStatus();
  }, []);

  const checkGitHubStatus = async () => {
    try {
      setLoading(true);
      setError("");

      const data: GitHubStatusResponse =
        await githubApi.getStatus();

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
    <div className="min-h-screen bg-slate-50">
      <Navbar user={user} />

      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        {/* Header */}
        <section className="mb-10">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900">
                  <SiGithub className="h-5 w-5 text-white" />
                </div>

                <span className="text-sm font-medium text-slate-500">
                  Integrations
                </span>
              </div>

              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                GitHub
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Connect your GitHub account to securely access
                repositories and integrate your development
                workflow with CloudForge.
              </p>
            </div>

            {connected && (
              <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 sm:flex">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Connected
              </div>
            )}
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Main Grid */}
        <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          {/* Connection Card */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    GitHub connection
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Manage the GitHub account connected to
                    your CloudForge workspace.
                  </p>
                </div>

                <SiGithub className="h-5 w-5 text-slate-400" />
              </div>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="flex min-h-[180px] items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              ) : !connected ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                    <SiGithub className="h-8 w-8 text-slate-800" />
                  </div>

                  <h3 className="text-lg font-semibold text-slate-900">
                    Connect your GitHub account
                  </h3>

                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                    Authorize CloudForge to access your
                    GitHub repositories. You can disconnect
                    your account at any time.
                  </p>

                  <button
                    type="button"
                    onClick={handleConnect}
                    className="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    <SiGithub className="h-4 w-4" />
                    Connect GitHub
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                        <SiGithub className="h-6 w-6 text-slate-900" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900">
                            {githubUser?.username}
                          </h3>

                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            Connected
                          </span>
                        </div>

                        {githubUser?.email && (
                          <p className="mt-1 text-sm text-slate-500">
                            {githubUser.email}
                          </p>
                        )}
                      </div>
                    </div>

                    <a
                      href={`https://github.com/${githubUser?.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hidden items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900 sm:flex"
                    >
                      View profile
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  <div className="my-6 h-px bg-slate-100" />

                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        GitHub account
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Your account is ready to access
                        repositories.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {disconnecting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Unplug className="h-4 w-4" />
                      )}

                      Disconnect
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Integration Information */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
              </div>

              <h2 className="text-base font-semibold text-slate-900">
                Secure integration
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                CloudForge uses GitHub OAuth to authorize
                access without asking for your GitHub
                password.
              </p>

              <div className="mt-5 space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />

                  <p className="text-sm text-slate-600">
                    OAuth-based authentication
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />

                  <p className="text-sm text-slate-600">
                    Repository access through GitHub API
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />

                  <p className="text-sm text-slate-600">
                    Connection can be revoked anytime
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <GitBranch className="h-5 w-5 text-slate-700" />

                <h2 className="text-base font-semibold text-slate-900">
                  What's next?
                </h2>
              </div>

              <p className="text-sm leading-6 text-slate-500">
                Once your account is connected, CloudForge
                can load your repositories and let you select
                a project for deployment and cloud management.
              </p>

              <div className="mt-5 rounded-lg bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Coming next
                </p>

                <p className="mt-1 text-sm font-medium text-slate-700">
                  Repository selection & deployment
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default GitHub;