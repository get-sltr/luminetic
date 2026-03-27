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
  IconShield,
} from '@/components/icons';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', Icon: IconDashboard },
  { href: '/analyze', label: 'Analyze', Icon: IconAnalyze },
  { href: '/completeness', label: 'Pre-Flight', Icon: IconChecklist },
  { href: '/review-packet', label: 'Packet', Icon: IconPacket },
  { href: '/memory', label: 'Memory', Icon: IconMemory },
  { href: '/history', label: 'History', Icon: IconHistory },
];

function tierLabel(plan: string, isAdmin: boolean): string {
  if (isAdmin) return 'FOUNDER';
  if (plan === 'pro' || plan === 'agency' || plan === 'indie') return 'PRO';
  if (plan === 'founder') return 'FOUNDER';
  return 'FREE';
}

export default function AppNav({ email, plan, role = 'user' }: { email: string; plan: string; role?: string }) {
  const isAdmin = role === 'founder' || role === 'admin';
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  const tier = tierLabel(plan, isAdmin);

  return (
    <>
      <header
        className="fixed top-0 left-0 w-full z-50"
        style={{
          borderBottom: '2px solid var(--orange)',
          background: 'rgba(5, 5, 5, 0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        {/* Orange glow under nav */}
        <div
          style={{
            position: 'absolute',
            bottom: -12,
            left: 0,
            right: 0,
            height: 10,
            background: 'linear-gradient(to bottom, rgba(255,106,0,0.06), transparent)',
            pointerEvents: 'none',
          }}
        />

        <div className="flex items-center py-3 px-8 lg:px-12 mx-auto w-full max-w-[1400px]">
          {/* Logo */}
          <Link href="/dashboard" className="no-underline shrink-0 flex items-center">
            <span
              style={{
                fontFamily: "var(--display)",
                fontSize: '1.6rem',
                letterSpacing: 4,
                color: 'var(--orange)',
                lineHeight: 1,
              }}
            >
              LUMINETIC
              <span style={{ animation: 'blink 1s step-end infinite', color: 'var(--orange)' }}>_</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <nav className="nav-links-brutalist hidden lg:flex">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                data-active={pathname === href}
              >
                {label}
              </Link>
            ))}
            {isAdmin && (
              <Link href="/admin" data-active={pathname === '/admin'}>
                Admin
              </Link>
            )}
          </nav>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-4">
            <span className="badge-brutalist hidden sm:inline-flex items-center">
              {tier}
            </span>
            <button
              onClick={handleLogout}
              className="btn-secondary hidden md:inline-flex items-center gap-1.5"
              type="button"
            >
              Sign out
            </button>
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden flex items-center justify-center w-9 h-9 bg-transparent border-none cursor-pointer hover-bg"
              style={{ color: 'var(--text-mid)' }}
              type="button"
              aria-label="Open menu"
            >
              <IconMenu width={20} height={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <div className={`mobile-drawer ${mobileOpen ? 'open' : ''}`}>
        <div className="mobile-drawer-backdrop" onClick={() => setMobileOpen(false)} role="presentation" />
        <div className="mobile-drawer-panel" style={{ background: 'var(--bg-elevated)' }}>
          <div className="flex items-center justify-between mb-8">
            <span
              style={{
                fontFamily: "var(--display)",
                fontSize: '1.4rem',
                letterSpacing: 3,
                color: 'var(--orange)',
                textTransform: 'uppercase',
              }}
            >
              LUMINETIC
            </span>
            <button
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center w-9 h-9 bg-transparent border-none cursor-pointer hover-bg"
              style={{ color: 'var(--text-mid)' }}
              type="button"
              aria-label="Close menu"
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
                  className="flex items-center gap-3 px-4 py-3 text-[12px] tracking-[1.5px] uppercase no-underline transition-all duration-200"
                  style={{
                    fontFamily: 'var(--mono)',
                    color: isActive ? 'var(--orange)' : 'var(--text-mid)',
                    background: isActive ? 'rgba(255, 106, 0, 0.08)' : 'transparent',
                    borderLeft: isActive ? '2px solid var(--orange)' : '2px solid transparent',
                  }}
                >
                  <Icon width={18} height={18} style={{ opacity: isActive ? 1 : 0.5 }} />
                  {label}
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-[12px] tracking-[1.5px] uppercase no-underline transition-all duration-200"
                style={{
                  fontFamily: 'var(--mono)',
                  color: pathname === '/admin' ? 'var(--orange)' : 'var(--orange)',
                  background: pathname === '/admin' ? 'rgba(255, 106, 0, 0.08)' : 'transparent',
                  borderLeft: pathname === '/admin' ? '2px solid var(--orange)' : '2px solid transparent',
                }}
              >
                <IconShield width={18} height={18} style={{ opacity: pathname === '/admin' ? 1 : 0.7 }} />
                Admin
              </Link>
            )}
          </nav>

          <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="text-[11px] mb-3" style={{ fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>
              {email}
            </div>
            <button
              onClick={() => {
                setMobileOpen(false);
                handleLogout();
              }}
              className="flex items-center gap-2 text-[11px] tracking-[1.5px] uppercase bg-transparent border-none cursor-pointer px-0 py-2 hover-text"
              style={{ fontFamily: 'var(--mono)', color: 'var(--text-mid)' }}
              type="button"
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
