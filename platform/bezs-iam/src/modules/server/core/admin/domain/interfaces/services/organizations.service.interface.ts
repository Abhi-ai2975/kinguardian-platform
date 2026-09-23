import {
  TOrganizationSummarySchema,
  TCreateOrganizationValidationSchema,
  TDeleteOrganizationValidationSchema,
  TAddMemberServiceSchema,
  TRemoveMemberValidationSchema,
  TCreateInvitationValidationSchema,
  TCancelInvitationValidationSchema,
  TCreateTeamValidationSchema,
  TUpdateTeamValidationSchema,
  TRemoveTeamValidationSchema,
  TAddTeamMemberServiceSchema,
} from "@/modules/entities/schemas/admin/organizations/organizations.schema";

export interface IOrganizationsService {
  createOrganization(payload: TCreateOrganizationValidationSchema): Promise<TOrganizationSummarySchema>;
  deleteOrganization(payload: TDeleteOrganizationValidationSchema): Promise<{ success: boolean }>;

  addMember(payload: TAddMemberServiceSchema): Promise<{ success: boolean }>;
  removeMember(payload: TRemoveMemberValidationSchema): Promise<{ success: boolean }>;

  createInvitation(payload: TCreateInvitationValidationSchema): Promise<{ success: boolean }>;
  cancelInvitation(payload: TCancelInvitationValidationSchema): Promise<{ success: boolean }>;

  createTeam(payload: TCreateTeamValidationSchema): Promise<{ success: boolean }>;
  updateTeam(payload: TUpdateTeamValidationSchema): Promise<{ success: boolean }>;
  removeTeam(payload: TRemoveTeamValidationSchema): Promise<{ success: boolean }>;

  addTeamMember(payload: TAddTeamMemberServiceSchema): Promise<{ success: boolean }>;
}
