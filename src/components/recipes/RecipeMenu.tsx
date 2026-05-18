'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, MoreVertical, Share as ShareIcon } from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import {
  deleteRecipeAction,
  disableRecipeShareAction,
  duplicateRecipeAction,
  enableRecipeShareAction,
} from '@/actions/recipes';

interface RecipeMenuProps {
  recipeId: number;
  recipeName: string;
  initialShareToken: string | null;
}

type Mode = 'menu' | 'share' | 'confirm-delete';

function tokenToUrl(token: string | null): string | null {
  if (!token) return null;
  if (typeof window === 'undefined') return null;
  return `${window.location.origin}/r/${token}`;
}

export function RecipeMenu({ recipeId, recipeName, initialShareToken }: RecipeMenuProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('menu');
  const [shareToken, setShareToken] = useState<string | null>(initialShareToken);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    if (!open) {
      setMode('menu');
      setCopied(false);
    }
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

  const handleEnableShare = () => {
    startTransition(async () => {
      try {
        const result = await enableRecipeShareAction(recipeId);
        setShareToken(result.token);
      } catch {
        toast.show('No se pudo crear el enlace', 'error');
      }
    });
  };

  const handleDisableShare = () => {
    startTransition(async () => {
      try {
        await disableRecipeShareAction(recipeId);
        setShareToken(null);
      } catch {
        toast.show('No se pudo desactivar el enlace', 'error');
      }
    });
  };

  const shareUrl = tokenToUrl(shareToken);

  async function copyUrl() {
    if (!shareUrl) return;
    let ok = false;
    try {
      await navigator.clipboard.writeText(shareUrl);
      ok = true;
    } catch {
      // ignore
    }
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } else {
      toast.show('No se pudo copiar', 'error');
    }
  }

  async function nativeShare() {
    if (!shareUrl) return;
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: recipeName,
          text: `Mira esta receta: ${recipeName}`,
          url: shareUrl,
        });
        return;
      } catch {
        // user cancelled — fall through to copy
      }
    }
    void copyUrl();
  }

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
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={mode === 'share' ? 'Compartir receta' : 'Opciones'}
      >
        {mode === 'confirm-delete' ? (
          <div className="space-y-4">
            <p className="text-text-muted">
              ¿Eliminar esta receta? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" size="md" fullWidth onClick={() => setMode('menu')} disabled={isPending}>
                Cancelar
              </Button>
              <Button variant="danger" size="md" fullWidth onClick={handleDeleteConfirmed} disabled={isPending}>
                Eliminar
              </Button>
            </div>
          </div>
        ) : mode === 'share' ? (
          <div className="space-y-4 pt-1">
            {shareUrl ? (
              <>
                <p className="text-sm text-text-muted leading-relaxed">
                  Cualquiera con este enlace podrá ver la receta sin necesidad de iniciar sesión.
                  Si lo desactivas, el enlace deja de funcionar.
                </p>
                <div className="rounded-2xl bg-surface ring-1 ring-[color:var(--glass-border)] p-3">
                  <div className="text-[11px] uppercase tracking-wider text-text-muted px-1 mb-1">
                    Enlace público
                  </div>
                  <div className="font-mono text-[12px] text-text break-all px-1 leading-snug">
                    {shareUrl}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={copyUrl}
                      className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-accent/15 text-accent text-sm font-medium active:scale-[0.99] transition-transform"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      {copied ? 'Copiado' : 'Copiar'}
                    </button>
                    <button
                      type="button"
                      onClick={nativeShare}
                      className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-xl text-white text-sm font-medium active:scale-[0.99] transition-transform"
                      style={{ background: 'linear-gradient(135deg, #6366F1 0%, #7C3AED 55%, #A855F7 100%)' }}
                    >
                      <ShareIcon size={14} />
                      Compartir
                    </button>
                  </div>
                </div>
                <Button variant="secondary" size="md" fullWidth onClick={handleDisableShare} disabled={isPending}>
                  Desactivar enlace
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-text-muted leading-relaxed">
                  Crea un enlace público de solo lectura para enviar esta receta a quien quieras.
                  No hace falta que tengan cuenta.
                </p>
                <Button variant="primary" size="lg" fullWidth onClick={handleEnableShare} disabled={isPending}>
                  Generar enlace público
                </Button>
              </>
            )}
            <Button variant="secondary" size="md" fullWidth onClick={() => setMode('menu')} disabled={isPending}>
              Volver
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 pt-2">
            <Button variant="secondary" size="lg" fullWidth onClick={handleEdit} disabled={isPending}>
              Editar
            </Button>
            <Button variant="secondary" size="lg" fullWidth onClick={handleDuplicate} disabled={isPending}>
              Duplicar
            </Button>
            <Button variant="secondary" size="lg" fullWidth onClick={() => setMode('share')} disabled={isPending}>
              {shareToken ? 'Compartir · enlace activo' : 'Compartir'}
            </Button>
            <Button variant="danger" size="lg" fullWidth onClick={() => setMode('confirm-delete')} disabled={isPending}>
              Eliminar
            </Button>
          </div>
        )}
      </BottomSheet>
    </>
  );
}
