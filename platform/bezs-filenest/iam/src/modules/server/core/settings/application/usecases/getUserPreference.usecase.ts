import { TUserPreferenceSchema } from "@/modules/entities/schemas/settings/preference/preference.schema";
import { getInjection } from "@/modules/server/di/container";

export async function getUserPreferenceUseCase(
  userId: string,
): Promise<TUserPreferenceSchema | null> {
  const service = getInjection("IUserPreferenceService");
  return await service.getUserPreference(userId);
}
