import { IOAuthClientService } from "../core/admin/domain/interfaces/services/oauthclient.service.interface";
import { IUsersService } from "../core/admin/domain/interfaces/services/users.service.interface";
import { ISessionsService } from "../core/admin/domain/interfaces/services/sessions.service.interface";
import { ISessionsRepository } from "../core/admin/domain/interfaces/repositories/sessions.repository.interface";
import { IOrganizationsService } from "../core/admin/domain/interfaces/services/organizations.service.interface";
import { IOrganizationsRepository } from "../core/admin/domain/interfaces/repositories/organizations.repository.interface";
import { IConsentsService } from "../core/admin/domain/interfaces/services/consents.service.interface";
import { IAgentAuthService } from "../core/admin/domain/interfaces/services/agentauth.service.interface";
import { IAppsRepository } from "../core/admin/domain/interfaces/repositories/apps.repository.interface";
import { IResourcesRepository } from "../core/admin/domain/interfaces/repositories/resources.repository.interface";
import { IApiKeyService } from "../core/admin/domain/interfaces/services/apikeys.service.interface";
import { IApiKeyRepository } from "../core/admin/domain/interfaces/repositories/apikeys.repository.interface";
import { IPreferenceTemplatesRepository } from "../core/admin/domain/interfaces/repositories/preferenceTemplates.repository.interface";
import { IAuthService } from "../core/auth/domain/interfaces/services/auth.service.interface";
import { IEmailService } from "../core/common/email/domain/interfaces/services/email.service.interface";
import { IUserPreferenceRepository } from "../core/settings/domain/interfaces/repositories/userPreference.repository.interface";
import { IUserContextRepository } from "../core/admin/domain/interfaces/repositories/usercontext.repository.interface";

export const DI_SYMBOLS = {
  // Repositories
  IUserPreferenceRepository: Symbol.for("IUserPreferenceRepository"),
  IAppsRepository: Symbol.for("IAppsRepository"),
  IResourcesRepository: Symbol.for("IResourcesRepository"),
  IUserContextRepository: Symbol.for("IUserContextRepository"),
  IPreferenceTemplatesRepository: Symbol.for("IPreferenceTemplatesRepository"),
  IApiKeyRepository: Symbol.for("IApiKeyRepository"),
  ISessionsRepository: Symbol.for("ISessionsRepository"),
  IOrganizationsRepository: Symbol.for("IOrganizationsRepository"),

  // Services
  IAuthService: Symbol.for("IAuthService"),
  IEmailService: Symbol.for("IEmailService"),
  IOAuthClientService: Symbol.for("IOAuthClientService"),
  IUsersService: Symbol.for("IUsersService"),
  ISessionsService: Symbol.for("ISessionsService"),
  IOrganizationsService: Symbol.for("IOrganizationsService"),
  IConsentsService: Symbol.for("IConsentsService"),
  IAgentAuthService: Symbol.for("IAgentAuthService"),
  IApiKeyService: Symbol.for("IApiKeyService"),
};

export interface DI_RETURN_TYPES {
  // Repositories
  IUserPreferenceRepository: IUserPreferenceRepository;
  IAppsRepository: IAppsRepository;
  IResourcesRepository: IResourcesRepository;
  IUserContextRepository: IUserContextRepository;
  IPreferenceTemplatesRepository: IPreferenceTemplatesRepository;
  IApiKeyRepository: IApiKeyRepository;
  ISessionsRepository: ISessionsRepository;
  IOrganizationsRepository: IOrganizationsRepository;

  // Services
  IAuthService: IAuthService;
  IEmailService: IEmailService;
  IOAuthClientService: IOAuthClientService;
  IUsersService: IUsersService;
  ISessionsService: ISessionsService;
  IOrganizationsService: IOrganizationsService;
  IConsentsService: IConsentsService;
  IAgentAuthService: IAgentAuthService;
  IApiKeyService: IApiKeyService;
}
