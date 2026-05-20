import { listWeekPlan } from '@/models/plan';
import { countRecipes } from '@/models/recipe';
import { getCurrentWeek } from '@/lib/week';
import { BottomNav } from '@/components/ui/BottomNav';
import { WeekView } from '@/components/plan/WeekViewDynamic';
import { EmptyHouseholdState } from '@/components/plan/EmptyHouseholdState';
import { requireHouseholdIdOrRedirect } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface HomePageProps {
  searchParams: Promise<{ week?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const householdId = await requireHouseholdIdOrRedirect();
  const params = await searchParams;
  const week = params.week && /^\d{4}-\d{2}-\d{2}$/.test(params.week) ? params.week : getCurrentWeek();
  const entries = listWeekPlan(householdId, week);
  const recipeCount = countRecipes(householdId);

  return (
    <main className="flex flex-col min-h-dvh pb-24">
      <h1 className="sr-only">Plan semanal</h1>
      {recipeCount === 0 && <EmptyHouseholdState />}
      <WeekView week={week} entries={entries} />
      <BottomNav currentWeek={week} />
    </main>
  );
}
