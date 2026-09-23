/**
 * /search — Server component calling filenestServer().search.query().
 *
 * Search is triggered via a search param so the RSC re-renders on each query.
 */

import { filenestServer } from "@filenest/nextjs/server";
import { CodeBlock } from "@/components/CodeBlock";
import type { SearchHit } from "@filenest/core";

const SOURCE = `// search/page.tsx  (Server Component)
import { filenestServer } from "@filenest/nextjs/server";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const fn = filenestServer({
    apiKey: process.env.FILENEST_API_KEY!,
    projectId: process.env.FILENEST_PROJECT_ID!,
  });

  const results = searchParams.q
    ? await fn.search.query({ q: searchParams.q, limit: 10 })
    : null;

  return (
    <form>
      <input name="q" defaultValue={searchParams.q} placeholder="Search…" />
      <button type="submit">Search</button>
      {results?.hits.map(hit => (
        <div key={hit.fileId}>{hit.filename}</div>
      ))}
    </form>
  );
}`;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const fn = filenestServer({
    apiKey: process.env.FILENEST_API_KEY!,
    projectId: process.env.FILENEST_PROJECT_ID!,
    baseUrl: process.env.FILENEST_API_URL,
  });

  let hits: SearchHit[] = [];
  let total = 0;
  let queryTimeMs = 0;
  let error = "";

  if (q) {
    try {
      const results = await fn.search.query({ q, limit: 10 });
      hits = results.hits;
      total = results.total;
      queryTimeMs = results.queryTimeMs;
    } catch (err) {
      error = err instanceof Error ? err.message : "Search failed";
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="page-title" style={{ margin: 0 }}>Server Search</h1>
          <span className="badge badge-blue">@filenest/nextjs/server</span>
        </div>
        <p className="page-sub">
          Search runs server-side via <code>filenestServer().search.query()</code>.
          The query is passed as a URL search param — the RSC re-renders on each submission.
        </p>
      </div>

      <div className="demo-split">
        <div>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Full-text search</div>
              <div className="card-desc">Searches filenames, metadata, and OCR-extracted text</div>
            </div>
            <div className="card-body">
              <form className="flex gap-2">
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Type a search query…"
                  className="input w-full"
                />
                <button type="submit" className="btn btn-primary">Search</button>
              </form>

              {error && (
                <p className="text-sm mt-3" style={{ color: "var(--error)" }}>{error}</p>
              )}

              {q && !error && (
                <div className="mt-4">
                  <p className="text-sm text-muted mb-2">
                    {total} result{total !== 1 ? "s" : ""} for &ldquo;{q}&rdquo;
                    {queryTimeMs > 0 && ` in ${queryTimeMs}ms`}
                  </p>
                  {hits.length === 0 ? (
                    <p className="text-sm text-muted">No files match this query.</p>
                  ) : (
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Filename</th>
                          <th>Score</th>
                          <th>Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hits.map((hit) => (
                          <tr key={hit.fileId}>
                            <td>{hit.filename}</td>
                            <td className="text-muted">{hit.score.toFixed(3)}</td>
                            <td className="text-sm text-muted">{hit.file.contentType}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {!q && (
                <p className="text-sm text-muted mt-3">Enter a query above and press Search.</p>
              )}
            </div>
          </div>
        </div>

        <CodeBlock title="search/page.tsx" code={SOURCE} />
      </div>
    </div>
  );
}
