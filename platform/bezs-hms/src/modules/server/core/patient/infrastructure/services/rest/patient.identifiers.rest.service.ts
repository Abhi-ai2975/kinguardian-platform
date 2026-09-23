/**
 * PatientIdentifiersRestService — /identifiers sub-resource operations for Patient.
 *
 * Layer: infrastructure / services / rest
 * Resource: Patient (FHIR R4) — /patients/{patientId}/identifiers
 *
 * Handles: add, list, patch, delete for Identifier sub-resources.
 * Receives a shared AxiosInstance from PatientRestApiService — does not create its own.
 */

import { randomUUID } from "crypto";
import axios, { AxiosInstance } from "axios";
import {
  PatientResponseSchema,
  PatientIdentifiersListSchema,
  type TPatientResponse,
  type TPatientIdentifiersList,
  type TAddPatientIdentifier,
  type TPatchPatientIdentifier,
} from "@/modules/entities/schemas/patient";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import { handlePatientApiError } from "./patient.rest.errors";

export class PatientIdentifiersRestService {
  constructor(private readonly client: AxiosInstance) {}

  /**
   * POST /patients/{patientId}/identifiers — adds an Identifier to a Patient.
   *
   * @param patientId - The Patient primary key.
   * @param dto       - Identifier fields. `patient_id` is stripped before sending.
   * @returns The updated Patient record.
   */
  async add(patientId: number, dto: TAddPatientIdentifier): Promise<TPatientResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PatientIdentifiersRestService.add", startTimeMs, context: { operationId, patientId } });
    try {
      const { patient_id: _pid, ...body } = dto;
      const res = await this.client.post<unknown>(`/patients/${patientId}/identifiers`, body);
      const data = await PatientResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "PatientIdentifiersRestService.add", startTimeMs, context: { operationId, patientId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "PatientIdentifiersRestService.add", startTimeMs, err, context: { operationId, patientId } });
      if (axios.isAxiosError(err)) handlePatientApiError(err);
      throw err;
    }
  }

  /**
   * GET /patients/{patientId}/identifiers — lists all Identifiers for a Patient.
   *
   * @param patientId - The Patient primary key.
   * @returns List wrapper with total and data array.
   */
  async list(patientId: number): Promise<TPatientIdentifiersList> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PatientIdentifiersRestService.list", startTimeMs, context: { operationId, patientId } });
    try {
      const res = await this.client.get<unknown>(`/patients/${patientId}/identifiers`);
      const data = await PatientIdentifiersListSchema.parseAsync(res.data);
      logOperation("success", { name: "PatientIdentifiersRestService.list", startTimeMs, context: { operationId, patientId, total: data.total } });
      return data;
    } catch (err) {
      logOperation("error", { name: "PatientIdentifiersRestService.list", startTimeMs, err, context: { operationId, patientId } });
      if (axios.isAxiosError(err)) handlePatientApiError(err);
      throw err;
    }
  }

  /**
   * PATCH /patients/{patientId}/identifiers/{itemId} — updates a specific Identifier.
   *
   * @param patientId - The Patient primary key.
   * @param itemId    - The identifier sub-resource primary key.
   * @param dto       - Patchable fields. `patient_id` and `item_id` are stripped.
   * @returns The updated Patient record.
   */
  async patch(patientId: number, itemId: number, dto: TPatchPatientIdentifier): Promise<TPatientResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PatientIdentifiersRestService.patch", startTimeMs, context: { operationId, patientId, itemId } });
    try {
      const { patient_id: _pid, item_id: _iid, ...body } = dto;
      const res = await this.client.patch<unknown>(`/patients/${patientId}/identifiers/${itemId}`, body);
      const data = await PatientResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "PatientIdentifiersRestService.patch", startTimeMs, context: { operationId, patientId, itemId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "PatientIdentifiersRestService.patch", startTimeMs, err, context: { operationId, patientId, itemId } });
      if (axios.isAxiosError(err)) handlePatientApiError(err);
      throw err;
    }
  }

  /**
   * DELETE /patients/{patientId}/identifiers/{itemId} — removes a specific Identifier.
   *
   * @param patientId - The Patient primary key.
   * @param itemId    - The identifier sub-resource primary key.
   */
  async delete(patientId: number, itemId: number): Promise<void> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "PatientIdentifiersRestService.delete", startTimeMs, context: { operationId, patientId, itemId } });
    try {
      await this.client.delete(`/patients/${patientId}/identifiers/${itemId}`);
      logOperation("success", { name: "PatientIdentifiersRestService.delete", startTimeMs, context: { operationId, patientId, itemId } });
    } catch (err) {
      logOperation("error", { name: "PatientIdentifiersRestService.delete", startTimeMs, err, context: { operationId, patientId, itemId } });
      if (axios.isAxiosError(err)) handlePatientApiError(err);
      throw err;
    }
  }
}
