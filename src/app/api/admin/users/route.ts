import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin';
import { listUsers } from '@/lib/db';

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
  return NextResponse.json({ users });
}
