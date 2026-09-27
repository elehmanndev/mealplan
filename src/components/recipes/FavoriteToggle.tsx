'use client';

import { useState, useTransition, type MouseEvent } from 'react';
import { Star } from 'lucide-react';
import { toggleFavoriteAction } from '@/actions/recipes';

interface FavoriteToggleProps {
  recipeId: number;
  initial: boolean;
  /** Small glass disc for overlaying on cards. */
  compact?: boolean;
}

export function FavoriteToggle({ recipeId, initial, compact = false }: FavoriteToggleProps) {
  const [favorite, setFavorite] = useState(initial);
  const [isPending, startTransition] = useTransition();

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !favorite;
    setFavorite(next);
    startTransition(async () => {
      try {
        await toggleFavoriteAction(recipeId);
      } catch {
        setFavorite(!next);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={favorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
      aria-pressed={favorite}
      className={[
        'flex items-center justify-center rounded-full active:scale-90 transition-transform',
        compact ? 'w-8 h-8 glass' : 'w-11 h-11',
      ].join(' ')}
    >
      <Star
        size={compact ? 16 : 22}
        strokeWidth={2.25}
        className={favorite ? 'fill-favorite text-favorite' : compact ? 'text-text-muted' : 'text-accent'}
      />
    </button>
  );
}
