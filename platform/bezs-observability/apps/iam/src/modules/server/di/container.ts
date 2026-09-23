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
  registerBillingModule,
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
registerBillingModule(ApplicationContainer);

export const getInjection = <K extends keyof typeof DI_SYMBOLS>(
  symbol: K,
): DI_RETURN_TYPES[K] => {
  return ApplicationContainer.get(DI_SYMBOLS[symbol]);
};
