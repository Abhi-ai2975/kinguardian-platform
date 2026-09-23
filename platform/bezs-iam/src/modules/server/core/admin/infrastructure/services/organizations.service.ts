import { randomUUID } from "crypto";
import { headers } from "next/headers";
import { auth } from "@/modules/server/auth-provider/auth";
import { IOrganizationsService } from "../../domain/interfaces/services/organizations.service.interface";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import { mapBetterAuthError } from "@/modules/server/shared/errors/mappers/mapBetterAuthError";
import {
  OrganizationSummarySchema,
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
import { parseMetadata } from "@/modules/server/utils/helper";

export class OrganizationsService implements IOrganizationsService {
  async createOrganization(
    payload: TCreateOrganizationValidationSchema,
  ): Promise<TOrganizationSummarySchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "OrganizationsService.createOrganization",
      startTimeMs,
      context: { operationId },
    });

    try {
      const res = await auth.api.createOrganization({
        body: {
          name: payload.name,
          slug: payload.slug,
          logo: payload.logo || undefined,
          metadata: parseMetadata(payload.metadata),
        },
        headers: await headers(),
      });

      const data = await OrganizationSummarySchema.parseAsync({
        id: res.id,
        name: res.name,
        slug: res.slug,
        logo: res.logo ?? null,
        createdAt: res.createdAt,
        metadata:
          typeof res.metadata === "object" && res.metadata !== null
            ? JSON.stringify(res.metadata)
            : ((res.metadata as string | undefined | null) ?? null),
        memberCount: res.members?.length ?? 0,
        teamCount: 0,
      });

      logOperation("success", {
        name: "OrganizationsService.createOrganization",
        startTimeMs,
        data,
        context: { operationId },
      });

      return data;
    } catch (error) {
      logOperation("error", {
        name: "OrganizationsService.createOrganization",
        startTimeMs,
        err: error,
        context: { operationId },
      });

      mapBetterAuthError(error, "Failed to create organization");
    }
  }

  async deleteOrganization(
    payload: TDeleteOrganizationValidationSchema,
  ): Promise<{ success: boolean }> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "OrganizationsService.deleteOrganization",
      startTimeMs,
      context: { operationId, organizationId: payload.organizationId },
    });
    try {
      await auth.api.deleteOrganization({
        body: { organizationId: payload.organizationId },
        headers: await headers(),
      });
      const data = { success: true };
      logOperation("success", {
        name: "OrganizationsService.deleteOrganization",
        startTimeMs,
        data,
        context: { operationId, organizationId: payload.organizationId },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "OrganizationsService.deleteOrganization",
        startTimeMs,
        err: error,
        context: { operationId, organizationId: payload.organizationId },
      });
      mapBetterAuthError(error, "Failed to delete organization");
    }
  }

  async addMember(
    payload: TAddMemberServiceSchema,
  ): Promise<{ success: boolean }> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "OrganizationsService.addMember",
      startTimeMs,
      userId: payload.userId,
      context: { operationId, organizationId: payload.organizationId },
    });
    try {
      await auth.api.addMember({
        body: {
          userId: payload.userId,
          organizationId: payload.organizationId,
          role: payload.roles as ("member" | "admin" | "owner")[],
        },
        headers: await headers(),
      });
      const data = { success: true };
      logOperation("success", {
        name: "OrganizationsService.addMember",
        startTimeMs,
        userId: payload.userId,
        data,
        context: { operationId, organizationId: payload.organizationId },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "OrganizationsService.addMember",
        startTimeMs,
        userId: payload.userId,
        err: error,
        context: { operationId, organizationId: payload.organizationId },
      });
      mapBetterAuthError(error, "Failed to add member");
    }
  }

  async removeMember(
    payload: TRemoveMemberValidationSchema,
  ): Promise<{ success: boolean }> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "OrganizationsService.removeMember",
      startTimeMs,
      context: { operationId, memberId: payload.memberId },
    });
    try {
      await auth.api.removeMember({
        body: {
          memberIdOrEmail: payload.memberId,
          organizationId: payload.organizationId,
        },
        headers: await headers(),
      });
      const data = { success: true };
      logOperation("success", {
        name: "OrganizationsService.removeMember",
        startTimeMs,
        data,
        context: { operationId, memberId: payload.memberId },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "OrganizationsService.removeMember",
        startTimeMs,
        err: error,
        context: { operationId, memberId: payload.memberId },
      });
      mapBetterAuthError(error, "Failed to remove member");
    }
  }

  async createInvitation(
    payload: TCreateInvitationValidationSchema,
  ): Promise<{ success: boolean }> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "OrganizationsService.createInvitation",
      startTimeMs,
      context: { operationId, organizationId: payload.organizationId },
    });
    try {
      await auth.api.createInvitation({
        body: {
          email: payload.email,
          organizationId: payload.organizationId,
          role: [payload.role],
          ...(payload.teamId && { teamId: payload.teamId }),
        },
        headers: await headers(),
      });
      const data = { success: true };
      logOperation("success", {
        name: "OrganizationsService.createInvitation",
        startTimeMs,
        data,
        context: { operationId, organizationId: payload.organizationId },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "OrganizationsService.createInvitation",
        startTimeMs,
        err: error,
        context: { operationId, organizationId: payload.organizationId },
      });
      mapBetterAuthError(error, "Failed to create invitation");
    }
  }

  async cancelInvitation(
    payload: TCancelInvitationValidationSchema,
  ): Promise<{ success: boolean }> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "OrganizationsService.cancelInvitation",
      startTimeMs,
      context: { operationId, invitationId: payload.invitationId },
    });
    try {
      await auth.api.cancelInvitation({
        body: { invitationId: payload.invitationId },
        headers: await headers(),
      });
      const data = { success: true };
      logOperation("success", {
        name: "OrganizationsService.cancelInvitation",
        startTimeMs,
        data,
        context: { operationId, invitationId: payload.invitationId },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "OrganizationsService.cancelInvitation",
        startTimeMs,
        err: error,
        context: { operationId, invitationId: payload.invitationId },
      });
      mapBetterAuthError(error, "Failed to cancel invitation");
    }
  }

  async createTeam(
    payload: TCreateTeamValidationSchema,
  ): Promise<{ success: boolean }> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "OrganizationsService.createTeam",
      startTimeMs,
      context: { operationId, organizationId: payload.organizationId },
    });
    try {
      await auth.api.createTeam({
        body: {
          name: payload.name,
          organizationId: payload.organizationId,
        },
        headers: await headers(),
      });
      const data = { success: true };
      logOperation("success", {
        name: "OrganizationsService.createTeam",
        startTimeMs,
        data,
        context: { operationId, organizationId: payload.organizationId },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "OrganizationsService.createTeam",
        startTimeMs,
        err: error,
        context: { operationId, organizationId: payload.organizationId },
      });
      mapBetterAuthError(error, "Failed to create team");
    }
  }

  async updateTeam(
    payload: TUpdateTeamValidationSchema,
  ): Promise<{ success: boolean }> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "OrganizationsService.updateTeam",
      startTimeMs,
      context: { operationId, teamId: payload.teamId },
    });
    try {
      await auth.api.updateTeam({
        body: {
          teamId: payload.teamId,
          data: { name: payload.name },
        },
        headers: await headers(),
      });
      const data = { success: true };
      logOperation("success", {
        name: "OrganizationsService.updateTeam",
        startTimeMs,
        data,
        context: { operationId, teamId: payload.teamId },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "OrganizationsService.updateTeam",
        startTimeMs,
        err: error,
        context: { operationId, teamId: payload.teamId },
      });
      mapBetterAuthError(error, "Failed to update team");
    }
  }

  async removeTeam(
    payload: TRemoveTeamValidationSchema,
  ): Promise<{ success: boolean }> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "OrganizationsService.removeTeam",
      startTimeMs,
      context: { operationId, teamId: payload.teamId },
    });
    try {
      await auth.api.removeTeam({
        body: {
          teamId: payload.teamId,
          organizationId: payload.organizationId,
        },
        headers: await headers(),
      });
      const data = { success: true };
      logOperation("success", {
        name: "OrganizationsService.removeTeam",
        startTimeMs,
        data,
        context: { operationId, teamId: payload.teamId },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "OrganizationsService.removeTeam",
        startTimeMs,
        err: error,
        context: { operationId, teamId: payload.teamId },
      });
      mapBetterAuthError(error, "Failed to remove team");
    }
  }

  async addTeamMember(
    payload: TAddTeamMemberServiceSchema,
  ): Promise<{ success: boolean }> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "OrganizationsService.addTeamMember",
      startTimeMs,
      userId: payload.userId,
      context: { operationId, teamId: payload.teamId },
    });
    try {
      await auth.api.addTeamMember({
        body: {
          teamId: payload.teamId,
          userId: payload.userId,
          organizationId: payload.organizationId,
        },
        headers: await headers(),
      });
      const data = { success: true };
      logOperation("success", {
        name: "OrganizationsService.addTeamMember",
        startTimeMs,
        userId: payload.userId,
        data,
        context: { operationId, teamId: payload.teamId },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "OrganizationsService.addTeamMember",
        startTimeMs,
        userId: payload.userId,
        err: error,
        context: { operationId, teamId: payload.teamId },
      });
      mapBetterAuthError(error, "Failed to add team member");
    }
  }
}
