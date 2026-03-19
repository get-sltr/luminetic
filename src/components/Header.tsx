'use client';

import { useState } from 'react';
import Link from 'next/link';
import { IconMenu, IconX } from '@/components/icons';

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header
      className="fixed top-0 left-0 w-full z-50 animate-jarvis-slide-down"
      style={{
        background: 'rgba(9,9,11,0.8)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="flex justify-between items-center py-4 px-6 md:px-10 lg:px-16 max-w-[1200px] mx-auto w-full">
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <div className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: 'var(--pink)', boxShadow: '0 0 12px var(--pink-dim)' }}
          />
          <span className="text-xl font-bold tracking-tight text-white"
            style={{ fontFamily: "var(--font-heading), 'Space Grotesk', sans-serif" }}
          >
            Luminetic
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/login" className="hover-text text-[13px] tracking-[1.5px] uppercase no-underline"
            style={{ color: 'var(--gray)' }}>
            Log in
          </Link>
          <Link href="/signup"
            className="no-underline text-white text-[11px] tracking-[2px] uppercase font-medium"
            style={{
              background: 'var(--pink)',
              padding: '10px 28px',
              boxShadow: '0 0 20px rgba(255, 45, 120, 0.15)',
            }}>
            Get Started
          </Link>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden bg-transparent border-none cursor-pointer p-1"
          style={{ color: 'var(--gray)' }}
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <IconMenu width={24} height={24} />
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[100]" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
          <nav
            className="absolute top-0 right-0 h-full w-[280px] flex flex-col p-8 gap-6"
            style={{ background: 'var(--surface-0)', borderLeft: '1px solid var(--border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="self-end bg-transparent border-none cursor-pointer p-1 mb-4"
              style={{ color: 'var(--gray)' }}
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <IconX width={20} height={20} />
            </button>
            <Link href="/login" className="hover-text text-[15px] no-underline" style={{ color: 'var(--gray)' }}
              onClick={() => setMobileOpen(false)}>
              Log in
            </Link>
            <Link href="/signup"
              className="no-underline text-white text-[12px] tracking-[2px] uppercase font-medium text-center mt-4"
              style={{ background: 'var(--pink)', padding: '14px 24px' }}
              onClick={() => setMobileOpen(false)}>
              Get Started
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
