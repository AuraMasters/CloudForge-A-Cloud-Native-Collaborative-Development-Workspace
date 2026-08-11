interface EmptyStateProps {
  title: string;
  description: string;
  buttonText?: string;
  onButtonClick?: () => void;
}

function EmptyState({
  title,
  description,
  buttonText,
  onButtonClick,
}: EmptyStateProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl font-semibold">
        +
      </div>

      <h3 className="text-lg font-semibold text-slate-900 mt-5">
        {title}
      </h3>

      <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
        {description}
      </p>

      {buttonText && onButtonClick && (
        <button
          onClick={onButtonClick}
          className="mt-6 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          {buttonText}
        </button>
      )}
    </div>
  );
}

export default EmptyState;