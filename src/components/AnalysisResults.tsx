'use client';

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  gemini_confirmed: { label: 'Gemini Confirmed', color: '#60a5fa' },
  claude_added:     { label: 'Claude Added',     color: '#a78bfa' },
  claude_corrected: { label: 'Claude Corrected', color: '#fb923c' },
  gemini_only:      { label: 'Gemini',           color: '#60a5fa' },
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#f87171',
  major:    '#fb923c',
  minor:    '#facc15',
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high:   '#4ade80',
  medium: '#facc15',
  low:    '#f87171',
};

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

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 80 ? '#4ade80' : score >= 60 ? '#facc15' : '#f87171';
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center"
        style={{
          background: `conic-gradient(${color} ${score * 3.6}deg, rgba(255,255,255,0.05) 0deg)`,
          boxShadow: `0 0 30px ${color}22`,
        }}
      >
        <div
          className="w-[76px] h-[76px] rounded-full flex flex-col items-center justify-center"
          style={{ background: '#000' }}
        >
          <span className="text-2xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color }}>{score}</span>
          <span className="text-[9px] tracking-[2px] uppercase" style={{ color: 'var(--gray)' }}>/ 100</span>
        </div>
      </div>
    </div>
  );
}

export default function AnalysisResults({ result }: { result: MergedResult }) {
  const { guidelines, issues, action_plan, assessment, meta } = result;

  return (
    <div className="flex flex-col gap-6">
      {/* Header row: score + meta */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Score */}
        <div
          className="p-6 flex flex-col items-center justify-center relative overflow-hidden"
          style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}
        >
          <div className="absolute top-0 left-0 w-full h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--pink-dim), transparent)' }} />
          <div className="text-[10px] tracking-[3px] uppercase mb-4" style={{ color: 'var(--gray)' }}>Readiness Score</div>
          <ScoreGauge score={assessment.score} />
        </div>

        {/* Summary */}
        <div
          className="md:col-span-2 p-6 relative overflow-hidden"
          style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}
        >
          <div className="absolute top-0 left-0 w-full h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--pink-dim), transparent)' }} />
          <div className="text-[10px] tracking-[3px] uppercase mb-3" style={{ color: 'var(--gray)' }}>Assessment</div>
          <p className="text-[14px] leading-relaxed mb-4" style={{ color: 'rgba(255,255,255,0.8)' }}>
            {assessment.summary}
          </p>
          <div className="flex flex-wrap gap-3">
            <span className="text-[10px] tracking-[1.5px] uppercase px-2 py-1" style={{ color: CONFIDENCE_COLORS[assessment.confidence] || 'var(--gray)', border: `1px solid ${CONFIDENCE_COLORS[assessment.confidence] || 'var(--gray)'}44` }}>
              {assessment.confidence} confidence
            </span>
            <span className="text-[10px] tracking-[1.5px] uppercase px-2 py-1" style={{ color: 'var(--gray)', border: '1px solid var(--panel-border)' }}>
              {assessment.agreement_level.replace('_', ' ')} agreement
            </span>
            <span className="text-[10px] tracking-[1.5px] uppercase px-2 py-1" style={{ color: 'var(--gray)', border: '1px solid var(--panel-border)' }}>
              {Math.round(meta.total_latency_ms / 1000)}s · {meta.models_used.join(' + ')}
            </span>
          </div>
        </div>
      </div>

      {/* Guidelines */}
      {guidelines.length > 0 && (
        <div className="p-6 relative overflow-hidden" style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}>
          <div className="absolute top-0 left-0 w-full h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--pink-dim), transparent)' }} />
          <div className="text-[10px] tracking-[3px] uppercase mb-4" style={{ color: 'var(--gray)' }}>Guidelines Referenced</div>
          <div className="flex flex-wrap gap-3">
            {(guidelines as Guideline[]).map((g) => (
              <div key={g.section} className="px-3 py-2" style={{ background: 'rgba(255,45,120,0.04)', border: '1px solid var(--pink-dim)' }}>
                <span className="text-[11px] font-medium" style={{ color: 'var(--pink)', fontFamily: "'Space Grotesk', sans-serif" }}>
                  §{g.section}
                </span>
                <span className="text-[12px] ml-2" style={{ color: 'rgba(255,255,255,0.7)' }}>{g.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Issues */}
      {issues.length > 0 && (
        <div>
          <div className="text-[10px] tracking-[3px] uppercase mb-3" style={{ color: 'var(--gray)' }}>
            Issues Identified ({issues.length})
          </div>
          <div className="flex flex-col gap-3">
            {(issues as Issue[]).map((issue, i) => (
              <div
                key={i}
                className="px-5 py-4 relative overflow-hidden"
                style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderLeft: `3px solid ${SEVERITY_COLORS[issue.severity] || 'var(--panel-border)'}` }}
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <span className="text-[14px]" style={{ color: 'rgba(255,255,255,0.9)' }}>{issue.issue}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {issue.source && SOURCE_LABELS[issue.source] && (
                      <span className="text-[9px] tracking-[1.5px] uppercase px-2 py-0.5" style={{ color: SOURCE_LABELS[issue.source].color, border: `1px solid ${SOURCE_LABELS[issue.source].color}44` }}>
                        {SOURCE_LABELS[issue.source].label}
                      </span>
                    )}
                    <span className="text-[9px] tracking-[1.5px] uppercase px-2 py-0.5" style={{ color: SEVERITY_COLORS[issue.severity], border: `1px solid ${SEVERITY_COLORS[issue.severity]}44` }}>
                      {issue.severity}
                    </span>
                  </div>
                </div>
                {issue.evidence && (
                  <p className="text-[12px]" style={{ color: 'var(--gray)' }}>{issue.evidence}</p>
                )}
                {issue.guideline_section && (
                  <span className="text-[11px] mt-1 inline-block" style={{ color: 'var(--pink)' }}>§{issue.guideline_section}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Plan */}
      {action_plan.length > 0 && (
        <div>
          <div className="text-[10px] tracking-[3px] uppercase mb-3" style={{ color: 'var(--gray)' }}>
            Action Plan ({action_plan.length} steps)
          </div>
          <div className="flex flex-col gap-3">
            {(action_plan as Action[]).map((action, i) => (
              <div
                key={i}
                className="px-5 py-5 relative overflow-hidden"
                style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}
              >
                <div className="absolute top-0 left-0 w-full h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--pink-dim), transparent)' }} />
                <div className="flex items-start gap-4">
                  <span
                    className="shrink-0 w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded-full"
                    style={{ background: 'rgba(255,45,120,0.1)', border: '1px solid var(--pink-dim)', color: 'var(--pink)', fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {action.priority}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <span className="text-[14px] font-medium" style={{ color: 'rgba(255,255,255,0.9)' }}>{action.action}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        {action.source && SOURCE_LABELS[action.source] && (
                          <span className="text-[9px] tracking-[1.5px] uppercase px-2 py-0.5" style={{ color: SOURCE_LABELS[action.source].color, border: `1px solid ${SOURCE_LABELS[action.source].color}44` }}>
                            {SOURCE_LABELS[action.source].label}
                          </span>
                        )}
                        {action.confidence && (
                          <span className="text-[9px] tracking-[1.5px] uppercase px-2 py-0.5" style={{ color: CONFIDENCE_COLORS[action.confidence], border: `1px solid ${CONFIDENCE_COLORS[action.confidence]}44` }}>
                            {action.confidence}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-[13px] mb-2 leading-relaxed" style={{ color: 'var(--gray)' }}>{action.details}</p>
                    <span className="text-[11px]" style={{ color: 'var(--gray-dim)' }}>⏱ {action.estimated_effort}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Factors */}
      {assessment.risk_factors?.length > 0 && (
        <div className="p-6 relative overflow-hidden" style={{ background: 'var(--panel-bg)', border: '1px solid rgba(250,204,21,0.15)' }}>
          <div className="absolute top-0 left-0 w-full h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(250,204,21,0.3), transparent)' }} />
          <div className="text-[10px] tracking-[3px] uppercase mb-3" style={{ color: '#facc15' }}>Remaining Risk Factors</div>
          <ul className="flex flex-col gap-2">
            {assessment.risk_factors.map((risk, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px]" style={{ color: 'rgba(255,255,255,0.7)' }}>
                <span style={{ color: '#facc15' }}>⚠</span>
                {risk}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
