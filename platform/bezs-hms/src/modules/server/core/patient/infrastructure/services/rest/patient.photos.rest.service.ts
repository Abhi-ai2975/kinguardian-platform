/**
 * PatientPhotosRestService — /photos sub-resource operations for Patient.
 *
 * Layer: infrastructure / services / rest
 * Resource: Patient (FHIR R4) — /patients/{patientId}/photos
 *
 * Handles: add, list, patch, delete for photo Attachment sub-resources.
 * Receives a shared AxiosInstance from PatientRestApiService — does not create its own.
 */

import { randomUUID } from "crypto";
import axios, { AxiosInstance } from "axios";
import {
  PatientResponseSchema,
  PatientPhotosListSchema,
  type TPatientResponse,
  type TPatientPhotosList,
  type TAddPatientPhoto,
  type TPatchPatientPhoto,
} from "@/modules/entities/schemas/patient";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import { handlePatientApiError } from "./patient.rest.errors";

export class PatientPhotosRestService {
  constructor(private readonly client: AxiosInstance) {}

  /**
   * POST /patients/{patientId}/photos — adds a photo Attachment to a Patient.
   *
   * @param patientId - The Patient primary key.
   * @param dto       - Attachment fields. `patient_id` is stripped before sending.
   * @returns The updated Patient record.
   */
  async add(patientId: number, dto: TAddPatientPhoto): Promise<TPatientResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PatientPhotosRestService.add", startTimeMs, context: { operationId, patientId } });
    try {
      const { patient_id: _pid, ...body } = dto;
      const res = await this.client.post<unknown>(`/patients/${patientId}/photos`, body);
      const data = await PatientResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "PatientPhotosRestService.add", startTimeMs, context: { operationId, patientId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "PatientPhotosRestService.add", startTimeMs, err, context: { operationId, patientId } });
      if (axios.isAxiosError(err)) handlePatientApiError(err);
      throw err;
    }
  }

  /**
   * GET /patients/{patientId}/photos — lists all photo Attachments for a Patient.
   *
   * @param patientId - The Patient primary key.
   * @returns List wrapper with total and data array.
   */
  async list(patientId: number): Promise<TPatientPhotosList> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PatientPhotosRestService.list", startTimeMs, context: { operationId, patientId } });
    try {
      const res = await this.client.get<unknown>(`/patients/${patientId}/photos`);
      const data = await PatientPhotosListSchema.parseAsync(res.data);
      logOperation("success", { name: "PatientPhotosRestService.list", startTimeMs, context: { operationId, patientId, total: data.total } });
      return data;
    } catch (err) {
      logOperation("error", { name: "PatientPhotosRestService.list", startTimeMs, err, context: { operationId, patientId } });
      if (axios.isAxiosError(err)) handlePatientApiError(err);
      throw err;
    }
  }

  /**
   * PATCH /patients/{patientId}/photos/{itemId} — updates a specific photo Attachment.
   *
   * @param patientId - The Patient primary key.
   * @param itemId    - The photo sub-resource primary key.
   * @param dto       - Patchable fields. `patient_id` and `item_id` are stripped.
   * @returns The updated Patient record.
   */
  async patch(patientId: number, itemId: number, dto: TPatchPatientPhoto): Promise<TPatientResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PatientPhotosRestService.patch", startTimeMs, context: { operationId, patientId, itemId } });
    try {
      const { patient_id: _pid, item_id: _iid, ...body } = dto;
      const res = await this.client.patch<unknown>(`/patients/${patientId}/photos/${itemId}`, body);
      const data = await PatientResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "PatientPhotosRestService.patch", startTimeMs, context: { operationId, patientId, itemId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "PatientPhotosRestService.patch", startTimeMs, err, context: { operationId, patientId, itemId } });
      if (axios.isAxiosError(err)) handlePatientApiError(err);
      throw err;
    }
  }

  /**
   * DELETE /patients/{patientId}/photos/{itemId} — removes a specific photo Attachment.
   *
   * @param patientId - The Patient primary key.
   * @param itemId    - The photo sub-resource primary key.
   */
  async delete(patientId: number, itemId: number): Promise<void> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PatientPhotosRestService.delete", startTimeMs, context: { operationId, patientId, itemId } });
    try {
      await this.client.delete(`/patients/${patientId}/photos/${itemId}`);
      logOperation("success", { name: "PatientPhotosRestService.delete", startTimeMs, context: { operationId, patientId, itemId } });
    } catch (err) {
      logOperation("error", { name: "PatientPhotosRestService.delete", startTimeMs, err, context: { operationId, patientId, itemId } });
      if (axios.isAxiosError(err)) handlePatientApiError(err);
      throw err;
    }
  }
}
