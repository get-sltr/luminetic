import { getAuthUser } from '@/lib/auth';
import { getScans } from '@/lib/db';
import Link from 'next/link';

export default async function HistoryPage() {
  const user = await getAuthUser();
  if (!user) return null;

  const scans = await getScans(user.userId, 50) as Array<{ scanId: string; score: number; createdAt: string }>;

  return (
    <div className="max-w-[1100px] mx-auto px-10 py-12">
      <div className="mb-10">
        <div className="text-[11px] tracking-[4px] uppercase mb-2" style={{ color: 'var(--pink)' }}>
          Build Memory
        </div>
        <h1 className="text-3xl font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Scan history
        </h1>
      </div>

      {scans.length === 0 ? (
        <div
          className="p-16 text-center"
          style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}
        >
          <p className="text-[13px] mb-6" style={{ color: 'var(--gray)' }}>
            No scans yet.
          </p>
          <Link
            href="/analyze"
            className="px-6 py-3 text-[12px] tracking-[2px] uppercase text-white no-underline"
            style={{ background: 'var(--pink)' }}
          >
            Run your first scan →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {scans.map((scan) => (
            <Link
              key={scan.scanId}
              href={`/history/${scan.scanId}`}
              className="flex items-center justify-between px-6 py-4 no-underline group transition-all duration-200"
              style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--pink-dim)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--panel-border)')}
            >
              <div className="flex items-center gap-6">
                <span
                  className="text-[22px] font-bold tabular-nums"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    color: scan.score >= 80 ? '#4ade80' : scan.score >= 60 ? '#facc15' : '#f87171',
                    minWidth: '56px',
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
              <span className="text-[12px] transition-colors duration-200" style={{ color: 'var(--gray)' }}>
                View →
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
