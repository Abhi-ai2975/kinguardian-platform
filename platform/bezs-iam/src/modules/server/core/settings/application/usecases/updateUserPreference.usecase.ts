import {
  TUserPreferenceSchema,
  TUpdateUserPreferenceValidationSchema,
} from "@/modules/entities/schemas/settings/preference/preference.schema";
import { getInjection } from "@/modules/server/di/container";

export async function updateUserPreferenceUseCase(
  payload: TUpdateUserPreferenceValidationSchema,
): Promise<TUserPreferenceSchema> {
  const repository = getInjection("IUserPreferenceRepository");
  return await repository.upsertUserPreference(payload);
}
