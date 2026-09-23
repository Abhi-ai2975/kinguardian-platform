import { Container } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "../../types";
import { PreferenceTemplatesService } from "@/modules/server/core/admin/infrastructure/services/preferenceTemplates.service";

export function registerPreferenceTemplatesModule(container: Container) {
  container
    .bind(DI_SYMBOLS.IPreferenceTemplatesService)
    .toClass(PreferenceTemplatesService);
}
