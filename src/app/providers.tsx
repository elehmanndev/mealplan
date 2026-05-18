'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense, useState, type ReactNode, useEffect } from 'react';
import { ToastProvider } from '@/components/ui/Toast';
import { PwaInstallBanner } from '@/components/ui/PwaInstallBanner';
import { OnboardingTour } from '@/components/ui/OnboardingTour';

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5_000,
            refetchOnWindowFocus: true,
          },
        },
      }),
  );

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);

  return (
    <QueryClientProvider client={client}>
      <ToastProvider>
        {children}
        <PwaInstallBanner />
        <Suspense fallback={null}>
          <OnboardingTour />
        </Suspense>
      </ToastProvider>
    </QueryClientProvider>
  );
}
