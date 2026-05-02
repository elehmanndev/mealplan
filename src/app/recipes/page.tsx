import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { listRecipes } from '@/models/recipe';
import { RECIPE_CATEGORIES } from '@/types';
import { BottomNav } from '@/components/ui/BottomNav';
import { RecipeCard } from '@/components/recipes/RecipeCard';

interface RecipesPageProps {
  searchParams: Promise<{ q?: string; category?: string; fav?: string }>;
}

export default async function RecipesPage({ searchParams }: RecipesPageProps) {
  const params = await searchParams;
  const q = (params.q ?? '').trim();
  const category = (params.category ?? '').trim();
  const favoritesOnly = params.fav === '1';

  const recipes = listRecipes({
    search: q || undefined,
    category: category || undefined,
    favoritesOnly,
  });

  const buildHref = (next: { category?: string | null; fav?: boolean }) => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    const cat = next.category === undefined ? category : next.category;
    if (cat) sp.set('category', cat);
    const fav = next.fav === undefined ? favoritesOnly : next.fav;
    if (fav) sp.set('fav', '1');
    const s = sp.toString();
    return s ? `/recipes?${s}` : '/recipes';
  };

  return (
    <main className="min-h-dvh pb-24">
      <header className="sticky top-0 z-20 bg-bg/95 backdrop-blur-sm border-b border-neutral-800">
        <div className="px-4 pt-4 pb-2">
          <h1 className="text-2xl font-bold mb-3">Recetas</h1>
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
            {category && <input type="hidden" name="category" value={category} />}
            {favoritesOnly && <input type="hidden" name="fav" value="1" />}
          </form>
        </div>
        <div className="overflow-x-auto px-4 pb-3 -mx-1">
          <div className="flex gap-2 px-1">
            <Chip
              href={buildHref({ fav: !favoritesOnly })}
              active={favoritesOnly}
              label="⭐ Favoritos"
            />
            {RECIPE_CATEGORIES.map((cat) => {
              const isActive = category === cat;
              return (
                <Chip
                  key={cat}
                  href={buildHref({ category: isActive ? null : cat })}
                  active={isActive}
                  label={cat}
                />
              );
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
          <ul className="grid grid-cols-2 gap-3">
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
        className="fixed right-4 bottom-20 z-30 w-14 h-14 rounded-full bg-accent text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"
      >
        <Plus size={28} />
      </Link>

      <BottomNav />
    </main>
  );
}

function Chip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={[
        'shrink-0 inline-flex items-center px-4 h-9 rounded-full text-sm font-medium whitespace-nowrap capitalize',
        active ? 'bg-accent text-white' : 'bg-surface-2 text-text-muted',
      ].join(' ')}
    >
      {label}
    </Link>
  );
}
