/**
 * createWorkflowState use case.
 *
 * Layer: server / core / emr-chat / application
 *
 * Creates a workflow state row when a FHIR workflow begins. The full
 * WorkflowDefinition JSON is stored so the session can be resumed even
 * if the workflow definition changes in a later deployment.
 */

import { getInjection } from "@/modules/server/di/container";
import type {
  TCreateWorkflowState,
  TEmrWorkflowState,
} from "@/modules/entities/schemas/emr-chat";

/**
 * Persists a new workflow run.
 *
 * @param dto - sessionId, full workflow definition JSON, initial context.
 * @returns The created workflow state.
 */
export async function createWorkflowStateUseCase(
  dto: TCreateWorkflowState,
): Promise<TEmrWorkflowState> {
  const service = getInjection("IEmrChatRepository");
  return service.createWorkflowState(dto);
}
