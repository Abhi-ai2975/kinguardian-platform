import {
  TListAgentsResponseDtoSchema,
  TListHostsResponseDtoSchema,
  TRevokeAgentValidationSchema,
  TReactivateAgentValidationSchema,
  TGrantCapabilityValidationSchema,
  TGrantCapabilityResponseDtoSchema,
  TCreateHostValidationSchema,
  TCreateHostResponseDtoSchema,
  TRevokeHostValidationSchema,
  TRegisterAgentValidationSchema,
  TRegisterAgentResponseDtoSchema,
  TUpdateAgentValidationSchema,
  TUpdateAgentResponseDtoSchema,
  TCleanupAgentsResponseDtoSchema,
  TListPendingApprovalsResponseDtoSchema,
  TApproveCapabilityValidationSchema,
  TUpdateHostValidationSchema,
  TUpdateHostResponseDtoSchema,
} from "@/modules/entities/schemas/admin/agent-auth/agent-auth.schema";

export interface IAgentAuthService {
  listAgents(): Promise<TListAgentsResponseDtoSchema>;
  registerAgent(
    payload: TRegisterAgentValidationSchema,
  ): Promise<TRegisterAgentResponseDtoSchema>;
  updateAgent(
    payload: TUpdateAgentValidationSchema,
  ): Promise<TUpdateAgentResponseDtoSchema>;
  revokeAgent(
    payload: TRevokeAgentValidationSchema,
  ): Promise<{ success: boolean }>;
  reactivateAgent(
    payload: TReactivateAgentValidationSchema,
  ): Promise<{ success: boolean }>;
  grantCapability(
    payload: TGrantCapabilityValidationSchema,
  ): Promise<TGrantCapabilityResponseDtoSchema>;
  cleanupAgents(): Promise<TCleanupAgentsResponseDtoSchema>;
  listPendingApprovals(): Promise<TListPendingApprovalsResponseDtoSchema>;
  approveCapability(
    payload: TApproveCapabilityValidationSchema,
  ): Promise<{ success: boolean }>;
  listHosts(): Promise<TListHostsResponseDtoSchema>;
  createHost(
    payload: TCreateHostValidationSchema,
  ): Promise<TCreateHostResponseDtoSchema>;
  updateHost(
    payload: TUpdateHostValidationSchema,
  ): Promise<TUpdateHostResponseDtoSchema>;
  revokeHost(
    payload: TRevokeHostValidationSchema,
  ): Promise<{ success: boolean }>;
}
