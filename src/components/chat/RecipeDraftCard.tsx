'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Clock, Minus, MinusCircle, Plus, Users } from 'lucide-react';
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
  onChange?: (edited: RecipeDraft) => void;
  saving?: boolean;
  saved?: { id: number; name: string };
}

function stepFor(quantity: number, unit: string): number {
  if (unit === 'g' || unit === 'ml') {
    if (quantity >= 500) return 100;
    if (quantity >= 200) return 50;
    if (quantity >= 50) return 25;
    if (quantity >= 10) return 10;
    return 5;
  }
  if (unit === 'kg' || unit === 'l') return 0.25;
  return 1;
}

function formatQty(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2).replace(/\.?0+$/, '');
}

export function RecipeDraftCard({ draft, onSave, onDiscard, onChange, saving, saved }: Props) {
  const [ingredients, setIngredients] = useState<RecipeDraftIngredient[]>(draft.ingredients);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const isInitialRef = useRef(true);
  useEffect(() => {
    if (isInitialRef.current) {
      isInitialRef.current = false;
      return;
    }
    onChangeRef.current?.({ ...draftRef.current, ingredients });
  }, [ingredients]);

  if (saved) {
    return (
      <a
        href={`/recipes/${saved.id}`}
        className="block rounded-3xl px-4 py-3 bg-surface/80 backdrop-blur-md shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] active:scale-[0.99] transition-transform"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="shrink-0 text-xl leading-none">{draft.emoji ?? '🍽️'}</span>
          <span className="truncate text-text font-medium flex-1 tracking-tight">{saved.name}</span>
          <span className="shrink-0 text-text-muted">→</span>
        </div>
      </a>
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

  const nonPantry = ingredients
    .map((ing, i) => ({ ing, i }))
    .filter((x) => !x.ing.is_pantry);
  const pantry = ingredients.filter((ing) => ing.is_pantry);

  return (
    <div className="rounded-cell bg-surface overflow-hidden shadow-soft">
      <header className="px-5 pt-4 pb-3 flex items-center gap-3.5">
        <span className="text-3xl leading-none shrink-0">{draft.emoji ?? '🍽️'}</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-headline text-text line-clamp-2 break-words">
            {draft.name}
          </h3>
          <div className="text-footnote text-text-muted mt-0.5 flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1">
              <Users size={11} strokeWidth={2.25} />
              {draft.servings}
            </span>
            {draft.prep_time_min ? (
              <span className="inline-flex items-center gap-1">
                <Clock size={11} strokeWidth={2.25} />
                {draft.prep_time_min}′
              </span>
            ) : null}
            {draft.category ? <span className="capitalize opacity-70">{draft.category}</span> : null}
          </div>
        </div>
      </header>

      <ul className="list-group border-t-[0.5px] border-separator">
        {nonPantry.map(({ ing, i }) => {
          const sm = SUPERMARKETS.find((s) => s.id === ing.supermarket);
          return (
            <li
              key={i}
              className="list-row pl-4"
            >
              <div className="list-row-content py-2.5 pr-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-body text-text truncate flex-1">
                  {ing.name}
                </span>
                <button
                  type="button"
                  onClick={() => removeIngredient(i)}
                  aria-label={`Quitar ${ing.name}`}
                  className="shrink-0 w-7 h-7 -mr-1 flex items-center justify-center active:opacity-50"
                >
                  <MinusCircle size={20} className="fill-danger text-surface" />
                </button>
              </div>
              <div className="flex items-center gap-px">
                <button
                  type="button"
                  onClick={() => bumpQuantity(i, -1)}
                  aria-label="Bajar"
                  className="w-8 h-7 rounded-l-[8px] bg-fill text-text active:bg-[var(--fill-pressed)] flex items-center justify-center"
                >
                  <Minus size={14} strokeWidth={2.5} />
                </button>
                <div className="flex items-baseline justify-center gap-1 min-w-[70px] h-7 bg-fill">
                  <span className="text-subhead text-text font-medium tabular-nums leading-7">
                    {formatQty(ing.quantity)}
                  </span>
                  <span className="relative inline-flex text-text-muted text-footnote leading-7">
                    <span aria-hidden="true">
                      {ing.unit === 'al_gusto' ? 'al gusto' : ing.unit}
                    </span>
                    <select
                      value={ing.unit}
                      onChange={(e) => patchIngredient(i, { unit: e.target.value as Unit })}
                      aria-label={`Unidad de ${ing.name}`}
                      style={{ colorScheme: 'light' }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none bg-white text-slate-900"
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u === 'al_gusto' ? 'al gusto' : u}
                        </option>
                      ))}
                    </select>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => bumpQuantity(i, 1)}
                  aria-label="Subir"
                  className="w-8 h-7 rounded-r-[8px] bg-fill text-text active:bg-[var(--fill-pressed)] flex items-center justify-center"
                >
                  <Plus size={14} strokeWidth={2.5} />
                </button>
                <span
                  className={[
                    'relative ml-auto inline-flex items-center justify-center min-w-[72px] h-7 px-3 rounded-full text-footnote font-semibold transition-colors',
                    sm
                      ? sm.pillClass
                      : 'bg-fill text-accent',
                  ].join(' ')}
                >
                  <span aria-hidden="true">{sm?.label ?? 'Supermercado'}</span>
                  <select
                    value={ing.supermarket ?? ''}
                    onChange={(e) =>
                      patchIngredient(i, { supermarket: e.target.value || null })
                    }
                    aria-label={`Supermercado de ${ing.name}`}
                    style={{ colorScheme: 'light' }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none bg-white text-slate-900"
                  >
                    <option value="">Sin asignar</option>
                    {SUPERMARKETS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </span>
              </div>
              </div>
            </li>
          );
        })}
      </ul>

      {pantry.length > 0 && (
        <div className="px-5 pt-2 pb-1 flex flex-wrap items-center gap-1.5">
          {pantry.map((p, idx) => (
            <span
              key={idx}
              className="text-caption1 text-text-muted px-2.5 py-1 rounded-full bg-fill"
            >
              {p.name}
            </span>
          ))}
        </div>
      )}

      <footer className="px-3 pt-3 pb-3 flex gap-2 mt-1 border-t-[0.5px] border-separator">
        <button
          type="button"
          onClick={onDiscard}
          disabled={saving}
          className="flex-1 h-11 rounded-full bg-fill text-danger text-subhead font-semibold flex items-center justify-center gap-1.5 active:bg-[var(--fill-pressed)] transition-colors disabled:opacity-40"
        >
          Descartar
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 h-11 rounded-full bg-accent text-white text-subhead font-semibold flex items-center justify-center gap-1.5 active:opacity-80 transition-opacity disabled:opacity-60"
        >
          <Check size={16} strokeWidth={2.75} />
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </footer>
    </div>
  );
}
