'use client';

import { useState } from 'react';
import { Check, Minus, Plus, Users, Clock, X } from 'lucide-react';
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

const SUPERMARKET_CYCLE: (string | null)[] = [...SUPERMARKETS.map((s) => s.id), null];
function nextSupermarket(current: string | null | undefined): string | null {
  const idx = SUPERMARKET_CYCLE.indexOf(current ?? null);
  return SUPERMARKET_CYCLE[(idx + 1) % SUPERMARKET_CYCLE.length] ?? null;
}

export function RecipeDraftCard({ draft, onSave, onDiscard, saving, saved }: Props) {
  const [ingredients, setIngredients] = useState<RecipeDraftIngredient[]>(draft.ingredients);

  if (saved) {
    return (
      <a
        href={`/recipes/${saved.id}`}
        className="block rounded-3xl px-4 py-3 bg-surface/80 backdrop-blur-md border border-border/30 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] active:scale-[0.99] transition-transform"
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
    <div className="rounded-3xl bg-surface/90 backdrop-blur-xl border border-border/30 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.05),0_12px_32px_-8px_rgba(0,0,0,0.18)]">
      <header className="px-5 pt-4 pb-3 flex items-center gap-3.5">
        <span className="text-3xl leading-none shrink-0">{draft.emoji ?? '🍽️'}</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold text-text leading-tight tracking-tight truncate">
            {draft.name}
          </h3>
          <div className="text-[11px] text-text-muted/80 mt-1 flex items-center gap-2.5 tracking-tight">
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

      <ul className="px-3 flex flex-col gap-1">
        {nonPantry.map(({ ing, i }) => {
          const sm = SUPERMARKETS.find((s) => s.id === ing.supermarket);
          return (
            <li
              key={i}
              className="rounded-2xl px-3 py-2.5 bg-bg/50 border border-border/20"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[13px] text-text font-medium truncate flex-1 tracking-tight">
                  {ing.name}
                </span>
                <button
                  type="button"
                  onClick={() => removeIngredient(i)}
                  aria-label={`Quitar ${ing.name}`}
                  className="shrink-0 w-5 h-5 rounded-full text-text-muted/40 hover:text-red-400 active:scale-90 transition-all flex items-center justify-center"
                >
                  <X size={11} strokeWidth={2.5} />
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => bumpQuantity(i, -1)}
                  aria-label="Bajar"
                  className="w-7 h-7 rounded-full bg-surface text-text active:scale-90 transition-all flex items-center justify-center shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.04),0_1px_2px_rgba(0,0,0,0.08)]"
                >
                  <Minus size={11} strokeWidth={2.5} />
                </button>
                <span className="text-[13px] text-text font-medium tabular-nums w-8 text-center">
                  {formatQty(ing.quantity)}
                </span>
                <select
                  value={ing.unit}
                  onChange={(e) => patchIngredient(i, { unit: e.target.value as Unit })}
                  aria-label={`Unidad de ${ing.name}`}
                  className="bg-transparent text-text-muted/70 text-[11px] outline-none -ml-1 appearance-none cursor-pointer hover:text-text transition-colors"
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u === 'al_gusto' ? 'al gusto' : u}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => bumpQuantity(i, 1)}
                  aria-label="Subir"
                  className="w-7 h-7 rounded-full bg-surface text-text active:scale-90 transition-all flex items-center justify-center shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.04),0_1px_2px_rgba(0,0,0,0.08)]"
                >
                  <Plus size={11} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    patchIngredient(i, { supermarket: nextSupermarket(ing.supermarket) })
                  }
                  aria-label={`Supermercado: ${sm?.label ?? 'sin asignar'} (toca para cambiar)`}
                  className={[
                    'ml-auto px-2.5 h-7 rounded-full text-[11px] font-semibold tracking-tight transition-all active:scale-95 flex items-center min-w-[60px] justify-center',
                    sm
                      ? `${sm.pillClass} shadow-[0_2px_8px_-2px_rgba(0,0,0,0.25)]`
                      : 'bg-surface text-text-muted/60 border border-border/30 border-dashed',
                  ].join(' ')}
                >
                  {sm?.label ?? '—'}
                </button>
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
              className="text-[10px] text-text-muted/70 px-2 py-0.5 rounded-full bg-bg/40 border border-border/20 tracking-tight"
            >
              {p.name}
            </span>
          ))}
        </div>
      )}

      <footer className="px-3 pt-3 pb-3 flex gap-2 mt-2 border-t border-border/20">
        <button
          type="button"
          onClick={onDiscard}
          disabled={saving}
          aria-label="Descartar"
          className="w-11 h-11 shrink-0 rounded-2xl text-text-muted/70 flex items-center justify-center active:scale-[0.96] transition-all disabled:opacity-40 hover:bg-bg/40"
        >
          <X size={16} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 h-11 rounded-2xl bg-accent text-white text-[13px] font-semibold tracking-tight flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all disabled:opacity-60 shadow-[0_4px_14px_-2px_rgba(96,142,255,0.45)]"
        >
          <Check size={14} strokeWidth={2.75} />
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </footer>
    </div>
  );
}
