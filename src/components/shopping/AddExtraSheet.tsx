'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { UNITS } from '@/types';
import { SHOPPING_CATEGORIES } from '@/lib/shopping-types';
import { SUPERMARKETS } from '@/lib/supermarkets';
import { addExtraAction } from '@/actions/shopping';

interface AddExtraSheetProps {
  open: boolean;
  onClose: () => void;
  week: string;
  // Supermarket to preselect when the sheet opens (e.g. opened from a
  // specific group's add line). `null`/undefined → "Sin asignar".
  defaultSupermarket?: string | null;
}

export function AddExtraSheet({ open, onClose, week, defaultSupermarket }: AddExtraSheetProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<string>('');
  const [category, setCategory] = useState<string>('otros');
  const [supermarket, setSupermarket] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Each time the sheet opens, seed the supermarket picker with whichever
  // group launched it (blank = "Sin asignar").
  useEffect(() => {
    if (open) setSupermarket(defaultSupermarket ?? '');
  }, [open, defaultSupermarket]);

  function reset() {
    setName('');
    setQuantity('');
    setUnit('');
    setCategory('otros');
    setSupermarket('');
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    const qty = quantity.trim() ? Number(quantity.replace(',', '.')) : null;
    if (qty != null && (Number.isNaN(qty) || qty <= 0)) {
      setError('Cantidad inválida');
      return;
    }
    setError(null);
    startTransition(async () => {
      await addExtraAction({
        week,
        name: name.trim(),
        quantity: qty,
        unit: unit || null,
        shopping_category: category,
        supermarket: supermarket || null,
      });
      reset();
      onClose();
      router.refresh();
    });
  }

  function handleClose() {
    reset();
    onClose();
  }

  const fieldCls =
    'w-full bg-transparent text-body text-text placeholder:text-text-muted outline-none caret-accent';
  // Trailing pop-up menu inside a grouped row (SwiftUI Picker in a Form).
  const menuCls = 'bg-transparent text-body text-text-muted text-right outline-none max-w-[60%]';

  return (
    <BottomSheet open={open} onClose={handleClose} title="Añadir item">
      <form onSubmit={handleSubmit} className="space-y-5 pt-1">
        <div className="list-group rounded-cell bg-surface overflow-hidden">
          <div className="list-row pl-4">
            <div className="list-row-content py-[11px] pr-4">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                placeholder="Nombre (p. ej. Papel higiénico)"
                aria-label="Nombre"
                className={fieldCls}
              />
            </div>
          </div>
          <div className="list-row pl-4">
            <div className="list-row-content flex items-center gap-3 py-[11px] pr-4">
              <span className="flex-1 text-body">Cantidad</span>
              <input
                type="text"
                inputMode="decimal"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1"
                aria-label="Cantidad"
                className="w-16 bg-transparent text-right text-body text-text-muted placeholder:text-text-tertiary outline-none caret-accent"
              />
              <select value={unit} onChange={(e) => setUnit(e.target.value)} aria-label="Unidad" className={menuCls}>
                <option value="">—</option>
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="list-group rounded-cell bg-surface overflow-hidden">
          <label className="list-row pl-4 flex">
            <span className="list-row-content flex-1 flex items-center gap-3 py-[11px] pr-4">
              <span className="flex-1 text-body">Supermercado</span>
              <select
                value={supermarket}
                onChange={(e) => setSupermarket(e.target.value)}
                className={menuCls}
              >
                <option value="">Sin asignar</option>
                {SUPERMARKETS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <label className="list-row pl-4 flex">
            <span className="list-row-content flex-1 flex items-center gap-3 py-[11px] pr-4">
              <span className="flex-1 text-body">Categoría</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={menuCls}>
                {SHOPPING_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </span>
          </label>
        </div>

        {error && <p className="px-4 text-danger text-footnote">{error}</p>}

        <Button type="submit" variant="primary" size="lg" fullWidth disabled={pending}>
          {pending ? 'Añadiendo…' : 'Añadir'}
        </Button>
      </form>
    </BottomSheet>
  );
}
