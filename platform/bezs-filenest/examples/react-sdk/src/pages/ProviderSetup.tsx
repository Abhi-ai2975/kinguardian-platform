/**
 * ProviderSetup — explains how to wire up FileNestProvider in a Vite React app.
 */

export function ProviderSetupPage() {
  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="page-title" style={{ margin: 0 }}>@filenest/react — Vite + React example</h1>
          <span className="badge badge-blue">v0.1.0</span>
        </div>
        <p className="page-sub">
          Full demo of the React SDK without Next.js. Works in any React app — Vite, CRA, Remix, etc.
        </p>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">Quick start</div></div>
        <div className="card-body">
          <pre className="code-block">{`# 1. Copy env file
cp .env.example .env.local

# 2. Fill in your credentials
VITE_FILENEST_PROJECT_ID=proj_...
VITE_FILENEST_API_URL=http://localhost:8000
VITE_FILENEST_TOKEN_ENDPOINT=http://localhost:3000/api/filenest-token

# 3. Install + run
pnpm install
pnpm dev       # http://localhost:3002`}</pre>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">Provider setup (main.tsx)</div></div>
        <div className="card-body">
          <pre className="code-block">{`import { FileNestProvider } from "@filenest/react";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <FileNestProvider
    projectId={import.meta.env.VITE_FILENEST_PROJECT_ID}
    baseUrl={import.meta.env.VITE_FILENEST_API_URL}
    tokenEndpoint={import.meta.env.VITE_FILENEST_TOKEN_ENDPOINT}
    fetchInitialToken={true}
    tokenRefreshBuffer={60}  // refresh 60 s before expiry
    tokenRetry={3}           // retry on fetch failure
    debug={import.meta.env.DEV}
  >
    <App />
  </FileNestProvider>
);`}</pre>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">SDK tiers</div></div>
        <div className="card-body">
          <table className="table">
            <thead>
              <tr><th>Tier</th><th>API</th><th>When to use</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>1 — Components</td>
                <td><code>&lt;FileUpload /&gt; &lt;FilePreview /&gt; &lt;FileViewer /&gt;</code></td>
                <td>Fastest path — just drop in and configure via props</td>
              </tr>
              <tr>
                <td>2 — Managed hooks</td>
                <td><code>useUpload() useFiles() useSearch() useFolder()</code></td>
                <td>Custom UI with TanStack Query state management built in</td>
              </tr>
              <tr>
                <td>3 — Headless</td>
                <td><code>useFileNest()</code></td>
                <td>Complete control — every method available directly</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">FileNestProvider props</div>
        </div>
        <div className="card-body">
          <table className="table">
            <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>projectId</code></td><td>string</td><td>required</td><td>Your FileNest project ID</td></tr>
              <tr><td><code>tokenEndpoint</code></td><td>string</td><td><code>""</code></td><td>POST URL that returns <code>{"{ token, expiresAt }"}</code></td></tr>
              <tr><td><code>tokenFetcher</code></td><td>() =&gt; Promise</td><td>—</td><td>Custom async token fetch — use instead of tokenEndpoint</td></tr>
              <tr><td><code>fetchInitialToken</code></td><td>boolean</td><td>true</td><td>Set false to skip fetch on mount (lazy mode)</td></tr>
              <tr><td><code>tokenRefreshBuffer</code></td><td>number</td><td>60</td><td>Seconds before expiry to proactively refresh</td></tr>
              <tr><td><code>tokenRetry</code></td><td>number</td><td>3</td><td>Retry attempts on token fetch failure</td></tr>
              <tr><td><code>baseUrl</code></td><td>string</td><td><code>""</code></td><td>FileNest backend URL</td></tr>
              <tr><td><code>queryClient</code></td><td>QueryClient</td><td>internal</td><td>Bring your own TanStack Query client</td></tr>
              <tr><td><code>debug</code></td><td>boolean</td><td>false</td><td>Log token lifecycle to console</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
