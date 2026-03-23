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

function initialsFromEmail(email: string): string {
  const local = email.split('@')[0] || '';
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return local.slice(0, 2).toUpperCase() || '?';
}

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
  const showProStyle = tier === 'PRO' || tier === 'FOUNDER';

  return (
    <>
      <header
        className="fixed top-0 left-0 w-full z-50"
        style={{
          background: 'rgba(6, 6, 8, 0.9)',
          backdropFilter: 'blur(60px)',
          WebkitBackdropFilter: 'blur(60px)',
          borderBottom: '1px solid rgba(255, 106, 0, 0.06)',
        }}
      >
        <div
          className="flex justify-between items-center gap-3 py-3.5 px-6 lg:px-10 mx-auto w-full max-w-[1200px]"
        >
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-3 no-underline shrink-0 min-w-0">
            <div className="relative w-7 h-7 shrink-0 flex items-center justify-center" aria-hidden>
              <div
                className="absolute inset-0 rounded-full border-2 logo-ring-spin"
                style={{
                  borderColor: 'rgba(255, 106, 0, 0.2)',
                  borderTopColor: 'var(--orange)',
                }}
              />
              <span
                className="relative z-[1] w-2 h-2 rounded-full block"
                style={{
                  background: 'var(--orange)',
                  boxShadow: '0 0 12px rgba(255, 106, 0, 0.5)',
                }}
              />
            </div>
            <span
              className="text-base font-medium tracking-wide text-white uppercase logo-wordmark font-orbitron hidden sm:block"
              style={{ letterSpacing: '0.12em' }}
            >
              Luminetic
            </span>
          </Link>

          {/* Desktop nav — text-first HUD */}
          <nav className="hidden lg:flex items-stretch justify-center flex-1 gap-0 min-w-0 mx-4">
            {navLinks.map(({ href, label }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className="relative flex items-center px-3 xl:px-4 py-2.5 text-[11px] tracking-[1.5px] uppercase no-underline font-medium transition-all duration-200 font-outfit"
                  style={{
                    color: isActive ? 'var(--orange)' : 'var(--text-tertiary)',
                    background: isActive ? 'rgba(255, 106, 0, 0.05)' : 'transparent',
                    boxShadow: isActive ? 'inset 0 1px 0 0 var(--orange)' : 'none',
                    fontWeight: 500,
                  }}
                >
                  {label}
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                href="/admin"
                className="relative flex items-center px-3 xl:px-4 py-2.5 text-[11px] tracking-[1.5px] uppercase no-underline font-medium transition-all duration-200 font-outfit"
                style={{
                  color: pathname === '/admin' ? 'var(--orange)' : 'var(--text-tertiary)',
                  background: pathname === '/admin' ? 'rgba(255, 106, 0, 0.05)' : 'transparent',
                  boxShadow: pathname === '/admin' ? 'inset 0 1px 0 0 var(--orange)' : 'none',
                  fontWeight: 500,
                }}
              >
                Admin
              </Link>
            )}
          </nav>

          {/* Right */}
          <div className="flex items-center gap-3 shrink-0">
            <span
              className="hidden sm:inline-flex items-center justify-center rounded-full px-2.5 py-1 font-orbitron uppercase"
              style={{
                fontSize: '9px',
                letterSpacing: '0.2em',
                color: showProStyle ? 'var(--orange)' : 'var(--text-tertiary)',
                border: `1px solid ${showProStyle ? 'rgba(255, 106, 0, 0.45)' : 'var(--glass-border)'}`,
                background: showProStyle ? 'rgba(255, 106, 0, 0.06)' : 'transparent',
              }}
            >
              {tier}
            </span>
            <div
              className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[10px] font-orbitron font-normal tracking-wide"
              style={{
                background: 'var(--glass)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-secondary)',
              }}
              title={email}
            >
              {initialsFromEmail(email)}
            </div>
            <button
              onClick={handleLogout}
              className="hidden md:flex items-center gap-1.5 text-[10px] tracking-[1.5px] uppercase font-medium bg-transparent border-none cursor-pointer px-2 py-1.5 rounded-lg hover-text font-outfit"
              style={{ color: 'var(--text-tertiary)' }}
              type="button"
            >
              <IconLogout width={14} height={14} />
              <span className="hidden xl:inline">Sign out</span>
            </button>

            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg bg-transparent border-none cursor-pointer hover-bg"
              style={{ color: 'var(--text-secondary)' }}
              type="button"
              aria-label="Open menu"
            >
              <IconMenu width={20} height={20} />
            </button>
          </div>
        </div>
      </header>

      <div className={`mobile-drawer ${mobileOpen ? 'open' : ''}`}>
        <div className="mobile-drawer-backdrop" onClick={() => setMobileOpen(false)} role="presentation" />
        <div className="mobile-drawer-panel" style={{ background: 'var(--bg-elevated)' }}>
          <div className="flex items-center justify-between mb-8">
            <span className="text-base font-medium tracking-wide text-white uppercase font-orbitron" style={{ letterSpacing: '0.12em' }}>
              Luminetic
            </span>
            <button
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-transparent border-none cursor-pointer hover-bg"
              style={{ color: 'var(--text-secondary)' }}
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
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-[12px] tracking-[1.5px] uppercase no-underline font-medium transition-all duration-200 font-outfit"
                  style={{
                    color: isActive ? 'var(--orange)' : 'var(--text-secondary)',
                    background: isActive ? 'rgba(255, 106, 0, 0.08)' : 'transparent',
                    boxShadow: isActive ? 'inset 0 1px 0 0 var(--orange)' : 'none',
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
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-[12px] tracking-[1.5px] uppercase no-underline font-medium transition-all duration-200 font-outfit"
                style={{
                  color: pathname === '/admin' ? 'var(--orange)' : 'var(--orange)',
                  background: pathname === '/admin' ? 'rgba(255, 106, 0, 0.08)' : 'transparent',
                }}
              >
                <IconShield width={18} height={18} style={{ opacity: pathname === '/admin' ? 1 : 0.7 }} />
                Admin
              </Link>
            )}
          </nav>

          <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--glass-border)' }}>
            <div className="text-[11px] mb-3 font-outfit" style={{ color: 'var(--text-tertiary)' }}>
              {email}
            </div>
            <button
              onClick={() => {
                setMobileOpen(false);
                handleLogout();
              }}
              className="flex items-center gap-2 text-[11px] tracking-[1.5px] uppercase font-medium bg-transparent border-none cursor-pointer px-0 py-2 hover-text font-outfit"
              style={{ color: 'var(--text-secondary)' }}
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
