'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import AnalysisResults from '@/components/AnalysisResults';
import TestDownloader from '@/components/TestDownloader';
import { IconCheck, IconZap, IconBrain, IconWarning, IconX } from '@/components/icons';

type Step = 'idle' | 'uploading' | 'extracting' | 'primary' | 'secondary' | 'deep' | 'generating-tests' | 'done' | 'error';

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
  { keys: ['extracting'], label: 'Extracting metadata', Icon: IconZap },
  { keys: ['primary', 'secondary', 'deep'], label: 'Running AI analysis', Icon: IconBrain },
  { keys: ['generating-tests'], label: 'Generating tests', Icon: IconCheck },
];

const MAX_IPA_BYTES = 500 * 1024 * 1024;

function parseS3ErrorHint(xmlOrText: string): string | null {
  const m = xmlOrText.match(/<Message>([^<]+)<\/Message>/);
  return m?.[1]?.trim() ?? null;
}

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
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [step, setStep] = useState<Step>('idle');
  const [result, setResult] = useState<MergedResult | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState<'preflight' | 'review-packet' | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showIpaGuide, setShowIpaGuide] = useState(false);

  const canSubmit = synopsis.trim() && s3Key && !uploading && step === 'idle';

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.ipa')) {
      setError('Please select a valid .ipa file.');
      return;
    }
    if (selectedFile.size > MAX_IPA_BYTES) {
      setError(`File is too large (max ${Math.round(MAX_IPA_BYTES / (1024 * 1024))} MB).`);
      return;
    }

    setFile(selectedFile);
    setError('');
    setUploading(true);
    setUploadProgress(0);

    try {
      const clientContentType =
        selectedFile.type === 'application/zip' || selectedFile.type === 'application/x-itunes-ipa'
          ? selectedFile.type
          : 'application/octet-stream';

      const presignRes = await fetch('/api/upload-ipa', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: selectedFile.name,
          contentType: clientContentType,
          size: selectedFile.size,
        }),
      });

      let presignJson: {
        error?: string; code?: string; uploadUrl?: string;
        s3Key?: string; contentType?: string; bundleId?: string; appName?: string;
      } = {};
      try { presignJson = await presignRes.json(); } catch {
        throw new Error('Could not start upload (invalid server response).');
      }

      if (!presignRes.ok) {
        const { error, code } = presignJson;
        if (code === 'NO_CREDITS') throw new Error(error || 'No scan credits remaining.');
        if (code === 'RATE_LIMIT') throw new Error(error || 'Too many uploads. Wait a few minutes.');
        if (code === 'SERVER_CONFIG') throw new Error(error || 'Upload storage is not configured.');
        throw new Error(error || `Failed to get upload URL (${presignRes.status}).`);
      }

      const { uploadUrl, s3Key: key, bundleId: detectedBundleId, contentType: signedContentType } = presignJson;
      if (!uploadUrl || !key) throw new Error('Upload URL missing from server.');

      const putContentType = signedContentType || 'application/octet-stream';
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', putContentType);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
      };

      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else {
            const hint = parseS3ErrorHint(xhr.responseText || '');
            const base = `Upload failed (${xhr.status})`;
            if (xhr.status === 0) { reject(new Error('Network error. Check S3 CORS configuration.')); return; }
            reject(new Error(hint ? `${base}: ${hint}` : `${base}. Check S3 CORS and Content-Type.`));
          }
        };
        xhr.onerror = () => reject(new Error('Upload failed (network). Check S3 CORS.'));
        xhr.send(selectedFile);
      });

      setS3Key(key);
      if (detectedBundleId) { setBundleId(detectedBundleId); setBundleDetected(true); }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
      setFile(null);
    } finally {
      setUploading(false);
    }
  }, []);

  function handleRemoveFile() {
    setFile(null); setS3Key(''); setBundleId(''); setBundleDetected(false); setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleDrop(e: React.DragEvent) { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }
  function handleDragOver(e: React.DragEvent) { e.preventDefault(); setDragOver(true); }
  function handleDragLeave(e: React.DragEvent) { e.preventDefault(); setDragOver(false); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setError(''); setResult(null); setStep('extracting');

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
        setError(data.error || 'Analysis failed.'); setStep('error'); return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No stream');

      const decoder = new TextDecoder();
      let buffer = '';
      let eventType = '';

      const processLine = (line: string) => {
        if (line.startsWith('event: ')) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith('data: ') && eventType) {
          try {
            const data = JSON.parse(line.slice(6));
            if (eventType === 'status') {
              const s = data.step;
              if (s === 'extracting') setStep('extracting');
              else if (s === 'gemini') setStep('primary');
              else if (s === 'claude-sonnet') setStep('secondary');
              else if (s === 'claude-opus') setStep('deep');
              else if (s === 'generating-tests') setStep('generating-tests');
            } else if (eventType === 'result') {
              setResult(data.result); setScanId(data.scanId || null); setStep('done');
            } else if (eventType === 'error') {
              setError(data.error || 'Analysis failed.'); setStep('error');
            }
          } catch { /* skip malformed */ }
          eventType = '';
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // Process any remaining data in the buffer before exiting
          if (buffer.trim()) {
            const remaining = buffer.split('\n');
            for (const line of remaining) processLine(line);
          }
          clearTimeout(timeout);
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) processLine(line);
      }

      // Safety: if stream ended without result or error, show a message
      setStep((prev) => {
        if (prev !== 'done' && prev !== 'error' && prev !== 'idle') {
          setError('Analysis stream ended unexpectedly. Please try again.');
          return 'error';
        }
        return prev;
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') setError('Analysis timed out. Please try again.');
      else setError('Something went wrong. Please try again.');
      setStep('error');
    }
  }

  function handleReset() { setStep('idle'); setResult(null); setScanId(null); setError(''); }

  const handleDownloadPdf = useCallback(async (kind: 'preflight' | 'review-packet') => {
    if (!scanId) return;

    setError('');
    setDownloadingPdf(kind);

    try {
      const endpoint =
        kind === 'preflight'
          ? '/api/generate-preflight-pdf'
          : '/api/generate-review-pdf';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanId }),
      });

      if (!res.ok) {
        let message = 'Failed to generate PDF. Please try again.';
        try {
          const data = await res.json();
          if (data?.error) message = data.error;
        } catch {
          // Ignore malformed error body and keep default message.
        }
        throw new Error(message);
      }

      const pdfBlob = await res.blob();
      const objectUrl = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `${kind}-${scanId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download PDF.');
    } finally {
      setDownloadingPdf(null);
    }
  }, [scanId]);

  const inputStyle = {
    width: '100%',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.1)',
    padding: '14px 18px',
    color: 'var(--white)',
    fontFamily: 'var(--mono)',
    fontSize: '0.78rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 72px)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 24px 80px' }}>
      <div style={{ width: '100%', maxWidth: 800 }}>

        {/* Header */}
        <div style={{ marginBottom: 52, position: 'relative' }}>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: '0.58rem', letterSpacing: 3, textTransform: 'uppercase',
            color: 'var(--orange)', marginBottom: 12,
          }}>
            <span style={{ opacity: 0.5 }}>{'> '}</span>scan.initialize
          </div>
          <h1 style={{
            fontFamily: 'var(--display)', fontSize: '3.5rem', letterSpacing: 3,
            color: 'var(--text)', margin: 0, lineHeight: 1,
          }}>
            UPLOAD &amp; ANALYZE
          </h1>
          <div style={{
            position: 'absolute', top: '50%', right: 0, width: '30%', height: 1,
            background: 'linear-gradient(90deg, transparent, var(--orange), transparent)',
            opacity: 0.2,
          }} />
        </div>

        {step === 'idle' || step === 'error' ? (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>

            {/* 1. App Synopsis */}
            <div>
              <label style={{
                display: 'block', fontFamily: 'var(--mono)', fontSize: '0.58rem',
                letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 12,
              }}>
                // Describe Your App
              </label>
              <textarea
                value={synopsis}
                onChange={(e) => setSynopsis(e.target.value)}
                rows={8}
                placeholder="What does your app do? Describe key features, user flows, and functionality..."
                style={{
                  ...inputStyle,
                  padding: '24px',
                  resize: 'none',
                  lineHeight: 1.7,
                  fontFamily: 'var(--body)',
                  fontSize: '0.88rem',
                }}
              />
            </div>

            {/* 2. .ipa Upload */}
            <div>
              <label style={{
                display: 'block', fontFamily: 'var(--mono)', fontSize: '0.58rem',
                letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 12,
              }}>
                // Upload .IPA File
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept=".ipa"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
              />

              {!file ? (
                <div
                  ref={dropZoneRef}
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  style={{
                    height: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                    border: dragOver ? '1px dashed var(--orange)' : '1px dashed rgba(255,255,255,0.15)',
                    background: dragOver ? 'rgba(255,106,0,0.03)' : 'transparent',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--gray-muted)' }}>
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', color: 'var(--gray)' }}>
                    Drag &amp; drop .ipa or click to browse
                  </span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', color: 'var(--gray-muted)' }}>
                    Max {Math.round(MAX_IPA_BYTES / (1024 * 1024))} MB
                  </span>
                </div>
              ) : (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '20px 24px',
                  border: '1px solid var(--border)',
                  background: 'rgba(255,255,255,0.02)',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '0.82rem', color: 'var(--text)' }}>
                      {file.name}
                    </span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                      {formatFileSize(file.size)}
                    </span>
                    {uploading && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                        <div style={{ height: 2, flex: 1, maxWidth: 200, background: 'var(--border)' }}>
                          <div style={{ height: '100%', width: `${uploadProgress}%`, background: 'var(--orange)', transition: 'width 0.3s' }} />
                        </div>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: 1 }}>
                          {uploadProgress}%
                        </span>
                      </div>
                    )}
                    {!uploading && s3Key && (
                      <span style={{
                        fontFamily: 'var(--mono)', fontSize: '0.6rem', letterSpacing: 2, textTransform: 'uppercase',
                        color: 'var(--green)', marginTop: 4,
                      }}>
                        Uploaded
                      </span>
                    )}
                  </div>
                  {!uploading && (
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 8, transition: 'color 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--red)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-dim)'}
                    >
                      <IconX width={16} height={16} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Secure Upload notice */}
            <div style={{
              padding: '20px 24px',
              border: '1px solid rgba(255,106,0,0.15)',
              background: 'rgba(255,106,0,0.03)',
              display: 'flex', alignItems: 'flex-start', gap: 14,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--orange)', flexShrink: 0, marginTop: 2 }}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '0.62rem', letterSpacing: 2, textTransform: 'uppercase', color: 'var(--orange)', fontWeight: 700, marginBottom: 6 }}>
                  Secure Upload
                </div>
                <p style={{ fontFamily: 'var(--body)', fontSize: '0.78rem', color: 'var(--text-dim)', lineHeight: 1.6, margin: 0 }}>
                  Your IPA file is uploaded to a secure server with AES-256 encryption and strict access controls. Only you and the Luminetic analysis engine have access. Your IPA will be automatically deleted within 7 days. Questions? Reach us at{' '}
                  <a href="mailto:hello@luminetic.io" style={{ color: 'var(--orange)', textDecoration: 'none', fontWeight: 600 }}>hello@luminetic.io</a>
                </p>
              </div>
            </div>

            {/* IPA generation guide */}
            <div>
              <button
                type="button"
                onClick={() => setShowIpaGuide(!showIpaGuide)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
                  fontFamily: 'var(--mono)', fontSize: '0.62rem', letterSpacing: 2, textTransform: 'uppercase',
                  color: 'var(--orange)', transition: 'opacity 0.2s',
                }}
              >
                <span style={{ fontSize: '0.72rem', transition: 'transform 0.2s', transform: showIpaGuide ? 'rotate(0deg)' : 'rotate(-90deg)' }}>▼</span>
                {showIpaGuide ? 'Hide' : 'Show'} instructions for generating .ipa file
              </button>

              {showIpaGuide && (
                <div style={{
                  marginTop: 16, padding: '28px 32px',
                  border: '1px solid var(--border)',
                  background: 'rgba(255,255,255,0.015)',
                }}>
                  <h3 style={{ fontFamily: 'var(--display)', fontSize: '1.3rem', letterSpacing: 2, color: 'var(--text)', margin: '0 0 20px' }}>
                    HOW TO GENERATE .IPA FILE IN XCODE
                  </h3>
                  <ol style={{ fontFamily: 'var(--body)', fontSize: '0.82rem', color: 'var(--text-mid)', lineHeight: 2.2, margin: 0, paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <li>Open your project folder in Xcode</li>
                    <li>In Xcode, select your project name in the left sidebar</li>
                    <li>Select the <span style={{ fontFamily: 'var(--mono)', color: 'var(--orange)', fontSize: '0.78rem' }}>&quot;Your App Name&quot;</span> target under &quot;TARGETS&quot;</li>
                    <li>Go to <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)', fontWeight: 700 }}>Signing &amp; Capabilities</span> tab</li>
                    <li>Under Team, select your developer account</li>
                    <li>Make sure &quot;Automatically manage signing&quot; is checked</li>
                    <li style={{ marginTop: 4 }}>
                      In the top bar, change the destination from &quot;iPhone Simulator&quot; to Any iOS Device (arm64)
                      <ul style={{ listStyle: 'disc', paddingLeft: 20, marginTop: 4, lineHeight: 1.8 }}>
                        <li style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Click where it says &quot;Your App Name &gt; iPhone 15 Pro&quot;</li>
                        <li style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Select <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)', fontWeight: 700 }}>Any iOS Device (arm64)</span> from the dropdown</li>
                      </ul>
                    </li>
                    <li>Go to menu: <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)', fontWeight: 700 }}>Product → Archive</span></li>
                    <li>Wait for it to build (you&apos;ll see progress in the top bar)</li>
                    <li>In the Organizer, select your archive</li>
                    <li>Click <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)', fontWeight: 700 }}>Distribute App</span> button on the right</li>
                    <li style={{ marginTop: 4 }}>
                      You&apos;ll see these options:
                      <ul style={{ listStyle: 'disc', paddingLeft: 20, marginTop: 4, lineHeight: 1.8 }}>
                        <li style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>App Store Connect</li>
                        <li style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>TestFlight Internal Only</li>
                        <li style={{ fontSize: '0.78rem', color: 'var(--orange)', fontWeight: 700 }}>Release Testing ← SELECT THIS ONE</li>
                        <li style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Debugging</li>
                        <li style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Enterprise</li>
                        <li style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Custom</li>
                      </ul>
                    </li>
                    <li>Click &quot;Release Testing&quot; → Click &quot;Distribute&quot;</li>
                    <li>The build should take a few minutes</li>
                    <li>Once it is ready click <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)', fontWeight: 700 }}>Export</span></li>
                    <li>Save it somewhere so you can access it later</li>
                    <li>Now it will have <span style={{ fontFamily: 'var(--mono)', color: 'var(--orange)', fontWeight: 700 }}>appname.ipa</span></li>
                    <li>Upload that .ipa file using the upload area above</li>
                  </ol>
                </div>
              )}
            </div>

            {/* 3. Login Credentials */}
            <div>
              <label style={{
                display: 'block', fontFamily: 'var(--mono)', fontSize: '0.58rem',
                letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 6,
              }}>
                // Test Login Credentials
              </label>
              <p style={{
                fontFamily: 'var(--mono)', fontSize: '0.64rem', color: 'var(--text-dim)', opacity: 0.6,
                margin: '0 0 12px',
              }}>
                Use test-only credentials. Never enter real passwords.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="test@example.com" style={inputStyle} />
                <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="password" style={inputStyle} />
              </div>
            </div>

            {/* 4. Bundle ID */}
            <div>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 10,
                fontFamily: 'var(--mono)', fontSize: '0.58rem',
                letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 12,
              }}>
                // Bundle ID
                {bundleDetected && (
                  <span style={{
                    fontSize: '0.52rem', letterSpacing: 1.5, padding: '3px 10px',
                    color: 'var(--green)', border: '1px solid rgba(52,211,153,0.25)',
                    background: 'rgba(52,211,153,0.05)',
                  }}>
                    DETECTED FROM .IPA
                  </span>
                )}
              </label>
              <input type="text" value={bundleId}
                onChange={(e) => { setBundleId(e.target.value); setBundleDetected(false); }}
                placeholder="com.yourcompany.appname" style={inputStyle} />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, padding: '18px 22px',
                background: 'rgba(248,113,113,0.04)',
                border: '1px solid rgba(248,113,113,0.15)',
                borderLeft: '3px solid var(--red)',
              }}>
                <IconWarning width={16} height={16} className="shrink-0 mt-0.5" style={{ color: 'var(--red)' }} />
                <span style={{ fontFamily: 'var(--mono)', fontSize: '0.76rem', color: 'var(--red)' }}>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!canSubmit}
              className="btn-primary"
              style={{
                width: '100%', padding: '20px',
                opacity: canSubmit ? 1 : 0.3,
                pointerEvents: canSubmit ? 'auto' : 'none',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <IconZap width={18} height={18} />
                INITIALIZE SCAN
              </span>
            </button>

            <Link
              href="/pricing"
              className="no-underline"
              style={{
                display: 'block', width: '100%', textAlign: 'center',
                fontFamily: 'var(--mono)', fontSize: '0.62rem', letterSpacing: 2, textTransform: 'uppercase',
                color: 'var(--text-dim)', padding: '18px',
                border: '1px solid var(--border)',
                transition: 'all 0.2s',
              }}
            >
              Buy More Credits
            </Link>
          </form>
        ) : step === 'done' && result ? (
          <>
            <AnalysisResults result={result} />
            {scanId && <TestDownloader scanId={scanId} hasIssues={result.issues.length > 0} />}

            <div style={{ marginTop: 52, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {error && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12, padding: '18px 22px',
                  background: 'rgba(248,113,113,0.04)',
                  border: '1px solid rgba(248,113,113,0.15)',
                  borderLeft: '3px solid var(--red)',
                }}>
                  <IconWarning width={16} height={16} className="shrink-0 mt-0.5" style={{ color: 'var(--red)' }} />
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '0.76rem', color: 'var(--red)' }}>{error}</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => handleDownloadPdf('preflight')}
                  disabled={!scanId || downloadingPdf !== null}
                  style={{
                    display: 'block', width: '100%', textAlign: 'center',
                    fontFamily: 'var(--mono)', fontSize: '0.62rem', letterSpacing: 2, textTransform: 'uppercase',
                    color: 'var(--text)', padding: '18px',
                    border: '1px solid var(--border)', transition: 'all 0.2s',
                    background: 'transparent',
                    opacity: !scanId || downloadingPdf !== null ? 0.5 : 1,
                    cursor: !scanId || downloadingPdf !== null ? 'not-allowed' : 'pointer',
                  }}
                >
                  {downloadingPdf === 'preflight' ? 'Generating Pre-Flight PDF...' : 'Download Pre-Flight PDF'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadPdf('review-packet')}
                  disabled={!scanId || downloadingPdf !== null}
                  style={{
                    display: 'block', width: '100%', textAlign: 'center',
                    fontFamily: 'var(--mono)', fontSize: '0.62rem', letterSpacing: 2, textTransform: 'uppercase',
                    color: 'var(--text)', padding: '18px',
                    border: '1px solid var(--border)', transition: 'all 0.2s',
                    background: 'transparent',
                    opacity: !scanId || downloadingPdf !== null ? 0.5 : 1,
                    cursor: !scanId || downloadingPdf !== null ? 'not-allowed' : 'pointer',
                  }}
                >
                  {downloadingPdf === 'review-packet' ? 'Generating Review Packet PDF...' : 'Download Review Packet PDF'}
                </button>
              </div>

              <button
                onClick={handleReset}
                className="btn-primary"
                style={{ width: '100%', padding: '18px' }}
              >
                ← NEW ANALYSIS
              </button>

              <Link
                href="/pricing"
                className="no-underline"
                style={{
                  display: 'block', textAlign: 'center',
                  fontFamily: 'var(--mono)', fontSize: '0.62rem', letterSpacing: 2, textTransform: 'uppercase',
                  color: 'var(--text-dim)', padding: '18px',
                  border: '1px solid var(--border)',
                }}
              >
                Buy More Credits
              </Link>
            </div>
          </>
        ) : (
          /* Progress */
          <div style={{
            padding: '64px 36px', minHeight: 320,
            border: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 48,
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Top glow line */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 1,
              background: 'linear-gradient(90deg, transparent, var(--orange), transparent)',
            }} />

            {/* Steps */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, width: '100%', maxWidth: 560 }}>
              {PROGRESS_STEPS.map(({ keys, label, Icon }, idx) => {
                const allFlat = PROGRESS_STEPS.flatMap(s => s.keys);
                const lastKeyIdx = allFlat.indexOf(keys[keys.length - 1]);
                const currentStepIdx = allFlat.indexOf(step);
                const isDone = step === 'done' || (currentStepIdx > lastKeyIdx);
                const isActive = keys.includes(step);

                return (
                  <div key={keys[0]} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, flex: 1 }}>
                      <div style={{
                        width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: isDone ? '1px solid var(--orange)' : isActive ? '1px solid var(--orange-dim)' : '1px solid var(--border)',
                        background: isDone ? 'var(--orange)' : isActive ? 'rgba(255,106,0,0.06)' : 'transparent',
                        boxShadow: isActive ? '0 0 24px rgba(255,106,0,0.15)' : 'none',
                        transition: 'all 0.5s',
                      }}>
                        {isDone ? (
                          <IconCheck width={16} height={16} style={{ color: 'white' }} />
                        ) : isActive ? (
                          <Icon width={16} height={16} style={{ color: 'var(--orange)', animation: 'breathe 2s ease-in-out infinite' }} />
                        ) : (
                          <Icon width={16} height={16} style={{ color: 'var(--text-dim)', opacity: 0.4 }} />
                        )}
                      </div>
                      <span style={{
                        fontFamily: 'var(--mono)', fontSize: '0.6rem', letterSpacing: 1, textAlign: 'center',
                        color: isActive ? 'var(--text)' : isDone ? 'var(--text-dim)' : 'var(--text-dim)',
                        opacity: isActive ? 1 : isDone ? 0.7 : 0.4,
                        transition: 'all 0.3s',
                      }}>
                        {label}
                      </span>
                    </div>
                    {idx < PROGRESS_STEPS.length - 1 && (
                      <div style={{
                        height: 1, width: '100%', marginTop: -28,
                        background: isDone ? 'var(--orange)' : 'var(--border)',
                        transition: 'background 0.5s',
                      }} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Status text */}
            <div style={{
              fontFamily: 'var(--mono)', fontSize: '0.68rem', color: 'var(--text-dim)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span className="blink-dot" style={{ width: 6, height: 6, background: 'var(--orange)', boxShadow: '0 0 8px rgba(255,106,0,0.4)' }} />
              Processing your application...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
