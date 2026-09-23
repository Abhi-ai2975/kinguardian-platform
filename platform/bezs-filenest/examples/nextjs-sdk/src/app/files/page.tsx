"use client";

/**
 * /files — useFiles() hook demo.
 *
 * TanStack Query-backed paginated file list with status filter and load more.
 */

import { useFiles } from "@filenest/react";
import { CodeBlock } from "@/components/CodeBlock";
import { useState } from "react";

const SOURCE = `"use client";
import { useFiles } from "@filenest/react";

export function FileListDemo() {
  const {
    files,
    totalCount,
    hasMore,
    isLoading,
    isError,
    error,
    loadMore,
    refresh,
  } = useFiles({
    sortBy: "created_at",
    sortOrder: "desc",
    limit: 10,
    // Optional filters:
    // folderId: "folder_abc",
    // filters: { metadata: { patientId: "P-12345" } },
    // tags: ["clinical"],
  });

  if (isLoading) return <p>Loading…</p>;
  if (isError) return <p>Error: {error?.message}</p>;

  return (
    <div>
      <p>{totalCount} files</p>
      {files.map(file => (
        <div key={file.id}>{file.filename} — {file.status}</div>
      ))}
      {hasMore && <button onClick={loadMore}>Load more</button>}
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}`;

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

const STATUS_COLORS: Record<string, string> = {
  ready: "badge-green",
  processing: "badge-blue",
  failed: "badge-red",
  quarantined: "badge-yellow",
};

export default function FilesPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { files, totalCount, hasMore, isLoading, isError, error, loadMore, refresh } = useFiles({
    sortBy: "created_at",
    sortOrder: "desc",
    limit: 10,
    filters: statusFilter ? { metadata: {} } : undefined,
  });

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="page-title" style={{ margin: 0 }}>useFiles hook</h1>
          <span className="badge badge-green">@filenest/react</span>
        </div>
        <p className="page-sub">
          TanStack Query-backed list with automatic caching, pagination, and background refresh.
          Pass filters, tags, or metadata constraints to narrow results.
        </p>
      </div>

      <div className="demo-split">
        <div className="flex flex-col gap-3">
          <div className="card">
            <div className="card-header">
              <div className="flex justify-between items-center">
                <div>
                  <div className="card-title">
                    {isLoading ? "Loading…" : `${totalCount} files`}
                  </div>
                  <div className="card-desc">Sorted by newest first · 10 per page</div>
                </div>
                <button type="button" className="btn btn-outline btn-sm" onClick={refresh}>
                  Refresh
                </button>
              </div>
            </div>

            {isError ? (
              <div className="card-body">
                <p className="text-sm" style={{ color: "var(--error)" }}>{error?.message}</p>
              </div>
            ) : isLoading ? (
              <div className="card-body text-sm text-muted">Fetching files…</div>
            ) : files.length === 0 ? (
              <div className="card-body text-sm text-muted">No files found.</div>
            ) : (
              <>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Filename</th>
                      <th>Size</th>
                      <th>Status</th>
                      <th>Tags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((f) => (
                      <tr key={f.id}>
                        <td className="truncate" style={{ maxWidth: 180 }}>{f.filename}</td>
                        <td className="text-muted">{formatBytes(f.size)}</td>
                        <td>
                          <span className={`badge ${STATUS_COLORS[f.status] ?? "badge-gray"}`}>
                            {f.status}
                          </span>
                        </td>
                        <td className="text-sm text-muted">
                          {f.tags.length ? f.tags.join(", ") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {hasMore && (
                  <div className="card-body">
                    <button
                      type="button"
                      className="btn btn-outline w-full"
                      onClick={loadMore}
                    >
                      Load more
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">Hook state (live)</div></div>
            <div className="card-body">
              <pre className="code-block" style={{ fontSize: 12 }}>
                {JSON.stringify(
                  { totalCount, fileCount: files.length, hasMore, isLoading, isError },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        </div>

        <CodeBlock title="files/page.tsx" code={SOURCE} />
      </div>
    </div>
  );
}
