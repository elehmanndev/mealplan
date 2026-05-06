'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, BookOpen, ShoppingCart, Settings } from 'lucide-react';

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
      href: '/settings',
      label: 'Ajustes',
      icon: Settings,
      match: (p) => p.startsWith('/settings'),
    },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 glass-bottom safe-bottom">
      <ul className="flex">
        {items.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <li key={item.label} className="flex-1">
              <Link
                href={item.href}
                className={[
                  'flex flex-col items-center justify-center min-h-touch py-3 gap-1',
                  active ? 'text-accent' : 'text-text-muted',
                ].join(' ')}
              >
                <span className="w-6 h-6 flex items-center justify-center">
                  <Icon size={22} strokeWidth={2} />
                </span>
                <span className="text-xs font-medium leading-none">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
