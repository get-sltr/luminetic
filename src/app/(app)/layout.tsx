import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { getUser } from '@/lib/db';
import { appShellPricingRedirect } from '@/lib/app-shell-access';
import AppNav from '@/components/AppNav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  let role = 'user';
  let pricingRedirect: ReturnType<typeof appShellPricingRedirect> = null;

  // Credits gate new scans (canUserScan), not the shell. A zero balance must
  // still reach history and an in-progress report before the 24h TTL.
  try {
    const dbUser = await getUser(user.userId);
    role = typeof dbUser?.role === 'string' ? dbUser.role : 'user';
    const credits = typeof dbUser?.scanCredits === 'number' ? dbUser.scanCredits : 0;
    const scanCount = typeof dbUser?.scanCount === 'number' ? dbUser.scanCount : 0;
    pricingRedirect = appShellPricingRedirect({ role, credits, scanCount });
  } catch {
    // Profile lookup failed — still render the shell. Scan APIs fail closed.
  }

  if (pricingRedirect) redirect(pricingRedirect);

  return (
    <div className="min-h-screen" style={{ background: 'transparent' }}>
      <AppNav email={user.email} plan={user.plan} role={role} />
      <main className="pt-[64px] md:pt-[72px] min-h-[calc(100vh-4rem)]">
        {children}
      </main>
    </div>
  );
}
