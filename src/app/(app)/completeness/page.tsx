'use client';

import { useState } from 'react';
import { IconCheck } from '@/components/icons';

interface CheckItem {
  id: string;
  category: string;
  label: string;
  description: string;
  guidelineRef: string;
  checked: boolean;
}

const CHECKLIST_ITEMS: Omit<CheckItem, 'checked'>[] = [
  // Privacy & Data
  { id: 'privacy-policy', category: 'Privacy & Data', label: 'Privacy policy URL is set', description: 'A valid, accessible privacy policy URL must be provided in App Store Connect.', guidelineRef: '5.1.1' },
  { id: 'privacy-labels', category: 'Privacy & Data', label: 'Privacy nutrition labels are accurate', description: 'Data collection disclosures in App Store Connect must match actual app behavior.', guidelineRef: '5.1.1' },
  { id: 'att-prompt', category: 'Privacy & Data', label: 'App Tracking Transparency implemented', description: 'If tracking user data across apps/websites, ATT prompt must be shown before tracking.', guidelineRef: '5.1.2' },
  { id: 'data-deletion', category: 'Privacy & Data', label: 'Account deletion available', description: 'Apps that support account creation must offer account deletion within the app.', guidelineRef: '5.1.1' },

  // Content & Legal
  { id: 'age-rating', category: 'Content & Legal', label: 'Age rating is accurate', description: 'Content rating questionnaire must reflect actual app content (violence, language, etc).', guidelineRef: '2.3.6' },
  { id: 'export-compliance', category: 'Content & Legal', label: 'Export compliance documented', description: 'If using encryption, CCATS or exemption documentation must be in place.', guidelineRef: '2.1' },
  { id: 'copyright', category: 'Content & Legal', label: 'No third-party IP violations', description: 'All content, images, and trademarks must be properly licensed or owned.', guidelineRef: '5.2.1' },
  { id: 'eula', category: 'Content & Legal', label: 'EULA / Terms of Service provided', description: 'Terms of service should be accessible within the app if applicable.', guidelineRef: '3.2.1' },

  // In-App Purchases
  { id: 'iap-correct', category: 'In-App Purchases', label: 'In-app purchases use StoreKit', description: 'Digital goods and subscriptions must use Apple IAP, not third-party payment.', guidelineRef: '3.1.1' },
  { id: 'restore-purchases', category: 'In-App Purchases', label: 'Restore purchases implemented', description: 'Users must be able to restore previously purchased content on new devices.', guidelineRef: '3.1.1' },
  { id: 'sub-management', category: 'In-App Purchases', label: 'Subscription management link present', description: 'Apps with subscriptions should link to Apple subscription management settings.', guidelineRef: '3.1.2' },

  // App Completeness
  { id: 'demo-creds', category: 'App Completeness', label: 'Demo credentials provided', description: 'If login is required, valid test account credentials must be in the review notes.', guidelineRef: '2.1' },
  { id: 'all-features-work', category: 'App Completeness', label: 'All features are functional', description: 'No placeholder content, broken links, or incomplete features.', guidelineRef: '2.1' },
  { id: 'crash-free', category: 'App Completeness', label: 'App is crash-free', description: 'App must not crash during normal usage or review testing scenarios.', guidelineRef: '2.1' },

  // Metadata & Screenshots
  { id: 'screenshots-accurate', category: 'Metadata & Screenshots', label: 'Screenshots match current UI', description: 'Screenshots must accurately represent the current version of the app.', guidelineRef: '2.3.1' },
  { id: 'description-accurate', category: 'Metadata & Screenshots', label: 'Description matches functionality', description: 'App description must not overstate capabilities or include misleading claims.', guidelineRef: '2.3.1' },
  { id: 'no-pricing-metadata', category: 'Metadata & Screenshots', label: 'No pricing in screenshots/name', description: 'Don\'t include pricing info in app name, subtitle, icon, or screenshots.', guidelineRef: '2.3.7' },

  // Design & UX
  { id: 'hig-compliance', category: 'Design & UX', label: 'Human Interface Guidelines followed', description: 'App uses standard iOS patterns, navigation, and interaction models.', guidelineRef: '4.0' },
  { id: 'ipad-support', category: 'Design & UX', label: 'iPad layout works (if universal)', description: 'Universal apps must have proper iPad layout, not just a scaled-up iPhone view.', guidelineRef: '4.1' },
  { id: 'permissions-justified', category: 'Design & UX', label: 'Permission prompts have purpose strings', description: 'All permission requests (camera, location, etc) must have clear usage descriptions.', guidelineRef: '5.1.1' },
];

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 80 ? 'var(--green)' : score >= 50 ? 'var(--warning)' : 'var(--red)';
  const rawColor = score >= 80 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171';
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: 148, height: 148, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="148" height="148" style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
        <circle cx="74" cy="74" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        <circle
          cx="74" cy="74" r={radius} fill="none"
          stroke={rawColor}
          strokeWidth="8"
          strokeLinecap="square"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            filter: `drop-shadow(0 0 8px ${rawColor}66)`,
          }}
        />
      </svg>
      <div style={{ textAlign: 'center', zIndex: 1 }}>
        <div style={{ fontFamily: 'var(--display)', fontSize: '2.8rem', letterSpacing: 2, color, lineHeight: 1 }}>
          {score}
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '0.5rem', letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-dim)' }}>
          / 100
        </div>
      </div>
    </div>
  );
}

export default function CompletenessPage() {
  const [items, setItems] = useState<CheckItem[]>(
    CHECKLIST_ITEMS.map((item) => ({ ...item, checked: false }))
  );

  const checkedCount = items.filter((i) => i.checked).length;
  const score = Math.round((checkedCount / items.length) * 100);
  const categories = [...new Set(items.map((i) => i.category))];

  function toggle(id: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)));
  }

  function getReadiness(): { label: string; color: string } {
    if (score >= 90) return { label: 'Ready to submit', color: 'var(--green)' };
    if (score >= 70) return { label: 'Almost ready', color: 'var(--warning)' };
    if (score >= 40) return { label: 'Needs work', color: '#fb923c' };
    return { label: 'Not ready', color: 'var(--red)' };
  }

  const readiness = getReadiness();

  return (
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px 80px' }}>

        {/* Hero header */}
        <div style={{ padding: '60px 0 20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            fontFamily: 'var(--mono)',
            fontSize: '0.5rem',
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: 'var(--orange)',
            marginBottom: 12,
          }}>
            // pre-flight check
          </div>
          <h1 style={{
            fontFamily: 'var(--display)',
            fontSize: '5rem',
            letterSpacing: 3,
            lineHeight: 0.95,
            margin: 0,
            color: 'var(--text)',
          }}>
            SUBMISSION
            <span style={{
              display: 'block',
              fontSize: '5.5rem',
              color: 'var(--orange)',
              textShadow: '0 0 40px rgba(255,106,0,0.2), 0 0 80px rgba(255,106,0,0.1)',
            }}>
              READINESS
            </span>
          </h1>

          {/* Decorative orange gradient line */}
          <div style={{
            position: 'absolute',
            top: '50%',
            right: 0,
            width: '40%',
            height: 1,
            background: 'linear-gradient(90deg, transparent, var(--orange), transparent)',
            animation: 'pulse 4s ease-in-out infinite',
            opacity: 0.3,
          }} />
        </div>

        {/* Score header card */}
        <div style={{
          border: '1px solid var(--border)',
          background: 'rgba(255,255,255,0.02)',
          padding: '40px 44px',
          marginBottom: 52,
          display: 'flex',
          alignItems: 'center',
          gap: 44,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Top accent line */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: 'linear-gradient(90deg, var(--orange), transparent)',
          }} />

          <ScoreGauge score={score} />

          <div>
            <div style={{
              fontFamily: 'var(--display)',
              fontSize: '2rem',
              letterSpacing: 2,
              color: 'var(--text)',
              marginBottom: 6,
            }}>
              {checkedCount} / {items.length} CHECKS PASSED
            </div>
            <div style={{
              fontFamily: 'var(--body)',
              fontSize: '0.84rem',
              color: 'var(--text-dim)',
              marginBottom: 16,
            }}>
              Check off each item as you verify it in your app.
            </div>
            <span style={{
              fontFamily: 'var(--mono)',
              fontSize: '0.58rem',
              letterSpacing: 2,
              textTransform: 'uppercase',
              padding: '6px 16px',
              color: readiness.color,
              border: `1px solid ${readiness.color}`,
              background: 'transparent',
            }}>
              {readiness.label}
            </span>
          </div>
        </div>

        {/* Checklist by category */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 52 }}>
          {categories.map((category) => {
            const catItems = items.filter((i) => i.category === category);
            const catDone = catItems.filter((i) => i.checked).length;
            const catProgress = Math.round((catDone / catItems.length) * 100);

            return (
              <div key={category}>
                {/* Category header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: 14,
                  borderBottom: '2px solid var(--orange)',
                  marginBottom: 16,
                }}>
                  <div style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '0.5rem',
                    letterSpacing: 3,
                    textTransform: 'uppercase',
                    color: 'var(--orange)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                    <span className="blink-dot" style={{ background: catProgress === 100 ? 'var(--green)' : 'var(--orange)', boxShadow: catProgress === 100 ? '0 0 4px rgba(34,197,94,0.5)' : '0 0 4px rgba(255,106,0,0.4)' }} />
                    // {category}
                  </div>
                  <div style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '0.58rem',
                    letterSpacing: 1,
                    color: catProgress === 100 ? 'var(--green)' : 'var(--text-dim)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {catDone} / {catItems.length}
                  </div>
                </div>

                {/* Category progress bar */}
                <div style={{
                  height: 2,
                  marginBottom: 20,
                  overflow: 'hidden',
                  background: 'var(--border)',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${catProgress}%`,
                    background: catProgress === 100 ? 'var(--green)' : 'var(--orange)',
                    transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                  }} />
                </div>

                {/* Checklist items */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {catItems.map((item, idx) => (
                    <button
                      key={item.id}
                      onClick={() => toggle(item.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 18,
                        padding: '20px 24px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        width: '100%',
                        border: '1px solid var(--border)',
                        marginTop: idx === 0 ? 0 : -1,
                        background: item.checked ? 'rgba(52,211,153,0.02)' : 'rgba(255,255,255,0.02)',
                        transition: 'background 0.2s',
                        fontFamily: 'inherit',
                        color: 'inherit',
                      }}
                      onMouseEnter={(e) => {
                        if (!item.checked) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = item.checked ? 'rgba(52,211,153,0.02)' : 'rgba(255,255,255,0.02)';
                      }}
                    >
                      {/* Checkbox — sharp square, no rounding */}
                      <div style={{
                        width: 20,
                        height: 20,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: 2,
                        background: item.checked ? 'var(--green)' : 'transparent',
                        border: item.checked ? '1px solid var(--green)' : '1px solid var(--border)',
                        boxShadow: item.checked ? '0 0 8px rgba(52,211,153,0.3)' : 'none',
                        transition: 'all 0.2s',
                      }}>
                        {item.checked && <IconCheck width={12} height={12} style={{ color: '#000' }} />}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                          <span style={{
                            fontFamily: 'var(--body)',
                            fontSize: '0.88rem',
                            fontWeight: 500,
                            color: item.checked ? 'var(--text-dim)' : 'var(--text)',
                            textDecoration: item.checked ? 'line-through' : 'none',
                            transition: 'all 0.2s',
                          }}>
                            {item.label}
                          </span>
                          <span style={{
                            fontFamily: 'var(--mono)',
                            fontSize: '0.48rem',
                            letterSpacing: 1.5,
                            padding: '3px 8px',
                            color: 'var(--text-dim)',
                            border: '1px solid var(--border)',
                            background: 'transparent',
                            flexShrink: 0,
                          }}>
                            {item.guidelineRef}
                          </span>
                        </div>
                        <p style={{
                          fontFamily: 'var(--body)',
                          fontSize: '0.78rem',
                          lineHeight: 1.6,
                          color: 'var(--text-dim)',
                          margin: 0,
                        }}>
                          {item.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
