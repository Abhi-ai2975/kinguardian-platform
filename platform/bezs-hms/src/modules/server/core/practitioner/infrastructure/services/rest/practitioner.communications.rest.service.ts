/**
 * PractitionerCommunicationsRestService — communication language sub-resource operations.
 *
 * Layer: server / core / practitioner / infrastructure / services / rest
 *
 * Handles add / list / patch / delete against the fhir-gql
 * /practitioners/{practitionerId}/communications endpoint group.
 * Receives a pre-configured AxiosInstance from the shell.
 */

import { randomUUID } from "crypto";
import axios, { AxiosInstance } from "axios";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import {
  PractitionerCommunicationResponseSchema,
  PractitionerCommunicationListResponseSchema,
  type TPractitionerCommunicationResponse,
  type TPractitionerCommunicationListResponse,
} from "@/modules/entities/schemas/practitioner";
import {
  type TAddPractitionerCommunication,
  type TPatchPractitionerCommunicationDto,
} from "@/modules/entities/schemas/practitioner";
import { handlePractitionerApiError } from "./practitioner.rest.errors";

/**
 * Manages CRUD on the communications sub-resource of a Practitioner.
 * Instantiated and owned by PractitionerRestApiService shell.
 */
export class PractitionerCommunicationsRestService {
  constructor(private readonly client: AxiosInstance) {}

  /**
   * POST /practitioners/{practitionerId}/communications — adds a language preference.
   * @param practitionerId - Parent Practitioner id.
   * @param dto - Communication fields (language_code required).
   * @returns The created communication record.
   */
  async add(practitionerId: number, dto: TAddPractitionerCommunication): Promise<TPractitionerCommunicationResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PractitionerCommunicationsRestService.add", startTimeMs, context: { operationId, practitionerId } });
    try {
      const res = await this.client.post<unknown>(`/${practitionerId}/communications`, dto);
      const data = await PractitionerCommunicationResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "PractitionerCommunicationsRestService.add", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "PractitionerCommunicationsRestService.add", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handlePractitionerApiError(err);
      throw err;
    }
  }

  /**
   * GET /practitioners/{practitionerId}/communications — lists all language preferences.
   * @param practitionerId - Parent Practitioner id.
   * @returns List response.
   */
  async list(practitionerId: number): Promise<TPractitionerCommunicationListResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PractitionerCommunicationsRestService.list", startTimeMs, context: { operationId, practitionerId } });
    try {
      const res = await this.client.get<unknown>(`/${practitionerId}/communications`);
      const data = await PractitionerCommunicationListResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "PractitionerCommunicationsRestService.list", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "PractitionerCommunicationsRestService.list", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handlePractitionerApiError(err);
      throw err;
    }
  }

  /**
   * PATCH /practitioners/{practitionerId}/communications/{communicationId} — patches a language preference.
   * @param practitionerId - Parent Practitioner id.
   * @param communicationId - Communication record id.
   * @param dto - Fields to update.
   * @returns The updated communication record.
   */
  async patch(practitionerId: number, communicationId: number, dto: TPatchPractitionerCommunicationDto): Promise<TPractitionerCommunicationResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PractitionerCommunicationsRestService.patch", startTimeMs, context: { operationId, practitionerId, communicationId } });
    try {
      const res = await this.client.patch<unknown>(`/${practitionerId}/communications/${communicationId}`, dto);
      const data = await PractitionerCommunicationResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "PractitionerCommunicationsRestService.patch", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "PractitionerCommunicationsRestService.patch", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handlePractitionerApiError(err);
      throw err;
    }
  }

  /**
   * DELETE /practitioners/{practitionerId}/communications/{communicationId} — removes a language preference.
   * @param practitionerId - Parent Practitioner id.
   * @param communicationId - Communication record id.
   */
  async delete(practitionerId: number, communicationId: number): Promise<void> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PractitionerCommunicationsRestService.delete", startTimeMs, context: { operationId, practitionerId, communicationId } });
    try {
      await this.client.delete(`/${practitionerId}/communications/${communicationId}`);
      logOperation("success", { name: "PractitionerCommunicationsRestService.delete", startTimeMs, context: { operationId } });
    } catch (err) {
      logOperation("error", { name: "PractitionerCommunicationsRestService.delete", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handlePractitionerApiError(err);
      throw err;
    }
  }
}
