import { getAuthUser } from '@/lib/auth';
import { getAllScansWithIssues } from '@/lib/db';
import Link from 'next/link';
import HistoryList from '@/components/HistoryList';

export default async function HistoryPage() {
  const user = await getAuthUser();
  if (!user) return null;

  const scans = await getAllScansWithIssues(user.userId) as Array<{
    scanId: string;
    status?: string;
    score: number;
    createdAt: string;
    mergedResult?: {
      assessment?: { summary?: string; confidence?: string; risk_factors?: string[] };
      issues?: Array<{ severity?: string; issue?: string }>;
      meta?: { models_used?: string[] };
    };
  }>;

  return (
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px 80px' }}>

        {/* Hero */}
        <div style={{ padding: '60px 0 20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            fontFamily: 'var(--mono)',
            fontSize: '0.58rem',
            letterSpacing: 4,
            textTransform: 'uppercase',
            color: 'var(--orange)',
            marginBottom: 16,
          }}>
            // scan history
          </div>
          <h1 style={{
            fontFamily: 'var(--display)',
            fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
            letterSpacing: 3,
            lineHeight: 0.95,
            margin: 0,
            color: 'var(--text)',
          }}>
            ALL SCANS
          </h1>
          <div style={{
            position: 'absolute',
            top: '50%',
            right: 0,
            width: '30%',
            height: 1,
            background: 'linear-gradient(90deg, transparent, var(--orange), transparent)',
            opacity: 0.2,
          }} />
        </div>

        {scans.length === 0 ? (
          <div style={{
            border: '1px solid var(--border)',
            padding: '64px 24px',
            textAlign: 'center',
            marginTop: 40,
          }}>
            <p style={{ fontFamily: 'var(--body)', fontSize: '0.9rem', color: 'var(--text-mid)', marginBottom: 8 }}>
              No scans yet
            </p>
            <p style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', color: 'var(--text-dim)', margin: '0 0 24px' }}>
              Run your first analysis to start building history.
            </p>
            <Link
              href="/analyze"
              className="btn-primary no-underline"
              style={{ padding: '14px 36px', display: 'inline-block' }}
            >
              Initialize Scan
            </Link>
          </div>
        ) : (
          <HistoryList scans={scans} />
        )}
      </div>
    </div>
  );
}
