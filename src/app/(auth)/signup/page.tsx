'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

function getPasswordStrength(pw: string): { level: number; label: string; color: string } {
  if (!pw) return { level: 0, label: '', color: 'transparent' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 2) return { level: 1, label: 'Weak', color: '#ef4444' };
  if (score <= 4) return { level: 2, label: 'Fair', color: '#f59e0b' };
  return { level: 3, label: 'Strong', color: '#22c55e' };
}

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

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
    <div style={{ background: 'var(--black)' }}>
      <div className="grid-bg" />
      <Header />

      <main className="min-h-screen flex items-center justify-center px-6 pt-[100px] pb-[80px]">
        <div className="w-full max-w-[420px]">
          <div className="text-[11px] font-medium tracking-[4px] uppercase mb-4" style={{ color: 'var(--orange)' }}>
            Get Started
          </div>
          <h1 className="text-[32px] font-bold mb-2" style={{ letterSpacing: '-0.5px' }}>
            Create account
          </h1>
          <p className="text-[13px] mb-10" style={{ color: 'var(--gray)' }}>
            Password must be 12+ characters with uppercase, lowercase, number, and symbol.
          </p>

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
                  autoComplete="new-password"
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

              {password.length > 0 && (
                <div className="mt-3">
                  <div className="flex gap-1.5">
                    {[1, 2, 3].map((seg) => (
                      <div
                        key={seg}
                        className="h-1 flex-1 transition-all duration-300"
                        style={{ background: seg <= strength.level ? strength.color : 'var(--border)' }}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] mt-1.5 tracking-wide" style={{ color: strength.color }}>
                    {strength.label}
                  </p>
                </div>
              )}
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
      </main>

      <Footer />
    </div>
  );
}
