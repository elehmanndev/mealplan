import Link from 'next/link';
import { Home as HomeIcon, ChevronRight, LogOut } from 'lucide-react';
import { BottomNav } from '@/components/ui/BottomNav';
import { ThemePicker } from '@/components/settings/ThemePicker';
import { DataActions } from '@/components/settings/DataActions';
import { getCurrentWeek } from '@/lib/week';
import { getCurrentUser } from '@/lib/auth';
import { signOut } from '@/auth';
import pkg from '../../../package.json';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const week = getCurrentWeek();
  const user = await getCurrentUser();

  async function doSignOut() {
    'use server';
    await signOut({ redirectTo: '/login' });
  }

  return (
    <main className="flex flex-col min-h-screen bg-bg safe-top pb-24">
      <div className="flex-1 flex flex-col px-4 pt-12 gap-8">
        <h1 className="text-3xl font-bold text-text">Ajustes</h1>

        {user && (
          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted px-1">
              Cuenta
            </h2>
            <Link
              href="/settings/household"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-surface min-h-touch text-left active:scale-[0.99] transition-transform"
            >
              <HomeIcon size={20} className="text-text-muted shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-text">Mi casa</div>
                <div className="text-xs text-text-muted truncate">
                  {user.email}
                </div>
              </div>
              <ChevronRight size={18} className="text-text-muted shrink-0" />
            </Link>
            <form action={doSignOut}>
              <button
                type="submit"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-surface min-h-touch text-left active:scale-[0.99] transition-transform"
              >
                <LogOut size={20} className="text-text-muted shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-text">Cerrar sesión</div>
                </div>
              </button>
            </form>
          </section>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted px-1">
            Apariencia
          </h2>
          <ThemePicker />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted px-1">
            Datos
          </h2>
          <DataActions />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted px-1">
            Acerca de
          </h2>
          <div className="bg-surface rounded-2xl px-4 py-3 flex items-center justify-between">
            <span className="text-text-muted">Versión</span>
            <span className="font-mono text-sm text-text">{pkg.version}</span>
          </div>
        </section>
      </div>

      <BottomNav currentWeek={week} />
    </main>
  );
}
