import {
  TListApiKeysResponseSchema,
  TListApiKeysQuerySchema,
  TDeleteApiKeyValidationSchema,
} from "@/modules/entities/schemas/admin/api-keys/api-keys.schema";

export interface IApiKeyRepository {
  listApiKeys(query: TListApiKeysQuerySchema): Promise<TListApiKeysResponseSchema>;
  deleteApiKey(payload: TDeleteApiKeyValidationSchema): Promise<{ success: boolean }>;
}
