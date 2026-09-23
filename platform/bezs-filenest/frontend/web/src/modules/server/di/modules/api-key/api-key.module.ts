/**
 * api-key.module — DI registration for the API key domain.
 *
 * Binds IApiKeyService to ApiKeyIamService so use cases receive the
 * IAM-backed implementation without knowing the concrete class.
 *
 * @module
 */
import type { Container } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "../../types";
import { ApiKeyIamService } from "@/modules/server/core/api-key/infrastructure/services/api-key.iam.service";

export function registerApiKeyModule(container: Container): void {
  container.bind(DI_SYMBOLS.IApiKeyService).toClass(ApiKeyIamService);
}
