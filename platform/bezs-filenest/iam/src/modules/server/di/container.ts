/**
 * @module di/container
 * @description Central IoC container — composition root for the application.
 *              Registers all feature modules (auth, email, admin domains)
 *              at startup and provides the `getInjection()` function used by
 *              every use case to resolve its dependencies.
 *
 * **Registered modules (14 total):**
 * - `registerAuthModule` — signin, signup, password reset, 2FA, magic link
 * - `registerEmailModule` — nodemailer email sending
 * - `registerOAuthClientModule` — OAuth client CRUD
 * - `registerUsersModule` — user CRUD, ban, roles, impersonation
 * - `registerSessionsModule` — session listing and revocation
 * - `registerOrganizationsModule` — orgs, members, invitations, teams, roles
 * - `registerConsentsModule` — OAuth consent management
 * - `registerAgentAuthModule` — AI agent identity and capability management
 * - `registerAppsModule` — navigation apps and menu nodes
 * - `registerResourcesModule` — RBAC resources and resource actions
 * - `registerApiKeysModule` — API key management
 * - `registerPreferenceTemplatesModule` — locale/format preference templates
 * - `registerUserPreferenceModule` — per-user locale/format settings
 * - `registerUserContextModule` — active org and role per user
 *
 * **Usage in use cases:**
 * ```ts
 * import { getInjection } from "@/modules/server/di/container";
 * const service = getInjection("IUsersService");
 * ```
 * @category DI
 */

import { createContainer } from "@evyweb/ioctopus";
import { DI_RETURN_TYPES, DI_SYMBOLS } from "./types";
import {
  registerAuthModule,
  registerEmailModule,
  registerOAuthClientModule,
  registerUsersModule,
  registerSessionsModule,
  registerOrganizationsModule,
  registerConsentsModule,
  registerAgentAuthModule,
  registerAppsModule,
  registerResourcesModule,
  registerApiKeysModule,
  registerPreferenceTemplatesModule,
  registerUserPreferenceModule,
  registerUserContextModule,
} from "./modules";

const ApplicationContainer = createContainer();

registerAuthModule(ApplicationContainer);
registerEmailModule(ApplicationContainer);
registerOAuthClientModule(ApplicationContainer);
registerUsersModule(ApplicationContainer);
registerSessionsModule(ApplicationContainer);
registerOrganizationsModule(ApplicationContainer);
registerConsentsModule(ApplicationContainer);
registerAgentAuthModule(ApplicationContainer);
registerAppsModule(ApplicationContainer);
registerResourcesModule(ApplicationContainer);
registerApiKeysModule(ApplicationContainer);
registerPreferenceTemplatesModule(ApplicationContainer);
registerUserPreferenceModule(ApplicationContainer);
registerUserContextModule(ApplicationContainer);

export const getInjection = <K extends keyof typeof DI_SYMBOLS>(
  symbol: K,
): DI_RETURN_TYPES[K] => {
  return ApplicationContainer.get(DI_SYMBOLS[symbol]);
};
