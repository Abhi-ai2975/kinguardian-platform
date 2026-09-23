/**
 * updateWorkflowState use case.
 *
 * Layer: server / core / emr-chat / application
 *
 * Advances the current step index and / or merges new FHIR IDs into the
 * session context. Called after every successful step submission and when
 * a workflow is completed or abandoned.
 */

import { getInjection } from "@/modules/server/di/container";
import type {
  TUpdateWorkflowState,
  TEmrWorkflowState,
} from "@/modules/entities/schemas/emr-chat";

/**
 * Updates a workflow state row.
 *
 * @param id - WorkflowState UUID.
 * @param dto - Fields to update: stepIndex, sessionContext, status.
 * @returns The updated workflow state.
 */
export async function updateWorkflowStateUseCase(
  id: string,
  dto: TUpdateWorkflowState,
): Promise<TEmrWorkflowState> {
  const service = getInjection("IEmrChatRepository");
  return service.updateWorkflowState(id, dto);
}
