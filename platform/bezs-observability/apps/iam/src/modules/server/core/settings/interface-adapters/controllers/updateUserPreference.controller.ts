import {
  TUserPreferenceSchema,
  UpdateUserPreferenceValidationSchema,
} from "@/modules/entities/schemas/settings/preference/preference.schema";
import { updateUserPreferenceUseCase } from "../../application/usecases/updateUserPreference.usecase";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";

function presenter(data: TUserPreferenceSchema) {
  return data;
}

export type TUpdateUserPreferenceControllerOutput = ReturnType<typeof presenter>;

export async function updateUserPreferenceController(
  input: unknown,
): Promise<TUpdateUserPreferenceControllerOutput> {
  const parsed = await UpdateUserPreferenceValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);

  const data = await updateUserPreferenceUseCase(parsed.data);
  return presenter(data);
}
