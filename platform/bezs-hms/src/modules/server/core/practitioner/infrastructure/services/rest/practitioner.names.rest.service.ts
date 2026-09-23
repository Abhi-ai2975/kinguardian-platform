/**
 * PractitionerNamesRestService — HumanName sub-resource operations.
 *
 * Layer: server / core / practitioner / infrastructure / services / rest
 *
 * Handles add / list / patch / delete against the fhir-gql
 * /practitioners/{practitionerId}/names endpoint group.
 * Receives a pre-configured AxiosInstance from the shell.
 */

import { randomUUID } from "crypto";
import axios, { AxiosInstance } from "axios";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import {
  PractitionerNameResponseSchema,
  PractitionerNameListResponseSchema,
  type TPractitionerNameResponse,
  type TPractitionerNameListResponse,
} from "@/modules/entities/schemas/practitioner";
import {
  type TAddPractitionerName,
  type TPatchPractitionerNameDto,
} from "@/modules/entities/schemas/practitioner";
import { handlePractitionerApiError } from "./practitioner.rest.errors";

/**
 * Manages CRUD on the names sub-resource of a Practitioner.
 * Instantiated and owned by PractitionerRestApiService shell.
 */
export class PractitionerNamesRestService {
  constructor(private readonly client: AxiosInstance) {}

  /**
   * POST /practitioners/{practitionerId}/names — adds a HumanName.
   * @param practitionerId - Parent Practitioner id.
   * @param dto - Name fields.
   * @returns The created name record.
   */
  async add(practitionerId: number, dto: TAddPractitionerName): Promise<TPractitionerNameResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PractitionerNamesRestService.add", startTimeMs, context: { operationId, practitionerId } });
    try {
      const res = await this.client.post<unknown>(`/${practitionerId}/names`, dto);
      const data = await PractitionerNameResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "PractitionerNamesRestService.add", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "PractitionerNamesRestService.add", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handlePractitionerApiError(err);
      throw err;
    }
  }

  /**
   * GET /practitioners/{practitionerId}/names — lists all names.
   * @param practitionerId - Parent Practitioner id.
   * @returns List response with data array and total count.
   */
  async list(practitionerId: number): Promise<TPractitionerNameListResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PractitionerNamesRestService.list", startTimeMs, context: { operationId, practitionerId } });
    try {
      const res = await this.client.get<unknown>(`/${practitionerId}/names`);
      const data = await PractitionerNameListResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "PractitionerNamesRestService.list", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "PractitionerNamesRestService.list", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handlePractitionerApiError(err);
      throw err;
    }
  }

  /**
   * PATCH /practitioners/{practitionerId}/names/{nameId} — patches a name.
   * @param practitionerId - Parent Practitioner id.
   * @param nameId - Name record id.
   * @param dto - Fields to update.
   * @returns The updated name record.
   */
  async patch(practitionerId: number, nameId: number, dto: TPatchPractitionerNameDto): Promise<TPractitionerNameResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PractitionerNamesRestService.patch", startTimeMs, context: { operationId, practitionerId, nameId } });
    try {
      const res = await this.client.patch<unknown>(`/${practitionerId}/names/${nameId}`, dto);
      const data = await PractitionerNameResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "PractitionerNamesRestService.patch", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "PractitionerNamesRestService.patch", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handlePractitionerApiError(err);
      throw err;
    }
  }

  /**
   * DELETE /practitioners/{practitionerId}/names/{nameId} — removes a name.
   * @param practitionerId - Parent Practitioner id.
   * @param nameId - Name record id.
   */
  async delete(practitionerId: number, nameId: number): Promise<void> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PractitionerNamesRestService.delete", startTimeMs, context: { operationId, practitionerId, nameId } });
    try {
      await this.client.delete(`/${practitionerId}/names/${nameId}`);
      logOperation("success", { name: "PractitionerNamesRestService.delete", startTimeMs, context: { operationId } });
    } catch (err) {
      logOperation("error", { name: "PractitionerNamesRestService.delete", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handlePractitionerApiError(err);
      throw err;
    }
  }
}
