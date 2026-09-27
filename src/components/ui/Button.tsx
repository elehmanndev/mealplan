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

// iOS button styles: primary = .borderedProminent (filled tint),
// secondary = .bordered (tinted grey fill + tint label), ghost = .plain,
// danger = destructive prominent.
const variantClasses: Record<Variant, string> = {
  primary: 'bg-accent text-white active:opacity-80',
  secondary: 'bg-fill text-accent active:bg-[var(--fill-pressed)]',
  ghost: 'bg-transparent text-accent active:opacity-50',
  danger: 'bg-danger text-white active:opacity-80',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-9 px-4 text-subhead',
  md: 'h-[50px] px-5 text-body',
  lg: 'h-14 px-6 text-body',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', fullWidth = false, className = '', children, ...rest },
  ref,
) {
  const classes = [
    'inline-flex items-center justify-center gap-2 rounded-full font-semibold',
    'transition-[opacity,transform,background-color] duration-150 active:scale-[0.97]',
    'disabled:opacity-40 disabled:pointer-events-none',
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
