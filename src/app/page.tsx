'use client';

import Header from '@/components/Header';
import IPhoneHero from '@/components/IPhoneHero';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <>
      <div className="grid-bg" />
      <div className="scanline" />

      <Header />

      <section className="relative z-[1] min-h-screen flex flex-col items-center justify-center px-6 text-center">
        {/* Tagline — positioned higher, independent of phone */}
        <div
          className="text-[11px] font-medium tracking-[5px] uppercase animate-jarvis-flicker"
          style={{ color: 'var(--pink)', opacity: 0, animationDelay: '0.5s', marginBottom: '60px' }}
        >
          Submission Intelligence
        </div>

        {/* Phone */}
        <IPhoneHero />

        {/* CTA */}
        <div style={{ marginTop: '60px' }}>
          <a
            href="/signup"
            className="inline-flex items-center justify-center gap-4 no-underline text-white animate-jarvis-text-in"
            style={{
              animationDelay: '3.1s',
              background: 'transparent',
              border: '1px solid rgba(255, 45, 120, 0.4)',
              padding: '22px 100px',
              fontSize: '13px',
              fontWeight: 600,
              letterSpacing: '3px',
              textTransform: 'uppercase' as const,
              boxShadow: '0 0 40px rgba(255, 45, 120, 0.15), 0 0 80px rgba(255, 45, 120, 0.08)',
              transition: 'all 0.4s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 0 50px rgba(255, 45, 120, 0.3), 0 0 100px rgba(255, 45, 120, 0.12)';
              e.currentTarget.style.borderColor = 'rgba(255, 45, 120, 0.7)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 0 40px rgba(255, 45, 120, 0.15), 0 0 80px rgba(255, 45, 120, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(255, 45, 120, 0.4)';
            }}
          >
            Scan Your App
            <span style={{ fontSize: '16px' }}>&rarr;</span>
          </a>
        </div>
      </section>

      <Footer />
    </>
  );
}
