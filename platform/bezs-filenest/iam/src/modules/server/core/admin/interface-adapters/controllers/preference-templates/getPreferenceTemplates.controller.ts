import { TListPreferenceTemplatesResponseSchema } from "@/modules/entities/schemas/admin/preference-templates/preference-template.schema";
import { getPreferenceTemplatesUseCase } from "../../../application/usecases/preference-templates/getPreferenceTemplates.usecase";

function presenter(data: TListPreferenceTemplatesResponseSchema) {
  return data.templates;
}

export type TGetPreferenceTemplatesControllerOutput = ReturnType<
  typeof presenter
>;

export async function getPreferenceTemplatesController(): Promise<TGetPreferenceTemplatesControllerOutput> {
  const data = await getPreferenceTemplatesUseCase();
  return presenter(data);
}
