import {
  TCreateOAuthClientResponseDtoSchema,
  TGetOAuthClientsResponseDtoSchema,
  TGetOAuthClientResponseDtoSchema,
  TDeleteOAuthClientResponseDtoSchema,
  TUpdateOAuthClientValidationSchema,
  TDeleteOAuthClientValidationSchema,
  TGetOAuthClientValidationSchema,
  TRotateClientSecretValidationSchema,
} from "@/modules/entities/schemas/admin/oauthclient/oauthclient.schema";
import { TCreateOAuthClientPayload } from "@/modules/entities/types/admin/oauthclient.type";

export interface IOAuthClientService {
  createOAuthClient(
    payload: TCreateOAuthClientPayload,
  ): Promise<TCreateOAuthClientResponseDtoSchema>;
  updateOAuthClient(
    payload: TUpdateOAuthClientValidationSchema,
  ): Promise<TGetOAuthClientResponseDtoSchema>;
  deleteOAuthClient(
    payload: TDeleteOAuthClientValidationSchema,
  ): Promise<TDeleteOAuthClientResponseDtoSchema>;
  getOAuthClient(
    payload: TGetOAuthClientValidationSchema,
  ): Promise<TGetOAuthClientResponseDtoSchema>;
  rotateClientSecret(
    payload: TRotateClientSecretValidationSchema,
  ): Promise<TGetOAuthClientResponseDtoSchema>;
  getOAuthClients(): Promise<TGetOAuthClientsResponseDtoSchema>;
}
