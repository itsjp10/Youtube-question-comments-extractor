interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  compact?: boolean;
}

export function ErrorState({ message, onRetry, compact }: ErrorStateProps) {
  if (compact) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <span className="mt-0.5">⚠️</span>
        <div className="flex-1">
          <p>{message}</p>
          {onRetry ? (
            <button type="button" onClick={onRetry} className="mt-1 font-medium underline">
              Reintentar
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-xl">⚠️</div>
      <div>
        <p className="text-sm font-semibold text-slate-900">Algo salió mal</p>
        <p className="mt-1 text-sm text-slate-500">{message}</p>
      </div>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="btn-secondary">
          Reintentar
        </button>
      ) : null}
    </div>
  );
}
