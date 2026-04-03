'use client';

import { useState } from 'react';
import Link from 'next/link';

interface ScanItem {
  scanId: string;
  status?: string;
  ttl?: number;
  score: number;
  createdAt: string;
  mergedResult?: {
    assessment?: { summary?: string; confidence?: string; risk_factors?: string[] };
    issues?: Array<{ severity?: string; issue?: string }>;
    meta?: { models_used?: string[] };
  };
}

function severityColor(sev: string): string {
  const s = sev?.toLowerCase();
  if (s === 'critical') return 'var(--red)';
  if (s === 'major') return 'var(--warning)';
  return 'var(--text-mid)';
}

function severityBg(sev: string): string {
  const s = sev?.toLowerCase();
  if (s === 'critical') return 'rgba(239,68,68,0.06)';
  if (s === 'major') return 'rgba(255,184,0,0.06)';
  return 'rgba(255,255,255,0.02)';
}

function formatExpiry(ttl?: number): string | null {
  if (!ttl) return null;
  const remaining = ttl * 1000 - Date.now();
  if (remaining <= 0) return 'Expiring soon';
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

export default function HistoryList({ scans }: { scans: ScanItem[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  function toggle(scanId: string) {
    setExpanded(expanded === scanId ? null : scanId);
  }

  return (
    <div style={{ marginTop: 40 }}>
      {/* Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '60px 1fr 100px 100px 60px',
        gap: 0,
        padding: '12px 24px',
        borderBottom: '2px solid var(--orange)',
      }}>
        {['#', 'Date', 'Score', 'Issues', ''].map((h) => (
          <div key={h} style={{
            fontFamily: 'var(--mono)',
            fontSize: '0.5rem',
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: 'var(--text-dim)',
          }}>
            {h}
          </div>
        ))}
      </div>

      {scans.map((scan, i) => {
        const isOpen = expanded === scan.scanId;
        const issues = scan.mergedResult?.issues || [];
        const assessment = scan.mergedResult?.assessment;
        const critCount = issues.filter(x => x.severity?.toLowerCase() === 'critical').length;
        const majorCount = issues.filter(x => x.severity?.toLowerCase() === 'major').length;
        const minorCount = issues.filter(x => x.severity?.toLowerCase() === 'minor').length;
        const engines = scan.mergedResult?.meta?.models_used?.length || 0;

        return (
          <div key={scan.scanId}>
            {/* Row */}
            <div
              onClick={() => toggle(scan.scanId)}
              style={{
                display: 'grid',
                gridTemplateColumns: '60px 1fr 100px 100px 60px',
                gap: 0,
                padding: '18px 24px',
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer',
                transition: 'background 0.15s',
                background: isOpen ? 'rgba(255,106,0,0.03)' : 'transparent',
                alignItems: 'center',
              }}
            >
              {/* Index */}
              <div style={{
                fontFamily: 'var(--mono)',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'var(--orange)',
              }}>
                #{String(i + 1).padStart(2, '0')}
              </div>

              {/* Date */}
              <div>
                <div style={{ fontFamily: 'var(--body)', fontSize: '0.82rem', color: 'var(--text)' }}>
                  {new Date(scan.createdAt).toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', color: 'var(--text-dim)', marginTop: 2 }}>
                  {new Date(scan.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </div>
                {scan.ttl && (
                  <div style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '0.5rem',
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    color: (scan.ttl * 1000 - Date.now()) < 2 * 60 * 60 * 1000 ? 'var(--red)' : 'var(--orange)',
                    marginTop: 4,
                  }}>
                    {formatExpiry(scan.ttl)}
                  </div>
                )}
              </div>

              {/* Score */}
              <div>
                {scan.status === 'complete' || scan.mergedResult ? (
                  <span style={{
                    fontFamily: 'var(--display)',
                    fontSize: '1.6rem',
                    letterSpacing: 1,
                    color: scan.score >= 80 ? 'var(--green)' : scan.score >= 60 ? 'var(--warning)' : 'var(--red)',
                  }}>
                    {scan.score}
                  </span>
                ) : scan.status === 'error' ? (
                  <span style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '0.68rem',
                    letterSpacing: 1,
                    color: 'var(--red)',
                    textTransform: 'uppercase',
                  }}>
                    Failed
                  </span>
                ) : (
                  <span style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '0.68rem',
                    letterSpacing: 1,
                    color: 'var(--orange)',
                    textTransform: 'uppercase',
                  }}>
                    Processing
                  </span>
                )}
              </div>

              {/* Issues count */}
              <div style={{
                fontFamily: 'var(--mono)',
                fontSize: '0.6rem',
                color: issues.length > 0 ? 'var(--text-mid)' : 'var(--text-dim)',
              }}>
                {scan.status === 'error' ? 'Credit refunded' :
                 !scan.mergedResult && scan.status !== 'complete' ? '—' :
                 issues.length > 0 ? `${issues.length} found` : 'None'}
              </div>

              {/* Expand arrow */}
              <div style={{
                fontFamily: 'var(--mono)',
                fontSize: '0.8rem',
                color: 'var(--orange)',
                transition: 'transform 0.2s',
                transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                textAlign: 'center',
              }}>
                →
              </div>
            </div>

            {/* Expanded detail */}
            {isOpen && (
              <div style={{
                padding: '28px 24px 28px 84px',
                borderBottom: '1px solid var(--border)',
                background: 'rgba(255,106,0,0.02)',
              }}>
                {/* Summary */}
                {assessment?.summary && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '0.5rem',
                      letterSpacing: 3,
                      textTransform: 'uppercase',
                      color: 'var(--orange)',
                      marginBottom: 8,
                    }}>
                      // Assessment
                    </div>
                    <p style={{
                      fontFamily: 'var(--body)',
                      fontSize: '0.84rem',
                      lineHeight: 1.7,
                      color: 'var(--text-mid)',
                      margin: 0,
                    }}>
                      {assessment.summary}
                    </p>
                  </div>
                )}

                {/* Stats row */}
                <div style={{ display: 'flex', gap: 24, marginBottom: 24, flexWrap: 'wrap' }}>
                  {assessment?.confidence && (
                    <div style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '0.55rem',
                      letterSpacing: 2,
                      textTransform: 'uppercase',
                      color: 'var(--orange)',
                      border: '1px solid rgba(255,106,0,0.2)',
                      padding: '6px 14px',
                    }}>
                      {assessment.confidence} confidence
                    </div>
                  )}
                  {engines > 0 && (
                    <div style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '0.55rem',
                      letterSpacing: 2,
                      textTransform: 'uppercase',
                      color: 'var(--text-dim)',
                      border: '1px solid var(--border)',
                      padding: '6px 14px',
                    }}>
                      {engines} engine{engines !== 1 ? 's' : ''}
                    </div>
                  )}
                  {critCount > 0 && (
                    <div style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '0.55rem',
                      letterSpacing: 2,
                      textTransform: 'uppercase',
                      color: 'var(--red)',
                      border: '1px solid rgba(239,68,68,0.2)',
                      padding: '6px 14px',
                    }}>
                      {critCount} critical
                    </div>
                  )}
                  {majorCount > 0 && (
                    <div style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '0.55rem',
                      letterSpacing: 2,
                      textTransform: 'uppercase',
                      color: 'var(--warning)',
                      border: '1px solid rgba(255,184,0,0.2)',
                      padding: '6px 14px',
                    }}>
                      {majorCount} major
                    </div>
                  )}
                  {minorCount > 0 && (
                    <div style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '0.55rem',
                      letterSpacing: 2,
                      textTransform: 'uppercase',
                      color: 'var(--text-mid)',
                      border: '1px solid var(--border)',
                      padding: '6px 14px',
                    }}>
                      {minorCount} minor
                    </div>
                  )}
                </div>

                {/* Issues list */}
                {issues.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '0.5rem',
                      letterSpacing: 3,
                      textTransform: 'uppercase',
                      color: 'var(--text-dim)',
                      marginBottom: 12,
                    }}>
                      // Issues
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {issues.slice(0, 5).map((issue, j) => (
                        <div
                          key={j}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 12,
                            padding: '10px 14px',
                            background: severityBg(issue.severity || 'minor'),
                            borderLeft: `2px solid ${severityColor(issue.severity || 'minor')}`,
                          }}
                        >
                          <span style={{
                            fontFamily: 'var(--mono)',
                            fontSize: '0.48rem',
                            letterSpacing: 2,
                            textTransform: 'uppercase',
                            color: severityColor(issue.severity || 'minor'),
                            flexShrink: 0,
                            marginTop: 2,
                          }}>
                            {issue.severity || 'minor'}
                          </span>
                          <span style={{
                            fontFamily: 'var(--body)',
                            fontSize: '0.78rem',
                            color: 'var(--text-mid)',
                            lineHeight: 1.5,
                          }}>
                            {issue.issue}
                          </span>
                        </div>
                      ))}
                      {issues.length > 5 && (
                        <div style={{
                          fontFamily: 'var(--mono)',
                          fontSize: '0.55rem',
                          color: 'var(--text-dim)',
                          letterSpacing: 1,
                          paddingTop: 4,
                        }}>
                          +{issues.length - 5} more issues
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Risk factors */}
                {assessment?.risk_factors && assessment.risk_factors.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '0.5rem',
                      letterSpacing: 3,
                      textTransform: 'uppercase',
                      color: 'var(--text-dim)',
                      marginBottom: 12,
                    }}>
                      // Risk Factors
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {assessment.risk_factors.map((rf, j) => (
                        <div key={j} style={{
                          fontFamily: 'var(--body)',
                          fontSize: '0.78rem',
                          color: 'var(--warning)',
                          lineHeight: 1.5,
                          paddingLeft: 12,
                          borderLeft: '1px solid rgba(255,184,0,0.2)',
                        }}>
                          {rf}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* View full report link */}
                <Link
                  href={`/history/${scan.scanId}`}
                  className="no-underline"
                  style={{
                    display: 'inline-block',
                    fontFamily: 'var(--mono)',
                    fontSize: '0.58rem',
                    letterSpacing: 3,
                    textTransform: 'uppercase',
                    color: 'var(--orange)',
                    border: '1px solid rgba(255,106,0,0.25)',
                    padding: '10px 24px',
                    transition: 'all 0.2s',
                  }}
                >
                  View full report →
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
