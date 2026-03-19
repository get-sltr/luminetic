'use client';

import { useState } from 'react';
import Link from 'next/link';
import Footer from '@/components/Footer';

const tiers = [
  {
    id: 'starter',
    name: 'Starter',
    price: '15',
    scans: '1 scan',
    features: [
      'Dual-model AI analysis',
      'Pre-flight submission checklist',
      'Review packet generator',
      'Action plan with priorities',
      'Readiness score out of 100',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '40',
    scans: '3 scans',
    featured: true,
    features: [
      'Everything in Starter',
      'Maestro & Detox test generation',
      'Build Memory intelligence',
      'Score trend tracking',
      'Priority issue detection',
    ],
  },
  {
    id: 'agency',
    name: 'Agency',
    price: '119',
    scans: '10 scans',
    features: [
      'Everything in Pro',
      'Multi-app support',
      'Priority analysis queue',
      'Team-ready review packets',
      'Bulk submission workflow',
    ],
  },
];

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function handleBuy(packId: string) {
    setLoading(packId);
    setError('');

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId }),
      });

      if (res.status === 401) {
        // Not logged in — redirect to signup
        window.location.href = '/signup';
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Checkout failed.');
        setLoading(null);
        return;
      }

      // Redirect to Square checkout
      window.location.href = data.url;
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(null);
    }
  }

  return (
    <div style={{ background: 'var(--black)' }}>
      <div className="grid-bg" />

      {/* Simple nav — just logo */}
      <header className="fixed top-0 left-0 w-full z-50" style={{ background: 'rgba(9,9,11,0.8)', backdropFilter: 'blur(24px)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center py-4 px-6 md:px-12 lg:px-20">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <div className="w-2 h-2 rounded-full" style={{ background: 'var(--pink)', boxShadow: '0 0 12px var(--pink-dim)' }} />
            <span className="text-xl font-bold tracking-tight text-white">Luminetic</span>
          </Link>
        </div>
      </header>

      <main className="min-h-screen flex flex-col items-center justify-center px-6 md:px-16 lg:px-24 pt-[120px] pb-[120px]">
        {/* Header area */}
        <div className="mb-[40px] text-center">
          <div
            className="text-[14px] font-medium tracking-[6px] uppercase mb-10"
            style={{ color: 'var(--pink)' }}
          >
            Pricing
          </div>
          <h1
            className="text-[14px] font-medium tracking-[6px] uppercase"
            style={{ color: 'var(--white)' }}
          >
            Pay per scan &mdash; No subscription
          </h1>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 text-[12px] text-center" style={{ color: 'var(--red)', background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.12)' }}>
            {error}
          </div>
        )}

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[1px] w-full" style={{ background: 'var(--border)' }}>
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className="relative flex flex-col"
              style={{
                background: tier.featured
                  ? 'rgba(255, 45, 120, 0.03)'
                  : 'var(--black)',
                padding: '56px 48px',
              }}
            >
              {/* Top glow for featured */}
              {tier.featured && (
                <div
                  className="absolute top-0 left-0 right-0 h-px"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(255, 45, 120, 0.5), transparent)' }}
                />
              )}

              {/* Tier name */}
              <div
                className="text-[11px] font-bold tracking-[4px] uppercase mb-12"
                style={{ color: tier.featured ? 'var(--pink)' : 'var(--white)' }}
              >
                {tier.name}
              </div>

              {/* Price */}
              <div className="mb-4">
                <span className="text-[11px] tracking-[2px] align-top" style={{ color: 'var(--gray)' }}>$</span>
                <span className="text-[56px] font-light tracking-tight leading-none" style={{ color: 'var(--white)' }}>
                  {tier.price}
                </span>
              </div>

              {/* Scans */}
              <div
                className="text-[10px] tracking-[3px] uppercase mb-16"
                style={{ color: 'var(--gray)' }}
              >
                {tier.scans}
              </div>

              {/* Features */}
              <ul className="flex flex-col gap-6 mb-16 flex-1 list-none p-0 m-0">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-5 text-[11px] tracking-[1px] leading-relaxed"
                    style={{ color: 'var(--gray)' }}
                  >
                    <span
                      className="shrink-0 mt-[6px] w-[3px] h-[3px]"
                      style={{ background: tier.featured ? 'var(--pink)' : 'rgba(255,255,255,0.15)' }}
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA — tries checkout first, falls back to signup */}
              <button
                onClick={() => handleBuy(tier.id)}
                disabled={loading !== null}
                className="block w-full text-center text-[10px] tracking-[3px] uppercase font-medium cursor-pointer"
                style={{
                  color: loading === tier.id ? 'var(--gray)' : tier.featured ? 'var(--white)' : 'var(--gray)',
                  background: 'transparent',
                  border: tier.featured
                    ? '1px solid rgba(255, 45, 120, 0.4)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '20px',
                  boxShadow: tier.featured
                    ? '0 0 30px rgba(255, 45, 120, 0.1)'
                    : 'none',
                  transition: 'all 0.3s ease',
                  opacity: loading !== null && loading !== tier.id ? 0.4 : 1,
                }}
              >
                {loading === tier.id ? 'Processing...' : 'Get Started'}
              </button>
            </div>
          ))}
        </div>

        {/* Below cards */}
        <p
          className="text-[13px] font-bold tracking-[4px] uppercase mt-[40px] text-center"
          style={{ color: 'var(--white)', textShadow: '0 0 20px rgba(255, 45, 120, 0.4), 0 0 40px rgba(255, 45, 120, 0.2)' }}
        >
          One-time purchase &middot; Credits never expire
        </p>
      </main>

      <Footer />
    </div>
  );
}
