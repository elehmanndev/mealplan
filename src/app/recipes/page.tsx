import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { listRecipes } from '@/models/recipe';
import { RECIPE_TAGS } from '@/types';
import { getCurrentWeek } from '@/lib/week';
import { BottomNav } from '@/components/ui/BottomNav';
import { RecipeCard } from '@/components/recipes/RecipeCard';
import { requireHouseholdIdOrRedirect } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface RecipesPageProps {
  searchParams: Promise<{ q?: string; tags?: string; fav?: string }>;
}

export default async function RecipesPage({ searchParams }: RecipesPageProps) {
  const householdId = await requireHouseholdIdOrRedirect();
  const params = await searchParams;
  const q = (params.q ?? '').trim();
  const activeTags = (params.tags ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter((t) => RECIPE_TAGS.includes(t as (typeof RECIPE_TAGS)[number]));
  const favoritesOnly = params.fav === '1';

  const recipes = listRecipes(householdId, {
    search: q || undefined,
    tags: activeTags.length ? activeTags : undefined,
    favoritesOnly,
  });

  const buildHref = (next: { tag?: string; fav?: boolean }) => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    let tags = activeTags;
    if (next.tag) {
      tags = activeTags.includes(next.tag)
        ? activeTags.filter((t) => t !== next.tag)
        : [...activeTags, next.tag];
    }
    if (tags.length) sp.set('tags', tags.join(','));
    const fav = next.fav === undefined ? favoritesOnly : next.fav;
    if (fav) sp.set('fav', '1');
    const s = sp.toString();
    return s ? `/recipes?${s}` : '/recipes';
  };

  return (
    <main className="min-h-dvh pb-24">
      <header className="sticky top-0 z-20 glass-top safe-top">
        <div className="px-4 pt-5 pb-3">
          <h1 className="text-2xl font-bold mb-4">Recetas</h1>
          <form action="/recipes" method="get" className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Buscar recetas..."
              className="w-full bg-surface-2 rounded-xl pl-10 pr-3 h-11 text-text placeholder:text-text-muted outline-none focus:ring-2 focus:ring-accent"
            />
            {activeTags.length > 0 && <input type="hidden" name="tags" value={activeTags.join(',')} />}
            {favoritesOnly && <input type="hidden" name="fav" value="1" />}
          </form>
        </div>
        <div className="overflow-x-auto pb-4 scrollbar-none">
          <div className="flex gap-2 px-4">
            <Chip
              href={buildHref({ fav: !favoritesOnly })}
              active={favoritesOnly}
              label="⭐ Favoritos"
            />
            {RECIPE_TAGS.map((tag) => {
              const isActive = activeTags.includes(tag);
              return <Chip key={tag} href={buildHref({ tag })} active={isActive} label={tag} />;
            })}
          </div>
        </div>
      </header>

      <section className="px-4 pt-4">
        {recipes.length === 0 ? (
          <p className="text-center text-text-muted mt-12">
            No hay recetas todavía. Pulsa + para crear una.
          </p>
        ) : (
          <ul className="grid grid-cols-3 gap-2.5">
            {recipes.map((r) => (
              <li key={r.id}>
                <RecipeCard recipe={r} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link
        href="/recipes/new"
        aria-label="Nueva receta"
        className="fixed right-4 bottom-24 z-30 w-14 h-14 rounded-full bg-accent text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"
      >
        <Plus size={28} />
      </Link>

      <BottomNav currentWeek={getCurrentWeek()} />
    </main>
  );
}

function Chip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={[
        'shrink-0 inline-flex items-center px-4 h-9 rounded-full text-sm font-medium whitespace-nowrap',
        active ? 'bg-accent text-white' : 'bg-surface-2 text-text-muted',
      ].join(' ')}
    >
      {label}
    </Link>
  );
}
