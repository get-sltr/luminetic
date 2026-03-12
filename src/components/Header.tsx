'use client';

import Link from 'next/link';

export default function Header() {
  return (
    <header
      className="fixed top-0 left-0 w-full z-50 bg-black/60 backdrop-blur-[20px] border-b border-white/[0.08] animate-jarvis-slide-down"
    >
      <div
        className="flex justify-between items-center py-6 px-10"
        style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}
      >
      <Link href="/" className="flex items-center gap-2 no-underline">
        <div
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ background: 'var(--pink)', boxShadow: '0 0 12px var(--pink-dim)' }}
        />
        <span
          className="text-[22px] font-bold tracking-tight text-white"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          Luminetic
        </span>
      </Link>

      <nav className="flex items-center gap-9">
        {['Features', 'Pricing', 'Docs'].map((label) => (
          <Link
            key={label}
            href={`#${label.toLowerCase()}`}
            className="group relative text-[13px] font-normal tracking-[1.5px] uppercase no-underline transition-all duration-300 hidden md:inline"
            style={{ color: 'var(--gray)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--white)';
              e.currentTarget.style.textShadow = '0 0 20px rgba(255,255,255,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--gray)';
              e.currentTarget.style.textShadow = 'none';
            }}
          >
            {label}
            <span
              className="absolute bottom-[-4px] left-0 h-px w-0 group-hover:w-full transition-all duration-300"
              style={{ background: 'var(--pink)', boxShadow: '0 0 8px var(--pink-dim)' }}
            />
          </Link>
        ))}
        <Link
          href="/signup"
          className="px-5 py-2 text-[12px] tracking-[1.5px] uppercase text-white border transition-all duration-300 no-underline hover:shadow-[0_0_30px_var(--pink-glow)]"
          style={{ borderColor: 'var(--pink)', background: 'transparent' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--pink)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          Get Started
        </Link>
      </nav>
      </div>
    </header>
  );
}
