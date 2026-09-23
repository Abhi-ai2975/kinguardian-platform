import { randomUUID } from "crypto";
import { prisma } from "../../../../../../../prisma/db";
import { IResourcesService } from "../../domain/interfaces/resources.service.interface";
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

export class ResourcesService implements IResourcesService {
  // ------------------------------------------------------------------ //
  // Resource operations
  // ------------------------------------------------------------------ //

  async listResources(): Promise<TListResourcesResponseSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "ResourcesService.listResources",
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
        name: "ResourcesService.listResources",
        startTimeMs,
        data,
        context: { operationId },
      });

      return data;
    } catch (error) {
      logOperation("error", {
        name: "ResourcesService.listResources",
        startTimeMs,
        err: error,
        context: { operationId },
      });

      throw new InfrastructureError("Failed to list resources", error);
    }
  }

  async createResource(
    payload: TCreateResourceValidationSchema,
  ): Promise<TResourceSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "ResourcesService.createResource",
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
        name: "ResourcesService.createResource",
        startTimeMs,
        data,
        context: { operationId },
      });

      return data;
    } catch (error) {
      logOperation("error", {
        name: "ResourcesService.createResource",
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
      name: "ResourcesService.updateResource",
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
        name: "ResourcesService.updateResource",
        startTimeMs,
        data,
        context: { operationId, id: payload.id },
      });

      return data;
    } catch (error) {
      logOperation("error", {
        name: "ResourcesService.updateResource",
        startTimeMs,
        err: error,
        context: { operationId, id: payload.id },
      });

      throw new InfrastructureError("Failed to update resource", error);
    }
  }

  async deleteResource(
    payload: TDeleteResourceValidationSchema,
  ): Promise<{ success: boolean }> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "ResourcesService.deleteResource",
      startTimeMs,
      context: { operationId, id: payload.id },
    });

    try {
      await prisma.resource.delete({ where: { id: payload.id } });
      const data = { success: true };

      logOperation("success", {
        name: "ResourcesService.deleteResource",
        startTimeMs,
        data,
        context: { operationId, id: payload.id },
      });

      return data;
    } catch (error) {
      logOperation("error", {
        name: "ResourcesService.deleteResource",
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

  async listResourceActions(
    resourceId?: string,
  ): Promise<TListResourceActionsResponseSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "ResourcesService.listResourceActions",
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
        name: "ResourcesService.listResourceActions",
        startTimeMs,
        data,
        context: { operationId, resourceId },
      });

      return data;
    } catch (error) {
      logOperation("error", {
        name: "ResourcesService.listResourceActions",
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
      name: "ResourcesService.createResourceAction",
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
        name: "ResourcesService.createResourceAction",
        startTimeMs,
        data,
        context: { operationId, resourceId: payload.resourceId },
      });

      return data;
    } catch (error) {
      logOperation("error", {
        name: "ResourcesService.createResourceAction",
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
      name: "ResourcesService.updateResourceAction",
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
        name: "ResourcesService.updateResourceAction",
        startTimeMs,
        data,
        context: { operationId, id: payload.id },
      });

      return data;
    } catch (error) {
      logOperation("error", {
        name: "ResourcesService.updateResourceAction",
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
      name: "ResourcesService.deleteResourceAction",
      startTimeMs,
      context: { operationId, id: payload.id },
    });

    try {
      await prisma.resourceAction.delete({ where: { id: payload.id } });
      const data = { success: true };

      logOperation("success", {
        name: "ResourcesService.deleteResourceAction",
        startTimeMs,
        data,
        context: { operationId, id: payload.id },
      });

      return data;
    } catch (error) {
      logOperation("error", {
        name: "ResourcesService.deleteResourceAction",
        startTimeMs,
        err: error,
        context: { operationId, id: payload.id },
      });

      throw new InfrastructureError("Failed to delete resource action", error);
    }
  }
}
