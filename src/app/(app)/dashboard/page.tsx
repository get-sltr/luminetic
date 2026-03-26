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
  return `${id.slice(0, 4)}...${id.slice(-4)}`;
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

  const scorePct = avgScore !== null ? Math.max(1, avgScore) : 0;

  const bento = [
    { n: '01', href: '/completeness', title: 'Pre-flight check', body: 'Run diagnostics before your next analysis' },
    { n: '02', href: '/review-packet', title: 'Review packet', body: 'View your latest scan analysis report' },
    { n: '03', href: '/memory', title: 'Build memory', body: 'Train AI on your brand identity' },
  ] as const;

  return (
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 32px 80px' }}>

        {purchasedCredits && (
          <div
            style={{
              background: 'rgba(34, 197, 94, 0.04)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              padding: '20px 24px',
              marginBottom: 40,
              marginTop: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span className="blink-dot" style={{ background: 'var(--green)', boxShadow: '0 0 6px rgba(34,197,94,0.5)' }} />
              <span style={{ fontFamily: 'var(--mono)', fontSize: '0.58rem', letterSpacing: 2, textTransform: 'uppercase', color: 'var(--green)' }}>
                Payment received
              </span>
            </div>
            <p style={{ fontFamily: 'var(--body)', fontSize: '0.84rem', color: 'var(--text-mid)', margin: 0, paddingLeft: 13 }}>
              {purchasedCredits} scan credit{purchasedCredits > 1 ? 's' : ''} added.{' '}
              <Link href="/analyze" className="no-underline" style={{ color: 'var(--orange)', fontWeight: 600 }}>
                Run an analysis now →
              </Link>
            </p>
          </div>
        )}

        {/* Hero */}
        <div style={{ padding: '60px 0 20px', position: 'relative', overflow: 'hidden' }}>
          <h1 style={{
            fontFamily: 'var(--display)',
            fontSize: '5.5rem',
            letterSpacing: 3,
            lineHeight: 0.9,
            margin: 0,
            color: 'var(--text)',
          }}>
            WELCOME BACK,
            <span style={{
              display: 'block',
              fontSize: '6.5rem',
              color: 'var(--orange)',
              textShadow: '0 0 40px rgba(255,106,0,0.2), 0 0 80px rgba(255,106,0,0.1)',
            }}>
              {firstName.toUpperCase()}
            </span>
          </h1>
          <p style={{
            fontFamily: 'var(--mono)',
            fontSize: '0.68rem',
            color: 'var(--text-dim)',
            letterSpacing: 2,
            textTransform: 'uppercase',
            marginTop: 16,
          }}>
            <span style={{ color: 'var(--orange)', opacity: 0.5 }}>{'> '}</span>
            {formatRelativeLastScan(lastScanAt)}
          </p>

          {/* Decorative line */}
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

        {/* CTA */}
        <div style={{ padding: '32px 0 52px' }}>
          <Link
            href="/analyze"
            className="btn-primary no-underline"
            style={{ padding: '16px 44px' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width={20} height={20}>
              <circle cx={11} cy={11} r={8} />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            INITIALIZE SCAN
          </Link>
        </div>

        {/* Stats grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '240px 1fr 240px',
          gap: 0,
          marginBottom: 52,
          border: '1px solid var(--border)',
          position: 'relative',
        }}>
          {/* Gradient border overlay */}
          <div style={{
            position: 'absolute',
            inset: -1,
            border: '1px solid transparent',
            background: 'linear-gradient(135deg, rgba(255,106,0,0.2), transparent 30%, transparent 70%, rgba(255,106,0,0.1)) border-box',
            WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            pointerEvents: 'none',
          }} />

          {/* Credits */}
          <div className="stat-card-brutalist">
            <div className="stat-label-brutalist">
              <span className="blink-dot" /> // Credits
            </div>
            <div className="stat-value-brutalist" style={{
              color: isFounder ? 'var(--orange)' : credits > 0 ? 'var(--text)' : 'var(--red)',
              textShadow: isFounder ? '0 0 30px rgba(255,106,0,0.2)' : 'none',
            }}>
              {isFounder ? '∞' : credits}
            </div>
            <div style={{ fontFamily: 'var(--mono)', color: 'var(--text-dim)', fontSize: '0.62rem', letterSpacing: 1, textTransform: 'uppercase', marginTop: 8 }}>
              {isFounder ? 'Founder access' : `${credits} scan${credits !== 1 ? 's' : ''} available`}
            </div>
          </div>

          {/* Score */}
          <div className="stat-card-brutalist">
            <div className="stat-label-brutalist">
              <span className="blink-dot" /> // Avg Score
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
              <div className="score-block-brutalist">
                <div className="num">{avgScore ?? '—'}</div>
                <div className="corner-bl" />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '0.62rem', letterSpacing: 1, textTransform: 'uppercase' }}>
                  <div style={{ color: 'var(--text-mid)' }}>Out of 100</div>
                  {avgScore !== null && avgScore < 60 && (
                    <div style={{ color: 'var(--red)', marginTop: 5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ animation: 'blink 1.5s step-end infinite' }}>!!</span> {scoreMeta}
                    </div>
                  )}
                  {avgScore !== null && avgScore >= 60 && (
                    <div style={{ color: avgScore >= 80 ? 'var(--green)' : 'var(--warning)', marginTop: 5 }}>
                      {scoreMeta}
                    </div>
                  )}
                  {avgScore === null && (
                    <div style={{ color: 'var(--text-dim)', marginTop: 5 }}>{scoreMeta}</div>
                  )}
                </div>
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '0.5rem', color: 'var(--text-dim)', letterSpacing: 1, marginBottom: 4 }}>
                    PROGRESS {avgScore ?? 0}/100
                  </div>
                  <div className="score-bar-bg">
                    <div className="score-bar-fill" style={{ width: `${scorePct}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Total Scans */}
          <div className="stat-card-brutalist">
            <div className="stat-label-brutalist">
              <span className="blink-dot" /> // Total Scans
            </div>
            <div className="stat-value-brutalist" style={{ color: 'var(--text)' }}>
              {scanCount}
            </div>
            <div style={{ fontFamily: 'var(--mono)', color: 'var(--text-dim)', fontSize: '0.62rem', letterSpacing: 1, textTransform: 'uppercase', marginTop: 8 }}>
              Lifetime analyses
            </div>
          </div>
        </div>

        {/* Steps */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 0,
          marginBottom: 52,
          border: '1px solid var(--border)',
        }}>
          {bento.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="step-brutalist no-underline"
            >
              <div style={{
                fontFamily: 'var(--display)',
                fontSize: '2.4rem',
                color: 'rgba(255,106,0,0.12)',
                marginBottom: 12,
                letterSpacing: 2,
              }}>
                {card.n}
              </div>
              <h3 style={{
                fontFamily: 'var(--body)',
                fontSize: '1rem',
                fontWeight: 700,
                marginBottom: 6,
                letterSpacing: 0.3,
                color: 'var(--text)',
                position: 'relative',
                zIndex: 1,
              }}>
                {card.title}
              </h3>
              <p style={{
                fontFamily: 'var(--body)',
                color: 'var(--text-dim)',
                fontSize: '0.78rem',
                lineHeight: 1.5,
                position: 'relative',
                zIndex: 1,
                margin: 0,
              }}>
                {card.body}
              </p>
              <div style={{
                position: 'absolute',
                top: 28,
                right: 24,
                color: 'var(--orange)',
                fontFamily: 'var(--mono)',
                fontSize: '0.9rem',
                opacity: 0,
                transform: 'translateX(-8px)',
                transition: 'all 0.25s',
              }}
              className="step-arrow"
              >
                →
              </div>
            </Link>
          ))}
        </div>

        {/* Recent Scans */}
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 0',
            borderBottom: '2px solid var(--orange)',
            position: 'relative',
          }}>
            <div style={{
              fontFamily: 'var(--mono)',
              fontSize: '0.58rem',
              letterSpacing: 2.5,
              textTransform: 'uppercase',
              color: 'var(--text-dim)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span className="blink-dot" style={{ background: 'var(--green)', boxShadow: '0 0 4px rgba(34,197,94,0.5)' }} />
              // Recent Scans
            </div>
            {recentScans.length > 0 && (
              <Link
                href="/history"
                className="no-underline"
                style={{
                  color: 'var(--orange)',
                  fontFamily: 'var(--mono)',
                  fontSize: '0.62rem',
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  transition: 'all 0.2s',
                }}
              >
                View all →
              </Link>
            )}
          </div>

          {recentScans.length === 0 ? (
            <div style={{ padding: '48px 16px', textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--body)', fontSize: '0.84rem', color: 'var(--text-mid)', marginBottom: 8 }}>
                No scans yet
              </p>
              <p style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', color: 'var(--text-dim)', margin: 0 }}>
                Initialize a scan to populate this log.
              </p>
            </div>
          ) : (
            <table className="tbl-brutalist">
              <tbody>
                {recentScans.map((scan, i) => (
                  <tr key={scan.scanId} onClick={() => {}} style={{ cursor: 'pointer' }}>
                    <td>
                      <Link href={`/history/${scan.scanId}`} className="no-underline" style={{ fontFamily: 'var(--mono)', color: 'var(--orange)', fontWeight: 700, fontSize: '0.72rem' }}>
                        #{String(i + 1).padStart(2, '0')}
                      </Link>
                    </td>
                    <td style={{ color: 'var(--text-mid)', fontSize: '0.78rem', fontFamily: 'var(--body)' }}>
                      {new Date(scan.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </td>
                    <td style={{ fontFamily: 'var(--mono)', color: 'var(--text-dim)', fontSize: '0.68rem', textAlign: 'center', letterSpacing: 0.5 }}>
                      {shortScanId(scan.scanId)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`pill ${scan.score >= 60 ? 'pill-g' : 'pill-r'}`}>
                        {scan.score}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{
                        fontFamily: 'var(--mono)',
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        letterSpacing: 2,
                        padding: '5px 16px',
                        color: 'var(--green)',
                        border: '1px solid rgba(34,197,94,0.2)',
                        background: 'rgba(34,197,94,0.04)',
                      }}>
                        COMPLETE
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!isFounder && credits <= 1 && (
          <div style={{ marginTop: 40, textAlign: 'center' }}>
            <Link href="/pricing" className="no-underline" style={{
              fontFamily: 'var(--mono)',
              fontSize: '0.68rem',
              color: 'var(--orange)',
              letterSpacing: 1.5,
              textTransform: 'uppercase',
            }}>
              Need more credits? View plans →
            </Link>
          </div>
        )}

        {/* Status bar */}
        <div className="status-bar-brutalist">
          <div className="status-live">System operational</div>
          <div>Luminetic v2.0 // Los Angeles, CA</div>
          <div>&copy; 2026 SLTR Digital LLC</div>
        </div>
      </div>
    </div>
  );
}
