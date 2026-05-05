'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MoreVertical } from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { deleteRecipeAction, duplicateRecipeAction } from '@/actions/recipes';

interface RecipeMenuProps {
  recipeId: number;
}

type Mode = 'menu' | 'confirm-delete';

export function RecipeMenu({ recipeId }: RecipeMenuProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('menu');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    if (!open) setMode('menu');
  }, [open]);

  const handleEdit = () => {
    setOpen(false);
    router.push(`/recipes/${recipeId}/edit`);
  };

  const handleDuplicate = () => {
    startTransition(async () => {
      try {
        const newId = await duplicateRecipeAction(recipeId);
        setOpen(false);
        router.push(`/recipes/${newId}/edit`);
      } catch {
        toast.show('No se pudo duplicar', 'error');
      }
    });
  };

  const handleDeleteConfirmed = () => {
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
        {mode === 'confirm-delete' ? (
          <div className="space-y-4">
            <p className="text-text-muted">
              ¿Eliminar esta receta? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => setMode('menu')}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                size="md"
                fullWidth
                onClick={handleDeleteConfirmed}
                disabled={isPending}
              >
                Eliminar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 pt-2">
            <Button variant="secondary" size="lg" fullWidth onClick={handleEdit} disabled={isPending}>
              Editar
            </Button>
            <Button variant="secondary" size="lg" fullWidth onClick={handleDuplicate} disabled={isPending}>
              Duplicar
            </Button>
            <Button
              variant="danger"
              size="lg"
              fullWidth
              onClick={() => setMode('confirm-delete')}
              disabled={isPending}
            >
              Eliminar
            </Button>
          </div>
        )}
      </BottomSheet>
    </>
  );
}
