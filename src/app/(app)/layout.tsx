import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { getUser } from '@/lib/db';
import { isFounderOrAdmin } from '@/lib/admin';
import AppNav from '@/components/AppNav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  let role = 'user';

  // Gate: no credits → force pricing page (founders/admins bypass)
  try {
    const dbUser = await getUser(user.userId);
    role = dbUser?.role ?? 'user';
    const credits = dbUser?.scanCredits ?? 0;
    if (!isFounderOrAdmin(role) && credits <= 0) {
      redirect('/pricing');
    }
  } catch {
    // If DB check fails, let them through
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--black)' }}>
      <AppNav email={user.email} plan={user.plan} role={role} />
      <main className="pt-[72px]">
        {children}
      </main>
    </div>
  );
}
