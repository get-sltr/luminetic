'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/analyze', label: 'Analyze' },
  { href: '/completeness', label: 'Pre-Flight' },
  { href: '/review-packet', label: 'Packet' },
  { href: '/memory', label: 'Memory' },
  { href: '/history', label: 'History' },
];

export default function AppNav({ email, plan }: { email: string; plan: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  const planColors: Record<string, { text: string; border: string; bg: string }> = {
    founder: { text: '#a78bfa', border: 'rgba(167, 139, 250, 0.3)', bg: 'rgba(167, 139, 250, 0.06)' },
    pro: { text: 'var(--pink)', border: 'var(--pink-dim)', bg: 'rgba(255, 45, 120, 0.06)' },
    indie: { text: '#34d399', border: 'rgba(52, 211, 153, 0.3)', bg: 'rgba(52, 211, 153, 0.06)' },
    free: { text: 'var(--gray)', border: 'var(--panel-border)', bg: 'transparent' },
  };

  const pc = planColors[plan] || planColors.free;

  return (
    <header
      className="fixed top-0 left-0 w-full z-50"
      style={{
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(24px) saturate(1.2)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 w-full h-[1px]"
        style={{
          background: 'linear-gradient(90deg, transparent, var(--pink-dim), transparent)',
          opacity: 0.5,
        }}
      />

      <div
        className="flex justify-between items-center py-4 px-6 md:px-10"
        style={{ maxWidth: '1100px', margin: '0 auto' }}
      >
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 no-underline group">
          <div
            className="w-2 h-2 rounded-full transition-shadow duration-300"
            style={{
              background: 'var(--pink)',
              boxShadow: '0 0 8px var(--pink-dim)',
            }}
          />
          <span
            className="text-lg font-bold tracking-tight text-white"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Luminetic
          </span>
        </Link>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, label }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="relative px-3.5 py-2 rounded-md text-[11px] tracking-[1.5px] uppercase no-underline font-medium transition-all duration-200"
                style={{
                  color: isActive ? 'var(--white)' : 'var(--gray)',
                  background: isActive ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                }}
              >
                {isActive && (
                  <span
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[2px] rounded-full"
                    style={{ background: 'var(--pink)', boxShadow: '0 0 6px var(--pink-dim)' }}
                  />
                )}
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          <span
            className="text-[9px] tracking-[2px] uppercase px-2.5 py-1 rounded font-semibold"
            style={{
              color: pc.text,
              border: `1px solid ${pc.border}`,
              background: pc.bg,
            }}
          >
            {plan}
          </span>
          <span
            className="text-[11px] hidden lg:block"
            style={{ color: 'rgba(136, 136, 136, 0.7)' }}
          >
            {email}
          </span>
          <button
            onClick={handleLogout}
            className="text-[10px] tracking-[1.5px] uppercase font-medium transition-all duration-200 bg-transparent border-none cursor-pointer px-3 py-1.5 rounded"
            style={{ color: 'var(--gray)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--white)';
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--gray)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
