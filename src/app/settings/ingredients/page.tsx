import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import {
  findDuplicateIngredientGroups,
  listIngredientsWithUsage,
} from '@/models/ingredient';
import { BottomNav } from '@/components/ui/BottomNav';
import { getCurrentWeek } from '@/lib/week';
import { IngredientCatalog } from '@/components/settings/IngredientCatalog';

export const dynamic = 'force-dynamic';

export default async function IngredientsSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?callbackUrl=/settings/ingredients');
  if (user.householdId == null) redirect('/welcome');
  // Catalog edits are global — gate on owner role.
  if (user.role !== 'owner') redirect('/settings');

  const groups = findDuplicateIngredientGroups();
  const all = listIngredientsWithUsage();
  const week = getCurrentWeek();

  return (
    <main className="flex flex-col min-h-screen bg-bg safe-top pb-24">
      <div className="flex-1 flex flex-col px-4 pt-12 gap-6">
        <div className="flex items-center gap-2 -mx-2">
          <Link
            href="/settings"
            className="inline-flex items-center justify-center w-10 h-10 rounded-full text-text-muted hover:text-text transition-colors"
            aria-label="Volver a ajustes"
          >
            <ChevronLeft size={22} />
          </Link>
          <h1 className="text-3xl font-bold text-text">Ingredientes</h1>
        </div>

        <p className="text-sm text-text-muted leading-relaxed px-1">
          Fusiona filas duplicadas del catálogo para que la lista de la compra
          deje de mostrar el mismo alimento varias veces. Las recetas que
          apuntaban a la fila eliminada pasarán a apuntar a la canónica.
        </p>

        <IngredientCatalog groups={groups} all={all} />
      </div>

      <BottomNav currentWeek={week} />
    </main>
  );
}
