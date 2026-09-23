/**
 * deleteSession controller.
 *
 * Layer: server / core / emr-chat / interface-adapters / controllers
 *
 * Archives a session so it no longer appears in the sidebar. The ID comes from
 * the action input and needs no additional schema validation here.
 */

import { deleteSessionUseCase } from "../../application/usecases/deleteSession.usecase";

/**
 * Archives a session by ID.
 *
 * @param id - Session UUID.
 */
export async function deleteSessionController(id: string): Promise<void> {
  await deleteSessionUseCase(id);
}
