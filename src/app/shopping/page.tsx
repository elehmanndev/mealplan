import { generateShoppingList } from '@/lib/shopping';
import { getCurrentWeek } from '@/lib/week';
import { BottomNav } from '@/components/ui/BottomNav';
import { ShoppingHeader } from '@/components/shopping/ShoppingHeader';
import { ShoppingList } from '@/components/shopping/ShoppingList';
import { AddExtraButton } from '@/components/shopping/AddExtraButton';

export const dynamic = 'force-dynamic';

interface ShoppingPageProps {
  searchParams: Promise<{ week?: string }>;
}

export default async function ShoppingPage({ searchParams }: ShoppingPageProps) {
  const params = await searchParams;
  const week = params.week && /^\d{4}-\d{2}-\d{2}$/.test(params.week) ? params.week : getCurrentWeek();
  const groups = generateShoppingList(week);

  return (
    <main className="min-h-dvh pb-24">
      <ShoppingHeader week={week} />

      <div className="px-4 pt-4">
        {groups.length === 0 ? (
          <div className="text-center text-text-muted py-16 px-6">
            No hay nada en la lista esta semana. Añade comidas al plan o un item con +.
          </div>
        ) : (
          <ShoppingList groups={groups} week={week} />
        )}
      </div>

      <AddExtraButton week={week} />
      <BottomNav currentWeek={week} />
    </main>
  );
}
