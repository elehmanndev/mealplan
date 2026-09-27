import { Calendar, BookOpen, ShoppingCart, Sparkles, Settings } from 'lucide-react';
import { ListRow, ListSection } from '@/components/ui/List';
import { Wordmark } from '@/components/ui/Wordmark';
import { getCurrentWeek } from '@/lib/week';
import { requireHouseholdIdOrRedirect } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  await requireHouseholdIdOrRedirect();
  const week = getCurrentWeek();

  return (
    <main className="flex flex-col min-h-dvh safe-top safe-bottom">
      <div className="flex-1 flex flex-col px-4 pt-16 pb-8 gap-7">
        <div className="flex flex-col gap-2 min-w-0 px-1 pb-5">
          <h1>
            <Wordmark className="h-10 w-auto" />
          </h1>
          <p className="text-subhead whitespace-nowrap">
            <span className="text-text-muted">The premise is simple — </span>
            <span className="text-text font-medium">plan once. Eat all week.</span>
          </p>
        </div>

        <ListSection>
          <ListRow icon={Calendar} iconBg="#FF3B30" title="Plan semanal" subtitle="Tus comidas en un vistazo" href={`/?week=${week}`} />
          <ListRow icon={BookOpen} iconBg="#FF9500" title="Recetas" subtitle="El recetario de la abuela 2.0" href="/recipes" />
          <ListRow icon={ShoppingCart} iconBg="#34C759" title="Lista de la compra" subtitle="Lo que le falta a tu despensa" href={`/shopping?week=${week}`} />
          <ListRow icon={Sparkles} iconBg="#AF52DE" title="Chat" subtitle="Crea recetas con IA" href="/chat" />
        </ListSection>
        <ListSection>
          <ListRow icon={Settings} iconBg="#8E8E93" title="Ajustes" subtitle="Preferencias y datos" href="/settings" />
        </ListSection>
      </div>
    </main>
  );
}
