'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
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
  formatDayName,
  formatDayNumber,
  getWeekDates,
  isSameDay,
} from '@/lib/week';
import type { PlanEntry, Slot } from '@/types';
import { PlanSlot } from './PlanSlot';
import { RecipePicker } from './RecipePicker';
import { ContextMenu } from './ContextMenu';
import { WeekActionsMenu } from './WeekActionsMenu';
import { WeekNav } from './WeekNav';

interface WeekViewProps {
  week: string;
  entries: PlanEntry[];
}

const SLOTS: { slot: Slot; icon: string; label: string }[] = [
  { slot: 'comida', icon: '🥘', label: 'Comida' },
  { slot: 'cena', icon: '🌙', label: 'Cena' },
];

export function WeekView({ week, entries }: WeekViewProps) {
  const router = useRouter();
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
      }
    });
  };

  return (
    <>
      <WeekNav week={week} onOpenActions={() => setActionsOpen(true)} />

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="flex-1 min-h-0 px-3 pt-5 pb-5">
          <div
            className="grid gap-2 h-full"
            style={{
              gridTemplateColumns: '44px repeat(2, minmax(0, 1fr))',
              gridTemplateRows: 'auto repeat(7, minmax(0, 1fr))',
            }}
          >
            <div aria-hidden />
            {SLOTS.map(({ slot, icon, label }) => (
              <div
                key={`h-${slot}`}
                className="flex items-center justify-center gap-1 text-text-muted text-xs uppercase tracking-wide"
              >
                <span aria-hidden>{icon}</span>
                <span>{label}</span>
              </div>
            ))}

            {dates.map((date) => {
              const isToday = isSameDay(date, today);
              const dateKey = formatDate(date);
              return (
                <div key={dateKey} className="contents">
                  <div
                    className={[
                      'flex flex-col items-center justify-center rounded-xl py-2',
                      isToday ? 'bg-accent/15' : '',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'text-[8px] uppercase font-semibold leading-none tracking-tight',
                        isToday ? 'text-accent' : 'text-text-muted',
                      ].join(' ')}
                    >
                      {formatDayName(date)}
                    </span>
                    <span
                      className={[
                        'text-lg leading-tight tabular-nums font-semibold',
                        isToday ? 'text-accent' : 'text-text',
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
            <div className="rounded-xl bg-surface px-3 py-2 flex items-center gap-2 shadow-2xl ring-2 ring-accent/60 scale-105">
              <span className="text-2xl" aria-hidden>
                {activeEntry.recipe?.emoji ?? '🍽️'}
              </span>
              <span className="text-sm font-medium truncate max-w-[120px]">
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
