"use client";
/**
 * Client-side exports for Next.js — use in Client Components only.
 * Re-exports the React context provider and hooks from @watcher/react
 * so app code only needs one import from @watcher/nextjs.
 *
 * The "use client" directive ensures bundlers tree-shake this from
 * the server bundle automatically.
 */
export {
  WatcherProvider,
  useWatcher,
  useAudit,
  useLog,
  useTrace,
  useMetric,
} from "@watcher/react";
