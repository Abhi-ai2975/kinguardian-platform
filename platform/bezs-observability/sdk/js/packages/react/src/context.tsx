/**
 * React context that makes the Watcher Client available to any component in the tree.
 * Using context rather than a module-level singleton allows SSR and testing
 * to inject different clients without global state.
 */
import { createContext, useContext, type ReactNode } from "react";
import type { Client } from "@watcher/core";

const WatcherContext = createContext<Client | null>(null);

interface WatcherProviderProps {
  client: Client;
  children: ReactNode;
}

/** Wrap your application root with this provider to enable useWatcher() hooks. */
export function WatcherProvider({ client, children }: WatcherProviderProps) {
  return <WatcherContext.Provider value={client}>{children}</WatcherContext.Provider>;
}

/**
 * Returns the Watcher Client from context.
 * Throws if called outside a WatcherProvider — fail-fast to surface misconfiguration.
 */
export function useWatcher(): Client {
  const client = useContext(WatcherContext);
  if (client === null) {
    throw new Error("useWatcher must be called inside a <WatcherProvider>");
  }
  return client;
}
