/**
 * addStepSubmission controller.
 *
 * Layer: server / core / emr-chat / interface-adapters / controllers
 *
 * Validates the step submission payload and upserts the record. Upsert
 * semantics handle re-submissions after transient errors without creating
 * duplicate rows.
 */

import { AddStepSubmissionSchema } from "@/modules/entities/schemas/emr-chat";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { addStepSubmissionUseCase } from "../../application/usecases/addStepSubmission.usecase";
import type { TEmrWorkflowStepSubmission } from "@/modules/entities/schemas/emr-chat";

/** @internal */
function presenter(data: TEmrWorkflowStepSubmission) {
  return data;
}

export type TAddStepSubmissionControllerOutput = ReturnType<typeof presenter>;

/**
 * Records a completed step submission.
 *
 * @param input - Raw add step submission payload.
 * @returns Created or updated step submission.
 * @throws InputParseError on validation failure.
 */
export async function addStepSubmissionController(
  input: unknown,
): Promise<TAddStepSubmissionControllerOutput> {
  const parsed = await AddStepSubmissionSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await addStepSubmissionUseCase(parsed.data);
  return presenter(data);
}
