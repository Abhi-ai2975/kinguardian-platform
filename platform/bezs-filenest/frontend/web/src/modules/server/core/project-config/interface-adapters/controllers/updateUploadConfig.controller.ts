/**
 * updateUploadConfig.controller — validates input and calls the upload config update use case.
 *
 * @module
 */
"server-only";

import { updateUploadConfigUseCase } from "../../application/usecases/updateUploadConfig.usecase";
import { InputParseError, OutputParseError } from "@/modules/server/shared/errors/schema-parse-error";
import { UpdateUploadConfigSchema, ProjectConfigSchema } from "@/modules/entities/schemas/project-config";
import type { TProjectConfig } from "@/modules/entities/schemas/project-config";

function presenter(data: TProjectConfig): TProjectConfig {
  return data;
}

export type TUpdateUploadConfigControllerOutput = ReturnType<typeof presenter>;

export async function updateUploadConfigController(
  input: unknown,
): Promise<TUpdateUploadConfigControllerOutput> {
  const parsed = await UpdateUploadConfigSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await updateUploadConfigUseCase(parsed.data);
  const out = ProjectConfigSchema.safeParse(data);
  if (!out.success) throw new OutputParseError(out.error);
  return presenter(out.data);
}
