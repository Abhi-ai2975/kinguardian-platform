"use client";

/**
 * /search-client — useSearch() hook demo.
 *
 * Client-side full-text + faceted search. Debounced by default. Contrast
 * with /search (server RSC) which calls the backend at request time.
 */

import { useSearch } from "@filenest/react";
import { useState } from "react";
import { CodeBlock } from "@/components/CodeBlock";

const SOURCE = `"use client";
import { useSearch } from "@filenest/react";
import { useState } from "react";

function ClientSearch() {
  const [query, setQuery] = useState("");

  const {
    results,
    facets,
    isLoading,
    totalCount,
    queryTimeMs,
    search,
    hasMore,
  } = useSearch({
    debounceMs: 300,   // fires after 300 ms of silence
    facets: ["mimeType", "tags"],
    limit: 20,
  });

  const handleChange = (value: string) => {
    setQuery(value);
    search({ q: value });   // debounced — safe to call on every keystroke
  };

  // Narrow with filters alongside the text query
  // SearchFilters.mimeType is string[] — pass an array
  const searchWithFilter = (mimeType: string) =>
    search({ q: query, filters: { mimeType: [mimeType] } });

  return (
    <div>
      <input
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Search files…"
      />
      {isLoading && <p>Searching…</p>}
      {!isLoading && query && (
        <p>{totalCount} results in {queryTimeMs}ms</p>
      )}

      {/* Facet filter chips — SearchFacets.mimeType is { value, count }[] */}
      {facets?.mimeType && (
        <div>
          {facets.mimeType.map(({ value, count }) => (
            <button key={value} onClick={() => searchWithFilter(value)}>
              {value} ({count})
            </button>
          ))}
        </div>
      )}

      {/* SearchHit has fileId, filename, score, highlights, file (FileRecord) */}
      {results.map((hit) => (
        <div key={hit.fileId}>
          <strong>{hit.filename}</strong>
          {hit.highlights?.content?.[0] && (
            <p dangerouslySetInnerHTML={{ __html: hit.highlights.content[0] }} />
          )}
          <span>{hit.file.status} · {hit.file.contentType}</span>
        </div>
      ))}
    </div>
  );
}`;

export default function SearchClientPage() {
  const [query, setQuery] = useState("");
  const [mimeFilter, setMimeFilter] = useState("");

  const { results, facets, isLoading, totalCount, queryTimeMs, search, hasMore } = useSearch({
    debounceMs: 300,
    facets: ["mimeType", "tags"],
    limit: 20,
  });

  const handleQueryChange = (value: string) => {
    setQuery(value);
    search({ q: value, ...(mimeFilter ? { filters: { mimeType: [mimeFilter] } } : {}) });
  };

  const handleFacetClick = (mimeType: string) => {
    const next = mimeFilter === mimeType ? "" : mimeType;
    setMimeFilter(next);
    search({ q: query, ...(next ? { filters: { mimeType: [next] } } : {}) });
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="page-title" style={{ margin: 0 }}>useSearch hook (client-side)</h1>
          <span className="badge badge-green">@filenest/react</span>
        </div>
        <p className="page-sub">
          Debounced full-text search with faceted filtering, all client-side. Compare with{" "}
          <a href="/search">/search</a> which fetches at request time in a React Server Component.
        </p>
      </div>

      <div className="demo-split">
        <div className="flex flex-col gap-3">

          {/* Search input */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Search</div>
              <div className="card-desc">300 ms debounce — type freely</div>
            </div>
            <div className="card-body flex flex-col gap-3">
              <input
                type="search"
                className="input"
                placeholder="e.g. report, invoice, photo…"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                autoFocus
              />

              {/* Facet chips — SearchFacets.mimeType is { value, count }[] */}
              {facets?.mimeType && facets.mimeType.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {facets.mimeType.map(({ value, count }) => (
                    <button
                      key={value}
                      type="button"
                      className={`badge ${mimeFilter === value ? "badge-blue" : "badge-gray"}`}
                      style={{ cursor: "pointer", border: "1px solid var(--border)" }}
                      onClick={() => handleFacetClick(value)}
                    >
                      {value.split("/")[1] ?? value} ({count})
                    </button>
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
                  ? `${totalCount} result${totalCount !== 1 ? "s" : ""}${queryTimeMs ? ` · ${queryTimeMs}ms` : ""}`
                  : "Results will appear here"}
              </div>
            </div>

            {query && !isLoading && results.length === 0 ? (
              <div className="card-body text-sm text-muted">No results for "{query}"</div>
            ) : results.length > 0 ? (
              <table className="table">
                <thead>
                  <tr><th>Filename</th><th>Type</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {results.map((hit) => (
                    <tr key={hit.fileId}>
                      <td
                        style={{ maxWidth: 200 }}
                        className="truncate"
                        title={hit.filename}
                      >
                        {hit.filename}
                      </td>
                      <td className="text-muted text-sm">
                        {hit.file.contentType?.split("/")[1] ?? "—"}
                      </td>
                      <td>
                        <span className="badge badge-gray">{hit.file.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : !query ? (
              <div className="card-body text-sm text-muted">
                Type a query above to search.
              </div>
            ) : null}
          </div>

          {/* Hook state */}
          <div className="card">
            <div className="card-header"><div className="card-title">Hook state (live)</div></div>
            <div className="card-body">
              <pre className="code-block" style={{ fontSize: 12 }}>
                {JSON.stringify({ totalCount, queryTimeMs, isLoading, hasMore, resultCount: results.length }, null, 2)}
              </pre>
            </div>
          </div>

          {/* Server vs Client table */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Client vs Server search</div>
            </div>
            <div className="card-body">
              <table className="table">
                <thead><tr><th></th><th>useSearch (client)</th><th>RSC /search</th></tr></thead>
                <tbody>
                  <tr><td>Runs in</td><td>Browser</td><td>Server (request time)</td></tr>
                  <tr><td>Latency</td><td>After page load</td><td>First paint</td></tr>
                  <tr><td>Live update</td><td>Yes — debounced</td><td>No — full navigation</td></tr>
                  <tr><td>Best for</td><td>Search boxes</td><td>Search result pages</td></tr>
                  <tr><td>Auth</td><td>Upload token</td><td>API key (server-only)</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <CodeBlock title="search-client/page.tsx" code={SOURCE} />
      </div>
    </div>
  );
}
