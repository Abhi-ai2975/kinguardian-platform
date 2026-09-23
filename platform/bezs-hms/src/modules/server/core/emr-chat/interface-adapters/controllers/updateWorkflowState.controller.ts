/**
 * updateWorkflowState controller.
 *
 * Layer: server / core / emr-chat / interface-adapters / controllers
 *
 * Validates the update payload and advances the workflow step or updates
 * session context. The ID is sourced from the action input and is trusted.
 */

import { UpdateWorkflowStateSchema } from "@/modules/entities/schemas/emr-chat";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { updateWorkflowStateUseCase } from "../../application/usecases/updateWorkflowState.usecase";
import type { TEmrWorkflowState } from "@/modules/entities/schemas/emr-chat";

/** @internal */
function presenter(data: TEmrWorkflowState) {
  return data;
}

export type TUpdateWorkflowStateControllerOutput = ReturnType<typeof presenter>;

/**
 * Advances the workflow step or updates session context.
 *
 * @param id - WorkflowState UUID.
 * @param input - Raw update payload.
 * @returns Updated workflow state.
 * @throws InputParseError on validation failure.
 */
export async function updateWorkflowStateController(
  id: string,
  input: unknown,
): Promise<TUpdateWorkflowStateControllerOutput> {
  const parsed = await UpdateWorkflowStateSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await updateWorkflowStateUseCase(id, parsed.data);
  return presenter(data);
}
