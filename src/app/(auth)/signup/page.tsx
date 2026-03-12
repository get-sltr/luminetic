'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Signup failed.');
        return;
      }

      router.push(`/verify?email=${encodeURIComponent(email)}`);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#000' }}>
      <div className="w-full max-w-[400px]">
        <div className="flex items-center gap-2 mb-12">
          <div className="w-2 h-2 rounded-full" style={{ background: 'var(--pink)', boxShadow: '0 0 12px var(--pink-dim)' }} />
          <span className="text-[20px] font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Luminetic
          </span>
        </div>

        <div className="text-[11px] tracking-[4px] uppercase mb-3" style={{ color: 'var(--pink)' }}>
          Get started
        </div>
        <h1 className="text-3xl font-semibold mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Create account
        </h1>
        <p className="text-[13px] mb-8" style={{ color: 'var(--gray)' }}>
          Password must be 12+ characters with uppercase, lowercase, number, and symbol.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
              className="w-full px-4 py-3 text-sm bg-transparent text-white outline-none transition-all duration-300"
              style={{ border: '1px solid var(--panel-border)' }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--pink-dim)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--panel-border)')}
            />
          </div>

          <div>
            <label className="block text-[11px] tracking-[2px] uppercase mb-2" style={{ color: 'var(--gray)' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full px-4 py-3 text-sm bg-transparent text-white outline-none transition-all duration-300"
              style={{ border: '1px solid var(--panel-border)' }}
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
            disabled={loading}
            className="w-full py-3.5 text-[12px] tracking-[2px] uppercase font-medium text-white transition-all duration-300 mt-2"
            style={{ background: loading ? 'var(--pink-dim)' : 'var(--pink)', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-[13px] text-center mt-8" style={{ color: 'var(--gray)' }}>
          Already have an account?{' '}
          <Link href="/login" className="text-white hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
