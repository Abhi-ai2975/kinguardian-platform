/**
 * @module admin/apps.service
 * @description Manages navigation apps and hierarchical menu nodes.
 *              Apps represent top-level application shells in the sidebar.
 *              Menu nodes are the actual navigation items organized in
 *              parent-child trees, each gated by permission keys.
 *              All operations use Prisma directly.
 * @category Infrastructure
 * @layer Infrastructure
 */

import { randomUUID } from "crypto";
import { prisma } from "../../../../../../../prisma/db";
import { IAppsService } from "../../domain/interfaces/apps.service.interface";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import { InfrastructureError } from "@/modules/server/shared/errors/infrastructureError";
import {
  ListAppsResponseSchema,
  TListAppsResponseSchema,
  AppSchema,
  TAppSchema,
  TCreateAppValidationSchema,
  TUpdateAppValidationSchema,
  TDeleteAppValidationSchema,
  ListMenuNodesResponseSchema,
  TListMenuNodesResponseSchema,
  MenuNodeSchema,
  TMenuNodeSchema,
  TCreateMenuNodeValidationSchema,
  TUpdateMenuNodeValidationSchema,
  TDeleteMenuNodeValidationSchema,
  TReorderMenuNodeValidationSchema,
  ListActionsResponseSchema,
  TListActionsResponseSchema,
} from "@/modules/entities/schemas/admin/apps/apps.schema";

export class AppsService implements IAppsService {
  // ------------------------------------------------------------------ //
  // App operations
  // ------------------------------------------------------------------ //

  async listApps(): Promise<TListAppsResponseSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "AppsService.listApps",
      startTimeMs,
      context: { operationId },
    });

    try {
      const apps = await prisma.app.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
      });
      const mapped = apps.map((a) => ({
        id: a.id,
        name: a.name,
        slug: a.slug,
        description: a.description,
        isActive: a.isActive,
        deletedAt: a.deletedAt,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      }));

      const data = await ListAppsResponseSchema.parseAsync({ apps: mapped });

      logOperation("success", {
        name: "AppsService.listApps",
        startTimeMs,
        data,
        context: { operationId },
      });

      return data;
    } catch (error) {
      logOperation("error", {
        name: "AppsService.listApps",
        startTimeMs,
        err: error,
        context: { operationId },
      });

      throw new InfrastructureError("Failed to list apps", error);
    }
  }

  async createApp(payload: TCreateAppValidationSchema): Promise<TAppSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "AppsService.createApp",
      startTimeMs,
      context: { operationId },
    });

    try {
      const app = await prisma.app.create({
        data: {
          name: payload.name,
          slug: payload.slug,
          description: payload.description ?? null,
          isActive: payload.isActive ?? true,
          createdBy: payload.createdBy ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const data = await AppSchema.parseAsync(app);

      logOperation("success", {
        name: "AppsService.createApp",
        startTimeMs,
        data,
        context: { operationId },
      });

      return data;
    } catch (error) {
      logOperation("error", {
        name: "AppsService.createApp",
        startTimeMs,
        err: error,
        context: { operationId },
      });

      throw new InfrastructureError("Failed to create app", error);
    }
  }

  async updateApp(payload: TUpdateAppValidationSchema): Promise<TAppSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "AppsService.updateApp",
      startTimeMs,
      context: { operationId, id: payload.id },
    });

    try {
      const app = await prisma.app.update({
        where: { id: payload.id },
        data: {
          ...(payload.name && { name: payload.name }),
          ...(payload.slug && { slug: payload.slug }),
          ...(payload.description !== undefined && {
            description: payload.description,
          }),
          ...(payload.isActive !== undefined && { isActive: payload.isActive }),
          ...(payload.updatedBy && { updatedBy: payload.updatedBy }),
          updatedAt: new Date(),
        },
      });

      const data = await AppSchema.parseAsync(app);

      logOperation("success", {
        name: "AppsService.updateApp",
        startTimeMs,
        data,
        context: { operationId, id: payload.id },
      });

      return data;
    } catch (error) {
      logOperation("error", {
        name: "AppsService.updateApp",
        startTimeMs,
        err: error,
        context: { operationId, id: payload.id },
      });

      throw new InfrastructureError("Failed to update app", error);
    }
  }

  async deleteApp(
    payload: TDeleteAppValidationSchema,
  ): Promise<{ success: boolean }> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "AppsService.deleteApp",
      startTimeMs,
      context: { operationId, id: payload.id },
    });

    try {
      await prisma.app.update({
        where: { id: payload.id },
        data: { deletedAt: new Date() },
      });
      const data = { success: true };
      logOperation("success", {
        name: "AppsService.deleteApp",
        startTimeMs,
        data,
        context: { operationId, id: payload.id },
      });

      return data;
    } catch (error) {
      logOperation("error", {
        name: "AppsService.deleteApp",
        startTimeMs,
        err: error,
        context: { operationId, id: payload.id },
      });

      throw new InfrastructureError("Failed to delete app", error);
    }
  }

  // ------------------------------------------------------------------ //
  // MenuNode operations
  // ------------------------------------------------------------------ //

  async listMenuNodes(appId: string): Promise<TListMenuNodesResponseSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "AppsService.listMenuNodes",
      startTimeMs,
      context: { operationId, appId },
    });

    try {
      const nodes = await prisma.appMenuNode.findMany({
        where: { appId },
        include: { parent: { select: { label: true } } },
        orderBy: [{ order: "asc" }],
      });

      const mapped = nodes.map((n) => ({
        id: n.id,
        appId: n.appId,
        parentId: n.parentId,
        parentLabel: n.parent?.label ?? null,
        label: n.label,
        slug: n.slug,
        icon: n.icon,
        href: n.href,
        order: n.order,
        type: n.type as "GROUP" | "ITEM",
        isActive: n.isActive,
        isVisible: n.isVisible,
        permissionKeys: n.permissionKeys,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      }));

      const data = await ListMenuNodesResponseSchema.parseAsync({
        nodes: mapped,
      });

      logOperation("success", {
        name: "AppsService.listMenuNodes",
        startTimeMs,
        data,
        context: { operationId, appId },
      });

      return data;
    } catch (error) {
      logOperation("error", {
        name: "AppsService.listMenuNodes",
        startTimeMs,
        err: error,
        context: { operationId, appId },
      });

      throw new InfrastructureError("Failed to list menu nodes", error);
    }
  }

  async createMenuNode(
    payload: TCreateMenuNodeValidationSchema,
  ): Promise<TMenuNodeSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "AppsService.createMenuNode",
      startTimeMs,
      context: { operationId, appId: payload.appId },
    });
    try {
      const node = await prisma.appMenuNode.create({
        data: {
          id: randomUUID(),
          appId: payload.appId,
          parentId: payload.parentId ?? null,
          label: payload.label,
          slug: payload.slug,
          icon: payload.icon ?? null,
          href: payload.href ?? null,
          order: payload.order ?? 0,
          type: (payload.type ?? "ITEM") as "GROUP" | "ITEM",
          isActive: true,
          isVisible: payload.isVisible ?? true,
          permissionKeys: payload.permissionKeys ?? [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        include: { parent: { select: { label: true } } },
      });
      const data = await MenuNodeSchema.parseAsync({
        ...node,
        type: node.type as "GROUP" | "ITEM",
        parentLabel: node.parent?.label ?? null,
      });
      logOperation("success", {
        name: "AppsService.createMenuNode",
        startTimeMs,
        data,
        context: { operationId, appId: payload.appId },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "AppsService.createMenuNode",
        startTimeMs,
        err: error,
        context: { operationId, appId: payload.appId },
      });
      throw new InfrastructureError("Failed to create menu node", error);
    }
  }

  async updateMenuNode(
    payload: TUpdateMenuNodeValidationSchema,
  ): Promise<TMenuNodeSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "AppsService.updateMenuNode",
      startTimeMs,
      context: { operationId, id: payload.id },
    });
    try {
      const node = await prisma.appMenuNode.update({
        where: { id: payload.id },
        data: {
          ...(payload.parentId !== undefined && { parentId: payload.parentId }),
          ...(payload.label && { label: payload.label }),
          ...(payload.slug && { slug: payload.slug }),
          ...(payload.icon !== undefined && { icon: payload.icon }),
          ...(payload.href !== undefined && { href: payload.href }),
          ...(payload.order !== undefined && { order: payload.order }),
          ...(payload.type && { type: payload.type as "GROUP" | "ITEM" }),
          ...(payload.isActive !== undefined && { isActive: payload.isActive }),
          ...(payload.isVisible !== undefined && { isVisible: payload.isVisible }),
          ...(payload.permissionKeys !== undefined && {
            permissionKeys: payload.permissionKeys,
          }),
          updatedAt: new Date(),
        },
        include: { parent: { select: { label: true } } },
      });
      const data = await MenuNodeSchema.parseAsync({
        ...node,
        type: node.type as "GROUP" | "ITEM",
        parentLabel: node.parent?.label ?? null,
      });
      logOperation("success", {
        name: "AppsService.updateMenuNode",
        startTimeMs,
        data,
        context: { operationId, id: payload.id },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "AppsService.updateMenuNode",
        startTimeMs,
        err: error,
        context: { operationId, id: payload.id },
      });
      throw new InfrastructureError("Failed to update menu node", error);
    }
  }

  async deleteMenuNode(
    payload: TDeleteMenuNodeValidationSchema,
  ): Promise<{ success: boolean }> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "AppsService.deleteMenuNode",
      startTimeMs,
      context: { operationId, id: payload.id },
    });
    try {
      await prisma.appMenuNode.delete({ where: { id: payload.id } });
      const data = { success: true };
      logOperation("success", {
        name: "AppsService.deleteMenuNode",
        startTimeMs,
        data,
        context: { operationId, id: payload.id },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "AppsService.deleteMenuNode",
        startTimeMs,
        err: error,
        context: { operationId, id: payload.id },
      });
      throw new InfrastructureError("Failed to delete menu node", error);
    }
  }

  async reorderMenuNode(
    payload: TReorderMenuNodeValidationSchema,
  ): Promise<{ success: boolean }> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "AppsService.reorderMenuNode",
      startTimeMs,
      context: {
        operationId,
        nodeId: payload.nodeId,
        direction: payload.direction,
      },
    });
    try {
      const current = await prisma.appMenuNode.findUniqueOrThrow({
        where: { id: payload.nodeId },
        select: { id: true, order: true, parentId: true, appId: true },
      });

      const sibling =
        payload.direction === "up"
          ? await prisma.appMenuNode.findFirst({
              where: {
                appId: current.appId,
                parentId: current.parentId,
                order: { lt: current.order },
              },
              orderBy: { order: "desc" },
            })
          : await prisma.appMenuNode.findFirst({
              where: {
                appId: current.appId,
                parentId: current.parentId,
                order: { gt: current.order },
              },
              orderBy: { order: "asc" },
            });

      if (!sibling) {
        logOperation("success", {
          name: "AppsService.reorderMenuNode",
          startTimeMs,
          data: { success: true },
          context: {
            operationId,
            nodeId: payload.nodeId,
            note: "boundary, no swap needed",
          },
        });
        return { success: true };
      }

      await prisma.$transaction([
        prisma.appMenuNode.update({
          where: { id: current.id },
          data: { order: sibling.order },
        }),
        prisma.appMenuNode.update({
          where: { id: sibling.id },
          data: { order: current.order },
        }),
      ]);

      const data = { success: true };
      logOperation("success", {
        name: "AppsService.reorderMenuNode",
        startTimeMs,
        data,
        context: { operationId, nodeId: payload.nodeId },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "AppsService.reorderMenuNode",
        startTimeMs,
        err: error,
        context: { operationId, nodeId: payload.nodeId },
      });
      throw new InfrastructureError("Failed to reorder menu node", error);
    }
  }

  // ------------------------------------------------------------------ //
  // ResourceAction operations (read-only — admin reference)
  // ------------------------------------------------------------------ //

  async listActions(): Promise<TListActionsResponseSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "AppsService.listActions",
      startTimeMs,
      context: { operationId },
    });

    try {
      const actions = await prisma.resourceAction.findMany({
        orderBy: [{ resourceId: "asc" }, { name: "asc" }],
      });

      const mapped = actions.map((a) => ({
        id: a.id,
        resourceId: a.resourceId,
        name: a.name,
        description: a.description,
        key: a.key,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      }));

      const data = await ListActionsResponseSchema.parseAsync({
        actions: mapped,
      });

      logOperation("success", {
        name: "AppsService.listActions",
        startTimeMs,
        data,
        context: { operationId },
      });

      return data;
    } catch (error) {
      logOperation("error", {
        name: "AppsService.listActions",
        startTimeMs,
        err: error,
        context: { operationId },
      });

      throw new InfrastructureError("Failed to list actions", error);
    }
  }
}
