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
          style={{
            color: 'var(--orange)',
            opacity: 0,
            animationDelay: '0.5s',
            marginBottom: '60px',
            textShadow: '0 0 20px rgba(255, 122, 26, 0.3)',
          }}
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
              border: '2px solid rgba(255, 122, 26, 0.5)',
              padding: '22px 100px',
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '4px',
              textTransform: 'uppercase' as const,
              boxShadow: '0 0 15px rgba(255, 122, 26, 0.3), 0 0 40px rgba(255, 122, 26, 0.15), inset 0 0 15px rgba(255, 122, 26, 0.05)',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 122, 26, 0.1)';
              e.currentTarget.style.boxShadow = '0 0 25px rgba(255, 122, 26, 0.5), 0 0 50px rgba(255, 122, 26, 0.2), inset 0 0 25px rgba(255, 122, 26, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(255, 170, 68, 0.8)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 122, 26, 0.3), 0 0 40px rgba(255, 122, 26, 0.15), inset 0 0 15px rgba(255, 122, 26, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(255, 122, 26, 0.5)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Scan Your App
            <span style={{ fontSize: '16px', color: 'var(--orange)', transition: 'transform 0.2s' }}>&rarr;</span>
          </a>
        </div>
      </section>

      <Footer />
    </>
  );
}
