import { BottomNav } from '@/components/ui/BottomNav';
import { ThemePicker } from '@/components/settings/ThemePicker';
import { DataActions } from '@/components/settings/DataActions';
import { getCurrentWeek } from '@/lib/week';
import pkg from '../../../package.json';

export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  const week = getCurrentWeek();

  return (
    <main className="flex flex-col min-h-screen bg-bg safe-top pb-24">
      <div className="flex-1 flex flex-col px-4 pt-12 gap-8">
        <h1 className="text-3xl font-bold text-text">Ajustes</h1>

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
