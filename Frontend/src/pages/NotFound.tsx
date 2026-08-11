import { Link } from "react-router-dom";

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-200 px-6">
      <div className="text-center max-w-md relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[300px] bg-blue-400/20 blur-[100px] rounded-full pointer-events-none"></div>
        
        <div className="relative z-10">
          <h1 className="text-9xl font-extrabold text-blue-600 tracking-tighter">
            404
          </h1>
          
          <h2 className="mt-4 text-3xl font-bold text-slate-900 tracking-tight">
            Page not found
          </h2>
          
          <p className="mt-4 text-slate-500 leading-relaxed font-medium">
            Sorry, we couldn't find the page you're looking for. It might have been moved, deleted, or perhaps it never existed.
          </p>
          
          <div className="mt-10">
            <Link
              to="/"
              className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NotFound;