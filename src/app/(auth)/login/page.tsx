'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ALLOWED_REDIRECTS = ['/dashboard', '/analyze', '/completeness', '/history', '/review-packet', '/pricing', '/admin', '/memory'];
  const rawRedirect = searchParams.get('redirect') || '';
  const safeRedirect = ALLOWED_REDIRECTS.some((p) => rawRedirect === p || rawRedirect.startsWith(p + '/')) ? rawRedirect : '';

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

      const destination = safeRedirect || '/dashboard';
      router.push(destination);
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {/* Email */}
        <div>
          <label style={{
            display: 'block',
            fontFamily: 'var(--mono)',
            fontSize: '0.55rem',
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: 'var(--gray)',
            marginBottom: 10,
          }}>
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
            style={{ width: '100%' }}
          />
        </div>

        {/* Password */}
        <div>
          <label style={{
            display: 'block',
            fontFamily: 'var(--mono)',
            fontSize: '0.55rem',
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: 'var(--gray)',
            marginBottom: 10,
          }}>
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="input-field"
              style={{ width: '100%', paddingRight: 64 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                fontFamily: 'var(--mono)',
                fontSize: '0.5rem',
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: 'var(--gray)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            fontFamily: 'var(--body)',
            fontSize: '0.8rem',
            color: 'var(--red)',
            background: 'rgba(239,68,68,0.04)',
            border: '1px solid rgba(239,68,68,0.15)',
            padding: '14px 18px',
          }}>
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '16px 0',
            fontFamily: 'var(--mono)',
            fontSize: '0.6rem',
            letterSpacing: 3,
            textTransform: 'uppercase',
            fontWeight: 600,
            color: 'white',
            background: loading ? 'rgba(255,106,0,0.4)' : 'var(--orange)',
            border: '1px solid var(--orange)',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            transition: 'all 0.2s',
            marginTop: 4,
          }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      {/* Links outside form */}
      <div style={{ textAlign: 'center', marginTop: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Link
          href="/forgot-password"
          style={{
            fontFamily: 'var(--body)',
            fontSize: '0.8rem',
            color: 'var(--gray)',
            textDecoration: 'none',
          }}
        >
          Forgot password?
        </Link>
        <p style={{
          fontFamily: 'var(--body)',
          fontSize: '0.82rem',
          color: 'var(--gray)',
          margin: 0,
        }}>
          No account?{' '}
          <Link href="/signup" style={{ color: 'var(--orange)', textDecoration: 'none' }}>
            Create one
          </Link>
        </p>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="grid-bg" />
      <Header />

      <main style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '120px 24px 80px',
      }}>
        <div style={{ width: '100%', maxWidth: 440 }}>
          {/* Header */}
          <div style={{ marginBottom: 40 }}>
            <div style={{
              fontFamily: 'var(--mono)',
              fontSize: '0.58rem',
              letterSpacing: 4,
              textTransform: 'uppercase',
              color: 'var(--orange)',
              marginBottom: 16,
            }}>
              // welcome back
            </div>
            <h1 style={{
              fontFamily: 'var(--display)',
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              letterSpacing: 2,
              lineHeight: 1,
              margin: 0,
              color: 'var(--text)',
            }}>
              SIGN IN
            </h1>
          </div>

          <Suspense fallback={
            <div style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', color: 'var(--gray)' }}>Loading...</div>
          }>
            <LoginForm />
          </Suspense>
        </div>
      </main>

      <Footer />
    </div>
  );
}
