'use client';

import { useRef, useState, type PointerEvent, type ReactNode } from 'react';

interface SwipeToDeleteProps {
  children: ReactNode;
  onDelete: () => void;
  label: string;
  disabled?: boolean;
}

const REVEAL = 88; // width of the red "Eliminar" action
const FULL_SWIPE = 0.6; // fraction of row width that deletes on release

/**
 * UITableView trailing swipe action. Drag left to reveal a red "Eliminar";
 * tap it, or swipe past 60% of the row to delete in one gesture. Vertical
 * scrolls pass through (we only claim the gesture once it's clearly horizontal).
 */
export function SwipeToDelete({ children, onDelete, label, disabled }: SwipeToDeleteProps) {
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; base: number; claimed: boolean | null } | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled || e.pointerType === 'mouse') return;
    start.current = { x: e.clientX, y: e.clientY, base: x, claimed: null };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (s.claimed === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      s.claimed = Math.abs(dx) > Math.abs(dy);
      if (s.claimed) {
        setDragging(true);
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    }
    if (!s.claimed) return;
    setX(Math.min(0, s.base + dx));
  };
  const onPointerUp = () => {
    const s = start.current;
    start.current = null;
    if (!s?.claimed) return;
    setDragging(false);
    const width = rowRef.current?.offsetWidth ?? 320;
    if (-x > width * FULL_SWIPE) {
      setX(-width);
      onDelete();
    } else {
      setX(-x > REVEAL / 2 ? -REVEAL : 0);
    }
  };

  return (
    <div ref={rowRef} className="relative overflow-hidden">
      <button
        type="button"
        onClick={onDelete}
        aria-label={label}
        tabIndex={x === 0 ? -1 : 0}
        aria-hidden={x === 0}
        className="absolute inset-y-0 right-0 flex items-center justify-end bg-danger text-white text-body font-medium pr-5"
        style={{ width: Math.max(REVEAL, -x), visibility: x === 0 && !dragging ? 'hidden' : 'visible' }}
      >
        Eliminar
      </button>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={(e) => {
          // A tap on an open row closes it instead of toggling the item.
          if (x !== 0) {
            e.stopPropagation();
            e.preventDefault();
            setX(0);
          }
        }}
        className="relative"
        style={{
          transform: `translateX(${x}px)`,
          transition: dragging ? 'none' : 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
