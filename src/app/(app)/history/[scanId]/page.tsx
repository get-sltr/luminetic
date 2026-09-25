import { getAuthUser } from '@/lib/auth';
import { getScan } from '@/lib/db';
import { notFound } from 'next/navigation';
import AnalysisResults from '@/components/AnalysisResults';
import TestDownloader from '@/components/TestDownloader';
import Link from 'next/link';
import { isRenderableScanReport } from '@/lib/scan-report';

export default async function ScanDetailPage({ params }: { params: Promise<{ scanId: string }> }) {
  const { scanId } = await params;
  const user = await getAuthUser();
  if (!user) return null;

  const scan = await getScan(user.userId, scanId);
  if (!scan) notFound();

  const mergedResult = isRenderableScanReport(scan.mergedResult) ? scan.mergedResult : null;
  const hasIssues = (mergedResult?.issues?.length || 0) > 0;
  const status = typeof scan.status === 'string' ? scan.status : undefined;
  const errorMessage = typeof scan.errorMessage === 'string' ? scan.errorMessage : undefined;
  const statusCopy = !mergedResult
    ? status === 'error'
      ? {
          title: 'Scan failed',
          body: errorMessage || 'This analysis did not finish. Start a new scan to try again.',
        }
      : status === 'pending' || status === 'analyzing' || status === 'reconciling' || !status
        ? {
            title: 'Scan still processing',
            body: 'The report is not ready yet. It will appear here after the scan completes.',
          }
        : {
            title: 'Report unavailable',
            body: 'This scan does not have a viewable report.',
          }
    : null;

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

        {mergedResult ? (
          <>
            <AnalysisResults result={mergedResult as Parameters<typeof AnalysisResults>[0]['result']} />
            <TestDownloader scanId={scanId} hasIssues={hasIssues} />
          </>
        ) : (
          <div style={{
            border: '1px solid var(--border)',
            padding: '48px 32px',
          }}>
            <div style={{
              fontFamily: 'var(--mono)',
              fontSize: '0.58rem',
              letterSpacing: 3,
              textTransform: 'uppercase',
              color: status === 'error' ? 'var(--red)' : 'var(--orange)',
              marginBottom: 12,
            }}>
              {statusCopy?.title}
            </div>
            <p style={{
              fontFamily: 'var(--body)',
              fontSize: '0.9rem',
              color: 'var(--text-mid)',
              margin: 0,
              lineHeight: 1.6,
            }}>
              {statusCopy?.body}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
