interface LoadingSpinnerProps {
  text?: string;
  fullScreen?: boolean;
}

function LoadingSpinner({
  text = "Loading...",
  fullScreen = false,
}: LoadingSpinnerProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center ${
        fullScreen ? "min-h-screen" : "py-12"
      }`}
    >
      <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />

      {text && (
        <p className="mt-4 text-sm font-medium text-slate-500">
          {text}
        </p>
      )}
    </div>
  );
}

export default LoadingSpinner;