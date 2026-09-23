/**
 * addStepSubmission use case.
 *
 * Layer: server / core / emr-chat / application
 *
 * Records a completed FHIR step submission — form data, API response, and the
 * outputs that were extracted into sessionContext. This enables full audit
 * trails and lets the UI show historical step results when resuming a session.
 */

import { getInjection } from "@/modules/server/di/container";
import type {
  TAddStepSubmission,
  TEmrWorkflowStepSubmission,
} from "@/modules/entities/schemas/emr-chat";

/**
 * Upserts a step submission record (upsert handles re-submissions after errors).
 *
 * @param dto - workflowStateId, stepIndex, form data, response, outputs.
 * @returns The upserted step submission.
 */
export async function addStepSubmissionUseCase(
  dto: TAddStepSubmission,
): Promise<TEmrWorkflowStepSubmission> {
  const service = getInjection("IEmrChatRepository");
  return service.addStepSubmission(dto);
}
