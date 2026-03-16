import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#000' }}>
      <div className="text-center max-w-md">
        <div className="text-[72px] font-bold mb-2" style={{ color: 'var(--pink)', fontFamily: "'Sora', sans-serif" }}>
          404
        </div>
        <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'Sora', sans-serif" }}>
          Page not found
        </h2>
        <p className="text-sm mb-8" style={{ color: 'var(--gray)' }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="px-6 py-2.5 text-[11px] tracking-[2px] uppercase font-medium text-white transition-all duration-300 inline-block"
          style={{ background: 'var(--pink)', textDecoration: 'none' }}
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
