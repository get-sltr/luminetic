import Link from 'next/link';

export default function Footer() {
  return (
    <footer
      className="relative z-[1] border-t"
      style={{ borderImage: 'var(--gradient-accent) 1', borderImageSlice: 1 }}
    >
      <div className="max-w-[1200px] mx-auto px-6 md:px-16 lg:px-24 py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {/* Left: Logo + tagline */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: 'var(--orange)', boxShadow: '0 0 10px var(--orange)' }}
              />
              <span
                className="text-lg font-bold tracking-tight text-white"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Luminetic
              </span>
            </div>
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--gray)' }}>
              AI-powered App Store submission intelligence
            </p>
          </div>

          {/* Middle: Product links */}
          <div className="flex flex-col gap-3">
            <h4
              className="text-[11px] tracking-[3px] uppercase font-medium mb-1"
              style={{ color: 'var(--gray-dim)' }}
            >
              Product
            </h4>
            {[
              { label: 'Features', href: '#features' },
              { label: 'Pricing', href: '#pricing' },
              { label: 'Login', href: '/login' },
              { label: 'Sign Up', href: '/signup' },
            ].map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="hover-text text-[13px] no-underline transition-colors duration-300"
                style={{ color: 'var(--gray)' }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right: Legal */}
          <div className="flex flex-col gap-3">
            <h4
              className="text-[11px] tracking-[3px] uppercase font-medium mb-1"
              style={{ color: 'var(--gray-dim)' }}
            >
              Company
            </h4>
            <span className="text-[13px]" style={{ color: 'var(--gray)' }}>
              SLTR Digital LLC
            </span>
            <span className="text-[13px]" style={{ color: 'var(--gray-dim)' }}>
              &copy; 2026 Luminetic. All rights reserved.
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
