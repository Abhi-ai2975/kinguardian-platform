/**
 * InfiniteFiles — useInfiniteFiles() hook demo with IntersectionObserver sentinel.
 */

import { useInfiniteFiles } from "@filenest/react";
import { useEffect, useRef } from "react";

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

const STATUS_COLORS: Record<string, string> = {
  ready: "badge-green", processing: "badge-blue", failed: "badge-red",
};

export function InfiniteFilesPage() {
  const { files, totalCount, hasMore, isLoading, isFetchingMore, fetchMore, refresh } =
    useInfiniteFiles({
      sortBy: "created_at",
      sortOrder: "desc",
      limit: 5,
    });

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasMore && !isFetchingMore) fetchMore(); },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, isFetchingMore, fetchMore]);

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="page-title" style={{ margin: 0 }}>useInfiniteFiles</h1>
          <span className="badge badge-green">@filenest/react</span>
        </div>
        <p className="page-sub">
          <code>useInfiniteQuery</code>-backed list. Pages are appended as you scroll or click
          "Load more". The sentinel div at the bottom of the list auto-triggers the next page.
        </p>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <div>
              <div className="card-title">
                {isLoading ? "Loading…" : `${files.length} / ${totalCount} loaded`}
              </div>
              <div className="card-desc">Page size: 5 · scroll down to load more</div>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ marginLeft: "auto" }}
              onClick={refresh}
            >
              Reset
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="card-body text-muted text-sm">Loading first page…</div>
        ) : files.length === 0 ? (
          <div className="card-body text-muted text-sm">No files. Upload some first.</div>
        ) : (
          <>
            <table className="table">
              <thead><tr><th>Filename</th><th>Size</th><th>Status</th></tr></thead>
              <tbody>
                {files.map((f) => (
                  <tr key={f.id}>
                    <td style={{ maxWidth: 220 }} className="truncate">{f.filename}</td>
                    <td className="text-muted">{formatBytes(f.size)}</td>
                    <td><span className={`badge ${STATUS_COLORS[f.status] ?? "badge-gray"}`}>{f.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Sentinel — IntersectionObserver fires fetchMore on scroll */}
            <div ref={sentinelRef} style={{ height: 1 }} />

            <div className="card-body">
              {hasMore ? (
                <button
                  type="button"
                  className="btn btn-outline w-full"
                  onClick={() => fetchMore()}
                  disabled={isFetchingMore}
                >
                  {isFetchingMore ? "Loading more…" : "Load more"}
                </button>
              ) : (
                <p className="text-muted text-sm text-center">All {totalCount} files loaded</p>
              )}
            </div>
          </>
        )}
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">Code</div></div>
        <div className="card-body">
          <pre className="code-block">{`import { useInfiniteFiles } from "@filenest/react";
import { useEffect, useRef } from "react";

const {
  files,       // FileRecord[] — all pages flattened
  totalCount,  // total in backend
  hasMore,     // true if more pages exist
  isLoading,
  isFetchingMore,
  fetchMore,   // () => void — fetch next page
  refresh,     // reset and refetch from page 1
} = useInfiniteFiles({
  sortBy: "created_at",
  sortOrder: "desc",
  limit: 20,     // items per page
  // folderId: "folder_abc",
  // searchQuery: "report",
});

// Auto-trigger on scroll
const sentinelRef = useRef(null);
useEffect(() => {
  const obs = new IntersectionObserver(
    ([e]) => { if (e.isIntersecting && hasMore) fetchMore(); },
    { threshold: 0.1 }
  );
  obs.observe(sentinelRef.current);
  return () => obs.disconnect();
}, [hasMore, fetchMore]);

<div ref={sentinelRef} style={{ height: 1 }} />`}</pre>
        </div>
      </div>
    </div>
  );
}
