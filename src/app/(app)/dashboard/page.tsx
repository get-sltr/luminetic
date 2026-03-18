import { getAuthUser } from '@/lib/auth';
import { getUser, getScans } from '@/lib/db';
import Link from 'next/link';

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

  return (
    <div className="min-h-screen pt-24 pb-20" style={{ background: 'var(--black)' }}>
      <div className="max-w-[1100px] mx-auto px-6 md:px-10">

        {/* Purchase confirmation */}
        {purchasedCredits && (
          <div
            className="rounded-xl p-6 mb-8 relative overflow-hidden"
            style={{
              background: 'rgba(74, 222, 128, 0.06)',
              border: '1px solid rgba(74, 222, 128, 0.15)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div
              className="absolute top-0 left-0 w-full h-[1px]"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(74,222,128,0.6), transparent)' }}
            />
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 rounded-full" style={{ background: '#4ade80', boxShadow: '0 0 8px rgba(74,222,128,0.5)' }} />
              <h2 className="text-base font-semibold" style={{ fontFamily: "'Sora', sans-serif", color: '#4ade80' }}>
                Payment received
              </h2>
            </div>
            <p className="text-sm ml-5" style={{ color: 'var(--gray)' }}>
              {purchasedCredits} scan credit{purchasedCredits > 1 ? 's' : ''} added to your account.{' '}
              <Link href="/analyze" className="no-underline font-medium transition-colors" style={{ color: 'var(--pink)' }}>
                Run an analysis now &rarr;
              </Link>
            </p>
          </div>
        )}

        {/* Header */}
        <div className="mb-10">
          <div
            className="text-[10px] tracking-[4px] uppercase mb-3 font-medium"
            style={{ color: 'var(--pink)' }}
          >
            Overview
          </div>
          <h1
            className="text-4xl font-semibold tracking-tight"
            style={{ fontFamily: "'Sora', sans-serif", color: 'var(--white)' }}
          >
            Dashboard
          </h1>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Total Scans', value: scanCount.toString(), icon: '◎' },
            { label: 'Avg Score', value: avgScore !== null ? `${avgScore}` : '—', suffix: avgScore !== null ? '/100' : '', icon: '◆' },
            {
              label: 'Credits Left',
              value: isFounder ? '∞' : credits.toString(),
              color: isFounder ? '#a78bfa' : credits > 0 ? '#34d399' : '#ff6b6b',
              icon: '⬡',
            },
            { label: 'Plan', value: plan.toUpperCase(), icon: '△' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="group rounded-xl p-6 relative overflow-hidden transition-all duration-300"
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                backdropFilter: 'blur(10px)',
              }}
            >
              {/* Top glow line */}
              <div
                className="absolute top-0 left-0 w-full h-[1px] opacity-40"
                style={{ background: 'linear-gradient(90deg, transparent, var(--pink-dim), transparent)' }}
              />
              {/* Corner accent */}
              <div
                className="absolute top-0 right-0 w-16 h-16 opacity-[0.03]"
                style={{
                  background: 'radial-gradient(circle at top right, var(--pink), transparent)',
                }}
              />
              <div className="flex items-center justify-between mb-4">
                <div
                  className="text-[10px] tracking-[3px] uppercase font-medium"
                  style={{ color: 'var(--gray)' }}
                >
                  {stat.label}
                </div>
                <span className="text-[14px] opacity-20" style={{ color: 'var(--pink)' }}>
                  {stat.icon}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span
                  className="text-3xl font-bold tracking-tight"
                  style={{
                    fontFamily: "'Sora', sans-serif",
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
          ))}
        </div>

        {/* CTA — Run Analysis */}
        <div
          className="rounded-xl p-8 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between relative overflow-hidden transition-all duration-300 group"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 45, 120, 0.04) 0%, rgba(255, 255, 255, 0.02) 100%)',
            border: '1px solid rgba(255, 45, 120, 0.12)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {/* Top glow */}
          <div
            className="absolute top-0 left-0 w-full h-[1px]"
            style={{ background: 'linear-gradient(90deg, transparent, var(--pink), transparent)' }}
          />
          {/* Background glow orb */}
          <div
            className="absolute -right-20 -top-20 w-60 h-60 opacity-[0.06] rounded-full"
            style={{ background: 'radial-gradient(circle, var(--pink), transparent)' }}
          />
          <div className="relative z-10 mb-4 md:mb-0">
            <h2
              className="text-xl font-semibold mb-2 tracking-tight"
              style={{ fontFamily: "'Sora', sans-serif", color: 'var(--white)' }}
            >
              Run a new analysis
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--gray)' }}>
              Paste your App Store review feedback and get a dual-model action plan in seconds.
            </p>
          </div>
          <Link
            href="/analyze"
            className="relative z-10 shrink-0 md:ml-8 px-7 py-3.5 rounded-lg text-[11px] tracking-[2px] uppercase text-white no-underline font-semibold transition-all duration-300"
            style={{
              background: 'var(--pink)',
              boxShadow: '0 0 20px rgba(255, 45, 120, 0.2), 0 4px 12px rgba(0, 0, 0, 0.3)',
            }}
          >
            Analyze Now &rarr;
          </Link>
        </div>

        {/* Buy Credits (low/no credits) */}
        {!isFounder && credits <= 0 && (
          <div
            className="rounded-xl p-8 mb-6 relative overflow-hidden"
            style={{
              background: 'rgba(255, 107, 107, 0.03)',
              border: '1px solid rgba(255, 107, 107, 0.12)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div
              className="absolute top-0 left-0 w-full h-[1px]"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,107,107,0.4), transparent)' }}
            />
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2
                  className="text-lg font-semibold mb-1.5 tracking-tight"
                  style={{ fontFamily: "'Sora', sans-serif", color: 'var(--white)' }}
                >
                  No scan credits remaining
                </h2>
                <p className="text-sm" style={{ color: 'var(--gray)' }}>
                  Purchase a scan pack to run AI-powered analyses.
                </p>
              </div>
              <Link
                href="/pricing"
                className="shrink-0 px-6 py-3 rounded-lg text-[11px] tracking-[2px] uppercase text-white no-underline font-semibold transition-all duration-300"
                style={{
                  background: 'rgba(255, 107, 107, 0.15)',
                  border: '1px solid rgba(255, 107, 107, 0.3)',
                }}
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
              style={{ fontFamily: "'Sora', sans-serif", color: 'var(--white)' }}
            >
              Recent scans
            </h2>
            {recentScans.length > 0 && (
              <Link
                href="/history"
                className="text-[11px] tracking-[1px] uppercase no-underline font-medium transition-colors duration-200"
                style={{ color: 'var(--gray)' }}
              >
                View all &rarr;
              </Link>
            )}
          </div>

          {recentScans.length === 0 ? (
            <div
              className="rounded-xl p-16 text-center relative overflow-hidden"
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <div
                className="absolute top-0 left-0 w-full h-[1px] opacity-30"
                style={{ background: 'linear-gradient(90deg, transparent, var(--pink-dim), transparent)' }}
              />
              <div className="text-3xl mb-4 opacity-20">◎</div>
              <p className="text-sm mb-1" style={{ color: 'var(--gray)' }}>
                No scans yet
              </p>
              <p className="text-xs" style={{ color: 'rgba(136, 136, 136, 0.6)' }}>
                Run your first analysis to get started.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {recentScans.map((scan, i) => {
                const scoreColor =
                  scan.score >= 80 ? '#4ade80' : scan.score >= 60 ? '#facc15' : '#f87171';
                const scoreBg =
                  scan.score >= 80
                    ? 'rgba(74,222,128,0.06)'
                    : scan.score >= 60
                      ? 'rgba(250,204,21,0.06)'
                      : 'rgba(248,113,113,0.06)';
                const scoreBorder =
                  scan.score >= 80
                    ? 'rgba(74,222,128,0.15)'
                    : scan.score >= 60
                      ? 'rgba(250,204,21,0.15)'
                      : 'rgba(248,113,113,0.15)';

                return (
                  <Link
                    key={scan.scanId}
                    href={`/history/${scan.scanId}`}
                    className="rounded-lg flex items-center justify-between px-6 py-4 no-underline transition-all duration-200 group/scan"
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className="text-[11px] font-medium tabular-nums"
                        style={{ color: 'var(--gray)', fontFamily: "'Sora', sans-serif" }}
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
                      className="text-[12px] font-semibold px-3 py-1.5 rounded-md tabular-nums"
                      style={{
                        fontFamily: "'Sora', sans-serif",
                        color: scoreColor,
                        background: scoreBg,
                        border: `1px solid ${scoreBorder}`,
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
