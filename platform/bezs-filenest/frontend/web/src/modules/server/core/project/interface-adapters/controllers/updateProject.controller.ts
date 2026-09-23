/**
 * updateProject.controller — interface adapter for project updates.
 *
 * Layer: core / project / interface-adapters / controllers
 * Operation: update (PATCH)
 *
 * Validates the raw input, extracts projectId + patch payload,
 * delegates to the use case, and passes the result through the presenter.
 *
 * @module
 */
"server-only";

import { z } from "zod";
import { UpdateProjectSchema, type TProject } from "@/modules/entities/schemas/project";
import { InputParseError } from "@/modules/server/shared/errors/schema-parse-error";
import { updateProjectUseCase } from "../../application/usecases/updateProject.usecase";

const UpdateProjectControllerSchema = UpdateProjectSchema.extend({
  projectId: z.string().min(1),
});

function presenter(data: TProject): TProject {
  return data;
}

export type TUpdateProjectControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates and executes a project update.
 *
 * @param input - Raw payload containing projectId + patch fields.
 * @returns The updated project record.
 * @throws InputParseError on Zod validation failure.
 */
export async function updateProjectController(
  input: unknown,
): Promise<TUpdateProjectControllerOutput> {
  const parsed = await UpdateProjectControllerSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { projectId, ...dto } = parsed.data;
  const data = await updateProjectUseCase(projectId, dto);
  return presenter(data);
}
