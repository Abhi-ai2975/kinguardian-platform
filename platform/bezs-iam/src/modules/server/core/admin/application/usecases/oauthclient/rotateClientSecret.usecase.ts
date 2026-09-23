import {
  TRotateClientSecretValidationSchema,
  TGetOAuthClientResponseDtoSchema,
} from "@/modules/entities/schemas/admin/oauthclient/oauthclient.schema";
import { getInjection } from "@/modules/server/di/container";

export async function rotateClientSecretUseCase(
  payload: TRotateClientSecretValidationSchema,
): Promise<TGetOAuthClientResponseDtoSchema> {
  const oAuthClientService = getInjection("IOAuthClientService");
  return await oAuthClientService.rotateClientSecret(payload);
}
