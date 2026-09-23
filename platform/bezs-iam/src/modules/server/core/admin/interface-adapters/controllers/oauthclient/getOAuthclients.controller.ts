import { TGetOAuthClientsResponseDtoSchema } from "@/modules/entities/schemas/admin/oauthclient/oauthclient.schema";
import { getOAuthClientsUseCase } from "../../../application/usecases/oauthclient";

function presenter(data: TGetOAuthClientsResponseDtoSchema) {
  return data;
}

export type TGetOAuthClientsControllerOutput = ReturnType<typeof presenter>;

export async function getOAuthClientsController(): Promise<TGetOAuthClientsControllerOutput> {
  const data = await getOAuthClientsUseCase();
  return presenter(data);
}
