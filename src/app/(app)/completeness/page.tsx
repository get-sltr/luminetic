'use client';

import { useState } from 'react';

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
  const color = score >= 80 ? '#34d399' : score >= 50 ? '#fbbf24' : '#ff6b6b';
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-[140px] h-[140px] flex items-center justify-center">
      <svg width="140" height="140" className="absolute -rotate-90">
        <circle cx="70" cy="70" r="54" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        <circle
          cx="70" cy="70" r="54" fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
        />
      </svg>
      <div className="text-center">
        <div className="text-3xl font-bold" style={{ fontFamily: "'Sora', sans-serif", color }}>{score}</div>
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
    if (score >= 90) return { label: 'Ready to submit', color: '#34d399' };
    if (score >= 70) return { label: 'Almost ready', color: '#fbbf24' };
    if (score >= 40) return { label: 'Needs work', color: '#fb923c' };
    return { label: 'Not ready', color: '#ff6b6b' };
  }

  const readiness = getReadiness();

  return (
    <div className="max-w-[1100px] mx-auto px-10 py-12">
      <div className="mb-10">
        <div className="text-[11px] tracking-[4px] uppercase mb-2" style={{ color: 'var(--pink)' }}>
          Pre-Flight Check
        </div>
        <h1 className="text-3xl font-semibold" style={{ fontFamily: "'Sora', sans-serif" }}>
          Submission Readiness
        </h1>
      </div>

      {/* Score header */}
      <div
        className="p-8 mb-10 flex items-center gap-10 relative overflow-hidden"
        style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}
      >
        <div className="absolute top-0 left-0 w-full h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--pink-dim), transparent)' }} />
        <ScoreGauge score={score} />
        <div>
          <div className="text-[22px] font-semibold mb-1" style={{ fontFamily: "'Sora', sans-serif" }}>
            {checkedCount} / {items.length} checks passed
          </div>
          <div className="text-[14px] mb-3" style={{ color: 'var(--gray)' }}>
            Check off each item as you verify it in your app.
          </div>
          <span
            className="inline-block text-[11px] tracking-[2px] uppercase px-3 py-1.5 font-medium"
            style={{ color: readiness.color, border: `1px solid ${readiness.color}44` }}
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

          return (
            <div key={category}>
              <div className="flex items-center justify-between mb-4">
                <div className="text-[11px] tracking-[3px] uppercase font-medium" style={{ color: 'var(--pink)' }}>
                  {category}
                </div>
                <div className="text-[11px] tracking-[1px]" style={{ color: 'var(--gray)' }}>
                  {catDone} / {catItems.length}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {catItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => toggle(item.id)}
                    className="w-full flex items-start gap-4 p-5 text-left bg-transparent cursor-pointer transition-all duration-200"
                    style={{
                      background: item.checked ? 'rgba(52,211,153,0.03)' : 'var(--panel-bg)',
                      border: item.checked ? '1px solid rgba(52,211,153,0.15)' : '1px solid var(--panel-border)',
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded-sm shrink-0 flex items-center justify-center text-[11px] mt-0.5 transition-all duration-200"
                      style={{
                        background: item.checked ? '#34d399' : 'transparent',
                        border: item.checked ? '1px solid #34d399' : '1px solid var(--panel-border)',
                        color: item.checked ? '#000' : 'transparent',
                      }}
                    >
                      {item.checked && '✓'}
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
                        <span className="text-[9px] tracking-[1px] uppercase px-1.5 py-0.5 shrink-0" style={{ color: 'var(--gray)', border: '1px solid var(--panel-border)' }}>
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
