'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { RecipeWithIngredients } from '@/types';
import { RECIPE_TAGS } from '@/types';
import type { RecipeIngredientInput } from '@/schemas';
import { Button } from '@/components/ui/Button';
import { Stepper } from '@/components/ui/Stepper';
import { createRecipeAction, updateRecipeAction } from '@/actions/recipes';
import { IngredientRepeater } from './IngredientRepeater';

interface RecipeFormProps {
  mode: 'create' | 'edit';
  recipeId?: number;
  initial?: RecipeWithIngredients;
}

const inputCls =
  'bg-surface-2 rounded-xl px-4 h-12 w-full text-text placeholder:text-text-muted outline-none focus:ring-2 focus:ring-accent';

export function RecipeForm({ mode, recipeId, initial }: RecipeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(initial?.name ?? '');
  const [emoji, setEmoji] = useState(initial?.emoji ?? '🍽️');
  const [baseServings, setBaseServings] = useState(initial?.base_servings ?? 2);
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
    const payload = {
      name: name.trim(),
      description: null,
      emoji: emoji.trim() || '🍽️',
      base_servings: baseServings,
      category: null,
      prep_time_min: null,
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

  return (
    <div className="space-y-4">
      {error && (
        <div className="px-4 py-3 bg-red-600/20 border border-red-600 text-red-300 rounded-xl">
          {error}
        </div>
      )}

      <label className="block">
        <span className="text-sm text-text-muted">Nombre</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Pasta carbonara"
          className={`${inputCls} mt-1`}
          required
        />
      </label>

      <label className="block">
        <span className="text-sm text-text-muted">Emoji</span>
        <input
          type="text"
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          className={`${inputCls} mt-1 text-center text-2xl`}
          maxLength={8}
        />
      </label>

      <div>
        <span className="text-sm text-text-muted">Tags</span>
        <div className="flex flex-wrap gap-2 mt-2">
          {RECIPE_TAGS.map((tag) => {
            const selected = tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={[
                  'px-3 h-9 rounded-full text-sm font-medium transition-all active:scale-95',
                  selected ? 'bg-accent text-white' : 'bg-surface-2 text-text-muted',
                ].join(' ')}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-surface rounded-2xl p-4 flex items-center justify-between">
        <span className="text-sm text-text-muted">Comensales base</span>
        <Stepper value={baseServings} onChange={setBaseServings} min={1} max={20} />
      </div>

      <label className="flex items-center justify-between bg-surface rounded-2xl px-4 h-14 cursor-pointer">
        <span className="font-medium">⭐ Favorita</span>
        <input
          type="checkbox"
          checked={isFavorite}
          onChange={(e) => setIsFavorite(e.target.checked)}
          className="sr-only peer"
        />
        <span className="relative w-12 h-7 bg-surface-2 rounded-full peer-checked:bg-accent transition-colors">
          <span className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
        </span>
      </label>

      <div>
        <h3 className="text-sm text-text-muted mb-2">Ingredientes</h3>
        <IngredientRepeater value={ingredients} onChange={setIngredients} />
      </div>

      <label className="block">
        <span className="text-sm text-text-muted">Notas</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Trucos, sustituciones..."
          className="bg-surface-2 rounded-xl px-4 py-3 w-full text-text placeholder:text-text-muted outline-none focus:ring-2 focus:ring-accent mt-1 min-h-24"
        />
      </label>

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          fullWidth
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleSubmit}
          disabled={isPending}
        >
          {isPending ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </div>
  );
}
