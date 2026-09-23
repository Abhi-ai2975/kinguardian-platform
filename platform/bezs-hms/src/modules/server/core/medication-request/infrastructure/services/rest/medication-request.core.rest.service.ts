/**
 * MedicationRequestCoreRestService — HTTP calls for the MedicationRequest resource.
 *
 * Layer: server / core / medication-request / infrastructure / services / rest
 *
 * All 5 operations against fhir-gql /medication-requests. Receives a pre-configured
 * AxiosInstance from the shell (MedicationRequestRestApiService) — no auth setup here.
 */

import { randomUUID } from "crypto";
import axios, { AxiosInstance } from "axios";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import {
  MedicationRequestResponseSchema,
  PaginatedMedicationRequestResponseSchema,
  type TMedicationRequestResponse,
  type TPaginatedMedicationRequestResponse,
  type TCreateMedicationRequest,
  type TUpdateMedicationRequestDto,
  type TListMedicationRequestsQuery,
} from "@/modules/entities/schemas/medication-request";
import { handleMedicationRequestApiError } from "./medication-request.rest.errors";

/** Handles CRUD HTTP calls for MedicationRequest. Owned by MedicationRequestRestApiService shell. */
export class MedicationRequestCoreRestService {
  constructor(private readonly client: AxiosInstance) {}

  /**
   * POST /medication-requests/ — creates a MedicationRequest.
   * @param dto - status and intent are required.
   */
  async create(dto: TCreateMedicationRequest): Promise<TMedicationRequestResponse> {
    const startTimeMs = Date.now(); const operationId = randomUUID();
    logOperation("start", { name: "MedicationRequestCoreRestService.create", startTimeMs, context: { operationId } });
    try {
      const res = await this.client.post<unknown>("/", dto);
      const data = await MedicationRequestResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "MedicationRequestCoreRestService.create", startTimeMs, data, context: { operationId, id: data.id } });
      return data;
    } catch (err) {
      logOperation("error", { name: "MedicationRequestCoreRestService.create", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handleMedicationRequestApiError(err);
      throw err;
    }
  }

  /**
   * GET /medication-requests/ — paginated list with optional filters.
   * @param query - Optional filters.
   */
  async list(query?: TListMedicationRequestsQuery): Promise<TPaginatedMedicationRequestResponse> {
    const startTimeMs = Date.now(); const operationId = randomUUID();
    logOperation("start", { name: "MedicationRequestCoreRestService.list", startTimeMs, context: { operationId } });
    try {
      const res = await this.client.get<unknown>("/", { params: query });
      const data = await PaginatedMedicationRequestResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "MedicationRequestCoreRestService.list", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "MedicationRequestCoreRestService.list", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handleMedicationRequestApiError(err);
      throw err;
    }
  }

  /**
   * GET /medication-requests/{id} — single MedicationRequest by ID.
   * @param id - fhir-gql database ID.
   */
  async getById(id: number): Promise<TMedicationRequestResponse> {
    const startTimeMs = Date.now(); const operationId = randomUUID();
    logOperation("start", { name: "MedicationRequestCoreRestService.getById", startTimeMs, context: { operationId, id } });
    try {
      const res = await this.client.get<unknown>(`/${id}`);
      const data = await MedicationRequestResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "MedicationRequestCoreRestService.getById", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "MedicationRequestCoreRestService.getById", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handleMedicationRequestApiError(err);
      throw err;
    }
  }

  /**
   * PATCH /medication-requests/{id} — patches scalar fields.
   * @param id - fhir-gql database ID.
   * @param dto - Scalar patch payload.
   */
  async update(id: number, dto: TUpdateMedicationRequestDto): Promise<TMedicationRequestResponse> {
    const startTimeMs = Date.now(); const operationId = randomUUID();
    logOperation("start", { name: "MedicationRequestCoreRestService.update", startTimeMs, context: { operationId, id } });
    try {
      const res = await this.client.patch<unknown>(`/${id}`, dto);
      const data = await MedicationRequestResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "MedicationRequestCoreRestService.update", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "MedicationRequestCoreRestService.update", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handleMedicationRequestApiError(err);
      throw err;
    }
  }

  /**
   * DELETE /medication-requests/{id} — permanently removes a MedicationRequest.
   * @param id - fhir-gql database ID.
   */
  async delete(id: number): Promise<void> {
    const startTimeMs = Date.now(); const operationId = randomUUID();
    logOperation("start", { name: "MedicationRequestCoreRestService.delete", startTimeMs, context: { operationId, id } });
    try {
      await this.client.delete(`/${id}`);
      logOperation("success", { name: "MedicationRequestCoreRestService.delete", startTimeMs, context: { operationId } });
    } catch (err) {
      logOperation("error", { name: "MedicationRequestCoreRestService.delete", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handleMedicationRequestApiError(err);
      throw err;
    }
  }
}
