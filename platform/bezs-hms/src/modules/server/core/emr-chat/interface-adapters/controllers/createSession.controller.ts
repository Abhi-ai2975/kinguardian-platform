/**
 * createSession controller.
 *
 * Layer: server / core / emr-chat / interface-adapters / controllers
 *
 * Validates the raw create-session payload and delegates to the use case.
 */

import { CreateEmrChatSessionSchema } from "@/modules/entities/schemas/emr-chat";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { createSessionUseCase } from "../../application/usecases/createSession.usecase";
import type { TEmrChatSessionSummary } from "@/modules/entities/schemas/emr-chat";

/** @internal */
function presenter(data: TEmrChatSessionSummary) {
  return data;
}

export type TCreateSessionControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates input and creates a new chat session.
 *
 * @param input - Raw create session payload.
 * @returns Created session summary.
 * @throws InputParseError on validation failure.
 */
export async function createSessionController(
  input: unknown,
): Promise<TCreateSessionControllerOutput> {
  const parsed = await CreateEmrChatSessionSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await createSessionUseCase(parsed.data);
  return presenter(data);
}
