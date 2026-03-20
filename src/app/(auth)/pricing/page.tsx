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
        redirect: 'follow',
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        window.location.href = '/login?redirect=/pricing';
        return;
      }

      const data = await res.json();

      if (res.status === 401) {
        window.location.href = '/login?redirect=/pricing';
        return;
      }

      if (!res.ok) {
        setError(data.error || 'Checkout failed.');
        setLoading(null);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError('No checkout URL returned. Please try again.');
        setLoading(null);
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(null);
    }
  }

  return (
    <div style={{ background: 'var(--black)' }}>
      <div className="grid-bg" />

      {/* Nav */}
      <header
        className="fixed top-0 left-0 w-full z-50"
        style={{
          background: 'rgba(9,9,11,0.8)',
          backdropFilter: 'blur(24px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center py-4 px-6 md:px-12 lg:px-20">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: 'var(--pink)', boxShadow: '0 0 12px var(--pink-dim)' }}
            />
            <span className="text-xl font-bold tracking-tight text-white">Luminetic</span>
          </Link>
        </div>
      </header>

      <main className="min-h-screen flex flex-col items-center px-6 md:px-12 pt-[140px] pb-[120px]">
        {/* Header */}
        <div className="mb-16 text-center">
          <div
            className="text-[13px] font-medium tracking-[5px] uppercase mb-4"
            style={{ color: 'var(--pink)' }}
          >
            Pricing
          </div>
          <h1
            className="text-2xl md:text-3xl font-semibold tracking-tight mb-3"
            style={{ color: 'var(--white)', fontFamily: "var(--font-heading), 'Space Grotesk', sans-serif" }}
          >
            Pay per scan — no subscription
          </h1>
          <p className="text-sm" style={{ color: 'var(--gray)' }}>
            One-time purchase. Credits never expire.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            className="mb-8 px-6 py-3 rounded-lg text-[13px] text-center max-w-md"
            style={{
              color: '#f87171',
              background: 'rgba(248,113,113,0.06)',
              border: '1px solid rgba(248,113,113,0.15)',
            }}
          >
            {error}
          </div>
        )}

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-[960px]">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className="relative flex flex-col rounded-2xl overflow-hidden"
              style={{
                background: tier.featured
                  ? 'linear-gradient(180deg, rgba(255,45,120,0.06) 0%, rgba(9,9,11,1) 100%)'
                  : 'rgba(255,255,255,0.02)',
                border: tier.featured
                  ? '1px solid rgba(255,45,120,0.25)'
                  : '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {/* Popular badge */}
              {tier.featured && (
                <div className="flex justify-center pt-4">
                  <span
                    className="text-[9px] tracking-[2px] font-semibold uppercase px-4 py-1 rounded-full"
                    style={{ background: 'var(--pink)', color: 'white' }}
                  >
                    Most Popular
                  </span>
                </div>
              )}

              <div className="flex flex-col flex-1 p-8 md:p-10">
                {/* Tier name */}
                <div
                  className="text-[11px] font-bold tracking-[3px] uppercase mb-6"
                  style={{ color: tier.featured ? 'var(--pink)' : 'var(--gray)' }}
                >
                  {tier.name}
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-sm" style={{ color: 'var(--gray)' }}>$</span>
                  <span
                    className="text-5xl font-light tracking-tight"
                    style={{ color: 'var(--white)' }}
                  >
                    {tier.price}
                  </span>
                </div>

                {/* Scans */}
                <div
                  className="text-[10px] tracking-[2px] uppercase mb-10"
                  style={{ color: 'var(--gray)' }}
                >
                  {tier.scans}
                </div>

                {/* Features */}
                <ul className="flex flex-col gap-4 mb-10 flex-1 list-none p-0 m-0">
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-3 text-[12px] leading-relaxed"
                      style={{ color: 'rgba(255,255,255,0.7)' }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        className="shrink-0"
                      >
                        <path
                          d="M3.5 7L6 9.5L10.5 4.5"
                          stroke={tier.featured ? 'var(--pink)' : 'rgba(255,255,255,0.3)'}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => handleBuy(tier.id)}
                  disabled={loading !== null}
                  className="w-full py-3.5 rounded-xl text-[11px] tracking-[2px] uppercase font-medium cursor-pointer transition-all duration-200"
                  style={{
                    color: tier.featured ? 'white' : 'var(--gray)',
                    background: tier.featured
                      ? 'var(--pink)'
                      : 'transparent',
                    border: tier.featured
                      ? '1px solid var(--pink)'
                      : '1px solid rgba(255,255,255,0.1)',
                    opacity: loading !== null && loading !== tier.id ? 0.4 : 1,
                  }}
                >
                  {loading === tier.id ? 'Processing...' : 'Get Started'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
