'use client';

import { IconWarning, IconShield } from '@/components/icons';

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  gemini_confirmed: { label: 'Confirmed',  color: '#60a5fa' },
  claude_added:     { label: 'Added',      color: '#a78bfa' },
  claude_corrected: { label: 'Corrected',  color: '#fb923c' },
  gemini_only:      { label: 'Primary',    color: '#60a5fa' },
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#f87171',
  major:    '#fb923c',
  minor:    '#facc15',
};

const SEVERITY_BG: Record<string, string> = {
  critical: 'rgba(248,113,113,0.06)',
  major:    'rgba(251,146,60,0.06)',
  minor:    'rgba(250,204,21,0.04)',
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high:   '#4ade80',
  medium: '#facc15',
  low:    '#f87171',
};

function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const sec = ms / 1000;
  if (sec < 60) {
    const rounded = sec < 10 ? sec.toFixed(1) : String(Math.round(sec));
    return `${rounded} s`;
  }
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}m ${s}s`;
}

function formatModelsUsed(models: string[] | undefined): string {
  if (!models?.length) return '—';
  return `${models.length} engine${models.length === 1 ? '' : 's'}`;
}

interface Issue {
  severity: string;
  issue: string;
  evidence?: string;
  guideline_section?: string;
  source?: string;
}

interface Action {
  priority: number;
  action: string;
  details: string;
  estimated_effort: string;
  confidence: string;
  source?: string;
}

interface Guideline {
  section: string;
  name: string;
  description: string;
}

interface MergedResult {
  guidelines: unknown[];
  issues: unknown[];
  action_plan: unknown[];
  assessment: {
    score: number;
    confidence: string;
    summary: string;
    agreement_level: string;
    risk_factors: string[];
  };
  meta: {
    models_used: string[];
    gemini_latency_ms: number;
    claude_latency_ms: number;
    total_latency_ms: number;
    gemini_success: boolean;
    claude_success: boolean;
  };
}

export default function AnalysisResults({ result }: { result: MergedResult }) {
  const { guidelines, issues, action_plan, assessment, meta } = result;

  const scorePct = Math.max(1, assessment.score);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>

      {/* ── Score + Assessment ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '220px 1fr',
        gap: 0,
        border: '1px solid var(--border)',
        position: 'relative',
      }}>
        {/* Gradient border */}
        <div style={{
          position: 'absolute', inset: -1,
          border: '1px solid transparent',
          background: 'linear-gradient(135deg, rgba(255,106,0,0.2), transparent 30%, transparent 70%, rgba(255,106,0,0.1)) border-box',
          WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor', maskComposite: 'exclude',
          pointerEvents: 'none',
        }} />

        {/* Score */}
        <div className="stat-card-brutalist" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '0.56rem', letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="blink-dot" /> Readiness Score
          </div>
          <div className="score-block-brutalist">
            <div className="num">{assessment.score}</div>
            <div className="corner-bl" />
          </div>
          <div style={{ width: '100%', marginTop: 20 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '0.5rem', color: 'var(--text-dim)', letterSpacing: 1, marginBottom: 4 }}>
              SCORE {assessment.score}/100
            </div>
            <div className="score-bar-bg">
              <div className="score-bar-fill" style={{ width: `${scorePct}%` }} />
            </div>
          </div>
        </div>

        {/* Assessment */}
        <div style={{ padding: '32px 36px', borderLeft: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '0.56rem', letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 16 }}>
            // Assessment
          </div>
          <p style={{
            fontFamily: 'var(--body)',
            fontSize: '0.92rem',
            lineHeight: 1.7,
            color: 'var(--text-mid)',
            margin: '0 0 20px',
          }}>
            {assessment.summary}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span style={{
              fontFamily: 'var(--mono)', fontSize: '0.6rem', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700,
              padding: '6px 14px',
              color: CONFIDENCE_COLORS[assessment.confidence] || 'var(--text-dim)',
              border: `1px solid ${CONFIDENCE_COLORS[assessment.confidence] || 'var(--border)'}33`,
              background: `${CONFIDENCE_COLORS[assessment.confidence] || 'var(--border)'}0a`,
            }}>
              {assessment.confidence} confidence
            </span>
            <span style={{
              fontFamily: 'var(--mono)', fontSize: '0.6rem', letterSpacing: 1.5, textTransform: 'uppercase',
              padding: '6px 14px',
              color: 'var(--text-dim)',
              border: '1px solid var(--border)',
            }}>
              {assessment.agreement_level.replace('_', ' ')} agreement
            </span>
            <span style={{
              fontFamily: 'var(--mono)', fontSize: '0.6rem', letterSpacing: 1.5, textTransform: 'uppercase',
              padding: '6px 14px',
              color: 'var(--text-dim)',
              border: '1px solid var(--border)',
            }}>
              {formatDurationMs(meta.total_latency_ms)} · {formatModelsUsed(meta.models_used)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Guidelines ── */}
      {guidelines.length > 0 && (
        <div>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: '0.58rem', letterSpacing: 2.5, textTransform: 'uppercase',
            color: 'var(--text-dim)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span className="blink-dot" style={{ background: 'var(--orange)', boxShadow: '0 0 4px rgba(255,106,0,0.5)' }} />
            // Guidelines Referenced
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(guidelines as Guideline[]).map((g) => (
              <div key={g.section} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 14px',
                border: '1px solid var(--orange-dim)',
                background: 'rgba(255,106,0,0.03)',
                fontFamily: 'var(--mono)', fontSize: '0.62rem',
              }}>
                <IconShield width={12} height={12} style={{ color: 'var(--orange)', opacity: 0.6 }} />
                <span style={{ color: 'var(--orange)', fontWeight: 700 }}>&sect;{g.section}</span>
                <span style={{ color: 'var(--text-mid)' }}>{g.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Issues ── */}
      {issues.length > 0 && (
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 0', borderBottom: '2px solid var(--orange)', marginBottom: 20,
          }}>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: '0.58rem', letterSpacing: 2.5, textTransform: 'uppercase',
              color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span className="blink-dot" style={{ background: 'var(--red)', boxShadow: '0 0 4px rgba(248,113,113,0.5)' }} />
              // Issues Identified
            </div>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', color: 'var(--orange)', fontWeight: 700 }}>
              {issues.length} FOUND
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(issues as Issue[]).map((issue, i) => (
              <div
                key={i}
                style={{
                  padding: '24px 28px',
                  border: '1px solid var(--border)',
                  borderLeft: `3px solid ${SEVERITY_COLORS[issue.severity] || 'var(--border)'}`,
                  background: SEVERITY_BG[issue.severity] || 'transparent',
                  transition: 'border-color 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: issue.evidence ? 12 : 0 }}>
                  <span style={{ fontFamily: 'var(--body)', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1.5 }}>
                    {issue.issue}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {issue.source && SOURCE_LABELS[issue.source] && (
                      <span style={{
                        fontFamily: 'var(--mono)', fontSize: '0.56rem', letterSpacing: 1.5, textTransform: 'uppercase',
                        padding: '4px 10px', fontWeight: 700,
                        color: SOURCE_LABELS[issue.source].color,
                        border: `1px solid ${SOURCE_LABELS[issue.source].color}33`,
                      }}>
                        {SOURCE_LABELS[issue.source].label}
                      </span>
                    )}
                    <span style={{
                      fontFamily: 'var(--mono)', fontSize: '0.56rem', letterSpacing: 1.5, textTransform: 'uppercase',
                      padding: '4px 10px', fontWeight: 700,
                      color: SEVERITY_COLORS[issue.severity],
                      border: `1px solid ${SEVERITY_COLORS[issue.severity]}33`,
                      background: `${SEVERITY_COLORS[issue.severity]}0a`,
                    }}>
                      {issue.severity}
                    </span>
                  </div>
                </div>
                {issue.evidence && (
                  <p style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.6, margin: 0 }}>
                    {issue.evidence}
                  </p>
                )}
                {issue.guideline_section && (
                  <span style={{ display: 'inline-block', marginTop: 8, fontFamily: 'var(--mono)', fontSize: '0.62rem', color: 'var(--orange)', fontWeight: 700 }}>
                    &sect;{issue.guideline_section}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Action Plan ── */}
      {action_plan.length > 0 && (
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 0', borderBottom: '2px solid var(--orange)', marginBottom: 20,
          }}>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: '0.58rem', letterSpacing: 2.5, textTransform: 'uppercase',
              color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span className="blink-dot" style={{ background: 'var(--green)', boxShadow: '0 0 4px rgba(34,197,94,0.5)' }} />
              // Action Plan
            </div>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', color: 'var(--orange)', fontWeight: 700 }}>
              {action_plan.length} STEPS
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'relative' }}>
            {/* Vertical line */}
            <div style={{
              position: 'absolute', left: 23, top: 40, bottom: 40, width: 1,
              background: 'linear-gradient(180deg, var(--orange-dim), var(--border))',
            }} />

            {(action_plan as Action[]).map((action, i) => (
              <div
                key={i}
                style={{
                  padding: '24px 28px 24px 72px',
                  border: '1px solid var(--border)',
                  position: 'relative',
                  transition: 'border-color 0.2s',
                }}
              >
                {/* Priority number */}
                <div style={{
                  position: 'absolute', left: 12, top: 22,
                  width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--display)', fontSize: '1rem', color: 'var(--orange)',
                  background: 'rgba(255,106,0,0.08)', border: '1px solid var(--orange-dim)',
                  zIndex: 1,
                }}>
                  {action.priority}
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 8 }}>
                  <span style={{ fontFamily: 'var(--body)', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>
                    {action.action}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {action.source && SOURCE_LABELS[action.source] && (
                      <span style={{
                        fontFamily: 'var(--mono)', fontSize: '0.56rem', letterSpacing: 1.5, textTransform: 'uppercase',
                        padding: '4px 10px', fontWeight: 700,
                        color: SOURCE_LABELS[action.source].color,
                        border: `1px solid ${SOURCE_LABELS[action.source].color}33`,
                      }}>
                        {SOURCE_LABELS[action.source].label}
                      </span>
                    )}
                    {action.confidence && (
                      <span style={{
                        fontFamily: 'var(--mono)', fontSize: '0.56rem', letterSpacing: 1.5, textTransform: 'uppercase',
                        padding: '4px 10px', fontWeight: 700,
                        color: CONFIDENCE_COLORS[action.confidence],
                        border: `1px solid ${CONFIDENCE_COLORS[action.confidence]}33`,
                      }}>
                        {action.confidence}
                      </span>
                    )}
                  </div>
                </div>

                <p style={{ fontFamily: 'var(--body)', fontSize: '0.82rem', color: 'var(--text-dim)', lineHeight: 1.6, margin: '0 0 10px' }}>
                  {action.details}
                </p>

                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontFamily: 'var(--mono)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: 1,
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
                  {action.estimated_effort}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Risk Factors ── */}
      {assessment.risk_factors?.length > 0 && (
        <div style={{
          padding: '28px 32px',
          border: '1px solid rgba(251,191,36,0.2)',
          borderLeft: '3px solid var(--amber)',
          background: 'rgba(251,191,36,0.03)',
        }}>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: '0.58rem', letterSpacing: 2.5, textTransform: 'uppercase',
            color: 'var(--amber)', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ animation: 'blink 1.5s step-end infinite' }}>!!</span>
            Remaining Risk Factors
          </div>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 12, listStyle: 'none', padding: 0, margin: 0 }}>
            {assessment.risk_factors.map((risk, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontFamily: 'var(--body)', fontSize: '0.82rem', color: 'var(--text-mid)', lineHeight: 1.5 }}>
                <IconWarning width={14} height={14} className="shrink-0 mt-0.5" style={{ color: 'var(--amber)' }} />
                {risk}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
