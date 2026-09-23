# FileNest — SDK Headless & Configurable Provider Plan

**Scope:** `@filenest/react` — full redesign of `FileNestProvider` and `FileNestContext`  
**Status:** 🔄 In Progress  
**Goal:** `@filenest/react` works as a headless SDK with three tiers — components, hooks, and raw imperative methods. Everything is configurable. Developers can build fully custom UI without touching a single FileNest component.

---

## Design Tiers

```
Tier 1 — Components    <FileUpload />  <FilePreview />  <FileViewer />
Tier 2 — Hooks         useUpload()  useFiles()  useFolder()  useSearch()  useUploadToken()
Tier 3 — Raw methods   useFileNest() → upload()  initUpload()  listFiles()  createFolder()  search()  ...
```

All three tiers are powered by one configurable `<FileNestProvider>`. Developers pick the tier that fits.

---

## Step 1 — Rewrite `FileNestProvider` props ✅ COMPLETED

**File:** `sdks/react/src/context/FileNestContext.tsx`

Expand `FileNestProviderProps`:

```typescript
export interface FileNestProviderProps {
  projectId: string;
  baseUrl?: string;                    // default: ""

  // Token source — one of:
  tokenEndpoint?: string;              // URL; provider POSTs to it
  tokenFetcher?: () => Promise<{ token: string; expiresAt: string }>;  // custom fn

  // Token behaviour
  fetchInitialToken?: boolean;         // default: true — fetch on mount + auto-refresh
  tokenRefreshBuffer?: number;         // seconds before expiry to proactively refresh (default: 60)
  tokenRetry?: number;                 // retry attempts on failure (default: 3)

  // TanStack Query
  queryClient?: QueryClient;           // BYO; provider creates a default if omitted

  // Debug
  debug?: boolean;

  children: React.ReactNode;
}
```

**Rules:**
- If neither `tokenEndpoint` nor `tokenFetcher` is given → provider works without auth (API key flow, e.g. Node SDK wrapping)
- `fetchInitialToken=false` → no token fetched on mount; developer calls `getToken()` manually
- `queryClient` prop allows BYO TanStack Query instance so the provider doesn't double-wrap apps that already have one

---

## Step 2 — Internal `TokenManager` ✅ COMPLETED

**File:** `sdks/react/src/context/FileNestContext.tsx` (internal, not exported)

A ref-based token manager inside the provider:

- Stores `{ token: string; expiresAt: number } | null` in a ref
- Deduplicates concurrent `getToken()` calls — if a fetch is already in-flight, all callers await the same promise (not N parallel requests)
- Retry with backoff up to `tokenRetry` attempts
- If `fetchInitialToken=true`: starts auto-refresh timer `(expiresAt - now - tokenRefreshBuffer * 1000)` ms from now
- Exposes reactive state: `token: string | null`, `isTokenLoading: boolean`, `tokenError: Error | null` via `useState`

Token fetch priority:
1. If `tokenFetcher` is provided → call it
2. Else if `tokenEndpoint` is provided → `POST tokenEndpoint` with `{ "Content-Type": "application/json" }`
3. Else → return empty string (dev has no token source configured)

---

## Step 3 — Internal `callApi` helper ✅ COMPLETED

**File:** `sdks/react/src/context/FileNestContext.tsx` (internal, not exported)

```typescript
callApi<T>(method: string, path: string, options?: {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}): Promise<T>
```

- Prepends `${baseUrl}/v1/projects/${projectId}${path}`
- Calls `getToken()` → attaches `Authorization: Bearer <token>`
- On `401` → clears cached token, fetches fresh, retries the request once
- On `204` → returns `undefined as T`
- On non-2xx → throws `Error` with status + statusText
- Builds query string from `params`, skipping `undefined` values

---

## Step 4 — Expand `FileNestContextValue` with all low-level methods ✅ COMPLETED

**File:** `sdks/react/src/context/FileNestContext.tsx`

```typescript
export interface FileNestContextValue {
  // Config (read-only)
  projectId: string;
  baseUrl: string;
  debug: boolean;

  // Token state (reactive)
  token: string | null;
  isTokenLoading: boolean;
  tokenError: Error | null;
  getToken: () => Promise<string>;

  // Upload — individual steps
  initUpload: (options: InitUploadOptions) => Promise<InitUploadResult>;
  uploadToStorage: (url: string, file: File | Blob, options?: UploadToStorageOptions) => Promise<void>;
  confirmUpload: (fileId: string) => Promise<ConfirmUploadResult>;

  // Upload — combined (all 3 steps)
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
  getFolderByPath: (path: string) => Promise<Folder | null>;   // returns null on 404
  deleteFolder: (folderId: string) => Promise<void>;
  ensurePath: (path: string) => Promise<Folder>;

  // Search
  search: (query: SearchQuery) => Promise<SearchResults>;

  // Legacy compat
  isReady: boolean;
  tokenEndpoint: string;
}
```

All methods are `useCallback`-wrapped with stable refs so hooks can use them as TanStack Query fetchers without causing re-render loops.

**Interfaces to add (in the same file):**

```typescript
InitUploadOptions  { filename, contentType, sizeBytes, folderId?, metadata?, tags? }
InitUploadResult   { fileId, uploadUrl, expiresAt }
UploadToStorageOptions { onProgress?: (p: UploadProgress) => void }
ConfirmUploadResult  { id, status }
UploadOptions      { folderId?, metadata?, tags?, onProgress? }
FileListFilters    { folderId?, mimeType?, status?, tags?, limit?, offset?, sortBy?, sortOrder?, metadata? }
FileUpdateOptions  { filename?, tags?, metadata? }
DownloadUrlOptions { ttl?, disposition? }
DownloadUrlResult  { url, expiresAt }
FolderListOptions  { parentFolderId?, name?, limit?, offset? }
CreateFolderOptions { name, parentFolderId? }
SearchQuery        { q?, filters?, tags?, limit?, offset? }
SearchResults      { hits: SearchHit[]; total: number; facets?: SearchFacets; queryTimeMs: number }
```

---

## Step 5 — Add `useUploadToken` hook ✅ COMPLETED

**File:** `sdks/react/src/hooks/useUploadToken.ts` (new)

```typescript
export function useUploadToken() {
  const { token, isTokenLoading, tokenError, getToken } = useFileNest();
  return {
    token,
    isLoading: isTokenLoading,
    error: tokenError,
    refresh: getToken,   // calling refresh() forces a new fetch
  };
}
```

Reactive — `token` updates whenever the provider fetches or refreshes.

---

## Step 6 — Refactor existing hooks to use context methods ✅ COMPLETED

**Why:** Hooks currently hit the API directly with raw `fetch`. After Step 4, the context exposes stable methods. Hooks should delegate to them — one source of truth, no duplication.

**Files:**

- `useFiles.ts` → replace `fetch(...)` block with `ctx.listFiles(filters)` as the TanStack Query fetcher
- `useFile.ts` → replace `fetch(...)` block with `ctx.getFile(fileId)`
- `useFolder.ts` → replace three parallel `fetch(...)` calls with `ctx.getFolder()` + `ctx.listFiles()` + `ctx.listFolders()`
- `useSearch.ts` → replace `fetch(...)` block with `ctx.search(query)`
- `useInfiniteFiles.ts` → replace `fetch(...)` block with `ctx.listFiles({ ...opts, offset: pageParam })`
- `useUpload.ts` → already uses `ctx.upload()` — no change needed

---

## Step 7 — Export `useUploadToken` + new types from `index.ts` ✅ COMPLETED

**File:** `sdks/react/src/index.ts`

Add:
```typescript
export { useUploadToken } from "./hooks/useUploadToken.js";
export type { UseUploadTokenResult } from "./hooks/useUploadToken.js";

// New context types
export type {
  InitUploadOptions, InitUploadResult,
  UploadToStorageOptions, ConfirmUploadResult,
  FileListFilters, FileUpdateOptions,
  DownloadUrlOptions, DownloadUrlResult,
  FolderListOptions, CreateFolderOptions,
} from "./context/FileNestContext.js";
```

---

## Step 8 — Rebuild SDK + verify no `@filenest/core` imports in `.d.ts` ✅ COMPLETED

```bash
pnpm --filter @filenest/core build
pnpm --filter @filenest/react build
```

Check `sdks/react/dist/index.d.ts` — must not contain `from '@filenest/core'`.

---

## Step 9 — Docs audit ✅ COMPLETED

**9a — SDK docs (`sdks/`):**
- Update `sdks/README.md` (or equivalent) to document `fetchInitialToken`, `tokenFetcher`, `tokenRefreshBuffer`, `tokenRetry`, `queryClient` props
- Document `useUploadToken()` hook
- Document all `useFileNest()` low-level methods
- Document headless usage pattern (Tier 3)

**9b — Console app docs (`frontend/web/src/content/docs/`):**
- `sdks/react.mdx` — add Provider configuration table, `useUploadToken`, headless methods section
- `sdks/node.mdx` — no changes needed (Node SDK unchanged)
- `api/authentication.mdx` — no new scopes; no change
- Update `frontend/web/src/modules/client/docs/config/nav.ts` if new MDX files added

---
