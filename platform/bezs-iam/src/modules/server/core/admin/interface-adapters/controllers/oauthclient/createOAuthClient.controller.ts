import {
  CreateOAuthClientValidationSchema,
  TCreateOAuthClientResponseDtoSchema,
} from "@/modules/entities/schemas/admin/oauthclient/oauthclient.schema";
import { createOAuthClientUseCase } from "../../../application/usecases/oauthclient/createOAuthClient.usecase";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";

function presenter(data: TCreateOAuthClientResponseDtoSchema) {
  return data;
}

export type TCreateOAuthClientControllerOutput = ReturnType<typeof presenter>;

export async function createOAuthClientController(
  input: any,
): Promise<TCreateOAuthClientControllerOutput> {
  const parsed = await CreateOAuthClientValidationSchema.safeParseAsync(input);

  if (!parsed.success) {
    throw new InputParseError(parsed.error);
  }

  const data = await createOAuthClientUseCase(parsed.data);
  return presenter(data);
}
