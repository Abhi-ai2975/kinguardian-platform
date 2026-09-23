import {
  CreateApiKeyValidationSchema,
  TCreateApiKeyValidationSchema,
  TApiKeyCreatedSchema,
} from "@/modules/entities/schemas/admin/api-keys/api-keys.schema";
import { createApiKeyUseCase } from "../../../application/usecases/apikeys/createApiKey.usecase";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";

function presenter(data: TApiKeyCreatedSchema) {
  return data;
}

export type TCreateApiKeyControllerOutput = ReturnType<typeof presenter>;

export async function createApiKeyController(
  input: TCreateApiKeyValidationSchema,
): Promise<TCreateApiKeyControllerOutput> {
  const { data, error } = await CreateApiKeyValidationSchema.safeParseAsync(input);
  if (error) throw new InputParseError(error);
  const result = await createApiKeyUseCase(data);
  return presenter(result);
}
