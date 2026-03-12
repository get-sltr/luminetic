'use client';

import { useEffect, useRef } from 'react';

const tiers = [
  {
    tier: 'Free',
    price: '$0',
    period: '/ forever',
    features: ['1 scan per month', 'Basic checklist', 'URL health checks'],
    featured: false,
  },
  {
    tier: 'Indie',
    price: '$19',
    period: '/ month',
    features: ['5 scans per month', 'AI readiness check', 'Review packet generator'],
    featured: false,
  },
  {
    tier: 'Pro',
    price: '$49',
    period: '/ month',
    features: ['Unlimited scans', 'App Store Connect integration', 'Team seats'],
    featured: true,
  },
  {
    tier: 'Agency',
    price: '$149',
    period: '/ month',
    features: ['Multi-app support', 'Client dashboards', 'White-label packets', 'API access'],
    featured: false,
  },
];

function PriceCard({
  tier,
  price,
  period,
  features,
  featured,
  index,
}: {
  tier: string;
  price: string;
  period: string;
  features: string[];
  featured: boolean;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
          }, index * 150);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [index]);

  return (
    <div
      ref={ref}
      className="relative px-7 py-10 transition-all duration-[600ms]"
      style={{
        background: 'var(--panel-bg)',
        border: featured ? '1px solid var(--pink-dim)' : '1px solid var(--panel-border)',
        boxShadow: featured ? '0 0 40px rgba(255,45,120,0.05)' : 'none',
        opacity: 0,
        transform: 'translateY(30px)',
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {featured && (
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-[3px] text-[9px] tracking-[2px] font-medium text-white"
          style={{ background: 'var(--pink)' }}
        >
          POPULAR
        </div>
      )}

      <div className="text-[11px] tracking-[3px] uppercase mb-4" style={{ color: 'var(--gray)' }}>
        {tier}
      </div>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif" }} className="text-4xl font-bold mb-1">
        {price}{' '}
        <span className="text-sm font-light" style={{ color: 'var(--gray)' }}>
          {period}
        </span>
      </div>

      <ul className="mt-6 list-none p-0">
        {features.map((f) => (
          <li
            key={f}
            className="flex items-center gap-2 py-2 text-[13px] border-b"
            style={{ color: 'var(--gray)', borderColor: 'rgba(255,255,255,0.03)' }}
          >
            <span
              className="w-1 h-1 rounded-full shrink-0"
              style={{ background: 'var(--pink)' }}
            />
            {f}
          </li>
        ))}
      </ul>

      <a
        href="/signup"
        className="block w-full mt-7 py-3 text-center text-[12px] tracking-[1.5px] uppercase text-white border no-underline transition-all duration-300"
        style={{
          borderColor: featured ? 'var(--pink)' : 'var(--panel-border)',
          background: featured ? 'var(--pink)' : 'transparent',
        }}
        onMouseEnter={(e) => {
          if (!featured) {
            e.currentTarget.style.borderColor = 'var(--pink)';
            e.currentTarget.style.boxShadow = '0 0 20px var(--pink-glow)';
          } else {
            e.currentTarget.style.background = '#e0245c';
          }
        }}
        onMouseLeave={(e) => {
          if (!featured) {
            e.currentTarget.style.borderColor = 'var(--panel-border)';
            e.currentTarget.style.boxShadow = 'none';
          } else {
            e.currentTarget.style.background = 'var(--pink)';
          }
        }}
      >
        Get Started
      </a>
    </div>
  );
}

export default function Pricing() {
  const labelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).style.animationPlayState = 'running';
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    if (labelRef.current) observer.observe(labelRef.current);
    if (titleRef.current) observer.observe(titleRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="pricing" className="relative z-[1] px-8 md:px-16 pt-[100px] pb-[180px] max-w-[1200px] mx-auto">
      <div
        ref={labelRef}
        className="text-[11px] tracking-[4px] uppercase font-normal mb-4 animate-jarvis-text-in"
        style={{ color: 'var(--pink)', animationPlayState: 'paused' }}
      >
        Pricing
      </div>
      <h2
        ref={titleRef}
        className="text-4xl font-semibold tracking-tight mb-16 animate-jarvis-text-in"
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          animationPlayState: 'paused',
          animationDelay: '0.2s',
        }}
      >
        Start free. Scale when ready.
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {tiers.map((t, i) => (
          <PriceCard key={t.tier} {...t} index={i} />
        ))}
      </div>
    </section>
  );
}
