'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search, Star } from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Stepper } from '@/components/ui/Stepper';
import { addToPlanAction } from '@/actions/plan';
import { formatDate, formatDayLabel } from '@/lib/week';
import { RECIPE_CATEGORIES, type Recipe, type Slot } from '@/types';

interface RecipePickerProps {
  open: boolean;
  onClose: () => void;
  date: Date;
  slot: Slot;
}

export function RecipePicker({ open, onClose, date, slot }: RecipePickerProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('');
  const [favOnly, setFavOnly] = useState(false);
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [servings, setServings] = useState(2);
  const [isPending, startTransition] = useTransition();

  const { data: recipes = [], isLoading } = useQuery<Recipe[]>({
    queryKey: ['recipes-for-picker', search, category, favOnly],
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (search) sp.set('q', search);
      if (category) sp.set('category', category);
      if (favOnly) sp.set('fav', '1');
      const res = await fetch(`/api/recipes?${sp.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch recipes');
      return res.json();
    },
    enabled: open,
  });

  const handleClose = () => {
    setSelected(null);
    setSearch('');
    setCategory('');
    setFavOnly(false);
    onClose();
  };

  const handleSelect = (recipe: Recipe) => {
    setSelected(recipe);
    setServings(recipe.base_servings);
  };

  const handleAdd = () => {
    if (!selected) return;
    startTransition(async () => {
      await addToPlanAction({
        date: formatDate(date),
        slot,
        recipe_id: selected.id,
        servings,
      });
      router.refresh();
      handleClose();
    });
  };

  const slotLabel = slot === 'comida' ? '🥘 Comida' : '🌙 Cena';
  const dayLabel = formatDayLabel(date);

  if (selected) {
    return (
      <BottomSheet open={open} onClose={handleClose} title="Confirmar receta" fullHeight>
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="text-sm text-accent"
          >
            ← Cambiar receta
          </button>
          <div className="bg-surface rounded-2xl p-4 flex items-center gap-4">
            <span className="text-5xl" aria-hidden>
              {selected.emoji}
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-lg truncate">{selected.name}</div>
              <div className="text-xs text-text-muted">
                {dayLabel} · {slotLabel}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between bg-surface rounded-2xl p-4">
            <span className="text-sm font-medium">Comensales</span>
            <Stepper value={servings} onChange={setServings} min={1} max={20} size="md" />
          </div>
          <Button variant="primary" size="lg" fullWidth onClick={handleAdd} disabled={isPending}>
            Añadir
          </Button>
        </div>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title={`Añadir a ${dayLabel}`} fullHeight>
      <div className="sticky top-0 bg-surface z-10 pb-3 -mx-4 px-4">
        <div className="relative mb-3">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
          />
          <input
            type="search"
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar receta..."
            className="w-full bg-surface-2 rounded-full pl-10 pr-4 h-11 text-base outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
          <button
            type="button"
            onClick={() => {
              setFavOnly(!favOnly);
              setCategory('');
            }}
            className={[
              'shrink-0 inline-flex items-center gap-1 px-3 h-9 rounded-full text-sm font-medium border',
              favOnly
                ? 'bg-accent text-white border-accent'
                : 'bg-surface-2 border-neutral-700 text-text',
            ].join(' ')}
          >
            <Star size={14} />
            Favoritos
          </button>
          {RECIPE_CATEGORIES.map((cat) => {
            const active = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setCategory(active ? '' : cat);
                  setFavOnly(false);
                }}
                className={[
                  'shrink-0 px-3 h-9 rounded-full text-sm font-medium border capitalize',
                  active
                    ? 'bg-accent text-white border-accent'
                    : 'bg-surface-2 border-neutral-700 text-text',
                ].join(' ')}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3">
        {isLoading ? (
          <div className="text-center text-text-muted py-8">Cargando...</div>
        ) : recipes.length === 0 ? (
          <div className="text-center text-text-muted py-8">Sin recetas</div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {recipes.map((r) => {
              const meta: string[] = [];
              if (r.prep_time_min != null) meta.push(`${r.prep_time_min}min`);
              meta.push(`${r.base_servings} pax`);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleSelect(r)}
                  className="relative aspect-square rounded-2xl bg-surface flex flex-col items-center justify-center p-3 active:scale-[0.98] transition-transform"
                >
                  {r.is_favorite && (
                    <Star
                      size={14}
                      className="absolute top-2 right-2 text-yellow-400 fill-yellow-400"
                    />
                  )}
                  <span className="text-5xl mb-2" aria-hidden>
                    {r.emoji}
                  </span>
                  <span className="text-sm font-medium line-clamp-2 text-center">{r.name}</span>
                  <span className="text-xs text-text-muted mt-1">{meta.join(' · ')}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
