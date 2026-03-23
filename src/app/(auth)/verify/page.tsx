'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { IconShield } from '@/components/icons';

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
      <p className="text-[13px] mb-8 text-center" style={{ color: 'var(--gray)' }}>
        We sent a 6-digit code to{' '}
        <span
          className="inline-block mt-1 px-3 py-1 rounded-md text-white text-[13px] font-medium"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)' }}
        >
          {email}
        </span>
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="section-label block mb-2 text-center">Verification code</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            maxLength={6}
            placeholder="000000"
            className="input-field w-full text-center"
            style={{ letterSpacing: '8px', fontFamily: "var(--font-heading)", fontSize: '22px' }}
          />
        </div>

        {error && (
          <div className="text-[13px] px-4 py-3 rounded-lg" style={{ color: '#ff6b6b', background: 'rgba(255,107,107,0.06)', border: '1px solid rgba(255,107,107,0.15)' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="btn-primary w-full mt-2"
          style={{ opacity: code.length !== 6 ? 0.5 : 1 }}
        >
          {loading ? 'Verifying...' : 'Verify Email'}
        </button>
      </form>
    </>
  );
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--black)' }}>
      <div className="w-full max-w-md">
        <div className="glass-card rounded-2xl p-8 sm:p-10 text-center">
          {/* Shield icon */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)' }}
          >
            <IconShield width={26} height={26} style={{ color: 'var(--orange)' }} />
          </div>

          <div className="section-label mb-3" style={{ color: 'var(--orange)' }}>One more step</div>
          <h1 className="page-title text-3xl mb-2" style={{ fontFamily: "var(--font-heading)" }}>
            Verify email
          </h1>

          <Suspense fallback={<div className="text-sm" style={{ color: 'var(--gray)' }}>Loading...</div>}>
            <VerifyForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
