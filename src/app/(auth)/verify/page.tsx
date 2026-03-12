'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Verification failed.');
        return;
      }

      router.push('/login?verified=1');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <p className="text-[13px] mb-8" style={{ color: 'var(--gray)' }}>
        We sent a 6-digit code to <span className="text-white">{email}</span>
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-[11px] tracking-[2px] uppercase mb-2" style={{ color: 'var(--gray)' }}>
            Verification code
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            maxLength={6}
            placeholder="000000"
            className="w-full px-4 py-3 bg-transparent text-white outline-none tracking-[8px] text-center transition-all duration-300"
            style={{ border: '1px solid var(--panel-border)', fontFamily: "'Sora', sans-serif", fontSize: '22px' }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--pink-dim)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--panel-border)')}
          />
        </div>

        {error && (
          <div className="text-[13px] px-4 py-3" style={{ color: '#ff6b6b', background: 'rgba(255,107,107,0.05)', border: '1px solid rgba(255,107,107,0.15)' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="w-full py-3.5 text-[12px] tracking-[2px] uppercase font-medium text-white transition-all duration-300 mt-2"
          style={{ background: loading || code.length !== 6 ? 'var(--pink-dim)' : 'var(--pink)', border: 'none', cursor: loading || code.length !== 6 ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Verifying...' : 'Verify Email'}
        </button>
      </form>
    </>
  );
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#000' }}>
      <div className="w-full max-w-[400px]">
        <div className="flex items-center gap-2 mb-12">
          <div className="w-2 h-2 rounded-full" style={{ background: 'var(--pink)', boxShadow: '0 0 12px var(--pink-dim)' }} />
          <span className="text-[20px] font-bold tracking-tight" style={{ fontFamily: "'Sora', sans-serif" }}>
            Luminetic
          </span>
        </div>
        <div className="text-[11px] tracking-[4px] uppercase mb-3" style={{ color: 'var(--pink)' }}>
          One more step
        </div>
        <h1 className="text-3xl font-semibold mb-2" style={{ fontFamily: "'Sora', sans-serif" }}>
          Verify email
        </h1>
        <Suspense fallback={<div className="text-sm" style={{ color: 'var(--gray)' }}>Loading...</div>}>
          <VerifyForm />
        </Suspense>
      </div>
    </div>
  );
}
