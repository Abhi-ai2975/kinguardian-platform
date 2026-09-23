/**
 * createWorkflowState controller.
 *
 * Layer: server / core / emr-chat / interface-adapters / controllers
 *
 * Validates the workflow init payload and creates a new workflow state row.
 */

import { CreateWorkflowStateSchema } from "@/modules/entities/schemas/emr-chat";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { createWorkflowStateUseCase } from "../../application/usecases/createWorkflowState.usecase";
import type { TEmrWorkflowState } from "@/modules/entities/schemas/emr-chat";

/** @internal */
function presenter(data: TEmrWorkflowState) {
  return data;
}

export type TCreateWorkflowStateControllerOutput = ReturnType<typeof presenter>;

/**
 * Creates a workflow state row when a FHIR workflow begins.
 *
 * @param input - Raw create workflow state payload.
 * @returns Created workflow state.
 * @throws InputParseError on validation failure.
 */
export async function createWorkflowStateController(
  input: unknown,
): Promise<TCreateWorkflowStateControllerOutput> {
  const parsed = await CreateWorkflowStateSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await createWorkflowStateUseCase(parsed.data);
  return presenter(data);
}
