'use client';

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="max-w-[600px] mx-auto px-10 py-24 text-center">
      <h1 className="text-2xl font-semibold mb-4" style={{ fontFamily: "var(--font-heading), 'Space Grotesk', sans-serif" }}>
        Something went wrong
      </h1>
      <p className="text-[13px] mb-8" style={{ color: 'var(--gray)' }}>
        We hit an unexpected error loading this page. Please try again.
      </p>
      <button
        onClick={reset}
        className="px-6 py-3 text-[12px] tracking-[2px] uppercase text-white cursor-pointer"
        style={{ background: 'var(--pink)', border: '1px solid var(--pink)' }}
      >
        Try Again
      </button>
    </div>
  );
}
