import { ZSAError } from "zsa";
import {
  TOrganizationSummarySchema,
  TOrganizationDetailSchema,
  TOrgMemberSchema,
  TOrgInvitationSchema,
  TOrgTeamSchema,
  TOrgRoleSchema,
} from "@/modules/entities/schemas/admin/organizations/organizations.schema";
import { TListOrganizationsControllerOutput } from "@/modules/server/core/admin/interface-adapters/controllers/organizations";

export type TOrganization = TOrganizationSummarySchema;
export type TOrganizationDetail = TOrganizationDetailSchema;
export type TOrgMember = TOrgMemberSchema;
export type TOrgInvitation = TOrgInvitationSchema;
export type TOrgTeam = TOrgTeamSchema;
export type TOrgRole = TOrgRoleSchema;

export interface IOrganizationsTableProps {
  organizations: TListOrganizationsControllerOutput | null;
  error: ZSAError | null;
}

export interface IOrgDetailProps {
  organization: TOrganizationDetail | null;
  error: ZSAError | null;
}

export interface IOrgRolesTableProps {
  roles: TOrgRole[] | null;
  organizationId: string;
  error: ZSAError | null;
}
