import { randomUUID } from "crypto";
import { headers } from "next/headers";
import { auth } from "@/modules/server/auth-provider/auth";
import { IAgentAuthService } from "../../domain/interfaces/agentauth.service.interface";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import { mapBetterAuthError } from "@/modules/server/shared/errors/mappers/mapBetterAuthError";
import {
  ListAgentsResponseDtoSchema,
  TListAgentsResponseDtoSchema,
  ListHostsResponseDtoSchema,
  TListHostsResponseDtoSchema,
  TRevokeAgentValidationSchema,
  TReactivateAgentValidationSchema,
  TGrantCapabilityValidationSchema,
  TGrantCapabilityResponseDtoSchema,
  GrantCapabilityResponseDtoSchema,
  TCreateHostValidationSchema,
  TCreateHostResponseDtoSchema,
  CreateHostResponseDtoSchema,
  TRevokeHostValidationSchema,
  TRegisterAgentValidationSchema,
  TRegisterAgentResponseDtoSchema,
  RegisterAgentResponseDtoSchema,
  TUpdateAgentValidationSchema,
  TUpdateAgentResponseDtoSchema,
  UpdateAgentResponseDtoSchema,
  TCleanupAgentsResponseDtoSchema,
  CleanupAgentsResponseDtoSchema,
  TListPendingApprovalsResponseDtoSchema,
  ListPendingApprovalsResponseDtoSchema,
  TApproveCapabilityValidationSchema,
  TUpdateHostValidationSchema,
  TUpdateHostResponseDtoSchema,
  UpdateHostResponseDtoSchema,
} from "@/modules/entities/schemas/admin/agent-auth/agent-auth.schema";

export class AgentAuthService implements IAgentAuthService {
  async listAgents(): Promise<TListAgentsResponseDtoSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "AgentAuthService.listAgents", startTimeMs, context: { operationId } });
    try {
      const res = await auth.api.listAgents({ headers: await headers(), query: {} });
      const data = await ListAgentsResponseDtoSchema.parseAsync(res);
      logOperation("success", { name: "AgentAuthService.listAgents", startTimeMs, data, context: { operationId } });
      return data;
    } catch (error) {
      logOperation("error", { name: "AgentAuthService.listAgents", startTimeMs, err: error, context: { operationId } });
      mapBetterAuthError(error, "Failed to list agents");
    }
  }

  async registerAgent(
    payload: TRegisterAgentValidationSchema,
  ): Promise<TRegisterAgentResponseDtoSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "AgentAuthService.registerAgent", startTimeMs, context: { operationId } });
    try {
      const res = await auth.api.register({
        headers: await headers(),
        body: {
          name: payload.name,
          mode: payload.mode,
          host_name: payload.host_name,
          capabilities: payload.capabilities,
          reason: payload.reason,
        },
      });
      const data = await RegisterAgentResponseDtoSchema.parseAsync(res);
      logOperation("success", { name: "AgentAuthService.registerAgent", startTimeMs, data, context: { operationId } });
      return data;
    } catch (error) {
      logOperation("error", { name: "AgentAuthService.registerAgent", startTimeMs, err: error, context: { operationId } });
      mapBetterAuthError(error, "Failed to register agent");
    }
  }

  async updateAgent(
    payload: TUpdateAgentValidationSchema,
  ): Promise<TUpdateAgentResponseDtoSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "AgentAuthService.updateAgent",
      startTimeMs,
      context: { operationId, agentId: payload.agent_id },
    });
    try {
      const res = await auth.api.updateAgent({
        headers: await headers(),
        body: {
          agent_id: payload.agent_id,
          name: payload.name,
          metadata: payload.metadata,
        },
      });
      const data = await UpdateAgentResponseDtoSchema.parseAsync(res);
      logOperation("success", {
        name: "AgentAuthService.updateAgent",
        startTimeMs,
        data,
        context: { operationId, agentId: payload.agent_id },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "AgentAuthService.updateAgent",
        startTimeMs,
        err: error,
        context: { operationId, agentId: payload.agent_id },
      });
      mapBetterAuthError(error, "Failed to update agent");
    }
  }

  async revokeAgent(
    payload: TRevokeAgentValidationSchema,
  ): Promise<{ success: boolean }> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "AgentAuthService.revokeAgent",
      startTimeMs,
      context: { operationId, agentId: payload.agent_id },
    });
    try {
      await auth.api.revokeAgent({ headers: await headers(), body: { agent_id: payload.agent_id } });
      const data = { success: true };
      logOperation("success", {
        name: "AgentAuthService.revokeAgent",
        startTimeMs,
        data,
        context: { operationId, agentId: payload.agent_id },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "AgentAuthService.revokeAgent",
        startTimeMs,
        err: error,
        context: { operationId, agentId: payload.agent_id },
      });
      mapBetterAuthError(error, "Failed to revoke agent");
    }
  }

  async reactivateAgent(
    payload: TReactivateAgentValidationSchema,
  ): Promise<{ success: boolean }> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "AgentAuthService.reactivateAgent",
      startTimeMs,
      context: { operationId, agentId: payload.agent_id },
    });
    try {
      await auth.api.reactivateAgent({ headers: await headers(), body: { agent_id: payload.agent_id } });
      const data = { success: true };
      logOperation("success", {
        name: "AgentAuthService.reactivateAgent",
        startTimeMs,
        data,
        context: { operationId, agentId: payload.agent_id },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "AgentAuthService.reactivateAgent",
        startTimeMs,
        err: error,
        context: { operationId, agentId: payload.agent_id },
      });
      mapBetterAuthError(error, "Failed to reactivate agent");
    }
  }

  async grantCapability(
    payload: TGrantCapabilityValidationSchema,
  ): Promise<TGrantCapabilityResponseDtoSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "AgentAuthService.grantCapability",
      startTimeMs,
      context: { operationId, agentId: payload.agent_id },
    });
    try {
      const res = await auth.api.grantCapability({
        headers: await headers(),
        body: {
          agent_id: payload.agent_id,
          capabilities: payload.capabilities,
          ttl: payload.ttl,
        },
      });
      const data = await GrantCapabilityResponseDtoSchema.parseAsync(res);
      logOperation("success", {
        name: "AgentAuthService.grantCapability",
        startTimeMs,
        data,
        context: { operationId, agentId: payload.agent_id },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "AgentAuthService.grantCapability",
        startTimeMs,
        err: error,
        context: { operationId, agentId: payload.agent_id },
      });
      mapBetterAuthError(error, "Failed to grant capability");
    }
  }

  async cleanupAgents(): Promise<TCleanupAgentsResponseDtoSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "AgentAuthService.cleanupAgents", startTimeMs, context: { operationId } });
    try {
      const res = await auth.api.cleanupAgents({ headers: await headers() });
      const data = await CleanupAgentsResponseDtoSchema.parseAsync(res);
      logOperation("success", { name: "AgentAuthService.cleanupAgents", startTimeMs, data, context: { operationId } });
      return data;
    } catch (error) {
      logOperation("error", { name: "AgentAuthService.cleanupAgents", startTimeMs, err: error, context: { operationId } });
      mapBetterAuthError(error, "Failed to cleanup agents");
    }
  }

  async listPendingApprovals(): Promise<TListPendingApprovalsResponseDtoSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "AgentAuthService.listPendingApprovals", startTimeMs, context: { operationId } });
    try {
      const res = await auth.api.cibaPending({ headers: await headers() });
      const data = await ListPendingApprovalsResponseDtoSchema.parseAsync(res);
      logOperation("success", { name: "AgentAuthService.listPendingApprovals", startTimeMs, data, context: { operationId } });
      return data;
    } catch (error) {
      logOperation("error", { name: "AgentAuthService.listPendingApprovals", startTimeMs, err: error, context: { operationId } });
      mapBetterAuthError(error, "Failed to list pending approvals");
    }
  }

  async approveCapability(
    payload: TApproveCapabilityValidationSchema,
  ): Promise<{ success: boolean }> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "AgentAuthService.approveCapability",
      startTimeMs,
      context: { operationId, agentId: payload.agent_id, approvalId: payload.approval_id },
    });
    try {
      await auth.api.approveCapability({
        headers: await headers(),
        body: {
          agent_id: payload.agent_id,
          approval_id: payload.approval_id,
          action: payload.action,
          capabilities: payload.capabilities,
          ttl: payload.ttl,
          reason: payload.reason,
        },
      });
      const data = { success: true };
      logOperation("success", {
        name: "AgentAuthService.approveCapability",
        startTimeMs,
        data,
        context: { operationId, agentId: payload.agent_id, approvalId: payload.approval_id },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "AgentAuthService.approveCapability",
        startTimeMs,
        err: error,
        context: { operationId, agentId: payload.agent_id, approvalId: payload.approval_id },
      });
      mapBetterAuthError(error, "Failed to approve capability");
    }
  }

  async listHosts(): Promise<TListHostsResponseDtoSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "AgentAuthService.listHosts", startTimeMs, context: { operationId } });
    try {
      const res = await auth.api.listHosts({ headers: await headers(), query: {} });
      const data = await ListHostsResponseDtoSchema.parseAsync(res);
      logOperation("success", { name: "AgentAuthService.listHosts", startTimeMs, data, context: { operationId } });
      return data;
    } catch (error) {
      logOperation("error", { name: "AgentAuthService.listHosts", startTimeMs, err: error, context: { operationId } });
      mapBetterAuthError(error, "Failed to list hosts");
    }
  }

  async createHost(
    payload: TCreateHostValidationSchema,
  ): Promise<TCreateHostResponseDtoSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "AgentAuthService.createHost", startTimeMs, context: { operationId } });
    try {
      const res = await auth.api.createHost({
        headers: await headers(),
        body: {
          name: payload.name,
          default_capabilities: payload.default_capabilities,
          jwks_url: payload.jwks_url,
        },
      });
      const data = await CreateHostResponseDtoSchema.parseAsync(res);
      logOperation("success", { name: "AgentAuthService.createHost", startTimeMs, data, context: { operationId } });
      return data;
    } catch (error) {
      logOperation("error", { name: "AgentAuthService.createHost", startTimeMs, err: error, context: { operationId } });
      mapBetterAuthError(error, "Failed to create host");
    }
  }

  async updateHost(
    payload: TUpdateHostValidationSchema,
  ): Promise<TUpdateHostResponseDtoSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "AgentAuthService.updateHost",
      startTimeMs,
      context: { operationId, hostId: payload.host_id },
    });
    try {
      const res = await auth.api.updateHost({
        headers: await headers(),
        body: {
          host_id: payload.host_id,
          name: payload.name,
          default_capabilities: payload.default_capabilities,
          jwks_url: payload.jwks_url,
        },
      });
      const data = await UpdateHostResponseDtoSchema.parseAsync(res);
      logOperation("success", {
        name: "AgentAuthService.updateHost",
        startTimeMs,
        data,
        context: { operationId, hostId: payload.host_id },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "AgentAuthService.updateHost",
        startTimeMs,
        err: error,
        context: { operationId, hostId: payload.host_id },
      });
      mapBetterAuthError(error, "Failed to update host");
    }
  }

  async revokeHost(
    payload: TRevokeHostValidationSchema,
  ): Promise<{ success: boolean }> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "AgentAuthService.revokeHost",
      startTimeMs,
      context: { operationId, hostId: payload.host_id },
    });
    try {
      await auth.api.revokeHost({ headers: await headers(), body: { host_id: payload.host_id } });
      const data = { success: true };
      logOperation("success", {
        name: "AgentAuthService.revokeHost",
        startTimeMs,
        data,
        context: { operationId, hostId: payload.host_id },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "AgentAuthService.revokeHost",
        startTimeMs,
        err: error,
        context: { operationId, hostId: payload.host_id },
      });
      mapBetterAuthError(error, "Failed to revoke host");
    }
  }
}
