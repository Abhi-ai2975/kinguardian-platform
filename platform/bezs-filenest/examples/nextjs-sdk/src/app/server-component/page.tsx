/**
 * /server-component — React Server Component fetching files via filenestServer().
 *
 * This page runs on the server. No client JS, no useEffect, no fetch in the browser.
 * The API key never reaches the client.
 */

import { filenestServer } from "@filenest/nextjs/server";
import { CodeBlock } from "@/components/CodeBlock";
import type { FileRecord } from "@filenest/core";

const SOURCE = `// app/server-component/page.tsx
import { filenestServer } from "@filenest/nextjs/server";

// filenestServer() creates a FileNest Node SDK instance
// configured with your server-side env vars.
const fn = filenestServer({
  apiKey: process.env.FILENEST_API_KEY!,
  projectId: process.env.FILENEST_PROJECT_ID!,
  baseUrl: process.env.FILENEST_API_URL,
});

// This is a pure async Server Component — no "use client".
export default async function ServerComponentPage() {
  const { items: files } = await fn.files.list({
    limit: 10,
    sortBy: "created_at",
    sortOrder: "desc",
  });

  return (
    <div>
      {files.map(file => (
        <div key={file.id}>{file.filename}</div>
      ))}
    </div>
  );
}`;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    ready: "badge-green",
    processing: "badge-blue",
    failed: "badge-red",
    quarantined: "badge-yellow",
    uploading: "badge-blue",
  };
  return map[status] ?? "badge-gray";
}

export default async function ServerComponentPage() {
  const fn = filenestServer({
    apiKey: process.env.FILENEST_API_KEY!,
    projectId: process.env.FILENEST_PROJECT_ID!,
    baseUrl: process.env.FILENEST_API_URL,
  });

  let files: FileRecord[] = [];
  let errorMsg = "";

  try {
    const result = await fn.files.list({ limit: 10, sortBy: "created_at", sortOrder: "desc" });
    files = result.items;
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : "Failed to fetch files";
  }

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="page-title" style={{ margin: 0 }}>Server Component</h1>
          <span className="badge badge-blue">@filenest/nextjs/server</span>
        </div>
        <p className="page-sub">
          Uses <code>filenestServer()</code> inside an async RSC to fetch files.
          No JavaScript is sent to the browser for this fetch — it happens at request time on the server.
        </p>
      </div>

      <div className="demo-split">
        {/* Live demo */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Recent files (live)</div>
            <div className="card-desc">Fetched server-side at request time · no client JS</div>
          </div>
          <div>
            {errorMsg ? (
              <div className="card-body">
                <div className="badge badge-red" style={{ marginBottom: 8 }}>Error</div>
                <p className="text-sm text-muted">{errorMsg}</p>
                <p className="text-sm text-muted mt-2">Make sure your API key and project ID are set in <code>.env.local</code></p>
              </div>
            ) : files.length === 0 ? (
              <div className="card-body text-muted text-sm">No files found. Upload some files first.</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Filename</th>
                    <th>Size</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => (
                    <tr key={file.id}>
                      <td className="truncate" style={{ maxWidth: 200 }}>{file.filename}</td>
                      <td className="text-muted">{formatBytes(file.sizeBytes)}</td>
                      <td><span className={`badge ${statusBadge(file.status)}`}>{file.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Source code */}
        <CodeBlock title="app/server-component/page.tsx" code={SOURCE} />
      </div>
    </div>
  );
}
