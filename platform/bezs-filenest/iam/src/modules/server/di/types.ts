import { IOAuthClientService } from "../core/admin/domain/interfaces/oauthclient.service.interface";
import { IUsersService } from "../core/admin/domain/interfaces/users.service.interface";
import { ISessionsService } from "../core/admin/domain/interfaces/sessions.service.interface";
import { IOrganizationsService } from "../core/admin/domain/interfaces/organizations.service.interface";
import { IConsentsService } from "../core/admin/domain/interfaces/consents.service.interface";
import { IAgentAuthService } from "../core/admin/domain/interfaces/agentauth.service.interface";
import { IAppsService } from "../core/admin/domain/interfaces/apps.service.interface";
import { IResourcesService } from "../core/admin/domain/interfaces/resources.service.interface";
import { IApiKeyService } from "../core/admin/domain/interfaces/apikeys.service.interface";
import { IPreferenceTemplatesService } from "../core/admin/domain/interfaces/preferenceTemplates.service.interface";
import { IAuthService } from "../core/auth/domain/interfaces/auth.service.interface";
import { IEmailService } from "../core/common/email/domain/interfaces/email.service.interface";
import { IUserPreferenceService } from "../core/settings/domain/interfaces/userPreference.service.interface";
import { IUserContextService } from "../core/admin/domain/interfaces/usercontext.service.interface";

export const DI_SYMBOLS = {
  // Repositories

  // Services
  IAuthService: Symbol.for("IAuthService"),
  IEmailService: Symbol.for("IEmailService"),
  IOAuthClientService: Symbol.for("IOAuthClientService"),
  IUsersService: Symbol.for("IUsersService"),
  ISessionsService: Symbol.for("ISessionsService"),
  IOrganizationsService: Symbol.for("IOrganizationsService"),
  IConsentsService: Symbol.for("IConsentsService"),
  IAgentAuthService: Symbol.for("IAgentAuthService"),
  IAppsService: Symbol.for("IAppsService"),
  IResourcesService: Symbol.for("IResourcesService"),
  IApiKeyService: Symbol.for("IApiKeyService"),
  IPreferenceTemplatesService: Symbol.for("IPreferenceTemplatesService"),
  IUserPreferenceService: Symbol.for("IUserPreferenceService"),
  IUserContextService: Symbol.for("IUserContextService"),
};

export interface DI_RETURN_TYPES {
  // Repositories

  // Services
  IAuthService: IAuthService;
  IEmailService: IEmailService;
  IOAuthClientService: IOAuthClientService;
  IUsersService: IUsersService;
  ISessionsService: ISessionsService;
  IOrganizationsService: IOrganizationsService;
  IConsentsService: IConsentsService;
  IAgentAuthService: IAgentAuthService;
  IAppsService: IAppsService;
  IResourcesService: IResourcesService;
  IApiKeyService: IApiKeyService;
  IPreferenceTemplatesService: IPreferenceTemplatesService;
  IUserPreferenceService: IUserPreferenceService;
  IUserContextService: IUserContextService;
}
