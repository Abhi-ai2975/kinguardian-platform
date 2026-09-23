/**
 * useFileNestTokenFetcher — reusable hook that returns a stable tokenFetcher
 * callback for FileNestProvider.
 *
 * Layer: client / shared / hooks
 *
 * Instead of using tokenEndpoint (which always posts body: {}), this hook
 * returns a tokenFetcher that POSTs the full body to the token route:
 *   { filePath?, allowedMimeTypes?, maxSize (bytes), maxFiles, metadata?, userId?, orgId? }
 *
 * userId and orgId are optional — when provided they override the session-derived
 * values on the server, which is needed for cross-tenant or service-account uploads.
 *
 * The returned callback is stable across re-renders — options are read via a
 * ref so object/array identity changes don't trigger unnecessary re-mounts of
 * FileNestProvider, while the callback always reads the latest values at call time.
 *
 * Usage:
 *   const tokenFetcher = useFileNestTokenFetcher({
 *     filePath: "1234/profile",
 *     allowedMimeTypes: ["image/jpeg", "image/png"],
 *     maxSizeMb: 5,
 *     maxFiles: 1,
 *     metadata: { patientFhirId: 1234 },
 *     userId: "user_abc",
 *     orgId: "org_xyz",
 *   });
 *   <FileNestProvider tokenFetcher={tokenFetcher} ... />
 */

"use client";

import { useRef, useCallback } from "react";

/** Options accepted by useFileNestTokenFetcher. */
export interface FileNestTokenFetcherOptions {
  /** Token endpoint URL. Defaults to "/api/filenest-token". */
  endpoint?: string;
  /**
   * Full nested folder path, e.g. "1234/profile" or "1234/servicerequest/xray".
   * Takes priority over the route's legacy query-param path building.
   */
  filePath?: string;
  /** MIME types to whitelist. Omit to use the route's server-side defaults. */
  allowedMimeTypes?: string[];
  /** Max file size in megabytes. Converted to bytes before sending. Defaults to 5. */
  maxSizeMb?: number;
  /** Max number of files per upload token. Defaults to 1. */
  maxFiles?: number;
  /** Arbitrary metadata embedded in every file record by the route. */
  metadata?: Record<string, unknown>;
  /**
   * Auth user id to use as ownerUserId on the upload token.
   * Overrides the session-derived value on the server — pass when the upload
   * needs to be attributed to a specific user (e.g. admin acting on behalf of a patient).
   */
  userId?: string;
  /**
   * Organisation id to use as ownerOrgId on the upload token.
   * Overrides the session-derived value on the server.
   */
  orgId?: string;
}

/**
 * Returns a stable async tokenFetcher for FileNestProvider.
 * Options are always read at call time via a ref — safe to pass inline objects.
 *
 * @param options - Token request configuration.
 * @returns A stable async function that POSTs to the token endpoint and returns { token, expiresAt }.
 */
export function useFileNestTokenFetcher(
  options: FileNestTokenFetcherOptions,
): () => Promise<{ token: string; expiresAt: string }> {
  /**
   * Ref keeps the latest options without making the callback unstable.
   * FileNestProvider won't remount on every render even when options are inline objects.
   */
  const optionsRef = useRef(options);
  optionsRef.current = options;

  return useCallback(async (): Promise<{ token: string; expiresAt: string }> => {
    const {
      endpoint = "/api/filenest-token",
      filePath,
      allowedMimeTypes,
      maxSizeMb = 5,
      maxFiles = 1,
      metadata,
      userId,
      orgId,
    } = optionsRef.current;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(filePath ? { filePath } : {}),
        ...(allowedMimeTypes?.length ? { allowedMimeTypes } : {}),
        maxSize: maxSizeMb * 1024 * 1024,
        maxFiles,
        ...(metadata ? { metadata } : {}),
        ...(userId ? { userId } : {}),
        ...(orgId ? { orgId } : {}),
      }),
    });

    if (!res.ok) {
      throw new Error(`FileNest token endpoint returned ${res.status}`);
    }

    return res.json() as Promise<{ token: string; expiresAt: string }>;
  }, []); // stable — latest options are always read via optionsRef
}
