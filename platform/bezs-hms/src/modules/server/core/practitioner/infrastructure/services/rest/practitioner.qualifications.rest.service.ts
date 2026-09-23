/**
 * PractitionerQualificationsRestService — Qualification sub-resource operations.
 *
 * Layer: server / core / practitioner / infrastructure / services / rest
 *
 * Handles add / list / patch / delete against the fhir-gql
 * /practitioners/{practitionerId}/qualifications endpoint group.
 * Receives a pre-configured AxiosInstance from the shell.
 *
 * Qualifications may carry nested identifier arrays (license numbers etc.).
 * On patch, the identifier array is a full replacement — send the complete set.
 */

import { randomUUID } from "crypto";
import axios, { AxiosInstance } from "axios";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import {
  PractitionerQualificationResponseSchema,
  PractitionerQualificationListResponseSchema,
  type TPractitionerQualificationResponse,
  type TPractitionerQualificationListResponse,
} from "@/modules/entities/schemas/practitioner";
import {
  type TAddPractitionerQualification,
  type TPatchPractitionerQualificationDto,
} from "@/modules/entities/schemas/practitioner";
import { handlePractitionerApiError } from "./practitioner.rest.errors";

/**
 * Manages CRUD on the qualifications sub-resource of a Practitioner.
 * Instantiated and owned by PractitionerRestApiService shell.
 */
export class PractitionerQualificationsRestService {
  constructor(private readonly client: AxiosInstance) {}

  /**
   * POST /practitioners/{practitionerId}/qualifications — adds a Qualification.
   * @param practitionerId - Parent Practitioner id.
   * @param dto - Qualification fields (code, status, issuer, optional nested identifiers).
   * @returns The created qualification record.
   */
  async add(practitionerId: number, dto: TAddPractitionerQualification): Promise<TPractitionerQualificationResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PractitionerQualificationsRestService.add", startTimeMs, context: { operationId, practitionerId } });
    try {
      const res = await this.client.post<unknown>(`/${practitionerId}/qualifications`, dto);
      const data = await PractitionerQualificationResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "PractitionerQualificationsRestService.add", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "PractitionerQualificationsRestService.add", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handlePractitionerApiError(err);
      throw err;
    }
  }

  /**
   * GET /practitioners/{practitionerId}/qualifications — lists all qualifications.
   * @param practitionerId - Parent Practitioner id.
   * @returns List response.
   */
  async list(practitionerId: number): Promise<TPractitionerQualificationListResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PractitionerQualificationsRestService.list", startTimeMs, context: { operationId, practitionerId } });
    try {
      const res = await this.client.get<unknown>(`/${practitionerId}/qualifications`);
      const data = await PractitionerQualificationListResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "PractitionerQualificationsRestService.list", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "PractitionerQualificationsRestService.list", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handlePractitionerApiError(err);
      throw err;
    }
  }

  /**
   * PATCH /practitioners/{practitionerId}/qualifications/{qualificationId} — patches a qualification.
   * @param practitionerId - Parent Practitioner id.
   * @param qualificationId - Qualification record id.
   * @param dto - Fields to update. Identifier array is fully replaced when provided.
   * @returns The updated qualification record.
   */
  async patch(practitionerId: number, qualificationId: number, dto: TPatchPractitionerQualificationDto): Promise<TPractitionerQualificationResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PractitionerQualificationsRestService.patch", startTimeMs, context: { operationId, practitionerId, qualificationId } });
    try {
      const res = await this.client.patch<unknown>(`/${practitionerId}/qualifications/${qualificationId}`, dto);
      const data = await PractitionerQualificationResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "PractitionerQualificationsRestService.patch", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "PractitionerQualificationsRestService.patch", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handlePractitionerApiError(err);
      throw err;
    }
  }

  /**
   * DELETE /practitioners/{practitionerId}/qualifications/{qualificationId} — removes a qualification.
   * @param practitionerId - Parent Practitioner id.
   * @param qualificationId - Qualification record id.
   */
  async delete(practitionerId: number, qualificationId: number): Promise<void> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PractitionerQualificationsRestService.delete", startTimeMs, context: { operationId, practitionerId, qualificationId } });
    try {
      await this.client.delete(`/${practitionerId}/qualifications/${qualificationId}`);
      logOperation("success", { name: "PractitionerQualificationsRestService.delete", startTimeMs, context: { operationId } });
    } catch (err) {
      logOperation("error", { name: "PractitionerQualificationsRestService.delete", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handlePractitionerApiError(err);
      throw err;
    }
  }
}
