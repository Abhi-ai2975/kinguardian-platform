import { getInjection } from "@/modules/server/di/container";
import { TDeleteConsentValidationSchema } from "@/modules/entities/schemas/admin/consents/consents.schema";

export async function deleteConsentUseCase(
  payload: TDeleteConsentValidationSchema,
): Promise<{ success: boolean }> {
  const service = getInjection("IConsentsService");
  return service.deleteConsent(payload);
}
