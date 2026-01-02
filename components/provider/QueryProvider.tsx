'use client';

import { useState, useEffect, ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

export default function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 10,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            refetchOnMount: false,
            gcTime: 1000 * 60 * 60 * 24,
          },
        },
      })
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const persister = createSyncStoragePersister({
      storage: window.localStorage,
    });

    persistQueryClient({
      queryClient,
      persister,
    });
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}