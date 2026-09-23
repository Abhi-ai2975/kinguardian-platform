import {
  TListApiKeysResponseSchema,
  TListApiKeysQuerySchema,
  TApiKeySchema,
  TApiKeyCreatedSchema,
  TCreateApiKeyValidationSchema,
  TUpdateApiKeyValidationSchema,
  TDeleteApiKeyValidationSchema,
  TDeleteExpiredApiKeysValidationSchema,
} from "@/modules/entities/schemas/admin/api-keys/api-keys.schema";

export interface IApiKeyService {
  listApiKeys(query: TListApiKeysQuerySchema): Promise<TListApiKeysResponseSchema>;
  createApiKey(payload: TCreateApiKeyValidationSchema): Promise<TApiKeyCreatedSchema>;
  updateApiKey(payload: TUpdateApiKeyValidationSchema): Promise<TApiKeySchema>;
  deleteApiKey(payload: TDeleteApiKeyValidationSchema): Promise<{ success: boolean }>;
  deleteExpiredApiKeys(payload: TDeleteExpiredApiKeysValidationSchema): Promise<{ success: boolean }>;
}
