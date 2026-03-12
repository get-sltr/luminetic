'use client';

import { useState } from 'react';

interface TestFile {
  filename: string;
  category: string;
  format: 'maestro' | 'detox';
  issueDescription: string;
}

type Status = 'idle' | 'generating' | 'ready' | 'error';

export default function TestDownloader({ scanId, hasIssues }: { scanId: string; hasIssues: boolean }) {
  const [status, setStatus] = useState<Status>('idle');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [tests, setTests] = useState<TestFile[]>([]);
  const [error, setError] = useState('');
  const [includeDetox, setIncludeDetox] = useState(false);
  const [appId, setAppId] = useState('');
  const [previewFile, setPreviewFile] = useState<string | null>(null);

  if (!hasIssues) return null;

  async function handleGenerate() {
    setStatus('generating');
    setError('');

    try {
      const res = await fetch('/api/generate-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scanId,
          includeDetox,
          appId: appId.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Generation failed.');
        setStatus('error');
        return;
      }

      setDownloadUrl(data.downloadUrl);
      setExpiresAt(data.expiresAt);
      setTests(data.tests);
      setStatus('ready');
    } catch {
      setError('Something went wrong. Please try again.');
      setStatus('error');
    }
  }

  return (
    <div className="mt-8">
      <div className="text-[10px] tracking-[3px] uppercase mb-4" style={{ color: 'var(--gray)' }}>
        Test Generation
      </div>

      {status === 'idle' || status === 'error' ? (
        <div
          className="p-6 relative overflow-hidden"
          style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}
        >
          <div
            className="absolute top-0 left-0 w-full h-px"
            style={{ background: 'linear-gradient(90deg, transparent, var(--pink-dim), transparent)' }}
          />

          <div className="mb-5">
            <h3 className="text-[16px] font-medium mb-1" style={{ fontFamily: "'Sora', sans-serif" }}>
              Generate Maestro & Detox Test Suite
            </h3>
            <p className="text-[13px]" style={{ color: 'var(--gray)' }}>
              AI-generated test scripts targeting each issue found in your analysis.
            </p>
          </div>

          {/* Options */}
          <div className="flex flex-col gap-3 mb-5">
            <div>
              <label className="block text-[11px] tracking-[2px] uppercase mb-1.5" style={{ color: 'var(--gray)' }}>
                Bundle ID (optional)
              </label>
              <input
                type="text"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="com.yourcompany.yourapp"
                className="w-full max-w-[360px] px-3 py-2 text-sm bg-transparent text-white outline-none transition-all duration-300"
                style={{ border: '1px solid var(--panel-border)' }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--pink-dim)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--panel-border)')}
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeDetox}
                onChange={(e) => setIncludeDetox(e.target.checked)}
                className="accent-[#ff2d78]"
              />
              <span className="text-[12px]" style={{ color: 'var(--gray)' }}>
                Include Detox tests (React Native)
              </span>
            </label>
          </div>

          {error && (
            <div
              className="text-[13px] px-4 py-3 mb-4"
              style={{ color: '#ff6b6b', background: 'rgba(255,107,107,0.05)', border: '1px solid rgba(255,107,107,0.15)' }}
            >
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            className="px-6 py-3 text-[12px] tracking-[2px] uppercase text-white font-medium transition-all duration-300"
            style={{ background: 'var(--pink)', border: '1px solid var(--pink)', cursor: 'pointer' }}
          >
            Generate Test Suite →
          </button>
        </div>
      ) : status === 'generating' ? (
        <div
          className="p-8 flex flex-col items-center justify-center"
          style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', minHeight: '160px' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <span
              className="w-3 h-3 rounded-full"
              style={{ background: 'var(--pink)', animation: 'pulse 1s ease-in-out infinite' }}
            />
            <span className="text-[13px]">Generating test scripts...</span>
          </div>
          <p className="text-[12px]" style={{ color: 'var(--gray)' }}>
            AI is customizing Maestro{includeDetox ? ' & Detox' : ''} templates for your issues
          </p>
        </div>
      ) : (
        /* ready */
        <div className="flex flex-col gap-4">
          {/* Download bar */}
          <div
            className="p-5 flex items-center justify-between relative overflow-hidden"
            style={{ background: 'var(--panel-bg)', border: '1px solid var(--pink-dim)' }}
          >
            <div
              className="absolute top-0 left-0 w-full h-px"
              style={{ background: 'linear-gradient(90deg, transparent, var(--pink-dim), transparent)' }}
            />
            <div>
              <div className="text-[14px] font-medium mb-0.5" style={{ fontFamily: "'Sora', sans-serif" }}>
                {tests.length} test {tests.length === 1 ? 'file' : 'files'} generated
              </div>
              {expiresAt && (
                <div className="text-[11px]" style={{ color: 'var(--gray)' }}>
                  Download link expires {new Date(expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
            {downloadUrl && (
              <a
                href={downloadUrl}
                className="px-5 py-2.5 text-[12px] tracking-[2px] uppercase text-white no-underline transition-all duration-300"
                style={{ background: 'var(--pink)', border: '1px solid var(--pink)' }}
              >
                Download ZIP
              </a>
            )}
          </div>

          {/* File list */}
          <div className="flex flex-col gap-1">
            {tests.map((test) => (
              <div key={test.filename}>
                <button
                  onClick={() => setPreviewFile(previewFile === test.filename ? null : test.filename)}
                  className="w-full flex items-center justify-between px-5 py-3 text-left bg-transparent cursor-pointer transition-all duration-200"
                  style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--pink-dim)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = previewFile === test.filename ? 'var(--pink-dim)' : 'var(--panel-border)')}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] text-white font-mono">{test.filename}</span>
                    <span
                      className="text-[9px] tracking-[1.5px] uppercase px-2 py-0.5"
                      style={{
                        color: test.format === 'maestro' ? '#60a5fa' : '#a78bfa',
                        border: `1px solid ${test.format === 'maestro' ? '#60a5fa' : '#a78bfa'}44`,
                      }}
                    >
                      {test.format}
                    </span>
                  </div>
                  <span className="text-[11px]" style={{ color: 'var(--gray)' }}>
                    {previewFile === test.filename ? '▼' : '▶'}
                  </span>
                </button>

                {previewFile === test.filename && (
                  <div className="px-1 pb-1" style={{ background: 'var(--panel-bg)' }}>
                    <div className="text-[11px] px-4 py-2" style={{ color: 'var(--gray)' }}>
                      {test.issueDescription}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Regenerate */}
          <div className="text-center">
            <button
              onClick={() => { setStatus('idle'); setTests([]); setDownloadUrl(null); }}
              className="text-[11px] tracking-[1.5px] uppercase bg-transparent border-none cursor-pointer transition-colors duration-200"
              style={{ color: 'var(--gray)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--white)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--gray)')}
            >
              Regenerate with different options
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
