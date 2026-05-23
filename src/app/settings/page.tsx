import Link from 'next/link';
import { Home as HomeIcon, ChevronRight, LogOut } from 'lucide-react';
import { BottomNav } from '@/components/ui/BottomNav';
import { ThemePicker } from '@/components/settings/ThemePicker';
import { DataActions } from '@/components/settings/DataActions';
import { ChatUsageBar } from '@/components/chat/ChatUsageBar';
import { getCurrentWeek } from '@/lib/week';
import { getCurrentUser } from '@/lib/auth';
import { getCurrentUsage } from '@/lib/chat-rate-limit';
import { signOut } from '@/auth';
import pkg from '../../../package.json';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const week = getCurrentWeek();
  const user = await getCurrentUser();
  const usage = user ? getCurrentUsage(user.id) : null;

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
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-surface">
              <Avatar name={user.name ?? user.email} image={user.image} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-text truncate">
                  {user.name?.trim() || user.email}
                </div>
                <div className="text-xs text-text-muted truncate">{user.email}</div>
              </div>
            </div>
            <Link
              href="/settings/household"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-surface min-h-touch text-left active:scale-[0.99] transition-transform"
            >
              <HomeIcon size={20} className="text-text-muted shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-text">Mi casa</div>
                <div className="text-xs text-text-muted truncate">Miembros e invitaciones</div>
              </div>
              <ChevronRight size={18} className="text-text-muted shrink-0" />
            </Link>
            {usage && (
              <div className="px-4 py-3 rounded-2xl bg-surface">
                <ChatUsageBar initialUsed={usage.used} initialCap={usage.cap} />
              </div>
            )}
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
          <Link
            href="/?tour=1"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-surface min-h-touch text-left active:scale-[0.99] transition-transform"
          >
            <span className="text-xl shrink-0" aria-hidden>👋</span>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-text">Ver tutorial</div>
              <div className="text-xs text-text-muted truncate">Repasa cómo funciona en 4 pasos</div>
            </div>
          </Link>
          <div className="bg-surface rounded-2xl px-4 py-3 flex items-center justify-between">
            <span className="text-text-muted">Versión</span>
            <span className="font-mono text-sm text-text">{pkg.version}</span>
          </div>
          <div className="flex items-center px-1 pt-1 text-xs text-text-muted">
            <Link
              href="/privacy"
              className="inline-flex items-center min-h-[44px] px-2 hover:text-text transition-colors"
            >
              Privacidad
            </Link>
            <span aria-hidden className="opacity-40 px-1">·</span>
            <Link
              href="/terms"
              className="inline-flex items-center min-h-[44px] px-2 hover:text-text transition-colors"
            >
              Términos
            </Link>
          </div>
        </section>
      </div>

      <BottomNav currentWeek={week} />
    </main>
  );
}

function Avatar({ name, image }: { name: string; image: string | null }) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={image}
        alt=""
        className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-[color:var(--glass-border)]"
      />
    );
  }
  const initial = (name.trim()[0] ?? '?').toUpperCase();
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0"
      style={{ background: 'linear-gradient(135deg, #6366F1 0%, #7C3AED 55%, #A855F7 100%)' }}
    >
      {initial}
    </div>
  );
}
