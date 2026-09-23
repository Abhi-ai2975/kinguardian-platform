/**
 * PractitionerTelecomRestService — ContactPoint sub-resource operations.
 *
 * Layer: server / core / practitioner / infrastructure / services / rest
 *
 * Handles add / list / patch / delete against the fhir-gql
 * /practitioners/{practitionerId}/telecom endpoint group.
 * Receives a pre-configured AxiosInstance from the shell.
 */

import { randomUUID } from "crypto";
import axios, { AxiosInstance } from "axios";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import {
  PractitionerTelecomResponseSchema,
  PractitionerTelecomListResponseSchema,
  type TPractitionerTelecomResponse,
  type TPractitionerTelecomListResponse,
} from "@/modules/entities/schemas/practitioner";
import {
  type TAddPractitionerTelecom,
  type TPatchPractitionerTelecomDto,
} from "@/modules/entities/schemas/practitioner";
import { handlePractitionerApiError } from "./practitioner.rest.errors";

/**
 * Manages CRUD on the telecom sub-resource of a Practitioner.
 * Instantiated and owned by PractitionerRestApiService shell.
 */
export class PractitionerTelecomRestService {
  constructor(private readonly client: AxiosInstance) {}

  /**
   * POST /practitioners/{practitionerId}/telecom — adds a ContactPoint.
   * @param practitionerId - Parent Practitioner id.
   * @param dto - Telecom fields (system and value are required).
   * @returns The created telecom record.
   */
  async add(practitionerId: number, dto: TAddPractitionerTelecom): Promise<TPractitionerTelecomResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PractitionerTelecomRestService.add", startTimeMs, context: { operationId, practitionerId } });
    try {
      const res = await this.client.post<unknown>(`/${practitionerId}/telecom`, dto);
      const data = await PractitionerTelecomResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "PractitionerTelecomRestService.add", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "PractitionerTelecomRestService.add", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handlePractitionerApiError(err);
      throw err;
    }
  }

  /**
   * GET /practitioners/{practitionerId}/telecom — lists all ContactPoints.
   * @param practitionerId - Parent Practitioner id.
   * @returns List response.
   */
  async list(practitionerId: number): Promise<TPractitionerTelecomListResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PractitionerTelecomRestService.list", startTimeMs, context: { operationId, practitionerId } });
    try {
      const res = await this.client.get<unknown>(`/${practitionerId}/telecom`);
      const data = await PractitionerTelecomListResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "PractitionerTelecomRestService.list", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "PractitionerTelecomRestService.list", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handlePractitionerApiError(err);
      throw err;
    }
  }

  /**
   * PATCH /practitioners/{practitionerId}/telecom/{telecomId} — patches a ContactPoint.
   * @param practitionerId - Parent Practitioner id.
   * @param telecomId - Telecom record id.
   * @param dto - Fields to update.
   * @returns The updated telecom record.
   */
  async patch(practitionerId: number, telecomId: number, dto: TPatchPractitionerTelecomDto): Promise<TPractitionerTelecomResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PractitionerTelecomRestService.patch", startTimeMs, context: { operationId, practitionerId, telecomId } });
    try {
      const res = await this.client.patch<unknown>(`/${practitionerId}/telecom/${telecomId}`, dto);
      const data = await PractitionerTelecomResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "PractitionerTelecomRestService.patch", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "PractitionerTelecomRestService.patch", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handlePractitionerApiError(err);
      throw err;
    }
  }

  /**
   * DELETE /practitioners/{practitionerId}/telecom/{telecomId} — removes a ContactPoint.
   * @param practitionerId - Parent Practitioner id.
   * @param telecomId - Telecom record id.
   */
  async delete(practitionerId: number, telecomId: number): Promise<void> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PractitionerTelecomRestService.delete", startTimeMs, context: { operationId, practitionerId, telecomId } });
    try {
      await this.client.delete(`/${practitionerId}/telecom/${telecomId}`);
      logOperation("success", { name: "PractitionerTelecomRestService.delete", startTimeMs, context: { operationId } });
    } catch (err) {
      logOperation("error", { name: "PractitionerTelecomRestService.delete", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handlePractitionerApiError(err);
      throw err;
    }
  }
}
