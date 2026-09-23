import {
  UpdateApiKeyValidationSchema,
  TUpdateApiKeyValidationSchema,
  TApiKeySchema,
} from "@/modules/entities/schemas/admin/api-keys/api-keys.schema";
import { updateApiKeyUseCase } from "../../../application/usecases/apikeys/updateApiKey.usecase";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";

function presenter(data: TApiKeySchema) {
  return data;
}

export type TUpdateApiKeyControllerOutput = ReturnType<typeof presenter>;

export async function updateApiKeyController(
  input: TUpdateApiKeyValidationSchema,
): Promise<TUpdateApiKeyControllerOutput> {
  const { data, error } = await UpdateApiKeyValidationSchema.safeParseAsync(input);
  if (error) throw new InputParseError(error);
  const result = await updateApiKeyUseCase(data);
  return presenter(result);
}
