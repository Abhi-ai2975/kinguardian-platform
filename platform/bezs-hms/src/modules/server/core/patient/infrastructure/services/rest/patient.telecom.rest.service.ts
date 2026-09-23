/**
 * PatientTelecomRestService — /telecom sub-resource operations for Patient.
 *
 * Layer: infrastructure / services / rest
 * Resource: Patient (FHIR R4) — /patients/{patientId}/telecom
 *
 * Handles: add, list, patch, delete for ContactPoint sub-resources.
 * Receives a shared AxiosInstance from PatientRestApiService — does not create its own.
 */

import { randomUUID } from "crypto";
import axios, { AxiosInstance } from "axios";
import {
  PatientResponseSchema,
  PatientTelecomListSchema,
  type TPatientResponse,
  type TPatientTelecomList,
  type TAddPatientTelecom,
  type TPatchPatientTelecom,
} from "@/modules/entities/schemas/patient";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import { handlePatientApiError } from "./patient.rest.errors";

export class PatientTelecomRestService {
  constructor(private readonly client: AxiosInstance) {}

  /**
   * POST /patients/{patientId}/telecom — adds a ContactPoint to a Patient.
   *
   * @param patientId - The Patient primary key.
   * @param dto       - ContactPoint fields. `patient_id` is stripped before sending.
   * @returns The updated Patient record.
   */
  async add(patientId: number, dto: TAddPatientTelecom): Promise<TPatientResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PatientTelecomRestService.add", startTimeMs, context: { operationId, patientId } });
    try {
      const { patient_id: _pid, ...body } = dto;
      const res = await this.client.post<unknown>(`/patients/${patientId}/telecom`, body);
      const data = await PatientResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "PatientTelecomRestService.add", startTimeMs, context: { operationId, patientId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "PatientTelecomRestService.add", startTimeMs, err, context: { operationId, patientId } });
      if (axios.isAxiosError(err)) handlePatientApiError(err);
      throw err;
    }
  }

  /**
   * GET /patients/{patientId}/telecom — lists all ContactPoints for a Patient.
   *
   * @param patientId - The Patient primary key.
   * @returns List wrapper with total and data array.
   */
  async list(patientId: number): Promise<TPatientTelecomList> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PatientTelecomRestService.list", startTimeMs, context: { operationId, patientId } });
    try {
      const res = await this.client.get<unknown>(`/patients/${patientId}/telecom`);
      const data = await PatientTelecomListSchema.parseAsync(res.data);
      logOperation("success", { name: "PatientTelecomRestService.list", startTimeMs, context: { operationId, patientId, total: data.total } });
      return data;
    } catch (err) {
      logOperation("error", { name: "PatientTelecomRestService.list", startTimeMs, err, context: { operationId, patientId } });
      if (axios.isAxiosError(err)) handlePatientApiError(err);
      throw err;
    }
  }

  /**
   * PATCH /patients/{patientId}/telecom/{itemId} — updates a specific ContactPoint.
   *
   * @param patientId - The Patient primary key.
   * @param itemId    - The telecom sub-resource primary key.
   * @param dto       - Patchable fields. `patient_id` and `item_id` are stripped.
   * @returns The updated Patient record.
   */
  async patch(patientId: number, itemId: number, dto: TPatchPatientTelecom): Promise<TPatientResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PatientTelecomRestService.patch", startTimeMs, context: { operationId, patientId, itemId } });
    try {
      const { patient_id: _pid, item_id: _iid, ...body } = dto;
      const res = await this.client.patch<unknown>(`/patients/${patientId}/telecom/${itemId}`, body);
      const data = await PatientResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "PatientTelecomRestService.patch", startTimeMs, context: { operationId, patientId, itemId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "PatientTelecomRestService.patch", startTimeMs, err, context: { operationId, patientId, itemId } });
      if (axios.isAxiosError(err)) handlePatientApiError(err);
      throw err;
    }
  }

  /**
   * DELETE /patients/{patientId}/telecom/{itemId} — removes a specific ContactPoint.
   *
   * @param patientId - The Patient primary key.
   * @param itemId    - The telecom sub-resource primary key.
   */
  async delete(patientId: number, itemId: number): Promise<void> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PatientTelecomRestService.delete", startTimeMs, context: { operationId, patientId, itemId } });
    try {
      await this.client.delete(`/patients/${patientId}/telecom/${itemId}`);
      logOperation("success", { name: "PatientTelecomRestService.delete", startTimeMs, context: { operationId, patientId, itemId } });
    } catch (err) {
      logOperation("error", { name: "PatientTelecomRestService.delete", startTimeMs, err, context: { operationId, patientId, itemId } });
      if (axios.isAxiosError(err)) handlePatientApiError(err);
      throw err;
    }
  }
}
