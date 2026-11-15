import { BottomNav, MobileTopBar, Sidebar } from '@/components/navigation';
import { databaseLabel } from '@/lib/db';
import { getSettings } from '@/lib/repo';
import { authEnabled } from '@/lib/auth';
import { todayISO } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  const today = todayISO();

  return (
    <div className="lg:flex">
      <Sidebar
        farmName={settings.farmName}
        tagline={settings.tagline}
        storageLabel={databaseLabel()}
        showLogout={authEnabled()}
      />
      <div className="min-w-0 flex-1">
        <MobileTopBar farmName={settings.farmName} today={today} />
        <main className="mx-auto w-full max-w-6xl px-4 pb-32 pt-4 sm:px-6 lg:px-8 lg:pb-16 lg:pt-8">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
