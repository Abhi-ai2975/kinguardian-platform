"use client";

/**
 * /upload-token — useUploadToken() hook demo.
 *
 * Exposes the token lifecycle managed by FileNestProvider: current token,
 * loading state, error, and a manual refresh function. Useful when you need
 * to display token status or defer auth until the user first interacts.
 */

import { useUploadToken } from "@filenest/react";
import { CodeBlock } from "@/components/CodeBlock";
import { useState, useEffect } from "react";

const SOURCE = `"use client";
import { useUploadToken } from "@filenest/react";

export function TokenStatus() {
  const { token, isLoading, error, refresh } = useUploadToken();

  return (
    <div>
      {isLoading && <p>Fetching token…</p>}
      {error  && <p>Error: {error.message}</p>}
      {token  && <p>Token active: {token.slice(0, 20)}…</p>}
      <button onClick={refresh}>Refresh token</button>
    </div>
  );
}

// ── fetchInitialToken={false} — manual / lazy mode ─────────────────────────
//
// Set fetchInitialToken={false} on FileNestProvider to skip the automatic
// fetch on mount. Call refresh() (or getToken() from useFileNest) only when
// the user is about to upload — avoids an unnecessary round-trip for pages
// that render the provider but may never need file access.
//
// <FileNestProvider
//   tokenEndpoint="/api/filenest-token"
//   projectId={...}
//   fetchInitialToken={false}   // ← no fetch on mount
// >

// ── tokenFetcher — full custom control ─────────────────────────────────────
//
// Replace tokenEndpoint with a custom async function to attach headers,
// pass a non-standard body, or call a different backend altogether.
//
// <FileNestProvider
//   projectId={...}
//   tokenFetcher={async () => {
//     const res = await fetch("/api/my-token", {
//       headers: { "x-tenant-id": currentOrgId },
//     });
//     return res.json(); // must return { token: string; expiresAt: string }
//   }}
// >`;

function useCountdown(target: Date | null) {
  const [secs, setSecs] = useState<number | null>(null);
  useEffect(() => {
    if (!target) { setSecs(null); return; }
    const tick = () => setSecs(Math.max(0, Math.round((target.getTime() - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return secs;
}

export default function UploadTokenPage() {
  const { token, isLoading, error, refresh } = useUploadToken();

  // Parse the expiresAt from the token — tokens are JWTs with an exp claim
  // In the demo we just show a placeholder countdown
  const [refreshCount, setRefreshCount] = useState(0);

  const handleRefresh = async () => {
    await refresh();
    setRefreshCount((n) => n + 1);
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="page-title" style={{ margin: 0 }}>useUploadToken hook</h1>
          <span className="badge badge-green">@filenest/react</span>
        </div>
        <p className="page-sub">
          Reactive token lifecycle from <code>FileNestProvider</code>. Use this when you need
          to display token status, control when the first fetch fires, or build a manual
          refresh UI.
        </p>
      </div>

      <div className="demo-split">
        <div className="flex flex-col gap-3">

          {/* Live token state */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Token state (live)</div>
              <div className="card-desc">Reflects what FileNestProvider currently holds</div>
            </div>
            <div className="card-body flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: isLoading
                      ? "var(--accent)"
                      : error
                      ? "var(--error)"
                      : token
                      ? "#22c55e"
                      : "var(--border)",
                    flexShrink: 0,
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
                    fontFamily: "monospace",
                    fontSize: 12,
                    padding: "8px 12px",
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    wordBreak: "break-all",
                  }}
                >
                  {token.slice(0, 32)}…
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

          {/* fetchInitialToken=false explanation */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Lazy mode — <code>fetchInitialToken=false</code></div>
              <div className="card-desc">
                Skip the automatic fetch on mount; let the user trigger it
              </div>
            </div>
            <div className="card-body">
              <pre className="code-block" style={{ fontSize: 12 }}>{`<FileNestProvider
  tokenEndpoint="/api/filenest-token"
  projectId={...}
  fetchInitialToken={false}   // ← no fetch on mount
>
  {children}
</FileNestProvider>

// Then in a component:
const { refresh } = useUploadToken();
// Call refresh() when the user clicks Upload`}</pre>
            </div>
          </div>

          {/* tokenFetcher explanation */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Custom fetcher — <code>tokenFetcher</code></div>
              <div className="card-desc">
                Pass custom headers, body, or a non-standard response shape
              </div>
            </div>
            <div className="card-body">
              <pre className="code-block" style={{ fontSize: 12 }}>{`<FileNestProvider
  projectId={...}
  tokenFetcher={async () => {
    const res = await fetch("/api/my-token", {
      headers: { "x-tenant-id": currentOrgId },
    });
    // Must return { token: string; expiresAt: string }
    return res.json();
  }}
>`}</pre>
            </div>
          </div>

          {/* Hook return values */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Return value reference</div>
            </div>
            <div className="card-body">
              <table className="table">
                <thead>
                  <tr><th>Field</th><th>Type</th><th>Description</th></tr>
                </thead>
                <tbody>
                  <tr><td><code>token</code></td><td>string | null</td><td>Current cached token string</td></tr>
                  <tr><td><code>isLoading</code></td><td>boolean</td><td>True while fetching</td></tr>
                  <tr><td><code>error</code></td><td>Error | null</td><td>Last fetch error</td></tr>
                  <tr><td><code>refresh()</code></td><td>() =&gt; Promise&lt;string&gt;</td><td>Force-fetch a fresh token</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <CodeBlock title="upload-token/page.tsx" code={SOURCE} />
      </div>
    </div>
  );
}
