/**
 * listSessions controller.
 *
 * Layer: server / core / emr-chat / interface-adapters / controllers
 *
 * Validates query params and returns the session list for the sidebar.
 */

import { ListEmrChatSessionsSchema } from "@/modules/entities/schemas/emr-chat";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { listSessionsUseCase } from "../../application/usecases/listSessions.usecase";
import type { TEmrChatSessionSummary } from "@/modules/entities/schemas/emr-chat";

/** @internal */
function presenter(data: TEmrChatSessionSummary[]) {
  return data;
}

export type TListSessionsControllerOutput = ReturnType<typeof presenter>;

/**
 * Lists sessions for the authenticated user.
 *
 * @param input - Raw list query params.
 * @returns Array of session summaries.
 * @throws InputParseError on validation failure.
 */
export async function listSessionsController(
  input: unknown,
): Promise<TListSessionsControllerOutput> {
  const parsed = await ListEmrChatSessionsSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await listSessionsUseCase(parsed.data);
  return presenter(data);
}
