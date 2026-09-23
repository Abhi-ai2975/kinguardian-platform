import {
  DeletePreferenceTemplateValidationSchema,
} from "@/modules/entities/schemas/admin/preference-templates/preference-template.schema";
import { deletePreferenceTemplateUseCase } from "../../../application/usecases/preference-templates/deletePreferenceTemplate.usecase";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";

function presenter(data: { success: boolean }) {
  return data;
}

export type TDeletePreferenceTemplateControllerOutput = ReturnType<
  typeof presenter
>;

export async function deletePreferenceTemplateController(
  input: unknown,
): Promise<TDeletePreferenceTemplateControllerOutput> {
  const parsed =
    await DeletePreferenceTemplateValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);

  const data = await deletePreferenceTemplateUseCase(parsed.data);
  return presenter(data);
}
