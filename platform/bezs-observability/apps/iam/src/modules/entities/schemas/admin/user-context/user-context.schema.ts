import z from "zod";
import { TransportOptionsSchema } from "../../transport";

// ---------------------------------------------------------- //
// Query schemas
// ---------------------------------------------------------- //

export const UserContextListItemSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  userEmail: z.string(),
  userImage: z.string().nullable().optional(),
  contextId: z.string().nullable().optional(),
  activeOrganizationId: z.string().nullable().optional(),
  activeOrganizationName: z.string().nullable().optional(),
  activeRoleId: z.string().nullable().optional(),
  activeRoleName: z.string().nullable().optional(),
});

export const ListUserContextsResponseSchema = z.object({
  items: z.array(UserContextListItemSchema),
});

export const UserOrgMembershipSchema = z.object({
  organizationId: z.string(),
  organizationName: z.string(),
  role: z.string(),
});

export const GetUserOrgMembershipsResponseSchema = z.object({
  memberships: z.array(UserOrgMembershipSchema),
});

export const OrgRoleForContextSchema = z.object({
  id: z.string(),
  role: z.string(),
});

export const GetOrgRolesForContextResponseSchema = z.object({
  roles: z.array(OrgRoleForContextSchema),
});

// ---------------------------------------------------------- //
// Mutation schemas
// ---------------------------------------------------------- //

export const SetUserContextValidationSchema = z.object({
  userId: z.string(),
  activeOrganizationId: z.string().min(1, "Select an organization"),
  activeRoleId: z.string().min(1, "Role is required"),
});

export const SetUserContextActionSchema = z.object({
  payload: SetUserContextValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

// ---------------------------------------------------------- //
// Types
// ---------------------------------------------------------- //

export type TOrgRoleForContextSchema = z.infer<typeof OrgRoleForContextSchema>;
export type TGetOrgRolesForContextResponseSchema = z.infer<typeof GetOrgRolesForContextResponseSchema>;
export type TUserContextListItemSchema = z.infer<typeof UserContextListItemSchema>;
export type TListUserContextsResponseSchema = z.infer<typeof ListUserContextsResponseSchema>;
export type TUserOrgMembershipSchema = z.infer<typeof UserOrgMembershipSchema>;
export type TGetUserOrgMembershipsResponseSchema = z.infer<typeof GetUserOrgMembershipsResponseSchema>;
export type TSetUserContextValidationSchema = z.infer<typeof SetUserContextValidationSchema>;
