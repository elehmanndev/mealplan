'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { UNITS } from '@/types';
import { SHOPPING_CATEGORIES } from '@/lib/shopping-types';
import { addExtraAction } from '@/actions/shopping';

interface AddExtraSheetProps {
  open: boolean;
  onClose: () => void;
  week: string;
}

export function AddExtraSheet({ open, onClose, week }: AddExtraSheetProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<string>('');
  const [category, setCategory] = useState<string>('otros');
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName('');
    setQuantity('');
    setUnit('');
    setCategory('otros');
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

  const inputClass = 'w-full bg-surface-2 rounded-xl px-4 h-12 text-base outline-none focus:ring-2 focus:ring-accent';

  return (
    <BottomSheet open={open} onClose={handleClose} title="Añadir item">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 pt-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-text-muted">Nombre</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            placeholder="Papel higiénico"
            className={inputClass}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-text-muted">Cantidad</span>
            <input
              type="text"
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="1"
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-text-muted">Unidad</span>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className={inputClass}
            >
              <option value="">—</option>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-text-muted">Categoría</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputClass}
          >
            {SHOPPING_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <Button type="submit" variant="primary" size="lg" fullWidth disabled={pending}>
          {pending ? 'Añadiendo…' : 'Añadir'}
        </Button>
      </form>
    </BottomSheet>
  );
}
