/**
 * Convenience hooks that pre-bind typed Client methods from context.
 * Saves components from destructuring the client on every use.
 */
import type { CaptureOptions } from "@watcher/core";
import { useWatcher } from "./context.js";

/** Returns a pre-bound client.audit() function. */
export function useAudit() {
  const client = useWatcher();
  return (message: string, options?: CaptureOptions) => client.audit(message, options);
}

/** Returns a pre-bound client.log() function. */
export function useLog() {
  const client = useWatcher();
  return (severity: string, message: string, options?: Omit<CaptureOptions, "userId" | "sessionId">) =>
    client.log(severity, message, options);
}

/** Returns a pre-bound client.trace() function. */
export function useTrace() {
  const client = useWatcher();
  return (message: string, options?: CaptureOptions) => client.trace(message, options);
}

/** Returns a pre-bound client.metric() function. */
export function useMetric() {
  const client = useWatcher();
  return (message: string, options?: Pick<CaptureOptions, "payload">) => client.metric(message, options);
}
