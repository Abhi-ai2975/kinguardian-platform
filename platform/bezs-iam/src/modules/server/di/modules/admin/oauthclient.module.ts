import { DI_SYMBOLS } from "../../types";
import { Container } from "@evyweb/ioctopus";
import { OAuthClientService } from "@/modules/server/core/admin/infrastructure/services/oauthclient.service";

export function registerOAuthClientModule(container: Container) {
  container.bind(DI_SYMBOLS.IOAuthClientService).toClass(OAuthClientService);
}
