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
  const color = score >= 80 ? 'var(--green)' : score >= 50 ? 'var(--amber)' : 'var(--red)';
  const rawColor = score >= 80 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171';
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-[148px] h-[148px] flex items-center justify-center">
      <svg width="148" height="148" className="absolute -rotate-90">
        <circle cx="74" cy="74" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        <circle
          cx="74" cy="74" r={radius} fill="none"
          stroke={rawColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            filter: `drop-shadow(0 0 8px ${rawColor}66)`,
          }}
        />
      </svg>
      <div className="text-center z-10">
        <div className="text-3xl font-bold" style={{ fontFamily: "var(--font-heading)", color }}>{score}</div>
        <div className="text-[10px] tracking-[2px] uppercase" style={{ color: 'var(--gray)' }}>/ 100</div>
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
    if (score >= 70) return { label: 'Almost ready', color: 'var(--amber)' };
    if (score >= 40) return { label: 'Needs work', color: '#fb923c' };
    return { label: 'Not ready', color: 'var(--red)' };
  }

  const readiness = getReadiness();

  return (
    <div className="max-w-[1100px] mx-auto px-6 md:px-10 py-12">
      <div className="mb-10">
        <div className="section-label mb-3">Pre-Flight Check</div>
        <h1 className="page-title" style={{ fontFamily: "var(--font-heading)" }}>
          Submission Readiness
        </h1>
      </div>

      {/* Score header */}
      <div className="glass-card rounded-2xl p-8 mb-10 flex flex-col sm:flex-row items-center gap-8 relative overflow-hidden">
        <div className="glow-line" />
        <ScoreGauge score={score} />
        <div className="text-center sm:text-left">
          <div className="text-[22px] font-semibold mb-1" style={{ fontFamily: "var(--font-heading)" }}>
            {checkedCount} / {items.length} checks passed
          </div>
          <div className="text-[14px] mb-3" style={{ color: 'var(--gray)' }}>
            Check off each item as you verify it in your app.
          </div>
          <span
            className="badge"
            style={{ color: readiness.color, borderColor: readiness.color }}
          >
            {readiness.label}
          </span>
        </div>
      </div>

      {/* Checklist by category */}
      <div className="flex flex-col gap-10">
        {categories.map((category) => {
          const catItems = items.filter((i) => i.category === category);
          const catDone = catItems.filter((i) => i.checked).length;
          const catProgress = Math.round((catDone / catItems.length) * 100);

          return (
            <div key={category}>
              <div className="flex items-center justify-between mb-3">
                <div className="section-label" style={{ letterSpacing: '3px' }}>
                  {category}
                </div>
                <div className="text-[11px] tracking-[1px] tabular-nums" style={{ color: 'var(--gray)' }}>
                  {catDone} / {catItems.length}
                </div>
              </div>

              {/* Category progress bar */}
              <div className="h-1 rounded-full mb-4 overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${catProgress}%`,
                    background: catProgress === 100 ? 'var(--green)' : 'var(--gradient-accent)',
                  }}
                />
              </div>

              <div className="flex flex-col gap-2">
                {catItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => toggle(item.id)}
                    className={`glass-card rounded-xl w-full flex items-start gap-4 p-5 text-left cursor-pointer transition-all duration-200 ${item.checked ? '' : 'hover-bg'}`}
                    style={{
                      background: item.checked ? 'rgba(52,211,153,0.03)' : undefined,
                      borderColor: item.checked ? 'rgba(52,211,153,0.15)' : undefined,
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded-md shrink-0 flex items-center justify-center mt-0.5 transition-all duration-200"
                      style={{
                        background: item.checked ? 'var(--green)' : 'transparent',
                        border: item.checked ? '1px solid var(--green)' : '1px solid var(--border)',
                        boxShadow: item.checked ? '0 0 8px rgba(52,211,153,0.3)' : 'none',
                      }}
                    >
                      {item.checked && <IconCheck width={12} height={12} style={{ color: '#000' }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span
                          className="text-[14px] font-medium transition-all duration-200"
                          style={{
                            color: item.checked ? 'var(--gray)' : 'var(--white)',
                            textDecoration: item.checked ? 'line-through' : 'none',
                          }}
                        >
                          {item.label}
                        </span>
                        <span className="badge rounded-md shrink-0" style={{ color: 'var(--gray)', borderColor: 'var(--border)', padding: '2px 6px', fontSize: '9px' }}>
                          {item.guidelineRef}
                        </span>
                      </div>
                      <p className="text-[12px] leading-relaxed" style={{ color: 'var(--gray)' }}>
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
  );
}
