'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#000' }}>
      <div className="text-center max-w-md">
        <div className="w-3 h-3 rounded-full mx-auto mb-6" style={{ background: '#ff6b6b', boxShadow: '0 0 12px rgba(255,107,107,0.4)' }} />
        <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'Sora', sans-serif" }}>
          Something went wrong
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--gray)' }}>
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <button
          onClick={reset}
          className="px-6 py-2.5 text-[11px] tracking-[2px] uppercase font-medium text-white transition-all duration-300"
          style={{ background: 'var(--pink)', border: 'none', cursor: 'pointer' }}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
