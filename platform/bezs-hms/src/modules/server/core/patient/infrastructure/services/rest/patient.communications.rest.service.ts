/**
 * PatientCommunicationsRestService — /communications sub-resource operations for Patient.
 *
 * Layer: infrastructure / services / rest
 * Resource: Patient (FHIR R4) — /patients/{patientId}/communications
 *
 * Handles: add, list, patch, delete for language preference sub-resources.
 * Receives a shared AxiosInstance from PatientRestApiService — does not create its own.
 */

import { randomUUID } from "crypto";
import axios, { AxiosInstance } from "axios";
import {
  PatientResponseSchema,
  PatientCommunicationsListSchema,
  type TPatientResponse,
  type TPatientCommunicationsList,
  type TAddPatientCommunication,
  type TPatchPatientCommunication,
} from "@/modules/entities/schemas/patient";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import { handlePatientApiError } from "./patient.rest.errors";

export class PatientCommunicationsRestService {
  constructor(private readonly client: AxiosInstance) {}

  /**
   * POST /patients/{patientId}/communications — adds a language preference to a Patient.
   *
   * @param patientId - The Patient primary key.
   * @param dto       - Communication fields. `patient_id` is stripped before sending.
   * @returns The updated Patient record.
   */
  async add(patientId: number, dto: TAddPatientCommunication): Promise<TPatientResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PatientCommunicationsRestService.add", startTimeMs, context: { operationId, patientId } });
    try {
      const { patient_id: _pid, ...body } = dto;
      const res = await this.client.post<unknown>(`/patients/${patientId}/communications`, body);
      const data = await PatientResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "PatientCommunicationsRestService.add", startTimeMs, context: { operationId, patientId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "PatientCommunicationsRestService.add", startTimeMs, err, context: { operationId, patientId } });
      if (axios.isAxiosError(err)) handlePatientApiError(err);
      throw err;
    }
  }

  /**
   * GET /patients/{patientId}/communications — lists all language preferences for a Patient.
   *
   * @param patientId - The Patient primary key.
   * @returns List wrapper with total and data array.
   */
  async list(patientId: number): Promise<TPatientCommunicationsList> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PatientCommunicationsRestService.list", startTimeMs, context: { operationId, patientId } });
    try {
      const res = await this.client.get<unknown>(`/patients/${patientId}/communications`);
      const data = await PatientCommunicationsListSchema.parseAsync(res.data);
      logOperation("success", { name: "PatientCommunicationsRestService.list", startTimeMs, context: { operationId, patientId, total: data.total } });
      return data;
    } catch (err) {
      logOperation("error", { name: "PatientCommunicationsRestService.list", startTimeMs, err, context: { operationId, patientId } });
      if (axios.isAxiosError(err)) handlePatientApiError(err);
      throw err;
    }
  }

  /**
   * PATCH /patients/{patientId}/communications/{itemId} — updates a specific language preference.
   *
   * @param patientId - The Patient primary key.
   * @param itemId    - The communication sub-resource primary key.
   * @param dto       - Patchable fields. `patient_id` and `item_id` are stripped.
   * @returns The updated Patient record.
   */
  async patch(patientId: number, itemId: number, dto: TPatchPatientCommunication): Promise<TPatientResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PatientCommunicationsRestService.patch", startTimeMs, context: { operationId, patientId, itemId } });
    try {
      const { patient_id: _pid, item_id: _iid, ...body } = dto;
      const res = await this.client.patch<unknown>(`/patients/${patientId}/communications/${itemId}`, body);
      const data = await PatientResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "PatientCommunicationsRestService.patch", startTimeMs, context: { operationId, patientId, itemId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "PatientCommunicationsRestService.patch", startTimeMs, err, context: { operationId, patientId, itemId } });
      if (axios.isAxiosError(err)) handlePatientApiError(err);
      throw err;
    }
  }

  /**
   * DELETE /patients/{patientId}/communications/{itemId} — removes a specific language preference.
   *
   * @param patientId - The Patient primary key.
   * @param itemId    - The communication sub-resource primary key.
   */
  async delete(patientId: number, itemId: number): Promise<void> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PatientCommunicationsRestService.delete", startTimeMs, context: { operationId, patientId, itemId } });
    try {
      await this.client.delete(`/patients/${patientId}/communications/${itemId}`);
      logOperation("success", { name: "PatientCommunicationsRestService.delete", startTimeMs, context: { operationId, patientId, itemId } });
    } catch (err) {
      logOperation("error", { name: "PatientCommunicationsRestService.delete", startTimeMs, err, context: { operationId, patientId, itemId } });
      if (axios.isAxiosError(err)) handlePatientApiError(err);
      throw err;
    }
  }
}
