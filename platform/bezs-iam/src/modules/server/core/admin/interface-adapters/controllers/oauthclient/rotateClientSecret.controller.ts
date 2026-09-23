import {
  RotateClientSecretValidationSchema,
  TGetOAuthClientResponseDtoSchema,
} from "@/modules/entities/schemas/admin/oauthclient/oauthclient.schema";
import { rotateClientSecretUseCase } from "../../../application/usecases/oauthclient/rotateClientSecret.usecase";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";

function presenter(data: TGetOAuthClientResponseDtoSchema) {
  return data;
}

export type TRotateClientSecretControllerOutput = ReturnType<typeof presenter>;

export async function rotateClientSecretController(
  input: unknown,
): Promise<TRotateClientSecretControllerOutput> {
  const parsed =
    await RotateClientSecretValidationSchema.safeParseAsync(input);

  if (!parsed.success) {
    throw new InputParseError(parsed.error);
  }

  const data = await rotateClientSecretUseCase(parsed.data);
  return presenter(data);
}
