import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { SiGithub } from "react-icons/si";
import { Menu, X, LogOut, LayoutDashboard, FolderCode } from "lucide-react";
import { useAlert } from "../../hooks/useAlert";
import API_URL from "../../config/api";

interface NavbarProps {
  user: {
    name: string;
    email: string;
  } | null;
}

function Navbar({ user }: NavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess, showError } = useAlert();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      showSuccess("Successfully signed out");
      navigate("/login");
    } catch (error) {
      showError("Failed to sign out. Please try again.");
    }
  };

  const navLinks = [
    { label: "Dashboard", path: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: "Projects", path: "/projects", icon: <FolderCode className="w-4 h-4" /> },
    { label: "GitHub", path: "/github", icon: <SiGithub className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand & Desktop Links */}
        <div className="flex items-center gap-6 sm:gap-8">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 focus:outline-none"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 font-extrabold text-white text-xs shadow-md shadow-blue-500/20">
              CF
            </div>
            <span>
              Cloud<span className="text-blue-600 font-extrabold">Forge</span>
            </span>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-600 font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {link.icon}
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side items */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick GitHub button for desktop/tablet */}
          <button
            onClick={() => navigate("/github")}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-2xs"
            title="GitHub Settings"
          >
            <SiGithub className="w-3.5 h-3.5 text-slate-800" />
            <span>GitHub</span>
          </button>

          {/* User info */}
          <div className="hidden lg:block text-right">
            <p className="text-xs font-bold text-slate-900 max-w-[150px] truncate">
              {user?.name || "User"}
            </p>
            <p className="text-[10px] text-slate-500 max-w-[150px] truncate">
              {user?.email || ""}
            </p>
          </div>

          {/* User Avatar */}
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold uppercase shrink-0 shadow-2xs"
            title={user?.name || "User Account"}
          >
            {user?.name?.charAt(0) || "U"}
          </div>

          {/* Desktop Sign Out Button */}
          <button
            onClick={handleLogout}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all shadow-2xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>

          {/* Mobile Hamburger Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-4 shadow-lg animate-in slide-in-from-top-2">
          {/* User Profile summary on mobile */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-sm">
              {user?.name?.charAt(0) || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm text-slate-900 truncate">
                {user?.name || "User"}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {user?.email || "Signed in"}
              </p>
            </div>
          </div>

          {/* Navigation links on mobile */}
          <div className="space-y-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700 font-bold"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {link.icon}
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate("/github");
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <SiGithub className="w-3.5 h-3.5" />
              <span>GitHub Integration</span>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              className="flex items-center justify-center gap-1.5 py-2 px-4 text-xs font-semibold rounded-xl bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;