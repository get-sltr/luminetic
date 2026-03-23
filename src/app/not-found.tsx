import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--black)' }}>
      <div className="text-center max-w-md">
        <div className="text-[80px] font-bold mb-4 bg-clip-text text-transparent"
          style={{ backgroundImage: 'var(--gradient-accent)', WebkitBackgroundClip: 'text', fontFamily: "var(--font-heading)" }}>
          404
        </div>
        <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "var(--font-heading)" }}>
          Page not found
        </h2>
        <p className="text-sm mb-8" style={{ color: 'var(--gray)' }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link href="/dashboard" className="btn-primary px-8 py-3 text-[12px] tracking-[2px] uppercase no-underline inline-block">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
