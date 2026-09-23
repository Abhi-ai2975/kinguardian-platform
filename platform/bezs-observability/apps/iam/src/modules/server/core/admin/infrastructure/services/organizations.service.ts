import { randomUUID } from "crypto";
import { headers } from "next/headers";
import { auth } from "@/modules/server/auth-provider/auth";
import { prisma } from "../../../../../../../prisma/db";
import { IOrganizationsService } from "../../domain/interfaces/organizations.service.interface";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import { mapBetterAuthError } from "@/modules/server/shared/errors/mappers/mapBetterAuthError";
import { InfrastructureError } from "@/modules/server/shared/errors/infrastructureError";
import {
  ListOrganizationsResponseSchema,
  OrganizationDetailSchema,
  OrganizationSummarySchema,
  OrgRoleSchema,
  ListOrgRolesResponseSchema,
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
import { parseMetadata } from "@/modules/server/utils/helper";

// BetterAuth stores one row per (organizationId, role) with permission as a JSON
// object: { [resource]: string[] }. Internally we use "resource:action" key strings.

function orgPermissionKeysToJson(keys: string[]): string {
  const grouped: Record<string, string[]> = {};
  for (const key of keys) {
    const colonIdx = key.indexOf(":");
    if (colonIdx < 1) continue;
    const resource = key.slice(0, colonIdx);
    const action = key.slice(colonIdx + 1);
    (grouped[resource] ??= []).push(action);
  }
  return JSON.stringify(grouped);
}

function orgPermissionJsonToKeys(json: string): string[] {
  try {
    const parsed = JSON.parse(json) as Record<string, string[]>;
    return Object.entries(parsed).flatMap(([resource, actions]) =>
      actions.map((action) => `${resource}:${action}`),
    );
  } catch {
    return [];
  }
}

export class OrganizationsService implements IOrganizationsService {
  async listOrganizations(): Promise<TListOrganizationsResponseSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "OrganizationsService.listOrganizations",
      startTimeMs,
      context: { operationId },
    });
    try {
      // BetterAuth's listOrganizations does not return member/team counts.
      // We use Prisma here to fetch the admin-view data with aggregated counts.
      const orgs = await prisma.organization.findMany({
        include: { _count: { select: { members: true, teams: true } } },
        orderBy: { createdAt: "desc" },
      });
      const organizations = orgs.map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        logo: org.logo,
        createdAt: org.createdAt,
        metadata: org.metadata,
        memberCount: org._count.members,
        teamCount: org._count.teams,
      }));
      const data = await ListOrganizationsResponseSchema.parseAsync({
        organizations,
      });
      logOperation("success", {
        name: "OrganizationsService.listOrganizations",
        startTimeMs,
        data,
        context: { operationId },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "OrganizationsService.listOrganizations",
        startTimeMs,
        err: error,
        context: { operationId },
      });
      throw new InfrastructureError("Failed to list organizations", error);
    }
  }

  async getOrganization(
    organizationId: string,
  ): Promise<TOrganizationDetailSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "OrganizationsService.getOrganization",
      startTimeMs,
      context: { operationId, organizationId },
    });
    try {
      const res = await auth.api.getFullOrganization({
        query: { organizationId },
        headers: await headers(),
      });

      if (!res) throw new InfrastructureError("Organization not found", null);

      // BetterAuth returns teams without teammembers, and invitations without inviter user data.
      // Fetch both in parallel from Prisma.
      const inviterIds = [
        ...new Set((res.invitations ?? []).map((inv) => inv.inviterId)),
      ];
      const teamIds = (res.teams ?? []).map((t) => t.id);

      const [inviterUsers, allTeamMembers] = await Promise.all([
        inviterIds.length > 0
          ? prisma.user.findMany({
              where: { id: { in: inviterIds } },
              select: { id: true, name: true, email: true },
            })
          : Promise.resolve([]),
        teamIds.length > 0
          ? prisma.teamMember.findMany({
              where: { teamId: { in: teamIds } },
              include: {
                user: {
                  select: { id: true, name: true, email: true, image: true },
                },
              },
              orderBy: { createdAt: "asc" },
            })
          : Promise.resolve(
              [] as {
                id: string;
                teamId: string;
                userId: string;
                createdAt: Date | null;
                user: {
                  id: string;
                  name: string;
                  email: string;
                  image: string | null;
                };
              }[],
            ),
      ]);

      const inviterMap = new Map(inviterUsers.map((u) => [u.id, u]));
      const teamMembersMap = new Map<string, typeof allTeamMembers>();
      for (const tm of allTeamMembers) {
        if (!teamMembersMap.has(tm.teamId)) teamMembersMap.set(tm.teamId, []);
        teamMembersMap.get(tm.teamId)!.push(tm);
      }

      const teamsWithMembers = (res.teams ?? []).map((team) => ({
        id: team.id,
        name: team.name,
        organizationId: team.organizationId,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt ?? null,
        teammembers: (teamMembersMap.get(team.id) ?? []).map((tm) => ({
          id: tm.id,
          teamId: tm.teamId,
          userId: tm.userId,
          createdAt: tm.createdAt ?? new Date(),
          user: {
            id: tm.user.id,
            name: tm.user.name,
            email: tm.user.email,
            image: tm.user.image ?? null,
          },
        })),
      }));

      const rawData = {
        id: res.id,
        name: res.name,
        slug: res.slug,
        logo: res.logo ?? null,
        createdAt: res.createdAt,
        metadata:
          typeof res.metadata === "object" && res.metadata !== null
            ? JSON.stringify(res.metadata)
            : ((res.metadata as string | undefined | null) ?? null),
        members: (res.members ?? []).map((m) => ({
          id: m.id,
          organizationId: m.organizationId,
          userId: m.userId,
          role: m.role,
          createdAt: m.createdAt,
          user: {
            id: m.user.id,
            name: m.user.name,
            email: m.user.email,
            image: m.user.image ?? null,
          },
        })),
        invitations: (res.invitations ?? []).map((inv) => ({
          id: inv.id,
          organizationId: inv.organizationId,
          email: inv.email,
          role: Array.isArray(inv.role)
            ? (inv.role[0] ?? null)
            : (inv.role ?? null),
          status: inv.status,
          expiresAt: inv.expiresAt,
          createdAt: inv.createdAt,
          inviterId: inv.inviterId,
          teamId: inv.teamId ?? null,
          user: {
            name: inviterMap.get(inv.inviterId)?.name ?? "",
            email: inviterMap.get(inv.inviterId)?.email ?? "",
          },
        })),
        teams: teamsWithMembers,
      };

      const data = await OrganizationDetailSchema.parseAsync(rawData);
      logOperation("success", {
        name: "OrganizationsService.getOrganization",
        startTimeMs,
        data,
        context: { operationId, organizationId },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "OrganizationsService.getOrganization",
        startTimeMs,
        err: error,
        context: { operationId, organizationId },
      });
      if (error instanceof InfrastructureError) throw error;
      mapBetterAuthError(error, "Failed to get organization");
    }
  }

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

  async updateOrganization(
    payload: TUpdateOrganizationValidationSchema,
  ): Promise<TOrganizationSummarySchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "OrganizationsService.updateOrganization",
      startTimeMs,
      context: { operationId, organizationId: payload.organizationId },
    });
    try {
      const res = await auth.api.updateOrganization({
        body: {
          organizationId: payload.organizationId,
          data: {
            ...(payload.name && { name: payload.name }),
            ...(payload.slug && { slug: payload.slug }),
            ...(payload.logo !== undefined && {
              logo: payload.logo || undefined,
            }),
            ...(payload.metadata !== undefined && {
              metadata: parseMetadata(payload.metadata),
            }),
          },
        },
        headers: await headers(),
      });

      if (!res)
        throw new InfrastructureError(
          "Organization not found after update",
          null,
        );

      // Fetch counts since the update response doesn't include them
      const counts = await prisma.organization.findUnique({
        where: { id: payload.organizationId },
        include: { _count: { select: { members: true, teams: true } } },
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
        memberCount: counts?._count.members ?? 0,
        teamCount: counts?._count.teams ?? 0,
      });
      logOperation("success", {
        name: "OrganizationsService.updateOrganization",
        startTimeMs,
        data,
        context: { operationId, organizationId: payload.organizationId },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "OrganizationsService.updateOrganization",
        startTimeMs,
        err: error,
        context: { operationId, organizationId: payload.organizationId },
      });
      if (error instanceof InfrastructureError) throw error;
      mapBetterAuthError(error, "Failed to update organization");
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

  async updateMemberRole(
    payload: TUpdateMemberRoleValidationSchema,
  ): Promise<{ success: boolean }> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "OrganizationsService.updateMemberRole",
      startTimeMs,
      context: { operationId, memberId: payload.memberId },
    });
    try {
      await auth.api.updateMemberRole({
        body: {
          memberId: payload.memberId,
          organizationId: payload.organizationId,
          role: payload.roles,
        },
        headers: await headers(),
      });

      // Persist redirect URLs — isolated so a failure never aborts the role update
      try {
        const member = await prisma.member.findUnique({
          where: { id: payload.memberId },
          select: { userId: true },
        });
        console.log({ member });
        if (member) {
          const { redirectUrls = {} } = payload;
          const rolesToCreate = payload.roles.filter(
            (role) => !!redirectUrls[role],
          );

          await prisma.$transaction(async (tx) => {
            await tx.userOrgRoleRedirect.deleteMany({
              where: {
                userId: member.userId,
                organizationId: payload.organizationId,
              },
            });

            if (rolesToCreate.length > 0) {
              const userOrgRoleRedirectData = rolesToCreate.map((role) => ({
                userId: member.userId,
                organizationId: payload.organizationId,
                role,
                redirectUrl: redirectUrls[role],
              }));

              await tx.userOrgRoleRedirect.createMany({
                data: userOrgRoleRedirectData,
              });
            }
          });
        }
      } catch (redirectError) {
        logOperation("error", {
          name: "OrganizationsService.updateMemberRole.persistRedirects",
          startTimeMs: Date.now(),
          err: redirectError,
          context: { operationId, memberId: payload.memberId },
        });
      }

      const data = { success: true };
      logOperation("success", {
        name: "OrganizationsService.updateMemberRole",
        startTimeMs,
        data,
        context: { operationId, memberId: payload.memberId },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "OrganizationsService.updateMemberRole",
        startTimeMs,
        err: error,
        context: { operationId, memberId: payload.memberId },
      });
      mapBetterAuthError(error, "Failed to update member role");
    }
  }

  async getOrgRoleRedirects(
    userId: string,
    organizationId: string,
  ): Promise<Record<string, string>> {
    const rows = await prisma.userOrgRoleRedirect.findMany({
      where: { userId, organizationId },
    });
    return Object.fromEntries(rows.map((r) => [r.role, r.redirectUrl]));
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

  async isMemberInOrg(
    organizationId: string,
    userId: string,
  ): Promise<boolean> {
    const member = await prisma.member.findFirst({
      where: { organizationId, userId },
      select: { id: true },
    });
    return member !== null;
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

  async removeTeamMember(
    payload: TRemoveTeamMemberValidationSchema,
  ): Promise<{ success: boolean }> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "OrganizationsService.removeTeamMember",
      startTimeMs,
      context: { operationId, teamMemberId: payload.teamMemberId },
    });
    try {
      // BetterAuth's removeTeamMember requires teamId + userId.
      // Look up the team member record to get those values.
      const teamMember = await prisma.teamMember.findUnique({
        where: { id: payload.teamMemberId },
      });
      if (!teamMember)
        throw new InfrastructureError("Team member not found", null);

      await auth.api.removeTeamMember({
        body: {
          teamId: teamMember.teamId,
          userId: teamMember.userId,
          organizationId: payload.organizationId,
        },
        headers: await headers(),
      });
      const data = { success: true };
      logOperation("success", {
        name: "OrganizationsService.removeTeamMember",
        startTimeMs,
        data,
        context: { operationId, teamMemberId: payload.teamMemberId },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "OrganizationsService.removeTeamMember",
        startTimeMs,
        err: error,
        context: { operationId, teamMemberId: payload.teamMemberId },
      });
      if (error instanceof InfrastructureError) throw error;
      mapBetterAuthError(error, "Failed to remove team member");
    }
  }

  async listOrgRoles(
    organizationId: string,
  ): Promise<TListOrgRolesResponseSchema> {
    const rows = await prisma.organizationRole.findMany({
      where: { organizationId },
      orderBy: { role: "asc" },
    });
    const roles = rows.map((row) => ({
      role: row.role,
      permissions: orgPermissionJsonToKeys(row.permission),
      createdAt: row.createdAt,
    }));
    return ListOrgRolesResponseSchema.parse({ roles });
  }

  async createOrgRole(
    payload: TCreateOrgRoleValidationSchema,
  ): Promise<TOrgRoleSchema> {
    const now = new Date();
    await prisma.organizationRole.create({
      data: {
        id: randomUUID(),
        organizationId: payload.organizationId,
        role: payload.role,
        permission: orgPermissionKeysToJson(payload.permissions),
      },
    });
    return OrgRoleSchema.parse({
      role: payload.role,
      permissions: payload.permissions,
      createdAt: now,
    });
  }

  async updateOrgRole(
    payload: TUpdateOrgRoleValidationSchema,
  ): Promise<TOrgRoleSchema> {
    const existing = await prisma.organizationRole.findFirst({
      where: { organizationId: payload.organizationId, role: payload.role },
    });
    const permissionJson = orgPermissionKeysToJson(payload.permissions);
    if (existing) {
      await prisma.organizationRole.update({
        where: { id: existing.id },
        data: { permission: permissionJson },
      });
    } else {
      await prisma.organizationRole.create({
        data: {
          id: randomUUID(),
          organizationId: payload.organizationId,
          role: payload.role,
          permission: permissionJson,
        },
      });
    }
    const updated = await prisma.organizationRole.findFirst({
      where: { organizationId: payload.organizationId, role: payload.role },
    });
    return OrgRoleSchema.parse({
      role: payload.role,
      permissions: payload.permissions,
      createdAt: updated?.createdAt ?? new Date(),
    });
  }

  async deleteOrgRole(
    payload: TDeleteOrgRoleValidationSchema,
  ): Promise<{ success: boolean }> {
    await prisma.organizationRole.deleteMany({
      where: { organizationId: payload.organizationId, role: payload.role },
    });
    return { success: true };
  }
}
