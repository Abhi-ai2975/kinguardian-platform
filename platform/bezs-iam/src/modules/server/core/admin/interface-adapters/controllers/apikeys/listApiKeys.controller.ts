import {
  TApiKeySchema,
  TListApiKeysQuerySchema,
} from "@/modules/entities/schemas/admin/api-keys/api-keys.schema";
import { listApiKeysUseCase } from "../../../application/usecases/apikeys/listApiKeys.usecase";

function presenter(data: { apiKeys: TApiKeySchema[]; total: number }) {
  return data;
}

export type TListApiKeysControllerOutput = ReturnType<typeof presenter>;

export async function listApiKeysController(
  query: TListApiKeysQuerySchema,
): Promise<TListApiKeysControllerOutput> {
  const data = await listApiKeysUseCase(query);
  return presenter(data);
}
