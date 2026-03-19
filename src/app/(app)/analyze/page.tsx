'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import AnalysisResults from '@/components/AnalysisResults';
import TestDownloader from '@/components/TestDownloader';
import { IconCheck, IconZap, IconBrain, IconWarning, IconX } from '@/components/icons';

type Step = 'idle' | 'uploading' | 'extracting' | 'gemini' | 'claude-sonnet' | 'claude-opus' | 'generating-tests' | 'done' | 'error';

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

const PROGRESS_STEPS = [
  { keys: ['extracting'], label: 'Extracting app metadata...', Icon: IconZap },
  { keys: ['gemini', 'claude-sonnet', 'claude-opus'], label: 'Running AI analysis...', Icon: IconBrain },
  { keys: ['generating-tests'], label: 'Generating test suite...', Icon: IconCheck },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function AnalyzePage() {
  const [synopsis, setSynopsis] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [s3Key, setS3Key] = useState('');
  const [bundleId, setBundleId] = useState('');
  const [bundleDetected, setBundleDetected] = useState(false);
  const [appName, setAppName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [step, setStep] = useState<Step>('idle');
  const [result, setResult] = useState<MergedResult | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const canSubmit = synopsis.trim() && s3Key && !uploading && step === 'idle';

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.ipa')) {
      setError('Please select a valid .ipa file.');
      return;
    }

    setFile(selectedFile);
    setError('');
    setUploading(true);
    setUploadProgress(0);

    try {
      // Get presigned URL
      const presignRes = await fetch('/api/upload-ipa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: selectedFile.name, contentType: 'application/octet-stream', size: selectedFile.size }),
      });

      if (!presignRes.ok) {
        const data = await presignRes.json();
        throw new Error(data.error || 'Failed to get upload URL.');
      }

      const { uploadUrl, key, bundleId: detectedBundleId, appName: detectedAppName } = await presignRes.json();

      // Upload directly to S3
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error('Upload failed with status ' + xhr.status));
        };
        xhr.onerror = () => reject(new Error('Upload failed.'));
        xhr.send(selectedFile);
      });

      setS3Key(key);
      if (detectedBundleId) {
        setBundleId(detectedBundleId);
        setBundleDetected(true);
      }
      if (detectedAppName) {
        setAppName(detectedAppName);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
      setFile(null);
    } finally {
      setUploading(false);
    }
  }, []);

  function handleRemoveFile() {
    setFile(null);
    setS3Key('');
    setBundleId('');
    setBundleDetected(false);
    setAppName('');
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setError('');
    setResult(null);
    setStep('extracting');

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 180_000);

      const res = await fetch('/api/analyze-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          s3Key,
          synopsis: synopsis.trim(),
          bundleId: bundleId.trim() || undefined,
          credentials: (loginEmail.trim() || loginPassword.trim())
            ? { email: loginEmail.trim(), password: loginPassword.trim() }
            : undefined,
        }),
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
                const s = data.step;
                if (s === 'extracting') setStep('extracting');
                else if (s === 'gemini') setStep('gemini');
                else if (s === 'claude-sonnet') setStep('claude-sonnet');
                else if (s === 'claude-opus') setStep('claude-opus');
                else if (s === 'generating-tests') setStep('generating-tests');
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

  const isScanning = step !== 'idle' && step !== 'done' && step !== 'error';

  return (
    <div className="min-h-[calc(100vh-72px)] flex flex-col items-center justify-center px-6 md:px-16 lg:px-24 py-16">
      <div className="w-full max-w-[720px]">

        {/* Header */}
        <div className="mb-12 text-center">
          <div className="text-[11px] font-medium tracking-[5px] uppercase mb-4" style={{ color: 'var(--pink)' }}>
            Scan Your App
          </div>
          <h1 className="text-[11px] font-medium tracking-[5px] uppercase" style={{ color: 'var(--white)' }}>
            Upload &amp; Analyze
          </h1>
        </div>

        {step === 'idle' || step === 'error' ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-8">

            {/* 1. App Synopsis */}
            <div>
              <label className="block text-[10px] tracking-[3px] uppercase mb-4" style={{ color: 'var(--gray)' }}>
                Describe Your App
              </label>
              <textarea
                value={synopsis}
                onChange={(e) => setSynopsis(e.target.value)}
                rows={10}
                placeholder="What does your app do? Describe key features, user flows, and functionality..."
                className="w-full resize-none leading-relaxed text-[13px]"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border)',
                  padding: '24px',
                  color: 'var(--white)',
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                  fontFamily: 'inherit',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(255, 45, 120, 0.3)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              />
            </div>

            {/* 2. .ipa File Upload */}
            <div>
              <label className="block text-[10px] tracking-[3px] uppercase mb-4" style={{ color: 'var(--gray)' }}>
                Upload Your .IPA
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept=".ipa"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
              />

              {!file ? (
                <div
                  ref={dropZoneRef}
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className="flex flex-col items-center justify-center cursor-pointer transition-all duration-200"
                  style={{
                    height: '120px',
                    border: dragOver
                      ? '1px dashed rgba(255, 45, 120, 0.4)'
                      : '1px dashed rgba(255, 255, 255, 0.08)',
                    background: dragOver ? 'rgba(255, 45, 120, 0.03)' : 'transparent',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span className="text-[12px]" style={{ color: 'var(--gray-muted)' }}>
                    Drag &amp; drop your .ipa file here or click to browse
                  </span>
                </div>
              ) : (
                <div
                  className="flex items-center justify-between px-6"
                  style={{
                    height: '120px',
                    border: '1px solid var(--border)',
                    background: 'rgba(255,255,255,0.02)',
                  }}
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-[13px]" style={{ color: 'var(--white)' }}>
                      {file.name}
                    </span>
                    <span className="text-[11px]" style={{ color: 'var(--gray-muted)' }}>
                      {formatFileSize(file.size)}
                    </span>
                    {uploading && (
                      <div className="flex items-center gap-3 mt-2">
                        <div className="h-[2px] flex-1 max-w-[200px]" style={{ background: 'var(--border)' }}>
                          <div
                            className="h-full transition-all duration-300"
                            style={{
                              width: `${uploadProgress}%`,
                              background: 'var(--pink)',
                            }}
                          />
                        </div>
                        <span className="text-[10px] tracking-[2px]" style={{ color: 'var(--gray)' }}>
                          {uploadProgress}%
                        </span>
                      </div>
                    )}
                    {!uploading && s3Key && (
                      <span className="text-[10px] tracking-[2px] uppercase" style={{ color: 'var(--green)' }}>
                        Uploaded
                      </span>
                    )}
                  </div>
                  {!uploading && (
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="cursor-pointer"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--gray-muted)',
                        padding: '8px',
                        transition: 'color 0.2s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--red)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--gray-muted)'}
                    >
                      <IconX width={16} height={16} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 3. Login Credentials */}
            <div>
              <label className="block text-[10px] tracking-[3px] uppercase mb-4" style={{ color: 'var(--gray)' }}>
                Test Login Credentials
              </label>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="test@example.com"
                  className="w-full text-[13px]"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border)',
                    padding: '14px 18px',
                    color: 'var(--white)',
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                    fontFamily: 'inherit',
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(255, 45, 120, 0.3)'}
                  onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                />
                <input
                  type="text"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="password"
                  className="w-full text-[13px]"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border)',
                    padding: '14px 18px',
                    color: 'var(--white)',
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                    fontFamily: 'inherit',
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(255, 45, 120, 0.3)'}
                  onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                />
              </div>
            </div>

            {/* 4. Bundle ID */}
            <div>
              <label className="flex items-center gap-3 text-[10px] tracking-[3px] uppercase mb-4" style={{ color: 'var(--gray)' }}>
                Bundle ID
                {bundleDetected && (
                  <span
                    className="text-[9px] tracking-[1.5px] uppercase px-2 py-0.5"
                    style={{
                      color: 'var(--green)',
                      border: '1px solid rgba(52, 211, 153, 0.25)',
                      background: 'rgba(52, 211, 153, 0.05)',
                    }}
                  >
                    Detected from .ipa
                  </span>
                )}
              </label>
              <input
                type="text"
                value={bundleId}
                onChange={(e) => { setBundleId(e.target.value); setBundleDetected(false); }}
                placeholder="com.yourcompany.appname"
                className="w-full text-[13px]"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border)',
                  padding: '14px 18px',
                  color: 'var(--white)',
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                  fontFamily: 'inherit',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(255, 45, 120, 0.3)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              />
            </div>

            {/* Error */}
            {error && (
              <div
                className="flex items-start gap-3 p-5"
                style={{ background: 'rgba(248, 113, 113, 0.04)', border: '1px solid rgba(248, 113, 113, 0.15)' }}
              >
                <IconWarning width={16} height={16} className="shrink-0 mt-0.5" style={{ color: 'var(--red)' }} />
                <span className="text-[12px]" style={{ color: 'var(--red)' }}>{error}</span>
              </div>
            )}

            {/* Scan Now button */}
            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full text-center text-[11px] tracking-[3px] uppercase font-medium cursor-pointer"
              style={{
                color: canSubmit ? 'var(--white)' : 'var(--gray)',
                background: 'transparent',
                border: '1px solid rgba(255, 45, 120, 0.4)',
                padding: '22px',
                boxShadow: canSubmit
                  ? '0 0 40px rgba(255, 45, 120, 0.15), 0 0 80px rgba(255, 45, 120, 0.08)'
                  : 'none',
                transition: 'all 0.4s ease',
                opacity: canSubmit ? 1 : 0.4,
              }}
            >
              <span className="flex items-center justify-center gap-3">
                <IconZap width={16} height={16} />
                Scan Now
              </span>
            </button>

            {/* Buy more credits */}
            <Link
              href="/pricing"
              className="block w-full text-center no-underline text-[10px] tracking-[3px] uppercase font-medium"
              style={{
                color: 'var(--gray)',
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                padding: '22px',
                transition: 'all 0.3s ease',
              }}
            >
              Buy More Credits
            </Link>
          </form>
        ) : step === 'done' && result ? (
          <>
            <AnalysisResults result={result} />
            {scanId && <TestDownloader scanId={scanId} hasIssues={result.issues.length > 0} />}
            <div className="mt-12 flex flex-col gap-4">
              {/* Download buttons */}
              <div className="grid grid-cols-2 gap-4">
                <a
                  href={scanId ? `/api/pdf/pre-flight?scanId=${scanId}` : '#'}
                  className="block w-full text-center no-underline text-[10px] tracking-[3px] uppercase font-medium"
                  style={{
                    color: 'var(--white)',
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    padding: '22px',
                    transition: 'all 0.3s ease',
                  }}
                >
                  Download Pre-Flight PDF
                </a>
                <a
                  href={scanId ? `/api/pdf/review-packet?scanId=${scanId}` : '#'}
                  className="block w-full text-center no-underline text-[10px] tracking-[3px] uppercase font-medium"
                  style={{
                    color: 'var(--white)',
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    padding: '22px',
                    transition: 'all 0.3s ease',
                  }}
                >
                  Download Review Packet PDF
                </a>
              </div>

              <button
                onClick={handleReset}
                className="w-full text-center text-[10px] tracking-[3px] uppercase font-medium cursor-pointer"
                style={{
                  color: 'var(--white)',
                  background: 'transparent',
                  border: '1px solid rgba(255, 45, 120, 0.4)',
                  padding: '22px',
                  boxShadow: '0 0 40px rgba(255, 45, 120, 0.15), 0 0 80px rgba(255, 45, 120, 0.08)',
                }}
              >
                &larr; New Analysis
              </button>
              <Link
                href="/pricing"
                className="block w-full text-center no-underline text-[10px] tracking-[3px] uppercase font-medium"
                style={{
                  color: 'var(--gray)',
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  padding: '22px',
                }}
              >
                Buy More Credits
              </Link>
            </div>
          </>
        ) : (
          /* Progress Steps */
          <div
            className="p-12 flex flex-col items-center justify-center gap-8 relative overflow-hidden"
            style={{ minHeight: '320px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}
          >
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255, 45, 120, 0.3), transparent)' }} />

            {/* Horizontal stepper */}
            <div className="flex items-center gap-0 w-full max-w-[560px]">
              {PROGRESS_STEPS.map(({ keys, label, Icon }, idx) => {
                const allKeys = PROGRESS_STEPS.map(s => s.keys);
                const flatBefore = allKeys.slice(0, idx).flat();
                const isDone = flatBefore.length > 0
                  ? !flatBefore.includes(step) && !keys.includes(step)
                    ? (() => {
                        const allFlat = allKeys.flat();
                        const currentStepIdx = allFlat.indexOf(step);
                        const lastKeyOfThisGroup = allFlat.indexOf(keys[keys.length - 1]);
                        return currentStepIdx > lastKeyOfThisGroup;
                      })()
                    : false
                  : false;
                const isActive = keys.includes(step);

                return (
                  <div key={keys[0]} className="flex items-center flex-1">
                    <div className="flex flex-col items-center gap-3 flex-1">
                      <div
                        className="w-10 h-10 flex items-center justify-center transition-all duration-500"
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
                        className="text-[10px] tracking-[1px] text-center transition-all duration-300 leading-tight"
                        style={{ color: isActive ? 'var(--white)' : isDone ? 'var(--gray)' : 'var(--gray-dim)' }}
                      >
                        {label}
                      </span>
                    </div>
                    {idx < PROGRESS_STEPS.length - 1 && (
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
    </div>
  );
}
