import { getAuthUser } from '@/lib/auth';
import { getUser, getScans } from '@/lib/db';
import Link from 'next/link';
import {
  IconCredits,
  IconStar,
  IconChecklist,
  IconPacket,
  IconMemory,
  IconAnalyze,
  IconArrowRight,
  IconWarning,
  IconTarget,
} from '@/components/icons';

const PACK_CREDITS: Record<string, number> = {
  starter: 1,
  pro: 3,
  agency: 10,
};

export default async function DashboardPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const authUser = await getAuthUser();
  if (!authUser) return null;

  let purchasedCredits: number | null = null;
  try {
    const params = await props.searchParams;
    const packId = params?.purchased;
    if (packId && packId in PACK_CREDITS) {
      purchasedCredits = PACK_CREDITS[packId];
    }
  } catch {
    // searchParams unavailable
  }

  let plan = 'free';
  let isFounder = false;
  let credits = 0;
  let scanCount = 0;
  let recentScans: Array<{ scanId: string; score: number; createdAt: string }> = [];
  let avgScore: number | null = null;

  try {
    const [profile, scans] = await Promise.all([
      getUser(authUser.userId),
      getScans(authUser.userId, 5),
    ]);

    plan = (profile?.plan as string) || 'free';
    isFounder = plan === 'founder';
    credits = (profile?.scanCredits as number) || 0;
    scanCount = (profile?.scanCount as number) || 0;
    recentScans = (scans || []) as Array<{ scanId: string; score: number; createdAt: string }>;
    avgScore = recentScans.length
      ? Math.round(recentScans.reduce((sum, s) => sum + (s.score || 0), 0) / recentScans.length)
      : null;
  } catch (err) {
    console.error('[dashboard] Failed to load user data:', err);
  }

  const scoreColor = avgScore === null
    ? 'var(--gray)'
    : avgScore >= 80
      ? 'var(--green)'
      : avgScore >= 60
        ? 'var(--amber)'
        : 'var(--red)';

  const scoreGlow = avgScore === null
    ? 'none'
    : avgScore >= 80
      ? '0 0 30px rgba(52, 211, 153, 0.3)'
      : avgScore >= 60
        ? '0 0 30px rgba(251, 191, 36, 0.3)'
        : '0 0 30px rgba(248, 113, 113, 0.3)';

  return (
    <div className="min-h-screen pt-28 pb-20" style={{ background: 'var(--black)' }}>
      <div className="max-w-[1200px] mx-auto px-6 md:px-12 lg:px-20">

        {/* Purchase confirmation */}
        {purchasedCredits && (
          <div
            className="p-6 mb-10 relative overflow-hidden"
            style={{
              background: 'rgba(74, 222, 128, 0.04)',
              border: '1px solid rgba(74, 222, 128, 0.15)',
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(74,222,128,0.5), transparent)' }} />
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 rounded-full" style={{ background: '#4ade80', boxShadow: '0 0 8px rgba(74,222,128,0.5)' }} />
              <span className="text-[11px] tracking-[3px] uppercase font-bold" style={{ color: '#4ade80' }}>
                Payment received
              </span>
            </div>
            <p className="text-[12px] ml-5" style={{ color: 'var(--gray)' }}>
              {purchasedCredits} scan credit{purchasedCredits > 1 ? 's' : ''} added.{' '}
              <Link href="/analyze" className="no-underline font-medium" style={{ color: 'var(--pink)' }}>
                Run an analysis now &rarr;
              </Link>
            </p>
          </div>
        )}

        {/* Header */}
        <div className="mb-12">
          <div className="text-[11px] font-medium tracking-[5px] uppercase mb-4" style={{ color: 'var(--pink)' }}>
            Overview
          </div>
          <h1 className="text-[11px] font-medium tracking-[5px] uppercase" style={{ color: 'var(--white)' }}>
            Dashboard
          </h1>
        </div>

        {/* Main split layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-12">

          {/* LEFT COLUMN — Stacked cards */}
          <div className="flex flex-col gap-6">

            {/* Credits + Plan */}
            <div className="grid grid-cols-2 gap-[1px]" style={{ background: 'var(--border)' }}>
              <div className="p-8" style={{ background: 'var(--black)' }}>
                <div className="text-[10px] tracking-[4px] uppercase mb-6" style={{ color: 'var(--gray)' }}>
                  Credits Left
                </div>
                <div className="flex items-center gap-3">
                  <IconCredits width={16} height={16} style={{ color: 'var(--pink)', opacity: 0.6 }} />
                  <span
                    className="text-[36px] font-light tracking-tight leading-none"
                    style={{
                      color: isFounder ? '#a78bfa' : credits > 0 ? 'var(--green)' : 'var(--red)',
                    }}
                  >
                    {isFounder ? '\u221E' : credits}
                  </span>
                </div>
              </div>
              <div className="p-8" style={{ background: 'var(--black)' }}>
                <div className="text-[10px] tracking-[4px] uppercase mb-6" style={{ color: 'var(--gray)' }}>
                  Plan
                </div>
                <div className="flex items-center gap-3">
                  <IconStar width={16} height={16} style={{ color: 'var(--pink)', opacity: 0.6 }} />
                  <span className="text-[11px] tracking-[3px] uppercase font-bold" style={{ color: 'var(--white)' }}>
                    {plan}
                  </span>
                </div>
              </div>
            </div>

            {/* Analyze Now CTA */}
            <Link
              href="/analyze"
              className="block no-underline text-center text-[11px] tracking-[3px] uppercase font-medium"
              style={{
                color: 'var(--white)',
                background: 'transparent',
                border: '1px solid rgba(255, 45, 120, 0.4)',
                padding: '24px',
                boxShadow: '0 0 40px rgba(255, 45, 120, 0.15), 0 0 80px rgba(255, 45, 120, 0.08)',
                transition: 'all 0.4s ease',
              }}
            >
              <span className="flex items-center justify-center gap-3">
                <IconAnalyze width={16} height={16} />
                Analyze Now
                <IconArrowRight width={14} height={14} />
              </span>
            </Link>

            {/* No Credits Warning */}
            {!isFounder && credits <= 0 && (
              <div
                className="p-8 flex items-center justify-between"
                style={{
                  background: 'rgba(248, 113, 113, 0.03)',
                  border: '1px solid rgba(248, 113, 113, 0.15)',
                }}
              >
                <div className="flex items-center gap-4">
                  <IconWarning width={16} height={16} style={{ color: 'var(--red)' }} />
                  <div>
                    <div className="text-[11px] tracking-[2px] uppercase font-bold mb-1" style={{ color: 'var(--white)' }}>
                      No scan credits
                    </div>
                    <div className="text-[11px]" style={{ color: 'var(--gray)' }}>
                      Purchase credits to run analyses.
                    </div>
                  </div>
                </div>
                <Link
                  href="/pricing"
                  className="no-underline text-[10px] tracking-[3px] uppercase font-medium"
                  style={{
                    color: 'var(--red)',
                    border: '1px solid rgba(248, 113, 113, 0.3)',
                    padding: '12px 20px',
                  }}
                >
                  Buy Credits &rarr;
                </Link>
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex flex-col gap-[1px]" style={{ background: 'var(--border)' }}>
              {[
                { href: '/completeness', label: 'Pre-Flight Checklist', Icon: IconChecklist },
                { href: '/review-packet', label: 'Review Packet', Icon: IconPacket },
                { href: '/memory', label: 'Build Memory', Icon: IconMemory },
              ].map(({ href, label, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-5 no-underline p-6"
                  style={{ background: 'var(--black)', transition: 'background 0.2s ease' }}
                >
                  <Icon width={16} height={16} style={{ color: 'var(--pink)', opacity: 0.5 }} />
                  <span className="text-[11px] tracking-[2px] uppercase font-medium" style={{ color: 'var(--gray)' }}>
                    {label}
                  </span>
                  <IconArrowRight width={12} height={12} style={{ color: 'var(--gray)', opacity: 0.3, marginLeft: 'auto' }} />
                </Link>
              ))}
            </div>

            {/* Recent Scans */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="text-[11px] tracking-[4px] uppercase font-bold" style={{ color: 'var(--white)' }}>
                  Recent Scans
                </div>
                {recentScans.length > 0 && (
                  <Link
                    href="/history"
                    className="text-[10px] tracking-[2px] uppercase no-underline font-medium"
                    style={{ color: 'var(--gray)' }}
                  >
                    View all &rarr;
                  </Link>
                )}
              </div>

              {recentScans.length === 0 ? (
                <div
                  className="p-16 text-center"
                  style={{ border: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}
                >
                  <IconTarget width={20} height={20} style={{ color: 'var(--pink)', opacity: 0.3, margin: '0 auto 12px' }} />
                  <p className="text-[11px] tracking-[2px] uppercase mb-1" style={{ color: 'var(--gray)' }}>
                    No scans yet
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
                    Run your first analysis to get started.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-[1px]" style={{ background: 'var(--border)' }}>
                  {recentScans.map((scan, i) => {
                    const sColor =
                      scan.score >= 80 ? 'var(--green)' : scan.score >= 60 ? 'var(--amber)' : 'var(--red)';

                    return (
                      <Link
                        key={scan.scanId}
                        href={`/history/${scan.scanId}`}
                        className="flex items-center justify-between px-6 py-5 no-underline"
                        style={{ background: 'var(--black)', transition: 'background 0.2s ease' }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-[5px] h-[5px]" style={{ background: sColor }} />
                          <span className="text-[10px] tracking-[2px] uppercase tabular-nums" style={{ color: 'var(--gray)' }}>
                            #{String(i + 1).padStart(2, '0')}
                          </span>
                          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                            {new Date(scan.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <span
                          className="text-[10px] tracking-[2px] uppercase tabular-nums font-bold"
                          style={{ color: sColor }}
                        >
                          {scan.score}/100
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN — Phone mockup */}
          <div className="hidden lg:flex flex-col items-center sticky top-28 self-start">
            {/* Phone frame */}
            <div className="relative" style={{ width: '200px', height: '410px' }}>
              {/* Phone body */}
              <div
                className="absolute inset-0"
                style={{
                  background: '#0a0a0a',
                  borderRadius: '32px',
                  border: '2px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: '0 0 40px rgba(255, 45, 120, 0.08), 0 0 80px rgba(255, 45, 120, 0.04)',
                  overflow: 'hidden',
                }}
              >
                {/* Notch */}
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2"
                  style={{
                    width: '80px',
                    height: '22px',
                    background: '#000',
                    borderRadius: '0 0 16px 16px',
                  }}
                />

                {/* Screen content */}
                <div className="absolute inset-[8px] flex flex-col items-center justify-center" style={{ borderRadius: '24px' }}>
                  {/* Breathing glow */}
                  <div
                    className="absolute"
                    style={{
                      width: '80px',
                      height: '80px',
                      background: 'radial-gradient(circle, rgba(255, 45, 120, 0.15), transparent)',
                      borderRadius: '50%',
                      animation: 'breathe 4s ease-in-out infinite',
                    }}
                  />

                  {/* Score label */}
                  <div className="text-[8px] tracking-[3px] uppercase mb-3 relative z-10" style={{ color: 'var(--gray)' }}>
                    Avg Score
                  </div>

                  {/* Score number */}
                  <div
                    className="text-[48px] font-light tracking-tight leading-none mb-6 relative z-10"
                    style={{
                      color: scoreColor,
                      textShadow: scoreGlow,
                    }}
                  >
                    {avgScore !== null ? avgScore : '\u2014'}
                  </div>

                  {/* Divider */}
                  <div className="w-8 h-px mb-6 relative z-10" style={{ background: 'rgba(255,255,255,0.08)' }} />

                  {/* Total scans */}
                  <div className="text-[8px] tracking-[3px] uppercase mb-2 relative z-10" style={{ color: 'var(--gray)' }}>
                    Total Scans
                  </div>
                  <div className="text-[24px] font-light tracking-tight leading-none relative z-10" style={{ color: 'var(--white)' }}>
                    {scanCount}
                  </div>
                </div>
              </div>

              {/* Side buttons */}
              <div
                className="absolute"
                style={{ left: '-2px', top: '80px', width: '2px', height: '24px', background: 'rgba(255,255,255,0.1)', borderRadius: '0 0 0 2px' }}
              />
              <div
                className="absolute"
                style={{ left: '-2px', top: '120px', width: '2px', height: '40px', background: 'rgba(255,255,255,0.1)', borderRadius: '0 0 0 2px' }}
              />
              <div
                className="absolute"
                style={{ right: '-2px', top: '100px', width: '2px', height: '32px', background: 'rgba(255,255,255,0.1)', borderRadius: '0 2px 2px 0' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
