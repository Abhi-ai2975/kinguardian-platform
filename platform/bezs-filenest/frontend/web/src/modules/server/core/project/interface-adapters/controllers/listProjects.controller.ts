/**
 * listProjects.controller — interface adapter for listing projects.
 *
 * Layer: core / project / interface-adapters / controllers
 * Operation: list
 *
 * No input validation needed — list takes no arguments. Calls the use
 * case and passes the result through the presenter.
 *
 * @module
 */
"server-only";

import { listProjectsUseCase } from "../../application/usecases/listProjects.usecase";
import { ListProjectsParamsSchema, type TProjectList } from "@/modules/entities/schemas/project";
import { InputParseError } from "@/modules/server/shared/errors/schema-parse-error";

function presenter(data: TProjectList): TProjectList {
  return data;
}

export type TListProjectsControllerOutput = ReturnType<typeof presenter>;

/**
 * Lists projects with optional server-side pagination, sort, and filters.
 *
 * @param input - Raw params object from the action payload (validated here).
 * @returns Paginated project list.
 */
export async function listProjectsController(input?: unknown): Promise<TListProjectsControllerOutput> {
  const parsed = await ListProjectsParamsSchema.safeParseAsync(input ?? {});
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await listProjectsUseCase(parsed.data);
  return presenter(data);
}
