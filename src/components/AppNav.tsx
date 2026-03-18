'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  IconDashboard,
  IconAnalyze,
  IconChecklist,
  IconPacket,
  IconMemory,
  IconHistory,
  IconMenu,
  IconX,
  IconLogout,
} from '@/components/icons';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', Icon: IconDashboard },
  { href: '/analyze', label: 'Analyze', Icon: IconAnalyze },
  { href: '/completeness', label: 'Pre-Flight', Icon: IconChecklist },
  { href: '/review-packet', label: 'Packet', Icon: IconPacket },
  { href: '/memory', label: 'Memory', Icon: IconMemory },
  { href: '/history', label: 'History', Icon: IconHistory },
];

export default function AppNav({ email, plan }: { email: string; plan: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  const planColors: Record<string, { text: string; border: string; bg: string }> = {
    founder: { text: '#a78bfa', border: 'rgba(167, 139, 250, 0.3)', bg: 'rgba(167, 139, 250, 0.06)' },
    pro: { text: 'var(--pink)', border: 'var(--pink-dim)', bg: 'rgba(255, 45, 120, 0.06)' },
    indie: { text: '#34d399', border: 'rgba(52, 211, 153, 0.3)', bg: 'rgba(52, 211, 153, 0.06)' },
    free: { text: 'var(--gray)', border: 'var(--border)', bg: 'transparent' },
  };

  const pc = planColors[plan] || planColors.free;

  return (
    <>
      <header
        className="fixed top-0 left-0 w-full z-50"
        style={{
          background: 'rgba(9, 9, 11, 0.85)',
          backdropFilter: 'blur(24px) saturate(1.2)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {/* Top accent line */}
        <div className="glow-line" />

        <div
          className="flex justify-between items-center py-4 px-6 md:px-10"
          style={{ maxWidth: '1100px', margin: '0 auto' }}
        >
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5 no-underline group">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: 'var(--pink)',
                boxShadow: '0 0 8px var(--pink-dim)',
              }}
            />
            <span
              className="text-lg font-bold tracking-tight text-white"
              style={{ fontFamily: "var(--font-heading), 'Space Grotesk', sans-serif" }}
            >
              Luminetic
            </span>
          </Link>

          {/* Nav Links - Desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label, Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-[11px] tracking-[1.5px] uppercase no-underline font-medium transition-all duration-200 ${
                    isActive ? '' : 'hover-text'
                  }`}
                  style={{
                    color: isActive ? 'var(--white)' : 'var(--gray)',
                    background: isActive ? 'var(--surface-2)' : 'transparent',
                  }}
                >
                  <Icon width={14} height={14} style={{ opacity: isActive ? 1 : 0.5 }} />
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
              className="badge"
              style={{
                color: pc.text,
                borderColor: pc.border,
                background: pc.bg,
                fontSize: '9px',
                letterSpacing: '2px',
              }}
            >
              {plan}
            </span>
            <span
              className="text-[11px] hidden lg:block"
              style={{ color: 'var(--text-muted)' }}
            >
              {email}
            </span>
            <button
              onClick={handleLogout}
              className="hidden md:flex items-center gap-1.5 text-[10px] tracking-[1.5px] uppercase font-medium bg-transparent border-none cursor-pointer px-3 py-1.5 rounded-lg hover-text hover-bg"
              style={{ color: 'var(--gray)' }}
            >
              <IconLogout width={14} height={14} />
              Sign out
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg bg-transparent border-none cursor-pointer hover-bg"
              style={{ color: 'var(--gray)' }}
            >
              <IconMenu width={20} height={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <div className={`mobile-drawer ${mobileOpen ? 'open' : ''}`}>
        <div className="mobile-drawer-backdrop" onClick={() => setMobileOpen(false)} />
        <div className="mobile-drawer-panel">
          <div className="flex items-center justify-between mb-8">
            <span
              className="text-lg font-bold tracking-tight text-white"
              style={{ fontFamily: "var(--font-heading), 'Space Grotesk', sans-serif" }}
            >
              Luminetic
            </span>
            <button
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-transparent border-none cursor-pointer hover-bg"
              style={{ color: 'var(--gray)' }}
            >
              <IconX width={20} height={20} />
            </button>
          </div>

          <nav className="flex flex-col gap-1">
            {navLinks.map(({ href, label, Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[12px] tracking-[1.5px] uppercase no-underline font-medium transition-all duration-200 ${
                    isActive ? '' : 'hover-bg'
                  }`}
                  style={{
                    color: isActive ? 'var(--white)' : 'var(--gray)',
                    background: isActive ? 'var(--surface-2)' : 'transparent',
                  }}
                >
                  <Icon width={18} height={18} style={{ opacity: isActive ? 1 : 0.5 }} />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="text-[11px] mb-3" style={{ color: 'var(--text-muted)' }}>
              {email}
            </div>
            <button
              onClick={() => { setMobileOpen(false); handleLogout(); }}
              className="flex items-center gap-2 text-[11px] tracking-[1.5px] uppercase font-medium bg-transparent border-none cursor-pointer px-0 py-2 hover-text"
              style={{ color: 'var(--gray)' }}
            >
              <IconLogout width={16} height={16} />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
