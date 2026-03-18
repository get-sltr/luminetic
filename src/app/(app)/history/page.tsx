import { getAuthUser } from '@/lib/auth';
import { getScans } from '@/lib/db';
import Link from 'next/link';
import { IconHistory, IconAnalyze, IconChevronRight } from '@/components/icons';

export default async function HistoryPage() {
  const user = await getAuthUser();
  if (!user) return null;

  const scans = await getScans(user.userId, 50) as Array<{ scanId: string; score: number; createdAt: string }>;

  return (
    <div className="max-w-[1100px] mx-auto px-6 md:px-10 py-12">
      <div className="mb-10">
        <div className="section-label mb-3">Build Memory</div>
        <h1 className="page-title" style={{ fontFamily: "var(--font-heading), 'Space Grotesk', sans-serif" }}>
          Scan history
        </h1>
      </div>

      {scans.length === 0 ? (
        <div className="glass-card rounded-2xl p-16 text-center relative overflow-hidden">
          <div className="glow-line" />
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-5"
            style={{ background: 'var(--surface-2)' }}
          >
            <IconHistory width={24} height={24} style={{ color: 'var(--pink)', opacity: 0.4 }} />
          </div>
          <p className="text-[14px] mb-2" style={{ color: 'var(--gray)' }}>
            No scans yet
          </p>
          <p className="text-[12px] mb-6" style={{ color: 'var(--text-dim)' }}>
            Run your first analysis to start building history.
          </p>
          <Link
            href="/analyze"
            className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[12px] tracking-[2px] uppercase text-white no-underline font-medium"
          >
            <IconAnalyze width={16} height={16} />
            Run your first scan
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {scans.map((scan) => {
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
                className="glass-card rounded-xl flex items-center justify-between px-6 py-4 no-underline hover-bg group"
              >
                <div className="flex items-center gap-6">
                  <span
                    className="badge tabular-nums text-[14px] font-bold"
                    style={{
                      fontFamily: "var(--font-heading), 'Space Grotesk', sans-serif",
                      color: scoreColor,
                      borderColor: scoreColor,
                      background: scoreBg,
                      padding: '6px 14px',
                      fontSize: '16px',
                      borderRadius: '999px',
                    }}
                  >
                    {scan.score}
                  </span>
                  <div>
                    <div className="text-[13px] text-white mb-0.5">
                      {new Date(scan.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div className="text-[11px]" style={{ color: 'var(--gray)' }}>
                      {new Date(scan.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                <IconChevronRight width={16} height={16} style={{ color: 'var(--gray)' }} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
