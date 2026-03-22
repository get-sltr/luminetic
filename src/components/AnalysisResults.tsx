'use client';

import { IconWarning, IconCheck, IconShield } from '@/components/icons';

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

const MODEL_DISPLAY: Record<string, string> = {
  'gemini-2.5-pro': 'Gemini',
  'claude-sonnet': 'Sonnet',
  'claude-opus': 'Opus',
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
  if (!models?.length) return 'Models: —';
  return models
    .map((id) => MODEL_DISPLAY[id] || id.replace(/-/g, ' '))
    .join(' · ');
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

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 80 ? '#4ade80' : score >= 60 ? '#facc15' : '#f87171';
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-[148px] h-[148px] flex items-center justify-center">
      <svg width="148" height="148" className="absolute -rotate-90">
        <circle cx="74" cy="74" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        <circle
          cx="74" cy="74" r={radius} fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)',
            filter: `drop-shadow(0 0 8px ${color}66)`,
          }}
        />
      </svg>
      <div className="text-center z-10">
        <span className="text-3xl font-bold" style={{ fontFamily: "var(--font-heading), 'Space Grotesk', sans-serif", color }}>{score}</span>
        <div className="text-[9px] tracking-[2px] uppercase" style={{ color: 'var(--gray)' }}>/ 100</div>
      </div>
    </div>
  );
}

export default function AnalysisResults({ result }: { result: MergedResult }) {
  const { guidelines, issues, action_plan, assessment, meta } = result;

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      {/* Header row: score + meta */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Score */}
        <div className="glass-card rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="glow-line" />
          <div className="text-[10px] tracking-[3px] uppercase mb-4" style={{ color: 'var(--gray)' }}>Readiness Score</div>
          <ScoreGauge score={assessment.score} />
        </div>

        {/* Summary */}
        <div className="glass-card rounded-2xl md:col-span-2 p-6 relative overflow-hidden">
          <div className="glow-line" />
          <div className="text-[10px] tracking-[3px] uppercase mb-3" style={{ color: 'var(--gray)' }}>Assessment</div>
          <p className="text-[14px] leading-relaxed mb-4" style={{ color: 'rgba(255,255,255,0.8)' }}>
            {assessment.summary}
          </p>
          <div className="flex flex-wrap gap-2">
            <span
              className="badge"
              style={{ color: CONFIDENCE_COLORS[assessment.confidence] || 'var(--gray)', borderColor: `${CONFIDENCE_COLORS[assessment.confidence] || 'var(--gray)'}66` }}
            >
              {assessment.confidence} confidence
            </span>
            <span className="badge" style={{ color: 'var(--gray)', borderColor: 'var(--border)' }}>
              {assessment.agreement_level.replace('_', ' ')} agreement
            </span>
            <span
              className="badge badge-metric"
              style={{ color: 'var(--gray)', borderColor: 'var(--border)' }}
              title="Total analysis time and models that responded"
            >
              {formatDurationMs(meta.total_latency_ms)} · {formatModelsUsed(meta.models_used)}
            </span>
          </div>
        </div>
      </div>

      {/* Guidelines */}
      {guidelines.length > 0 && (
        <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
          <div className="glow-line" />
          <div className="text-[10px] tracking-[3px] uppercase mb-4" style={{ color: 'var(--gray)' }}>Guidelines Referenced</div>
          <div className="flex flex-wrap gap-3">
            {(guidelines as Guideline[]).map((g) => (
              <div key={g.section} className="badge rounded-lg" style={{ background: 'rgba(255,45,120,0.04)', borderColor: 'var(--pink-dim)', padding: '8px 12px' }}>
                <IconShield width={12} height={12} style={{ color: 'var(--pink)', opacity: 0.6 }} />
                <span className="text-[11px] font-medium" style={{ color: 'var(--pink)', fontFamily: "var(--font-heading), 'Space Grotesk', sans-serif" }}>
                  &sect;{g.section}
                </span>
                <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.7)' }}>{g.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Issues */}
      {issues.length > 0 && (
        <div>
          <div className="section-label mb-3" style={{ letterSpacing: '3px' }}>
            Issues Identified ({issues.length})
          </div>
          <div className="flex flex-col gap-3">
            {(issues as Issue[]).map((issue, i) => (
              <div
                key={i}
                className="glass-card rounded-2xl px-5 py-4 relative overflow-hidden"
                style={{ borderLeft: `3px solid ${SEVERITY_COLORS[issue.severity] || 'var(--border)'}` }}
              >
                <div className="glow-line" />
                <div className="flex items-start justify-between gap-4 mb-2">
                  <span className="text-[14px]" style={{ color: 'rgba(255,255,255,0.9)' }}>{issue.issue}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {issue.source && SOURCE_LABELS[issue.source] && (
                      <span className="badge rounded-full" style={{ color: SOURCE_LABELS[issue.source].color, borderColor: `${SOURCE_LABELS[issue.source].color}44` }}>
                        {SOURCE_LABELS[issue.source].label}
                      </span>
                    )}
                    <span className="badge rounded-full" style={{ color: SEVERITY_COLORS[issue.severity], borderColor: `${SEVERITY_COLORS[issue.severity]}44` }}>
                      {issue.severity}
                    </span>
                  </div>
                </div>
                {issue.evidence && (
                  <p className="text-[12px]" style={{ color: 'var(--gray)' }}>{issue.evidence}</p>
                )}
                {issue.guideline_section && (
                  <span className="text-[11px] mt-1 inline-block" style={{ color: 'var(--pink)' }}>&sect;{issue.guideline_section}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Plan */}
      {action_plan.length > 0 && (
        <div>
          <div className="section-label mb-3" style={{ letterSpacing: '3px' }}>
            Action Plan ({action_plan.length} steps)
          </div>
          <div className="relative">
            {/* Vertical connecting line */}
            <div
              className="absolute left-[19px] top-8 bottom-8 w-[1px]"
              style={{ background: 'linear-gradient(180deg, var(--pink-dim), var(--border))' }}
            />
            <div className="flex flex-col gap-3">
              {(action_plan as Action[]).map((action, i) => (
                <div
                  key={i}
                  className="glass-card rounded-2xl px-5 py-5 relative overflow-hidden"
                >
                  <div className="glow-line" />
                  <div className="flex items-start gap-4">
                    <span
                      className="shrink-0 w-10 h-10 flex items-center justify-center text-[13px] font-bold rounded-full relative z-10"
                      style={{ background: 'rgba(255,45,120,0.1)', border: '1px solid var(--pink-dim)', color: 'var(--pink)', fontFamily: "var(--font-heading), 'Space Grotesk', sans-serif" }}
                    >
                      {action.priority}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-3 mb-1.5">
                        <span className="text-[14px] font-medium" style={{ color: 'rgba(255,255,255,0.9)' }}>{action.action}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          {action.source && SOURCE_LABELS[action.source] && (
                            <span className="badge rounded-full" style={{ color: SOURCE_LABELS[action.source].color, borderColor: `${SOURCE_LABELS[action.source].color}44` }}>
                              {SOURCE_LABELS[action.source].label}
                            </span>
                          )}
                          {action.confidence && (
                            <span className="badge rounded-full" style={{ color: CONFIDENCE_COLORS[action.confidence], borderColor: `${CONFIDENCE_COLORS[action.confidence]}44` }}>
                              {action.confidence}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-[13px] mb-2 leading-relaxed" style={{ color: 'var(--gray)' }}>{action.details}</p>
                      <span className="text-[11px] flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
                        {action.estimated_effort}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Risk Factors */}
      {assessment.risk_factors?.length > 0 && (
        <div className="glass-card rounded-2xl p-6 relative overflow-hidden" style={{ borderColor: 'rgba(251,191,36,0.2)' }}>
          <div className="glow-line" style={{ background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.3), transparent)' }} />
          <div className="text-[10px] tracking-[3px] uppercase mb-3 font-medium" style={{ color: 'var(--amber)' }}>Remaining Risk Factors</div>
          <ul className="flex flex-col gap-2.5 list-none p-0">
            {assessment.risk_factors.map((risk, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[13px]" style={{ color: 'rgba(255,255,255,0.7)' }}>
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
