/**
 * PatientLinksRestService — /links sub-resource operations for Patient.
 *
 * Layer: infrastructure / services / rest
 * Resource: Patient (FHIR R4) — /patients/{patientId}/links
 *
 * Handles: add, list, patch, delete for Patient link sub-resources.
 * A link connects a Patient to another Patient or a RelatedPerson record.
 * Receives a shared AxiosInstance from PatientRestApiService — does not create its own.
 */

import { randomUUID } from "crypto";
import axios, { AxiosInstance } from "axios";
import {
  PatientResponseSchema,
  PatientLinksListSchema,
  type TPatientResponse,
  type TPatientLinksList,
  type TAddPatientLink,
  type TPatchPatientLink,
} from "@/modules/entities/schemas/patient";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import { handlePatientApiError } from "./patient.rest.errors";

export class PatientLinksRestService {
  constructor(private readonly client: AxiosInstance) {}

  /**
   * POST /patients/{patientId}/links — adds a link to a Patient.
   *
   * @param patientId - The Patient primary key.
   * @param dto       - Link fields. `patient_id` is stripped before sending.
   * @returns The updated Patient record.
   */
  async add(patientId: number, dto: TAddPatientLink): Promise<TPatientResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PatientLinksRestService.add", startTimeMs, context: { operationId, patientId } });
    try {
      const { patient_id: _pid, ...body } = dto;
      const res = await this.client.post<unknown>(`/patients/${patientId}/links`, body);
      const data = await PatientResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "PatientLinksRestService.add", startTimeMs, context: { operationId, patientId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "PatientLinksRestService.add", startTimeMs, err, context: { operationId, patientId } });
      if (axios.isAxiosError(err)) handlePatientApiError(err);
      throw err;
    }
  }

  /**
   * GET /patients/{patientId}/links — lists all links for a Patient.
   *
   * @param patientId - The Patient primary key.
   * @returns List wrapper with total and data array.
   */
  async list(patientId: number): Promise<TPatientLinksList> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PatientLinksRestService.list", startTimeMs, context: { operationId, patientId } });
    try {
      const res = await this.client.get<unknown>(`/patients/${patientId}/links`);
      const data = await PatientLinksListSchema.parseAsync(res.data);
      logOperation("success", { name: "PatientLinksRestService.list", startTimeMs, context: { operationId, patientId, total: data.total } });
      return data;
    } catch (err) {
      logOperation("error", { name: "PatientLinksRestService.list", startTimeMs, err, context: { operationId, patientId } });
      if (axios.isAxiosError(err)) handlePatientApiError(err);
      throw err;
    }
  }

  /**
   * PATCH /patients/{patientId}/links/{itemId} — updates a specific link.
   *
   * @param patientId - The Patient primary key.
   * @param itemId    - The link sub-resource primary key.
   * @param dto       - Patchable fields. `patient_id` and `item_id` are stripped.
   * @returns The updated Patient record.
   */
  async patch(patientId: number, itemId: number, dto: TPatchPatientLink): Promise<TPatientResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PatientLinksRestService.patch", startTimeMs, context: { operationId, patientId, itemId } });
    try {
      const { patient_id: _pid, item_id: _iid, ...body } = dto;
      const res = await this.client.patch<unknown>(`/patients/${patientId}/links/${itemId}`, body);
      const data = await PatientResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "PatientLinksRestService.patch", startTimeMs, context: { operationId, patientId, itemId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "PatientLinksRestService.patch", startTimeMs, err, context: { operationId, patientId, itemId } });
      if (axios.isAxiosError(err)) handlePatientApiError(err);
      throw err;
    }
  }

  /**
   * DELETE /patients/{patientId}/links/{itemId} — removes a specific link.
   *
   * @param patientId - The Patient primary key.
   * @param itemId    - The link sub-resource primary key.
   */
  async delete(patientId: number, itemId: number): Promise<void> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PatientLinksRestService.delete", startTimeMs, context: { operationId, patientId, itemId } });
    try {
      await this.client.delete(`/patients/${patientId}/links/${itemId}`);
      logOperation("success", { name: "PatientLinksRestService.delete", startTimeMs, context: { operationId, patientId, itemId } });
    } catch (err) {
      logOperation("error", { name: "PatientLinksRestService.delete", startTimeMs, err, context: { operationId, patientId, itemId } });
      if (axios.isAxiosError(err)) handlePatientApiError(err);
      throw err;
    }
  }
}
