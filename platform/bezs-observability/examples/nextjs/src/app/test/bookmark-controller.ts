// bookmark-controller.ts — controller / interface-adapter layer.
// Orchestrates the use case, fires its own error trace span on failure,
// and re-wraps the error with controller-level context before rethrowing.

import { watcher } from "@/lib/watcher";
import { fetchBookmarksUseCase } from "./bookmark-use-case";
import type { ErrorTraceSpan } from "@/app/test/actions";

export interface ControllerTraceCtx {
  traceId: string;
  callerSpanId: string; // span ID of the server action — becomes our parentSpanId
  collected: ErrorTraceSpan[];
}

export async function bookmarkController(
  userId: string,
  ctx: ControllerTraceCtx,
): Promise<never> {
  const mySpanId = crypto.randomUUID();

  try {
    await fetchBookmarksUseCase(userId, {
      traceId: ctx.traceId,
      callerSpanId: mySpanId, // controller's span is the use case's parent
      collected: ctx.collected,
    });
  } catch (err) {
    const controllerError = `BookmarkController.getForUser(${userId}): ${(err as Error).message}`;

    watcher.event("trace", "error", "controller.getBookmarks", {
      traceId: ctx.traceId,
      spanId: mySpanId,
      parentSpanId: ctx.callerSpanId,
      payload: {
        userId,
        error: controllerError,
        layer: "controller",
        source: "test-page",
      },
    });
    ctx.collected.push({
      spanId: mySpanId,
      parentSpanId: ctx.callerSpanId,
      eventType: "controller.getBookmarks",
      error: controllerError,
      depth: 1,
    });

    throw new Error(controllerError, { cause: err });
  }

  return undefined as never;
}
