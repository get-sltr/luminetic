'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--black)' }}>
      <div className="text-center max-w-md">
        <div className="w-3 h-3 rounded-full mx-auto mb-6" style={{ background: 'var(--red)', boxShadow: '0 0 12px rgba(248,113,113,0.4)' }} />
        <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "var(--font-heading)" }}>
          Something went wrong
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--gray)' }}>
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <button
          onClick={reset}
          className="btn-primary px-8 py-3 text-[12px] tracking-[2px] uppercase"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
