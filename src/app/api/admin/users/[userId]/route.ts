import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin';
import { getUser, updateUserRole, updateUserCredits, updateUserPlan } from '@/lib/db';

const patchSchema = z.object({
  role: z.enum(['user', 'admin', 'founder']).optional(),
  plan: z.string().optional(),
  scanCredits: z.number().int().min(0).max(9999).optional(),
}).refine((data) => data.role !== undefined || data.plan !== undefined || data.scanCredits !== undefined, {
  message: 'At least one field (role, plan, scanCredits) must be provided',
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isAdmin = await requireAdmin(auth.userId);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { userId } = await params;
  const { role, plan, scanCredits } = parsed.data;

  // Prevent admins from modifying their own account via this endpoint
  if (userId === auth.userId) {
    return NextResponse.json({ error: 'Cannot modify your own account' }, { status: 403 });
  }

  // Only founders can grant the founder role
  if (role === 'founder') {
    const callerRecord = await getUser(auth.userId);
    if (callerRecord?.role !== 'founder') {
      return NextResponse.json({ error: 'Only founders can grant founder role' }, { status: 403 });
    }
  }

  if (role !== undefined) {
    await updateUserRole(userId, role);
  }
  if (plan !== undefined) {
    await updateUserPlan(userId, plan);
  }
  if (scanCredits !== undefined) {
    await updateUserCredits(userId, scanCredits);
  }

  return NextResponse.json({ success: true, userId });
}
