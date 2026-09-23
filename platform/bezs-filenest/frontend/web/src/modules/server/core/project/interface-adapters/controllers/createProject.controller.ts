/**
 * createProject.controller — interface adapter for project creation.
 *
 * Layer: core / project / interface-adapters / controllers
 * Operation: create
 *
 * Validates the raw input against CreateProjectSchema, delegates to the
 * use case, and passes the result through the presenter.
 *
 * @module
 */
"server-only";

import { CreateProjectSchema, type TProject } from "@/modules/entities/schemas/project";
import { InputParseError } from "@/modules/server/shared/errors/schema-parse-error";
import { createProjectUseCase } from "../../application/usecases/createProject.usecase";

function presenter(data: TProject): TProject {
  return data;
}

export type TCreateProjectControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates and executes a project creation.
 *
 * @param input - Raw (unknown) payload from the server action.
 * @returns The newly created project record.
 * @throws InputParseError on Zod validation failure.
 */
export async function createProjectController(
  input: unknown,
): Promise<TCreateProjectControllerOutput> {
  const parsed = await CreateProjectSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await createProjectUseCase(parsed.data);
  return presenter(data);
}
