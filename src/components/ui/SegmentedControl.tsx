'use client';

import type { ReactNode } from 'react';

interface Segment<T extends string> {
  value: T;
  label: ReactNode;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  segments: Segment<T>[];
  ariaLabel?: string;
}

/** UISegmentedControl: grey track, raised white (dark: grey) thumb that slides. */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  segments,
  ariaLabel,
}: SegmentedControlProps<T>) {
  const index = Math.max(
    0,
    segments.findIndex((s) => s.value === value),
  );
  const width = 100 / segments.length;

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="relative grid h-9 rounded-[9px] bg-fill p-[2px]"
      style={{ gridTemplateColumns: `repeat(${segments.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className="absolute top-[2px] bottom-[2px] rounded-[7px] transition-transform duration-300 ease-ios"
        style={{
          left: 2,
          width: `calc(${width}% - ${4 / segments.length}px)`,
          transform: `translateX(calc(${index * 100}% + ${index * (4 / segments.length)}px))`,
          background: 'rgb(var(--segment-selected))',
          boxShadow: '0 3px 8px rgba(0,0,0,0.12), 0 3px 1px rgba(0,0,0,0.04)',
        }}
      />
      {segments.map((s) => {
        const active = s.value === value;
        return (
          <button
            key={s.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(s.value)}
            className={[
              'relative z-10 flex items-center justify-center gap-1.5 text-footnote transition-[font-weight]',
              active ? 'font-semibold text-text' : 'font-medium text-text',
            ].join(' ')}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}
