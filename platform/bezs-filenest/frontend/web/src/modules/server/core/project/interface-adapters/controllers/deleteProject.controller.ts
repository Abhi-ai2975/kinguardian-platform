/**
 * deleteProject.controller — interface adapter for project soft-deletion.
 *
 * Layer: core / project / interface-adapters / controllers
 * Operation: delete
 *
 * Validates the projectId, delegates to the use case. No presenter needed
 * (204 No Content — the use case returns void).
 *
 * @module
 */
"server-only";

import { z } from "zod";
import { InputParseError } from "@/modules/server/shared/errors/schema-parse-error";
import { deleteProjectUseCase } from "../../application/usecases/deleteProject.usecase";

const DeleteProjectControllerSchema = z.object({
  projectId: z.string().min(1),
});

export type TDeleteProjectControllerOutput = void;

/**
 * Validates and executes a project soft-delete.
 *
 * @param input - Raw payload containing projectId.
 * @throws InputParseError on Zod validation failure.
 */
export async function deleteProjectController(input: unknown): Promise<void> {
  const parsed = await DeleteProjectControllerSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deleteProjectUseCase(parsed.data.projectId);
}
