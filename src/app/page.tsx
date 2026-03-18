'use client';

import Header from '@/components/Header';
import IPhoneHero from '@/components/IPhoneHero';
import Features from '@/components/Features';
import Pricing from '@/components/Pricing';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <>
      {/* Background layers */}
      <div className="grid-bg" />
      <div className="scanline" />

      <Header />

      {/* Hero Section */}
      <section className="relative z-[1] min-h-screen flex flex-col items-center justify-center pt-[180px] pb-40 px-6 md:px-16 lg:px-24 text-center">
        {/* Tagline */}
        <div
          className="text-sm font-normal tracking-[4px] uppercase mb-12 animate-jarvis-flicker"
          style={{
            fontFamily: "'Sora', sans-serif",
            color: 'var(--pink)',
            opacity: 0,
            animationDelay: '0.5s',
          }}
        >
          Submission Intelligence System
        </div>

        <IPhoneHero />

        {/* Headline */}
        <h1
          className="text-[40px] md:text-[56px] font-bold leading-[1.1] tracking-tight mb-6 animate-jarvis-text-in"
          style={{
            fontFamily: "'Sora', sans-serif",
            letterSpacing: '-2px',
            animationDelay: '2.5s',
          }}
        >
          Submit with
          <br />
          <em
            className="not-italic"
            style={{ color: 'var(--pink)', textShadow: '0 0 40px var(--pink-glow)' }}
          >
            confidence.
          </em>
        </h1>

        <p
          className="text-[17px] max-w-[520px] leading-[1.8] mb-14 animate-jarvis-text-in"
          style={{ color: 'var(--gray)', animationDelay: '2.8s' }}
        >
          AI-powered pre-flight checks for App Store submission. Know exactly what reviewers will
          flag before you hit submit.
        </p>

        {/* CTA */}
        <a
          href="/signup"
          className="group relative inline-flex items-center gap-2.5 px-8 py-3.5 border text-[13px] font-normal tracking-[2px] uppercase text-white no-underline overflow-hidden transition-all duration-400 animate-jarvis-text-in"
          style={{
            borderColor: 'var(--pink)',
            background: 'transparent',
            animationDelay: '3.1s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 0 40px var(--pink-glow)';
            const fill = e.currentTarget.querySelector('[data-fill]') as HTMLElement;
            if (fill) fill.style.transform = 'scaleX(1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = 'none';
            const fill = e.currentTarget.querySelector('[data-fill]') as HTMLElement;
            if (fill) fill.style.transform = 'scaleX(0)';
          }}
        >
          <span
            data-fill
            className="absolute inset-0 -z-10 origin-left transition-transform duration-400"
            style={{
              background: 'var(--pink)',
              transform: 'scaleX(0)',
              transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
          Scan Your App
          <span className="transition-transform duration-300 group-hover:translate-x-1">
            &rarr;
          </span>
        </a>
      </section>

      <Features />
      <div className="max-w-[1200px] mx-auto px-6 md:px-16 lg:px-24">
        <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--panel-border), transparent)' }} />
      </div>
      <Pricing />
      <Footer />
    </>
  );
}
