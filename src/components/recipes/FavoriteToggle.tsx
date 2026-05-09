'use client';

import { useState, useTransition, type MouseEvent } from 'react';
import { Star } from 'lucide-react';
import { toggleFavoriteAction } from '@/actions/recipes';

interface FavoriteToggleProps {
  recipeId: number;
  initial: boolean;
}

export function FavoriteToggle({ recipeId, initial }: FavoriteToggleProps) {
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
      className="min-w-touch min-h-touch flex items-center justify-center rounded-full active:scale-95 transition-transform"
    >
      <Star
        size={22}
        strokeWidth={favorite ? 1.75 : 2.25}
        className={
          favorite
            ? 'fill-favorite text-favorite drop-shadow-[0_1px_2px_rgba(250,204,21,0.35)]'
            : 'text-text-muted/70'
        }
      />
    </button>
  );
}
