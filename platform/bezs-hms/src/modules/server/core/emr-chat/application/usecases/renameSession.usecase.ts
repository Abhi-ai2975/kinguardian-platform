/**
 * renameSession use case.
 *
 * Layer: server / core / emr-chat / application
 *
 * Renames a session title. Called when the user edits the title inline
 * in the session history sidebar.
 */

import { getInjection } from "@/modules/server/di/container";

/**
 * Updates the title of the given session.
 *
 * @param id - Session UUID.
 * @param title - New user-provided title.
 */
export async function renameSessionUseCase(id: string, title: string): Promise<void> {
  const service = getInjection("IEmrChatRepository");
  return service.updateSessionTitle(id, title);
}
