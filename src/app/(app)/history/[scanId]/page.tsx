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
    <div className="max-w-[1100px] mx-auto px-10 py-12">
      <div className="flex items-center gap-4 mb-10">
        <Link href="/history" className="text-[12px] no-underline transition-colors" style={{ color: 'var(--gray)' }}>
          ← History
        </Link>
        <div className="w-px h-4" style={{ background: 'var(--panel-border)' }} />
        <div>
          <div className="text-[11px] tracking-[4px] uppercase mb-0.5" style={{ color: 'var(--pink)' }}>
            Scan Result
          </div>
          <div className="text-[13px]" style={{ color: 'var(--gray)' }}>
            {new Date(scan.createdAt as string).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      <AnalysisResults result={mergedResult} />
      <TestDownloader scanId={scanId} hasIssues={hasIssues} />
    </div>
  );
}
