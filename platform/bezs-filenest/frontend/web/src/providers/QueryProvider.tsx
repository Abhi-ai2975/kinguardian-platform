/**
 * QueryProvider — TanStack Query client provider for the FileNest Console.
 *
 * Wraps the app with a QueryClient so any Client Component can use
 * useQuery / useMutation without configuring its own client.
 *
 * @module
 */
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

/**
 * Provides a stable QueryClient instance across re-renders.
 * The client is created once per component mount (not at module level)
 * so it is not shared between server renders.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
