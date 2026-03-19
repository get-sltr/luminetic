import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin';
import { listUsers } from '@/lib/db';

const PLAN_PRICES: Record<string, number> = {
  starter: 15,
  pro: 40,
  agency: 119,
};

export async function GET() {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isAdmin = await requireAdmin(auth.userId);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const users = await listUsers();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const totalUsers = users.length;
  const totalScans = users.reduce((sum, u) => sum + (Number(u.scanCount) || 0), 0);
  const estimatedRevenue = users.reduce(
    (sum, u) => sum + (PLAN_PRICES[String(u.plan ?? '').toLowerCase()] ?? 0),
    0,
  );
  const activeUsers = users.filter(
    (u) => u.updatedAt && new Date(String(u.updatedAt)) >= sevenDaysAgo,
  ).length;

  return NextResponse.json({
    totalUsers,
    totalScans,
    estimatedRevenue,
    activeUsers,
  });
}
