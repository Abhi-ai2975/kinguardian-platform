/**
 * @module admin/usercontext.service
 * @description Manages per-user context: which org and which role a user
 *              currently has active. This determines what navigation menus
 *              they see, what permissions they have, and which org's data
 *              they are operating within. All operations use Prisma directly.
 * @category Infrastructure
 * @layer Infrastructure
 */

import { randomUUID } from "crypto";
import { prisma } from "../../../../../../../prisma/db";
import { IUserContextService } from "../../domain/interfaces/usercontext.service.interface";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import { InfrastructureError } from "@/modules/server/shared/errors/infrastructureError";
import {
  TListUserContextsResponseSchema,
  TGetUserOrgMembershipsResponseSchema,
  TGetOrgRolesForContextResponseSchema,
  TSetUserContextValidationSchema,
} from "@/modules/entities/schemas/admin/user-context/user-context.schema";

export class UserContextService implements IUserContextService {
  async listUserContexts(): Promise<TListUserContextsResponseSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "UserContextService.listUserContexts",
      startTimeMs,
      context: { operationId },
    });

    try {
      const users = await prisma.user.findMany({
        include: {
          context: true,
        },
        orderBy: { name: "asc" },
      });

      // Build org id→name map for active orgs
      const activeOrgIds = users
        .map((u) => u.context?.activeOrganizationId)
        .filter((id): id is string => !!id);

      const orgs =
        activeOrgIds.length > 0
          ? await prisma.organization.findMany({
              where: { id: { in: activeOrgIds } },
              select: { id: true, name: true },
            })
          : [];

      const orgNameById = Object.fromEntries(orgs.map((o) => [o.id, o.name]));

      // Build role id→name map for active roles
      const activeRoleIds = users
        .map((u) => u.context?.activeRoleId)
        .filter((id): id is string => !!id);

      const orgRoles =
        activeRoleIds.length > 0
          ? await prisma.organizationRole.findMany({
              where: { id: { in: activeRoleIds } },
              select: { id: true, role: true },
            })
          : [];

      const roleNameById = Object.fromEntries(orgRoles.map((r) => [r.id, r.role]));

      const items = users.map((user) => ({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userImage: user.image ?? null,
        contextId: user.context?.id ?? null,
        activeOrganizationId: user.context?.activeOrganizationId ?? null,
        activeOrganizationName: user.context?.activeOrganizationId
          ? (orgNameById[user.context.activeOrganizationId] ?? null)
          : null,
        activeRoleId: user.context?.activeRoleId ?? null,
        activeRoleName: user.context?.activeRoleId
          ? (roleNameById[user.context.activeRoleId] ?? null)
          : null,
      }));

      logOperation("success", {
        name: "UserContextService.listUserContexts",
        startTimeMs,
        context: { operationId, count: items.length },
      });

      return { items };
    } catch (error) {
      logOperation("error", {
        name: "UserContextService.listUserContexts",
        startTimeMs,
        context: { operationId },
        err: error,
      });
      throw new InfrastructureError("Failed to list user contexts", { cause: error });
    }
  }

  async getUserOrgMemberships(
    userId: string,
  ): Promise<TGetUserOrgMembershipsResponseSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "UserContextService.getUserOrgMemberships",
      startTimeMs,
      context: { operationId, userId },
    });

    try {
      const members = await prisma.member.findMany({
        where: { userId },
        include: {
          organization: { select: { id: true, name: true } },
        },
        orderBy: { organization: { name: "asc" } },
      });

      const memberships = members.map((m) => ({
        organizationId: m.organizationId,
        organizationName: m.organization.name,
        role: m.role,
      }));

      logOperation("success", {
        name: "UserContextService.getUserOrgMemberships",
        startTimeMs,
        context: { operationId, userId, count: memberships.length },
      });

      return { memberships };
    } catch (error) {
      logOperation("error", {
        name: "UserContextService.getUserOrgMemberships",
        startTimeMs,
        context: { operationId, userId },
        err: error,
      });
      throw new InfrastructureError("Failed to get user org memberships", { cause: error });
    }
  }

  async getOrgRolesForContext(
    organizationId: string,
  ): Promise<TGetOrgRolesForContextResponseSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "UserContextService.getOrgRolesForContext",
      startTimeMs,
      context: { operationId, organizationId },
    });

    try {
      const rows = await prisma.organizationRole.findMany({
        where: { organizationId },
        select: { id: true, role: true },
        orderBy: { role: "asc" },
      });

      const roles = rows.map((r) => ({ id: r.id, role: r.role }));

      logOperation("success", {
        name: "UserContextService.getOrgRolesForContext",
        startTimeMs,
        context: { operationId, organizationId, count: roles.length },
      });

      return { roles };
    } catch (error) {
      logOperation("error", {
        name: "UserContextService.getOrgRolesForContext",
        startTimeMs,
        context: { operationId, organizationId },
        err: error,
      });
      throw new InfrastructureError("Failed to get org roles for context", { cause: error });
    }
  }

  async setUserContext(
    payload: TSetUserContextValidationSchema,
  ): Promise<{ success: boolean }> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "UserContextService.setUserContext",
      startTimeMs,
      context: { operationId, userId: payload.userId },
    });

    try {
      await prisma.userContext.upsert({
        where: { userId: payload.userId },
        create: {
          userId: payload.userId,
          activeOrganizationId: payload.activeOrganizationId,
          activeRoleId: payload.activeRoleId,
        },
        update: {
          activeOrganizationId: payload.activeOrganizationId,
          activeRoleId: payload.activeRoleId,
        },
      });

      logOperation("success", {
        name: "UserContextService.setUserContext",
        startTimeMs,
        context: { operationId, userId: payload.userId },
      });

      return { success: true };
    } catch (error) {
      logOperation("error", {
        name: "UserContextService.setUserContext",
        startTimeMs,
        context: { operationId, userId: payload.userId },
        err: error,
      });
      throw new InfrastructureError("Failed to set user context", { cause: error });
    }
  }
}
