/**
 * addMessage controller.
 *
 * Layer: server / core / emr-chat / interface-adapters / controllers
 *
 * Validates the message payload and appends it to the session.
 */

import { AddEmrChatMessageSchema } from "@/modules/entities/schemas/emr-chat";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { addMessageUseCase } from "../../application/usecases/addMessage.usecase";
import type { TEmrChatMessage } from "@/modules/entities/schemas/emr-chat";

/** @internal */
function presenter(data: TEmrChatMessage) {
  return data;
}

export type TAddMessageControllerOutput = ReturnType<typeof presenter>;

/**
 * Appends a message to a session.
 *
 * @param input - Raw add message payload.
 * @returns Created message.
 * @throws InputParseError on validation failure.
 */
export async function addMessageController(
  input: unknown,
): Promise<TAddMessageControllerOutput> {
  const parsed = await AddEmrChatMessageSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await addMessageUseCase(parsed.data);
  return presenter(data);
}
