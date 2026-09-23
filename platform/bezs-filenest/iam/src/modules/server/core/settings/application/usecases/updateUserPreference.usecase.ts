import {
  TUserPreferenceSchema,
  TUpdateUserPreferenceValidationSchema,
} from "@/modules/entities/schemas/settings/preference/preference.schema";
import { getInjection } from "@/modules/server/di/container";

export async function updateUserPreferenceUseCase(
  payload: TUpdateUserPreferenceValidationSchema,
): Promise<TUserPreferenceSchema> {
  const service = getInjection("IUserPreferenceService");
  return await service.upsertUserPreference(payload);
}
