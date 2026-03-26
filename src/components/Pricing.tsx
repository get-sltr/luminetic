'use client';

import { useEffect, useRef } from 'react';
import { IconCheck } from '@/components/icons';
import { SCAN_PACKS } from '@/lib/scan-packs';

const tiers = [
  {
    tier: SCAN_PACKS[0].name,
    price: `$${SCAN_PACKS[0].priceInCents / 100}`,
    period: `/ ${SCAN_PACKS[0].scans} scan`,
    features: ['1 dual-model AI analysis', 'Pre-flight checklist', 'Review packet generator', 'Action plan with priorities'],
    featured: false,
  },
  {
    tier: SCAN_PACKS[1].name,
    price: `$${SCAN_PACKS[1].priceInCents / 100}`,
    period: `/ ${SCAN_PACKS[1].scans} scans`,
    features: ['3 dual-model AI analyses', 'Maestro & Detox test gen', 'Build Memory intelligence', 'Score trend tracking'],
    featured: true,
  },
  {
    tier: SCAN_PACKS[2].name,
    price: `$${SCAN_PACKS[2].priceInCents / 100}`,
    period: `/ ${SCAN_PACKS[2].scans} scans`,
    features: ['10 dual-model AI analyses', 'Everything in Pro', 'Multi-app support', 'Priority analysis'],
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
      className={`glass-card hover-lift rounded-2xl relative px-7 md:px-8 py-10 md:py-12 transition-all duration-[600ms] ${featured ? 'glass-card-glow' : ''}`}
      style={{
        opacity: 0,
        transform: 'translateY(30px)',
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        borderColor: featured ? 'var(--border-active)' : undefined,
      }}
    >
      {featured && (
        <div
          className="badge absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 text-[9px] tracking-[2px] font-semibold rounded-full"
          style={{ background: 'var(--gradient-accent)', color: 'white' }}
        >
          POPULAR
        </div>
      )}

      <div className="text-[11px] tracking-[3px] uppercase mb-4" style={{ color: 'var(--gray)' }}>
        {tier}
      </div>
      <div style={{ fontFamily: "var(--font-heading)" }} className="text-4xl font-bold mb-1">
        {price}{' '}
        <span className="text-sm font-light" style={{ color: 'var(--gray)' }}>
          {period}
        </span>
      </div>

      <ul className="mt-6 list-none p-0">
        {features.map((f) => (
          <li
            key={f}
            className="flex items-center gap-3 py-3 text-[13px] border-b"
            style={{ color: 'var(--gray)', borderColor: 'var(--border)' }}
          >
            <IconCheck
              width={14}
              height={14}
              className="shrink-0"
              style={{ color: 'var(--green)' }}
            />
            {f}
          </li>
        ))}
      </ul>

      <a
        href="/signup"
        className={`block w-full mt-8 py-3.5 text-center text-[12px] tracking-[1.5px] uppercase no-underline rounded-xl ${featured ? 'btn-primary' : 'btn-secondary'}`}
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
    <section id="pricing" className="relative z-[1] px-6 md:px-16 lg:px-24 pt-[120px] pb-[200px] max-w-[1200px] mx-auto">
      <div
        ref={labelRef}
        className="section-label mb-4 animate-jarvis-text-in"
        style={{ animationPlayState: 'paused' }}
      >
        Pricing
      </div>
      <h2
        ref={titleRef}
        className="text-4xl font-semibold tracking-tight mb-16 animate-jarvis-text-in"
        style={{
          fontFamily: "var(--font-heading)",
          animationPlayState: 'paused',
          animationDelay: '0.2s',
        }}
      >
        Pay per scan. No subscription.
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 lg:gap-8">
        {tiers.map((t, i) => (
          <PriceCard key={t.tier} {...t} index={i} />
        ))}
      </div>
    </section>
  );
}
