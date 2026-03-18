'use client';

import { useState } from 'react';
import AnalysisResults from '@/components/AnalysisResults';
import TestDownloader from '@/components/TestDownloader';
import { IconCheck, IconZap, IconBrain, IconWarning } from '@/components/icons';

type Step = 'idle' | 'gemini' | 'claude' | 'saving' | 'done' | 'error';

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

const STEPS = [
  { key: 'gemini', label: 'Scanning with Gemini 2.5 Pro...', Icon: IconZap },
  { key: 'claude', label: 'Verifying with Claude Opus...', Icon: IconBrain },
  { key: 'saving', label: 'Preparing your results...', Icon: IconCheck },
];

export default function AnalyzePage() {
  const [feedback, setFeedback] = useState('');
  const [step, setStep] = useState<Step>('idle');
  const [result, setResult] = useState<MergedResult | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!feedback.trim() || step !== 'idle') return;

    setError('');
    setResult(null);
    setStep('gemini');

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 90_000); // 90 second max

      const res = await fetch('/api/analyze-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: feedback.trim() }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Analysis failed.');
        setStep('error');
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) { clearTimeout(timeout); break; }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let eventType = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ') && eventType) {
            try {
              const data = JSON.parse(line.slice(6));
              if (eventType === 'status') {
                if (data.step === 'gemini') setStep('gemini');
                else if (data.step === 'gemini_done' || data.step === 'claude') setStep('claude');
                else if (data.step === 'claude_done' || data.step === 'merging') setStep('saving');
              } else if (eventType === 'result') {
                setResult(data.result);
                setScanId(data.scanId || null);
                setStep('done');
              } else if (eventType === 'error') {
                setError(data.error || 'Analysis failed.');
                setStep('error');
              }
            } catch { /* skip malformed */ }
            eventType = '';
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Analysis timed out. Please try again.');
      } else {
        setError('Something went wrong. Please try again.');
      }
      setStep('error');
    }
  }

  function handleReset() {
    setStep('idle');
    setResult(null);
    setScanId(null);
    setError('');
  }

  return (
    <div className="max-w-[1100px] mx-auto px-6 md:px-10 py-12">
      <div className="mb-10">
        <div className="section-label mb-3">Dual-Model Analysis</div>
        <h1 className="page-title" style={{ fontFamily: "var(--font-heading), 'Space Grotesk', sans-serif" }}>
          Analyze rejection
        </h1>
      </div>

      {step === 'idle' || step === 'error' ? (
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-[11px] tracking-[2px] uppercase mb-3" style={{ color: 'var(--gray)' }}>
              Paste your App Store review feedback
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={12}
              placeholder="Paste Apple's review feedback or rejection notice here..."
              className="input-field rounded-2xl resize-none leading-relaxed"
              style={{ padding: '20px', fontSize: '14px', fontFamily: "var(--font-heading), 'Space Grotesk', sans-serif" }}
            />
          </div>

          {error && (
            <div className="glass-card rounded-xl px-5 py-4 mb-4 flex items-start gap-3"
              style={{ borderColor: 'rgba(248, 113, 113, 0.2)', background: 'rgba(248, 113, 113, 0.04)' }}
            >
              <IconWarning width={16} height={16} className="shrink-0 mt-0.5" style={{ color: 'var(--red)' }} />
              <span className="text-[13px]" style={{ color: 'var(--red)' }}>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-[12px]" style={{ color: 'var(--gray)' }}>
              Verified by Gemini 2.5 Pro + Claude Opus. ~5-10 seconds.
            </p>
            <button
              type="submit"
              disabled={!feedback.trim()}
              className="btn-primary px-8 py-4 rounded-2xl text-[12px] tracking-[2px] uppercase font-medium flex items-center gap-2"
            >
              <IconZap width={16} height={16} />
              Scan Now
            </button>
          </div>
        </form>
      ) : step === 'done' && result ? (
        <>
          <AnalysisResults result={result} />
          {scanId && <TestDownloader scanId={scanId} hasIssues={result.issues.length > 0} />}
          <div className="mt-8 text-center">
            <button
              onClick={handleReset}
              className="btn-secondary px-6 py-3 rounded-xl text-[12px] tracking-[2px] uppercase cursor-pointer"
            >
              &larr; New Analysis
            </button>
          </div>
        </>
      ) : (
        /* Progress Steps */
        <div className="glass-card rounded-2xl p-12 flex flex-col items-center justify-center gap-8 relative overflow-hidden"
          style={{ minHeight: '320px' }}
        >
          <div className="glow-line" />

          {/* Horizontal stepper */}
          <div className="flex items-center gap-0 w-full max-w-[560px]">
            {STEPS.map(({ key, label, Icon }, idx) => {
              const stepOrder = ['gemini', 'claude', 'saving'];
              const currentIdx = stepOrder.indexOf(step);
              const thisIdx = stepOrder.indexOf(key);
              const isDone = thisIdx < currentIdx;
              const isActive = thisIdx === currentIdx;

              return (
                <div key={key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-3 flex-1">
                    <div
                      className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center transition-all duration-500"
                      style={{
                        background: isDone ? 'var(--pink)' : isActive ? 'var(--surface-2)' : 'var(--surface-1)',
                        border: isDone ? '1px solid var(--pink)' : isActive ? '1px solid var(--pink-dim)' : '1px solid var(--border)',
                        boxShadow: isActive ? '0 0 20px var(--pink-glow)' : 'none',
                      }}
                    >
                      {isDone ? (
                        <IconCheck width={16} height={16} style={{ color: 'white' }} />
                      ) : isActive ? (
                        <Icon width={16} height={16} style={{ color: 'var(--pink)', animation: 'breathe 2s ease-in-out infinite' }} />
                      ) : (
                        <Icon width={16} height={16} style={{ color: 'var(--gray-dim)' }} />
                      )}
                    </div>
                    <span
                      className="text-[11px] text-center transition-all duration-300 leading-tight"
                      style={{ color: isActive ? 'var(--white)' : isDone ? 'var(--gray)' : 'var(--gray-dim)' }}
                    >
                      {label}
                    </span>
                  </div>
                  {/* Connecting line */}
                  {idx < STEPS.length - 1 && (
                    <div
                      className="h-[1px] w-full -mt-6"
                      style={{
                        background: isDone ? 'var(--pink)' : 'var(--border)',
                        transition: 'background 0.5s ease',
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
