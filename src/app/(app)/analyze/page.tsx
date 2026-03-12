'use client';

import { useState } from 'react';
import AnalysisResults from '@/components/AnalysisResults';
import TestDownloader from '@/components/TestDownloader';

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
  { key: 'gemini', label: 'Scanning with Gemini 2.5 Pro...' },
  { key: 'claude', label: 'Verifying with Claude Opus...' },
  { key: 'saving', label: 'Preparing your results...' },
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
      // Simulate step progression while waiting for response
      const geminiTimer = setTimeout(() => setStep('claude'), 3500);
      const claudeTimer = setTimeout(() => setStep('saving'), 7000);

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: feedback.trim() }),
      });

      clearTimeout(geminiTimer);
      clearTimeout(claudeTimer);

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Analysis failed.');
        setStep('error');
        return;
      }

      setStep('saving');
      await new Promise((r) => setTimeout(r, 400));

      setResult(data.result);
      setScanId(data.scanId || null);
      setStep('done');
    } catch {
      setError('Something went wrong. Please try again.');
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
    <div className="max-w-[1100px] mx-auto px-10 py-12">
      <div className="mb-10">
        <div className="text-[11px] tracking-[4px] uppercase mb-2" style={{ color: 'var(--pink)' }}>
          Dual-Model Analysis
        </div>
        <h1 className="text-3xl font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
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
              className="w-full px-5 py-4 text-sm bg-transparent text-white outline-none resize-none transition-all duration-300 leading-relaxed"
              style={{ border: '1px solid var(--panel-border)', fontFamily: "'Inter', sans-serif" }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--pink-dim)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--panel-border)')}
            />
          </div>

          {error && (
            <div className="text-[13px] px-4 py-3 mb-4" style={{ color: '#ff6b6b', background: 'rgba(255,107,107,0.05)', border: '1px solid rgba(255,107,107,0.15)' }}>
              {error}
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-[12px]" style={{ color: 'var(--gray)' }}>
              Verified by Gemini 2.5 Pro + Claude Opus. ~5-10 seconds.
            </p>
            <button
              type="submit"
              disabled={!feedback.trim()}
              className="px-8 py-3.5 text-[12px] tracking-[2px] uppercase text-white font-medium transition-all duration-300"
              style={{
                background: feedback.trim() ? 'var(--pink)' : 'transparent',
                border: '1px solid var(--pink)',
                cursor: feedback.trim() ? 'pointer' : 'not-allowed',
                opacity: feedback.trim() ? 1 : 0.5,
              }}
            >
              Scan Now →
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
              className="px-6 py-3 text-[12px] tracking-[2px] uppercase transition-all duration-300 bg-transparent cursor-pointer"
              style={{ border: '1px solid var(--panel-border)', color: 'var(--gray)' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--pink-dim)'; e.currentTarget.style.color = 'var(--white)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--panel-border)'; e.currentTarget.style.color = 'var(--gray)'; }}
            >
              ← New Analysis
            </button>
          </div>
        </>
      ) : (
        /* Progress Steps */
        <div
          className="p-12 flex flex-col items-center justify-center gap-8"
          style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', minHeight: '320px' }}
        >
          <div className="flex flex-col gap-5 w-full max-w-[360px]">
            {STEPS.map(({ key, label }) => {
              const stepOrder = ['gemini', 'claude', 'saving'];
              const currentIdx = stepOrder.indexOf(step);
              const thisIdx = stepOrder.indexOf(key);
              const isDone = thisIdx < currentIdx;
              const isActive = thisIdx === currentIdx;

              return (
                <div key={key} className="flex items-center gap-4">
                  <div
                    className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[10px] transition-all duration-500"
                    style={{
                      background: isDone ? 'var(--pink)' : isActive ? 'transparent' : 'transparent',
                      border: isDone ? '1px solid var(--pink)' : isActive ? '1px solid var(--pink)' : '1px solid var(--panel-border)',
                      boxShadow: isActive ? '0 0 12px var(--pink-glow)' : 'none',
                    }}
                  >
                    {isDone && '✓'}
                    {isActive && (
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: 'var(--pink)', animation: 'pulse 1s ease-in-out infinite' }}
                      />
                    )}
                  </div>
                  <span
                    className="text-[13px] transition-all duration-300"
                    style={{ color: isActive ? 'var(--white)' : isDone ? 'var(--gray)' : 'var(--gray-dim)' }}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
