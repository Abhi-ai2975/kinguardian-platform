import { getInjection } from "@/modules/server/di/container";
import {
  TConsentSchema,
  TGetConsentValidationSchema,
} from "@/modules/entities/schemas/admin/consents/consents.schema";

export async function getConsentUseCase(
  payload: TGetConsentValidationSchema,
): Promise<TConsentSchema> {
  const service = getInjection("IConsentsService");
  return service.getConsent(payload);
}
