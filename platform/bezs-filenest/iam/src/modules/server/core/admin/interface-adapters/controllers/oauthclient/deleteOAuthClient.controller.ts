import {
  DeleteOAuthClientValidationSchema,
  TDeleteOAuthClientResponseDtoSchema,
} from "@/modules/entities/schemas/admin/oauthclient/oauthclient.schema";
import { deleteOAuthClientUseCase } from "../../../application/usecases/oauthclient/deleteOAuthClient.usecase";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";

function presenter(data: TDeleteOAuthClientResponseDtoSchema) {
  return data;
}

export type TDeleteOAuthClientControllerOutput = ReturnType<typeof presenter>;

export async function deleteOAuthClientController(
  input: unknown,
): Promise<TDeleteOAuthClientControllerOutput> {
  const parsed = await DeleteOAuthClientValidationSchema.safeParseAsync(input);

  if (!parsed.success) {
    throw new InputParseError(parsed.error);
  }

  const data = await deleteOAuthClientUseCase(parsed.data);
  return presenter(data);
}
