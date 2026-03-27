import { getAuthUser } from '@/lib/auth';
import { getScan } from '@/lib/db';
import { notFound } from 'next/navigation';
import AnalysisResults from '@/components/AnalysisResults';
import TestDownloader from '@/components/TestDownloader';
import Link from 'next/link';

export default async function ScanDetailPage({ params }: { params: Promise<{ scanId: string }> }) {
  const { scanId } = await params;
  const user = await getAuthUser();
  if (!user) return null;

  const scan = await getScan(user.userId, scanId);
  if (!scan) notFound();

  const mergedResult = scan.mergedResult as Parameters<typeof AnalysisResults>[0]['result'];
  const hasIssues = (mergedResult?.issues?.length || 0) > 0;

  return (
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px 80px' }}>

        {/* Hero */}
        <div style={{ padding: '60px 0 20px', position: 'relative', overflow: 'hidden' }}>

          {/* Back link */}
          <Link
            href="/history"
            className="no-underline"
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '0.6rem',
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: 'var(--text-dim)',
              display: 'inline-block',
              marginBottom: 28,
              transition: 'color 0.2s',
            }}
            onMouseEnter={undefined}
          >
            ← HISTORY
          </Link>

          {/* Mono label */}
          <div style={{
            fontFamily: 'var(--mono)',
            fontSize: '0.6rem',
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: 'var(--text-dim)',
            marginBottom: 12,
          }}>
            <span style={{ color: 'var(--orange)', opacity: 0.5 }}>// </span>
            scan result
          </div>

          {/* Heading */}
          <h1 style={{
            fontFamily: 'var(--display)',
            fontSize: '5.5rem',
            letterSpacing: 3,
            lineHeight: 0.9,
            margin: 0,
            color: 'var(--text)',
          }}>
            SCAN REPORT
          </h1>

          {/* Date */}
          <p style={{
            fontFamily: 'var(--mono)',
            fontSize: '0.68rem',
            color: 'var(--text-dim)',
            letterSpacing: 2,
            textTransform: 'uppercase',
            marginTop: 16,
            marginBottom: 0,
          }}>
            <span style={{ color: 'var(--orange)', opacity: 0.5 }}>{'> '}</span>
            {new Date(scan.createdAt as string).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>

          {/* Decorative orange gradient line */}
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

        {/* Divider */}
        <div style={{
          height: 1,
          background: 'var(--border)',
          margin: '32px 0 48px',
        }} />

        {/* Results */}
        <AnalysisResults result={mergedResult} />

        {/* Downloads */}
        <TestDownloader scanId={scanId} hasIssues={hasIssues} />
      </div>
    </div>
  );
}
