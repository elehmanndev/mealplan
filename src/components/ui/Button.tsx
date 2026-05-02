'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-blue-600 active:bg-blue-700',
  secondary: 'bg-surface-2 text-text hover:bg-neutral-700',
  ghost: 'bg-transparent text-text hover:bg-surface-2',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-10 px-3 text-sm',
  md: 'h-12 px-4 text-base',
  lg: 'h-14 px-6 text-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', fullWidth = false, className = '', children, ...rest },
  ref,
) {
  const classes = [
    'inline-flex items-center justify-center gap-2 rounded-full font-medium',
    'transition-all duration-150 active:scale-[0.98]',
    'disabled:opacity-50 disabled:pointer-events-none',
    'min-h-touch',
    variantClasses[variant],
    sizeClasses[size],
    fullWidth ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button ref={ref} className={classes} {...rest}>
      {children}
    </button>
  );
});
