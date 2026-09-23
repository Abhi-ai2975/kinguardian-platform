"use client";

/**
 * /infinite-files — useInfiniteFiles() hook demo.
 *
 * TanStack Query useInfiniteQuery-backed list with automatic page-chaining.
 * Each fetchMore() call appends the next page; the scroll-to-sentinel pattern
 * is demonstrated inline.
 */

import { useInfiniteFiles } from "@filenest/react";
import { useEffect, useRef, useState } from "react";
import { CodeBlock } from "@/components/CodeBlock";

const SOURCE = `"use client";
import { useInfiniteFiles } from "@filenest/react";
import { useEffect, useRef } from "react";

function FileInfiniteList() {
  const {
    files,
    totalCount,
    hasMore,
    isLoading,
    isFetchingMore,
    fetchMore,
    refresh,
  } = useInfiniteFiles({
    sortBy: "created_at",
    sortOrder: "desc",
    limit: 5,          // items per page
    // folderId: null, // root by default; pass a folder ID to scope
    // searchQuery: "report", // optional full-text pre-filter
  });

  // IntersectionObserver sentinel — auto-fetch when the bottom div enters view
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasMore) fetchMore(); },
      { threshold: 0.1 }
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [hasMore, fetchMore]);

  if (isLoading) return <p>Loading first page…</p>;

  return (
    <div>
      <p>{files.length} / {totalCount} loaded</p>
      {files.map((f) => (
        <div key={f.id}>{f.filename} — {f.status}</div>
      ))}
      {/* Sentinel div — entering viewport triggers the next page fetch */}
      <div ref={sentinelRef} style={{ height: 1 }} />
      {isFetchingMore && <p>Loading more…</p>}
      {!hasMore && files.length > 0 && <p>All files loaded</p>}
      <button onClick={refresh}>Refresh from start</button>
    </div>
  );
}`;

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

const STATUS_COLORS: Record<string, string> = {
  ready: "badge-green",
  processing: "badge-blue",
  failed: "badge-red",
  quarantined: "badge-yellow",
};

export default function InfiniteFilesPage() {
  const [limit, setLimit] = useState(5);

  const { files, totalCount, hasMore, isLoading, isFetchingMore, fetchMore, refresh } =
    useInfiniteFiles({
      sortBy: "created_at",
      sortOrder: "desc",
      limit,
    });

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !isFetchingMore) fetchMore();
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, isFetchingMore, fetchMore]);

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="page-title" style={{ margin: 0 }}>useInfiniteFiles hook</h1>
          <span className="badge badge-green">@filenest/react</span>
        </div>
        <p className="page-sub">
          TanStack Query <code>useInfiniteQuery</code>-backed list with automatic page chaining.
          Pages are appended, not replaced — perfect for infinite-scroll UIs.
        </p>
      </div>

      <div className="demo-split">
        <div className="flex flex-col gap-3">

          {/* Controls */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Options</div>
            </div>
            <div className="card-body flex items-center gap-3">
              <label className="text-sm" style={{ fontWeight: 500 }}>Page size</label>
              {[3, 5, 10].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`btn btn-sm ${limit === n ? "btn-primary" : "btn-outline"}`}
                  onClick={() => { setLimit(n); refresh(); }}
                >
                  {n}
                </button>
              ))}
              <button type="button" className="btn btn-outline btn-sm" onClick={refresh}>
                Reset
              </button>
            </div>
          </div>

          {/* File list */}
          <div className="card">
            <div className="card-header">
              <div className="flex justify-between items-center">
                <div>
                  <div className="card-title">
                    {isLoading ? "Loading…" : `${files.length} / ${totalCount} files loaded`}
                  </div>
                  <div className="card-desc">Scroll or click Load More to append pages</div>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="card-body text-sm text-muted">Fetching first page…</div>
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
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((f) => (
                      <tr key={f.id}>
                        <td className="truncate" style={{ maxWidth: 200 }}>{f.filename}</td>
                        <td className="text-muted">{formatBytes(f.size)}</td>
                        <td>
                          <span className={`badge ${STATUS_COLORS[f.status] ?? "badge-gray"}`}>
                            {f.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Sentinel — IntersectionObserver fires fetchMore on scroll */}
                <div ref={sentinelRef} style={{ height: 1 }} />

                <div className="card-body flex items-center gap-2">
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
                    <p className="text-sm text-muted">All {totalCount} files loaded</p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Live state */}
          <div className="card">
            <div className="card-header"><div className="card-title">Hook state (live)</div></div>
            <div className="card-body">
              <pre className="code-block" style={{ fontSize: 12 }}>
                {JSON.stringify(
                  { loaded: files.length, totalCount, hasMore, isLoading, isFetchingMore },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>

          {/* Difference from useFiles */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">useInfiniteFiles vs useFiles</div>
            </div>
            <div className="card-body">
              <table className="table">
                <thead><tr><th>Feature</th><th>useFiles</th><th>useInfiniteFiles</th></tr></thead>
                <tbody>
                  <tr><td>Loading model</td><td>Replace page</td><td>Append pages</td></tr>
                  <tr><td>TanStack hook</td><td>useQuery</td><td>useInfiniteQuery</td></tr>
                  <tr><td>Scroll pattern</td><td>Pagination buttons</td><td>Sentinel / "Load more"</td></tr>
                  <tr><td>Back-navigation</td><td>Natural (page param)</td><td>Must scroll up</td></tr>
                  <tr><td>Best for</td><td>Tables, grids</td><td>Feed, explorer</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <CodeBlock title="infinite-files/page.tsx" code={SOURCE} />
      </div>
    </div>
  );
}
