'use client';

import { useEffect, useRef } from 'react';
import { IconZap, IconPacket, IconBrain, IconChecklist } from '@/components/icons';

const features = [
  {
    name: 'Smart Analysis Engine',
    desc: 'Paste your review feedback. AI identifies the exact guideline, explains the issue, and maps it to clear next steps.',
    icon: IconZap,
  },
  {
    name: 'Review Packet Generator',
    desc: 'Auto-generate demo credentials, testing steps, and reviewer notes ready to paste into App Store Connect.',
    icon: IconPacket,
  },
  {
    name: 'Build Memory',
    desc: 'Tracks your submission history. Recurring issues are flagged and cross-referenced across builds automatically.',
    icon: IconBrain,
  },
  {
    name: 'Completeness Dashboard',
    desc: 'Pre-flight checklist scored 0 to 100. Privacy policy, account deletion, screenshots, IAP, age rating, export compliance.',
    icon: IconChecklist,
  },
];

function FeatureCard({
  name,
  desc,
  icon: Icon,
  index,
}: {
  name: string;
  desc: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
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
            el.style.transform = 'translateY(0) scale(1)';
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
      className="glass-card hover-lift rounded-2xl relative overflow-hidden p-8 md:p-10 lg:p-12 transition-all duration-[600ms]"
      style={{
        opacity: 0,
        transform: 'translateY(20px) scale(0.97)',
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Top accent line */}
      <div className="glow-line absolute top-0 left-0 w-full" />

      <div className="flex items-center gap-3 mb-5">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-xl"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
        >
          <Icon width={18} height={18} style={{ color: 'var(--pink)' }} />
        </div>
      </div>
      <h3
        className="text-lg font-medium mb-2.5 text-white"
        style={{ fontFamily: "var(--font-heading), 'Space Grotesk', sans-serif" }}
      >
        {name}
      </h3>
      <p className="text-[14px] leading-[1.8]" style={{ color: 'var(--gray)' }}>
        {desc}
      </p>
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
    <section id="features" className="relative z-[1] px-6 md:px-16 lg:px-24 pt-[120px] pb-[180px] max-w-[1200px] mx-auto">
      <div
        ref={labelRef}
        className="section-label mb-4 animate-jarvis-text-in"
        style={{ animationPlayState: 'paused' }}
      >
        Capabilities
      </div>
      <h2
        ref={titleRef}
        className="text-4xl font-semibold tracking-tight mb-16 animate-jarvis-text-in"
        style={{
          fontFamily: "var(--font-heading), 'Space Grotesk', sans-serif",
          animationPlayState: 'paused',
          animationDelay: '0.2s',
        }}
      >
        Everything you need to ship clean.
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {features.map((f, i) => (
          <FeatureCard key={f.name} {...f} index={i} />
        ))}
      </div>
    </section>
  );
}
