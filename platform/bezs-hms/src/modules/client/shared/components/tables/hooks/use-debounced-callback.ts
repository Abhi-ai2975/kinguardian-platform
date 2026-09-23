/**
 * @file use-debounced-callback.ts
 * @description React hook that returns a debounced version of the given
 * callback. Useful for delaying filter updates while the user is still typing.
 * @layer shared/tables/hooks
 */

"use client";

import * as React from "react";

/**
 * Returns a stable debounced wrapper around `callback` that fires only after
 * `delay` milliseconds have elapsed without a new call.
 *
 * @param callback - The function to debounce. Re-assigned via ref so callers
 *   don't need to memoize it.
 * @param delay - Debounce delay in milliseconds.
 * @returns A stable callback reference that is safe to pass as an event handler.
 */
export function useDebouncedCallback<T extends (...args: never[]) => unknown>(
  callback: T,
  delay: number,
): (...args: Parameters<T>) => void {
  // Assign the latest callback directly during render — safe because mutating
  // a ref never triggers a re-render, and React 18 Strict Mode flags
  // useLayoutEffect-without-deps as a "side-effect before mount" warning.
  const callbackRef = React.useRef(callback);
  callbackRef.current = callback;

  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

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
