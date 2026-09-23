import {
  TUpdateOAuthClientValidationSchema,
  TGetOAuthClientResponseDtoSchema,
} from "@/modules/entities/schemas/admin/oauthclient/oauthclient.schema";
import { getInjection } from "@/modules/server/di/container";

export async function updateOAuthClientUseCase(
  payload: TUpdateOAuthClientValidationSchema,
): Promise<TGetOAuthClientResponseDtoSchema> {
  const oAuthClientService = getInjection("IOAuthClientService");
  return await oAuthClientService.updateOAuthClient(payload);
}
