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

export function Stepper({ value, onChange, min = 1, max = 20, step = 1, label, size = 'md' }: StepperProps) {
  const dim = size === 'lg' ? 'w-14 h-14 text-2xl' : 'w-12 h-12 text-xl';
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));

  return (
    <div className="flex items-center gap-3">
      {label && <span className="text-sm text-text-muted">{label}</span>}
      <div className="flex items-center gap-2 bg-surface-2 rounded-full p-1">
        <button
          type="button"
          aria-label="Disminuir"
          onClick={dec}
          disabled={value <= min}
          className={`${dim} rounded-full bg-surface flex items-center justify-center disabled:opacity-30 active:scale-95 transition-transform`}
        >
          <Minus size={20} />
        </button>
        <span className={`${size === 'lg' ? 'min-w-12' : 'min-w-10'} text-center font-semibold tabular-nums`}>
          {value}
        </span>
        <button
          type="button"
          aria-label="Aumentar"
          onClick={inc}
          disabled={value >= max}
          className={`${dim} rounded-full bg-accent text-white flex items-center justify-center disabled:opacity-30 active:scale-95 transition-transform`}
        >
          <Plus size={20} />
        </button>
      </div>
    </div>
  );
}
