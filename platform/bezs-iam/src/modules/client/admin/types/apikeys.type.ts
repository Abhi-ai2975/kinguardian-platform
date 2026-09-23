import { TApiKeySchema, TApiKeyCreatedSchema } from "@/modules/entities/schemas/admin/api-keys/api-keys.schema";

export type TApiKey = TApiKeySchema;
export type TApiKeyCreated = TApiKeyCreatedSchema;

export interface IApiKeysTableProps {
  apiKeys: TApiKey[] | null;
  total: number;
  error: string | null;
  currentUserId: string;
}
