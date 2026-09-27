'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, BookOpen, ShoppingCart, Settings, Sparkles } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: typeof Calendar;
  match: (pathname: string) => boolean;
}

export function BottomNav({ currentWeek }: { currentWeek?: string }) {
  const pathname = usePathname();
  const items: NavItem[] = [
    {
      href: '/',
      label: 'Plan',
      icon: Calendar,
      match: (p) => p === '/',
    },
    {
      href: '/recipes',
      label: 'Recetas',
      icon: BookOpen,
      match: (p) => p.startsWith('/recipes'),
    },
    {
      href: currentWeek ? `/shopping?week=${currentWeek}` : '/shopping',
      label: 'Lista',
      icon: ShoppingCart,
      match: (p) => p.startsWith('/shopping'),
    },
    {
      href: '/chat',
      label: 'Chat',
      icon: Sparkles,
      match: (p) => p.startsWith('/chat'),
    },
    {
      href: '/settings',
      label: 'Ajustes',
      icon: Settings,
      match: (p) => p.startsWith('/settings'),
    },
  ];

  // iOS 26 tab bar: a floating Liquid Glass capsule inset from the screen
  // edges, with a tinted pill behind the selected tab.
  return (
    <nav
      data-bottom-nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 z-30 flex justify-center px-4 pointer-events-none"
      style={{ bottom: 'max(12px, calc(env(safe-area-inset-bottom) - 10px))' }}
    >
      <ul className="glass pointer-events-auto flex w-full max-w-md rounded-full p-1">
        {items.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <li key={item.label} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={[
                  'flex h-[54px] flex-col items-center justify-center gap-[3px] rounded-full',
                  'transition-colors duration-200 active:scale-95 active:transition-transform',
                  active ? 'bg-fill text-accent' : 'text-text',
                ].join(' ')}
              >
                <Icon size={22} strokeWidth={active ? 2.25 : 1.75} />
                <span className="text-[10px] font-semibold leading-none tracking-[0.1px]">
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
