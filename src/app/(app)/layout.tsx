import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { getUser } from '@/lib/db';
import AppNav from '@/components/AppNav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  // Gate: no credits → force pricing page
  try {
    const dbUser = await getUser(user.userId);
    const credits = dbUser?.scan_credits ?? 0;
    if (credits <= 0) redirect('/pricing');
  } catch {
    // If DB check fails, let them through
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--black)' }}>
      <AppNav email={user.email} plan={user.plan} />
      <main className="pt-[72px]">
        {children}
      </main>
    </div>
  );
}
