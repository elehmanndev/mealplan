import { Sparkles, PenLine } from 'lucide-react';
import { ListRow, ListSection } from '@/components/ui/List';

/**
 * Shown at the top of `/` when the user's household has zero recipes. Two
 * CTAs: chat assistant (fastest) or manual recipe creation (full control).
 * Self-dismisses naturally — once the household has any recipe, this stops
 * rendering (the parent gates on `recipeCount === 0`).
 */
export function EmptyHouseholdState() {
  return (
    <div className="px-4 pt-2 pb-2">
      <ListSection
        header="¡Empieza a planificar!"
        footer="Tu casa no tiene recetas todavía. Pídele una a la IA en un par de segundos, o créala a mano."
      >
        <ListRow icon={Sparkles} iconBg="#AF52DE" title="Pídeselo al chat" href="/chat" />
        <ListRow icon={PenLine} iconBg="rgb(var(--warning))" title="Crear receta a mano" href="/recipes/new" />
      </ListSection>
    </div>
  );
}
