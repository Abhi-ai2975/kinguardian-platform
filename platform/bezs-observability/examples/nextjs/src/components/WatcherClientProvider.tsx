"use client";
// WatcherClientProvider — thin client boundary that mounts WatcherProvider.
// Needed because root layout is a Server Component; WatcherProvider requires
// "use client" context so it lives here and is imported into the layout.
import { WatcherProvider } from "@watcher/nextjs/client";
import { watcherBrowserClient } from "@/lib/watcher-browser";

export function WatcherClientProvider({ children }: { children: React.ReactNode }) {
  return <WatcherProvider client={watcherBrowserClient}>{children}</WatcherProvider>;
}
