'use client';

import { useState } from 'react';

const PACKS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$15',
    scans: 1,
    features: ['1 dual-model AI analysis', 'Pre-flight checklist', 'Review packet generator', 'Action plan with priorities'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$40',
    scans: 3,
    features: ['3 dual-model AI analyses', 'Maestro & Detox test gen', 'Build Memory intelligence', 'Score trend tracking'],
    featured: true,
  },
  {
    id: 'agency',
    name: 'Agency',
    price: '$149',
    scans: 10,
    features: ['10 dual-model AI analyses', 'Everything in Pro', 'Multi-app support', 'Priority analysis'],
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

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Checkout failed.');
        return;
      }

      // Redirect to Square checkout
      window.location.href = data.url;
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="max-w-[1100px] mx-auto px-10 py-12">
      <div className="mb-10">
        <div className="text-[11px] tracking-[4px] uppercase mb-2" style={{ color: 'var(--pink)' }}>
          Scan Credits
        </div>
        <h1 className="text-3xl font-semibold" style={{ fontFamily: "'Sora', sans-serif" }}>
          Buy scan credits
        </h1>
        <p className="text-[14px] mt-2" style={{ color: 'var(--gray)' }}>
          One-time purchase. No subscription. Credits never expire.
        </p>
      </div>

      {error && (
        <div className="text-[13px] px-4 py-3 mb-6" style={{ color: '#ff6b6b', background: 'rgba(255,107,107,0.05)', border: '1px solid rgba(255,107,107,0.15)' }}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PACKS.map((pack) => (
          <div
            key={pack.id}
            className="relative p-8 flex flex-col"
            style={{
              background: 'var(--panel-bg)',
              border: pack.featured ? '1px solid var(--pink-dim)' : '1px solid var(--panel-border)',
              boxShadow: pack.featured ? '0 0 40px rgba(255,45,120,0.05)' : 'none',
            }}
          >
            {pack.featured && (
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-[3px] text-[9px] tracking-[2px] font-medium text-white"
                style={{ background: 'var(--pink)' }}
              >
                BEST VALUE
              </div>
            )}
            <div className="absolute top-0 left-0 w-full h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--pink-dim), transparent)' }} />

            <div className="text-[11px] tracking-[3px] uppercase mb-4" style={{ color: 'var(--gray)' }}>
              {pack.name}
            </div>
            <div className="text-4xl font-bold mb-1" style={{ fontFamily: "'Sora', sans-serif" }}>
              {pack.price}
              <span className="text-sm font-light ml-1" style={{ color: 'var(--gray)' }}>
                / {pack.scans} {pack.scans === 1 ? 'scan' : 'scans'}
              </span>
            </div>

            <ul className="mt-6 mb-8 list-none p-0 flex-1">
              {pack.features.map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-2 py-2.5 text-[13px] border-b"
                  style={{ color: 'var(--gray)', borderColor: 'rgba(255,255,255,0.03)' }}
                >
                  <span className="w-1 h-1 rounded-full shrink-0" style={{ background: 'var(--pink)' }} />
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleBuy(pack.id)}
              disabled={loading === pack.id}
              className="w-full py-3.5 text-[12px] tracking-[2px] uppercase text-white font-medium transition-all duration-300 cursor-pointer"
              style={{
                background: pack.featured ? 'var(--pink)' : 'transparent',
                border: '1px solid var(--pink)',
                opacity: loading === pack.id ? 0.6 : 1,
              }}
            >
              {loading === pack.id ? 'Redirecting...' : 'Buy Now'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
