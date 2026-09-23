/**
 * updateSecurityConfig.controller — validates input and calls the security config update use case.
 *
 * @module
 */
"server-only";

import { updateSecurityConfigUseCase } from "../../application/usecases/updateSecurityConfig.usecase";
import { InputParseError, OutputParseError } from "@/modules/server/shared/errors/schema-parse-error";
import { UpdateSecurityConfigSchema, ProjectConfigSchema } from "@/modules/entities/schemas/project-config";
import type { TProjectConfig } from "@/modules/entities/schemas/project-config";

function presenter(data: TProjectConfig): TProjectConfig {
  return data;
}

export type TUpdateSecurityConfigControllerOutput = ReturnType<typeof presenter>;

export async function updateSecurityConfigController(
  input: unknown,
): Promise<TUpdateSecurityConfigControllerOutput> {
  const parsed = await UpdateSecurityConfigSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await updateSecurityConfigUseCase(parsed.data);
  const out = ProjectConfigSchema.safeParse(data);
  if (!out.success) throw new OutputParseError(out.error);
  return presenter(out.data);
}
