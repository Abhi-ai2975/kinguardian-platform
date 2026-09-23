/**
 * getSession controller.
 *
 * Layer: server / core / emr-chat / interface-adapters / controllers
 *
 * Loads a full session by ID — no additional input validation needed since the
 * ID is a string UUID sourced from the URL.
 */

import { getSessionUseCase } from "../../application/usecases/getSession.usecase";
import type { TEmrChatSessionFull } from "@/modules/entities/schemas/emr-chat";

/** @internal */
function presenter(data: TEmrChatSessionFull) {
  return data;
}

export type TGetSessionControllerOutput = ReturnType<typeof presenter>;

/**
 * Loads a full session by ID.
 *
 * @param id - Session UUID.
 * @returns Full session with messages and active workflow.
 * @throws NotFoundError if not found.
 */
export async function getSessionController(
  id: string,
): Promise<TGetSessionControllerOutput> {
  const data = await getSessionUseCase(id);
  return presenter(data);
}
