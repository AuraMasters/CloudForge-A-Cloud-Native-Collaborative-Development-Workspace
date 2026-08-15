import { Link } from "react-router-dom";
import { useAlert } from "../hooks/useAlert";
import { ArrowRight, Sparkles, Code2, GitBranch, Terminal } from "lucide-react";

function Home() {
  const { showSuccess } = useAlert();

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-200">
      {/* Navigation */}
      <nav className="flex-none h-16 px-4 sm:px-6 lg:px-8 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 font-extrabold text-white text-xs shadow-md shadow-blue-500/20">
            CF
          </div>
          <span>
            Cloud<span className="text-blue-600 font-extrabold">Forge</span>
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/login"
            className="px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none"
          >
            Sign in
          </Link>

          <Link
            to="/register"
            className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/20 focus:outline-none"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[600px] h-[300px] sm:h-[400px] bg-blue-400/20 blur-[100px] sm:blur-[140px] rounded-full pointer-events-none" />

        <div className="max-w-4xl w-full text-center relative z-10 py-8 sm:py-12 px-2">
          {/* Badge */}
          <div 
            onClick={() => showSuccess("Welcome to CloudForge!")}
            className="inline-flex cursor-pointer items-center gap-2 px-3.5 py-1.5 mb-6 sm:mb-8 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold tracking-wide uppercase shadow-2xs hover:bg-blue-100 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Cloud-Native Collaborative Workspace</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.15] mb-4 sm:mb-6 text-slate-900">
            Build and collaborate <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700">
              in the cloud.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed mb-8 sm:mb-10 px-2">
            CloudForge delivers isolated cloud development environments, GitHub version control, live collaboration, and interactive container terminals directly in your browser.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto sm:max-w-none">
            <Link
              to="/register"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <span>Get Started for Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/login"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 hover:text-slate-900 transition-all shadow-2xs text-sm sm:text-base text-center"
            >
              Sign In to Workspace
            </Link>
          </div>

          {/* Feature Highlights Grid */}
          <div className="mt-12 sm:mt-16 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-left max-w-3xl mx-auto">
            <div className="p-4 rounded-2xl bg-white/80 backdrop-blur-xs border border-slate-200/80 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5">
                <Code2 className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-xs sm:text-sm text-slate-900">Multi-Language IDE</h3>
              <p className="text-slate-500 text-xs mt-1">React, Node, Python, and full-stack templates ready instantly.</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/80 backdrop-blur-xs border border-slate-200/80 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5">
                <GitBranch className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-xs sm:text-sm text-slate-900">GitHub Remote Sync</h3>
              <p className="text-slate-500 text-xs mt-1">Branch switcher, commit timeline, diff viewer, and 1-click publishing.</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/80 backdrop-blur-xs border border-slate-200/80 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5">
                <Terminal className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-xs sm:text-sm text-slate-900">Cloud Terminal</h3>
              <p className="text-slate-500 text-xs mt-1">Interactive containerized shell and real-time git execution logs.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Home;