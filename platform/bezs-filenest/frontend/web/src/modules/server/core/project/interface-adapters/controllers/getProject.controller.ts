/**
 * getProject.controller — interface adapter for fetching a single project.
 *
 * Layer: core / project / interface-adapters / controllers
 * Operation: get
 *
 * @module
 */
"server-only";

import { z } from "zod";
import { getProjectUseCase } from "../../application/usecases/getProject.usecase";
import type { TProject } from "@/modules/entities/schemas/project";
import { InputParseError } from "@/modules/server/shared/errors/schema-parse-error";

const GetProjectInputSchema = z.object({ projectId: z.string().min(1) });

function presenter(data: TProject): TProject {
  return data;
}

export type TGetProjectControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the projectId and returns the project.
 *
 * @param input - Raw input from the action payload.
 * @returns The project record.
 */
export async function getProjectController(input: unknown): Promise<TGetProjectControllerOutput> {
  const parsed = await GetProjectInputSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await getProjectUseCase(parsed.data.projectId);
  return presenter(data);
}
