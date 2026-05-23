'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Merge, Search, X } from 'lucide-react';
import type { DuplicateGroup, IngredientWithUsage } from '@/models/ingredient';
import { mergeIngredientsAction } from '@/actions/ingredients';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useToast } from '@/components/ui/Toast';

interface Props {
  groups: DuplicateGroup[];
  all: IngredientWithUsage[];
}

export function IngredientCatalog({ groups, all }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [mergeDialog, setMergeDialog] = useState<MergeDialogState | null>(null);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((i) => i.name.toLowerCase().includes(q));
  }, [all, search]);

  function runMerge(canonicalId: number, dupeIds: number[]) {
    startTransition(async () => {
      try {
        const report = await mergeIngredientsAction(canonicalId, dupeIds);
        const moved = report.recipeIngredientRowsMoved;
        const summed = report.recipeIngredientConflictsSummed;
        const dropped = report.recipeIngredientConflictsDropped;
        const parts: string[] = [];
        if (moved > 0) parts.push(`${moved} receta${moved === 1 ? '' : 's'} reapuntada${moved === 1 ? '' : 's'}`);
        if (summed > 0) parts.push(`${summed} sumada${summed === 1 ? '' : 's'}`);
        if (dropped > 0) parts.push(`${dropped} duplicada${dropped === 1 ? '' : 's'} dentro de la misma receta`);
        toast.show(parts.length > 0 ? `Fusionado: ${parts.join(', ')}` : 'Fusionado', 'success');
        setMergeDialog(null);
        router.refresh();
      } catch (err) {
        toast.show(err instanceof Error ? err.message : 'No se pudo fusionar', 'error');
      }
    });
  }

  return (
    <>
      {groups.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted px-1">
            Sugerencias ({groups.length})
          </h2>
          <p className="text-xs text-text-muted px-1 leading-relaxed">
            Filas cuyo nombre normalizado coincide. Elige cuál mantener.
          </p>
          <ul className="bg-surface rounded-2xl divide-y divide-[color:var(--glass-border)] overflow-hidden">
            {groups.map((g) => (
              <li key={g.key} className="px-4 py-3">
                <DuplicateGroupRow
                  group={g}
                  disabled={pending}
                  onMerge={(canonicalId, dupeIds) => runMerge(canonicalId, dupeIds)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted px-1">
          Catálogo ({all.length})
        </h2>
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar"
            className="w-full bg-surface rounded-xl pl-9 pr-9 py-2 text-sm text-text placeholder:text-text-muted/60 outline-none focus:ring-2 focus:ring-accent/50"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-text-muted hover:text-text"
              aria-label="Limpiar búsqueda"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <ul className="bg-surface rounded-2xl divide-y divide-[color:var(--glass-border)] overflow-hidden">
          {filtered.map((i) => (
            <li key={i.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="text-text truncate">{i.name}</div>
                <div className="text-xs text-text-muted">
                  {i.recipeCount === 0
                    ? 'Sin usos'
                    : `${i.recipeCount} receta${i.recipeCount === 1 ? '' : 's'}`}
                  {' · '}
                  {i.default_unit}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMergeDialog({ source: i, all })}
                disabled={pending}
                className="shrink-0 min-h-touch px-3 rounded-xl bg-bg/60 text-text-muted hover:text-text inline-flex items-center gap-1.5 text-sm"
                aria-label={`Fusionar ${i.name}`}
              >
                <Merge size={14} />
                Fusionar
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-text-muted">
              Sin resultados
            </li>
          )}
        </ul>
      </section>

      <MergeDialog
        state={mergeDialog}
        onClose={() => setMergeDialog(null)}
        onConfirm={(targetId) => {
          if (!mergeDialog) return;
          runMerge(targetId, [mergeDialog.source.id]);
        }}
        pending={pending}
      />
    </>
  );
}

interface MergeDialogState {
  source: IngredientWithUsage;
  all: IngredientWithUsage[];
}

interface DuplicateGroupRowProps {
  group: DuplicateGroup;
  disabled: boolean;
  onMerge: (canonicalId: number, dupeIds: number[]) => void;
}

function DuplicateGroupRow({ group, disabled, onMerge }: DuplicateGroupRowProps) {
  const [canonicalId, setCanonicalId] = useState<number>(group.rows[0].id);
  const dupeIds = group.rows.filter((r) => r.id !== canonicalId).map((r) => r.id);

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-1.5">
        {group.rows.map((r) => {
          const isCanonical = r.id === canonicalId;
          return (
            <li key={r.id}>
              <label className="flex items-center gap-3 cursor-pointer min-h-touch">
                <input
                  type="radio"
                  name={`canonical-${group.key}`}
                  checked={isCanonical}
                  onChange={() => setCanonicalId(r.id)}
                  disabled={disabled}
                  className="accent-accent"
                />
                <div className="flex-1 min-w-0">
                  <div className={['truncate', isCanonical ? 'text-text font-medium' : 'text-text-muted'].join(' ')}>
                    {r.name}
                  </div>
                  <div className="text-xs text-text-muted">
                    {r.recipeCount === 0
                      ? 'Sin usos'
                      : `${r.recipeCount} receta${r.recipeCount === 1 ? '' : 's'}`}
                    {' · '}
                    {r.default_unit}
                  </div>
                </div>
                {isCanonical && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-accent bg-accent/15 rounded-full px-2 py-0.5 shrink-0">
                    Mantener
                  </span>
                )}
              </label>
            </li>
          );
        })}
      </ul>
      <Button
        variant="primary"
        size="sm"
        onClick={() => onMerge(canonicalId, dupeIds)}
        disabled={disabled || dupeIds.length === 0}
      >
        Fusionar en «{group.rows.find((r) => r.id === canonicalId)?.name}»
      </Button>
    </div>
  );
}

interface MergeDialogProps {
  state: MergeDialogState | null;
  onClose: () => void;
  onConfirm: (targetId: number) => void;
  pending: boolean;
}

function MergeDialog({ state, onClose, onConfirm, pending }: MergeDialogProps) {
  const [search, setSearch] = useState('');
  const [targetId, setTargetId] = useState<number | null>(null);

  const candidates = useMemo(() => {
    if (!state) return [];
    const q = search.trim().toLowerCase();
    return state.all
      .filter((i) => i.id !== state.source.id)
      .filter((i) => (q ? i.name.toLowerCase().includes(q) : true))
      .slice(0, 50);
  }, [state, search]);

  function close() {
    if (pending) return;
    setSearch('');
    setTargetId(null);
    onClose();
  }

  return (
    <BottomSheet
      open={state !== null}
      onClose={close}
      title={state ? `Fusionar «${state.source.name}»` : ''}
      fullHeight
    >
      {state && (
        <div className="space-y-4">
          <p className="text-sm text-text-muted leading-relaxed">
            Selecciona la fila a mantener. Todas las recetas que apunten a
            «{state.source.name}» pasarán a apuntar a la elegida, y la fila
            duplicada se eliminará del catálogo.
          </p>
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar ingrediente canónico"
              className="w-full bg-surface rounded-xl pl-9 pr-3 py-2 text-sm text-text placeholder:text-text-muted/60 outline-none focus:ring-2 focus:ring-accent/50"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              autoFocus
            />
          </div>
          <ul className="bg-surface rounded-xl divide-y divide-[color:var(--glass-border)] overflow-hidden max-h-72 overflow-y-auto">
            {candidates.map((c) => (
              <li key={c.id}>
                <label className="flex items-center gap-3 px-3 py-2 cursor-pointer min-h-touch">
                  <input
                    type="radio"
                    name="merge-target"
                    checked={targetId === c.id}
                    onChange={() => setTargetId(c.id)}
                    disabled={pending}
                    className="accent-accent"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-text truncate">{c.name}</div>
                    <div className="text-xs text-text-muted">
                      {c.recipeCount === 0
                        ? 'Sin usos'
                        : `${c.recipeCount} receta${c.recipeCount === 1 ? '' : 's'}`}
                      {' · '}
                      {c.default_unit}
                    </div>
                  </div>
                </label>
              </li>
            ))}
            {candidates.length === 0 && (
              <li className="px-3 py-4 text-center text-sm text-text-muted">
                Sin resultados
              </li>
            )}
          </ul>
          <div className="flex gap-2">
            <Button variant="secondary" size="md" fullWidth onClick={close} disabled={pending}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={() => targetId && onConfirm(targetId)}
              disabled={pending || targetId === null}
            >
              {pending ? 'Fusionando…' : 'Fusionar'}
            </Button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
