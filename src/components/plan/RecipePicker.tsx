'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Star } from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Stepper } from '@/components/ui/Stepper';
import { ListRow } from '@/components/ui/List';
import { Chip, SearchField } from '@/components/ui/NavBar';
import { addToPlanAction } from '@/actions/plan';
import { formatDate, formatDayLabel } from '@/lib/week';
import { useToast } from '@/components/ui/Toast';
import { RECIPE_TAGS, type Recipe, type Slot } from '@/types';

interface RecipePickerProps {
  open: boolean;
  onClose: () => void;
  date: Date;
  slot: Slot;
}

export function RecipePicker({ open, onClose, date, slot }: RecipePickerProps) {
  const router = useRouter();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [favOnly, setFavOnly] = useState(false);
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [servings, setServings] = useState(2);
  const [isPending, startTransition] = useTransition();

  const { data: recipes = [], isLoading } = useQuery<Recipe[]>({
    queryKey: ['recipes-for-picker', search, activeTags, favOnly],
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (search) sp.set('q', search);
      if (activeTags.length) sp.set('tags', activeTags.join(','));
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
    setActiveTags([]);
    setFavOnly(false);
    onClose();
  };

  const toggleTag = (tag: string) =>
    setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  const handleSelect = (recipe: Recipe) => {
    setSelected(recipe);
    setServings(recipe.base_servings);
  };

  const handleAdd = () => {
    if (!selected) return;
    startTransition(async () => {
      try {
        await addToPlanAction({
          date: formatDate(date),
          slot,
          recipe_id: selected.id,
          servings,
        });
        router.refresh();
        handleClose();
      } catch {
        toast.show('No se pudo añadir', 'error');
      }
    });
  };

  const slotLabel = slot === 'comida' ? 'Comida' : 'Cena';
  const dayLabel = formatDayLabel(date);

  if (selected) {
    return (
      <BottomSheet open={open} onClose={handleClose} title="Confirmar receta">
        <div className="space-y-5">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="-mt-1 flex items-center gap-0.5 text-body text-accent active:opacity-50"
          >
            <ChevronLeft size={22} strokeWidth={2.5} className="-ml-1.5" />
            Cambiar receta
          </button>
          <div className="flex flex-col items-center text-center gap-1">
            <span className="text-6xl leading-none mb-2" aria-hidden>
              {selected.emoji}
            </span>
            <div className="text-title3 line-clamp-2">{selected.name}</div>
            <div className="text-subhead text-text-muted capitalize">
              {dayLabel.toLowerCase()} · {slotLabel}
            </div>
          </div>
          <div className="bg-surface rounded-cell pl-4 pr-3 py-3 flex items-center justify-between">
            <span className="text-body">Comensales</span>
            <Stepper value={servings} onChange={setServings} min={1} max={20} size="md" />
          </div>
          <Button variant="primary" size="lg" fullWidth onClick={handleAdd} disabled={isPending}>
            Añadir al plan
          </Button>
        </div>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title={`${slotLabel} · ${dayLabel.toLowerCase()}`} fullHeight>
      <div className="sticky top-0 z-10 -mx-4 px-4 pb-3 space-y-3" style={{ background: 'rgb(var(--sheet))' }}>
        <SearchField value={search} onChange={setSearch} placeholder="Buscar receta" autoFocus />
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 no-scrollbar">
          <Chip active={favOnly} onClick={() => setFavOnly(!favOnly)}>
            <Star size={14} className={favOnly ? 'fill-white' : ''} />
            Favoritos
          </Chip>
          {RECIPE_TAGS.map((tag) => (
            <Chip key={tag} active={activeTags.includes(tag)} onClick={() => toggleTag(tag)}>
              {tag}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mt-1">
        {isLoading ? (
          <div className="text-center text-text-muted py-8">Cargando…</div>
        ) : recipes.length === 0 ? (
          <div className="text-center text-text-muted py-8">Sin recetas</div>
        ) : (
          <div className="list-group rounded-cell bg-surface overflow-hidden">
            {recipes.map((r) => {
              const meta: string[] = [];
              if (r.prep_time_min != null) meta.push(`${r.prep_time_min} min`);
              meta.push(`${r.base_servings} pax`);
              return (
                <ListRow
                  key={r.id}
                  leading={<span className="text-[28px] leading-none w-8 text-center">{r.emoji}</span>}
                  title={r.name}
                  subtitle={meta.join(' · ')}
                  accessory={
                    r.is_favorite ? <Star size={15} className="text-favorite fill-favorite shrink-0" /> : undefined
                  }
                  onClick={() => handleSelect(r)}
                  chevron
                />
              );
            })}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
