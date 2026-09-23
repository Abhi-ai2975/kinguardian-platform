import z from "zod";
import { TransportOptionsSchema } from "../../transport";

// ---------------------------------------------------------- //
// Base entity schemas
// ---------------------------------------------------------- //

export const OrgMemberSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  role: z.string(),
  createdAt: z.coerce.date(),
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    image: z.string().nullable().optional(),
  }),
});

export const OrgInvitationSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  email: z.string(),
  role: z.string().nullable().optional(),
  status: z.string(),
  expiresAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  inviterId: z.string(),
  teamId: z.string().nullable().optional(),
  user: z.object({
    name: z.string(),
    email: z.string().email(),
  }),
});

export const OrgTeamMemberSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  userId: z.string(),
  createdAt: z.coerce.date().nullable().optional(),
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    image: z.string().nullable().optional(),
  }),
});

export const OrgTeamSchema = z.object({
  id: z.string(),
  name: z.string(),
  organizationId: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date().nullable().optional(),
  teammembers: z.array(OrgTeamMemberSchema),
});

export const OrganizationSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  logo: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  metadata: z.string().nullable().optional(),
  memberCount: z.number(),
  teamCount: z.number(),
});

export const OrganizationDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  logo: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  metadata: z.string().nullable().optional(),
  members: z.array(OrgMemberSchema),
  invitations: z.array(OrgInvitationSchema),
  teams: z.array(OrgTeamSchema),
});

export const ListOrganizationsResponseSchema = z.object({
  organizations: z.array(OrganizationSummarySchema),
});

// ---------------------------------------------------------- //
// Types
// ---------------------------------------------------------- //

export type TOrgMemberSchema = z.infer<typeof OrgMemberSchema>;
export type TOrgInvitationSchema = z.infer<typeof OrgInvitationSchema>;
export type TOrgTeamMemberSchema = z.infer<typeof OrgTeamMemberSchema>;
export type TOrgTeamSchema = z.infer<typeof OrgTeamSchema>;
export type TOrganizationSummarySchema = z.infer<typeof OrganizationSummarySchema>;
export type TOrganizationDetailSchema = z.infer<typeof OrganizationDetailSchema>;
export type TListOrganizationsResponseSchema = z.infer<typeof ListOrganizationsResponseSchema>;

// ---------------------------------------------------------- //
// Organization mutation schemas
// ---------------------------------------------------------- //

export const CreateOrganizationValidationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  logo: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  metadata: z.string().optional(),
});

export const CreateOrganizationActionSchema = z.object({
  payload: CreateOrganizationValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

export const UpdateOrganizationValidationSchema = z.object({
  organizationId: z.string(),
  name: z.string().min(1).optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
  logo: z.string().url().optional().or(z.literal("")),
  metadata: z.string().optional(),
});

export const UpdateOrganizationActionSchema = z.object({
  payload: UpdateOrganizationValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

export const DeleteOrganizationValidationSchema = z.object({
  organizationId: z.string(),
});

export const DeleteOrganizationActionSchema = z.object({
  payload: DeleteOrganizationValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

// ---------------------------------------------------------- //
// Member mutation schemas
// ---------------------------------------------------------- //

// What the form/action receives (email-based, human-friendly)
export const AddMemberValidationSchema = z.object({
  organizationId: z.string(),
  email: z.string().email("Enter a valid email address"),
  roles: z.array(z.string()).min(1, "Select at least one role"),
});

export const AddMemberActionSchema = z.object({
  payload: AddMemberValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

// What the organizations service receives (userId-based, after lookup)
export const AddMemberServiceSchema = z.object({
  organizationId: z.string(),
  userId: z.string(),
  roles: z.array(z.string()),
});
export type TAddMemberServiceSchema = z.infer<typeof AddMemberServiceSchema>;

export const UpdateMemberRoleValidationSchema = z.object({
  memberId: z.string(),
  organizationId: z.string(),
  roles: z.array(z.string()).min(1, "Select at least one role"),
  redirectUrls: z.record(z.string(), z.string()).optional().default({}),
});

export const UpdateMemberRoleActionSchema = z.object({
  payload: UpdateMemberRoleValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

export const RemoveMemberValidationSchema = z.object({
  memberId: z.string(),
  organizationId: z.string(),
});

export const RemoveMemberActionSchema = z.object({
  payload: RemoveMemberValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

// ---------------------------------------------------------- //
// Invitation mutation schemas
// ---------------------------------------------------------- //

export const CreateInvitationValidationSchema = z.object({
  organizationId: z.string(),
  email: z.string().email("Must be a valid email"),
  role: z.enum(["member", "admin", "owner"]).default("member"),
  teamId: z.string().optional(),
});

export const CreateInvitationActionSchema = z.object({
  payload: CreateInvitationValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

export const CancelInvitationValidationSchema = z.object({
  invitationId: z.string(),
  organizationId: z.string(),
});

export const CancelInvitationActionSchema = z.object({
  payload: CancelInvitationValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

// ---------------------------------------------------------- //
// Team mutation schemas
// ---------------------------------------------------------- //

export const CreateTeamValidationSchema = z.object({
  organizationId: z.string(),
  name: z.string().min(1, "Team name is required"),
});

export const CreateTeamActionSchema = z.object({
  payload: CreateTeamValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

export const UpdateTeamValidationSchema = z.object({
  teamId: z.string(),
  organizationId: z.string(),
  name: z.string().min(1, "Team name is required"),
});

export const UpdateTeamActionSchema = z.object({
  payload: UpdateTeamValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

export const RemoveTeamValidationSchema = z.object({
  teamId: z.string(),
  organizationId: z.string(),
});

export const RemoveTeamActionSchema = z.object({
  payload: RemoveTeamValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

// ---------------------------------------------------------- //
// Team member mutation schemas
// ---------------------------------------------------------- //

// What the form/action receives (email-based)
export const AddTeamMemberValidationSchema = z.object({
  teamId: z.string(),
  email: z.string().email("Enter a valid email address"),
  organizationId: z.string(),
});

export const AddTeamMemberActionSchema = z.object({
  payload: AddTeamMemberValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

// What the organizations service receives (userId-based, after lookup)
export const AddTeamMemberServiceSchema = z.object({
  teamId: z.string(),
  userId: z.string(),
  organizationId: z.string(),
});
export type TAddTeamMemberServiceSchema = z.infer<typeof AddTeamMemberServiceSchema>;

export const RemoveTeamMemberValidationSchema = z.object({
  teamMemberId: z.string(),
  organizationId: z.string(),
});

export const RemoveTeamMemberActionSchema = z.object({
  payload: RemoveTeamMemberValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

// ---------------------------------------------------------- //
// Inferred types
// ---------------------------------------------------------- //

export type TCreateOrganizationValidationSchema = z.infer<typeof CreateOrganizationValidationSchema>;
export type TUpdateOrganizationValidationSchema = z.infer<typeof UpdateOrganizationValidationSchema>;
export type TDeleteOrganizationValidationSchema = z.infer<typeof DeleteOrganizationValidationSchema>;
export type TAddMemberValidationSchema = z.infer<typeof AddMemberValidationSchema>;
export type TUpdateMemberRoleValidationSchema = z.infer<typeof UpdateMemberRoleValidationSchema>;
export type TRemoveMemberValidationSchema = z.infer<typeof RemoveMemberValidationSchema>;
export type TCreateInvitationValidationSchema = z.infer<typeof CreateInvitationValidationSchema>;
export type TCancelInvitationValidationSchema = z.infer<typeof CancelInvitationValidationSchema>;
export type TCreateTeamValidationSchema = z.infer<typeof CreateTeamValidationSchema>;
export type TUpdateTeamValidationSchema = z.infer<typeof UpdateTeamValidationSchema>;
export type TRemoveTeamValidationSchema = z.infer<typeof RemoveTeamValidationSchema>;
export type TAddTeamMemberValidationSchema = z.infer<typeof AddTeamMemberValidationSchema>;
export type TRemoveTeamMemberValidationSchema = z.infer<typeof RemoveTeamMemberValidationSchema>;

// ---------------------------------------------------------- //
// OrgRole schemas
// ---------------------------------------------------------- //

export const OrgRoleSchema = z.object({
  role: z.string(),
  permissions: z.array(z.string()),
  createdAt: z.coerce.date(),
});
export type TOrgRoleSchema = z.infer<typeof OrgRoleSchema>;

export const ListOrgRolesResponseSchema = z.object({
  roles: z.array(OrgRoleSchema),
});
export type TListOrgRolesResponseSchema = z.infer<typeof ListOrgRolesResponseSchema>;

export const CreateOrgRoleValidationSchema = z.object({
  organizationId: z.string(),
  role: z
    .string()
    .min(1, "Role name is required")
    .max(64)
    .regex(/^[a-z0-9_-]+$/, "Lowercase, numbers, hyphens, underscores only"),
  permissions: z.array(z.string()).min(1, "Select at least one permission"),
});
export type TCreateOrgRoleValidationSchema = z.infer<typeof CreateOrgRoleValidationSchema>;

export const CreateOrgRoleActionSchema = z.object({
  payload: CreateOrgRoleValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

export const UpdateOrgRoleValidationSchema = z.object({
  organizationId: z.string(),
  role: z.string().min(1),
  permissions: z.array(z.string()).min(1, "Select at least one permission"),
});
export type TUpdateOrgRoleValidationSchema = z.infer<typeof UpdateOrgRoleValidationSchema>;

export const UpdateOrgRoleActionSchema = z.object({
  payload: UpdateOrgRoleValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

export const DeleteOrgRoleValidationSchema = z.object({
  organizationId: z.string(),
  role: z.string().min(1),
});
export type TDeleteOrgRoleValidationSchema = z.infer<typeof DeleteOrgRoleValidationSchema>;

export const DeleteOrgRoleActionSchema = z.object({
  payload: DeleteOrgRoleValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
