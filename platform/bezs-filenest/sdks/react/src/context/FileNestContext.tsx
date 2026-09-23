/**
 * @filenest/react context/FileNestContext — configurable provider and context for the React SDK.
 *
 * Supports three tiers of usage:
 *   Tier 1 — Drop-in components: <FileUpload />, <FilePreview />, <FileViewer />
 *   Tier 2 — Managed hooks: useUpload(), useFiles(), useFolder(), useSearch()
 *   Tier 3 — Raw imperative methods: useFileNest() → upload(), listFiles(), createFolder(), ...
 *
 * Token behaviour is fully configurable via `fetchInitialToken`, `tokenFetcher`,
 * `tokenRefreshBuffer`, and `tokenRetry` props.
 *
 * @module
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type {
  FileRecord,
  Folder,
  ListResponse,
  SearchFacets,
  SearchFilters,
  SearchHit,
  UploadProgress,
  UploadToken,
} from "@filenest/core";

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface InitUploadOptions {
  filename: string;
  contentType?: string;
  sizeBytes: number;
  folderId?: string | null;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export interface InitUploadResult {
  fileId: string;
  uploadUrl: string;
  expiresAt: string;
}

export interface UploadToStorageOptions {
  onProgress?: (p: UploadProgress) => void;
}

export interface ConfirmUploadResult {
  id: string;
  status: string;
}

export interface UploadOptions {
  folderId?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  onProgress?: (p: UploadProgress) => void;
}

export interface FileListFilters {
  folderId?: string | null;
  mimeType?: string;
  status?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  metadata?: Record<string, string>;
}

export interface FileUpdateOptions {
  filename?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface DownloadUrlOptions {
  ttl?: number;
  disposition?: "inline" | "attachment";
}

export interface DownloadUrlResult {
  url: string;
  expiresAt: string;
}

export interface FolderListOptions {
  parentFolderId?: string | null;
  name?: string;
  limit?: number;
  offset?: number;
}

export interface CreateFolderOptions {
  name: string;
  parentFolderId?: string | null;
}

export interface SearchQuery {
  q?: string;
  filters?: SearchFilters;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface SearchResults {
  hits: SearchHit[];
  total: number;
  facets?: SearchFacets;
  queryTimeMs: number;
}

// ── Context value ─────────────────────────────────────────────────────────────

export interface FileNestContextValue {
  // Config
  projectId: string;
  baseUrl: string;
  debug: boolean;
  tokenEndpoint: string;

  // Token state (reactive)
  token: string | null;
  isTokenLoading: boolean;
  tokenError: Error | null;
  isReady: boolean;

  // Token methods
  getToken: () => Promise<string>;

  // Upload — individual steps (Tier 3 headless)
  initUpload: (options: InitUploadOptions) => Promise<InitUploadResult>;
  uploadToStorage: (url: string, file: File | Blob, options?: UploadToStorageOptions) => Promise<void>;
  confirmUpload: (fileId: string) => Promise<ConfirmUploadResult>;

  // Upload — combined 3-step flow (Tier 2 / Tier 3)
  upload: (file: File, options?: UploadOptions) => Promise<FileRecord>;

  // Files
  listFiles: (filters?: FileListFilters) => Promise<ListResponse<FileRecord>>;
  getFile: (fileId: string) => Promise<FileRecord>;
  deleteFile: (fileId: string) => Promise<void>;
  updateFile: (fileId: string, options: FileUpdateOptions) => Promise<FileRecord>;
  getDownloadUrl: (fileId: string, options?: DownloadUrlOptions) => Promise<DownloadUrlResult>;

  // Folders
  listFolders: (options?: FolderListOptions) => Promise<ListResponse<Folder>>;
  createFolder: (options: CreateFolderOptions) => Promise<Folder>;
  getFolder: (folderId: string) => Promise<Folder>;
  getFolderByPath: (path: string) => Promise<Folder | null>;
  deleteFolder: (folderId: string) => Promise<void>;
  ensurePath: (path: string) => Promise<Folder>;

  // Search
  search: (query: SearchQuery) => Promise<SearchResults>;
}

const FileNestContext = createContext<FileNestContextValue | null>(null);

// ── Provider props ────────────────────────────────────────────────────────────

export interface FileNestProviderProps {
  projectId: string;
  /**
   * Base URL of the FileNest backend (e.g. "https://api.filenest.io").
   * Defaults to "" (same origin).
   */
  baseUrl?: string;

  /**
   * URL of your server-side token endpoint. The provider will POST to this
   * URL to obtain short-lived upload tokens.
   * Use this OR `tokenFetcher` — not both.
   */
  tokenEndpoint?: string;

  /**
   * Custom async function that fetches and returns an upload token.
   * Use when you need custom headers, auth, or a non-standard endpoint shape.
   * Use this OR `tokenEndpoint` — not both.
   */
  tokenFetcher?: () => Promise<{ token: string; expiresAt: string }>;

  /**
   * If true (default), fetch a token on mount and schedule auto-refresh.
   * If false, no token is fetched until `getToken()` is called manually.
   */
  fetchInitialToken?: boolean;

  /**
   * Seconds before token expiry to proactively refresh. Default: 60.
   */
  tokenRefreshBuffer?: number;

  /**
   * Number of retry attempts on token fetch failure. Default: 3.
   */
  tokenRetry?: number;

  /**
   * Bring your own TanStack Query client. If omitted, the provider creates
   * an internal one. Use this when your app already wraps with QueryClientProvider.
   */
  queryClient?: QueryClient;

  debug?: boolean;
  children: React.ReactNode;
}

// ── Default QueryClient (used when none is provided) ──────────────────────────

const defaultQueryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 2 } },
});

// ── Provider ──────────────────────────────────────────────────────────────────

export function FileNestProvider({
  projectId,
  baseUrl = "",
  tokenEndpoint = "",
  tokenFetcher,
  fetchInitialToken = true,
  tokenRefreshBuffer = 60,
  tokenRetry = 3,
  queryClient,
  debug = false,
  children,
}: FileNestProviderProps) {
  const api = baseUrl.replace(/\/$/, "");

  // ── Token state ─────────────────────────────────────────────────────────────
  const [token, setToken] = useState<string | null>(null);
  const [isTokenLoading, setIsTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState<Error | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Internal refs — not reactive, used by stable callbacks
  const tokenRef = useRef<{ token: string; expiresAt: number } | null>(null);
  const inflightRef = useRef<Promise<string> | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Raw token fetch (with retry) ─────────────────────────────────────────────
  const doFetch = useCallback(async (): Promise<{ token: string; expiresAt: string }> => {
    if (tokenFetcher) return tokenFetcher();
    if (tokenEndpoint) {
      const res = await fetch(tokenEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(`Token endpoint returned ${res.status}`);
      return res.json() as Promise<{ token: string; expiresAt: string }>;
    }
    return { token: "", expiresAt: new Date(Date.now() + 3600_000).toISOString() };
  }, [tokenEndpoint, tokenFetcher]);

  const fetchToken = useCallback(async (): Promise<string> => {
    let attempt = 0;
    let lastErr: Error = new Error("Unknown error");
    while (attempt < tokenRetry) {
      try {
        const data = await doFetch();
        const expiresAt = new Date(data.expiresAt).getTime();
        tokenRef.current = { token: data.token, expiresAt };
        setToken(data.token);
        setTokenError(null);

        // Schedule proactive refresh
        const ttl = expiresAt - Date.now() - tokenRefreshBuffer * 1000;
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        if (ttl > 0) {
          refreshTimerRef.current = setTimeout(() => {
            fetchToken().catch((e) => {
              if (debug) console.error("[FileNest] Token refresh failed:", e);
            });
          }, ttl);
        }
        return data.token;
      } catch (err) {
        lastErr = err instanceof Error ? err : new Error(String(err));
        attempt++;
        if (attempt < tokenRetry) await sleep(attempt * 500);
      }
    }
    setTokenError(lastErr);
    if (debug) console.error("[FileNest] Token fetch failed after retries:", lastErr);
    throw lastErr;
  }, [doFetch, tokenRetry, tokenRefreshBuffer, debug]);

  // ── getToken — deduplicates concurrent calls ──────────────────────────────────
  const getToken = useCallback(async (): Promise<string> => {
    const cached = tokenRef.current;
    if (cached && cached.expiresAt - Date.now() > tokenRefreshBuffer * 1000) {
      return cached.token;
    }
    // Deduplicate: if a fetch is already in-flight, await the same promise
    if (inflightRef.current) return inflightRef.current;
    setIsTokenLoading(true);
    const p = fetchToken().finally(() => {
      inflightRef.current = null;
      setIsTokenLoading(false);
    });
    inflightRef.current = p;
    return p;
  }, [fetchToken, tokenRefreshBuffer]);

  // ── Initial fetch on mount ────────────────────────────────────────────────────
  useEffect(() => {
    if (!fetchInitialToken) {
      setIsReady(true);
      return;
    }
    getToken()
      .then(() => setIsReady(true))
      .catch(() => setIsReady(true)); // still "ready" even if token fails — methods will throw per-call
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — intentionally run once

  // ── Internal callApi helper ──────────────────────────────────────────────────
  const callApi = useCallback(
    async <T,>(
      method: string,
      path: string,
      options?: {
        body?: unknown;
        params?: Record<string, string | number | boolean | undefined>;
      }
    ): Promise<T> => {
      const tok = await getToken();
      const url = buildUrl(`${api}/v1/projects/${projectId}${path}`, options?.params);
      const headers: Record<string, string> = {
        Authorization: `Bearer ${tok}`,
      };
      if (options?.body !== undefined) headers["Content-Type"] = "application/json";

      const doRequest = async (authToken: string): Promise<Response> =>
        fetch(url, {
          method,
          headers: { ...headers, Authorization: `Bearer ${authToken}` },
          ...(options?.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
        });

      let res = await doRequest(tok);

      // On 401 — clear cache, refresh token once, retry
      if (res.status === 401) {
        tokenRef.current = null;
        const freshToken = await fetchToken();
        res = await doRequest(freshToken);
      }

      if (res.status === 204) return undefined as T;
      if (!res.ok) {
        let message = `${method} ${path} failed: ${res.statusText}`;
        try {
          const errBody = (await res.json()) as { message?: string };
          if (errBody.message) message = errBody.message;
        } catch { /* ignore */ }
        const err = new Error(message);
        (err as Error & { status: number }).status = res.status;
        throw err;
      }
      return res.json() as Promise<T>;
    },
    [getToken, fetchToken, api, projectId]
  );

  // ── Upload methods ───────────────────────────────────────────────────────────

  const initUpload = useCallback(
    async (opts: InitUploadOptions): Promise<InitUploadResult> => {
      const raw = await callApi<{ file_id: string; upload_url: string; expires_at: string }>(
        "POST",
        "/files/upload",
        {
          body: {
            filename: opts.filename,
            content_type: opts.contentType || "application/octet-stream",
            size_bytes: opts.sizeBytes,
            folder_id: opts.folderId ?? null,
            metadata: opts.metadata ?? {},
            tags: opts.tags ?? [],
          },
        }
      );
      return { fileId: raw.file_id, uploadUrl: raw.upload_url, expiresAt: raw.expires_at };
    },
    [callApi]
  );

  const uploadToStorage = useCallback(
    async (url: string, file: File | Blob, opts: UploadToStorageOptions = {}): Promise<void> => {
      const contentType = file instanceof File ? file.type || "application/octet-stream" : "application/octet-stream";
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && opts.onProgress) {
            opts.onProgress({
              bytesUploaded: e.loaded,
              totalBytes: e.total,
              percentage: Math.round((e.loaded / e.total) * 100),
              chunkNumber: 1,
              totalChunks: 1,
            });
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Storage upload failed: ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error("Network error during storage upload"));
        xhr.open("PUT", url);
        xhr.setRequestHeader("Content-Type", contentType);
        xhr.send(file);
      });
    },
    []
  );

  const confirmUpload = useCallback(
    async (fileId: string): Promise<ConfirmUploadResult> =>
      callApi<ConfirmUploadResult>("POST", `/files/${fileId}/confirm`),
    [callApi]
  );

  const upload = useCallback(
    async (file: File, opts: UploadOptions = {}): Promise<FileRecord> => {
      const { fileId, uploadUrl } = await initUpload({
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        folderId: opts.folderId,
        metadata: opts.metadata,
        tags: opts.tags,
      });
      await uploadToStorage(uploadUrl, file, { onProgress: opts.onProgress });
      await confirmUpload(fileId);
      return callApi<FileRecord>("GET", `/files/${fileId}`);
    },
    [initUpload, uploadToStorage, confirmUpload, callApi]
  );

  // ── File methods ─────────────────────────────────────────────────────────────

  const listFiles = useCallback(
    async (filters: FileListFilters = {}): Promise<ListResponse<FileRecord>> => {
      return callApi<ListResponse<FileRecord>>("GET", "/files", {
        params: {
          folder_id: filters.folderId !== undefined ? (filters.folderId ?? "root") : undefined,
          mime_type: filters.mimeType,
          status: filters.status,
          sort_by: filters.sortBy,
          sort_order: filters.sortOrder,
          limit: filters.limit,
          offset: filters.offset,
          tags: filters.tags?.join(","),
          metadata: filters.metadata ? JSON.stringify(filters.metadata) : undefined,
        },
      });
    },
    [callApi]
  );

  const getFile = useCallback(
    async (fileId: string): Promise<FileRecord> =>
      callApi<FileRecord>("GET", `/files/${fileId}`),
    [callApi]
  );

  const deleteFile = useCallback(
    async (fileId: string): Promise<void> =>
      callApi<void>("DELETE", `/files/${fileId}`),
    [callApi]
  );

  const updateFile = useCallback(
    async (fileId: string, opts: FileUpdateOptions): Promise<FileRecord> =>
      callApi<FileRecord>("PATCH", `/files/${fileId}`, { body: opts }),
    [callApi]
  );

  const getDownloadUrl = useCallback(
    async (fileId: string, opts: DownloadUrlOptions = {}): Promise<DownloadUrlResult> =>
      callApi<DownloadUrlResult>("GET", `/files/${fileId}/download`, {
        params: { ttl: opts.ttl, disposition: opts.disposition },
      }),
    [callApi]
  );

  // ── Folder methods ───────────────────────────────────────────────────────────

  const listFolders = useCallback(
    async (opts: FolderListOptions = {}): Promise<ListResponse<Folder>> =>
      callApi<ListResponse<Folder>>("GET", "/folders", {
        params: {
          parent_folder_id: opts.parentFolderId ?? undefined,
          name: opts.name,
          limit: opts.limit,
          offset: opts.offset,
        },
      }),
    [callApi]
  );

  const createFolder = useCallback(
    async (opts: CreateFolderOptions): Promise<Folder> =>
      callApi<Folder>("POST", "/folders", {
        body: { name: opts.name, parent_folder_id: opts.parentFolderId ?? null },
      }),
    [callApi]
  );

  const getFolder = useCallback(
    async (folderId: string): Promise<Folder> =>
      callApi<Folder>("GET", `/folders/${folderId}`),
    [callApi]
  );

  const getFolderByPath = useCallback(
    async (path: string): Promise<Folder | null> => {
      try {
        return await callApi<Folder>("GET", "/folders/by-path", {
          params: { path },
        });
      } catch (err) {
        if ((err as Error & { status?: number }).status === 404) return null;
        throw err;
      }
    },
    [callApi]
  );

  const deleteFolder = useCallback(
    async (folderId: string): Promise<void> =>
      callApi<void>("DELETE", `/folders/${folderId}`),
    [callApi]
  );

  const ensurePath = useCallback(
    async (path: string): Promise<Folder> =>
      callApi<Folder>("POST", "/folders/ensure-path", { body: { path } }),
    [callApi]
  );

  // ── Search ───────────────────────────────────────────────────────────────────

  const search = useCallback(
    async (query: SearchQuery): Promise<SearchResults> => {
      const t0 = Date.now();
      const data = await callApi<{ hits: SearchHit[]; total: number; facets?: SearchFacets }>(
        "POST",
        "/search",
        { body: { ...query, limit: query.limit ?? 20 } }
      );
      return { ...data, queryTimeMs: Date.now() - t0 };
    },
    [callApi]
  );

  // ── Context value ────────────────────────────────────────────────────────────

  const value: FileNestContextValue = {
    projectId,
    baseUrl: api,
    debug,
    tokenEndpoint,
    token,
    isTokenLoading,
    tokenError,
    isReady,
    getToken,
    initUpload,
    uploadToStorage,
    confirmUpload,
    upload,
    listFiles,
    getFile,
    deleteFile,
    updateFile,
    getDownloadUrl,
    listFolders,
    createFolder,
    getFolder,
    getFolderByPath,
    deleteFolder,
    ensurePath,
    search,
  };

  const qc = queryClient ?? defaultQueryClient;

  return (
    <QueryClientProvider client={qc}>
      <FileNestContext.Provider value={value}>
        {children}
      </FileNestContext.Provider>
    </QueryClientProvider>
  );
}

export function useFileNest(): FileNestContextValue {
  const ctx = useContext(FileNestContext);
  if (!ctx) throw new Error("useFileNest must be used inside <FileNestProvider>");
  return ctx;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function buildUrl(base: string, params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return base;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) qs.set(k, String(v));
  }
  const str = qs.toString();
  return str ? `${base}?${str}` : base;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// Re-export UploadToken so consumers can type the token endpoint response
export type { UploadToken };
