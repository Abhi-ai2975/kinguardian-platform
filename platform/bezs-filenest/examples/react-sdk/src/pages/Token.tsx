/**
 * Token — useUploadToken() hook demo.
 *
 * Shows reactive token state, manual refresh, lazy mode, and custom fetcher patterns.
 */

import { useUploadToken } from "@filenest/react";
import { useState } from "react";

export function TokenPage() {
  const { token, isLoading, error, refresh } = useUploadToken();
  const [refreshCount, setRefreshCount] = useState(0);

  const handleRefresh = async () => {
    await refresh();
    setRefreshCount((n) => n + 1);
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="page-title" style={{ margin: 0 }}>useUploadToken</h1>
          <span className="badge badge-green">@filenest/react</span>
        </div>
        <p className="page-sub">
          Reactive token state from <code>FileNestProvider</code>. Use for token status UI,
          lazy loading, or custom refresh controls.
        </p>
      </div>

      {/* Live token state */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Token state (live)</div>
          <div className="card-desc">Updates whenever FileNestProvider refreshes the token</div>
        </div>
        <div className="card-body flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span
              style={{
                width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                background: isLoading ? "var(--accent)" : error ? "var(--error)" : token ? "var(--success)" : "var(--border)",
              }}
            />
            <span className="text-sm" style={{ fontWeight: 500 }}>
              {isLoading ? "Fetching…" : error ? "Error" : token ? "Active" : "No token"}
            </span>
          </div>

          {error && (
            <p className="text-sm" style={{ color: "var(--error)" }}>{error.message}</p>
          )}

          {token && (
            <div
              style={{
                fontFamily: "monospace", fontSize: 12,
                padding: "8px 12px", background: "#1e1e2e", color: "#cdd6f4",
                borderRadius: 6, wordBreak: "break-all",
              }}
            >
              {token.slice(0, 40)}…
            </div>
          )}

          <button
            type="button"
            className="btn btn-primary"
            style={{ alignSelf: "flex-start" }}
            onClick={handleRefresh}
            disabled={isLoading}
          >
            {isLoading ? "Refreshing…" : "Force refresh"}
          </button>
          {refreshCount > 0 && (
            <p className="text-sm text-muted">Refreshed {refreshCount}×</p>
          )}
        </div>
      </div>

      {/* Return value reference */}
      <div className="card">
        <div className="card-header"><div className="card-title">Return value</div></div>
        <div className="card-body">
          <table className="table">
            <thead><tr><th>Field</th><th>Type</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>token</code></td><td>string | null</td><td>Current cached token string</td></tr>
              <tr><td><code>isLoading</code></td><td>boolean</td><td>True while fetching</td></tr>
              <tr><td><code>error</code></td><td>Error | null</td><td>Last fetch error (after retries)</td></tr>
              <tr><td><code>refresh()</code></td><td>() =&gt; Promise&lt;string&gt;</td><td>Force-fetch a fresh token</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Lazy mode */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Lazy mode — <code>fetchInitialToken=false</code></div>
        </div>
        <div className="card-body">
          <pre className="code-block">{`// Provider: skip the automatic fetch on mount
<FileNestProvider
  tokenEndpoint="/api/filenest-token"
  projectId={...}
  fetchInitialToken={false}
>
  {children}
</FileNestProvider>

// Component: call refresh() only when the user triggers an upload
const { refresh } = useUploadToken();
const handleUploadClick = async () => {
  await refresh();         // fetch the token now
  // proceed with upload…
};`}</pre>
        </div>
      </div>

      {/* Custom fetcher */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Custom fetcher — <code>tokenFetcher</code></div>
        </div>
        <div className="card-body">
          <pre className="code-block">{`// Pass a custom async function instead of tokenEndpoint
// Useful for attaching custom headers or non-standard endpoints

<FileNestProvider
  projectId={...}
  tokenFetcher={async () => {
    const res = await fetch("/api/my-token", {
      headers: {
        "x-tenant-id": currentOrgId,
        Authorization: \`Bearer \${userJwt}\`,
      },
    });
    // Must return { token: string; expiresAt: string }
    return res.json();
  }}
>
  {children}
</FileNestProvider>`}</pre>
        </div>
      </div>
    </div>
  );
}
