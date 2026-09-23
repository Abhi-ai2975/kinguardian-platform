import {
  DeleteExpiredApiKeysValidationSchema,
  TDeleteExpiredApiKeysValidationSchema,
} from "@/modules/entities/schemas/admin/api-keys/api-keys.schema";
import { deleteExpiredApiKeysUseCase } from "../../../application/usecases/apikeys/deleteExpiredApiKeys.usecase";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";

function presenter(data: { success: boolean }) {
  return data;
}

export type TDeleteExpiredApiKeysControllerOutput = ReturnType<typeof presenter>;

export async function deleteExpiredApiKeysController(
  input: TDeleteExpiredApiKeysValidationSchema,
): Promise<TDeleteExpiredApiKeysControllerOutput> {
  const { data, error } =
    await DeleteExpiredApiKeysValidationSchema.safeParseAsync(input);
  if (error) throw new InputParseError(error);
  const result = await deleteExpiredApiKeysUseCase(data);
  return presenter(result);
}
