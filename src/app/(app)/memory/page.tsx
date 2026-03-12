import { getAuthUser } from '@/lib/auth';
import { getAllScansWithIssues } from '@/lib/db';
import Link from 'next/link';

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

    // Track guidelines
    for (const g of merged.guidelines || []) {
      if (!g.section) continue;
      if (!guidelineCount[g.section]) {
        guidelineCount[g.section] = { count: 0, name: g.name || g.section, scans: [] };
      }
      guidelineCount[g.section].count++;
      guidelineCount[g.section].scans.push(scan.scanId);
    }

    // Track issues
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
    <div className="max-w-[1100px] mx-auto px-10 py-12">
      <div className="mb-10">
        <div className="text-[11px] tracking-[4px] uppercase mb-2" style={{ color: 'var(--pink)' }}>
          Build Memory
        </div>
        <h1 className="text-3xl font-semibold" style={{ fontFamily: "'Sora', sans-serif" }}>
          Submission Intelligence
        </h1>
        <p className="text-[14px] mt-2" style={{ color: 'var(--gray)' }}>
          Patterns and trends across all your scans.
        </p>
      </div>

      {!hasData ? (
        <div
          className="p-12 text-center"
          style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}
        >
          <div className="text-[15px] mb-3" style={{ color: 'var(--gray)' }}>No scan data yet.</div>
          <Link
            href="/analyze"
            className="text-[12px] tracking-[2px] uppercase no-underline transition-colors"
            style={{ color: 'var(--pink)' }}
          >
            Run your first analysis →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Scans', value: scans.length.toString() },
              { label: 'Avg Score', value: avgScore.toString() },
              { label: 'Score Trend', value: trend >= 0 ? `+${trend}` : `${trend}`, color: trend >= 0 ? '#34d399' : '#ff6b6b' },
              { label: 'Recurring Issues', value: recurring.length.toString(), color: recurring.length > 0 ? '#fbbf24' : '#34d399' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="p-5 relative overflow-hidden"
                style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}
              >
                <div className="absolute top-0 left-0 w-full h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--pink-dim), transparent)' }} />
                <div className="text-[10px] tracking-[3px] uppercase mb-2" style={{ color: 'var(--gray)' }}>{stat.label}</div>
                <div className="text-[28px] font-bold" style={{ fontFamily: "'Sora', sans-serif", color: stat.color || 'var(--white)' }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* Score Timeline */}
          {scoreTimeline.length > 1 && (
            <div
              className="p-6 relative overflow-hidden"
              style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}
            >
              <div className="absolute top-0 left-0 w-full h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--pink-dim), transparent)' }} />
              <div className="text-[10px] tracking-[3px] uppercase mb-5" style={{ color: 'var(--pink)' }}>Score Over Time</div>
              <div className="flex items-end gap-2 h-[120px]">
                {scoreTimeline.map((point) => (
                  <div key={point.scanId} className="flex-1 flex flex-col items-center gap-1">
                    <div className="text-[10px]" style={{ color: 'var(--gray)' }}>{point.score}</div>
                    <div
                      className="w-full rounded-sm transition-all duration-300"
                      style={{
                        height: `${Math.max(point.score, 4)}%`,
                        background: point.score >= 70 ? '#34d399' : point.score >= 40 ? '#fbbf24' : '#ff6b6b',
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
            <div
              className="p-6 relative overflow-hidden"
              style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}
            >
              <div className="absolute top-0 left-0 w-full h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--pink-dim), transparent)' }} />
              <div className="text-[10px] tracking-[3px] uppercase mb-5" style={{ color: '#fbbf24' }}>
                Recurring Issues — Action Required
              </div>
              <div className="flex flex-col gap-3">
                {recurring.map(([issue, data]) => (
                  <div
                    key={issue}
                    className="flex items-start justify-between p-4"
                    style={{ background: 'rgba(251,191,36,0.03)', border: '1px solid rgba(251,191,36,0.1)' }}
                  >
                    <div className="flex-1">
                      <div className="text-[13px] font-medium mb-1">{issue}</div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] tracking-[1px] uppercase px-1.5 py-0.5" style={{
                          color: data.severity === 'critical' ? '#ff6b6b' : data.severity === 'major' ? '#fbbf24' : 'var(--gray)',
                          border: `1px solid ${data.severity === 'critical' ? '#ff6b6b44' : data.severity === 'major' ? '#fbbf2444' : 'var(--panel-border)'}`,
                        }}>
                          {data.severity}
                        </span>
                        {data.guideline && (
                          <span className="text-[10px]" style={{ color: 'var(--gray)' }}>§{data.guideline}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <div className="text-[20px] font-bold" style={{ fontFamily: "'Sora', sans-serif", color: '#fbbf24' }}>
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
            <div
              className="p-6 relative overflow-hidden"
              style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}
            >
              <div className="absolute top-0 left-0 w-full h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--pink-dim), transparent)' }} />
              <div className="text-[10px] tracking-[3px] uppercase mb-5" style={{ color: 'var(--pink)' }}>Most Cited Guidelines</div>
              <div className="flex flex-col gap-2">
                {topGuidelines.map(([section, data]) => (
                  <div key={section} className="flex items-center gap-4 py-2 border-b" style={{ borderColor: 'var(--panel-border)' }}>
                    <span className="text-[12px] font-mono shrink-0 w-12" style={{ color: 'var(--pink)' }}>§{section}</span>
                    <span className="text-[13px] flex-1" style={{ color: 'var(--gray)' }}>{data.name}</span>
                    <span className="text-[13px] font-medium shrink-0" style={{ fontFamily: "'Sora', sans-serif" }}>
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
