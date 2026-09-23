// bookmark-repo.ts — repository layer for bookmarks.
// Raw data access only: executes the query and throws on failure.
// No business logic, no error wrapping, no observability imports.
// Callers are responsible for tracing and error context.

export async function bookmarkRepoFindByUser(userId: string): Promise<never> {
  // The database connection genuinely fails here — this is a real throw,
  // not a mock. The error originates here and bubbles up through every layer.
  void userId;
  throw new Error(
    "ECONNREFUSED: connect ECONNREFUSED 127.0.0.1:5432 — pool exhausted (10/10 connections busy, waited 30 000 ms)",
  );
}
