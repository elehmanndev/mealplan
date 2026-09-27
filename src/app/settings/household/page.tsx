import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { listMembersForCurrentHousehold } from '@/actions/household';
import { InviteButton } from '@/components/settings/InviteButton';
import { HouseholdNameEditor } from '@/components/settings/HouseholdNameEditor';
import { RemoveMemberButton } from '@/components/settings/RemoveMemberButton';
import { BottomNav } from '@/components/ui/BottomNav';
import { NavBar } from '@/components/ui/NavBar';
import { ListRow, ListSection } from '@/components/ui/List';
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
    <main className="flex flex-col min-h-dvh pb-28">
      <NavBar title="Mi casa" large back={{ href: '/settings', label: 'Ajustes' }} />
      <div className="flex-1 flex flex-col px-4 pt-2 gap-7">
        <section>
          <h2 className="px-4 pb-[7px] text-footnote text-text-muted">Nombre</h2>
          <HouseholdNameEditor initialName={household?.name ?? ''} canEdit={isOwner} />
        </section>

        <ListSection
          header={`Miembros (${members.length})`}
          footer={isOwner ? undefined : 'Solo el propietario de la casa puede invitar a nuevos miembros.'}
        >
          {members.map((m) => {
            const isSelf = m.userId === user.id;
            const canKick = isOwner && !isSelf && m.role !== 'owner';
            const label = m.name?.trim() || m.email;
            return (
              <ListRow
                key={m.userId}
                leading={<Avatar name={label} image={m.image} />}
                title={label}
                subtitle={m.email}
                accessory={
                  m.role === 'owner' ? (
                    <span className="text-subhead text-text-muted">Propietario</span>
                  ) : canKick ? (
                    <RemoveMemberButton userId={m.userId} memberLabel={label} />
                  ) : undefined
                }
              />
            );
          })}
        </ListSection>

        {isOwner && (
          <section>
            <h2 className="px-4 pb-[7px] text-footnote text-text-muted">Invitar</h2>
            <InviteButton />
          </section>
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
        className="w-9 h-9 rounded-full object-cover shrink-0"
      />
    );
  }
  const initial = (name.trim()[0] ?? '?').toUpperCase();
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0"
      style={{ background: 'linear-gradient(180deg, #A5A5AA 0%, #85858B 100%)' }}
    >
      {initial}
    </div>
  );
}
