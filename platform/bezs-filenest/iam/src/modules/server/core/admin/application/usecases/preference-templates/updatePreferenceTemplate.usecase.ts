import {
  TPreferenceTemplateSchema,
  TUpdatePreferenceTemplateValidationSchema,
} from "@/modules/entities/schemas/admin/preference-templates/preference-template.schema";
import { getInjection } from "@/modules/server/di/container";

export async function updatePreferenceTemplateUseCase(
  payload: TUpdatePreferenceTemplateValidationSchema,
): Promise<TPreferenceTemplateSchema> {
  const service = getInjection("IPreferenceTemplatesService");
  return await service.updatePreferenceTemplate(payload);
}
