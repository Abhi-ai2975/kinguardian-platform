/**
 * renameSession controller.
 *
 * Layer: server / core / emr-chat / interface-adapters / controllers
 *
 * Renames a session title from the history sidebar inline edit.
 */

import { renameSessionUseCase } from "../../application/usecases/renameSession.usecase";

/**
 * Updates the title of a session.
 *
 * @param id - Session UUID.
 * @param title - New title provided by the user.
 */
export async function renameSessionController(id: string, title: string): Promise<void> {
  await renameSessionUseCase(id, title);
}
