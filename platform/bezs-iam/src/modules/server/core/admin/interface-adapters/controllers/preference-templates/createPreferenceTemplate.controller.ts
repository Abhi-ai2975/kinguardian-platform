import {
  TPreferenceTemplateSchema,
  CreatePreferenceTemplateValidationSchema,
} from "@/modules/entities/schemas/admin/preference-templates/preference-template.schema";
import { createPreferenceTemplateUseCase } from "../../../application/usecases/preference-templates/createPreferenceTemplate.usecase";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";

function presenter(data: TPreferenceTemplateSchema) {
  return data;
}

export type TCreatePreferenceTemplateControllerOutput = ReturnType<
  typeof presenter
>;

export async function createPreferenceTemplateController(
  input: unknown,
): Promise<TCreatePreferenceTemplateControllerOutput> {
  const parsed =
    await CreatePreferenceTemplateValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);

  const data = await createPreferenceTemplateUseCase(parsed.data);
  return presenter(data);
}
