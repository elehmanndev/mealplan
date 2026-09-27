import { BookOpen, Plus, Star } from 'lucide-react';
import { listRecipes } from '@/models/recipe';
import { RECIPE_TAGS } from '@/types';
import { getCurrentWeek } from '@/lib/week';
import { BottomNav } from '@/components/ui/BottomNav';
import { Chip, NavBar, NavBarButton, SearchField } from '@/components/ui/NavBar';
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
    <main className="min-h-dvh pb-28">
      <NavBar
        title="Recetas"
        large
        trailing={
          <NavBarButton label="Nueva receta" href="/recipes/new">
            <Plus size={26} strokeWidth={2.25} />
          </NavBarButton>
        }
        bottom={
          <div className="space-y-3">
            <form action="/recipes" method="get" className="px-4">
              <SearchField name="q" defaultValue={q} placeholder="Buscar recetas" />
              {activeTags.length > 0 && <input type="hidden" name="tags" value={activeTags.join(',')} />}
              {favoritesOnly && <input type="hidden" name="fav" value="1" />}
            </form>
            <div className="overflow-x-auto scrollbar-none">
              <div className="flex gap-2 px-4">
                <Chip href={buildHref({ fav: !favoritesOnly })} active={favoritesOnly}>
                  <Star size={14} className={favoritesOnly ? 'fill-white' : ''} />
                  Favoritos
                </Chip>
                {RECIPE_TAGS.map((tag) => (
                  <Chip key={tag} href={buildHref({ tag })} active={activeTags.includes(tag)}>
                    {tag}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
        }
      />

      <section className="px-4 pt-2">
        {recipes.length === 0 ? (
          <div className="flex flex-col items-center text-center mt-16 gap-2">
            <BookOpen size={44} strokeWidth={1.5} className="text-text-tertiary" />
            <p className="text-title3">Sin recetas</p>
            <p className="text-subhead text-text-muted max-w-[260px]">
              {q || activeTags.length || favoritesOnly
                ? 'Ninguna receta coincide con el filtro.'
                : 'Pulsa + para crear tu primera receta.'}
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3">
            {recipes.map((r) => (
              <li key={r.id}>
                <RecipeCard recipe={r} />
              </li>
            ))}
          </ul>
        )}
      </section>


      <BottomNav currentWeek={getCurrentWeek()} />
    </main>
  );
}
