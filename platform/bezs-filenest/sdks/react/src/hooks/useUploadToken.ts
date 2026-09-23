/**
 * @filenest/react hooks/useUploadToken — reactive upload token state.
 *
 * Returns the current cached token, loading state, and a `refresh()` function
 * that forces a new fetch from the token endpoint regardless of expiry.
 *
 * Useful when `fetchInitialToken=false` on the provider (manual token mode)
 * or when you need to display token metadata in your UI.
 *
 * @module
 */

import { useFileNest } from "../context/FileNestContext.js";

export interface UseUploadTokenResult {
  /** Current cached token string, or null if not yet fetched. */
  token: string | null;
  /** True while a token fetch is in-flight. */
  isLoading: boolean;
  /** Last fetch error, or null if the last fetch succeeded. */
  error: Error | null;
  /**
   * Force-fetch a fresh token from the endpoint.
   * Returns the new token string. Clears the cache first.
   */
  refresh: () => Promise<string>;
}

export function useUploadToken(): UseUploadTokenResult {
  const { token, isTokenLoading, tokenError, getToken } = useFileNest();
  return {
    token,
    isLoading: isTokenLoading,
    error: tokenError,
    refresh: getToken,
  };
}
