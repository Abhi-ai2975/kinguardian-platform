import { TListPreferenceTemplatesResponseSchema } from "@/modules/entities/schemas/admin/preference-templates/preference-template.schema";
import { getInjection } from "@/modules/server/di/container";

export async function getPreferenceTemplatesUseCase(): Promise<TListPreferenceTemplatesResponseSchema> {
  const service = getInjection("IPreferenceTemplatesService");
  return await service.listPreferenceTemplates();
}
