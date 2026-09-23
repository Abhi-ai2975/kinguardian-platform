/**
 * Files — useFiles() and useFile() hook demos.
 */

import { useState } from "react";
import { useFiles, useFile } from "@filenest/react";

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

const STATUS_COLORS: Record<string, string> = {
  ready: "badge-green", processing: "badge-blue", failed: "badge-red", quarantined: "badge-yellow",
};

function FileDetail({ fileId, onClose }: { fileId: string; onClose: () => void }) {
  const { file, isLoading, mutate } = useFile(fileId, {
    includeVersions: true,
    includeProcessing: true,
  });

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <div className="card-title">useFile — {fileId}</div>
          <div className="flex gap-2" style={{ marginLeft: "auto" }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => mutate()}>Refresh</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>✕</button>
          </div>
        </div>
      </div>
      <div className="card-body">
        {isLoading ? (
          <p className="text-muted text-sm">Loading…</p>
        ) : file ? (
          <table className="table">
            <tbody>
              <tr><td><b>ID</b></td><td><code>{file.id}</code></td></tr>
              <tr><td><b>Filename</b></td><td>{file.filename}</td></tr>
              <tr><td><b>MIME</b></td><td>{file.contentType}</td></tr>
              <tr><td><b>Size</b></td><td>{formatBytes(file.sizeBytes)}</td></tr>
              <tr><td><b>Status</b></td><td><span className={`badge ${STATUS_COLORS[file.status] ?? "badge-gray"}`}>{file.status}</span></td></tr>
              <tr><td><b>Tags</b></td><td>{file.tags.join(", ") || "—"}</td></tr>
              <tr><td><b>Created</b></td><td>{new Date(file.createdAt).toLocaleString()}</td></tr>
            </tbody>
          </table>
        ) : (
          <p className="text-muted text-sm">File not found.</p>
        )}
      </div>
    </div>
  );
}

export function FilesPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { files, totalCount, hasMore, isLoading, isError, error, loadMore, refresh } = useFiles({
    sortBy: "created_at",
    sortOrder: "desc",
    limit: 10,
  });

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="page-title" style={{ margin: 0 }}>useFiles + useFile</h1>
          <span className="badge badge-green">@filenest/react</span>
        </div>
        <p className="page-sub">
          <code>useFiles</code> — paginated list with filters and load-more.<br />
          <code>useFile</code> — single file detail with manual revalidation.
        </p>
      </div>

      {selectedId && (
        <FileDetail fileId={selectedId} onClose={() => setSelectedId(null)} />
      )}

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <div>
              <div className="card-title">{isLoading ? "Loading…" : `${totalCount} files`}</div>
              <div className="card-desc">Click a row to open useFile detail</div>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ marginLeft: "auto" }}
              onClick={refresh}
            >
              Refresh
            </button>
          </div>
        </div>

        {isError ? (
          <div className="card-body" style={{ color: "var(--error)" }}>{error?.message}</div>
        ) : isLoading ? (
          <div className="card-body text-muted text-sm">Fetching…</div>
        ) : files.length === 0 ? (
          <div className="card-body text-muted text-sm">No files found. Upload some first!</div>
        ) : (
          <>
            <table className="table">
              <thead><tr><th>Filename</th><th>Size</th><th>Status</th><th>Tags</th></tr></thead>
              <tbody>
                {files.map((f) => (
                  <tr
                    key={f.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => setSelectedId(f.id)}
                  >
                    <td style={{ maxWidth: 200 }} className="truncate">{f.filename}</td>
                    <td className="text-muted">{formatBytes(f.sizeBytes)}</td>
                    <td><span className={`badge ${STATUS_COLORS[f.status] ?? "badge-gray"}`}>{f.status}</span></td>
                    <td className="text-muted text-sm">{f.tags.join(", ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {hasMore && (
              <div className="card-body">
                <button type="button" className="btn btn-outline w-full" onClick={loadMore}>Load more</button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">Code</div></div>
        <div className="card-body">
          <pre className="code-block">{`import { useFiles, useFile } from "@filenest/react";

// Paginated list
const { files, totalCount, hasMore, loadMore, refresh } = useFiles({
  sortBy: "created_at",
  sortOrder: "desc",
  limit: 10,
  // Optional: folderId, filters: { mimeType, tags, metadata }
});

// Single file with revalidation
const { file, isLoading, mutate } = useFile(fileId, {
  includeVersions: true,
  includeProcessing: true,
});`}</pre>
        </div>
      </div>
    </div>
  );
}
