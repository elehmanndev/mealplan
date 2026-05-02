'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { AddExtraSheet } from './AddExtraSheet';

interface AddExtraButtonProps {
  week: string;
}

export function AddExtraButton({ week }: AddExtraButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Añadir item"
        className="fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full bg-accent text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
      >
        <Plus size={28} />
      </button>
      <AddExtraSheet open={open} onClose={() => setOpen(false)} week={week} />
    </>
  );
}
