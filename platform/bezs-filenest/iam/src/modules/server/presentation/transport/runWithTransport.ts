/**
 * @module presentation/transport/runWithTransport
 * @description Wraps every server action's execution with transport-side effects.
 *              Handles revalidation (`revalidatePath`) and redirection (`redirect`)
 *              after successful mutations, and maps all errors through the ZSA
 *              error mapper for consistent client-side error handling.
 *
 * **Transport options (set by the action):**
 * - `shouldRevalidate: true` → calls `revalidatePath(url, revalidateType)`
 * - `shouldRedirect: true` → calls `redirect(url)` — used for impersonation
 *   where the browser must pick up a new session cookie.
 *
 * **Error handling:**
 * - Domain errors (`ApplicationError`, `AuthError`, etc.) → ZSA `ERROR_CODES`
 * - Zod parse errors (`InputParseError`, `OutputParseError`) → ZSA `PARSE_ERROR`
 * - Next.js control signals (`redirect`) → rethrown untouched
 *
 * @param executor - Async function returning `{ result, transport? }`.
 * @returns The result value (never returns on redirect — throws control signal).
 * @category Transport
 */

"server-only";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { mapErrorToZSA } from "../../shared/errors/mappers/mapErrorToZSA";

type TransportDecision = {
  url?: string | null;
  shouldRevalidate?: boolean;
  shouldRedirect?: boolean;
  revalidateType?: "page" | "layout";
};

export async function runWithTransport<T>(
  executor: () => Promise<{
    result: T;
    transport?: TransportDecision;
  }>,
): Promise<T> {
  try {
    const { result, transport } = await executor();

    if (transport?.url && transport?.shouldRevalidate) {
      revalidatePath(transport.url, transport.revalidateType ?? "page");
    }

    // NOTE:
    // redirect() intentionally throws a Next.js control signal.
    // This must NOT be caught or transformed.
    if (transport?.url && transport?.shouldRedirect) {
      redirect(transport.url);
    }
    return result;
  } catch (err) {
    // mapErrorToZSA rethrows Next.js control errors untouched
    mapErrorToZSA(err);
  }
}
