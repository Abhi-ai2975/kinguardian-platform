import {
  TListOrganizationsResponseSchema,
  TOrganizationDetailSchema,
  TOrganizationSummarySchema,
  TCreateOrganizationValidationSchema,
  TUpdateOrganizationValidationSchema,
  TDeleteOrganizationValidationSchema,
  TAddMemberServiceSchema,
  TUpdateMemberRoleValidationSchema,
  TRemoveMemberValidationSchema,
  TCreateInvitationValidationSchema,
  TCancelInvitationValidationSchema,
  TCreateTeamValidationSchema,
  TUpdateTeamValidationSchema,
  TRemoveTeamValidationSchema,
  TAddTeamMemberServiceSchema,
  TRemoveTeamMemberValidationSchema,
  TOrgRoleSchema,
  TListOrgRolesResponseSchema,
  TCreateOrgRoleValidationSchema,
  TUpdateOrgRoleValidationSchema,
  TDeleteOrgRoleValidationSchema,
} from "@/modules/entities/schemas/admin/organizations/organizations.schema";

export interface IOrganizationsService {
  listOrganizations(): Promise<TListOrganizationsResponseSchema>;
  getOrganization(organizationId: string): Promise<TOrganizationDetailSchema>;

  createOrganization(payload: TCreateOrganizationValidationSchema): Promise<TOrganizationSummarySchema>;
  updateOrganization(payload: TUpdateOrganizationValidationSchema): Promise<TOrganizationSummarySchema>;
  deleteOrganization(payload: TDeleteOrganizationValidationSchema): Promise<{ success: boolean }>;

  addMember(payload: TAddMemberServiceSchema): Promise<{ success: boolean }>;
  updateMemberRole(payload: TUpdateMemberRoleValidationSchema): Promise<{ success: boolean }>;
  removeMember(payload: TRemoveMemberValidationSchema): Promise<{ success: boolean }>;

  createInvitation(payload: TCreateInvitationValidationSchema): Promise<{ success: boolean }>;
  cancelInvitation(payload: TCancelInvitationValidationSchema): Promise<{ success: boolean }>;

  createTeam(payload: TCreateTeamValidationSchema): Promise<{ success: boolean }>;
  updateTeam(payload: TUpdateTeamValidationSchema): Promise<{ success: boolean }>;
  removeTeam(payload: TRemoveTeamValidationSchema): Promise<{ success: boolean }>;

  isMemberInOrg(organizationId: string, userId: string): Promise<boolean>;
  addTeamMember(payload: TAddTeamMemberServiceSchema): Promise<{ success: boolean }>;
  removeTeamMember(payload: TRemoveTeamMemberValidationSchema): Promise<{ success: boolean }>;

  getOrgRoleRedirects(userId: string, organizationId: string): Promise<Record<string, string>>;
  listOrgRoles(organizationId: string): Promise<TListOrgRolesResponseSchema>;
  createOrgRole(payload: TCreateOrgRoleValidationSchema): Promise<TOrgRoleSchema>;
  updateOrgRole(payload: TUpdateOrgRoleValidationSchema): Promise<TOrgRoleSchema>;
  deleteOrgRole(payload: TDeleteOrgRoleValidationSchema): Promise<{ success: boolean }>;
}
