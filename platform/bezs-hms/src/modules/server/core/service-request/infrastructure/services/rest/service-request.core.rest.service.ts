/**
 * ServiceRequestCoreRestService — HTTP calls for the ServiceRequest resource.
 *
 * Layer: server / core / service-request / infrastructure / services / rest
 *
 * All 5 operations against fhir-gql /service-requests. Receives a pre-configured
 * AxiosInstance from the shell (ServiceRequestRestApiService) — no auth setup here.
 */

import { randomUUID } from "crypto";
import axios, { AxiosInstance } from "axios";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import {
  ServiceRequestResponseSchema,
  PaginatedServiceRequestResponseSchema,
  type TServiceRequestResponse,
  type TPaginatedServiceRequestResponse,
  type TCreateServiceRequest,
  type TUpdateServiceRequestDto,
  type TListServiceRequestsQuery,
} from "@/modules/entities/schemas/service-request";
import { handleServiceRequestApiError } from "./service-request.rest.errors";

/** Handles CRUD HTTP calls for ServiceRequest. Owned by ServiceRequestRestApiService shell. */
export class ServiceRequestCoreRestService {
  constructor(private readonly client: AxiosInstance) {}

  /**
   * POST /service-requests/ — creates a ServiceRequest.
   * @param dto - status and intent are required.
   */
  async create(dto: TCreateServiceRequest): Promise<TServiceRequestResponse> {
    const startTimeMs = Date.now(); const operationId = randomUUID();
    logOperation("start", { name: "ServiceRequestCoreRestService.create", startTimeMs, context: { operationId } });
    try {
      const res = await this.client.post<unknown>("/", dto);
      const data = await ServiceRequestResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "ServiceRequestCoreRestService.create", startTimeMs, data, context: { operationId, id: data.id } });
      return data;
    } catch (err) {
      logOperation("error", { name: "ServiceRequestCoreRestService.create", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handleServiceRequestApiError(err);
      throw err;
    }
  }

  /**
   * GET /service-requests/ — paginated list with optional filters.
   * @param query - Optional filters.
   */
  async list(query?: TListServiceRequestsQuery): Promise<TPaginatedServiceRequestResponse> {
    const startTimeMs = Date.now(); const operationId = randomUUID();
    logOperation("start", { name: "ServiceRequestCoreRestService.list", startTimeMs, context: { operationId } });
    try {
      const res = await this.client.get<unknown>("/", { params: query });
      const data = await PaginatedServiceRequestResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "ServiceRequestCoreRestService.list", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "ServiceRequestCoreRestService.list", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handleServiceRequestApiError(err);
      throw err;
    }
  }

  /**
   * GET /service-requests/{id} — single ServiceRequest by ID.
   * @param id - fhir-gql database ID.
   */
  async getById(id: number): Promise<TServiceRequestResponse> {
    const startTimeMs = Date.now(); const operationId = randomUUID();
    logOperation("start", { name: "ServiceRequestCoreRestService.getById", startTimeMs, context: { operationId, id } });
    try {
      const res = await this.client.get<unknown>(`/${id}`);
      const data = await ServiceRequestResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "ServiceRequestCoreRestService.getById", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "ServiceRequestCoreRestService.getById", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handleServiceRequestApiError(err);
      throw err;
    }
  }

  /**
   * PATCH /service-requests/{id} — patches scalar fields.
   * @param id - fhir-gql database ID.
   * @param dto - Scalar patch payload.
   */
  async update(id: number, dto: TUpdateServiceRequestDto): Promise<TServiceRequestResponse> {
    const startTimeMs = Date.now(); const operationId = randomUUID();
    logOperation("start", { name: "ServiceRequestCoreRestService.update", startTimeMs, context: { operationId, id } });
    try {
      const res = await this.client.patch<unknown>(`/${id}`, dto);
      const data = await ServiceRequestResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "ServiceRequestCoreRestService.update", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "ServiceRequestCoreRestService.update", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handleServiceRequestApiError(err);
      throw err;
    }
  }

  /**
   * DELETE /service-requests/{id} — permanently removes a ServiceRequest.
   * @param id - fhir-gql database ID.
   */
  async delete(id: number): Promise<void> {
    const startTimeMs = Date.now(); const operationId = randomUUID();
    logOperation("start", { name: "ServiceRequestCoreRestService.delete", startTimeMs, context: { operationId, id } });
    try {
      await this.client.delete(`/${id}`);
      logOperation("success", { name: "ServiceRequestCoreRestService.delete", startTimeMs, context: { operationId } });
    } catch (err) {
      logOperation("error", { name: "ServiceRequestCoreRestService.delete", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handleServiceRequestApiError(err);
      throw err;
    }
  }
}
