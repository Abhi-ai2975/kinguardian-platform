import { create } from "zustand";
import { TOAuthClient } from "../types/oauthclient.type";

export type ModalType =
  | "createOAuthClient"
  | "editOAuthClient"
  | "deleteOAuthClient"
  | "rotateClientSecret"
  | "createUser"
  | "updateUser"
  | "setRole"
  | "banUser"
  | "removeUser"
  | "setUserPassword"
  | "revokeUserSessions"
  | "impersonateUser"
  | "revokeSession"
  | "revokeAllSessions"
  // Organizations
  | "createOrganization"
  | "editOrganization"
  | "deleteOrganization"
  // Members
  | "addMember"
  | "updateMemberRole"
  | "removeMember"
  // Invitations
  | "createInvitation"
  | "cancelInvitation"
  // Teams
  | "createTeam"
  | "updateTeam"
  | "removeTeam"
  // Team members
  | "addTeamMember"
  | "removeTeamMember"
  // Consents
  | "deleteConsent"
  | "updateConsentScopes"
  // Agent Auth — Agents
  | "updateAgent"
  | "revokeAgent"
  | "reactivateAgent"
  | "grantAgentCapability"
  | "cleanupAgents"
  // Agent Auth — Approvals
  | "approveCapability"
  // Agent Auth — Hosts
  | "createHost"
  | "updateHost"
  | "revokeHost"
  // RBAC — Apps
  | "createApp"
  | "editApp"
  | "deleteApp"
  // RBAC — Menu Nodes
  | "createMenuNode"
  | "editMenuNode"
  | "deleteMenuNode"
  // Resources
  | "createResource"
  | "editResource"
  | "deleteResource"
  // Resource Actions
  | "createResourceAction"
  | "editResourceAction"
  | "deleteResourceAction"
  // Org Roles
  | "createOrgRole"
  | "editOrgRole"
  | "deleteOrgRole"
  // API Keys
  | "createApiKey"
  | "editApiKey"
  | "deleteApiKey"
  | "viewApiKeySecret"
  // Preference Templates
  | "createPreferenceTemplate"
  | "editPreferenceTemplate"
  | "deletePreferenceTemplate"
  // User Context
  | "setUserContext";

export interface ModalData {
  // Users
  userId?: string;
  userName?: string;
  userEmail?: string;
  userUsername?: string | null;
  userImage?: string | null;
  currentRole?: string | null;
  isBanned?: boolean;
  // OAuth Clients
  clientId?: string;
  clientName?: string;
  oauthClient?: TOAuthClient;
  // Sessions
  sessionToken?: string;
  sessionIp?: string | null;
  sessionUserAgent?: string | null;
  // Organizations
  organizationId?: string;
  organizationName?: string;
  organizationSlug?: string;
  organizationLogo?: string | null;
  organizationMetadata?: string | null;
  // Members
  memberId?: string;
  memberUserId?: string;
  memberName?: string;
  memberRoles?: string[];
  // Invitations
  invitationId?: string;
  invitationEmail?: string;
  // Teams
  teamId?: string;
  teamName?: string;
  // Team members
  teamMemberId?: string;
  // Consents
  consentId?: string;
  consentScopes?: string[];
  consentClientId?: string;
  consentUserId?: string | null;
  // Agent Auth — Agents
  agentId?: string;
  agentName?: string;
  agentStatus?: string;
  agentCapabilityGrants?: Record<string, unknown>[];
  // Agent Auth — Approvals
  approvalId?: string;
  approvalAgentId?: string;
  approvalAgentName?: string;
  approvalCapabilities?: string[];
  approvalBindingMessage?: string | null;
  approvalMethod?: string;
  // Agent Auth — Hosts
  hostId?: string;
  hostName?: string;
  hostStatus?: string;
  hostDefaultCapabilities?: string[];
  hostJwksUrl?: string | null;
  // RBAC — Apps
  appId?: string;
  appName?: string;
  appSlug?: string;
  appDescription?: string | null;
  appIsActive?: boolean;
  // RBAC — Menu Nodes
  menuNodeId?: string;
  menuNodeLabel?: string;
  menuNodeSlug?: string;
  menuNodeParentId?: string | null;
  menuNodeIcon?: string | null;
  menuNodeHref?: string | null;
  menuNodeType?: "GROUP" | "ITEM";
  menuNodeIsActive?: boolean;
  menuNodeIsVisible?: boolean;
  menuNodeAppId?: string;
  menuNodePermissionKeys?: string[];
  menuNodeOrder?: number;
  // Resources
  resourceId?: string;
  resourceName?: string;
  resourceDescription?: string | null;
  // Resource Actions
  resourceActionId?: string;
  resourceActionName?: string;
  resourceActionKey?: string;
  resourceActionDescription?: string | null;
  resourceActionResourceId?: string;
  resourceActionResourceName?: string;
  // Org Roles
  orgRoleOrganizationId?: string;
  orgRoleName?: string;
  orgRolePermissions?: string[];
  // API Keys
  apiKeyId?: string;
  apiKeyName?: string | null;
  apiKeyStart?: string | null;
  apiKeyPrefix?: string | null;
  apiKeyEnabled?: boolean;
  apiKeySecret?: string;   // raw key — only available right after creation
  apiKeyReferenceId?: string;
  // Preference Templates
  preferenceTemplateId?: string;
  preferenceTemplateScope?: "GLOBAL" | "COUNTRY";
  preferenceTemplateCountry?: string | null;
  preferenceTemplateTimezone?: string | null;
  preferenceTemplateDateFormat?: string | null;
  preferenceTemplateTimeFormat?: string | null;
  preferenceTemplateCurrency?: string | null;
  preferenceTemplateNumberFormat?: string | null;
  preferenceTemplateWeekStart?: string | null;
  // User Context
  userContextUserId?: string;
  userContextUserName?: string;
  userContextUserEmail?: string;
  userContextActiveOrganizationId?: string | null;
  userContextActiveRoleId?: string | null;
}

interface IAdminStore {
  type: ModalType | null;
  isOpen: boolean;
  trigger: number;
  triggerInModal: number;
  data: ModalData | null;
  incrementTrigger: () => void;
  incrementInModalTrigger: () => void;
  onOpen: (props: { type: ModalType; data?: ModalData }) => void;
  onClose: () => void;
}

const _useAdminStore = create<IAdminStore>((set) => ({
  type: null,
  isOpen: false,
  trigger: 0,
  triggerInModal: 0,
  data: null,
  onOpen: ({ type, data }) =>
    set({
      isOpen: true,
      type,
      data: data ?? null,
    }),
  onClose: () =>
    set({
      type: null,
      isOpen: false,
      trigger: 0,
      triggerInModal: 0,
      data: null,
    }),
  incrementTrigger: () => set((state) => ({ trigger: state.trigger + 1 })),
  incrementInModalTrigger: () =>
    set((state) => ({ triggerInModal: state.triggerInModal + 1 })),
}));

export const useAdminStore = _useAdminStore;
export const adminStore = _useAdminStore;
