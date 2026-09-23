import {
  TConsentSchema,
  TDeleteConsentValidationSchema,
  TGetConsentValidationSchema,
  TListConsentsResponseSchema,
  TUpdateConsentScopesValidationSchema,
} from "@/modules/entities/schemas/admin/consents/consents.schema";

export interface IConsentsService {
  listConsents(): Promise<TListConsentsResponseSchema>;
  getConsent(payload: TGetConsentValidationSchema): Promise<TConsentSchema>;
  updateConsentScopes(
    payload: TUpdateConsentScopesValidationSchema,
  ): Promise<TConsentSchema>;
  deleteConsent(
    payload: TDeleteConsentValidationSchema,
  ): Promise<{ success: boolean }>;
}
