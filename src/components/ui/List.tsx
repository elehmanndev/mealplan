import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';

/**
 * SwiftUI `List { Section }` with `.listStyle(.insetGrouped)`: sentence-case
 * footnote header, rounded white group, hairline separators inset to the
 * text column, optional footer.
 */
export function ListSection({
  header,
  footer,
  children,
  className = '',
}: {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={['flex flex-col', className].join(' ')}>
      {header && <h2 className="px-4 pb-[7px] text-footnote text-text-muted">{header}</h2>}
      <div className="list-group rounded-cell bg-surface overflow-hidden">{children}</div>
      {footer && <p className="px-4 pt-[7px] text-footnote text-text-muted">{footer}</p>}
    </section>
  );
}

type IconType = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

interface ListRowProps {
  /** SF Symbols-style glyph rendered white on a rounded tinted square (Settings.app). */
  icon?: IconType;
  /** CSS color for the icon tile, e.g. `rgb(var(--accent))` or '#FF9500'. */
  iconBg?: string;
  /** Emoji/avatar/custom leading view in place of `icon`. */
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Trailing secondary value (e.g. "4 pax"). */
  value?: ReactNode;
  /** Trailing control (switch, stepper) — replaces value + chevron. */
  accessory?: ReactNode;
  destructive?: boolean;
  href?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  chevron?: boolean;
}

export function ListRow({
  icon: Icon,
  iconBg = 'rgb(var(--accent))',
  leading,
  title,
  subtitle,
  value,
  accessory,
  destructive = false,
  href,
  onClick,
  type = 'button',
  disabled,
  chevron,
}: ListRowProps) {
  const interactive = !!href || !!onClick || type === 'submit';
  const showChevron = chevron ?? (!!href && !accessory);

  const body = (
    <>
      {Icon ? (
        <span
          className="w-[30px] h-[30px] shrink-0 rounded-[8px] flex items-center justify-center text-white"
          style={{ background: destructive ? 'rgb(var(--danger))' : iconBg }}
        >
          <Icon size={18} strokeWidth={2.25} />
        </span>
      ) : (
        leading && <span className="shrink-0 flex items-center">{leading}</span>
      )}
      <span className="list-row-content flex-1 min-w-0 flex items-center gap-3 self-stretch py-[11px] pr-4">
        <span className="flex-1 min-w-0">
          <span className={['block text-body truncate', destructive ? 'text-danger' : 'text-text'].join(' ')}>
            {title}
          </span>
          {subtitle && <span className="block text-footnote text-text-muted truncate">{subtitle}</span>}
        </span>
        {accessory ?? (value != null && <span className="text-body text-text-muted shrink-0 tabular-nums">{value}</span>)}
        {showChevron && <ChevronRight size={17} strokeWidth={2.5} className="shrink-0 text-text-tertiary -mr-1" />}
      </span>
    </>
  );

  const cls = [
    'list-row w-full min-h-[44px] flex items-center gap-3 pl-4 text-left',
    interactive ? 'pressable' : '',
    disabled ? 'opacity-40 pointer-events-none' : '',
  ].join(' ');

  if (href) {
    return (
      <Link href={href} onClick={onClick} className={cls}>
        {body}
      </Link>
    );
  }
  if (interactive) {
    return (
      <button type={type} onClick={onClick} disabled={disabled} className={cls}>
        {body}
      </button>
    );
  }
  return <div className={cls}>{body}</div>;
}
