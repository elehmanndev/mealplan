'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MoreVertical } from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { deleteRecipeAction, duplicateRecipeAction } from '@/actions/recipes';

interface RecipeMenuProps {
  recipeId: number;
}

export function RecipeMenu({ recipeId }: RecipeMenuProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleEdit = () => {
    setOpen(false);
    router.push(`/recipes/${recipeId}/edit`);
  };

  const handleDuplicate = () => {
    startTransition(async () => {
      const newId = await duplicateRecipeAction(recipeId);
      setOpen(false);
      router.push(`/recipes/${newId}/edit`);
    });
  };

  const handleDelete = () => {
    if (!window.confirm('¿Eliminar receta?')) return;
    startTransition(async () => {
      try {
        await deleteRecipeAction(recipeId);
      } catch {
        // redirect throws — ignore
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Más opciones"
        className="min-w-touch min-h-touch flex items-center justify-center rounded-full text-text-muted hover:text-text active:scale-95 transition-transform"
      >
        <MoreVertical size={22} />
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Opciones">
        <div className="flex flex-col gap-3 pt-2">
          <Button variant="secondary" size="lg" fullWidth onClick={handleEdit} disabled={isPending}>
            Editar
          </Button>
          <Button variant="secondary" size="lg" fullWidth onClick={handleDuplicate} disabled={isPending}>
            Duplicar
          </Button>
          <Button variant="danger" size="lg" fullWidth onClick={handleDelete} disabled={isPending}>
            Eliminar
          </Button>
        </div>
      </BottomSheet>
    </>
  );
}
