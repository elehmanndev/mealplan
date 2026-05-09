'use client';

import { useState } from 'react';
import { Check, Minus, Plus, X } from 'lucide-react';
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

// Smart step size depending on the current value + unit. The aim is taps,
// not typing — so the stepper should resolve to "the next sensible portion"
// rather than always +1.
function stepFor(quantity: number, unit: string): number {
  if (unit === 'g' || unit === 'ml') {
    if (quantity >= 500) return 100;
    if (quantity >= 200) return 50;
    if (quantity >= 50) return 25;
    if (quantity >= 10) return 10;
    return 5;
  }
  if (unit === 'kg' || unit === 'l') return 0.25;
  // ud, pieza, unidad, cucharada, etc — integer steps of 1
  return 1;
}

function formatQty(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2).replace(/\.?0+$/, '');
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

  function removeIngredient(i: number) {
    setIngredients((prev) => prev.filter((_, idx) => idx !== i));
  }

  function bumpQuantity(i: number, dir: 1 | -1) {
    const ing = ingredients[i];
    const step = stepFor(ing.quantity, String(ing.unit));
    const next = Math.max(0, Math.round((ing.quantity + dir * step) * 100) / 100);
    patchIngredient(i, { quantity: next });
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

      <ul className="px-3 pb-1 flex flex-col gap-2.5">
        {ingredients.map((ing, i) => (
          <li
            key={i}
            className="bg-bg/40 rounded-xl px-3 py-2.5 flex flex-col gap-2 border border-border/30"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-text font-medium truncate flex-1">{ing.name}</span>
              <button
                type="button"
                onClick={() => removeIngredient(i)}
                aria-label={`Quitar ${ing.name}`}
                className="shrink-0 w-6 h-6 rounded-full text-text-muted hover:text-red-400 active:scale-90 transition-transform flex items-center justify-center"
              >
                <X size={14} />
              </button>
            </div>

            {ing.is_pantry ? (
              <span className="self-start text-[10px] uppercase tracking-wide text-text-muted px-2 py-0.5 rounded-full bg-surface">
                al gusto · pantry
              </span>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => bumpQuantity(i, -1)}
                    aria-label={`Bajar cantidad de ${ing.name}`}
                    className="w-8 h-8 rounded-full bg-surface text-text active:scale-90 transition-transform flex items-center justify-center"
                  >
                    <Minus size={14} />
                  </button>
                  <div className="flex-1 text-center text-sm font-semibold text-text tabular-nums">
                    {formatQty(ing.quantity)}{' '}
                    <select
                      value={ing.unit}
                      onChange={(e) => patchIngredient(i, { unit: e.target.value as Unit })}
                      className="bg-transparent text-text-muted text-sm outline-none"
                      aria-label={`Unidad de ${ing.name}`}
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u === 'al_gusto' ? 'al gusto' : u}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => bumpQuantity(i, 1)}
                    aria-label={`Subir cantidad de ${ing.name}`}
                    className="w-8 h-8 rounded-full bg-surface text-text active:scale-90 transition-transform flex items-center justify-center"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <div className="flex gap-1.5 flex-wrap">
                  {SUPERMARKETS.map((s) => {
                    const active = ing.supermarket === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() =>
                          patchIngredient(i, { supermarket: active ? null : s.id })
                        }
                        className={[
                          'px-2.5 py-1 rounded-full text-xs font-medium transition-all active:scale-95',
                          active
                            ? s.pillClass
                            : 'bg-surface text-text-muted border border-border/40',
                        ].join(' ')}
                        aria-pressed={active}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      <footer className="px-3 py-3 flex gap-2 border-t border-border/40 bg-bg/30 mt-1">
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
