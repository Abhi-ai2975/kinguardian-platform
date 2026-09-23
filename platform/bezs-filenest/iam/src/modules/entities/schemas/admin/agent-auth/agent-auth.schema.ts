import z from "zod";
import { TransportOptionsSchema } from "../../transport";

// ---------------------------------------------------------- //
// Enums
// ---------------------------------------------------------- //

export const AgentStatusEnum = z.enum([
  "pending",
  "active",
  "revoked",
  "expired",
  "rejected",
  "claimed",
]);
export type TAgentStatus = z.infer<typeof AgentStatusEnum>;

export const AgentModeEnum = z.enum(["delegated", "autonomous"]);
export type TAgentMode = z.infer<typeof AgentModeEnum>;

export const HostStatusEnum = z.enum([
  "pending",
  "active",
  "revoked",
  "rejected",
  "pending_enrollment",
]);
export type THostStatus = z.infer<typeof HostStatusEnum>;

// ---------------------------------------------------------- //
// Agent DTO
// ---------------------------------------------------------- //

export const AgentSchema = z.object({
  agent_id: z.string(),
  name: z.string(),
  status: AgentStatusEnum,
  mode: AgentModeEnum,
  host_id: z.string(),
  host_name: z.string(),
  agent_capability_grants: z.array(z.record(z.string(), z.unknown())),
  created_at: z.coerce.date(),
  last_used_at: z.coerce.date().nullable(),
  expires_at: z.coerce.date().nullable(),
});
export type TAgentSchema = z.infer<typeof AgentSchema>;

export const ListAgentsResponseDtoSchema = z.object({
  agents: z.array(AgentSchema),
});
export type TListAgentsResponseDtoSchema = z.infer<
  typeof ListAgentsResponseDtoSchema
>;

// ---------------------------------------------------------- //
// Host DTO
// ---------------------------------------------------------- //

export const HostSchema = z.object({
  id: z.string(),
  name: z.string(),
  default_capabilities: z.array(z.string()),
  status: HostStatusEnum,
  activated_at: z.coerce.date().nullable(),
  expires_at: z.coerce.date().nullable(),
  last_used_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type THostSchema = z.infer<typeof HostSchema>;

export const ListHostsResponseDtoSchema = z.object({
  hosts: z.array(HostSchema),
});
export type TListHostsResponseDtoSchema = z.infer<
  typeof ListHostsResponseDtoSchema
>;

// ---------------------------------------------------------- //
// Revoke Agent
// ---------------------------------------------------------- //

export const RevokeAgentValidationSchema = z.object({
  agent_id: z.string(),
});
export type TRevokeAgentValidationSchema = z.infer<
  typeof RevokeAgentValidationSchema
>;

export const RevokeAgentActionSchema = z.object({
  payload: RevokeAgentValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TRevokeAgentActionSchema = z.infer<typeof RevokeAgentActionSchema>;

// ---------------------------------------------------------- //
// Reactivate Agent
// ---------------------------------------------------------- //

export const ReactivateAgentValidationSchema = z.object({
  agent_id: z.string(),
});
export type TReactivateAgentValidationSchema = z.infer<
  typeof ReactivateAgentValidationSchema
>;

export const ReactivateAgentActionSchema = z.object({
  payload: ReactivateAgentValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TReactivateAgentActionSchema = z.infer<
  typeof ReactivateAgentActionSchema
>;

// ---------------------------------------------------------- //
// Grant Capability
// ---------------------------------------------------------- //

export const GrantCapabilityFormSchema = z.object({
  agent_id: z.string(),
  capabilities: z.string().min(1, "At least one capability is required"),
  ttl: z.coerce.number().positive().optional(),
});
export type TGrantCapabilityFormSchema = z.infer<
  typeof GrantCapabilityFormSchema
>;

export const GrantCapabilityValidationSchema = z.object({
  agent_id: z.string(),
  capabilities: z.array(z.string()).min(1),
  ttl: z.number().positive().optional(),
});
export type TGrantCapabilityValidationSchema = z.infer<
  typeof GrantCapabilityValidationSchema
>;

export const GrantCapabilityActionSchema = z.object({
  payload: GrantCapabilityValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TGrantCapabilityActionSchema = z.infer<
  typeof GrantCapabilityActionSchema
>;

export const GrantCapabilityResponseDtoSchema = z.object({
  agent_id: z.string(),
  grant_ids: z.array(z.string()),
  added: z.array(z.string()),
});
export type TGrantCapabilityResponseDtoSchema = z.infer<
  typeof GrantCapabilityResponseDtoSchema
>;

// ---------------------------------------------------------- //
// Create Host
// ---------------------------------------------------------- //

export const CreateHostFormSchema = z.object({
  name: z.string().min(1, "Host name is required"),
  default_capabilities: z.string().optional(),
  jwks_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});
export type TCreateHostFormSchema = z.infer<typeof CreateHostFormSchema>;

export const CreateHostValidationSchema = z.object({
  name: z.string().min(1),
  default_capabilities: z.array(z.string()).optional(),
  jwks_url: z.string().url().optional(),
});
export type TCreateHostValidationSchema = z.infer<
  typeof CreateHostValidationSchema
>;

export const CreateHostActionSchema = z.object({
  payload: CreateHostValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCreateHostActionSchema = z.infer<typeof CreateHostActionSchema>;

export const CreateHostResponseDtoSchema = z.object({
  hostId: z.string(),
  default_capabilities: z.array(z.string()),
  status: z.string(),
  enrollmentToken: z.string().optional(),
  enrollmentTokenExpiresAt: z.coerce.date().optional(),
});
export type TCreateHostResponseDtoSchema = z.infer<
  typeof CreateHostResponseDtoSchema
>;

// ---------------------------------------------------------- //
// Revoke Host
// ---------------------------------------------------------- //

export const RevokeHostValidationSchema = z.object({
  host_id: z.string(),
});
export type TRevokeHostValidationSchema = z.infer<
  typeof RevokeHostValidationSchema
>;

export const RevokeHostActionSchema = z.object({
  payload: RevokeHostValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TRevokeHostActionSchema = z.infer<typeof RevokeHostActionSchema>;

// ---------------------------------------------------------- //
// Register Agent
// ---------------------------------------------------------- //

export const RegisterAgentFormSchema = z.object({
  name: z.string().min(1, "Agent name is required"),
  mode: AgentModeEnum,
  host_name: z.string().optional(),
  capabilities: z.string().optional(),
  reason: z.string().optional(),
});
export type TRegisterAgentFormSchema = z.infer<typeof RegisterAgentFormSchema>;

export const RegisterAgentValidationSchema = z.object({
  name: z.string().min(1),
  mode: AgentModeEnum.optional(),
  host_name: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
  reason: z.string().optional(),
});
export type TRegisterAgentValidationSchema = z.infer<
  typeof RegisterAgentValidationSchema
>;

export const RegisterAgentActionSchema = z.object({
  payload: RegisterAgentValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TRegisterAgentActionSchema = z.infer<
  typeof RegisterAgentActionSchema
>;

export const RegisterAgentResponseDtoSchema = z.record(z.string(), z.unknown());
export type TRegisterAgentResponseDtoSchema = z.infer<
  typeof RegisterAgentResponseDtoSchema
>;

// ---------------------------------------------------------- //
// Update Agent
// ---------------------------------------------------------- //

export const UpdateAgentFormSchema = z.object({
  agent_id: z.string(),
  name: z.string().min(1, "Name is required"),
  metadata: z.string().optional(),
});
export type TUpdateAgentFormSchema = z.infer<typeof UpdateAgentFormSchema>;

export const UpdateAgentValidationSchema = z.object({
  agent_id: z.string(),
  name: z.string().optional(),
  metadata: z
    .record(
      z.string(),
      z.union([z.string(), z.number(), z.boolean(), z.null()]),
    )
    .optional(),
});
export type TUpdateAgentValidationSchema = z.infer<
  typeof UpdateAgentValidationSchema
>;

export const UpdateAgentActionSchema = z.object({
  payload: UpdateAgentValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdateAgentActionSchema = z.infer<typeof UpdateAgentActionSchema>;

export const UpdateAgentResponseDtoSchema = z.object({
  agent_id: z.string(),
  name: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  updated_at: z.coerce.date(),
});
export type TUpdateAgentResponseDtoSchema = z.infer<
  typeof UpdateAgentResponseDtoSchema
>;

// ---------------------------------------------------------- //
// Cleanup Agents
// ---------------------------------------------------------- //

export const CleanupAgentsResponseDtoSchema = z.object({
  expired: z.number(),
  approvals_expired: z.number(),
});
export type TCleanupAgentsResponseDtoSchema = z.infer<
  typeof CleanupAgentsResponseDtoSchema
>;

export const CleanupAgentsActionSchema = z.object({
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCleanupAgentsActionSchema = z.infer<
  typeof CleanupAgentsActionSchema
>;

// ---------------------------------------------------------- //
// Pending Approvals (CIBA / Device)
// ---------------------------------------------------------- //

export const ApprovalRequestSchema = z.object({
  approval_id: z.string(),
  method: z.enum(["device_authorization", "ciba"]),
  agent_id: z.string().nullable(),
  agent_name: z.string().nullable(),
  binding_message: z.string().nullable(),
  capabilities: z.array(z.string()),
  capability_constraints: z.record(z.string(), z.unknown()).nullable(),
  capability_reasons: z.record(z.string(), z.string()).nullable(),
  expires_in: z.number(),
  created_at: z.coerce.date(),
});
export type TApprovalRequestSchema = z.infer<typeof ApprovalRequestSchema>;

export const ListPendingApprovalsResponseDtoSchema = z.object({
  requests: z.array(ApprovalRequestSchema),
});
export type TListPendingApprovalsResponseDtoSchema = z.infer<
  typeof ListPendingApprovalsResponseDtoSchema
>;

// ---------------------------------------------------------- //
// Approve / Deny Capability
// ---------------------------------------------------------- //

export const ApproveCapabilityValidationSchema = z.object({
  agent_id: z.string().optional(),
  approval_id: z.string().optional(),
  user_code: z.string().optional(),
  action: z.enum(["approve", "deny"]),
  capabilities: z.array(z.string()).optional(),
  ttl: z.number().optional(),
  reason: z.string().optional(),
});
export type TApproveCapabilityValidationSchema = z.infer<
  typeof ApproveCapabilityValidationSchema
>;

export const ApproveCapabilityActionSchema = z.object({
  payload: ApproveCapabilityValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TApproveCapabilityActionSchema = z.infer<
  typeof ApproveCapabilityActionSchema
>;

// ---------------------------------------------------------- //
// Update Host
// ---------------------------------------------------------- //

export const UpdateHostFormSchema = z.object({
  host_id: z.string(),
  name: z.string().min(1, "Host name is required"),
  default_capabilities: z.string().optional(),
  jwks_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});
export type TUpdateHostFormSchema = z.infer<typeof UpdateHostFormSchema>;

export const UpdateHostValidationSchema = z.object({
  host_id: z.string(),
  name: z.string().optional(),
  default_capabilities: z.array(z.string()).optional(),
  jwks_url: z.string().url().optional(),
});
export type TUpdateHostValidationSchema = z.infer<
  typeof UpdateHostValidationSchema
>;

export const UpdateHostActionSchema = z.object({
  payload: UpdateHostValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdateHostActionSchema = z.infer<typeof UpdateHostActionSchema>;

export const UpdateHostResponseDtoSchema = z.object({
  id: z.string(),
  default_capabilities: z.array(z.string()),
  jwks_url: z.string().nullable(),
  status: HostStatusEnum,
  updated_at: z.coerce.date(),
});
export type TUpdateHostResponseDtoSchema = z.infer<
  typeof UpdateHostResponseDtoSchema
>;
