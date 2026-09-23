/**
 * addMessage use case.
 *
 * Layer: server / core / emr-chat / application
 *
 * Persists a single chat message (user or assistant) to the active session.
 */

import { getInjection } from "@/modules/server/di/container";
import type {
  TAddEmrChatMessage,
  TEmrChatMessage,
} from "@/modules/entities/schemas/emr-chat";

/**
 * Appends a message to a session.
 *
 * @param dto - sessionId, role, content, type, optional metadata.
 * @returns The created message.
 */
export async function addMessageUseCase(
  dto: TAddEmrChatMessage,
): Promise<TEmrChatMessage> {
  const service = getInjection("IEmrChatRepository");
  return service.addMessage(dto);
}
