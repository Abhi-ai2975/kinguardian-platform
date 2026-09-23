/**
 * ObservationCoreRestService — HTTP calls for the Observation resource.
 *
 * Layer: server / core / observation / infrastructure / services / rest
 *
 * All 5 operations against fhir-gql /observations. Receives a pre-configured
 * AxiosInstance from the shell (ObservationRestApiService) — no auth setup here.
 */

import { randomUUID } from "crypto";
import axios, { AxiosInstance } from "axios";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import {
  ObservationResponseSchema,
  PaginatedObservationResponseSchema,
  type TObservationResponse,
  type TPaginatedObservationResponse,
  type TCreateObservation,
  type TUpdateObservationDto,
  type TListObservationsQuery,
} from "@/modules/entities/schemas/observation";
import { handleObservationApiError } from "./observation.rest.errors";

/** Handles CRUD HTTP calls for Observation. Owned by ObservationRestApiService shell. */
export class ObservationCoreRestService {
  constructor(private readonly client: AxiosInstance) {}

  /**
   * POST /observations/ — creates an Observation.
   * @param dto - status is required (1..1).
   */
  async create(dto: TCreateObservation): Promise<TObservationResponse> {
    const startTimeMs = Date.now(); const operationId = randomUUID();
    logOperation("start", { name: "ObservationCoreRestService.create", startTimeMs, context: { operationId } });
    try {
      const res = await this.client.post<unknown>("/", dto);
      const data = await ObservationResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "ObservationCoreRestService.create", startTimeMs, data, context: { operationId, id: data.id } });
      return data;
    } catch (err) {
      logOperation("error", { name: "ObservationCoreRestService.create", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handleObservationApiError(err);
      throw err;
    }
  }

  /**
   * GET /observations/ — paginated list with optional filters.
   * @param query - Optional filters.
   */
  async list(query?: TListObservationsQuery): Promise<TPaginatedObservationResponse> {
    const startTimeMs = Date.now(); const operationId = randomUUID();
    logOperation("start", { name: "ObservationCoreRestService.list", startTimeMs, context: { operationId } });
    try {
      const res = await this.client.get<unknown>("/", { params: query });
      const data = await PaginatedObservationResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "ObservationCoreRestService.list", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "ObservationCoreRestService.list", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handleObservationApiError(err);
      throw err;
    }
  }

  /**
   * GET /observations/{id} — single Observation by ID.
   * @param id - fhir-gql database ID.
   */
  async getById(id: number): Promise<TObservationResponse> {
    const startTimeMs = Date.now(); const operationId = randomUUID();
    logOperation("start", { name: "ObservationCoreRestService.getById", startTimeMs, context: { operationId, id } });
    try {
      const res = await this.client.get<unknown>(`/${id}`);
      const data = await ObservationResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "ObservationCoreRestService.getById", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "ObservationCoreRestService.getById", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handleObservationApiError(err);
      throw err;
    }
  }

  /**
   * PATCH /observations/{id} — patches scalar fields.
   * @param id - fhir-gql database ID.
   * @param dto - Scalar patch payload.
   */
  async update(id: number, dto: TUpdateObservationDto): Promise<TObservationResponse> {
    const startTimeMs = Date.now(); const operationId = randomUUID();
    logOperation("start", { name: "ObservationCoreRestService.update", startTimeMs, context: { operationId, id } });
    try {
      const res = await this.client.patch<unknown>(`/${id}`, dto);
      const data = await ObservationResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "ObservationCoreRestService.update", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "ObservationCoreRestService.update", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handleObservationApiError(err);
      throw err;
    }
  }

  /**
   * DELETE /observations/{id} — permanently removes an Observation.
   * @param id - fhir-gql database ID.
   */
  async delete(id: number): Promise<void> {
    const startTimeMs = Date.now(); const operationId = randomUUID();
    logOperation("start", { name: "ObservationCoreRestService.delete", startTimeMs, context: { operationId, id } });
    try {
      await this.client.delete(`/${id}`);
      logOperation("success", { name: "ObservationCoreRestService.delete", startTimeMs, context: { operationId } });
    } catch (err) {
      logOperation("error", { name: "ObservationCoreRestService.delete", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handleObservationApiError(err);
      throw err;
    }
  }
}
