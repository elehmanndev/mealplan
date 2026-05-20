'use client';

import dynamic from 'next/dynamic';

// Client-only wrapper for WeekView. The `@dnd-kit/core` library auto-increments
// a global counter (`DndDescribedBy-N`) for its screen-reader announcer; that
// counter desyncs between SSR and CSR, producing a React hydration warning on
// every plan card. The page is already `force-dynamic`, so there's no SEO loss
// from skipping SSR — and the drag handlers are useless until JS hydrates anyway.
export const WeekView = dynamic(
  () => import('./WeekView').then((m) => ({ default: m.WeekView })),
  { ssr: false },
);
