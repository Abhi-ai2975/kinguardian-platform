/**
 * pinSession use case.
 *
 * Layer: server / core / emr-chat / application
 *
 * Pins or unpins a session so it floats to the top of the sidebar list.
 */

import { getInjection } from "@/modules/server/di/container";

/**
 * Toggles the pinned state of the given session.
 *
 * @param id - Session UUID.
 * @param pinned - True to pin, false to unpin.
 */
export async function pinSessionUseCase(id: string, pinned: boolean): Promise<void> {
  const service = getInjection("IEmrChatRepository");
  return service.pinSession(id, pinned);
}
