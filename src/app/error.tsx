'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">Error inesperado / Unexpected Error</h2>
        <p className="text-sm text-gray-400">{error.message || 'Ha ocurrido un error.'}</p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-amber-500 text-slate-950 rounded-xl font-bold text-sm hover:bg-amber-400 transition-colors"
        >
          Reintentar / Retry
        </button>
      </div>
    </div>
  );
}
