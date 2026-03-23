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

  return (
    <div className="w-full px-6 md:px-12 lg:px-20 pt-28 pb-20">
      <div className="mb-10">
        <div className="text-[11px] font-medium tracking-[5px] uppercase mb-2" style={{ color: 'var(--orange)' }}>Build Memory</div>
        <h1 className="text-[11px] font-medium tracking-[5px] uppercase" style={{ color: 'var(--white)' }}>Submission Intelligence</h1>
        <p className="text-[14px] mt-2" style={{ color: 'var(--gray)' }}>
          Patterns and trends across all your scans.
        </p>
      </div>

      {!hasData ? (
        <div className="glass-card p-12 text-center relative overflow-hidden">
          <div className="glow-line" />
          <div className="w-14 h-14 flex items-center justify-center mx-auto mb-5" style={{ background: 'var(--surface-2)' }}>
            <IconAnalyze width={24} height={24} style={{ color: 'var(--orange)', opacity: 0.4 }} />
          </div>
          <div className="text-[15px] mb-2" style={{ color: 'var(--gray)' }}>No scan data yet.</div>
          <Link href="/analyze" className="text-[12px] tracking-[2px] uppercase no-underline hover-text" style={{ color: 'var(--orange)' }}>
            Run your first analysis &rarr;
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Scans', value: scans.length.toString(), icon: <IconTarget width={18} height={18} /> },
              { label: 'Avg Score', value: avgScore.toString(), icon: <IconTarget width={18} height={18} /> },
              { label: 'Score Trend', value: trend >= 0 ? `+${trend}` : `${trend}`, color: trend >= 0 ? 'var(--green)' : 'var(--red)', icon: <IconTrendUp width={18} height={18} /> },
              { label: 'Recurring Issues', value: recurring.length.toString(), color: recurring.length > 0 ? 'var(--amber)' : 'var(--green)', icon: <IconWarning width={18} height={18} /> },
            ].map((stat) => (
              <div key={stat.label} className="glass-card p-5 relative overflow-hidden">
                <div className="glow-line" />
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[10px] tracking-[3px] uppercase" style={{ color: 'var(--gray)' }}>{stat.label}</div>
                  <span style={{ color: stat.color || 'var(--orange)', opacity: 0.4 }}>{stat.icon}</span>
                </div>
                <div className="text-[28px] font-bold" style={{ color: stat.color || 'var(--white)' }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* Score Timeline */}
          {scoreTimeline.length > 1 && (
            <div className="glass-card p-6 relative overflow-hidden">
              <div className="glow-line" />
              <div className="text-[10px] tracking-[3px] uppercase font-medium mb-5" style={{ color: 'var(--orange)' }}>Score Over Time</div>
              <div className="flex items-end gap-2 h-[120px]">
                {scoreTimeline.map((point) => (
                  <div key={point.scanId} className="flex-1 flex flex-col items-center gap-1">
                    <div className="text-[10px] tabular-nums" style={{ color: 'var(--gray)' }}>{point.score}</div>
                    <div
                      className="w-full transition-all duration-300"
                      style={{
                        height: `${Math.max(point.score, 4)}%`,
                        background: point.score >= 70 ? 'var(--green)' : point.score >= 40 ? 'var(--amber)' : 'var(--red)',
                        opacity: 0.8,
                      }}
                    />
                    <div className="text-[8px] truncate max-w-full" style={{ color: 'var(--gray)' }}>
                      {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recurring Issues */}
          {recurring.length > 0 && (
            <div className="glass-card p-6 relative overflow-hidden" style={{ borderColor: 'rgba(251,191,36,0.12)' }}>
              <div className="glow-line" style={{ background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.3), transparent)' }} />
              <div className="text-[10px] tracking-[3px] uppercase font-medium mb-5" style={{ color: 'var(--amber)' }}>
                Recurring Issues — Action Required
              </div>
              <div className="flex flex-col gap-3">
                {recurring.map(([issue, data]) => (
                  <div key={issue} className="glass-card flex items-start justify-between p-4" style={{ borderColor: 'rgba(251,191,36,0.08)' }}>
                    <div className="flex-1">
                      <div className="text-[13px] font-medium mb-1">{issue}</div>
                      <div className="flex items-center gap-3">
                        <span className="badge" style={{
                          color: data.severity === 'critical' ? 'var(--red)' : data.severity === 'major' ? 'var(--amber)' : 'var(--gray)',
                          borderColor: data.severity === 'critical' ? 'rgba(248,113,113,0.25)' : data.severity === 'major' ? 'rgba(251,191,36,0.25)' : 'var(--border)',
                        }}>
                          {data.severity}
                        </span>
                        {data.guideline && (
                          <span className="text-[10px]" style={{ color: 'var(--gray)' }}>&sect;{data.guideline}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <div className="text-[20px] font-bold" style={{ color: 'var(--amber)' }}>
                        {data.count}x
                      </div>
                      <div className="text-[10px]" style={{ color: 'var(--gray)' }}>occurrences</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Most Cited Guidelines */}
          {topGuidelines.length > 0 && (
            <div className="glass-card p-6 relative overflow-hidden">
              <div className="glow-line" />
              <div className="text-[10px] tracking-[3px] uppercase font-medium mb-5" style={{ color: 'var(--orange)' }}>Most Cited Guidelines</div>
              <div className="flex flex-col gap-2">
                {topGuidelines.map(([section, data]) => (
                  <div key={section} className="flex items-center gap-4 py-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
                    <span className="text-[12px] font-mono shrink-0 w-12" style={{ color: 'var(--orange)' }}>&sect;{section}</span>
                    <span className="text-[13px] flex-1" style={{ color: 'var(--gray)' }}>{data.name}</span>
                    <span className="text-[13px] font-medium shrink-0 tabular-nums">
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
  );
}
