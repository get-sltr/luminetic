import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{
      borderTop: '2px solid var(--orange)',
      position: 'relative',
      zIndex: 1,
    }}>
      {/* Orange glow under border */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 10,
        background: 'linear-gradient(to bottom, rgba(255,106,0,0.06), transparent)',
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 32px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32 }}>

          {/* Logo + tagline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{
              fontFamily: 'var(--display)', fontSize: '1.4rem', letterSpacing: 3,
              color: 'var(--orange)',
            }}>
              LUMINETIC<span style={{ animation: 'blink 1s step-end infinite' }}>_</span>
            </span>
            <p style={{
              fontFamily: 'var(--body)', fontSize: '0.78rem', color: 'var(--text-dim)',
              lineHeight: 1.5, margin: 0,
            }}>
              AI-powered App Store submission intelligence
            </p>
          </div>

          {/* Product */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h4 style={{
              fontFamily: 'var(--mono)', fontSize: '0.56rem', letterSpacing: 2.5,
              textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 4px',
            }}>
              // Product
            </h4>
            {[
              { label: 'Features', href: '/#features' },
              { label: 'Pricing', href: '/pricing' },
              { label: 'Login', href: '/login' },
              { label: 'Sign Up', href: '/signup' },
            ].map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="no-underline"
                style={{
                  fontFamily: 'var(--body)', fontSize: '0.78rem', color: 'var(--text-mid)',
                  transition: 'color 0.2s',
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Contact / Support */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h4 style={{
              fontFamily: 'var(--mono)', fontSize: '0.56rem', letterSpacing: 2.5,
              textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 4px',
            }}>
              // Contact
            </h4>
            <a
              href="mailto:hello@luminetic.io"
              className="no-underline"
              style={{
                fontFamily: 'var(--mono)', fontSize: '0.74rem', color: 'var(--orange)',
                transition: 'opacity 0.2s',
              }}
            >
              hello@luminetic.io
            </a>
            <span style={{ fontFamily: 'var(--body)', fontSize: '0.74rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>
              Response within 24 hours
            </span>
            <span style={{ fontFamily: 'var(--body)', fontSize: '0.74rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>
              Los Angeles, CA
            </span>
          </div>

          {/* Company */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h4 style={{
              fontFamily: 'var(--mono)', fontSize: '0.56rem', letterSpacing: 2.5,
              textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 4px',
            }}>
              // Company
            </h4>
            <Link
              href="/terms"
              className="no-underline"
              style={{
                fontFamily: 'var(--body)', fontSize: '0.78rem', color: 'var(--text-mid)',
                transition: 'color 0.2s',
              }}
            >
              Terms &amp; Conditions
            </Link>
            <span style={{ fontFamily: 'var(--body)', fontSize: '0.78rem', color: 'var(--text-mid)' }}>
              SLTR Digital LLC
            </span>
            <span style={{ fontFamily: 'var(--body)', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
              &copy; 2026 Luminetic. All rights reserved.
            </span>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          marginTop: 36, paddingTop: 20,
          borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.56rem', letterSpacing: 1.5, color: 'var(--text-dim)' }}>
            LUMINETIC v2.0
          </span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.56rem', letterSpacing: 1.5, color: 'var(--text-dim)' }}>
            Built in Los Angeles, CA
          </span>
        </div>
      </div>
    </footer>
  );
}
