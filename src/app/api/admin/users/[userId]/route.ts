import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin';
import { updateUserRole, updateUserCredits, updateUserPlan } from '@/lib/db';

const patchSchema = z.object({
  role: z.enum(['user', 'admin', 'founder']).optional(),
  plan: z.string().optional(),
  scanCredits: z.number().int().min(0).optional(),
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
