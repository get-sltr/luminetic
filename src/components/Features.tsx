'use client';

import { useEffect, useRef } from 'react';

const features = [
  {
    name: 'Smart Analysis Engine',
    desc: 'Paste your review feedback. AI identifies the exact guideline, explains the issue, and maps it to clear next steps.',
  },
  {
    name: 'Review Packet Generator',
    desc: 'Auto-generate demo credentials, testing steps, and reviewer notes ready to paste into App Store Connect.',
  },
  {
    name: 'Build Memory',
    desc: 'Tracks your submission history. Recurring issues are flagged and cross-referenced across builds automatically.',
  },
  {
    name: 'Completeness Dashboard',
    desc: 'Pre-flight checklist scored 0 to 100. Privacy policy, account deletion, screenshots, IAP, age rating, export compliance.',
  },
];

function FeatureCard({ name, desc, index }: { name: string; desc: string; index: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0) scale(1)';
            el.classList.add('card-visible');
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
      className="relative overflow-hidden p-10 transition-all duration-[600ms]"
      style={{
        background: 'var(--panel-bg)',
        border: '1px solid var(--panel-border)',
        opacity: 0,
        transform: 'translateY(20px) scale(0.97)',
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 w-full h-px origin-left"
        style={{
          background: 'linear-gradient(90deg, transparent, var(--pink-dim), transparent)',
          transform: 'scaleX(0)',
          transition: 'transform 0.6s 0.3s',
        }}
        data-line="top"
      />
      {/* Left accent line */}
      <div
        className="absolute top-0 left-0 h-full w-px origin-top"
        style={{
          background: 'linear-gradient(180deg, var(--pink-dim), transparent)',
          transform: 'scaleY(0)',
          transition: 'transform 0.6s 0.5s',
        }}
        data-line="left"
      />

      <div className="flex items-center gap-2.5 mb-4">
        <div
          className="w-6 h-px"
          style={{ background: 'var(--pink)', boxShadow: '0 0 8px var(--pink-dim)' }}
        />
      </div>
      <h3
        className="text-lg font-medium mb-2.5 text-white"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {name}
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--gray)' }}>
        {desc}
      </p>

      <style jsx>{`
        .card-visible [data-line="top"] {
          transform: scaleX(1) !important;
        }
        .card-visible [data-line="left"] {
          transform: scaleY(1) !important;
        }
      `}</style>
    </div>
  );
}

export default function Features() {
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
    <section id="features" className="relative z-[1] px-8 md:px-16 pt-[100px] pb-[160px] max-w-[1200px] mx-auto">
      <div
        ref={labelRef}
        className="text-[11px] tracking-[4px] uppercase font-normal mb-4 animate-jarvis-text-in"
        style={{ color: 'var(--pink)', animationPlayState: 'paused' }}
      >
        Capabilities
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
        Everything you need to ship clean.
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {features.map((f, i) => (
          <FeatureCard key={f.name} {...f} index={i} />
        ))}
      </div>
    </section>
  );
}
