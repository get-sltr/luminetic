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
              // get started
            </div>
            <h1 style={{
              fontFamily: 'var(--display)',
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              letterSpacing: 2,
              lineHeight: 1,
              margin: 0,
              color: 'var(--text)',
            }}>
              CREATE ACCOUNT
            </h1>
          </div>

          {/* Free scan note */}
          <div style={{
            background: 'var(--glass)',
            border: '1px solid var(--glass-border)',
            padding: '16px 20px',
            marginBottom: 36,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <span className="blink-dot" style={{ background: 'var(--green)', boxShadow: '0 0 6px rgba(34,197,94,0.5)' }} />
            <span style={{
              fontFamily: 'var(--body)',
              fontSize: '0.8rem',
              color: 'var(--text-mid)',
            }}>
              Your account includes 1 free scan credit to try the full analysis.
            </span>
          </div>

          {/* Password requirements */}
          <p style={{
            fontFamily: 'var(--body)',
            fontSize: '0.78rem',
            color: 'var(--gray)',
            margin: '0 0 32px',
            lineHeight: 1.6,
          }}>
            Password must be 12+ characters with uppercase, lowercase, number, and symbol.
          </p>

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
                  autoComplete="new-password"
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

              {/* Strength meter */}
              {password.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[1, 2, 3].map((seg) => (
                      <div
                        key={seg}
                        style={{
                          height: 2,
                          flex: 1,
                          transition: 'background 0.3s',
                          background: seg <= strength.level ? strength.color : 'var(--border)',
                        }}
                      />
                    ))}
                  </div>
                  <p style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '0.5rem',
                    letterSpacing: 2,
                    marginTop: 6,
                    color: strength.color,
                  }}>
                    {strength.label}
                  </p>
                </div>
              )}
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
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p style={{
            fontFamily: 'var(--body)',
            fontSize: '0.82rem',
            color: 'var(--gray)',
            textAlign: 'center',
            marginTop: 36,
          }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--orange)', textDecoration: 'none' }}>
              Sign in
            </Link>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
