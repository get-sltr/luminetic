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
    <div className="min-h-screen" style={{ background: 'var(--black)' }}>
      <div className="max-w-[800px] mx-auto px-6 md:px-10 pt-32 pb-24">

        {/* Purchase confirmation */}
        {purchasedCredits && (
          <div
            className="rounded-xl p-5 mb-10 relative overflow-hidden"
            style={{
              background: 'rgba(74, 222, 128, 0.04)',
              border: '1px solid rgba(74, 222, 128, 0.15)',
            }}
          >
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
        <div className="text-center mb-14">
          <div className="text-[12px] tracking-[5px] uppercase mb-3" style={{ color: 'var(--pink)' }}>
            Dashboard
          </div>
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ color: 'var(--white)', fontFamily: "var(--font-heading), 'Space Grotesk', sans-serif" }}
          >
            Welcome back
          </h1>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div
            className="rounded-xl p-6 text-center"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="text-[9px] tracking-[3px] uppercase mb-3" style={{ color: 'var(--gray)' }}>
              Credits
            </div>
            <div className="flex items-center justify-center gap-2">
              <IconCredits width={14} height={14} style={{ color: 'var(--pink)', opacity: 0.5 }} />
              <span
                className="text-2xl font-light tracking-tight"
                style={{ color: isFounder ? '#a78bfa' : credits > 0 ? 'var(--green)' : 'var(--red)' }}
              >
                {isFounder ? '\u221E' : credits}
              </span>
            </div>
          </div>
          <div
            className="rounded-xl p-6 text-center"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="text-[9px] tracking-[3px] uppercase mb-3" style={{ color: 'var(--gray)' }}>
              Avg Score
            </div>
            <span className="text-2xl font-light tracking-tight" style={{ color: scoreColor }}>
              {avgScore !== null ? avgScore : '\u2014'}
            </span>
          </div>
          <div
            className="rounded-xl p-6 text-center"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="text-[9px] tracking-[3px] uppercase mb-3" style={{ color: 'var(--gray)' }}>
              Total Scans
            </div>
            <div className="flex items-center justify-center gap-2">
              <IconStar width={14} height={14} style={{ color: 'var(--pink)', opacity: 0.5 }} />
              <span className="text-2xl font-light tracking-tight" style={{ color: 'var(--white)' }}>
                {scanCount}
              </span>
            </div>
          </div>
        </div>

        {/* Plan badge */}
        <div className="flex justify-center mb-10">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
            style={{ background: 'rgba(255,45,120,0.06)', border: '1px solid rgba(255,45,120,0.15)' }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--pink)' }} />
            <span className="text-[10px] tracking-[2px] uppercase font-medium" style={{ color: 'var(--gray)' }}>
              {plan} plan
            </span>
          </div>
        </div>

        {/* CTA */}
        <Link
          href="/analyze"
          className="block no-underline rounded-xl text-center mb-8"
          style={{
            padding: '20px',
            background: 'linear-gradient(135deg, rgba(255,45,120,0.12), rgba(255,45,120,0.04))',
            border: '1px solid rgba(255,45,120,0.25)',
            boxShadow: '0 0 40px rgba(255,45,120,0.08)',
            transition: 'all 0.3s ease',
          }}
        >
          <span
            className="flex items-center justify-center gap-3 text-[11px] tracking-[3px] uppercase font-medium"
            style={{ color: 'var(--white)' }}
          >
            <IconAnalyze width={16} height={16} />
            Analyze Now
            <IconArrowRight width={14} height={14} />
          </span>
        </Link>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-4 mb-12">
          {[
            { href: '/completeness', label: 'Pre-Flight', Icon: IconChecklist },
            { href: '/review-packet', label: 'Review Packet', Icon: IconPacket },
            { href: '/memory', label: 'Build Memory', Icon: IconMemory },
          ].map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-3 no-underline rounded-xl py-5 px-4"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                transition: 'all 0.2s ease',
              }}
            >
              <Icon width={18} height={18} style={{ color: 'var(--pink)', opacity: 0.5 }} />
              <span className="text-[10px] tracking-[1.5px] uppercase text-center" style={{ color: 'var(--gray)' }}>
                {label}
              </span>
            </Link>
          ))}
        </div>

        {/* Recent Scans */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[11px] tracking-[3px] uppercase font-bold m-0" style={{ color: 'var(--white)' }}>
              Recent Scans
            </h2>
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
              className="rounded-xl p-14 text-center"
              style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <IconTarget width={24} height={24} style={{ color: 'var(--pink)', opacity: 0.25, margin: '0 auto 16px' }} />
              <p className="text-[12px] tracking-[1px] mb-1" style={{ color: 'var(--gray)' }}>
                No scans yet
              </p>
              <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Run your first analysis to get started.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {recentScans.map((scan, i) => {
                const sColor =
                  scan.score >= 80 ? 'var(--green)' : scan.score >= 60 ? 'var(--amber)' : 'var(--red)';

                return (
                  <Link
                    key={scan.scanId}
                    href={`/history/${scan.scanId}`}
                    className="flex items-center justify-between px-5 py-4 no-underline rounded-lg"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-[5px] h-[5px] rounded-full" style={{ background: sColor }} />
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

        {/* Buy credits link if low */}
        {!isFounder && credits <= 1 && (
          <div className="mt-10 text-center">
            <Link
              href="/pricing"
              className="text-[11px] tracking-[2px] uppercase no-underline font-medium"
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
