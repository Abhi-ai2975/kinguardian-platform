import { TListPreferenceTemplatesResponseSchema } from "@/modules/entities/schemas/admin/preference-templates/preference-template.schema";
import { getInjection } from "@/modules/server/di/container";

export async function getPreferenceTemplatesUseCase(): Promise<TListPreferenceTemplatesResponseSchema> {
  const repository = getInjection("IPreferenceTemplatesRepository");
  return await repository.listPreferenceTemplates();
}
