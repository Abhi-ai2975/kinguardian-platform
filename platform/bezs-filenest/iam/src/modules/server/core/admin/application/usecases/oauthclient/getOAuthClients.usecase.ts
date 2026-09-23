import { TGetOAuthClientsResponseDtoSchema } from "@/modules/entities/schemas/admin/oauthclient/oauthclient.schema";
import { getInjection } from "@/modules/server/di/container";

export async function getOAuthClientsUseCase(): Promise<TGetOAuthClientsResponseDtoSchema> {
  const oAuthClientService = getInjection("IOAuthClientService");
  const data = await oAuthClientService.getOAuthClients();
  return data;
}
