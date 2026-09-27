'use client';

import { useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { RecipeWithIngredients } from '@/types';
import { RECIPE_TAGS } from '@/types';
import type { RecipeIngredientInput } from '@/schemas';
import { Stepper } from '@/components/ui/Stepper';
import { Switch } from '@/components/ui/Switch';
import { ListRow, ListSection } from '@/components/ui/List';
import { Chip, NavBar } from '@/components/ui/NavBar';
import { createRecipeAction, updateRecipeAction } from '@/actions/recipes';
import { IngredientRepeater } from './IngredientRepeater';

interface RecipeFormProps {
  mode: 'create' | 'edit';
  recipeId?: number;
  initial?: RecipeWithIngredients;
}

export function RecipeForm({ mode, recipeId, initial }: RecipeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(initial?.name ?? '');
  const [emoji, setEmoji] = useState(initial?.emoji ?? '🍽️');
  const [baseServings, setBaseServings] = useState(initial?.base_servings ?? 2);
  const [prepTime, setPrepTime] = useState<string>(
    initial?.prep_time_min != null ? String(initial.prep_time_min) : '',
  );
  const [description, setDescription] = useState(initial?.description ?? '');
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [isFavorite, setIsFavorite] = useState(initial?.is_favorite ?? false);
  const [ingredients, setIngredients] = useState<RecipeIngredientInput[]>(
    initial?.ingredients.map((ing) => ({
      ingredient_id: ing.ingredient_id,
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      shopping_category: ing.shopping_category as RecipeIngredientInput['shopping_category'],
      supermarket: ing.supermarket ?? null,
    })) ?? [],
  );

  const toggleTag = (tag: string) =>
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  const handleSubmit = () => {
    setError(null);
    if (!name.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    const cleanIngredients = ingredients.filter(
      (i) => i.name.trim().length > 0 && i.quantity > 0,
    );
    const trimmedPrep = prepTime.trim();
    const parsedPrep = trimmedPrep ? Number(trimmedPrep) : NaN;
    const payload = {
      name: name.trim(),
      description: description.trim() ? description.trim() : null,
      emoji: emoji.trim() || '🍽️',
      base_servings: baseServings,
      category: null,
      prep_time_min: Number.isFinite(parsedPrep) && parsedPrep >= 0 ? parsedPrep : null,
      notes: notes.trim() ? notes.trim() : null,
      is_favorite: isFavorite,
      ingredients: cleanIngredients,
      tags,
    };

    startTransition(async () => {
      try {
        if (mode === 'create') {
          const newId = await createRecipeAction(payload);
          router.push(`/recipes/${newId}`);
        } else if (recipeId != null) {
          await updateRecipeAction(recipeId, payload);
          router.push(`/recipes/${recipeId}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al guardar');
      }
    });
  };

  const title = mode === 'create' ? 'Nueva receta' : 'Editar receta';

  return (
    <>
      <NavBar
        title={title}
        leading={
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isPending}
            className="h-11 px-2 text-body text-accent active:opacity-50 disabled:opacity-40"
          >
            Cancelar
          </button>
        }
        trailing={
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !name.trim()}
            className="h-11 px-2 text-body font-semibold text-accent active:opacity-50 disabled:opacity-40"
          >
            {isPending ? 'Guardando…' : 'Guardar'}
          </button>
        }
      />

      <div className="px-4 pt-4 space-y-7">
        {error && <div className="px-4 py-3 bg-danger/10 text-danger rounded-cell text-subhead">{error}</div>}

        <div className="flex flex-col items-center gap-2">
          <input
            type="text"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            aria-label="Emoji"
            className="w-24 h-24 rounded-[28px] bg-surface text-center text-[52px] leading-none outline-none caret-accent focus:ring-2 focus:ring-accent/40"
            maxLength={8}
          />
          <span className="text-footnote text-text-muted">Toca para cambiar el emoji</span>
        </div>

        <ListSection>
          <FieldRow>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre (p. ej. Pasta carbonara)"
              aria-label="Nombre"
              className={fieldCls}
              required
            />
          </FieldRow>
          <FieldRow>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción"
              aria-label="Descripción"
              rows={2}
              className={`${fieldCls} resize-none py-0 min-h-[44px]`}
            />
          </FieldRow>
        </ListSection>

        <ListSection>
          <ListRow
            title="Comensales base"
            accessory={<Stepper value={baseServings} onChange={setBaseServings} min={1} max={20} />}
          />
          <ListRow
            title="Tiempo (min)"
            accessory={
              <input
                type="text"
                inputMode="numeric"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="20"
                aria-label="Tiempo de preparación en minutos"
                className="w-20 bg-transparent text-right text-body text-text-muted placeholder:text-text-tertiary outline-none caret-accent"
              />
            }
          />
          <ListRow
            title="Favorita"
            accessory={<Switch checked={isFavorite} onChange={setIsFavorite} label="Favorita" />}
          />
        </ListSection>

        <section>
          <h2 className="px-4 pb-[7px] text-footnote text-text-muted">Etiquetas</h2>
          <div className="flex flex-wrap gap-2">
            {RECIPE_TAGS.map((tag) => (
              <Chip key={tag} active={tags.includes(tag)} onClick={() => toggleTag(tag)}>
                {tag}
              </Chip>
            ))}
          </div>
        </section>

        <section>
          <h2 className="px-4 pb-[7px] text-footnote text-text-muted">Ingredientes</h2>
          <IngredientRepeater value={ingredients} onChange={setIngredients} />
        </section>

        <ListSection header="Notas">
          <FieldRow>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Trucos, sustituciones…"
              aria-label="Notas"
              rows={3}
              className={`${fieldCls} resize-none py-0 min-h-[66px]`}
            />
          </FieldRow>
        </ListSection>
      </div>
    </>
  );
}

const fieldCls =
  'w-full bg-transparent text-body text-text placeholder:text-text-muted outline-none caret-accent';

/** A text-entry cell inside a ListSection (UITextField in a grouped table). */
function FieldRow({ children }: { children: ReactNode }) {
  return (
    <div className="list-row pl-4">
      <div className="list-row-content py-[11px] pr-4">{children}</div>
    </div>
  );
}
