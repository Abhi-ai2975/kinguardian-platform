import { randomUUID } from "crypto";
import { prisma } from "../../../../../../../prisma/db";
import { IOrganizationsRepository } from "../../domain/interfaces/repositories/organizations.repository.interface";
import { logOperation } from "@/modules/server/config/logger/log-operation";
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
  TUpdateOrganizationValidationSchema,
  TUpdateMemberRoleValidationSchema,
  TRemoveTeamMemberValidationSchema,
  TOrgRoleSchema,
  TListOrgRolesResponseSchema,
  TCreateOrgRoleValidationSchema,
  TUpdateOrgRoleValidationSchema,
  TDeleteOrgRoleValidationSchema,
} from "@/modules/entities/schemas/admin/organizations/organizations.schema";

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

export class OrganizationsRepository implements IOrganizationsRepository {
  async listOrganizations(): Promise<TListOrganizationsResponseSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "OrganizationsRepository.listOrganizations",
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
        name: "OrganizationsRepository.listOrganizations",
        startTimeMs,
        data,
        context: { operationId },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "OrganizationsRepository.listOrganizations",
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
      name: "OrganizationsRepository.getOrganization",
      startTimeMs,
      context: { operationId, organizationId },
    });
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
            },
          },
          invitations: {
            include: {
              user: { select: { name: true, email: true } },
            },
          },
          teams: {
            orderBy: { createdAt: "asc" },
            include: {
              teammembers: {
                orderBy: { createdAt: "asc" },
                include: {
                  user: {
                    select: { id: true, name: true, email: true, image: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!org) throw new InfrastructureError("Organization not found", null);

      const rawData = {
        id: org.id,
        name: org.name,
        slug: org.slug,
        logo: org.logo ?? null,
        createdAt: org.createdAt,
        metadata: org.metadata ?? null,
        members: org.members.map((m) => ({
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
        invitations: org.invitations.map((inv) => ({
          id: inv.id,
          organizationId: inv.organizationId,
          email: inv.email,
          role: inv.role ?? null,
          status: inv.status,
          expiresAt: inv.expiresAt,
          createdAt: inv.createdAt,
          inviterId: inv.inviterId,
          teamId: inv.teamId ?? null,
          user: {
            name: inv.user.name,
            email: inv.user.email,
          },
        })),
        teams: org.teams.map((team) => ({
          id: team.id,
          name: team.name,
          organizationId: team.organizationId,
          createdAt: team.createdAt,
          updatedAt: team.updatedAt ?? null,
          teammembers: team.teammembers.map((tm) => ({
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
        })),
      };

      const data = await OrganizationDetailSchema.parseAsync(rawData);
      logOperation("success", {
        name: "OrganizationsRepository.getOrganization",
        startTimeMs,
        data,
        context: { operationId, organizationId },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "OrganizationsRepository.getOrganization",
        startTimeMs,
        err: error,
        context: { operationId, organizationId },
      });
      if (error instanceof InfrastructureError) throw error;
      throw new InfrastructureError("Failed to get organization", error);
    }
  }

  async updateOrganization(
    payload: TUpdateOrganizationValidationSchema,
  ): Promise<TOrganizationSummarySchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "OrganizationsRepository.updateOrganization",
      startTimeMs,
      context: { operationId, organizationId: payload.organizationId },
    });
    try {
      const org = await prisma.organization.update({
        where: { id: payload.organizationId },
        data: {
          ...(payload.name && { name: payload.name }),
          ...(payload.slug && { slug: payload.slug }),
          ...(payload.logo !== undefined && {
            logo: payload.logo || undefined,
          }),
          ...(payload.metadata !== undefined && {
            metadata: payload.metadata,
          }),
        },
        include: { _count: { select: { members: true, teams: true } } },
      });

      const data = await OrganizationSummarySchema.parseAsync({
        id: org.id,
        name: org.name,
        slug: org.slug,
        logo: org.logo ?? null,
        createdAt: org.createdAt,
        metadata: org.metadata ?? null,
        memberCount: org._count.members,
        teamCount: org._count.teams,
      });
      logOperation("success", {
        name: "OrganizationsRepository.updateOrganization",
        startTimeMs,
        data,
        context: { operationId, organizationId: payload.organizationId },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "OrganizationsRepository.updateOrganization",
        startTimeMs,
        err: error,
        context: { operationId, organizationId: payload.organizationId },
      });
      throw new InfrastructureError("Failed to update organization", error);
    }
  }

  async updateMemberRole(
    payload: TUpdateMemberRoleValidationSchema,
  ): Promise<{ success: boolean }> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "OrganizationsRepository.updateMemberRole",
      startTimeMs,
      context: { operationId, memberId: payload.memberId },
    });
    try {
      const member = await prisma.member.update({
        where: { id: payload.memberId },
        data: { role: payload.roles.join(",") },
        select: { userId: true },
      });

      // Persist redirect URLs — isolated so a failure never aborts the role update
      try {
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
      } catch (redirectError) {
        logOperation("error", {
          name: "OrganizationsRepository.updateMemberRole.persistRedirects",
          startTimeMs: Date.now(),
          err: redirectError,
          context: { operationId, memberId: payload.memberId },
        });
      }

      const data = { success: true };
      logOperation("success", {
        name: "OrganizationsRepository.updateMemberRole",
        startTimeMs,
        data,
        context: { operationId, memberId: payload.memberId },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "OrganizationsRepository.updateMemberRole",
        startTimeMs,
        err: error,
        context: { operationId, memberId: payload.memberId },
      });
      throw new InfrastructureError("Failed to update member role", error);
    }
  }

  async removeTeamMember(
    payload: TRemoveTeamMemberValidationSchema,
  ): Promise<{ success: boolean }> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "OrganizationsRepository.removeTeamMember",
      startTimeMs,
      context: { operationId, teamMemberId: payload.teamMemberId },
    });
    try {
      await prisma.teamMember.delete({
        where: { id: payload.teamMemberId },
      });
      const data = { success: true };
      logOperation("success", {
        name: "OrganizationsRepository.removeTeamMember",
        startTimeMs,
        data,
        context: { operationId, teamMemberId: payload.teamMemberId },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "OrganizationsRepository.removeTeamMember",
        startTimeMs,
        err: error,
        context: { operationId, teamMemberId: payload.teamMemberId },
      });
      throw new InfrastructureError("Failed to remove team member", error);
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
