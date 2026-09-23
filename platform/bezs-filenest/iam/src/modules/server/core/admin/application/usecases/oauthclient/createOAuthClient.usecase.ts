import {
  TCreateOAuthClientResponseDtoSchema,
  TCreateOAuthClientValidationSchema,
} from "@/modules/entities/schemas/admin/oauthclient/oauthclient.schema";
import { getInjection } from "@/modules/server/di/container";

export async function createOAuthClientUseCase(
  payload: TCreateOAuthClientValidationSchema,
): Promise<TCreateOAuthClientResponseDtoSchema> {
  const oAuthClientService = getInjection("IOAuthClientService");
  const data = await oAuthClientService.createOAuthClient(payload);
  return data;
}
