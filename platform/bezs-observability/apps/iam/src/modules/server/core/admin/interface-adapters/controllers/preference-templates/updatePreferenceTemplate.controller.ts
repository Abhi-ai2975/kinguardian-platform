import {
  TPreferenceTemplateSchema,
  UpdatePreferenceTemplateValidationSchema,
} from "@/modules/entities/schemas/admin/preference-templates/preference-template.schema";
import { updatePreferenceTemplateUseCase } from "../../../application/usecases/preference-templates/updatePreferenceTemplate.usecase";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";

function presenter(data: TPreferenceTemplateSchema) {
  return data;
}

export type TUpdatePreferenceTemplateControllerOutput = ReturnType<
  typeof presenter
>;

export async function updatePreferenceTemplateController(
  input: unknown,
): Promise<TUpdatePreferenceTemplateControllerOutput> {
  const parsed =
    await UpdatePreferenceTemplateValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);

  const data = await updatePreferenceTemplateUseCase(parsed.data);
  return presenter(data);
}
