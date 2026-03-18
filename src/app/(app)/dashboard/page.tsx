import { getAuthUser } from '@/lib/auth';
import { getUser, getScans } from '@/lib/db';
import Link from 'next/link';
import {
  IconTarget,
  IconTrendUp,
  IconCredits,
  IconStar,
  IconChecklist,
  IconPacket,
  IconMemory,
  IconAnalyze,
  IconArrowRight,
  IconWarning,
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

  const statIcons = [IconTarget, IconTrendUp, IconCredits, IconStar];
  const statGradients = [
    'linear-gradient(135deg, rgba(255, 45, 120, 0.08), rgba(167, 139, 250, 0.04))',
    'linear-gradient(135deg, rgba(96, 165, 250, 0.08), rgba(52, 211, 153, 0.04))',
    'linear-gradient(135deg, rgba(52, 211, 153, 0.08), rgba(251, 191, 36, 0.04))',
    'linear-gradient(135deg, rgba(167, 139, 250, 0.08), rgba(255, 45, 120, 0.04))',
  ];

  const stats = [
    { label: 'Total Scans', value: scanCount.toString() },
    { label: 'Avg Score', value: avgScore !== null ? `${avgScore}` : '\u2014', suffix: avgScore !== null ? '/100' : '' },
    {
      label: 'Credits Left',
      value: isFounder ? '\u221E' : credits.toString(),
      color: isFounder ? '#a78bfa' : credits > 0 ? '#34d399' : '#f87171',
    },
    { label: 'Plan', value: plan.toUpperCase() },
  ];

  return (
    <div className="min-h-screen pt-24 pb-20" style={{ background: 'var(--black)' }}>
      <div className="max-w-[1100px] mx-auto px-6 md:px-10">

        {/* Purchase confirmation */}
        {purchasedCredits && (
          <div className="glass-card rounded-2xl p-6 mb-8 relative overflow-hidden animate-fade-in-up"
            style={{ background: 'rgba(74, 222, 128, 0.06)', borderColor: 'rgba(74, 222, 128, 0.15)' }}
          >
            <div className="glow-line" style={{ background: 'linear-gradient(90deg, transparent, rgba(74,222,128,0.6), transparent)' }} />
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 rounded-full" style={{ background: '#4ade80', boxShadow: '0 0 8px rgba(74,222,128,0.5)' }} />
              <h2 className="text-base font-semibold" style={{ fontFamily: "var(--font-heading), 'Space Grotesk', sans-serif", color: '#4ade80' }}>
                Payment received
              </h2>
            </div>
            <p className="text-sm ml-5" style={{ color: 'var(--gray)' }}>
              {purchasedCredits} scan credit{purchasedCredits > 1 ? 's' : ''} added to your account.{' '}
              <Link href="/analyze" className="no-underline font-medium hover-text" style={{ color: 'var(--pink)' }}>
                Run an analysis now &rarr;
              </Link>
            </p>
          </div>
        )}

        {/* Header */}
        <div className="mb-10">
          <div className="section-label mb-3">Overview</div>
          <h1 className="page-title" style={{ fontFamily: "var(--font-heading), 'Space Grotesk', sans-serif" }}>
            Dashboard
          </h1>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {stats.map((stat, idx) => {
            const StatIcon = statIcons[idx];
            return (
              <div
                key={stat.label}
                className="glass-card rounded-2xl p-6 relative overflow-hidden hover-lift"
                style={{ background: statGradients[idx] }}
              >
                <div className="glow-line" />
                <div className="flex items-center justify-between mb-4">
                  <div
                    className="text-[10px] tracking-[3px] uppercase font-medium"
                    style={{ color: 'var(--gray)' }}
                  >
                    {stat.label}
                  </div>
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: 'var(--surface-2)' }}
                  >
                    <StatIcon width={16} height={16} style={{ color: 'var(--pink)', opacity: 0.7 }} />
                  </div>
                </div>
                <div className="flex items-baseline gap-1">
                  <span
                    className="text-3xl font-bold tracking-tight"
                    style={{
                      fontFamily: "var(--font-heading), 'Space Grotesk', sans-serif",
                      color: ('color' in stat && stat.color) ? stat.color as string : 'var(--white)',
                    }}
                  >
                    {stat.value}
                  </span>
                  {'suffix' in stat && stat.suffix && (
                    <span className="text-sm font-normal" style={{ color: 'var(--gray)' }}>
                      {stat.suffix}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA -- Run Analysis */}
        <div
          className="glass-card glass-card-glow rounded-2xl p-8 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between relative overflow-hidden group"
          style={{ background: 'var(--gradient-surface)' }}
        >
          <div className="glow-line" style={{ background: 'linear-gradient(90deg, transparent, var(--pink), transparent)', opacity: 0.8 }} />
          {/* Background glow orb */}
          <div
            className="absolute -right-20 -top-20 w-60 h-60 opacity-[0.08] rounded-full"
            style={{ background: 'radial-gradient(circle, var(--pink), transparent)' }}
          />
          <div className="relative z-10 mb-4 md:mb-0">
            <h2
              className="text-xl font-semibold mb-2 tracking-tight"
              style={{ fontFamily: "var(--font-heading), 'Space Grotesk', sans-serif", color: 'var(--white)' }}
            >
              Run a new analysis
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--gray)' }}>
              Paste your App Store review feedback and get a dual-model action plan in seconds.
            </p>
          </div>
          <Link
            href="/analyze"
            className="btn-primary relative z-10 shrink-0 md:ml-8 px-8 py-4 rounded-2xl text-[11px] tracking-[2px] uppercase text-white no-underline font-semibold flex items-center gap-2"
          >
            <IconAnalyze width={16} height={16} />
            Analyze Now
            <IconArrowRight width={14} height={14} />
          </Link>
        </div>

        {/* Quick Action Links */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { href: '/completeness', label: 'Pre-Flight', Icon: IconChecklist },
            { href: '/review-packet', label: 'Review Packet', Icon: IconPacket },
            { href: '/memory', label: 'Memory', Icon: IconMemory },
          ].map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="glass-card rounded-xl p-4 flex items-center gap-3 no-underline hover-lift hover-glow"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'var(--surface-2)' }}
              >
                <Icon width={16} height={16} style={{ color: 'var(--pink)', opacity: 0.7 }} />
              </div>
              <span className="text-[11px] tracking-[1.5px] uppercase font-medium" style={{ color: 'var(--gray)' }}>
                {label}
              </span>
            </Link>
          ))}
        </div>

        {/* Buy Credits (low/no credits) */}
        {!isFounder && credits <= 0 && (
          <div
            className="glass-card rounded-2xl p-8 mb-6 relative overflow-hidden"
            style={{ borderColor: 'rgba(248, 113, 113, 0.2)', background: 'rgba(248, 113, 113, 0.03)' }}
          >
            <div className="glow-line" style={{ background: 'linear-gradient(90deg, transparent, rgba(248,113,113,0.4), transparent)' }} />
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: 'rgba(248, 113, 113, 0.1)' }}
                >
                  <IconWarning width={18} height={18} style={{ color: 'var(--red)' }} />
                </div>
                <div>
                  <h2
                    className="text-lg font-semibold mb-1.5 tracking-tight"
                    style={{ fontFamily: "var(--font-heading), 'Space Grotesk', sans-serif", color: 'var(--white)' }}
                  >
                    No scan credits remaining
                  </h2>
                  <p className="text-sm" style={{ color: 'var(--gray)' }}>
                    Purchase a scan pack to run AI-powered analyses.
                  </p>
                </div>
              </div>
              <Link
                href="/pricing"
                className="btn-secondary shrink-0 px-6 py-3 rounded-xl text-[11px] tracking-[2px] uppercase no-underline font-semibold text-center"
                style={{ borderColor: 'rgba(248, 113, 113, 0.3)', color: 'var(--red)' }}
              >
                Buy Credits &rarr;
              </Link>
            </div>
          </div>
        )}

        {/* Recent Scans */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-5">
            <h2
              className="text-lg font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-heading), 'Space Grotesk', sans-serif", color: 'var(--white)' }}
            >
              Recent scans
            </h2>
            {recentScans.length > 0 && (
              <Link
                href="/history"
                className="text-[11px] tracking-[1px] uppercase no-underline font-medium hover-text"
                style={{ color: 'var(--gray)' }}
              >
                View all &rarr;
              </Link>
            )}
          </div>

          {recentScans.length === 0 ? (
            <div className="glass-card rounded-2xl p-16 text-center relative overflow-hidden">
              <div className="glow-line" />
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'var(--surface-2)' }}
              >
                <IconTarget width={22} height={22} style={{ color: 'var(--pink)', opacity: 0.4 }} />
              </div>
              <p className="text-sm mb-1" style={{ color: 'var(--gray)' }}>
                No scans yet
              </p>
              <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                Run your first analysis to get started.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {recentScans.map((scan, i) => {
                const scoreColor =
                  scan.score >= 80 ? 'var(--green)' : scan.score >= 60 ? 'var(--amber)' : 'var(--red)';
                const scoreBg =
                  scan.score >= 80
                    ? 'rgba(52,211,153,0.08)'
                    : scan.score >= 60
                      ? 'rgba(251,191,36,0.08)'
                      : 'rgba(248,113,113,0.08)';

                return (
                  <Link
                    key={scan.scanId}
                    href={`/history/${scan.scanId}`}
                    className="glass-card rounded-xl flex items-center justify-between px-6 py-4 no-underline hover-bg group/scan"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: scoreColor }}
                      />
                      <span
                        className="text-[11px] font-medium tabular-nums"
                        style={{ color: 'var(--gray)', fontFamily: "var(--font-heading), 'Space Grotesk', sans-serif" }}
                      >
                        #{String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                        {new Date(scan.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <span
                      className="badge tabular-nums"
                      style={{
                        fontFamily: "var(--font-heading), 'Space Grotesk', sans-serif",
                        color: scoreColor,
                        borderColor: scoreColor,
                        background: scoreBg,
                      }}
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
    </div>
  );
}
