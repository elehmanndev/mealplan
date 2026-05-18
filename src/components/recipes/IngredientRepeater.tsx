'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { RecipeIngredientInput } from '@/schemas';
import type { Ingredient, Unit } from '@/types';
import { UNITS } from '@/types';
import { SHOPPING_CATEGORIES } from '@/lib/shopping-types';
import { SUPERMARKETS } from '@/lib/supermarkets';

interface IngredientRepeaterProps {
  value: RecipeIngredientInput[];
  onChange: (next: RecipeIngredientInput[]) => void;
}

const inputCls = 'bg-surface-2 rounded-xl px-3 h-11 text-text placeholder:text-text-muted outline-none focus:ring-2 focus:ring-accent';

export function IngredientRepeater({ value, onChange }: IngredientRepeaterProps) {
  const update = (i: number, patch: Partial<RecipeIngredientInput>) => {
    const next = value.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };

  const remove = (i: number) => {
    const next = value.slice();
    next.splice(i, 1);
    onChange(next);
  };

  const add = () => {
    onChange([
      ...value,
      { name: '', quantity: 1, unit: 'g', shopping_category: 'otros' },
    ]);
  };

  return (
    <div className="space-y-3">
      {value.map((row, i) => (
        <IngredientRow
          key={i}
          row={row}
          onPatch={(p) => update(i, p)}
          onRemove={() => remove(i)}
        />
      ))}
      <button
        type="button"
        onClick={add}
        className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-surface-2 text-text-muted hover:text-text active:scale-[0.99] transition-transform"
      >
        <Plus size={18} />
        Añadir ingrediente
      </button>
    </div>
  );
}

interface IngredientRowProps {
  row: RecipeIngredientInput;
  onPatch: (patch: Partial<RecipeIngredientInput>) => void;
  onRemove: () => void;
}

function IngredientRow({ row, onPatch, onRemove }: IngredientRowProps) {
  const [suggestions, setSuggestions] = useState<Ingredient[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [matchedExisting, setMatchedExisting] = useState<boolean>(!!row.ingredient_id);
  const [matchedPantry, setMatchedPantry] = useState<boolean>(false);
  // Local string state for the quantity input so the user can type
  // intermediate values like "0," or "1." without the bound-to-number
  // render wiping the trailing decimal separator.
  const [qtyText, setQtyText] = useState<string>(String(row.quantity));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-sync the local text only when the upstream quantity changes to a
  // value that's NOT what our text already represents (e.g. picking a
  // suggestion overwrites quantity). Pure-text edits don't loop.
  useEffect(() => {
    const parsed = parseFloat(qtyText.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed !== row.quantity) {
      setQtyText(String(row.quantity));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.quantity]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = row.name.trim();
    if (!q) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/ingredients/search?q=${encodeURIComponent(q)}&limit=10`);
        if (!res.ok) return;
        const data = (await res.json()) as Ingredient[];
        setSuggestions(data);
        const exact = data.find((i) => i.name.toLowerCase() === q.toLowerCase());
        setMatchedExisting(!!exact);
        setMatchedPantry(!!exact?.is_pantry);
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [row.name]);

  const handlePickSuggestion = (ing: Ingredient) => {
    onPatch({
      ingredient_id: ing.id,
      name: ing.name,
      unit: ing.default_unit,
      shopping_category: ing.shopping_category as RecipeIngredientInput['shopping_category'],
      supermarket: ing.supermarket ?? null,
    });
    setShowSuggestions(false);
    setMatchedExisting(true);
    setMatchedPantry(!!ing.is_pantry);
  };

  const handleNameChange = (name: string) => {
    onPatch({ name, ingredient_id: undefined });
    setMatchedPantry(false);
  };

  const handleQuantityChange = (raw: string) => {
    setQtyText(raw);
    const parsed = parseFloat(raw.replace(',', '.'));
    // Only push to the parent when the text parses to a strictly positive
    // number — intermediate states ("", "0", "0,", "1.") stay local so the
    // user can finish typing. Zod validates > 0 on save anyway.
    if (Number.isFinite(parsed) && parsed > 0) {
      onPatch({ quantity: parsed });
    }
  };

  const isCreatingNew = !matchedExisting && row.name.trim().length > 0;
  const showCategorySelect = isCreatingNew;

  return (
    <div className="bg-surface rounded-2xl p-3 space-y-2">
      <div className="relative">
        <input
          type="text"
          value={row.name}
          onChange={(e) => handleNameChange(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => {
            blurTimerRef.current = setTimeout(() => setShowSuggestions(false), 150);
          }}
          placeholder="Nombre del ingrediente"
          className={`${inputCls} w-full ${
            isCreatingNew ? 'ring-1 ring-amber-500/50' : ''
          }`}
        />
        {isCreatingNew && (
          <p className="mt-1 text-xs text-amber-400">
            🆕 Se creará como ingrediente nuevo. Si existe en la lista de
            sugerencias, selecciónalo para reusarlo.
          </p>
        )}
        {matchedExisting && matchedPantry && (
          <p className="mt-1 text-xs text-text-muted">
            🫙 Despensa — no se añadirá a la lista de la compra
          </p>
        )}
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute z-10 left-0 right-0 mt-1 bg-surface-2 rounded-xl shadow-lg max-h-56 overflow-y-auto">
            {suggestions.map((ing) => (
              <li key={ing.id}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
                    handlePickSuggestion(ing);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-surface min-h-touch"
                >
                  <span className="font-medium">{ing.name}</span>
                  <span className="text-xs text-text-muted ml-2">
                    {ing.default_unit} · {ing.shopping_category}
                  </span>
                  {ing.supermarket && (
                    <SupermarketPill id={ing.supermarket} className="ml-2" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex gap-2 items-center">
        <input
          type="text"
          inputMode="decimal"
          value={qtyText}
          onChange={(e) => handleQuantityChange(e.target.value)}
          placeholder="Cant."
          className={`${inputCls} w-24`}
        />
        <select
          value={row.unit}
          onChange={(e) => onPatch({ unit: e.target.value as Unit })}
          className={`${inputCls} flex-1`}
        >
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {u === 'al_gusto' ? 'al gusto' : u}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Eliminar ingrediente"
          className="min-w-touch min-h-touch flex items-center justify-center rounded-full text-text-muted hover:text-red-400 active:scale-95 transition-transform"
        >
          <Trash2 size={20} />
        </button>
      </div>
      {showCategorySelect && (
        <select
          value={row.shopping_category ?? 'otros'}
          onChange={(e) =>
            onPatch({ shopping_category: e.target.value as RecipeIngredientInput['shopping_category'] })
          }
          className={`${inputCls} w-full`}
        >
          {SHOPPING_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      )}
      <div className="flex items-center gap-2">
        <label className="text-xs text-text-muted shrink-0">Supermercado</label>
        <select
          value={row.supermarket ?? ''}
          onChange={(e) => onPatch({ supermarket: e.target.value || null })}
          className={`${inputCls} flex-1`}
        >
          <option value="">Sin asignar</option>
          {SUPERMARKETS.map((sm) => (
            <option key={sm.id} value={sm.id}>
              {sm.label}
            </option>
          ))}
        </select>
        {row.supermarket && <SupermarketPill id={row.supermarket} />}
      </div>
    </div>
  );
}

function SupermarketPill({ id, className = '' }: { id: string; className?: string }) {
  const sm = SUPERMARKETS.find((s) => s.id === id);
  if (!sm) return null;
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${sm.pillClass} ${className}`}>
      {sm.label}
    </span>
  );
}
