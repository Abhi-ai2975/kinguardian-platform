import {
  TDeletePreferenceTemplateValidationSchema,
} from "@/modules/entities/schemas/admin/preference-templates/preference-template.schema";
import { getInjection } from "@/modules/server/di/container";

export async function deletePreferenceTemplateUseCase(
  payload: TDeletePreferenceTemplateValidationSchema,
): Promise<{ success: boolean }> {
  const service = getInjection("IPreferenceTemplatesService");
  return await service.deletePreferenceTemplate(payload);
}
