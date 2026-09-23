import { DI_SYMBOLS } from "../../types";
import { Container } from "@evyweb/ioctopus";
import { ApiKeyService } from "@/modules/server/core/admin/infrastructure/services/apikeys.service";

export function registerApiKeysModule(container: Container) {
  container.bind(DI_SYMBOLS.IApiKeyService).toClass(ApiKeyService);
}
