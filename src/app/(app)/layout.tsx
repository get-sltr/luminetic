import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import AppNav from '@/components/AppNav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen" style={{ background: '#000' }}>
      <div className="grid-bg" />
      <AppNav email={user.email} plan={user.plan} />
      <main className="pt-[72px]">
        {children}
      </main>
    </div>
  );
}
