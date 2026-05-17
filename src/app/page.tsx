import { listWeekPlan } from '@/models/plan';
import { getCurrentWeek } from '@/lib/week';
import { BottomNav } from '@/components/ui/BottomNav';
import { WeekView } from '@/components/plan/WeekView';
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

  return (
    <main className="flex flex-col min-h-dvh pb-24">
      <WeekView week={week} entries={entries} />
      <BottomNav currentWeek={week} />
    </main>
  );
}
