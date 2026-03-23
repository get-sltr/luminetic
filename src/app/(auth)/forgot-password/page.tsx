'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'email' | 'code' | 'done'>('email');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to send code.');
        return;
      }

      setStep('code');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Reset failed.');
        return;
      }

      setStep('done');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ background: 'var(--black)' }}>
      <div className="grid-bg" />
      <Header />

      <main className="min-h-screen flex items-center justify-center px-6 pt-[100px] pb-[80px]">
        <div className="w-full max-w-[420px]">
          <div className="text-[11px] font-medium tracking-[4px] uppercase mb-4" style={{ color: 'var(--orange)' }}>
            Account Recovery
          </div>
          <h1 className="text-[32px] font-bold mb-10" style={{ letterSpacing: '-0.5px' }}>
            Reset password
          </h1>

          {step === 'email' && (
            <form onSubmit={handleSendCode} className="flex flex-col gap-6">
              <div>
                <label className="block text-[11px] tracking-[2px] uppercase mb-2" style={{ color: 'var(--gray)' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@company.com"
                  className="input-field"
                />
              </div>

              {error && (
                <div className="text-[13px] px-4 py-3" style={{ color: 'var(--red)', background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.12)' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full text-white text-[12px] tracking-[2px] uppercase font-medium mt-2"
                style={{
                  background: loading ? 'var(--orange-dim)' : 'var(--orange)',
                  padding: '16px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  border: 'none',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? 'Sending...' : 'Send Reset Code'}
              </button>

              <p className="text-[13px] text-center mt-4" style={{ color: 'var(--gray)' }}>
                Remember your password?{' '}
                <Link href="/login" className="text-white hover:underline">Sign in</Link>
              </p>
            </form>
          )}

          {step === 'code' && (
            <form onSubmit={handleResetPassword} className="flex flex-col gap-6">
              <p className="text-[13px]" style={{ color: 'var(--gray)' }}>
                If an account exists for{' '}
                <strong style={{ color: 'var(--white)' }}>{email}</strong>, you should get a code by email.
                Check spam/junk — it can take a minute.
              </p>

              <div>
                <label className="block text-[11px] tracking-[2px] uppercase mb-2" style={{ color: 'var(--gray)' }}>
                  Verification Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  autoComplete="one-time-code"
                  placeholder="123456"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-[11px] tracking-[2px] uppercase mb-2" style={{ color: 'var(--gray)' }}>
                  New Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={12}
                  autoComplete="new-password"
                  placeholder="12+ chars: upper, lower, number, symbol"
                  className="input-field"
                />
              </div>

              {error && (
                <div className="text-[13px] px-4 py-3" style={{ color: 'var(--red)', background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.12)' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full text-white text-[12px] tracking-[2px] uppercase font-medium mt-2"
                style={{
                  background: loading ? 'var(--orange-dim)' : 'var(--orange)',
                  padding: '16px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  border: 'none',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}

          {step === 'done' && (
            <div className="text-center">
              <p className="text-[14px] mb-6" style={{ color: 'var(--green)' }}>
                Password reset successfully.
              </p>
              <Link
                href="/login"
                className="inline-block text-white text-[12px] tracking-[2px] uppercase font-medium no-underline"
                style={{
                  background: 'var(--orange)',
                  padding: '16px 32px',
                }}
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
