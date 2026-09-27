import { generateShoppingList } from '@/lib/shopping';
import { getCurrentWeek } from '@/lib/week';
import { BottomNav } from '@/components/ui/BottomNav';
import { ShoppingHeader } from '@/components/shopping/ShoppingHeader';
import { ShoppingList } from '@/components/shopping/ShoppingList';
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
    <main className="min-h-dvh pb-28">
      <ShoppingHeader week={week} />

      <div className="px-4 pt-3">
        <ShoppingList groups={groups} week={week} />
      </div>

      <BottomNav currentWeek={week} />
    </main>
  );
}
