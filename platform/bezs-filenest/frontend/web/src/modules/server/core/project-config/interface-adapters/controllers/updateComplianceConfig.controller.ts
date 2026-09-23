/**
 * updateComplianceConfig.controller — validates input and calls the compliance config update use case.
 *
 * @module
 */
"server-only";

import { updateComplianceConfigUseCase } from "../../application/usecases/updateComplianceConfig.usecase";
import { InputParseError, OutputParseError } from "@/modules/server/shared/errors/schema-parse-error";
import { UpdateComplianceConfigSchema, ProjectConfigSchema } from "@/modules/entities/schemas/project-config";
import type { TProjectConfig } from "@/modules/entities/schemas/project-config";

function presenter(data: TProjectConfig): TProjectConfig {
  return data;
}

export type TUpdateComplianceConfigControllerOutput = ReturnType<typeof presenter>;

export async function updateComplianceConfigController(
  input: unknown,
): Promise<TUpdateComplianceConfigControllerOutput> {
  const parsed = await UpdateComplianceConfigSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await updateComplianceConfigUseCase(parsed.data);
  const out = ProjectConfigSchema.safeParse(data);
  if (!out.success) throw new OutputParseError(out.error);
  return presenter(out.data);
}
