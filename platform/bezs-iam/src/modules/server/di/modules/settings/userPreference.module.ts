import { Container } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "../../types";
import { UserPreferenceRepository } from "@/modules/server/core/settings/infrastructure/repositories/userPreference.repository";

export function registerUserPreferenceModule(container: Container) {
  container
    .bind(DI_SYMBOLS.IUserPreferenceRepository)
    .toClass(UserPreferenceRepository);
}
