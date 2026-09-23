/**
 * PractitionerCoreRestService — core CRUD operations for the Practitioner resource.
 *
 * Layer: server / core / practitioner / infrastructure / services / rest
 *
 * Handles create, list, getMe, getById, update, and delete against the fhir-gql
 * /practitioners endpoint. Receives a pre-configured AxiosInstance from the
 * shell (PractitionerRestApiService) — no auth setup here.
 */

import { randomUUID } from "crypto";
import axios, { AxiosInstance } from "axios";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import {
  PractitionerResponseSchema,
  PaginatedPractitionerResponseSchema,
  type TPractitionerResponse,
  type TPaginatedPractitionerResponse,
} from "@/modules/entities/schemas/practitioner";
import {
  type TCreatePractitioner,
  type TCreatePractitionerFull,
  type TPractitionerPatchDto,
  type TUpdatePractitionerFullDto,
  type TListPractitionersQuery,
} from "@/modules/entities/schemas/practitioner";
import { handlePractitionerApiError } from "./practitioner.rest.errors";

/**
 * Handles create / list / getMe / getById / update / delete HTTP calls.
 * Instantiated and owned by PractitionerRestApiService shell.
 */
export class PractitionerCoreRestService {
  constructor(private readonly client: AxiosInstance) {}

  /**
   * POST /practitioners/ — creates a new Practitioner.
   * @param dto - Creation payload.
   * @returns The created Practitioner.
   */
  async create(dto: TCreatePractitioner): Promise<TPractitionerResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "PractitionerCoreRestService.create",
      startTimeMs,
      context: { operationId },
    });
    try {
      const res = await this.client.post<unknown>("/", dto);
      const data = await PractitionerResponseSchema.parseAsync(res.data);
      logOperation("success", {
        name: "PractitionerCoreRestService.create",
        startTimeMs,
        data,
        context: { operationId },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "PractitionerCoreRestService.create",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) handlePractitionerApiError(err);
      throw err;
    }
  }

  /**
   * POST /practitioners/full — atomically creates a Practitioner with sub-resources.
   * Wraps everything in a single DB transaction on the fhir-gql server.
   *
   * @param dto - Validated full-create payload including optional sub-resource arrays.
   * @returns The created Practitioner record with all nested sub-resources.
   * @throws ValidationError | ConflictError | UnauthorizedError | BadGatewayError
   */
  async createFull(
    dto: TCreatePractitionerFull,
  ): Promise<TPractitionerResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "PractitionerCoreRestService.createFull",
      startTimeMs,
      context: { operationId },
    });
    try {
      const res = await this.client.post<unknown>("/full", dto);
      const data = await PractitionerResponseSchema.parseAsync(res.data);
      logOperation("success", {
        name: "PractitionerCoreRestService.createFull",
        startTimeMs,
        data,
        context: { operationId, practitionerId: data.id },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "PractitionerCoreRestService.createFull",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) handlePractitionerApiError(err);
      throw err;
    }
  }

  /**
   * PATCH /practitioners/{id}/full — atomically updates scalar fields and sub-resource arrays.
   * @param id - Practitioner DB id.
   * @param dto - Patchable scalar fields plus optional sub-resource replacement arrays.
   * @returns The updated Practitioner resource.
   */
  async updateFull(
    id: number,
    dto: TUpdatePractitionerFullDto,
  ): Promise<TPractitionerResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "PractitionerCoreRestService.updateFull",
      startTimeMs,
      context: { operationId, id },
    });
    try {
      const res = await this.client.patch<unknown>(`/${id}/full`, dto);
      const data = await PractitionerResponseSchema.parseAsync(res.data);
      logOperation("success", {
        name: "PractitionerCoreRestService.updateFull",
        startTimeMs,
        data,
        context: { operationId, id },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "PractitionerCoreRestService.updateFull",
        startTimeMs,
        err,
        context: { operationId, id },
      });
      if (axios.isAxiosError(err)) handlePractitionerApiError(err);
      throw err;
    }
  }

  /**
   * GET /practitioners/ — lists Practitioners with optional filters.
   * @param query - Optional filter and pagination params.
   * @returns Paginated list.
   */
  async list(
    query?: TListPractitionersQuery,
  ): Promise<TPaginatedPractitionerResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "PractitionerCoreRestService.list",
      startTimeMs,
      context: { operationId },
    });
    try {
      const res = await this.client.get<unknown>("/", { params: query });
      const data = await PaginatedPractitionerResponseSchema.parseAsync(
        res.data,
      );
      logOperation("success", {
        name: "PractitionerCoreRestService.list",
        startTimeMs,
        data,
        context: { operationId },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "PractitionerCoreRestService.list",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) handlePractitionerApiError(err);
      throw err;
    }
  }

  /**
   * GET /practitioners/me — resolves the caller's own Practitioner via JWT sub.
   * No userId needed; fhir-gql reads actor.sub from the Bearer token.
   * @returns The caller's Practitioner resource.
   * @throws NotFoundError when no Practitioner is linked to the caller's JWT.
   */
  async getMe(): Promise<TPractitionerResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "PractitionerCoreRestService.getMe",
      startTimeMs,
      context: { operationId },
    });
    try {
      const res = await this.client.get<unknown>("/me");
      const data = await PractitionerResponseSchema.parseAsync(res.data);
      logOperation("success", {
        name: "PractitionerCoreRestService.getMe",
        startTimeMs,
        data,
        context: { operationId },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "PractitionerCoreRestService.getMe",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) handlePractitionerApiError(err);
      throw err;
    }
  }

  /**
   * GET /practitioners/{id} — fetches a single Practitioner by numeric ID.
   * @param id - Practitioner DB id.
   * @returns The Practitioner resource.
   */
  async getById(id: number): Promise<TPractitionerResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "PractitionerCoreRestService.getById",
      startTimeMs,
      context: { operationId, id },
    });
    try {
      const res = await this.client.get<unknown>(`/${id}`);
      const data = await PractitionerResponseSchema.parseAsync(res.data);
      logOperation("success", {
        name: "PractitionerCoreRestService.getById",
        startTimeMs,
        data,
        context: { operationId },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "PractitionerCoreRestService.getById",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) handlePractitionerApiError(err);
      throw err;
    }
  }

  /**
   * PATCH /practitioners/{id} — patches scalar fields on a Practitioner.
   * @param id - Practitioner DB id.
   * @param dto - Fields to update.
   * @returns The updated Practitioner resource.
   */
  async update(
    id: number,
    dto: TPractitionerPatchDto,
  ): Promise<TPractitionerResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "PractitionerCoreRestService.update",
      startTimeMs,
      context: { operationId, id },
    });
    try {
      const res = await this.client.patch<unknown>(`/${id}`, dto);
      const data = await PractitionerResponseSchema.parseAsync(res.data);
      logOperation("success", {
        name: "PractitionerCoreRestService.update",
        startTimeMs,
        data,
        context: { operationId },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "PractitionerCoreRestService.update",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) handlePractitionerApiError(err);
      throw err;
    }
  }

  /**
   * DELETE /practitioners/{id} — removes a Practitioner and all sub-resources.
   * @param id - Practitioner DB id.
   */
  async delete(id: number): Promise<void> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "PractitionerCoreRestService.delete",
      startTimeMs,
      context: { operationId, id },
    });
    try {
      await this.client.delete(`/${id}`);
      logOperation("success", {
        name: "PractitionerCoreRestService.delete",
        startTimeMs,
        context: { operationId },
      });
    } catch (err) {
      logOperation("error", {
        name: "PractitionerCoreRestService.delete",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) handlePractitionerApiError(err);
      throw err;
    }
  }
}
