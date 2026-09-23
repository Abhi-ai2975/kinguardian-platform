import {
  TUserPreferenceSchema,
} from "@/modules/entities/schemas/settings/preference/preference.schema";
import { getUserPreferenceUseCase } from "../../application/usecases/getUserPreference.usecase";

function presenter(data: TUserPreferenceSchema | null) {
  return data;
}

export type TGetUserPreferenceControllerOutput = ReturnType<typeof presenter>;

export async function getUserPreferenceController(
  userId: string,
): Promise<TGetUserPreferenceControllerOutput> {
  const data = await getUserPreferenceUseCase(userId);
  return presenter(data);
}
