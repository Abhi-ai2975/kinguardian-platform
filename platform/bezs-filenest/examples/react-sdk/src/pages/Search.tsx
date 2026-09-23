/**
 * Search — useSearch() hook demo with debounce, faceted filtering, and useFolder breadcrumbs.
 */

import { useState } from "react";
import { useSearch, useFolder } from "@filenest/react";

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [mimeFilter, setMimeFilter] = useState("");

  const { results, facets, isLoading, totalCount, queryTimeMs, search } = useSearch({
    debounceMs: 300,
    facets: ["mimeType", "tags"],
    limit: 20,
  });

  const handleChange = (value: string) => {
    setQuery(value);
    search({ q: value, ...(mimeFilter ? { filters: { mimeType: [mimeFilter] } } : {}) });
  };

  const handleFacetClick = (type: string) => {
    const next = mimeFilter === type ? "" : type;
    setMimeFilter(next);
    search({ q: query, ...(next ? { filters: { mimeType: [next] } } : {}) });
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="page-title" style={{ margin: 0 }}>useSearch + useFolder</h1>
          <span className="badge badge-green">@filenest/react</span>
        </div>
        <p className="page-sub">
          Debounced full-text search with faceted filtering. useFolder breadcrumbs shown below
          for a root folder view.
        </p>
      </div>

      {/* Search box */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Search files</div>
          <div className="card-desc">300 ms debounce</div>
        </div>
        <div className="card-body flex flex-col gap-3">
          <input
            type="search"
            className="input"
            placeholder="e.g. report, invoice, Q3…"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            autoFocus
          />

          {facets?.mimeType && facets.mimeType.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {facets.mimeType.map(({ value, count }) => (
                <span
                  key={value}
                  className={`badge ${mimeFilter === value ? "badge-blue" : "badge-gray"}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => handleFacetClick(value)}
                >
                  {value.split("/")[1] ?? value} ({count})
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            {isLoading
              ? "Searching…"
              : query
              ? `${totalCount} result${totalCount !== 1 ? "s" : ""} · ${queryTimeMs}ms`
              : "Results"}
          </div>
        </div>
        {!query ? (
          <div className="card-body text-muted text-sm">Type a query above.</div>
        ) : isLoading ? (
          <div className="card-body text-muted text-sm">Searching…</div>
        ) : results.length === 0 ? (
          <div className="card-body text-muted text-sm">No results for "{query}"</div>
        ) : (
          <table className="table">
            <thead><tr><th>Filename</th><th>Type</th><th>Status</th></tr></thead>
            <tbody>
              {results.map((hit) => (
                <tr key={hit.fileId}>
                  <td style={{ maxWidth: 220 }} className="truncate">{hit.filename}</td>
                  <td className="text-muted text-sm">{hit.file.contentType?.split("/")[1] ?? "—"}</td>
                  <td><span className="badge badge-gray">{hit.file.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* useFolder demo — root */}
      <FolderBreadcrumbs />

      <div className="card">
        <div className="card-header"><div className="card-title">Code</div></div>
        <div className="card-body">
          <pre className="code-block">{`import { useSearch, useFolder } from "@filenest/react";

// Search hook
const { results, facets, isLoading, totalCount, queryTimeMs, search } = useSearch({
  debounceMs: 300,
  facets: ["mimeType", "status"],
  limit: 20,
});
// Call search() on every keystroke — debounce handles the rest
search({ q: "quarterly report", filters: { mimeType: "application/pdf" } });

// Folder navigation with breadcrumbs
const { folder, files, subfolders, breadcrumbs, isLoading } = useFolder(folderId);
// breadcrumbs: [{ id, name }, ...] from root to current folder`}</pre>
        </div>
      </div>
    </div>
  );
}

function FolderBreadcrumbs() {
  const [folderId, setFolderId] = useState<string | null>(null);
  const { folder, subfolders, files, breadcrumbs, isLoading } = useFolder(folderId);

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">useFolder — breadcrumb navigation</div>
        <div className="card-desc">Click subfolders to navigate; click breadcrumb to go up</div>
      </div>
      <div className="card-body flex flex-col gap-3">
        {/* breadcrumbs already includes { id: null, name: "Root" } as first entry */}
        <nav className="flex items-center gap-1 text-sm flex-wrap">
          {breadcrumbs.map((b, i) => (
            <span key={b.id ?? "root"} className="flex items-center gap-1">
              {i > 0 && <span style={{ color: "var(--border)" }}>/</span>}
              <span
                style={{
                  cursor: i < breadcrumbs.length - 1 ? "pointer" : "default",
                  color: i < breadcrumbs.length - 1 ? "var(--accent)" : "var(--text)",
                  fontWeight: i === breadcrumbs.length - 1 ? 600 : undefined,
                }}
                onClick={() => i < breadcrumbs.length - 1 && setFolderId(b.id)}
              >
                {b.name}
              </span>
            </span>
          ))}
        </nav>

        {isLoading ? (
          <p className="text-muted text-sm">Loading…</p>
        ) : (
          <div className="flex flex-col gap-1">
            {subfolders.map((sf) => (
              <div
                key={sf.id}
                className="flex items-center gap-2 text-sm"
                style={{ cursor: "pointer", padding: "4px 0" }}
                onClick={() => setFolderId(sf.id)}
              >
                <span>📁</span>
                <span>{sf.name}/</span>
              </div>
            ))}
            {files.map((f) => (
              <div key={f.id} className="flex items-center gap-2 text-sm" style={{ padding: "4px 0" }}>
                <span>📄</span>
                <span>{f.filename}</span>
                <span className="text-muted" style={{ marginLeft: "auto" }}>{f.status}</span>
              </div>
            ))}
            {subfolders.length === 0 && files.length === 0 && (
              <p className="text-muted text-sm">Empty folder</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
