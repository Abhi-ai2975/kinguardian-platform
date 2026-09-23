/**
 * getSession use case.
 *
 * Layer: server / core / emr-chat / application
 *
 * Loads a full session with all messages and the active workflow state.
 * Used when the user switches to an existing session in the sidebar.
 */

import { getInjection } from "@/modules/server/di/container";
import type { TEmrChatSessionFull } from "@/modules/entities/schemas/emr-chat";

/**
 * Retrieves a session by ID including messages and active workflow.
 *
 * @param id - Session UUID.
 * @returns Full session data.
 * @throws NotFoundError if session does not exist.
 */
export async function getSessionUseCase(id: string): Promise<TEmrChatSessionFull> {
  const service = getInjection("IEmrChatRepository");
  return service.getSession(id);
}
