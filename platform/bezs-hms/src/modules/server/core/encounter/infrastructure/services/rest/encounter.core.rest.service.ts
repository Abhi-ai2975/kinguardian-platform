/**
 * EncounterCoreRestService — HTTP calls for the Encounter resource.
 *
 * Layer: server / core / encounter / infrastructure / services / rest
 *
 * Handles all 5 operations (create, list, getById, update, delete) against the
 * fhir-gql /encounters endpoint. Receives a pre-configured AxiosInstance from the
 * shell (EncounterRestApiService) — no auth setup here.
 */

import { randomUUID } from "crypto";
import axios, { AxiosInstance } from "axios";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import {
  EncounterResponseSchema,
  PaginatedEncounterResponseSchema,
  type TEncounterResponse,
  type TPaginatedEncounterResponse,
} from "@/modules/entities/schemas/encounter";
import {
  type TCreateEncounter,
  type TUpdateEncounterDto,
  type TListEncountersQuery,
} from "@/modules/entities/schemas/encounter";
import { handleEncounterApiError } from "./encounter.rest.errors";

/**
 * Handles create / list / getById / update / delete HTTP calls for Encounters.
 * Instantiated and owned by EncounterRestApiService shell.
 */
export class EncounterCoreRestService {
  constructor(private readonly client: AxiosInstance) {}

  /**
   * POST /encounters/ — creates an Encounter with all optional child arrays.
   * @param dto - Creation payload. status (1..1) is the only required field.
   * @returns The created Encounter resource.
   */
  async create(dto: TCreateEncounter): Promise<TEncounterResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "EncounterCoreRestService.create",
      startTimeMs,
      context: { operationId },
    });
    try {
      const res = await this.client.post<unknown>("/", dto);
      const data = await EncounterResponseSchema.parseAsync(res.data);
      logOperation("success", {
        name: "EncounterCoreRestService.create",
        startTimeMs,
        data,
        context: { operationId, encounterId: data.id },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "EncounterCoreRestService.create",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) handleEncounterApiError(err);
      throw err;
    }
  }

  /**
   * GET /encounters/ — lists Encounters with optional filters and pagination.
   * @param query - Optional filters (status, patient_id, appointment_id, date range, limit, offset).
   * @returns Paginated encounter list.
   */
  async list(query?: TListEncountersQuery): Promise<TPaginatedEncounterResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "EncounterCoreRestService.list",
      startTimeMs,
      context: { operationId },
    });
    try {
      const res = await this.client.get<unknown>("/", { params: query });
      const data = await PaginatedEncounterResponseSchema.parseAsync(res.data);
      logOperation("success", {
        name: "EncounterCoreRestService.list",
        startTimeMs,
        data,
        context: { operationId },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "EncounterCoreRestService.list",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) handleEncounterApiError(err);
      throw err;
    }
  }

  /**
   * GET /encounters/{id} — fetches a single Encounter by numeric ID.
   * @param id - Encounter DB id.
   * @returns The Encounter resource with all embedded child arrays.
   */
  async getById(id: number): Promise<TEncounterResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "EncounterCoreRestService.getById",
      startTimeMs,
      context: { operationId, id },
    });
    try {
      const res = await this.client.get<unknown>(`/${id}`);
      const data = await EncounterResponseSchema.parseAsync(res.data);
      logOperation("success", {
        name: "EncounterCoreRestService.getById",
        startTimeMs,
        data,
        context: { operationId },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "EncounterCoreRestService.getById",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) handleEncounterApiError(err);
      throw err;
    }
  }

  /**
   * PATCH /encounters/{id} — patches scalar fields on an Encounter.
   * @param id - Encounter DB id.
   * @param dto - Scalar fields to update (status, actual_period_end, priority_*, subject_status_*, planned_end_date).
   * @returns The updated Encounter resource.
   */
  async update(id: number, dto: TUpdateEncounterDto): Promise<TEncounterResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "EncounterCoreRestService.update",
      startTimeMs,
      context: { operationId, id },
    });
    try {
      const res = await this.client.patch<unknown>(`/${id}`, dto);
      const data = await EncounterResponseSchema.parseAsync(res.data);
      logOperation("success", {
        name: "EncounterCoreRestService.update",
        startTimeMs,
        data,
        context: { operationId },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "EncounterCoreRestService.update",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) handleEncounterApiError(err);
      throw err;
    }
  }

  /**
   * DELETE /encounters/{id} — removes an Encounter and all its child records (cascade).
   * @param id - Encounter DB id.
   */
  async delete(id: number): Promise<void> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "EncounterCoreRestService.delete",
      startTimeMs,
      context: { operationId, id },
    });
    try {
      await this.client.delete(`/${id}`);
      logOperation("success", {
        name: "EncounterCoreRestService.delete",
        startTimeMs,
        context: { operationId },
      });
    } catch (err) {
      logOperation("error", {
        name: "EncounterCoreRestService.delete",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) handleEncounterApiError(err);
      throw err;
    }
  }
}
