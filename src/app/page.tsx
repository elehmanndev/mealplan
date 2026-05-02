import { listWeekPlan } from '@/models/plan';
import { getCurrentWeek } from '@/lib/week';
import { BottomNav } from '@/components/ui/BottomNav';
import { WeekView } from '@/components/plan/WeekView';

interface HomePageProps {
  searchParams: Promise<{ week?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const week = params.week && /^\d{4}-W\d{2}$/.test(params.week) ? params.week : getCurrentWeek();
  const entries = listWeekPlan(week);

  return (
    <main className="flex flex-col h-dvh pb-20">
      <WeekView week={week} entries={entries} />
      <BottomNav currentWeek={week} />
    </main>
  );
}
