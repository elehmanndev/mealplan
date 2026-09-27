'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, Ellipsis, Pencil, Share as ShareIcon, Trash2 } from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { ConfirmActions } from '@/components/ui/ConfirmActions';
import { ListRow, ListSection } from '@/components/ui/List';
import { NavBarButton } from '@/components/ui/NavBar';
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
      <NavBarButton label="Más opciones" onClick={() => setOpen(true)}>
        <Ellipsis size={24} strokeWidth={2.25} />
      </NavBarButton>
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={mode === 'share' ? 'Compartir receta' : 'Opciones'}
      >
        {mode === 'confirm-delete' ? (
          <ConfirmActions
            message="¿Eliminar esta receta? Esta acción no se puede deshacer."
            confirmLabel="Eliminar receta"
            destructive
            onConfirm={handleDeleteConfirmed}
            onCancel={() => setMode('menu')}
            disabled={isPending}
          />
        ) : mode === 'share' ? (
          <div className="space-y-4 pt-1">
            {shareUrl ? (
              <>
                <p className="text-footnote text-text-muted px-1">
                  Cualquiera con este enlace podrá ver la receta sin necesidad de iniciar sesión.
                  Si lo desactivas, el enlace deja de funcionar.
                </p>
                <div className="rounded-cell bg-surface p-4">
                  <div className="text-footnote text-text-muted mb-1">Enlace público</div>
                  <div className="font-mono text-footnote text-text break-all leading-snug">
                    {shareUrl}
                  </div>
                  <div className="flex gap-2 pt-3">
                    <button
                      type="button"
                      onClick={copyUrl}
                      className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-full bg-fill text-accent text-subhead font-semibold active:bg-[var(--fill-pressed)] transition-colors"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      {copied ? 'Copiado' : 'Copiar'}
                    </button>
                    <button
                      type="button"
                      onClick={nativeShare}
                      className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-full bg-accent text-white text-subhead font-semibold active:opacity-80 transition-opacity"
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
                <p className="text-footnote text-text-muted px-1">
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
          <div className="space-y-5">
            <ListSection>
              <ListRow icon={Pencil} title="Editar" onClick={handleEdit} disabled={isPending} />
              <ListRow icon={Copy} iconBg="#5856D6" title="Duplicar" onClick={handleDuplicate} disabled={isPending} />
              <ListRow
                icon={ShareIcon}
                iconBg="rgb(var(--success))"
                title="Compartir"
                value={shareToken ? 'Enlace activo' : undefined}
                onClick={() => setMode('share')}
                disabled={isPending}
                chevron
              />
            </ListSection>
            <ListSection>
              <ListRow
                icon={Trash2}
                destructive
                title="Eliminar"
                onClick={() => setMode('confirm-delete')}
                disabled={isPending}
              />
            </ListSection>
          </div>
        )}
      </BottomSheet>
    </>
  );
}
