/**
 * @file hooks/use-debounced-callback.ts
 * @description Stable debounced callback hook. Returns a debounced version of
 * the provided callback that delays invocation until after `delay` milliseconds
 * have elapsed since the last call. Uses a ref to avoid re-creating the
 * timeout on every render and ensures the latest callback is always called.
 * @layer shared/tables/hooks
 */

import * as React from "react";

/**
 * Returns a debounced version of `callback` that is delayed by `delay` ms.
 * The returned function is stable (same reference) across renders.
 *
 * @param callback - The function to debounce.
 * @param delay - Debounce delay in milliseconds.
 * @returns A debounced wrapper around `callback`.
 */
export function useDebouncedCallback<T extends (...args: never[]) => unknown>(
  callback: T,
  delay: number,
): (...args: Parameters<T>) => void {
  const callbackRef = React.useRef(callback);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    callbackRef.current = callback;
  });

  return React.useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay],
  );
}
