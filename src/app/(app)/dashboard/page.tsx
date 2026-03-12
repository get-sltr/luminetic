import { getAuthUser } from '@/lib/auth';
import { getUser, getScans } from '@/lib/db';
import Link from 'next/link';

export default async function DashboardPage() {
  const authUser = await getAuthUser();
  if (!authUser) return null;

  const [profile, scans] = await Promise.all([
    getUser(authUser.userId),
    getScans(authUser.userId, 5),
  ]);

  const plan = (profile?.plan as string) || 'free';
  const isFounder = plan === 'founder';
  const credits = (profile?.scanCredits as number) || 0;
  const scanCount = (profile?.scanCount as number) || 0;
  const recentScans = scans as Array<{ scanId: string; score: number; createdAt: string }>;
  const avgScore = recentScans.length
    ? Math.round(recentScans.reduce((sum, s) => sum + (s.score || 0), 0) / recentScans.length)
    : null;

  return (
    <div className="max-w-[1100px] mx-auto px-10 py-12">
      {/* Header */}
      <div className="mb-12">
        <div className="text-[11px] tracking-[4px] uppercase mb-2" style={{ color: 'var(--pink)' }}>
          Overview
        </div>
        <h1 className="text-3xl font-semibold" style={{ fontFamily: "'Sora', sans-serif" }}>
          Dashboard
        </h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
        {[
          { label: 'Total Scans', value: scanCount.toString() },
          { label: 'Avg Score', value: avgScore !== null ? `${avgScore}/100` : '—' },
          { label: 'Credits Left', value: isFounder ? '∞' : credits.toString(), color: isFounder ? '#a78bfa' : credits > 0 ? '#34d399' : '#ff6b6b' },
          { label: 'Plan', value: plan.toUpperCase() },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-6 relative overflow-hidden"
            style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}
          >
            <div
              className="absolute top-0 left-0 w-full h-px"
              style={{ background: 'linear-gradient(90deg, transparent, var(--pink-dim), transparent)' }}
            />
            <div className="text-[11px] tracking-[3px] uppercase mb-3" style={{ color: 'var(--gray)' }}>
              {stat.label}
            </div>
            <div className="text-3xl font-bold" style={{ fontFamily: "'Sora', sans-serif", color: ('color' in stat && stat.color) ? stat.color as string : 'var(--white)' }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div
        className="p-8 mb-12 flex items-center justify-between relative overflow-hidden"
        style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}
      >
        <div
          className="absolute top-0 left-0 w-full h-px"
          style={{ background: 'linear-gradient(90deg, transparent, var(--pink-dim), transparent)' }}
        />
        <div>
          <h2 className="text-xl font-semibold mb-1" style={{ fontFamily: "'Sora', sans-serif" }}>
            Run a new analysis
          </h2>
          <p className="text-[13px]" style={{ color: 'var(--gray)' }}>
            Paste your App Store review feedback and get a dual-model action plan in seconds.
          </p>
        </div>
        <Link
          href="/analyze"
          className="shrink-0 ml-8 px-6 py-3 text-[12px] tracking-[2px] uppercase text-white no-underline transition-all duration-300"
          style={{ background: 'var(--pink)', border: '1px solid var(--pink)' }}
        >
          Analyze Now →
        </Link>
      </div>

      {/* Buy Credits */}
      {!isFounder && credits <= 0 && (
        <div
          className="p-8 mb-12 relative overflow-hidden"
          style={{ background: 'var(--panel-bg)', border: '1px solid rgba(255,107,107,0.2)' }}
        >
          <div className="absolute top-0 left-0 w-full h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,107,107,0.4), transparent)' }} />
          <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "'Sora', sans-serif" }}>
            No scan credits remaining
          </h2>
          <p className="text-[13px] mb-5" style={{ color: 'var(--gray)' }}>
            Purchase a scan pack to run AI-powered analyses.
          </p>
          <div className="flex gap-3">
            <Link href="/pricing" className="px-5 py-2.5 text-[12px] tracking-[2px] uppercase text-white no-underline" style={{ background: 'var(--pink)', border: '1px solid var(--pink)' }}>
              Buy Credits →
            </Link>
          </div>
        </div>
      )}

      {/* Recent scans */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold" style={{ fontFamily: "'Sora', sans-serif" }}>
            Recent scans
          </h2>
          {recentScans.length > 0 && (
            <Link href="/history" className="text-[12px] no-underline transition-colors" style={{ color: 'var(--gray)' }}>
              View all →
            </Link>
          )}
        </div>

        {recentScans.length === 0 ? (
          <div
            className="p-12 text-center"
            style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}
          >
            <p className="text-[13px]" style={{ color: 'var(--gray)' }}>
              No scans yet. Run your first analysis to get started.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recentScans.map((scan) => (
              <Link
                key={scan.scanId}
                href={`/history/${scan.scanId}`}
                className="flex items-center justify-between px-6 py-4 no-underline transition-all duration-200"
                style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--pink-dim)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--panel-border)')}
              >
                <span className="text-[13px]" style={{ color: 'var(--gray)' }}>
                  {new Date(scan.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span
                  className="text-[13px] font-medium px-3 py-1"
                  style={{
                    fontFamily: "'Sora', sans-serif",
                    color: scan.score >= 80 ? '#4ade80' : scan.score >= 60 ? '#facc15' : '#f87171',
                    background: scan.score >= 80 ? 'rgba(74,222,128,0.05)' : scan.score >= 60 ? 'rgba(250,204,21,0.05)' : 'rgba(248,113,113,0.05)',
                    border: `1px solid ${scan.score >= 80 ? 'rgba(74,222,128,0.2)' : scan.score >= 60 ? 'rgba(250,204,21,0.2)' : 'rgba(248,113,113,0.2)'}`,
                  }}
                >
                  {scan.score}/100
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
