import {
  TUserPreferenceSchema,
  TUpdateUserPreferenceValidationSchema,
} from "@/modules/entities/schemas/settings/preference/preference.schema";

export interface IUserPreferenceService {
  getUserPreference(userId: string): Promise<TUserPreferenceSchema | null>;
  upsertUserPreference(
    payload: TUpdateUserPreferenceValidationSchema,
  ): Promise<TUserPreferenceSchema>;
}
