import { getInjection } from "@/modules/server/di/container";
import {
  TConsentSchema,
  TUpdateConsentScopesValidationSchema,
} from "@/modules/entities/schemas/admin/consents/consents.schema";

export async function updateConsentScopesUseCase(
  payload: TUpdateConsentScopesValidationSchema,
): Promise<TConsentSchema> {
  const service = getInjection("IConsentsService");
  return service.updateConsentScopes(payload);
}
