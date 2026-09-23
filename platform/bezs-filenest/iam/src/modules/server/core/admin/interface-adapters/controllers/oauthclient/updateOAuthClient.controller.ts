import {
  UpdateOAuthClientValidationSchema,
  TGetOAuthClientResponseDtoSchema,
} from "@/modules/entities/schemas/admin/oauthclient/oauthclient.schema";
import { updateOAuthClientUseCase } from "../../../application/usecases/oauthclient/updateOAuthClient.usecase";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";

function presenter(data: TGetOAuthClientResponseDtoSchema) {
  return data;
}

export type TUpdateOAuthClientControllerOutput = ReturnType<typeof presenter>;

export async function updateOAuthClientController(
  input: unknown,
): Promise<TUpdateOAuthClientControllerOutput> {
  const parsed = await UpdateOAuthClientValidationSchema.safeParseAsync(input);

  if (!parsed.success) {
    throw new InputParseError(parsed.error);
  }

  const data = await updateOAuthClientUseCase(parsed.data);
  return presenter(data);
}
