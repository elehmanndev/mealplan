'use client';

import { useState, useTransition } from 'react';
import { Check, Pencil, X } from 'lucide-react';
import { renameHouseholdAction } from '@/actions/household';
import { useToast } from '@/components/ui/Toast';

interface HouseholdNameEditorProps {
  initialName: string;
  /**
   * Owner-only edit affordance. Non-owners get a read-only row.
   */
  canEdit: boolean;
}

export function HouseholdNameEditor({ initialName, canEdit }: HouseholdNameEditorProps) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [draft, setDraft] = useState(initialName);
  const [pending, startTransition] = useTransition();

  function startEdit() {
    setDraft(name);
    setEditing(true);
  }

  function cancel() {
    setDraft(name);
    setEditing(false);
  }

  function save() {
    const trimmed = draft.trim();
    if (!trimmed) {
      toast.show('Pon un nombre a tu casa', 'error');
      return;
    }
    if (trimmed === name) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set('name', trimmed);
        await renameHouseholdAction(fd);
        setName(trimmed);
        setEditing(false);
        toast.show('Nombre actualizado', 'success');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'No se pudo renombrar la casa';
        toast.show(msg, 'error');
      }
    });
  }

  if (!editing) {
    return (
      <div className="bg-surface rounded-2xl px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0 text-text font-medium truncate">{name}</div>
        {canEdit && (
          <button
            type="button"
            onClick={startEdit}
            aria-label="Editar nombre"
            className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full text-text-muted hover:text-text transition-colors"
          >
            <Pencil size={16} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-2xl px-3 py-2 flex items-center gap-2">
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            save();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            cancel();
          }
        }}
        maxLength={60}
        disabled={pending}
        autoFocus
        className="flex-1 min-w-0 h-10 rounded-xl bg-bg ring-1 ring-[color:var(--glass-border)] px-3 text-[15px] text-text focus:outline-none focus:ring-2 focus:ring-violet-400"
      />
      <button
        type="button"
        onClick={cancel}
        disabled={pending}
        aria-label="Cancelar"
        className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full text-text-muted hover:text-text transition-colors disabled:opacity-50"
      >
        <X size={18} />
      </button>
      <button
        type="button"
        onClick={save}
        disabled={pending}
        aria-label="Guardar"
        className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full text-white bg-accent disabled:opacity-50"
      >
        <Check size={18} />
      </button>
    </div>
  );
}
