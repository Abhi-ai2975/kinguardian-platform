/**
 * updateProcessingConfig.controller — validates input and calls the processing config update use case.
 *
 * @module
 */
"server-only";

import { updateProcessingConfigUseCase } from "../../application/usecases/updateProcessingConfig.usecase";
import { InputParseError, OutputParseError } from "@/modules/server/shared/errors/schema-parse-error";
import { UpdateProcessingConfigSchema, ProjectConfigSchema } from "@/modules/entities/schemas/project-config";
import type { TProjectConfig } from "@/modules/entities/schemas/project-config";

function presenter(data: TProjectConfig): TProjectConfig {
  return data;
}

export type TUpdateProcessingConfigControllerOutput = ReturnType<typeof presenter>;

export async function updateProcessingConfigController(
  input: unknown,
): Promise<TUpdateProcessingConfigControllerOutput> {
  const parsed = await UpdateProcessingConfigSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await updateProcessingConfigUseCase(parsed.data);
  const out = ProjectConfigSchema.safeParse(data);
  if (!out.success) throw new OutputParseError(out.error);
  return presenter(out.data);
}
