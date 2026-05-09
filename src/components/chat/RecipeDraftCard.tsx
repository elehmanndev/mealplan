'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { UNITS, type Unit } from '@/types';
import { SUPERMARKETS } from '@/lib/supermarkets';

export interface RecipeDraftIngredient {
  name: string;
  quantity: number;
  unit: Unit | string;
  shopping_category?: string;
  supermarket?: string | null;
  is_pantry?: boolean;
}

export interface RecipeDraft {
  name: string;
  emoji?: string;
  servings: number;
  category?: string;
  prep_time_min?: number;
  description?: string;
  notes?: string;
  tags?: string[];
  ingredients: RecipeDraftIngredient[];
}

interface Props {
  draft: RecipeDraft;
  onSave: (final: RecipeDraft) => void;
  onDiscard: () => void;
  saving?: boolean;
  saved?: { id: number; name: string };
}

export function RecipeDraftCard({ draft, onSave, onDiscard, saving, saved }: Props) {
  const [ingredients, setIngredients] = useState<RecipeDraftIngredient[]>(draft.ingredients);

  if (saved) {
    return (
      <div className="border border-border/50 rounded-2xl px-4 py-3 bg-surface flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0 text-lg">{draft.emoji ?? '🍽️'}</span>
          <span className="truncate text-text font-medium">{saved.name}</span>
        </div>
        <a
          href={`/recipes/${saved.id}`}
          className="shrink-0 text-xs text-accent font-medium underline"
        >
          Ver receta
        </a>
      </div>
    );
  }

  function patchIngredient(i: number, patch: Partial<RecipeDraftIngredient>) {
    setIngredients((prev) => {
      const next = prev.slice();
      next[i] = { ...next[i], ...patch };
      return next;
    });
  }

  function handleSave() {
    onSave({ ...draft, ingredients });
  }

  return (
    <div className="border border-border/60 rounded-2xl bg-surface overflow-hidden">
      <header className="px-4 pt-3 pb-2 flex items-start gap-3">
        <span className="text-2xl shrink-0">{draft.emoji ?? '🍽️'}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text leading-snug">{draft.name}</h3>
          <div className="text-xs text-text-muted mt-0.5 flex flex-wrap gap-x-2">
            <span>{draft.servings} pax</span>
            {draft.prep_time_min ? <span>· {draft.prep_time_min} min</span> : null}
            {draft.category ? <span>· {draft.category}</span> : null}
          </div>
        </div>
      </header>

      {draft.description ? (
        <p className="px-4 pb-2 text-xs text-text-muted">{draft.description}</p>
      ) : null}

      <ul className="px-3 py-1 divide-y divide-border/40">
        {ingredients.map((ing, i) => (
          <li key={i} className="py-2.5">
            <div className="flex items-baseline justify-between gap-2 mb-1.5">
              <span className="text-sm text-text font-medium truncate">{ing.name}</span>
              {ing.is_pantry ? (
                <span className="shrink-0 text-[10px] uppercase tracking-wide text-text-muted">
                  al gusto · pantry
                </span>
              ) : null}
            </div>
            {!ing.is_pantry && (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  inputMode="decimal"
                  value={String(ing.quantity)}
                  onChange={(e) => {
                    const n = Number(e.target.value.replace(',', '.'));
                    if (Number.isFinite(n) && n >= 0) patchIngredient(i, { quantity: n });
                    else if (e.target.value === '') patchIngredient(i, { quantity: 0 });
                  }}
                  className="w-16 bg-bg rounded-lg px-2 h-8 text-sm text-text outline-none focus:ring-2 focus:ring-accent/50 tabular-nums text-right"
                  aria-label={`Cantidad de ${ing.name}`}
                />
                <select
                  value={ing.unit}
                  onChange={(e) => patchIngredient(i, { unit: e.target.value as Unit })}
                  className="bg-bg rounded-lg px-2 h-8 text-sm text-text outline-none focus:ring-2 focus:ring-accent/50"
                  aria-label={`Unidad de ${ing.name}`}
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u === 'al_gusto' ? 'al gusto' : u}
                    </option>
                  ))}
                </select>
                <select
                  value={ing.supermarket ?? ''}
                  onChange={(e) => patchIngredient(i, { supermarket: e.target.value || null })}
                  className="flex-1 min-w-0 bg-bg rounded-lg px-2 h-8 text-sm text-text outline-none focus:ring-2 focus:ring-accent/50"
                  aria-label={`Supermercado de ${ing.name}`}
                >
                  <option value="">—</option>
                  {SUPERMARKETS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </li>
        ))}
      </ul>

      <footer className="px-3 py-3 flex gap-2 border-t border-border/40 bg-bg/30">
        <button
          type="button"
          onClick={onDiscard}
          disabled={saving}
          className="flex-1 h-10 rounded-xl bg-surface text-text-muted text-sm font-medium flex items-center justify-center gap-1.5 active:scale-[0.99] transition-transform disabled:opacity-40"
        >
          <X size={14} />
          Descartar
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 h-10 rounded-xl bg-accent text-white text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-[0.99] transition-transform disabled:opacity-60"
        >
          <Check size={14} />
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </footer>
    </div>
  );
}
