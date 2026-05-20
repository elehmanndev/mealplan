import { ShoppingCart } from 'lucide-react';
import { generateShoppingList } from '@/lib/shopping';
import { getCurrentWeek } from '@/lib/week';
import { BottomNav } from '@/components/ui/BottomNav';
import { ShoppingHeader } from '@/components/shopping/ShoppingHeader';
import { ShoppingList } from '@/components/shopping/ShoppingList';
import { AddExtraButton } from '@/components/shopping/AddExtraButton';
import { requireHouseholdIdOrRedirect } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface ShoppingPageProps {
  searchParams: Promise<{ week?: string }>;
}

export default async function ShoppingPage({ searchParams }: ShoppingPageProps) {
  const householdId = await requireHouseholdIdOrRedirect();
  const params = await searchParams;
  const week = params.week && /^\d{4}-\d{2}-\d{2}$/.test(params.week) ? params.week : getCurrentWeek();
  const groups = generateShoppingList(householdId, week);

  return (
    <main className="min-h-dvh pb-24">
      <h1 className="sr-only">Lista de la compra</h1>
      <ShoppingHeader week={week} />

      <div className="px-4 pt-4">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20 px-6">
            <div
              className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center mb-4 text-text-muted/50"
              aria-hidden="true"
            >
              <ShoppingCart size={28} strokeWidth={1.75} />
            </div>
            <p className="text-text font-medium text-sm">Lista vacía</p>
            <p className="text-text-muted text-xs mt-1 max-w-[260px] leading-relaxed">
              Añade comidas al plan o un item suelto con el botón <span className="text-accent">+</span>.
            </p>
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
