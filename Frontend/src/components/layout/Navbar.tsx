import { useNavigate } from "react-router-dom";
import { SiGithub } from "react-icons/si";
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
  const { showSuccess, showError } = useAlert();

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

  return (
    <nav className="h-16 px-6 lg:px-8 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-50">
      <button
        onClick={() => navigate("/dashboard")}
        className="text-xl font-semibold tracking-tight"
      >
        Cloud<span className="text-blue-600 font-bold">Forge</span>
      </button>

      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/github")}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all"
        >
          <SiGithub className="w-4 h-4" />
          <span className="hidden sm:inline">
            GitHub
          </span>
        </button>

        <div className="hidden sm:block text-right">
          <p className="text-sm font-semibold text-slate-800">
            {user?.name || "User"}
          </p>

          <p className="text-xs text-slate-500">
            {user?.email || ""}
          </p>
        </div>

        <div className="h-9 w-9 rounded-full bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-bold uppercase">
          {user?.name?.charAt(0) || "?"}
        </div>

        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}

export default Navbar;