'use client';

import { useState } from 'react';
import { IconDownload } from './icons';

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
    <div style={{ marginTop: 48 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 0', borderBottom: '2px solid var(--orange)', marginBottom: 24,
      }}>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: '0.58rem', letterSpacing: 2.5, textTransform: 'uppercase',
          color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span className="blink-dot" style={{ background: 'var(--blue)', boxShadow: '0 0 4px rgba(96,165,250,0.5)' }} />
          // Test Generation
        </div>
      </div>

      {status === 'idle' || status === 'error' ? (
        <div style={{
          padding: '32px 36px',
          border: '1px solid var(--border)',
          background: 'rgba(255,255,255,0.015)',
        }}>
          <h3 style={{
            fontFamily: 'var(--display)', fontSize: '1.4rem', letterSpacing: 2,
            color: 'var(--text)', margin: '0 0 8px',
          }}>
            GENERATE TEST SUITE
          </h3>
          <p style={{
            fontFamily: 'var(--body)', fontSize: '0.82rem', color: 'var(--text-dim)',
            margin: '0 0 28px', lineHeight: 1.6,
          }}>
            AI-generated Maestro &amp; Detox test scripts targeting each issue found in your analysis.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
            <div>
              <label style={{
                display: 'block', fontFamily: 'var(--mono)', fontSize: '0.58rem',
                letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 8,
              }}>
                Bundle ID (optional)
              </label>
              <input
                type="text"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="com.yourcompany.yourapp"
                style={{
                  width: '100%', maxWidth: 360,
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border)',
                  padding: '12px 16px',
                  color: 'var(--white)',
                  fontFamily: 'var(--mono)',
                  fontSize: '0.78rem',
                  outline: 'none',
                }}
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includeDetox}
                onChange={(e) => setIncludeDetox(e.target.checked)}
                className="accent-[#ff6a00]"
              />
              <span style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', color: 'var(--text-mid)' }}>
                Include Detox tests (React Native)
              </span>
            </label>
          </div>

          {error && (
            <div style={{
              padding: '14px 18px', marginBottom: 20,
              background: 'rgba(248,113,113,0.04)',
              border: '1px solid rgba(248,113,113,0.15)',
              borderLeft: '3px solid var(--red)',
              fontFamily: 'var(--mono)', fontSize: '0.72rem', color: 'var(--red)',
            }}>
              {error}
            </div>
          )}

          <button onClick={handleGenerate} className="btn-primary" style={{ padding: '14px 32px' }}>
            GENERATE TEST SUITE
          </button>
        </div>
      ) : status === 'generating' ? (
        <div style={{
          padding: '48px 36px',
          border: '1px solid var(--border)',
          background: 'rgba(255,255,255,0.015)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
          minHeight: 180,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="blink-dot" style={{ width: 8, height: 8, background: 'var(--orange)', boxShadow: '0 0 12px rgba(255,106,0,0.4)' }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.78rem', color: 'var(--text)', letterSpacing: 1 }}>
              Generating test scripts...
            </span>
          </div>
          <p style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', color: 'var(--text-dim)', margin: 0 }}>
            Customizing Maestro{includeDetox ? ' & Detox' : ''} templates for your issues
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Download bar */}
          <div style={{
            padding: '24px 28px',
            border: '1px solid var(--orange-dim)',
            background: 'rgba(255,106,0,0.03)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{
                fontFamily: 'var(--display)', fontSize: '1.1rem', letterSpacing: 2,
                color: 'var(--text)', marginBottom: 4,
              }}>
                {tests.length} TEST {tests.length === 1 ? 'FILE' : 'FILES'} GENERATED
              </div>
              {expiresAt && (
                <div style={{ fontFamily: 'var(--mono)', fontSize: '0.62rem', color: 'var(--text-dim)', letterSpacing: 1 }}>
                  Download expires {new Date(expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
            {downloadUrl && (
              <a href={downloadUrl} className="btn-primary no-underline" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '12px 28px' }}>
                <IconDownload width={14} height={14} />
                DOWNLOAD ZIP
              </a>
            )}
          </div>

          {/* File list */}
          <div style={{ border: '1px solid var(--border)' }}>
            {tests.map((test, i) => (
              <div key={test.filename} style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                <button
                  onClick={() => setPreviewFile(previewFile === test.filename ? null : test.filename)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 20px', textAlign: 'left',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,106,0,0.03)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '0.76rem', color: 'var(--text)' }}>
                      {test.filename}
                    </span>
                    <span style={{
                      fontFamily: 'var(--mono)', fontSize: '0.56rem', letterSpacing: 1.5, textTransform: 'uppercase',
                      padding: '3px 10px', fontWeight: 700,
                      color: test.format === 'maestro' ? 'var(--blue)' : 'var(--purple)',
                      border: `1px solid ${test.format === 'maestro' ? 'rgba(96,165,250,0.25)' : 'rgba(167,139,250,0.25)'}`,
                    }}>
                      {test.format}
                    </span>
                  </div>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                    {previewFile === test.filename ? '▼' : '▶'}
                  </span>
                </button>

                {previewFile === test.filename && (
                  <div style={{
                    padding: '12px 20px 16px',
                    borderTop: '1px solid var(--border)',
                    background: 'rgba(255,255,255,0.01)',
                  }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>
                      {test.issueDescription}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', paddingTop: 8 }}>
            <button
              onClick={() => { setStatus('idle'); setTests([]); setDownloadUrl(null); }}
              style={{
                fontFamily: 'var(--mono)', fontSize: '0.62rem', letterSpacing: 1.5, textTransform: 'uppercase',
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--text-dim)', transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--orange)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-dim)'}
            >
              Regenerate with different options
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
