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

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-black/80 backdrop-blur-[20px] border-b border-white/[0.08]">
      <div className="flex justify-between items-center py-4 px-10" style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <Link href="/dashboard" className="flex items-center gap-2 no-underline">
          <div className="w-2 h-2 rounded-full" style={{ background: 'var(--pink)', boxShadow: '0 0 12px var(--pink-dim)' }} />
          <span className="text-[20px] font-bold tracking-tight text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Luminetic
          </span>
        </Link>

        <nav className="flex items-center gap-8">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-[12px] tracking-[1.5px] uppercase no-underline transition-colors duration-200"
              style={{ color: pathname === href ? 'var(--white)' : 'var(--gray)' }}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <span
              className="text-[9px] tracking-[2px] uppercase px-2 py-1"
              style={{
                color: plan === 'pro' ? 'var(--pink)' : 'var(--gray)',
                border: `1px solid ${plan === 'pro' ? 'var(--pink-dim)' : 'var(--panel-border)'}`,
              }}
            >
              {plan}
            </span>
            <span className="text-[12px] hidden md:block" style={{ color: 'var(--gray)' }}>
              {email}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="text-[11px] tracking-[1.5px] uppercase transition-colors duration-200 bg-transparent border-none cursor-pointer"
            style={{ color: 'var(--gray)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--white)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--gray)')}
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
