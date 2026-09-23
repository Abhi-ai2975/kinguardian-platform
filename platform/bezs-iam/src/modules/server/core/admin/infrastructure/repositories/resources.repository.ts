/**
 * @module admin/resources.repository
 * @description Manages RBAC resources (like "patient", "appointment") and
 *              resource actions (like "patient:read", "appointment:create").
 *              These form the permission system that feeds the nav menu
 *              permission gates, org role permissions, and resource action lists.
 *              All operations use Prisma directly.
 * @category Infrastructure
 * @layer Infrastructure
 */

import { randomUUID } from "crypto";
import { prisma } from "../../../../../../../prisma/db";
import { IResourcesRepository } from "../../domain/interfaces/repositories/resources.repository.interface";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import { InfrastructureError } from "@/modules/server/shared/errors/infrastructureError";
import {
  ListResourcesResponseSchema,
  TListResourcesResponseSchema,
  ResourceSchema,
  TResourceSchema,
  TCreateResourceValidationSchema,
  TUpdateResourceValidationSchema,
  TDeleteResourceValidationSchema,
  ListResourceActionsResponseSchema,
  TListResourceActionsResponseSchema,
  ResourceActionSchema,
  TResourceActionSchema,
  TCreateResourceActionValidationSchema,
  TUpdateResourceActionValidationSchema,
  TDeleteResourceActionValidationSchema,
} from "@/modules/entities/schemas/admin/resources/resources.schema";

export class ResourcesRepository implements IResourcesRepository {
  // ------------------------------------------------------------------ //
  // Resource operations
  // ------------------------------------------------------------------ //

  /** List all resources alphabetically with their action counts. */
  async listResources(): Promise<TListResourcesResponseSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "ResourcesRepository.listResources",
      startTimeMs,
      context: { operationId },
    });

    try {
      const resources = await prisma.resource.findMany({
        include: { _count: { select: { resourceActions: true } } },
        orderBy: { name: "asc" },
      });

      const mapped = resources.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        actionsCount: r._count.resourceActions,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }));

      const data = await ListResourcesResponseSchema.parseAsync({
        resources: mapped,
      });

      logOperation("success", {
        name: "ResourcesRepository.listResources",
        startTimeMs,
        data,
        context: { operationId },
      });

      return data;
    } catch (error) {
      logOperation("error", {
        name: "ResourcesRepository.listResources",
        startTimeMs,
        err: error,
        context: { operationId },
      });

      throw new InfrastructureError("Failed to list resources", error);
    }
  }

  /** Create a resource (e.g. "patient", "observation"). */
  async createResource(
    payload: TCreateResourceValidationSchema,
  ): Promise<TResourceSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "ResourcesRepository.createResource",
      startTimeMs,
      context: { operationId },
    });

    try {
      const resource = await prisma.resource.create({
        data: {
          name: payload.name,
          description: payload.description ?? null,
        },
      });

      const data = await ResourceSchema.parseAsync({
        ...resource,
        actionsCount: 0,
      });

      logOperation("success", {
        name: "ResourcesRepository.createResource",
        startTimeMs,
        data,
        context: { operationId },
      });

      return data;
    } catch (error) {
      logOperation("error", {
        name: "ResourcesRepository.createResource",
        startTimeMs,
        err: error,
        context: { operationId },
      });

      throw new InfrastructureError("Failed to create resource", error);
    }
  }

  async updateResource(
    payload: TUpdateResourceValidationSchema,
  ): Promise<TResourceSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "ResourcesRepository.updateResource",
      startTimeMs,
      context: { operationId, id: payload.id },
    });

    try {
      const resource = await prisma.resource.update({
        where: { id: payload.id },
        data: {
          ...(payload.name && { name: payload.name }),
          ...(payload.description !== undefined && {
            description: payload.description,
          }),
        },
        include: { _count: { select: { resourceActions: true } } },
      });

      const data = await ResourceSchema.parseAsync({
        id: resource.id,
        name: resource.name,
        description: resource.description,
        actionsCount: resource._count.resourceActions,
        createdAt: resource.createdAt,
        updatedAt: resource.updatedAt,
      });

      logOperation("success", {
        name: "ResourcesRepository.updateResource",
        startTimeMs,
        data,
        context: { operationId, id: payload.id },
      });

      return data;
    } catch (error) {
      logOperation("error", {
        name: "ResourcesRepository.updateResource",
        startTimeMs,
        err: error,
        context: { operationId, id: payload.id },
      });

      throw new InfrastructureError("Failed to update resource", error);
    }
  }

  /** Delete a resource and cascade-delete all its actions. */
  async deleteResource(
    payload: TDeleteResourceValidationSchema,
  ): Promise<{ success: boolean }> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "ResourcesRepository.deleteResource",
      startTimeMs,
      context: { operationId, id: payload.id },
    });

    try {
      await prisma.resource.delete({ where: { id: payload.id } });
      const data = { success: true };

      logOperation("success", {
        name: "ResourcesRepository.deleteResource",
        startTimeMs,
        data,
        context: { operationId, id: payload.id },
      });

      return data;
    } catch (error) {
      logOperation("error", {
        name: "ResourcesRepository.deleteResource",
        startTimeMs,
        err: error,
        context: { operationId, id: payload.id },
      });

      throw new InfrastructureError("Failed to delete resource", error);
    }
  }

  // ------------------------------------------------------------------ //
  // ResourceAction operations
  // ------------------------------------------------------------------ //

  /** List all resource actions, optionally filtered by resource. */
  async listResourceActions(
    resourceId?: string,
  ): Promise<TListResourceActionsResponseSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "ResourcesRepository.listResourceActions",
      startTimeMs,
      context: { operationId, resourceId },
    });

    try {
      const actions = await prisma.resourceAction.findMany({
        where: resourceId ? { resourceId } : undefined,
        include: { resource: { select: { name: true } } },
        orderBy: [{ resourceId: "asc" }, { name: "asc" }],
      });

      const mapped = actions.map((a) => ({
        id: a.id,
        resourceId: a.resourceId,
        resourceName: a.resource.name,
        name: a.name,
        description: a.description,
        key: a.key,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      }));

      const data = await ListResourceActionsResponseSchema.parseAsync({
        actions: mapped,
      });

      logOperation("success", {
        name: "ResourcesRepository.listResourceActions",
        startTimeMs,
        data,
        context: { operationId, resourceId },
      });

      return data;
    } catch (error) {
      logOperation("error", {
        name: "ResourcesRepository.listResourceActions",
        startTimeMs,
        err: error,
        context: { operationId, resourceId },
      });

      throw new InfrastructureError("Failed to list resource actions", error);
    }
  }

  async createResourceAction(
    payload: TCreateResourceActionValidationSchema,
  ): Promise<TResourceActionSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "ResourcesRepository.createResourceAction",
      startTimeMs,
      context: { operationId, resourceId: payload.resourceId },
    });

    try {
      const action = await prisma.resourceAction.create({
        data: {
          resourceId: payload.resourceId,
          name: payload.name,
          description: payload.description ?? null,
          key: payload.key,
        },
        include: { resource: { select: { name: true } } },
      });

      const data = await ResourceActionSchema.parseAsync({
        id: action.id,
        resourceId: action.resourceId,
        resourceName: action.resource.name,
        name: action.name,
        description: action.description,
        key: action.key,
        createdAt: action.createdAt,
        updatedAt: action.updatedAt,
      });

      logOperation("success", {
        name: "ResourcesRepository.createResourceAction",
        startTimeMs,
        data,
        context: { operationId, resourceId: payload.resourceId },
      });

      return data;
    } catch (error) {
      logOperation("error", {
        name: "ResourcesRepository.createResourceAction",
        startTimeMs,
        err: error,
        context: { operationId, resourceId: payload.resourceId },
      });

      throw new InfrastructureError("Failed to create resource action", error);
    }
  }

  async updateResourceAction(
    payload: TUpdateResourceActionValidationSchema,
  ): Promise<TResourceActionSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "ResourcesRepository.updateResourceAction",
      startTimeMs,
      context: { operationId, id: payload.id },
    });

    try {
      const action = await prisma.resourceAction.update({
        where: { id: payload.id },
        data: {
          ...(payload.name && { name: payload.name }),
          ...(payload.description !== undefined && {
            description: payload.description,
          }),
          ...(payload.key && { key: payload.key }),
        },
        include: { resource: { select: { name: true } } },
      });

      const data = await ResourceActionSchema.parseAsync({
        id: action.id,
        resourceId: action.resourceId,
        resourceName: action.resource.name,
        name: action.name,
        description: action.description,
        key: action.key,
        createdAt: action.createdAt,
        updatedAt: action.updatedAt,
      });

      logOperation("success", {
        name: "ResourcesRepository.updateResourceAction",
        startTimeMs,
        data,
        context: { operationId, id: payload.id },
      });

      return data;
    } catch (error) {
      logOperation("error", {
        name: "ResourcesRepository.updateResourceAction",
        startTimeMs,
        err: error,
        context: { operationId, id: payload.id },
      });

      throw new InfrastructureError("Failed to update resource action", error);
    }
  }

  async deleteResourceAction(
    payload: TDeleteResourceActionValidationSchema,
  ): Promise<{ success: boolean }> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "ResourcesRepository.deleteResourceAction",
      startTimeMs,
      context: { operationId, id: payload.id },
    });

    try {
      await prisma.resourceAction.delete({ where: { id: payload.id } });
      const data = { success: true };

      logOperation("success", {
        name: "ResourcesRepository.deleteResourceAction",
        startTimeMs,
        data,
        context: { operationId, id: payload.id },
      });

      return data;
    } catch (error) {
      logOperation("error", {
        name: "ResourcesRepository.deleteResourceAction",
        startTimeMs,
        err: error,
        context: { operationId, id: payload.id },
      });

      throw new InfrastructureError("Failed to delete resource action", error);
    }
  }
}
