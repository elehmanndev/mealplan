'use client';

import { useEffect, useState } from 'react';

interface ChatUsageBarProps {
  /**
   * Optional initial values (server-rendered). When omitted, the component
   * fetches /api/chat/usage on mount. Pass `used`/`cap` when you already
   * have them (e.g. in /settings) to avoid the extra round-trip.
   */
  initialUsed?: number;
  initialCap?: number;
  /**
   * Optional external override — when the parent has a more recent value
   * (e.g. the chat panel receives `done` SSE events), pass it in and the
   * bar will sync. `null` means "no live override, use internal state."
   */
  liveUsed?: number | null;
  liveCap?: number | null;
  /**
   * Compact mode: tighter padding, used inside the chat composer area.
   */
  compact?: boolean;
}

export function ChatUsageBar({
  initialUsed,
  initialCap,
  liveUsed = null,
  liveCap = null,
  compact = false,
}: ChatUsageBarProps) {
  const [used, setUsed] = useState<number | null>(initialUsed ?? null);
  const [cap, setCap] = useState<number | null>(initialCap ?? null);

  // Fetch on mount when the server didn't seed values.
  useEffect(() => {
    if (initialUsed != null && initialCap != null) return;
    let cancelled = false;
    fetch('/api/chat/usage', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setUsed(data.used);
        setCap(data.cap);
      })
      .catch(() => {
        // Silent — the bar just stays hidden if we can't fetch usage.
      });
    return () => {
      cancelled = true;
    };
  }, [initialUsed, initialCap]);

  // Sync to live values from a parent (e.g. ChatPanel after each `done`).
  useEffect(() => {
    if (liveUsed != null) setUsed(liveUsed);
    if (liveCap != null) setCap(liveCap);
  }, [liveUsed, liveCap]);

  if (used == null || cap == null) return null;

  const pct = Math.min(100, Math.max(0, (used / cap) * 100));
  const remaining = Math.max(0, cap - used);
  const exhausted = remaining === 0;
  const warn = !exhausted && remaining <= Math.max(2, Math.ceil(cap * 0.2));

  const barColor = exhausted
    ? 'bg-red-500'
    : warn
      ? 'bg-amber-400'
      : 'bg-accent';

  return (
    <div className={compact ? 'flex flex-col gap-1 px-2' : 'flex flex-col gap-2'}>
      <div className="flex items-baseline justify-between gap-2">
        <span className={`${compact ? 'text-[11px]' : 'text-xs'} text-text-muted`}>
          Chat hoy
        </span>
        <span
          className={`${compact ? 'text-[11px]' : 'text-xs font-medium'} ${
            exhausted ? 'text-red-400' : warn ? 'text-amber-400' : 'text-text-muted'
          }`}
        >
          {used} / {cap}
        </span>
      </div>
      <div
        className={`w-full ${compact ? 'h-1' : 'h-1.5'} rounded-full overflow-hidden bg-[color:var(--glass-border)]`}
        role="progressbar"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={cap}
        aria-label="Mensajes de chat usados hoy"
      >
        <div
          className={`h-full ${barColor} transition-[width] duration-300 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
