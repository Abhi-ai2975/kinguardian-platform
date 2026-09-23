import {
  TPreferenceTemplateSchema,
  TCreatePreferenceTemplateValidationSchema,
} from "@/modules/entities/schemas/admin/preference-templates/preference-template.schema";
import { getInjection } from "@/modules/server/di/container";

export async function createPreferenceTemplateUseCase(
  payload: TCreatePreferenceTemplateValidationSchema,
): Promise<TPreferenceTemplateSchema> {
  const service = getInjection("IPreferenceTemplatesService");
  return await service.createPreferenceTemplate(payload);
}
