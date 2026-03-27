'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Footer from '@/components/Footer';
import { SCAN_PACKS } from '@/lib/scan-packs';

const tiers = [
  {
    id: 'starter',
    name: SCAN_PACKS[0].name,
    price: String(SCAN_PACKS[0].priceInCents / 100),
    scans: `${SCAN_PACKS[0].scans} scan`,
    features: [
      'Tri-engine AI analysis',
      'Pre-flight submission checklist',
      'Review packet generator',
      'Action plan with priorities',
      'Readiness score out of 100',
    ],
  },
  {
    id: 'pro',
    name: SCAN_PACKS[1].name,
    price: String(SCAN_PACKS[1].priceInCents / 100),
    scans: `${SCAN_PACKS[1].scans} scans`,
    featured: true,
    features: [
      'Everything in Starter',
      'Maestro & Detox test generation',
      'Build Memory intelligence',
      'Score trend tracking',
      'Priority issue detection',
    ],
  },
  {
    id: 'agency',
    name: SCAN_PACKS[2].name,
    price: String(SCAN_PACKS[2].priceInCents / 100),
    scans: `${SCAN_PACKS[2].scans} scans`,
    features: [
      'Everything in Pro',
      'Multi-app support',
      'Priority analysis queue',
      'Team-ready review packets',
      'Bulk submission workflow',
    ],
  },
];

export default function PricingPage() {
  const router = useRouter();
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
        redirect: 'follow',
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        router.push('/login?redirect=/pricing');
        return;
      }

      const data = await res.json();

      if (res.status === 401) {
        router.push('/login?redirect=/pricing');
        return;
      }

      if (!res.ok) {
        setError(data.error || 'Checkout failed.');
        setLoading(null);
        return;
      }

      if (data.url && typeof data.url === 'string' && (data.url.startsWith('https://square.link/') || data.url.startsWith('https://checkout.squareup.com/'))) {
        window.location.assign(data.url);
      } else if (data.url) {
        console.error('Unexpected checkout URL origin:', data.url);
        setError('Invalid checkout URL. Please contact support.');
        setLoading(null);
      } else {
        setError('No checkout URL returned. Please try again.');
        setLoading(null);
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(null);
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="grid-bg" />

      {/* Nav */}
      <header
        className="fixed top-0 left-0 w-full z-50"
        style={{
          background: 'rgba(5,5,5,0.85)',
          backdropFilter: 'blur(24px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center py-4 px-6 md:px-12 lg:px-20">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: 'var(--orange)', boxShadow: '0 0 12px var(--orange-dim)' }}
            />
            <span style={{ fontFamily: 'var(--body)', fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }}>
              Luminetic
            </span>
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '160px 32px 120px' }}>

        {/* Hero header */}
        <div style={{ marginBottom: 80, textAlign: 'center' }}>
          <div style={{
            fontFamily: 'var(--mono)',
            fontSize: '0.6rem',
            letterSpacing: 5,
            textTransform: 'uppercase',
            color: 'var(--orange)',
            marginBottom: 20,
          }}>
            // pricing
          </div>

          <h1 style={{
            fontFamily: 'var(--display)',
            fontSize: 'clamp(2.8rem, 6vw, 5rem)',
            letterSpacing: 3,
            lineHeight: 0.95,
            margin: 0,
            color: 'var(--text)',
          }}>
            PAY PER SCAN
          </h1>
          <h1 style={{
            fontFamily: 'var(--display)',
            fontSize: 'clamp(2.8rem, 6vw, 5rem)',
            letterSpacing: 3,
            lineHeight: 0.95,
            margin: '4px 0 0',
            color: 'var(--orange)',
            textShadow: '0 0 40px rgba(255,106,0,0.15)',
          }}>
            NO SUBSCRIPTION
          </h1>

          <p style={{
            fontFamily: 'var(--body)',
            fontSize: '0.9rem',
            color: 'var(--gray)',
            marginTop: 24,
            marginBottom: 0,
          }}>
            One-time purchase. Credits never expire.
          </p>
        </div>

        {/* Free scan banner */}
        <div style={{
          background: 'var(--glass)',
          border: '1px solid var(--glass-border)',
          padding: '24px 32px',
          marginBottom: 48,
          maxWidth: 680,
          marginLeft: 'auto',
          marginRight: 'auto',
          textAlign: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
            <span className="blink-dot" style={{ background: 'var(--green)', boxShadow: '0 0 6px rgba(34,197,94,0.5)' }} />
            <span style={{
              fontFamily: 'var(--mono)',
              fontSize: '0.58rem',
              letterSpacing: 3,
              textTransform: 'uppercase',
              color: 'var(--green)',
            }}>
              Free scan available
            </span>
          </div>
          <p style={{
            fontFamily: 'var(--body)',
            fontSize: '0.85rem',
            color: 'var(--text-mid)',
            margin: '0 0 16px',
          }}>
            Sign up to receive your free initial scan — experience the full tri-engine analysis before you buy.
          </p>
          <Link
            href="/signup"
            style={{
              display: 'inline-block',
              fontFamily: 'var(--mono)',
              fontSize: '0.6rem',
              letterSpacing: 3,
              textTransform: 'uppercase',
              color: 'var(--orange)',
              textDecoration: 'none',
              border: '1px solid var(--orange)',
              padding: '10px 28px',
              transition: 'all 0.2s',
            }}
          >
            Create free account →
          </Link>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              background: 'rgba(239,68,68,0.04)',
              border: '1px solid rgba(239,68,68,0.2)',
              padding: '16px 24px',
              marginBottom: 40,
              maxWidth: 680,
              marginLeft: 'auto',
              marginRight: 'auto',
              textAlign: 'center',
            }}
          >
            <span style={{
              fontFamily: 'var(--body)',
              fontSize: '0.8rem',
              color: '#f87171',
            }}>
              {error}
            </span>
          </div>
        )}

        {/* Pricing cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 24,
          maxWidth: 1080,
          margin: '0 auto',
        }}>
          {tiers.map((tier) => (
            <div
              key={tier.id}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                background: tier.featured
                  ? 'linear-gradient(180deg, rgba(255,106,0,0.04) 0%, var(--bg) 100%)'
                  : 'var(--glass)',
                border: tier.featured
                  ? '1px solid rgba(255,106,0,0.3)'
                  : '1px solid var(--border)',
                overflow: 'hidden',
              }}
            >
              {/* Featured top accent bar */}
              {tier.featured && (
                <div style={{
                  height: 2,
                  background: 'var(--orange)',
                  boxShadow: '0 0 20px var(--orange-glow)',
                }} />
              )}

              {/* Popular badge */}
              {tier.featured && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  paddingTop: 20,
                }}>
                  <span style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '0.5rem',
                    letterSpacing: 3,
                    textTransform: 'uppercase',
                    background: 'var(--orange)',
                    color: 'white',
                    padding: '4px 16px',
                  }}>
                    Most Popular
                  </span>
                </div>
              )}

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                padding: tier.featured ? '28px 36px 36px' : '36px',
              }}>
                {/* Tier name */}
                <div style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '0.58rem',
                  fontWeight: 700,
                  letterSpacing: 4,
                  textTransform: 'uppercase',
                  color: tier.featured ? 'var(--orange)' : 'var(--gray)',
                  marginBottom: 28,
                }}>
                  // {tier.name}
                </div>

                {/* Price */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                  <span style={{
                    fontFamily: 'var(--body)',
                    fontSize: '0.9rem',
                    color: 'var(--gray)',
                  }}>$</span>
                  <span style={{
                    fontFamily: 'var(--display)',
                    fontSize: '4.5rem',
                    letterSpacing: 2,
                    lineHeight: 0.85,
                    color: 'var(--text)',
                  }}>
                    {tier.price}
                  </span>
                </div>

                {/* Scan count */}
                <div style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '0.55rem',
                  letterSpacing: 3,
                  textTransform: 'uppercase',
                  color: 'var(--gray)',
                  marginBottom: 40,
                }}>
                  {tier.scans}
                </div>

                {/* Divider */}
                <div style={{
                  height: 1,
                  background: tier.featured ? 'rgba(255,106,0,0.15)' : 'var(--border)',
                  marginBottom: 32,
                }} />

                {/* Features */}
                <ul style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 18,
                  marginBottom: 40,
                  flex: 1,
                  listStyle: 'none',
                  padding: 0,
                  margin: '0 0 40px',
                }}>
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        fontFamily: 'var(--body)',
                        fontSize: '0.82rem',
                        lineHeight: 1.5,
                        color: 'rgba(255,255,255,0.65)',
                      }}
                    >
                      <span style={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        background: tier.featured ? 'var(--orange)' : 'rgba(255,255,255,0.2)',
                        flexShrink: 0,
                        marginTop: 6,
                        boxShadow: tier.featured ? '0 0 8px rgba(255,106,0,0.4)' : 'none',
                      }} />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => handleBuy(tier.id)}
                  disabled={loading !== null}
                  style={{
                    width: '100%',
                    padding: '14px 0',
                    fontFamily: 'var(--mono)',
                    fontSize: '0.58rem',
                    letterSpacing: 3,
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    cursor: loading !== null ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    border: tier.featured
                      ? '1px solid var(--orange)'
                      : '1px solid var(--border)',
                    background: tier.featured
                      ? 'var(--orange)'
                      : 'transparent',
                    color: tier.featured ? 'white' : 'var(--gray)',
                    opacity: loading !== null && loading !== tier.id ? 0.35 : 1,
                  }}
                >
                  {loading === tier.id ? 'Processing...' : 'Get Started'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom note */}
        <div style={{
          textAlign: 'center',
          marginTop: 64,
          paddingTop: 40,
          borderTop: '1px solid var(--border)',
        }}>
          <p style={{
            fontFamily: 'var(--mono)',
            fontSize: '0.55rem',
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: 'var(--text-dim)',
            margin: 0,
          }}>
            Secure checkout via Square — All payments encrypted end-to-end
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
