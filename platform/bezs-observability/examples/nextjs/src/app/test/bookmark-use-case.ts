// bookmark-use-case.ts — use case layer.
// Business logic for fetching bookmarks. Calls the repository, fires its own
// error trace span when the repo fails, then re-wraps and rethrows so the
// caller (controller) sees a use-case-level error with context.

import { watcher } from "@/lib/watcher";
import { bookmarkRepoFindByUser } from "@/lib/bookmark-repo";
import type { ErrorTraceSpan } from "@/app/test/actions";

export interface UseCaseTraceCtx {
  traceId: string;
  callerSpanId: string; // span ID of whoever called us — becomes our parentSpanId
  collected: ErrorTraceSpan[];
}

export async function fetchBookmarksUseCase(
  userId: string,
  ctx: UseCaseTraceCtx,
): Promise<never> {
  const repoSpanId = crypto.randomUUID();
  const mySpanId = crypto.randomUUID();

  try {
    await bookmarkRepoFindByUser(userId);
  } catch (repoErr) {
    const repoError = (repoErr as Error).message;

    // Repo span — the origin of the failure. Fired first (innermost layer).
    watcher.event("trace", "error", "repo.query", {
      traceId: ctx.traceId,
      spanId: repoSpanId,
      parentSpanId: mySpanId,
      payload: {
        query: `SELECT * FROM bookmarks WHERE user_id = '${userId}'`,
        error: repoError,
        layer: "repository",
        source: "test-page",
      },
    });
    ctx.collected.push({
      spanId: repoSpanId,
      parentSpanId: mySpanId,
      eventType: "repo.query",
      error: repoError,
      depth: 3,
    });

    const useCaseError = `useCase.fetchBookmarks(${userId}): ${repoError}`;

    // Use case span — wraps the repo failure with business context.
    watcher.event("trace", "error", "usecase.fetchBookmarks", {
      traceId: ctx.traceId,
      spanId: mySpanId,
      parentSpanId: ctx.callerSpanId,
      payload: {
        userId,
        error: useCaseError,
        layer: "use-case",
        source: "test-page",
      },
    });
    ctx.collected.push({
      spanId: mySpanId,
      parentSpanId: ctx.callerSpanId,
      eventType: "usecase.fetchBookmarks",
      error: useCaseError,
      depth: 2,
    });

    throw new Error(useCaseError, { cause: repoErr });
  }

  return undefined as never;
}
