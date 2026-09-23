/**
 * PractitionerRoleCoreRestService — HTTP calls for the PractitionerRole resource.
 *
 * Layer: server / core / practitioner-role / infrastructure / services / rest
 *
 * Handles all 6 operations (create, listForBooking, list, getById, update, delete)
 * against the fhir-gql /practitioner-roles endpoint. Receives a pre-configured
 * AxiosInstance from the shell (PractitionerRoleRestApiService) — no auth setup here.
 *
 * Unlike PractitionerCoreRestService, there are no sub-resource sub-services
 * because PractitionerRole embeds all child arrays in the single POST/GET.
 */

import { randomUUID } from "crypto";
import axios, { AxiosInstance } from "axios";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import {
  PractitionerRoleResponseSchema,
  PaginatedPractitionerRoleResponseSchema,
  PaginatedPractitionerRoleBookingResponseSchema,
  type TPractitionerRoleResponse,
  type TPaginatedPractitionerRoleResponse,
  type TPaginatedPractitionerRoleBookingResponse,
} from "@/modules/entities/schemas/practitioner-role";
import {
  type TCreatePractitionerRole,
  type TPractitionerRolePatchDto,
  type TListPractitionerRolesQuery,
  type TListPractitionerRolesForBookingQuery,
} from "@/modules/entities/schemas/practitioner-role";
import { handlePractitionerRoleApiError } from "./practitioner-role.rest.errors";

/**
 * Handles create / listForBooking / list / getById / update / delete HTTP calls.
 * Instantiated and owned by PractitionerRoleRestApiService shell.
 */
export class PractitionerRoleCoreRestService {
  constructor(private readonly client: AxiosInstance) {}

  /**
   * POST /practitioner-roles/ — creates a PractitionerRole with all inline child arrays.
   * @param dto - Creation payload including optional child arrays.
   * @returns The created PractitionerRole.
   */
  async create(
    dto: TCreatePractitionerRole,
  ): Promise<TPractitionerRoleResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "PractitionerRoleCoreRestService.create",
      startTimeMs,
      context: { operationId },
    });
    try {
      const res = await this.client.post<unknown>("/", dto);
      const data = await PractitionerRoleResponseSchema.parseAsync(res.data);
      logOperation("success", {
        name: "PractitionerRoleCoreRestService.create",
        startTimeMs,
        data,
        context: { operationId, practitionerRoleId: data.id },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "PractitionerRoleCoreRestService.create",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) handlePractitionerRoleApiError(err);
      throw err;
    }
  }

  /**
   * GET /practitioner-roles/ — lists PractitionerRoles with optional filters.
   * @param query - Optional filter and pagination params.
   * @returns Paginated list.
   */
  async list(
    query?: TListPractitionerRolesQuery,
  ): Promise<TPaginatedPractitionerRoleResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "PractitionerRoleCoreRestService.list",
      startTimeMs,
      context: { operationId },
    });
    try {
      const res = await this.client.get<unknown>("/", { params: query });
      const data = await PaginatedPractitionerRoleResponseSchema.parseAsync(
        res.data,
      );
      logOperation("success", {
        name: "PractitionerRoleCoreRestService.list",
        startTimeMs,
        data,
        context: { operationId },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "PractitionerRoleCoreRestService.list",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) handlePractitionerRoleApiError(err);
      throw err;
    }
  }

  /**
   * GET /practitioner-roles/booking — enriched list for booking UIs.
   * Returns PractitionerRoles with embedded Practitioner detail (name, photo, gender, qualifications).
   * @param query - Optional specialty/day_of_week/active filter params.
   * @returns Paginated booking-enriched list.
   */
  async listForBooking(
    query?: TListPractitionerRolesForBookingQuery,
  ): Promise<TPaginatedPractitionerRoleBookingResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "PractitionerRoleCoreRestService.listForBooking",
      startTimeMs,
      context: { operationId },
    });
    try {
      const res = await this.client.get<unknown>("/booking", { params: query });
      const data =
        await PaginatedPractitionerRoleBookingResponseSchema.parseAsync(
          res.data,
        );
      logOperation("success", {
        name: "PractitionerRoleCoreRestService.listForBooking",
        startTimeMs,
        data,
        context: { operationId },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "PractitionerRoleCoreRestService.listForBooking",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) handlePractitionerRoleApiError(err);
      throw err;
    }
  }

  /**
   * GET /practitioner-roles/{id} — fetches a single PractitionerRole by numeric ID.
   * @param id - PractitionerRole DB id.
   * @returns The PractitionerRole resource with all embedded child arrays.
   */
  async getById(id: number): Promise<TPractitionerRoleResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "PractitionerRoleCoreRestService.getById",
      startTimeMs,
      context: { operationId, id },
    });
    try {
      const res = await this.client.get<unknown>(`/${id}`);
      const data = await PractitionerRoleResponseSchema.parseAsync(res.data);
      logOperation("success", {
        name: "PractitionerRoleCoreRestService.getById",
        startTimeMs,
        data,
        context: { operationId },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "PractitionerRoleCoreRestService.getById",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) handlePractitionerRoleApiError(err);
      throw err;
    }
  }

  /**
   * PATCH /practitioner-roles/{id} — patches scalar fields on a PractitionerRole.
   * @param id - PractitionerRole DB id.
   * @param dto - Scalar fields to update (active, period_start, period_end, availability_exceptions).
   * @returns The updated PractitionerRole resource.
   */
  async update(
    id: number,
    dto: TPractitionerRolePatchDto,
  ): Promise<TPractitionerRoleResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "PractitionerRoleCoreRestService.update",
      startTimeMs,
      context: { operationId, id },
    });
    try {
      const res = await this.client.patch<unknown>(`/${id}`, dto);
      const data = await PractitionerRoleResponseSchema.parseAsync(res.data);
      logOperation("success", {
        name: "PractitionerRoleCoreRestService.update",
        startTimeMs,
        data,
        context: { operationId },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "PractitionerRoleCoreRestService.update",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) handlePractitionerRoleApiError(err);
      throw err;
    }
  }

  /**
   * DELETE /practitioner-roles/{id} — removes a PractitionerRole and all child records.
   * @param id - PractitionerRole DB id.
   */
  async delete(id: number): Promise<void> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "PractitionerRoleCoreRestService.delete",
      startTimeMs,
      context: { operationId, id },
    });
    try {
      await this.client.delete(`/${id}`);
      logOperation("success", {
        name: "PractitionerRoleCoreRestService.delete",
        startTimeMs,
        context: { operationId },
      });
    } catch (err) {
      logOperation("error", {
        name: "PractitionerRoleCoreRestService.delete",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) handlePractitionerRoleApiError(err);
      throw err;
    }
  }
}
