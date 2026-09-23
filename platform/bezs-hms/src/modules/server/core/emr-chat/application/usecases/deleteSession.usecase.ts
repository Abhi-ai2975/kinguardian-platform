/**
 * deleteSession use case.
 *
 * Layer: server / core / emr-chat / application
 *
 * Archives a session so it disappears from the sidebar. Data is retained for
 * compliance — nothing is physically deleted.
 */

import { getInjection } from "@/modules/server/di/container";

/**
 * Archives the given session.
 *
 * @param id - Session UUID.
 */
export async function deleteSessionUseCase(id: string): Promise<void> {
  const service = getInjection("IEmrChatRepository");
  return service.deleteSession(id);
}
