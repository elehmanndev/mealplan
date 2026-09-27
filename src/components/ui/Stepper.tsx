'use client';

import { Minus, Plus } from 'lucide-react';

interface StepperProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  size?: 'md' | 'lg';
}

/**
 * UIStepper-style control: a single grey capsule split by a hairline, with
 * the current value shown beside it (the way Settings/Health pair them).
 */
export function Stepper({ value, onChange, min = 1, max = 20, step = 1, label, size = 'md' }: StepperProps) {
  const lg = size === 'lg';
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));
  const segment = [
    lg ? 'w-14 h-11' : 'w-12 h-9',
    'flex items-center justify-center text-text disabled:text-text-tertiary active:bg-[var(--fill-pressed)] transition-colors',
  ].join(' ');

  return (
    <div className="flex items-center gap-3">
      {label && <span className="text-subhead text-text-muted">{label}</span>}
      <span
        className={[
          'text-center font-semibold tabular-nums',
          lg ? 'min-w-12 text-title2' : 'min-w-8 text-headline',
        ].join(' ')}
        aria-live="polite"
      >
        {value}
      </span>
      <div className="flex items-center rounded-[9px] bg-fill overflow-hidden">
        <button type="button" aria-label="Disminuir" onClick={dec} disabled={value <= min} className={segment}>
          <Minus size={lg ? 20 : 18} strokeWidth={2.5} />
        </button>
        <span aria-hidden className="w-px h-5 bg-separator" />
        <button type="button" aria-label="Aumentar" onClick={inc} disabled={value >= max} className={segment}>
          <Plus size={lg ? 20 : 18} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
