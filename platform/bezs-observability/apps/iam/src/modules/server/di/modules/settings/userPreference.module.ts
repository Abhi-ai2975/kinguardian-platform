import { Container } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "../../types";
import { UserPreferenceService } from "@/modules/server/core/settings/infrastructure/services/userPreference.service";

export function registerUserPreferenceModule(container: Container) {
  container
    .bind(DI_SYMBOLS.IUserPreferenceService)
    .toClass(UserPreferenceService);
}
