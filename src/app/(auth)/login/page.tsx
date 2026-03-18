'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get('redirect') || '';
  const safeRedirect = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed.');
        return;
      }

      // If explicit redirect was passed, use it. Otherwise route by credits.
      const destination = safeRedirect || (data.credits > 0 ? '/dashboard' : '/pricing');
      router.push(destination);
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
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

      <div>
        <label className="block text-[11px] tracking-[2px] uppercase mb-2" style={{ color: 'var(--gray)' }}>
          Password
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="input-field pr-16"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] tracking-[1px] uppercase bg-transparent border-none cursor-pointer hover-text"
            style={{ color: 'var(--gray)' }}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
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
          background: loading ? 'var(--pink-dim)' : 'var(--pink)',
          padding: '16px',
          cursor: loading ? 'not-allowed' : 'pointer',
          border: 'none',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>

      <p className="text-[13px] text-center mt-4" style={{ color: 'var(--gray)' }}>
        No account?{' '}
        <Link href="/signup" className="text-white hover:underline">
          Create one
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div style={{ background: 'var(--black)' }}>
      <div className="grid-bg" />
      <Header />

      <main className="min-h-screen flex items-center justify-center px-6 pt-[100px] pb-[80px]">
        <div className="w-full max-w-[420px]">
          <div className="text-[11px] font-medium tracking-[4px] uppercase mb-4" style={{ color: 'var(--pink)' }}>
            Welcome Back
          </div>
          <h1 className="text-[32px] font-bold mb-10" style={{ letterSpacing: '-0.5px' }}>
            Sign in
          </h1>
          <Suspense fallback={<div className="text-sm" style={{ color: 'var(--gray)' }}>Loading...</div>}>
            <LoginForm />
          </Suspense>
        </div>
      </main>

      <Footer />
    </div>
  );
}
