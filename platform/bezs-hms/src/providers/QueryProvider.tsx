/**
 * QueryProvider — application-wide TanStack Query client provider.
 *
 * Layer: providers (client)
 *
 * Must be a "use client" component because QueryClientProvider uses React
 * context. Wraps the entire component tree so any component can call
 * useQuery / useMutation / useQueryClient without needing its own provider.
 *
 * QueryClient config:
 *  - staleTime: 60 s — prevents duplicate background fetches within a minute
 *  - gcTime:    5 min — keeps cache entries in memory for 5 minutes after unmount
 *  - retry:     1     — one automatic retry on transient network errors
 */

"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

/**
 * Creates one QueryClient per component instance so each browser tab /
 * server render gets its own isolated cache (prevents cross-request data
 * leakage in SSR).
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

/**
 * Wraps children with a QueryClientProvider.
 * Place high in the tree — e.g. in the root layout.
 *
 * @param children - The React subtree that needs query context.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  /**
   * useState ensures the QueryClient is only created once per mount,
   * not recreated on every render. Using useState (not a module-level
   * singleton) keeps SSR-safe by giving each request its own client.
   */
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
