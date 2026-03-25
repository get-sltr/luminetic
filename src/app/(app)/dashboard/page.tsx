import type { CSSProperties } from 'react';
import { getAuthUser } from '@/lib/auth';
import { getUser, getScans } from '@/lib/db';
import { SCAN_PACKS } from '@/lib/scan-packs';
import Link from 'next/link';

const PACK_CREDITS: Record<string, number> = Object.fromEntries(
  SCAN_PACKS.map((p) => [p.id, p.scans])
);

function displayNameFromEmail(email: string): string {
  const local = email.split('@')[0] || 'there';
  const segment = local.split(/[._-]/)[0] || local;
  if (!segment) return 'there';
  return segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase();
}

function formatRelativeLastScan(iso: string | undefined): string {
  if (!iso) return 'No scans recorded yet';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  const hr = Math.floor(min / 60);
  const days = Math.floor(hr / 24);
  if (days > 1) return `Last scan completed ${days} days ago`;
  if (days === 1) return 'Last scan completed yesterday';
  if (hr >= 1) return `Last scan completed ${hr} hour${hr > 1 ? 's' : ''} ago`;
  if (min >= 1) return `Last scan completed ${min} minute${min > 1 ? 's' : ''} ago`;
  return 'Last scan completed just now';
}

function shortScanId(id: string): string {
  if (id.length <= 10) return id;
  return `${id.slice(0, 4)}…${id.slice(-4)}`;
}

function ScoreArcGauge({ score }: { score: number | null }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const pct = score === null ? 0 : Math.min(1, Math.max(0, score / 100));
  const offset = c * (1 - pct);
  return (
    <svg width={90} height={90} viewBox="0 0 90 90" className="shrink-0" aria-hidden>
      <defs>
        <filter id="gaugeGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle
        cx={45}
        cy={45}
        r={r}
        fill="none"
        stroke="rgba(255,106,0,0.08)"
        strokeWidth={3}
      />
      <circle
        cx={45}
        cy={45}
        r={r}
        fill="none"
        stroke="var(--orange)"
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 45 45)"
        filter="url(#gaugeGlow)"
      />
      <text
        x={45}
        y={46}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fontFamily: 'var(--font-orbitron), ui-monospace, monospace',
          fontSize: 24,
          fontWeight: 400,
          fill: 'var(--orange)',
          letterSpacing: '0.08em',
        }}
      >
        {score !== null ? score : '—'}
      </text>
    </svg>
  );
}

function SearchIcon({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg
      className={className}
      style={style}
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx={11} cy={11} r={8} />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

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

  const firstName = displayNameFromEmail(authUser.email);
  const lastScanAt = recentScans[0]?.createdAt;
  const scoreMeta =
    avgScore === null
      ? 'Run a scan to benchmark'
      : avgScore >= 80
        ? 'Strong readiness'
        : avgScore >= 60
          ? 'Room to improve'
          : 'Needs attention';

  const scoreColor = (s: number) =>
    s >= 80 ? 'var(--success)' : s >= 60 ? 'var(--warning)' : 'var(--danger)';

  const bento = [
    {
      n: '01',
      href: '/completeness',
      title: 'Pre-flight check',
      body: 'Run diagnostics before your next analysis',
    },
    {
      n: '02',
      href: '/review-packet',
      title: 'Review packet',
      body: 'View your latest scan analysis report',
    },
    {
      n: '03',
      href: '/memory',
      title: 'Build memory',
      body: 'Train AI on your brand identity',
    },
  ] as const;

  return (
    <div className="min-h-screen w-full font-outfit" style={{ background: 'transparent' }}>
      <div className="w-full max-w-[1200px] mx-auto px-6 lg:px-10 pt-10 sm:pt-14 pb-24 md:pb-32">

        {purchasedCredits && (
          <div
            className="rounded-xl p-6 sm:p-7 mb-10 sm:mb-12 relative overflow-hidden border"
            style={{
              background: 'rgba(0, 214, 143, 0.04)',
              borderColor: 'rgba(0, 214, 143, 0.2)',
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: 'var(--success)', boxShadow: '0 0 8px rgba(0,214,143,0.45)' }}
              />
              <span className="text-xs tracking-[0.2em] uppercase font-medium font-orbitron" style={{ color: 'var(--success)' }}>
                Payment received
              </span>
            </div>
            <p className="text-sm ml-5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {purchasedCredits} scan credit{purchasedCredits > 1 ? 's' : ''} added.{' '}
              <Link href="/analyze" className="no-underline font-medium" style={{ color: 'var(--orange)' }}>
                Run an analysis now →
              </Link>
            </p>
          </div>
        )}

        {/* Hero */}
        <header className="text-center mb-12 md:mb-16">
          <p
            className="text-[13px] uppercase mb-4 font-outfit font-light"
            style={{ color: 'var(--text-tertiary)', letterSpacing: '0.15em' }}
          >
            System status: online
          </p>
          <div className="flex justify-center mb-4">
            <h1
              className="hud-bracket-heading font-orbitron text-[28px] sm:text-[32px] m-0"
              style={{
                color: 'var(--text-primary)',
                fontWeight: 400,
                letterSpacing: '0.08em',
              }}
            >
              Welcome back,{' '}
              <span
                style={{
                  color: 'var(--orange)',
                  textShadow: '0 0 30px rgba(255,106,0,0.2)',
                }}
              >
                {firstName}
              </span>
            </h1>
          </div>
          <p className="text-sm sm:text-[14px] font-light max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
            {formatRelativeLastScan(lastScanAt)}
          </p>

          <div className="mt-10 flex justify-center">
            <Link
              href="/analyze"
              className="hud-cta-scan group inline-flex items-center gap-2.5 no-underline px-7 py-3.5 rounded-none font-outfit uppercase"
              style={{
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: '0.08em',
                color: 'var(--orange)',
                border: '1px solid var(--orange)',
                background: 'transparent',
              }}
            >
              <SearchIcon className="opacity-90 group-hover:opacity-100" style={{ color: 'var(--orange)' }} />
              Initialize scan
            </Link>
          </div>
        </header>

        {/* HUD stats bar */}
        <div
          className="flex flex-col md:flex-row rounded-xl overflow-hidden mb-12 md:mb-14 border transition-shadow duration-300"
          style={{
            borderColor: 'var(--glass-border)',
            background: 'var(--glass)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Credits */}
          <div
            className="hud-stat-segment flex-1 px-6 md:px-8 py-8 transition-colors duration-200 md:border-r"
            style={{ borderColor: 'var(--glass-border)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1 h-1 rounded-full shrink-0" style={{ background: 'var(--orange)', boxShadow: '0 0 6px var(--orange)' }} />
              <span
                className="text-[10px] uppercase font-medium font-orbitron"
                style={{ color: 'var(--text-tertiary)', letterSpacing: '0.25em' }}
              >
                Credits
              </span>
            </div>
            <div
              className="font-orbitron text-[36px] sm:text-[40px] tabular-nums mb-1"
              style={{
                fontWeight: 400,
                letterSpacing: '0.06em',
                color: isFounder ? 'var(--purple)' : credits > 0 ? 'var(--success)' : 'var(--danger)',
              }}
            >
              {isFounder ? '∞' : credits}
            </div>
            <p className="text-xs font-light m-0" style={{ color: 'var(--text-secondary)' }}>
              {isFounder ? 'Founder access' : credits === 1 ? '1 scan remaining' : `${credits} scans available`}
            </p>
          </div>

          {/* Avg + gauge */}
          <div
            className="hud-stat-segment flex-1 flex flex-col sm:flex-row items-center justify-center gap-6 px-6 md:px-8 py-8 transition-colors duration-200 md:border-r"
            style={{ borderColor: 'var(--glass-border)' }}
          >
            <ScoreArcGauge score={avgScore} />
            <div className="text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start mb-2">
                <span className="w-1 h-1 rounded-full shrink-0" style={{ background: 'var(--orange)', boxShadow: '0 0 6px var(--orange)' }} />
                <span
                  className="text-[10px] uppercase font-medium font-orbitron"
                  style={{ color: 'var(--text-tertiary)', letterSpacing: '0.25em' }}
                >
                  Avg score
                </span>
              </div>
              <p className="text-sm font-light m-0 mb-1" style={{ color: 'var(--text-secondary)' }}>
                Out of 100
              </p>
              <p className="text-xs font-light m-0" style={{ color: 'var(--text-tertiary)' }}>
                {scoreMeta}
              </p>
            </div>
          </div>

          {/* Total scans */}
          <div className="hud-stat-segment flex-1 px-6 md:px-8 py-8 transition-colors duration-200">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1 h-1 rounded-full shrink-0" style={{ background: 'var(--orange)', boxShadow: '0 0 6px var(--orange)' }} />
              <span
                className="text-[10px] uppercase font-medium font-orbitron"
                style={{ color: 'var(--text-tertiary)', letterSpacing: '0.25em' }}
              >
                Total scans
              </span>
            </div>
            <div
              className="font-orbitron text-[36px] sm:text-[40px] tabular-nums mb-1"
              style={{ fontWeight: 400, letterSpacing: '0.06em', color: 'var(--text-primary)' }}
            >
              {scanCount}
            </div>
            <p className="text-xs font-light m-0" style={{ color: 'var(--text-secondary)' }}>
              Lifetime analyses
            </p>
          </div>
        </div>

        {/* Bento */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 mb-8">
          {bento.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group relative no-underline rounded-xl p-6 border transition-all duration-250 hover:-translate-y-0.5"
              style={{
                borderColor: 'var(--glass-border)',
                background: 'var(--glass)',
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <span
                  className="font-orbitron text-[10px]"
                  style={{ color: 'var(--text-tertiary)', letterSpacing: '0.2em' }}
                >
                  {card.n}
                </span>
                <span
                  className="text-lg leading-none transition-colors duration-200 group-hover:text-[var(--orange)]"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  →
                </span>
              </div>
              <h3 className="text-base font-medium mb-2 m-0 font-outfit" style={{ color: 'var(--text-primary)' }}>
                {card.title}
              </h3>
              <p className="text-[13px] leading-relaxed font-light m-0" style={{ color: 'var(--text-secondary)' }}>
                {card.body}
              </p>
            </Link>
          ))}
        </div>

        {/* Recent scans table */}
        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: 'var(--glass-border)', background: 'var(--glass)' }}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(255,106,0,0.04)' }}>
            <span
              className="font-orbitron text-[10px] tracking-[0.2em] uppercase"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Recent scans
            </span>
            {recentScans.length > 0 && (
              <Link href="/history" className="text-[11px] no-underline font-medium font-outfit transition-colors hover:opacity-90" style={{ color: 'var(--orange)' }}>
                View all →
              </Link>
            )}
          </div>

          {recentScans.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <p className="text-sm font-medium mb-2 font-outfit" style={{ color: 'var(--text-secondary)' }}>
                No scans yet
              </p>
              <p className="text-sm font-light max-w-xs mx-auto m-0" style={{ color: 'var(--text-tertiary)' }}>
                Initialize a scan to populate this log.
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'rgba(255,106,0,0.04)' }}>
              {recentScans.map((scan, i) => (
                <Link
                  key={scan.scanId}
                  href={`/history/${scan.scanId}`}
                  className="hud-scan-row px-4 sm:px-5 py-3.5 no-underline font-outfit"
                >
                  <span className="text-xs tabular-nums font-orbitron font-normal" style={{ color: 'var(--text-tertiary)' }}>
                    #{String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-sm truncate min-w-0" style={{ color: 'var(--text-secondary)' }}>
                    {new Date(scan.createdAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="hud-scan-id text-xs truncate font-mono min-w-0" style={{ color: 'var(--text-tertiary)' }}>
                    {shortScanId(scan.scanId)}
                  </span>
                  <span className="font-orbitron text-sm tabular-nums text-right font-normal" style={{ color: scoreColor(scan.score) }}>
                    {scan.score}
                  </span>
                  <div className="flex justify-end">
                    <span
                      className="text-[10px] uppercase px-2 py-1 font-orbitron font-medium"
                      style={{
                        color: 'var(--success)',
                        background: 'rgba(0,214,143,0.08)',
                        border: '1px solid rgba(0,214,143,0.25)',
                        borderRadius: 4,
                        letterSpacing: '0.12em',
                      }}
                    >
                      Complete
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {!isFounder && credits <= 1 && (
          <div className="mt-12 text-center">
            <Link href="/pricing" className="text-sm no-underline font-medium font-outfit" style={{ color: 'var(--orange)' }}>
              Need more credits? View plans →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
