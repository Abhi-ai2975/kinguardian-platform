/**
 * getProjectConfig.controller — validates input and calls the get use case.
 *
 * @module
 */
"server-only";

import { getProjectConfigUseCase } from "../../application/usecases/getProjectConfig.usecase";
import { InputParseError, OutputParseError } from "@/modules/server/shared/errors/schema-parse-error";
import { ProjectConfigSchema } from "@/modules/entities/schemas/project-config";
import type { TProjectConfig } from "@/modules/entities/schemas/project-config";
import { z } from "zod";

const InputSchema = z.object({ projectId: z.string().min(1) });

function presenter(data: TProjectConfig): TProjectConfig {
  return data;
}

export type TGetProjectConfigControllerOutput = ReturnType<typeof presenter>;

export async function getProjectConfigController(
  input: unknown,
): Promise<TGetProjectConfigControllerOutput> {
  const parsed = await InputSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await getProjectConfigUseCase(parsed.data.projectId);
  const out = ProjectConfigSchema.safeParse(data);
  if (!out.success) throw new OutputParseError(out.error);
  return presenter(out.data);
}
