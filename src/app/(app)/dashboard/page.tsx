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
    const role = (profile?.role as string) || 'user';
    isFounder = role === 'founder' || role === 'admin';
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

  return (
    <div className="min-h-screen w-full" style={{ background: 'var(--black)' }}>
      {/* Centered column — room to breathe */}
      <div className="w-full max-w-[min(720px,100vw-2rem)] mx-auto px-5 sm:px-8 pt-12 sm:pt-16 md:pt-20 pb-24 md:pb-32">

        {/* Purchase confirmation */}
        {purchasedCredits && (
          <div
            className="rounded-2xl p-6 sm:p-7 mb-12 sm:mb-14 relative overflow-hidden"
            style={{
              background: 'rgba(74, 222, 128, 0.04)',
              border: '1px solid rgba(74, 222, 128, 0.15)',
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 rounded-full" style={{ background: '#4ade80', boxShadow: '0 0 8px rgba(74,222,128,0.5)' }} />
              <span className="text-xs tracking-[0.2em] uppercase font-semibold" style={{ color: '#4ade80' }}>
                Payment received
              </span>
            </div>
            <p className="text-sm ml-5 leading-relaxed" style={{ color: 'var(--gray-muted)' }}>
              {purchasedCredits} scan credit{purchasedCredits > 1 ? 's' : ''} added.{' '}
              <Link href="/analyze" className="no-underline font-medium" style={{ color: 'var(--pink)' }}>
                Run an analysis now &rarr;
              </Link>
            </p>
          </div>
        )}

        {/* Header — centered, clear hierarchy */}
        <header className="text-center mb-14 sm:mb-16 md:mb-20">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-5">
            <p className="text-xs tracking-[0.25em] uppercase font-medium m-0" style={{ color: 'var(--pink)' }}>
              Dashboard
            </p>
            <span
              className="hidden sm:inline w-px h-3 shrink-0"
              style={{ background: 'rgba(255,255,255,0.12)' }}
              aria-hidden
            />
            <span
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-medium tracking-wide capitalize"
              style={{
                background: 'rgba(255,45,120,0.08)',
                border: '1px solid rgba(255,45,120,0.2)',
                color: 'var(--gray-muted)',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--pink)' }} />
              {plan} plan
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-[2.75rem] font-semibold tracking-tight leading-tight m-0" style={{ color: 'var(--white)' }}>
            Welcome back
          </h1>
          <p className="mt-4 text-sm sm:text-base max-w-md mx-auto leading-relaxed" style={{ color: 'var(--gray-muted)' }}>
            Your submission readiness at a glance. Run a new scan anytime.
          </p>
        </header>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6 mb-12 sm:mb-14">
          <div
            className="rounded-2xl p-7 sm:p-8 text-center"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="text-[11px] tracking-[0.12em] uppercase mb-4 font-medium" style={{ color: 'var(--gray-muted)' }}>
              Credits
            </div>
            <div className="flex items-center justify-center gap-2">
              <IconCredits width={16} height={16} style={{ color: 'var(--pink)', opacity: 0.55 }} />
              <span
                className="text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums"
                style={{ color: isFounder ? '#a78bfa' : credits > 0 ? 'var(--green)' : 'var(--red)' }}
              >
                {isFounder ? '\u221E' : credits}
              </span>
            </div>
          </div>
          <div
            className="rounded-2xl p-7 sm:p-8 text-center"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="text-[11px] tracking-[0.12em] uppercase mb-4 font-medium" style={{ color: 'var(--gray-muted)' }}>
              Avg score
            </div>
            <span className="text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums" style={{ color: scoreColor }}>
              {avgScore !== null ? avgScore : '\u2014'}
            </span>
          </div>
          <div
            className="rounded-2xl p-7 sm:p-8 text-center"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="text-[11px] tracking-[0.12em] uppercase mb-4 font-medium" style={{ color: 'var(--gray-muted)' }}>
              Total scans
            </div>
            <div className="flex items-center justify-center gap-2">
              <IconStar width={16} height={16} style={{ color: 'var(--pink)', opacity: 0.55 }} />
              <span className="text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums" style={{ color: 'var(--white)' }}>
                {scanCount}
              </span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <Link
          href="/analyze"
          className="group block no-underline rounded-2xl text-center mb-10 sm:mb-12"
          style={{
            padding: '22px 24px',
            background: 'linear-gradient(135deg, rgba(255,45,120,0.14), rgba(255,45,120,0.04))',
            border: '1px solid rgba(255,45,120,0.28)',
            boxShadow: '0 0 48px rgba(255,45,120,0.1)',
            transition: 'all 0.3s ease',
          }}
        >
          <span
            className="flex items-center justify-center gap-3 text-xs sm:text-sm tracking-[0.18em] uppercase font-semibold"
            style={{ color: 'var(--white)' }}
          >
            <IconAnalyze width={18} height={18} className="opacity-90" />
            Analyze now
            <IconArrowRight width={16} height={16} className="opacity-80 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </Link>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 mb-14 sm:mb-16">
          {[
            { href: '/completeness', label: 'Pre-Flight', Icon: IconChecklist },
            { href: '/review-packet', label: 'Review Packet', Icon: IconPacket },
            { href: '/memory', label: 'Build Memory', Icon: IconMemory },
          ].map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-4 no-underline rounded-2xl py-7 px-5 hover:border-white/10"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                transition: 'all 0.2s ease',
              }}
            >
              <Icon width={22} height={22} style={{ color: 'var(--pink)', opacity: 0.6 }} />
              <span className="text-[11px] sm:text-xs tracking-[0.14em] uppercase text-center font-medium" style={{ color: 'var(--gray-muted)' }}>
                {label}
              </span>
            </Link>
          ))}
        </div>

        {/* Recent Scans */}
        <div>
          <div className="flex items-center justify-between mb-6 gap-4">
            <h2 className="text-sm sm:text-base font-semibold tracking-tight m-0" style={{ color: 'var(--white)' }}>
              Recent scans
            </h2>
            {recentScans.length > 0 && (
              <Link
                href="/history"
                className="text-xs tracking-wide no-underline font-medium shrink-0"
                style={{ color: 'var(--gray-muted)' }}
              >
                View all &rarr;
              </Link>
            )}
          </div>

          {recentScans.length === 0 ? (
            <div
              className="rounded-2xl p-12 sm:p-16 text-center"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <IconTarget width={28} height={28} style={{ color: 'var(--pink)', opacity: 0.3, margin: '0 auto 20px' }} />
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--gray)' }}>
                No scans yet
              </p>
              <p className="text-sm leading-relaxed max-w-xs mx-auto" style={{ color: 'var(--gray-muted)' }}>
                Run your first analysis to get started.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {recentScans.map((scan, i) => {
                const sColor =
                  scan.score >= 80 ? 'var(--green)' : scan.score >= 60 ? 'var(--amber)' : 'var(--red)';

                return (
                  <Link
                    key={scan.scanId}
                    href={`/history/${scan.scanId}`}
                    className="flex items-center justify-between px-6 py-5 no-underline rounded-xl hover:bg-white/[0.03]"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: sColor }} />
                      <span className="text-xs tabular-nums font-medium shrink-0" style={{ color: 'var(--gray-muted)' }}>
                        #{String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="text-sm truncate" style={{ color: 'rgba(255,255,255,0.75)' }}>
                        {new Date(scan.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <span
                      className="text-sm tabular-nums font-semibold shrink-0 ml-3"
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

        {/* Buy credits link if low */}
        {!isFounder && credits <= 1 && (
          <div className="mt-14 text-center">
            <Link
              href="/pricing"
              className="text-sm no-underline font-medium"
              style={{ color: 'var(--pink)' }}
            >
              Need more credits? View plans &rarr;
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
