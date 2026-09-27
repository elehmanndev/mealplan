import { FileText, Home as HomeIcon, Info, Shield } from 'lucide-react';
import { BottomNav } from '@/components/ui/BottomNav';
import { NavBar } from '@/components/ui/NavBar';
import { ListRow, ListSection } from '@/components/ui/List';
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
    <main className="flex flex-col min-h-dvh pb-28">
      <NavBar title="Ajustes" large />
      <div className="flex-1 flex flex-col px-4 pt-2 gap-7">
        {user && (
          <>
            <ListSection>
              <ListRow
                leading={<Avatar name={user.name ?? user.email} image={user.image} />}
                title={<span className="text-title3">{user.name?.trim() || user.email}</span>}
                subtitle={user.email}
              />
            </ListSection>

            <ListSection>
              <ListRow icon={HomeIcon} iconBg="rgb(var(--warning))" title="Mi casa" subtitle="Miembros e invitaciones" href="/settings/household" />
            </ListSection>

            {usage && (
              <ListSection header="Asistente IA">
                <div className="px-4 py-3">
                  <ChatUsageBar initialUsed={usage.used} initialCap={usage.cap} />
                </div>
              </ListSection>
            )}
          </>
        )}

        <ListSection header="Apariencia">
          <div className="px-4 py-3">
            <ThemePicker />
          </div>
        </ListSection>

        <ListSection header="Datos">
          <DataActions />
        </ListSection>

        <ListSection header="Acerca de">
          <ListRow leading={<Tile bg="#34C759">👋</Tile>} title="Ver tutorial" subtitle="Repasa cómo funciona en 4 pasos" href="/?tour=1" />
          <ListRow leading={<Tile bg="#8E8E93"><Info size={18} strokeWidth={2.25} /></Tile>} title="Versión" value={pkg.version} />
          <ListRow leading={<Tile bg="#007AFF"><Shield size={18} strokeWidth={2.25} /></Tile>} title="Privacidad" href="/privacy" />
          <ListRow leading={<Tile bg="#8E8E93"><FileText size={18} strokeWidth={2.25} /></Tile>} title="Términos" href="/terms" />
        </ListSection>

        {user && (
          <form action={doSignOut}>
            <ListSection>
              <ListRow title={<span className="block text-center text-danger">Cerrar sesión</span>} type="submit" />
            </ListSection>
          </form>
        )}
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
        className="w-[60px] h-[60px] rounded-full object-cover shrink-0 my-2"
      />
    );
  }
  const initial = (name.trim()[0] ?? '?').toUpperCase();
  return (
    <div
      className="w-[60px] h-[60px] my-2 rounded-full flex items-center justify-center text-title2 text-white shrink-0"
      style={{ background: 'linear-gradient(180deg, #A5A5AA 0%, #85858B 100%)' }}
    >
      {initial}
    </div>
  );
}

function Tile({ bg, children }: { bg: string; children: React.ReactNode }) {
  return (
    <span
      className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center text-white text-[17px]"
      style={{ background: bg }}
    >
      {children}
    </span>
  );
}
