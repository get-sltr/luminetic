import { getAuthUser } from '@/lib/auth';
import { getAllScansWithIssues } from '@/lib/db';
import Link from 'next/link';
import { IconTrendUp, IconTarget, IconWarning, IconAnalyze } from '@/components/icons';

interface Issue {
  severity?: string;
  issue?: string;
  guideline_section?: string;
  source?: string;
}

interface MergedResult {
  issues?: Issue[];
  assessment?: { score: number };
  guidelines?: { section?: string; name?: string }[];
}

interface ScanRecord {
  scanId: string;
  score: number;
  createdAt: string;
  mergedResult?: MergedResult;
}

function extractPatterns(scans: ScanRecord[]) {
  const guidelineCount: Record<string, { count: number; name: string; scans: string[] }> = {};
  const issueCount: Record<string, { count: number; severity: string; guideline: string; scans: string[] }> = {};
  const scoreTimeline: { date: string; score: number; scanId: string }[] = [];

  for (const scan of scans) {
    const merged = scan.mergedResult;
    if (!merged) continue;

    scoreTimeline.push({
      date: scan.createdAt,
      score: merged.assessment?.score ?? scan.score ?? 0,
      scanId: scan.scanId,
    });

    for (const g of merged.guidelines || []) {
      if (!g.section) continue;
      if (!guidelineCount[g.section]) {
        guidelineCount[g.section] = { count: 0, name: g.name || g.section, scans: [] };
      }
      guidelineCount[g.section].count++;
      guidelineCount[g.section].scans.push(scan.scanId);
    }

    for (const issue of merged.issues || []) {
      const key = (issue.issue || '').slice(0, 80);
      if (!key) continue;
      if (!issueCount[key]) {
        issueCount[key] = { count: 0, severity: issue.severity || 'minor', guideline: issue.guideline_section || '', scans: [] };
      }
      issueCount[key].count++;
      issueCount[key].scans.push(scan.scanId);
    }
  }

  const recurring = Object.entries(issueCount)
    .filter(([, v]) => v.count >= 2)
    .sort((a, b) => b[1].count - a[1].count);

  const topGuidelines = Object.entries(guidelineCount)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10);

  return { recurring, topGuidelines, scoreTimeline: scoreTimeline.reverse() };
}

export default async function MemoryPage() {
  const user = await getAuthUser();
  if (!user) return null;

  const scans = (await getAllScansWithIssues(user.userId)) as ScanRecord[];
  const { recurring, topGuidelines, scoreTimeline } = extractPatterns(scans);

  const hasData = scans.length > 0;
  const avgScore = hasData ? Math.round(scoreTimeline.reduce((a, b) => a + b.score, 0) / scoreTimeline.length) : 0;
  const trend = scoreTimeline.length >= 2 ? scoreTimeline[scoreTimeline.length - 1].score - scoreTimeline[0].score : 0;
  const maxBarCount = topGuidelines.length > 0 ? topGuidelines[0][1].count : 1;

  return (
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px 80px' }}>

        {/* Hero */}
        <div style={{ padding: '60px 0 20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            fontFamily: 'var(--mono)',
            fontSize: '0.58rem',
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: 'var(--orange)',
            marginBottom: 12,
          }}>
            // build memory
          </div>
          <h1 style={{
            fontFamily: 'var(--display)',
            fontSize: '5.5rem',
            letterSpacing: 3,
            lineHeight: 0.9,
            margin: 0,
            color: 'var(--text)',
          }}>
            SUBMISSION
            <span style={{
              display: 'block',
              fontSize: '6.5rem',
              color: 'var(--orange)',
              textShadow: '0 0 40px rgba(255,106,0,0.2), 0 0 80px rgba(255,106,0,0.1)',
            }}>
              INTELLIGENCE
            </span>
          </h1>
          <p style={{
            fontFamily: 'var(--body)',
            fontSize: '0.84rem',
            color: 'var(--text-mid)',
            marginTop: 16,
          }}>
            Patterns and trends across all your scans.
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

        {!hasData ? (
          <div style={{
            border: '1px solid var(--border)',
            padding: '64px 32px',
            textAlign: 'center',
            position: 'relative',
          }}>
            <div style={{
              width: 56,
              height: 56,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              border: '1px solid var(--border)',
              background: 'rgba(255,255,255,0.02)',
            }}>
              <IconAnalyze width={24} height={24} style={{ color: 'var(--orange)', opacity: 0.4 }} />
            </div>
            <div style={{ fontFamily: 'var(--body)', fontSize: '0.88rem', color: 'var(--text-mid)', marginBottom: 12 }}>
              No scan data yet.
            </div>
            <Link
              href="/analyze"
              className="no-underline"
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '0.62rem',
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: 'var(--orange)',
              }}
            >
              Run your first analysis &rarr;
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

            {/* Overview Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 0,
              border: '1px solid var(--border)',
              marginBottom: 52,
            }}>
              {[
                { label: 'Total Scans', value: scans.length.toString(), icon: <IconTarget width={18} height={18} />, color: undefined },
                { label: 'Avg Score', value: avgScore.toString(), icon: <IconTarget width={18} height={18} />, color: undefined },
                { label: 'Score Trend', value: trend >= 0 ? `+${trend}` : `${trend}`, color: trend >= 0 ? 'var(--green)' : 'var(--red)', icon: <IconTrendUp width={18} height={18} /> },
                { label: 'Recurring Issues', value: recurring.length.toString(), color: recurring.length > 0 ? 'var(--amber)' : 'var(--green)', icon: <IconWarning width={18} height={18} /> },
              ].map((stat, i) => (
                <div key={stat.label} style={{
                  padding: '28px 32px',
                  borderRight: i < 3 ? '1px solid var(--border)' : 'none',
                  position: 'relative',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 16,
                  }}>
                    <div style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '0.5rem',
                      letterSpacing: 3,
                      textTransform: 'uppercase',
                      color: 'var(--orange)',
                    }}>
                      // {stat.label}
                    </div>
                    <span style={{ color: stat.color || 'var(--orange)', opacity: 0.4 }}>{stat.icon}</span>
                  </div>
                  <div style={{
                    fontFamily: 'var(--display)',
                    fontSize: '2.8rem',
                    letterSpacing: 2,
                    lineHeight: 1,
                    color: stat.color || 'var(--text)',
                  }}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Score Timeline */}
            {scoreTimeline.length > 1 && (
              <div style={{
                border: '1px solid var(--border)',
                padding: '28px 32px',
                marginBottom: 52,
                position: 'relative',
              }}>
                <div style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '0.5rem',
                  letterSpacing: 3,
                  textTransform: 'uppercase',
                  color: 'var(--orange)',
                  marginBottom: 24,
                }}>
                  // Score Over Time
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 6,
                  height: 120,
                }}>
                  {scoreTimeline.map((point) => (
                    <div key={point.scanId} style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                    }}>
                      <div style={{
                        fontFamily: 'var(--mono)',
                        fontSize: '0.58rem',
                        color: 'var(--text-dim)',
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {point.score}
                      </div>
                      <div style={{
                        width: '100%',
                        height: `${Math.max(point.score, 4)}%`,
                        background: point.score >= 70 ? 'var(--green)' : point.score >= 40 ? 'var(--amber)' : 'var(--red)',
                        opacity: 0.85,
                        transition: 'height 0.3s ease',
                      }} />
                      <div style={{
                        fontFamily: 'var(--mono)',
                        fontSize: '0.48rem',
                        color: 'var(--text-dim)',
                        letterSpacing: 0.5,
                        whiteSpace: 'nowrap',
                      }}>
                        {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recurring Issues */}
            {recurring.length > 0 && (
              <div style={{
                border: '1px solid var(--border)',
                padding: '28px 32px',
                marginBottom: 52,
                position: 'relative',
              }}>
                {/* Top accent line */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: 'var(--amber)',
                  opacity: 0.6,
                }} />
                <div style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '0.5rem',
                  letterSpacing: 3,
                  textTransform: 'uppercase',
                  color: 'var(--amber)',
                  marginBottom: 24,
                }}>
                  // Recurring Issues — Action Required
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {recurring.map(([issue, data]) => (
                    <div key={issue} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      padding: '16px 0',
                      borderBottom: '1px solid var(--border)',
                      borderLeft: `3px solid ${
                        data.severity === 'critical' ? 'var(--red)' : data.severity === 'major' ? 'var(--amber)' : 'var(--text-dim)'
                      }`,
                      paddingLeft: 16,
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontFamily: 'var(--body)',
                          fontSize: '0.84rem',
                          fontWeight: 600,
                          color: 'var(--text)',
                          marginBottom: 6,
                        }}>
                          {issue}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{
                            fontFamily: 'var(--mono)',
                            fontSize: '0.52rem',
                            letterSpacing: 2,
                            textTransform: 'uppercase',
                            padding: '3px 10px',
                            border: `1px solid ${
                              data.severity === 'critical' ? 'rgba(248,113,113,0.25)' : data.severity === 'major' ? 'rgba(251,191,36,0.25)' : 'var(--border)'
                            }`,
                            color: data.severity === 'critical' ? 'var(--red)' : data.severity === 'major' ? 'var(--amber)' : 'var(--text-dim)',
                          }}>
                            {data.severity}
                          </span>
                          {data.guideline && (
                            <span style={{
                              fontFamily: 'var(--mono)',
                              fontSize: '0.56rem',
                              color: 'var(--text-dim)',
                            }}>
                              &sect;{data.guideline}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 24 }}>
                        <div style={{
                          fontFamily: 'var(--display)',
                          fontSize: '1.8rem',
                          letterSpacing: 1,
                          lineHeight: 1,
                          color: 'var(--amber)',
                        }}>
                          {data.count}x
                        </div>
                        <div style={{
                          fontFamily: 'var(--mono)',
                          fontSize: '0.48rem',
                          letterSpacing: 2,
                          textTransform: 'uppercase',
                          color: 'var(--text-dim)',
                          marginTop: 4,
                        }}>
                          occurrences
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Most Cited Guidelines */}
            {topGuidelines.length > 0 && (
              <div style={{
                border: '1px solid var(--border)',
                padding: '28px 32px',
                position: 'relative',
              }}>
                <div style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '0.5rem',
                  letterSpacing: 3,
                  textTransform: 'uppercase',
                  color: 'var(--orange)',
                  marginBottom: 24,
                }}>
                  // Most Cited Guidelines
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {topGuidelines.map(([section, data]) => (
                    <div key={section} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 20,
                      padding: '12px 0',
                      borderBottom: '1px solid var(--border)',
                    }}>
                      <span style={{
                        fontFamily: 'var(--mono)',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        color: 'var(--orange)',
                        flexShrink: 0,
                        width: 52,
                      }}>
                        &sect;{section}
                      </span>
                      <span style={{
                        fontFamily: 'var(--body)',
                        fontSize: '0.82rem',
                        color: 'var(--text-mid)',
                        flex: 1,
                      }}>
                        {data.name}
                      </span>
                      {/* Bar */}
                      <div style={{
                        width: 120,
                        height: 6,
                        background: 'var(--border)',
                        flexShrink: 0,
                        position: 'relative',
                      }}>
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          height: '100%',
                          width: `${(data.count / maxBarCount) * 100}%`,
                          background: 'var(--orange)',
                          opacity: 0.7,
                        }} />
                      </div>
                      <span style={{
                        fontFamily: 'var(--mono)',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        color: 'var(--text)',
                        flexShrink: 0,
                        fontVariantNumeric: 'tabular-nums',
                        textAlign: 'right',
                        width: 64,
                      }}>
                        {data.count} {data.count === 1 ? 'scan' : 'scans'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
