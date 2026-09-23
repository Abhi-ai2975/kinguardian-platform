/**
 * pinSession controller.
 *
 * Layer: server / core / emr-chat / interface-adapters / controllers
 *
 * Pins or unpins a session in the sidebar list.
 */

import { pinSessionUseCase } from "../../application/usecases/pinSession.usecase";

/**
 * Toggles the pinned state of a session.
 *
 * @param id - Session UUID.
 * @param pinned - True to pin, false to unpin.
 */
export async function pinSessionController(id: string, pinned: boolean): Promise<void> {
  await pinSessionUseCase(id, pinned);
}
