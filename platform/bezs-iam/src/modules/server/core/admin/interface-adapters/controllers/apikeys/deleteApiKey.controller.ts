import {
  DeleteApiKeyValidationSchema,
  TDeleteApiKeyValidationSchema,
} from "@/modules/entities/schemas/admin/api-keys/api-keys.schema";
import { deleteApiKeyUseCase } from "../../../application/usecases/apikeys/deleteApiKey.usecase";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";

function presenter(data: { success: boolean }) {
  return data;
}

export type TDeleteApiKeyControllerOutput = ReturnType<typeof presenter>;

export async function deleteApiKeyController(
  input: TDeleteApiKeyValidationSchema,
): Promise<TDeleteApiKeyControllerOutput> {
  const { data, error } = await DeleteApiKeyValidationSchema.safeParseAsync(input);
  if (error) throw new InputParseError(error);
  const result = await deleteApiKeyUseCase(data);
  return presenter(result);
}
