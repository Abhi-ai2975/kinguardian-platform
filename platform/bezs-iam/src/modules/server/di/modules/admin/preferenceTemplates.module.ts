import { Container } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "../../types";
import { PreferenceTemplatesRepository } from "@/modules/server/core/admin/infrastructure/repositories/preferenceTemplates.repository";

export function registerPreferenceTemplatesModule(container: Container) {
  container
    .bind(DI_SYMBOLS.IPreferenceTemplatesRepository)
    .toClass(PreferenceTemplatesRepository);
}
