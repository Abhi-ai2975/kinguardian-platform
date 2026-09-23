import {
  TDeleteOAuthClientValidationSchema,
  TDeleteOAuthClientResponseDtoSchema,
} from "@/modules/entities/schemas/admin/oauthclient/oauthclient.schema";
import { getInjection } from "@/modules/server/di/container";

export async function deleteOAuthClientUseCase(
  payload: TDeleteOAuthClientValidationSchema,
): Promise<TDeleteOAuthClientResponseDtoSchema> {
  const oAuthClientService = getInjection("IOAuthClientService");
  return await oAuthClientService.deleteOAuthClient(payload);
}
