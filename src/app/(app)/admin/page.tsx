'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Stats {
  totalUsers: number;
  totalScans: number;
  estimatedRevenue: number;
  activeUsers: number;
}

interface User {
  userId: string;
  email: string;
  plan: string;
  role: string;
  scanCredits: number;
  scanCount: number;
  createdAt: string;
}

type EditingField = { userId: string; field: 'credits' | 'role' | 'plan' } | null;

const ROLES = ['user', 'admin', 'founder'] as const;
const PLANS = ['free', 'starter', 'pro', 'agency', 'founder'] as const;

const ROLE_COLORS: Record<string, string> = {
  founder: '#ff6a00',
  admin: '#a78bfa',
  user: '#71717a',
};

const PLAN_COLORS: Record<string, string> = {
  founder: '#ff6a00',
  agency: '#22c55e',
  pro: '#3b82f6',
  starter: '#71717a',
  free: '#27272a',
};

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [editing, setEditing] = useState<EditingField>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const statsRes = await fetch('/api/admin/stats');
      if (statsRes.status === 403) {
        setDenied(true);
        setTimeout(() => router.push('/dashboard'), 2000);
        return;
      }
      const statsData = await statsRes.json();
      setStats(statsData);

      const usersRes = await fetch('/api/admin/users');
      const usersData = await usersRes.json();
      setUsers(usersData.users || []);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveField = async (userId: string, field: string, value: string | number) => {
    setSaving(true);
    try {
      const body: Record<string, string | number> = {};
      if (field === 'credits') body.scanCredits = Number(value);
      if (field === 'role') body.role = value;
      if (field === 'plan') body.plan = value;

      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => {
            if (u.userId !== userId) return u;
            if (field === 'credits') return { ...u, scanCredits: Number(value) };
            if (field === 'role') return { ...u, role: value as string };
            if (field === 'plan') return { ...u, plan: value as string };
            return u;
          })
        );
      }
    } catch {
      // fail silently
    } finally {
      setSaving(false);
      setEditing(null);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (denied) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border)',
            padding: '48px 56px',
            textAlign: 'center',
          }}
        >
          <p style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', letterSpacing: 2, textTransform: 'uppercase', color: 'var(--orange)', marginBottom: 8 }}>
            Access denied
          </p>
          <p style={{ fontFamily: 'var(--body)', fontSize: '0.84rem', color: 'var(--text-dim)', margin: 0 }}>
            Redirecting to dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-dim)' }}>
          Loading...
        </p>
      </div>
    );
  }

  const statCards = [
    { label: 'TOTAL USERS', value: stats?.totalUsers ?? 0 },
    { label: 'TOTAL SCANS', value: stats?.totalScans ?? 0 },
    {
      label: 'ESTIMATED REVENUE',
      value: `$${(stats?.estimatedRevenue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    },
    { label: 'ACTIVE USERS', value: stats?.activeUsers ?? 0, sub: 'last 7 days' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px 80px' }}>

        {/* Hero header */}
        <div style={{ padding: '60px 0 20px', position: 'relative', overflow: 'hidden' }}>
          <p style={{
            fontFamily: 'var(--mono)',
            fontSize: '0.58rem',
            letterSpacing: 2.5,
            textTransform: 'uppercase',
            color: 'var(--text-dim)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
          }}>
            <span className="blink-dot" />
            {'// admin console'}
          </p>

          <h1 style={{
            fontFamily: 'var(--display)',
            fontSize: '5.5rem',
            letterSpacing: 3,
            lineHeight: 0.9,
            margin: 0,
            color: 'var(--text)',
          }}>
            SYSTEM
            <span style={{
              display: 'block',
              fontSize: '6.5rem',
              color: 'var(--orange)',
              textShadow: '0 0 40px rgba(255,106,0,0.2), 0 0 80px rgba(255,106,0,0.1)',
            }}>
              OVERVIEW
            </span>
          </h1>

          {/* Decorative line */}
          <div style={{
            position: 'absolute',
            top: '50%',
            right: 0,
            width: '40%',
            height: 1,
            background: 'linear-gradient(90deg, transparent, var(--orange), transparent)',
            animation: 'pulse 4s ease-in-out infinite',
            opacity: 0.3,
          }} />
        </div>

        {/* Stats row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 0,
          marginBottom: 52,
          border: '1px solid var(--border)',
          position: 'relative',
        }}>
          {/* Gradient border overlay */}
          <div style={{
            position: 'absolute',
            inset: -1,
            border: '1px solid transparent',
            background: 'linear-gradient(135deg, rgba(255,106,0,0.2), transparent 30%, transparent 70%, rgba(255,106,0,0.1)) border-box',
            WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            pointerEvents: 'none',
          }} />

          {statCards.map((card, i) => (
            <div
              key={card.label}
              style={{
                padding: '28px 32px',
                borderRight: i < statCards.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div style={{
                fontFamily: 'var(--mono)',
                fontSize: '0.58rem',
                letterSpacing: 2.5,
                textTransform: 'uppercase',
                color: 'var(--text-dim)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 16,
              }}>
                <span className="blink-dot" />
                {'// '}{card.label}
              </div>
              <div style={{
                fontFamily: 'var(--display)',
                fontSize: '2.8rem',
                letterSpacing: 2,
                color: 'var(--text)',
                lineHeight: 1,
              }}>
                {card.value}
              </div>
              {card.sub && (
                <p style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '0.62rem',
                  color: 'var(--text-dim)',
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  marginTop: 8,
                  marginBottom: 0,
                }}>
                  {card.sub}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Users section */}
        <div>
          {/* Section header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 0',
            borderBottom: '2px solid var(--orange)',
            marginBottom: 24,
          }}>
            <div style={{
              fontFamily: 'var(--mono)',
              fontSize: '0.58rem',
              letterSpacing: 2.5,
              textTransform: 'uppercase',
              color: 'var(--text-dim)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span className="blink-dot" style={{ background: 'var(--green)', boxShadow: '0 0 4px rgba(34,197,94,0.5)' }} />
              {'// Users'}
            </div>
            <span style={{
              fontFamily: 'var(--mono)',
              fontSize: '0.62rem',
              color: 'var(--text-dim)',
              letterSpacing: 1,
            }}>
              {filteredUsers.length} result{filteredUsers.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Search */}
          <div style={{ marginBottom: 24 }}>
            <input
              type="text"
              placeholder="Search by email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                maxWidth: 420,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border)',
                padding: '14px 18px',
                fontFamily: 'var(--mono)',
                fontSize: '0.78rem',
                color: 'var(--text)',
                letterSpacing: 0.5,
                outline: 'none',
              }}
            />
          </div>

          {/* Table */}
          <div
            style={{
              border: '1px solid var(--border)',
              overflow: 'hidden',
            }}
          >
            {/* Table header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 0.8fr 0.8fr 0.7fr 0.7fr 1fr',
                gap: 16,
                padding: '14px 24px',
                borderBottom: '2px solid var(--orange)',
              }}
            >
              {['Email', 'Role', 'Plan', 'Credits', 'Scans', 'Joined'].map((h) => (
                <span key={h} style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '0.58rem',
                  letterSpacing: 2.5,
                  textTransform: 'uppercase',
                  color: 'var(--text-dim)',
                }}>
                  {h}
                </span>
              ))}
            </div>

            {/* Table rows */}
            {filteredUsers.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                <p style={{ fontFamily: 'var(--body)', fontSize: '0.84rem', color: 'var(--text-mid)', marginBottom: 8 }}>
                  No users found.
                </p>
                <p style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', color: 'var(--text-dim)', margin: 0 }}>
                  Try a different search query.
                </p>
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.userId}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 0.8fr 0.8fr 0.7fr 0.7fr 1fr',
                    gap: 16,
                    padding: '14px 24px',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--border)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {/* Email */}
                  <span style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '0.78rem',
                    color: 'var(--text-mid)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {user.email}
                  </span>

                  {/* Role badge */}
                  <span>
                    {editing?.userId === user.userId && editing.field === 'role' ? (
                      <select
                        autoFocus
                        value={editValue}
                        onChange={(e) => {
                          saveField(user.userId, 'role', e.target.value);
                        }}
                        onBlur={() => setEditing(null)}
                        disabled={saving}
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: '0.68rem',
                          letterSpacing: 1,
                          textTransform: 'uppercase',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid var(--border)',
                          color: 'var(--text)',
                          padding: '4px 8px',
                          outline: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <button
                        onClick={() => {
                          setEditing({ userId: user.userId, field: 'role' });
                          setEditValue(user.role);
                        }}
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: '0.6rem',
                          fontWeight: 700,
                          letterSpacing: 2,
                          textTransform: 'uppercase',
                          padding: '4px 12px',
                          cursor: 'pointer',
                          border: `1px solid ${ROLE_COLORS[user.role] || '#71717a'}40`,
                          background: `${ROLE_COLORS[user.role] || '#71717a'}10`,
                          color: ROLE_COLORS[user.role] || '#71717a',
                          transition: 'opacity 0.15s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                      >
                        {user.role}
                      </button>
                    )}
                  </span>

                  {/* Plan badge */}
                  <span>
                    {editing?.userId === user.userId && editing.field === 'plan' ? (
                      <select
                        autoFocus
                        value={editValue}
                        onChange={(e) => {
                          saveField(user.userId, 'plan', e.target.value);
                        }}
                        onBlur={() => setEditing(null)}
                        disabled={saving}
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: '0.68rem',
                          letterSpacing: 1,
                          textTransform: 'uppercase',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid var(--border)',
                          color: 'var(--text)',
                          padding: '4px 8px',
                          outline: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {PLANS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <button
                        onClick={() => {
                          setEditing({ userId: user.userId, field: 'plan' });
                          setEditValue(user.plan);
                        }}
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: '0.6rem',
                          fontWeight: 700,
                          letterSpacing: 2,
                          textTransform: 'uppercase',
                          padding: '4px 12px',
                          cursor: 'pointer',
                          border: `1px solid ${PLAN_COLORS[user.plan] || '#27272a'}40`,
                          background: `${PLAN_COLORS[user.plan] || '#27272a'}10`,
                          color: PLAN_COLORS[user.plan] || '#27272a',
                          transition: 'opacity 0.15s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                      >
                        {user.plan}
                      </button>
                    )}
                  </span>

                  {/* Credits */}
                  <span>
                    {editing?.userId === user.userId && editing.field === 'credits' ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          autoFocus
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveField(user.userId, 'credits', editValue);
                            if (e.key === 'Escape') setEditing(null);
                          }}
                          disabled={saving}
                          style={{
                            width: 64,
                            fontFamily: 'var(--mono)',
                            fontSize: '0.78rem',
                            color: 'var(--text)',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--border)',
                            padding: '4px 8px',
                            outline: 'none',
                          }}
                        />
                        <button
                          onClick={() => saveField(user.userId, 'credits', editValue)}
                          disabled={saving}
                          style={{
                            fontFamily: 'var(--mono)',
                            fontSize: '0.58rem',
                            fontWeight: 700,
                            letterSpacing: 1,
                            color: 'var(--orange)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          Save
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          setEditing({ userId: user.userId, field: 'credits' });
                          setEditValue(String(user.scanCredits));
                        }}
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: '0.78rem',
                          color: 'var(--text)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          transition: 'color 0.15s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--orange)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text)'; }}
                      >
                        {user.scanCredits}
                      </button>
                    )}
                  </span>

                  {/* Scans */}
                  <span style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '0.78rem',
                    color: 'var(--text-dim)',
                  }}>
                    {user.scanCount}
                  </span>

                  {/* Joined */}
                  <span style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '0.68rem',
                    color: 'var(--text-dim)',
                    letterSpacing: 0.5,
                  }}>
                    {new Date(user.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Status bar */}
        <div className="status-bar-brutalist">
          <div className="status-live">System operational</div>
          <div>Luminetic v2.0 // Admin Console</div>
          <div>&copy; 2026 SLTR Digital LLC</div>
        </div>
      </div>
    </div>
  );
}
