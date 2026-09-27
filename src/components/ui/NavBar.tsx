'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';

interface NavBarProps {
  title: string;
  /** SwiftUI `.navigationBarTitleDisplayMode(.large)`: big title below the bar that collapses on scroll. */
  large?: boolean;
  /** Back button: href + label shown next to the chevron (the previous screen's title). */
  back?: { href: string; label?: string };
  /** Trailing toolbar items (use NavBarButton). */
  trailing?: ReactNode;
  /** Leading items when there is no back button. */
  leading?: ReactNode;
  /**
   * Hide the inline title until this element scrolls under the bar — for
   * screens that render their own hero title (recipe detail).
   */
  revealTitleOnScrollPast?: string;
  /** Content pinned under the bar (search field, segmented control, chips). */
  bottom?: ReactNode;
}

/**
 * UINavigationBar. The inline title fades in once the large title scrolls
 * under the bar; the bar's glass background + hairline only appear once
 * content is scrolled beneath it (scrollEdgeAppearance is transparent).
 */
export function NavBar({ title, large = false, back, trailing, leading, bottom, revealTitleOnScrollPast }: NavBarProps) {
  const sentinel = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const el = revealTitleOnScrollPast
      ? document.getElementById(revealTitleOnScrollPast)
      : sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setScrolled(!e.isIntersecting), {
      // The bar itself is ~44px + safe area; trigger once the title passes it.
      rootMargin: '-60px 0px 0px 0px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, [revealTitleOnScrollPast]);

  const deferred = large || !!revealTitleOnScrollPast;
  const showInlineTitle = !deferred || scrolled;

  return (
    <>
      <header
        className={[
          'sticky top-0 z-20 safe-top transition-[background-color,border-color] duration-200',
          scrolled || !deferred ? 'glass-top' : 'border-b-[0.5px] border-transparent',
        ].join(' ')}
      >
        <div className="grid grid-cols-[1fr_auto_1fr] items-center h-11 px-2">
          <div className="flex items-center justify-start min-w-0">
            {back ? (
              <Link
                href={back.href}
                className="flex items-center h-11 pr-2 text-accent active:opacity-50 transition-opacity min-w-0"
              >
                <ChevronLeft size={28} strokeWidth={2.25} className="shrink-0 -ml-1" />
                {back.label && <span className="text-body truncate -ml-0.5">{back.label}</span>}
              </Link>
            ) : (
              leading
            )}
          </div>
          <h1
            className={[
              'text-headline truncate max-w-[60vw] text-center transition-opacity duration-200',
              showInlineTitle ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
            aria-hidden={deferred ? true : undefined}
          >
            {title}
          </h1>
          <div className="flex items-center justify-end gap-1">{trailing}</div>
        </div>
        {bottom && !large && <div className="pb-2">{bottom}</div>}
      </header>
      {large && (
        <div className="px-4 pt-1 pb-2">
          <h1 className="text-large-title truncate">{title}</h1>
          <div ref={sentinel} className="h-px" aria-hidden />
        </div>
      )}
      {large && bottom && <div className="pb-2">{bottom}</div>}
    </>
  );
}

/** Toolbar button: plain SF-symbol-sized glyph in tint color, 44pt hit target. */
export function NavBarButton({
  label,
  onClick,
  href,
  children,
}: {
  label: string;
  onClick?: () => void;
  href?: string;
  children: ReactNode;
}) {
  const cls =
    'w-11 h-11 flex items-center justify-center rounded-full text-accent active:opacity-50 transition-opacity';
  if (href) {
    return (
      <Link href={href} aria-label={label} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-label={label} className={cls}>
      {children}
    </button>
  );
}

/** UISearchBar / SwiftUI `.searchable`: grey rounded field with magnifier. */
export function SearchField({
  name,
  defaultValue,
  value,
  onChange,
  placeholder = 'Buscar',
  autoFocus,
}: {
  name?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="relative">
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="absolute left-2.5 top-1/2 -translate-y-1/2 w-[17px] h-[17px] text-text-muted pointer-events-none"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
      >
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m20 20-4.8-4.8" />
      </svg>
      <input
        type="search"
        name={name}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        placeholder={placeholder}
        autoFocus={autoFocus}
        enterKeyHint="search"
        className="w-full h-9 rounded-[10px] bg-fill pl-8 pr-3 text-body text-text placeholder:text-text-muted outline-none caret-accent [&::-webkit-search-cancel-button]:appearance-none"
      />
    </div>
  );
}

/** Filter chip (iOS 26 capsule, tinted when selected). */
export function Chip({
  active,
  children,
  href,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  href?: string;
  onClick?: () => void;
}) {
  const cls = [
    'shrink-0 inline-flex items-center gap-1 px-3.5 h-8 rounded-full text-subhead font-medium whitespace-nowrap transition-colors',
    active ? 'bg-accent text-white' : 'bg-fill text-text active:bg-[var(--fill-pressed)]',
  ].join(' ');
  if (href) {
    return (
      <Link href={href} className={cls} aria-pressed={active}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls} aria-pressed={active}>
      {children}
    </button>
  );
}
