import {
  TApiKeySchema,
  TApiKeyCreatedSchema,
  TCreateApiKeyValidationSchema,
  TUpdateApiKeyValidationSchema,
  TDeleteExpiredApiKeysValidationSchema,
} from "@/modules/entities/schemas/admin/api-keys/api-keys.schema";

export interface IApiKeyService {
  createApiKey(payload: TCreateApiKeyValidationSchema): Promise<TApiKeyCreatedSchema>;
  updateApiKey(payload: TUpdateApiKeyValidationSchema): Promise<TApiKeySchema>;
  deleteExpiredApiKeys(payload: TDeleteExpiredApiKeysValidationSchema): Promise<{ success: boolean }>;
}
