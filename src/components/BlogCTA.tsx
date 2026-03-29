'use client';

import Link from 'next/link';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

interface BlogCTAProps {
  slug: string;
  location?: 'bottom' | 'inline';
}

export default function BlogCTA({ slug, location = 'bottom' }: BlogCTAProps) {
  const handleClick = () => {
    window.gtag?.('event', 'blog_cta_click', {
      post_slug: slug,
      cta_location: location,
    });
  };

  return (
    <div
      style={{
        marginTop: 64,
        padding: '48px 32px',
        background: 'var(--glass)',
        border: '1px solid var(--glass-border)',
        textAlign: 'center',
      }}
    >
      <p
        style={{
          fontFamily: 'var(--mono)',
          fontSize: '0.6rem',
          letterSpacing: 4,
          textTransform: 'uppercase',
          color: 'var(--orange)',
          marginBottom: 12,
        }}
      >
        // Stop guessing
      </p>
      <h3
        style={{
          fontFamily: 'var(--display)',
          fontSize: '2rem',
          letterSpacing: 2,
          color: 'var(--text)',
          margin: '0 0 12px',
        }}
      >
        Ready to pass App Store review?
      </h3>
      <p
        style={{
          fontFamily: 'var(--body)',
          fontSize: '0.95rem',
          color: 'var(--text-mid)',
          marginBottom: 28,
          maxWidth: 480,
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        Upload your .ipa and get AI-powered analysis against Apple&apos;s 114
        review guidelines. Know before you submit.
      </p>
      <Link
        href="/signup"
        onClick={handleClick}
        className="no-underline"
        style={{
          fontFamily: 'var(--mono)',
          fontSize: '0.6rem',
          letterSpacing: 3,
          textTransform: 'uppercase',
          fontWeight: 700,
          color: '#000000',
          background: 'var(--orange)',
          padding: '14px 40px',
          display: 'inline-block',
          boxShadow: '0 0 20px rgba(255, 122, 26, 0.4)',
          transition: 'all 0.2s ease',
        }}
      >
        Try Luminetic Free
      </Link>
    </div>
  );
}
