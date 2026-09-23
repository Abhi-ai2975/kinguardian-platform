/**
 * ConditionCoreRestService — HTTP calls for the Condition resource.
 *
 * Layer: server / core / condition / infrastructure / services / rest
 *
 * All 5 operations against fhir-gql /conditions. Receives a pre-configured
 * AxiosInstance from the shell (ConditionRestApiService) — no auth setup here.
 */

import { randomUUID } from "crypto";
import axios, { AxiosInstance } from "axios";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import {
  ConditionResponseSchema,
  PaginatedConditionResponseSchema,
  type TConditionResponse,
  type TPaginatedConditionResponse,
  type TCreateCondition,
  type TUpdateConditionDto,
  type TListConditionsQuery,
} from "@/modules/entities/schemas/condition";
import { handleConditionApiError } from "./condition.rest.errors";

/** Handles CRUD HTTP calls for Condition. Owned by ConditionRestApiService shell. */
export class ConditionCoreRestService {
  constructor(private readonly client: AxiosInstance) {}

  /**
   * POST /conditions/ — creates a Condition.
   * @param dto - All fields optional; minimum viable: subject + code_code.
   */
  async create(dto: TCreateCondition): Promise<TConditionResponse> {
    const startTimeMs = Date.now(); const operationId = randomUUID();
    logOperation("start", { name: "ConditionCoreRestService.create", startTimeMs, context: { operationId } });
    try {
      const res = await this.client.post<unknown>("/", dto);
      const data = await ConditionResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "ConditionCoreRestService.create", startTimeMs, data, context: { operationId, id: data.id } });
      return data;
    } catch (err) {
      logOperation("error", { name: "ConditionCoreRestService.create", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handleConditionApiError(err);
      throw err;
    }
  }

  /**
   * GET /conditions/ — paginated list with optional filters.
   * @param query - Optional filters.
   */
  async list(query?: TListConditionsQuery): Promise<TPaginatedConditionResponse> {
    const startTimeMs = Date.now(); const operationId = randomUUID();
    logOperation("start", { name: "ConditionCoreRestService.list", startTimeMs, context: { operationId } });
    try {
      const res = await this.client.get<unknown>("/", { params: query });
      const data = await PaginatedConditionResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "ConditionCoreRestService.list", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "ConditionCoreRestService.list", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handleConditionApiError(err);
      throw err;
    }
  }

  /**
   * GET /conditions/{id} — single Condition by ID.
   * @param id - fhir-gql database ID.
   */
  async getById(id: number): Promise<TConditionResponse> {
    const startTimeMs = Date.now(); const operationId = randomUUID();
    logOperation("start", { name: "ConditionCoreRestService.getById", startTimeMs, context: { operationId, id } });
    try {
      const res = await this.client.get<unknown>(`/${id}`);
      const data = await ConditionResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "ConditionCoreRestService.getById", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "ConditionCoreRestService.getById", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handleConditionApiError(err);
      throw err;
    }
  }

  /**
   * PATCH /conditions/{id} — patches scalar fields.
   * @param id - fhir-gql database ID.
   * @param dto - Scalar patch payload.
   */
  async update(id: number, dto: TUpdateConditionDto): Promise<TConditionResponse> {
    const startTimeMs = Date.now(); const operationId = randomUUID();
    logOperation("start", { name: "ConditionCoreRestService.update", startTimeMs, context: { operationId, id } });
    try {
      const res = await this.client.patch<unknown>(`/${id}`, dto);
      const data = await ConditionResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "ConditionCoreRestService.update", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "ConditionCoreRestService.update", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handleConditionApiError(err);
      throw err;
    }
  }

  /**
   * DELETE /conditions/{id} — permanently removes a Condition.
   * @param id - fhir-gql database ID.
   */
  async delete(id: number): Promise<void> {
    const startTimeMs = Date.now(); const operationId = randomUUID();
    logOperation("start", { name: "ConditionCoreRestService.delete", startTimeMs, context: { operationId, id } });
    try {
      await this.client.delete(`/${id}`);
      logOperation("success", { name: "ConditionCoreRestService.delete", startTimeMs, context: { operationId } });
    } catch (err) {
      logOperation("error", { name: "ConditionCoreRestService.delete", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handleConditionApiError(err);
      throw err;
    }
  }
}
