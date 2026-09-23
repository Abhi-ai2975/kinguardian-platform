import {
  TDeletePreferenceTemplateValidationSchema,
} from "@/modules/entities/schemas/admin/preference-templates/preference-template.schema";
import { getInjection } from "@/modules/server/di/container";

export async function deletePreferenceTemplateUseCase(
  payload: TDeletePreferenceTemplateValidationSchema,
): Promise<{ success: boolean }> {
  const repository = getInjection("IPreferenceTemplatesRepository");
  return await repository.deletePreferenceTemplate(payload);
}
