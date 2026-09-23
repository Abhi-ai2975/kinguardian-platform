/**
 * PractitionerIdentifiersRestService — business identifier sub-resource operations.
 *
 * Layer: server / core / practitioner / infrastructure / services / rest
 *
 * Handles add / list / patch / delete against the fhir-gql
 * /practitioners/{practitionerId}/identifiers endpoint group.
 * Receives a pre-configured AxiosInstance from the shell.
 */

import { randomUUID } from "crypto";
import axios, { AxiosInstance } from "axios";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import {
  PractitionerIdentifierResponseSchema,
  PractitionerIdentifierListResponseSchema,
  type TPractitionerIdentifierResponse,
  type TPractitionerIdentifierListResponse,
} from "@/modules/entities/schemas/practitioner";
import {
  type TAddPractitionerIdentifier,
  type TPatchPractitionerIdentifierDto,
} from "@/modules/entities/schemas/practitioner";
import { handlePractitionerApiError } from "./practitioner.rest.errors";

/**
 * Manages CRUD on the identifiers sub-resource of a Practitioner.
 * Instantiated and owned by PractitionerRestApiService shell.
 */
export class PractitionerIdentifiersRestService {
  constructor(private readonly client: AxiosInstance) {}

  /**
   * POST /practitioners/{practitionerId}/identifiers — adds an identifier (NPI, DEA, etc.).
   * @param practitionerId - Parent Practitioner id.
   * @param dto - Identifier fields.
   * @returns The created identifier record.
   */
  async add(practitionerId: number, dto: TAddPractitionerIdentifier): Promise<TPractitionerIdentifierResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PractitionerIdentifiersRestService.add", startTimeMs, context: { operationId, practitionerId } });
    try {
      const res = await this.client.post<unknown>(`/${practitionerId}/identifiers`, dto);
      const data = await PractitionerIdentifierResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "PractitionerIdentifiersRestService.add", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "PractitionerIdentifiersRestService.add", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handlePractitionerApiError(err);
      throw err;
    }
  }

  /**
   * GET /practitioners/{practitionerId}/identifiers — lists all identifiers.
   * @param practitionerId - Parent Practitioner id.
   * @returns List response.
   */
  async list(practitionerId: number): Promise<TPractitionerIdentifierListResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PractitionerIdentifiersRestService.list", startTimeMs, context: { operationId, practitionerId } });
    try {
      const res = await this.client.get<unknown>(`/${practitionerId}/identifiers`);
      const data = await PractitionerIdentifierListResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "PractitionerIdentifiersRestService.list", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "PractitionerIdentifiersRestService.list", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handlePractitionerApiError(err);
      throw err;
    }
  }

  /**
   * PATCH /practitioners/{practitionerId}/identifiers/{identifierId} — patches an identifier.
   * @param practitionerId - Parent Practitioner id.
   * @param identifierId - Identifier record id.
   * @param dto - Fields to update.
   * @returns The updated identifier record.
   */
  async patch(practitionerId: number, identifierId: number, dto: TPatchPractitionerIdentifierDto): Promise<TPractitionerIdentifierResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PractitionerIdentifiersRestService.patch", startTimeMs, context: { operationId, practitionerId, identifierId } });
    try {
      const res = await this.client.patch<unknown>(`/${practitionerId}/identifiers/${identifierId}`, dto);
      const data = await PractitionerIdentifierResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "PractitionerIdentifiersRestService.patch", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "PractitionerIdentifiersRestService.patch", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handlePractitionerApiError(err);
      throw err;
    }
  }

  /**
   * DELETE /practitioners/{practitionerId}/identifiers/{identifierId} — removes an identifier.
   * @param practitionerId - Parent Practitioner id.
   * @param identifierId - Identifier record id.
   */
  async delete(practitionerId: number, identifierId: number): Promise<void> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PractitionerIdentifiersRestService.delete", startTimeMs, context: { operationId, practitionerId, identifierId } });
    try {
      await this.client.delete(`/${practitionerId}/identifiers/${identifierId}`);
      logOperation("success", { name: "PractitionerIdentifiersRestService.delete", startTimeMs, context: { operationId } });
    } catch (err) {
      logOperation("error", { name: "PractitionerIdentifiersRestService.delete", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handlePractitionerApiError(err);
      throw err;
    }
  }
}
