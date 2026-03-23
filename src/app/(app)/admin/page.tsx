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
      <div className="px-6 md:px-12 lg:px-20 pt-28 pb-20 flex items-center justify-center min-h-screen">
        <div
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(20px)',
          }}
          className="rounded-2xl p-12 text-center"
        >
          <p className="text-[var(--orange)] text-lg font-semibold mb-2">Access denied</p>
          <p className="text-[var(--gray)] text-sm">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="px-6 md:px-12 lg:px-20 pt-28 pb-20 flex items-center justify-center min-h-screen">
        <div className="text-[var(--gray)] text-sm">Loading...</div>
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
    <div className="px-6 md:px-12 lg:px-20 pt-28 pb-20 min-h-screen" style={{ background: 'var(--black)' }}>
      {/* Header */}
      <div className="mb-10">
        <p className="text-[11px] tracking-[3px] uppercase text-[var(--orange)] mb-2">Admin Console</p>
        <h1 className="text-2xl font-semibold text-white">System Overview</h1>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {statCards.map((card) => (
          <div
            key={card.label}
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              backdropFilter: 'blur(20px)',
            }}
            className="rounded-2xl p-6"
          >
            <p className="text-[11px] tracking-[3px] uppercase text-[var(--gray)] mb-3">
              {card.label}
            </p>
            <p className="text-3xl font-semibold text-white">{card.value}</p>
            {card.sub && (
              <p className="text-[11px] text-[var(--gray)] mt-1">{card.sub}</p>
            )}
          </div>
        ))}
      </div>

      {/* Users section */}
      <div>
        <p className="text-[11px] tracking-[3px] uppercase text-[var(--orange)] mb-4">Users</p>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md px-4 py-2.5 rounded-xl text-sm text-white placeholder-[var(--gray)] outline-none focus:ring-1 focus:ring-[var(--orange)]"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          />
        </div>

        {/* Table */}
        <div
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(20px)',
          }}
          className="rounded-2xl overflow-hidden"
        >
          {/* Table header */}
          <div
            className="grid gap-4 px-6 py-3 text-[11px] tracking-[3px] uppercase text-[var(--gray)]"
            style={{
              gridTemplateColumns: '2fr 0.8fr 0.8fr 0.7fr 0.7fr 1fr',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <span>Email</span>
            <span>Role</span>
            <span>Plan</span>
            <span>Credits</span>
            <span>Scans</span>
            <span>Joined</span>
          </div>

          {/* Table rows */}
          {filteredUsers.length === 0 ? (
            <div className="px-6 py-8 text-center text-[var(--gray)] text-sm">
              No users found.
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div
                key={user.userId}
                className="grid gap-4 px-6 py-3.5 items-center text-sm hover:bg-white/[0.02] transition-colors"
                style={{
                  gridTemplateColumns: '2fr 0.8fr 0.8fr 0.7fr 0.7fr 1fr',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                }}
              >
                {/* Email */}
                <span className="text-white truncate">{user.email}</span>

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
                      className="text-xs rounded-lg px-2 py-1 text-white outline-none cursor-pointer"
                      style={{ background: '#1a1a1f', border: '1px solid rgba(255,255,255,0.1)' }}
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
                      className="text-[11px] font-medium uppercase tracking-wider px-2.5 py-1 rounded-full cursor-pointer transition-opacity hover:opacity-80"
                      style={{
                        background: `${ROLE_COLORS[user.role] || '#71717a'}20`,
                        color: ROLE_COLORS[user.role] || '#71717a',
                      }}
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
                      className="text-xs rounded-lg px-2 py-1 text-white outline-none cursor-pointer"
                      style={{ background: '#1a1a1f', border: '1px solid rgba(255,255,255,0.1)' }}
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
                      className="text-[11px] font-medium uppercase tracking-wider px-2.5 py-1 rounded-full cursor-pointer transition-opacity hover:opacity-80"
                      style={{
                        background: `${PLAN_COLORS[user.plan] || '#27272a'}20`,
                        color: PLAN_COLORS[user.plan] || '#27272a',
                      }}
                    >
                      {user.plan}
                    </button>
                  )}
                </span>

                {/* Credits */}
                <span>
                  {editing?.userId === user.userId && editing.field === 'credits' ? (
                    <span className="flex items-center gap-1">
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
                        className="w-16 text-sm text-white px-2 py-1 rounded-lg outline-none"
                        style={{ background: '#1a1a1f', border: '1px solid rgba(255,255,255,0.1)' }}
                      />
                      <button
                        onClick={() => saveField(user.userId, 'credits', editValue)}
                        disabled={saving}
                        className="text-[10px] text-[var(--orange)] font-medium hover:opacity-80"
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
                      className="text-white cursor-pointer hover:text-[var(--orange)] transition-colors"
                    >
                      {user.scanCredits}
                    </button>
                  )}
                </span>

                {/* Scans */}
                <span className="text-[var(--gray)]">{user.scanCount}</span>

                {/* Joined */}
                <span className="text-[var(--gray)] text-xs">
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
    </div>
  );
}
