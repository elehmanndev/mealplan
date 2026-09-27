'use client';

import { useEffect, useMemo, useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { movePlanEntryAction } from '@/actions/plan';
import {
  formatDate,
  formatDayShort,
  formatDayNumber,
  getWeekDates,
  isSameDay,
} from '@/lib/week';
import { useToast } from '@/components/ui/Toast';
import type { PlanEntry, Slot } from '@/types';
import { PlanSlot } from './PlanSlot';
import { RecipePicker } from './RecipePicker';
import { ContextMenu } from './ContextMenu';
import { WeekActionsMenu } from './WeekActionsMenu';
import { WeekNav } from './WeekNav';

interface WeekViewProps {
  week: string;
  entries: PlanEntry[];
  /** Rendered between the nav bar and the grid (e.g. empty-household CTA). */
  banner?: ReactNode;
}

const SLOTS: { slot: Slot; label: string }[] = [
  { slot: 'comida', label: 'Comida' },
  { slot: 'cena', label: 'Cena' },
];

export function WeekView({ week, entries, banner }: WeekViewProps) {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [localEntries, setLocalEntries] = useState<PlanEntry[]>(entries);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [pickerTarget, setPickerTarget] = useState<{ date: Date; slot: Slot } | null>(null);
  const [menuEntry, setMenuEntry] = useState<PlanEntry | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);

  useEffect(() => {
    setLocalEntries(entries);
  }, [entries]);

  const sensors = useSensors(
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const dates = useMemo(() => getWeekDates(week), [week]);
  const today = useMemo(() => new Date(), []);

  const entriesByCell = useMemo(() => {
    const map = new Map<string, PlanEntry[]>();
    for (const e of localEntries) {
      const key = `${e.date}-${e.slot}`;
      const arr = map.get(key);
      if (arr) arr.push(e);
      else map.set(key, [e]);
    }
    return map;
  }, [localEntries]);

  const activeEntry = useMemo(
    () => (activeId != null ? localEntries.find((e) => e.id === activeId) ?? null : null),
    [activeId, localEntries],
  );

  const handleDragStart = (event: DragStartEvent) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
    setActiveId(Number(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const overId = String(over.id);
    const m = /^(\d{4}-\d{2}-\d{2})-(comida|cena)$/.exec(overId);
    if (!m) return;
    const toDate = m[1];
    const toSlot = m[2] as Slot;
    const entryId = Number(active.id);
    const entry = localEntries.find((e) => e.id === entryId);
    if (!entry) return;
    if (entry.date === toDate && entry.slot === toSlot) return;

    // Multi-entry slots: just move (no swap). If the destination has other
    // entries, the dragged one joins them.
    setLocalEntries((prev) =>
      prev.map((e) => (e.id === entryId ? { ...e, date: toDate, slot: toSlot } : e)),
    );

    startTransition(async () => {
      try {
        await movePlanEntryAction({ entry_id: entryId, to_date: toDate, to_slot: toSlot });
        router.refresh();
      } catch {
        setLocalEntries(entries);
        toast.show('No se pudo mover la receta', 'error');
      }
    });
  };

  return (
    <>
      <WeekNav week={week} onOpenActions={() => setActionsOpen(true)} />
      {banner}

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="px-3 pt-2 pb-5">
          <div
            className="grid gap-1.5"
            style={{
              gridTemplateColumns: '40px repeat(2, minmax(0, 1fr))',
              gridTemplateRows: 'auto repeat(7, minmax(72px, auto))',
            }}
          >
            <div aria-hidden />
            {SLOTS.map(({ slot, label }) => (
              <div key={`h-${slot}`} className="pb-0.5 text-center text-footnote font-semibold text-text-muted">
                {label}
              </div>
            ))}

            {dates.map((date) => {
              const isToday = isSameDay(date, today);
              const dateKey = formatDate(date);
              return (
                <div key={dateKey} className="contents">
                  <div className="flex flex-col items-center justify-center gap-0.5">
                    <span
                      className={[
                        'text-caption2 uppercase font-semibold',
                        isToday ? 'text-accent' : 'text-text-muted',
                      ].join(' ')}
                    >
                      {formatDayShort(date)}
                    </span>
                    <span
                      className={[
                        'w-8 h-8 rounded-full flex items-center justify-center text-title3 tabular-nums',
                        isToday ? 'bg-accent text-white' : 'text-text',
                      ].join(' ')}
                    >
                      {formatDayNumber(date)}
                    </span>
                  </div>
                  {SLOTS.map(({ slot }) => (
                    <PlanSlot
                      key={`${dateKey}-${slot}`}
                      date={date}
                      slot={slot}
                      entries={entriesByCell.get(`${dateKey}-${slot}`) ?? []}
                      isToday={isToday}
                      onTapEmpty={() => setPickerTarget({ date, slot })}
                      onTapEntry={(e) => setMenuEntry(e)}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        <DragOverlay>
          {activeEntry ? (
            <div className="rounded-[14px] bg-surface px-3 py-2 flex items-center gap-2 scale-105" style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.25), 0 0 0 0.5px var(--separator)' }}>
              <span className="text-2xl" aria-hidden>
                {activeEntry.recipe?.emoji ?? '🍽️'}
              </span>
              <span className="text-subhead font-semibold truncate max-w-[120px]">
                {activeEntry.recipe?.name ?? 'Receta'}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {pickerTarget && (
        <RecipePicker
          open={!!pickerTarget}
          onClose={() => setPickerTarget(null)}
          date={pickerTarget.date}
          slot={pickerTarget.slot}
        />
      )}

      {menuEntry && (
        <ContextMenu
          entry={menuEntry}
          open={!!menuEntry}
          onClose={() => setMenuEntry(null)}
          week={week}
        />
      )}

      <WeekActionsMenu
        week={week}
        open={actionsOpen}
        onClose={() => setActionsOpen(false)}
        hasEntries={entries.length > 0}
      />
    </>
  );
}
