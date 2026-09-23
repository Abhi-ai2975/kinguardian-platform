import {
  TListOrganizationsResponseSchema,
  TOrganizationDetailSchema,
  TOrganizationSummarySchema,
  TUpdateOrganizationValidationSchema,
  TUpdateMemberRoleValidationSchema,
  TRemoveTeamMemberValidationSchema,
  TOrgRoleSchema,
  TListOrgRolesResponseSchema,
  TCreateOrgRoleValidationSchema,
  TUpdateOrgRoleValidationSchema,
  TDeleteOrgRoleValidationSchema,
} from "@/modules/entities/schemas/admin/organizations/organizations.schema";

export interface IOrganizationsRepository {
  listOrganizations(): Promise<TListOrganizationsResponseSchema>;
  getOrganization(organizationId: string): Promise<TOrganizationDetailSchema>;
  updateOrganization(
    payload: TUpdateOrganizationValidationSchema,
  ): Promise<TOrganizationSummarySchema>;
  updateMemberRole(
    payload: TUpdateMemberRoleValidationSchema,
  ): Promise<{ success: boolean }>;
  removeTeamMember(
    payload: TRemoveTeamMemberValidationSchema,
  ): Promise<{ success: boolean }>;
  isMemberInOrg(organizationId: string, userId: string): Promise<boolean>;
  getOrgRoleRedirects(
    userId: string,
    organizationId: string,
  ): Promise<Record<string, string>>;
  listOrgRoles(organizationId: string): Promise<TListOrgRolesResponseSchema>;
  createOrgRole(
    payload: TCreateOrgRoleValidationSchema,
  ): Promise<TOrgRoleSchema>;
  updateOrgRole(
    payload: TUpdateOrgRoleValidationSchema,
  ): Promise<TOrgRoleSchema>;
  deleteOrgRole(
    payload: TDeleteOrgRoleValidationSchema,
  ): Promise<{ success: boolean }>;
}
