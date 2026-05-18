import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { listMembersForCurrentHousehold } from '@/actions/household';
import { InviteButton } from '@/components/settings/InviteButton';
import { HouseholdNameEditor } from '@/components/settings/HouseholdNameEditor';
import { RemoveMemberButton } from '@/components/settings/RemoveMemberButton';
import { BottomNav } from '@/components/ui/BottomNav';
import { getCurrentWeek } from '@/lib/week';

export const dynamic = 'force-dynamic';

type HouseholdRow = { name: string };

export default async function HouseholdSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?callbackUrl=/settings/household');
  if (user.householdId == null) redirect('/welcome');

  const household = db
    .prepare('SELECT name FROM households WHERE id = ?')
    .get(user.householdId) as HouseholdRow | undefined;

  const members = await listMembersForCurrentHousehold();
  const isOwner = user.role === 'owner';
  const week = getCurrentWeek();

  return (
    <main className="flex flex-col min-h-screen bg-bg safe-top pb-24">
      <div className="flex-1 flex flex-col px-4 pt-12 gap-8">
        <div className="flex items-center gap-2 -mx-2">
          <Link
            href="/settings"
            className="inline-flex items-center justify-center w-10 h-10 rounded-full text-text-muted hover:text-text transition-colors"
            aria-label="Volver a ajustes"
          >
            <ChevronLeft size={22} />
          </Link>
          <h1 className="text-3xl font-bold text-text">Mi casa</h1>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted px-1">
            Nombre
          </h2>
          <HouseholdNameEditor initialName={household?.name ?? ''} canEdit={isOwner} />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted px-1">
            Miembros ({members.length})
          </h2>
          <ul className="bg-surface rounded-2xl divide-y divide-[color:var(--glass-border)] overflow-hidden">
            {members.map((m) => {
              const isSelf = m.userId === user.id;
              const canKick = isOwner && !isSelf && m.role !== 'owner';
              const label = m.name?.trim() || m.email;
              return (
                <li key={m.userId} className="flex items-center gap-3 px-4 py-3">
                  <Avatar name={label} image={m.image} />
                  <div className="flex-1 min-w-0">
                    <div className="text-text font-medium truncate">{label}</div>
                    <div className="text-xs text-text-muted truncate">{m.email}</div>
                  </div>
                  {m.role === 'owner' && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-accent bg-accent/15 rounded-full px-2 py-0.5">
                      Propietario
                    </span>
                  )}
                  {canKick && <RemoveMemberButton userId={m.userId} memberLabel={label} />}
                </li>
              );
            })}
          </ul>
        </section>

        {isOwner && (
          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted px-1">
              Invitar
            </h2>
            <InviteButton />
          </section>
        )}

        {!isOwner && (
          <p className="text-xs text-text-muted px-1 leading-relaxed">
            Solo el propietario de la casa puede invitar a nuevos miembros.
          </p>
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
        className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-[color:var(--glass-border)]"
      />
    );
  }
  const initial = (name.trim()[0] ?? '?').toUpperCase();
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0"
      style={{ background: 'linear-gradient(135deg, #6366F1 0%, #7C3AED 55%, #A855F7 100%)' }}
    >
      {initial}
    </div>
  );
}
