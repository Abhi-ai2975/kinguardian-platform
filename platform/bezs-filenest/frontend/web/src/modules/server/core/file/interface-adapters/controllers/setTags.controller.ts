/**
 * setTags.controller — validates input and replaces the full tag list on a file.
 *
 * @module
 */
"server-only";

import { setTagsUseCase } from "../../application/usecases/setTags.usecase";
import { SetTagsSchema, type TTagsResponse } from "@/modules/entities/schemas/file";
import { InputParseError } from "@/modules/server/shared/errors/schema-parse-error";

function presenter(data: TTagsResponse): TTagsResponse { return data; }
export type TSetTagsControllerOutput = ReturnType<typeof presenter>;

export async function setTagsController(input: unknown): Promise<TSetTagsControllerOutput> {
  const parsed = await SetTagsSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  return presenter(await setTagsUseCase(parsed.data));
}
