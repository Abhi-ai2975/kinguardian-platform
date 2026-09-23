/**
 * addTags.controller — validates input and appends tags to a file.
 *
 * @module
 */
"server-only";

import { addTagsUseCase } from "../../application/usecases/addTags.usecase";
import { AddTagsSchema, type TTagsResponse } from "@/modules/entities/schemas/file";
import { InputParseError } from "@/modules/server/shared/errors/schema-parse-error";

function presenter(data: TTagsResponse): TTagsResponse { return data; }
export type TAddTagsControllerOutput = ReturnType<typeof presenter>;

export async function addTagsController(input: unknown): Promise<TAddTagsControllerOutput> {
  const parsed = await AddTagsSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  return presenter(await addTagsUseCase(parsed.data));
}
