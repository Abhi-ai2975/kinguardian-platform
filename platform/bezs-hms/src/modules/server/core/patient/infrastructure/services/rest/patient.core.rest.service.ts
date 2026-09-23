/**
 * PatientCoreRestService — core CRUD operations for the Patient resource.
 *
 * Layer: infrastructure / services / rest
 * Resource: Patient (FHIR R4) — core operations
 *
 * Handles: create, list, getMe, getById, update, delete.
 * Receives a shared AxiosInstance from PatientRestApiService — does not create its own.
 */

import { randomUUID } from "crypto";
import axios, { AxiosInstance } from "axios";
import {
  PatientResponseSchema,
  PaginatedPatientResponseSchema,
  type TPatientResponse,
  type TPaginatedPatientResponse,
  type TCreatePatient,
  type TCreatePatientFull,
  type TListPatientsQuery,
  type TUpdatePatientDto,
  type TUpdatePatientFullDto,
} from "@/modules/entities/schemas/patient";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import { handlePatientApiError } from "./patient.rest.errors";

export class PatientCoreRestService {
  constructor(private readonly client: AxiosInstance) {}

  /**
   * POST /patients/ — creates a new Patient resource.
   *
   * @param dto - Validated create payload.
   * @returns The newly created Patient record.
   * @throws ValidationError | ConflictError | UnauthorizedError | BadGatewayError
   */
  async create(dto: TCreatePatient): Promise<TPatientResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "PatientCoreRestService.create",
      startTimeMs,
      context: { operationId },
    });
    try {
      const res = await this.client.post<unknown>("/patients/", dto);
      const data = await PatientResponseSchema.parseAsync(res.data);
      logOperation("success", {
        name: "PatientCoreRestService.create",
        startTimeMs,
        data,
        context: { operationId, patientId: data.id },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "PatientCoreRestService.create",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) handlePatientApiError(err);
      throw err;
    }
  }

  /**
   * POST /patients/full — atomically creates a Patient with its sub-resources.
   * Wraps everything in a single DB transaction on the fhir-gql server.
   *
   * @param dto - Validated full-create payload including optional sub-resource arrays.
   * @returns The created Patient record with all nested sub-resources.
   * @throws ValidationError | ConflictError | UnauthorizedError | BadGatewayError
   */
  async createFull(dto: TCreatePatientFull): Promise<TPatientResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "PatientCoreRestService.createFull",
      startTimeMs,
      context: { operationId },
    });
    try {
      const res = await this.client.post<unknown>("/patients/full", dto);
      const data = await PatientResponseSchema.parseAsync(res.data);
      logOperation("success", {
        name: "PatientCoreRestService.createFull",
        startTimeMs,
        data,
        context: { operationId, patientId: data.id },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "PatientCoreRestService.createFull",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) handlePatientApiError(err);
      throw err;
    }
  }

  /**
   * PATCH /patients/{id}/full — atomically updates scalar fields and sub-resource arrays.
   *
   * @param id  - The Patient primary key.
   * @param dto - Patchable scalar fields plus optional sub-resource replacement arrays.
   * @returns The updated Patient record.
   * @throws ValidationError | NotFoundError | UnauthorizedError | BadGatewayError
   */
  async updateFull(
    id: number,
    dto: TUpdatePatientFullDto,
  ): Promise<TPatientResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "PatientCoreRestService.updateFull",
      startTimeMs,
      context: { operationId, patientId: id },
    });
    try {
      const res = await this.client.patch<unknown>(`/patients/${id}/full`, dto);
      const data = await PatientResponseSchema.parseAsync(res.data);
      logOperation("success", {
        name: "PatientCoreRestService.updateFull",
        startTimeMs,
        data,
        context: { operationId, patientId: id },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "PatientCoreRestService.updateFull",
        startTimeMs,
        err,
        context: { operationId, patientId: id },
      });
      if (axios.isAxiosError(err)) handlePatientApiError(err);
      throw err;
    }
  }

  /**
   * GET /patients/ — paginated list with optional filters.
   *
   * @param query - Optional filters: family_name, given_name, gender, active, user_id, org_id, limit, offset.
   * @returns Paginated result.
   * @throws UnauthorizedError | BadGatewayError
   */
  async list(query?: TListPatientsQuery): Promise<TPaginatedPatientResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "PatientCoreRestService.list",
      startTimeMs,
      context: { operationId, ...query },
    });
    try {
      const res = await this.client.get<unknown>("/patients/", {
        params: {
          family_name: query?.family_name,
          given_name: query?.given_name,
          gender: query?.gender,
          active: query?.active,
          user_id: query?.user_id,
          org_id: query?.org_id,
          limit: query?.limit ?? 50,
          offset: query?.offset ?? 0,
        },
      });
      const data = await PaginatedPatientResponseSchema.parseAsync(res.data);
      logOperation("success", {
        name: "PatientCoreRestService.list",
        startTimeMs,
        context: { operationId, total: data.total },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "PatientCoreRestService.list",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) handlePatientApiError(err);
      throw err;
    }
  }

  /**
   * GET /patients/me — returns the authenticated caller's own Patient record.
   *
   * @returns The caller's Patient record.
   * @throws NotFoundError | UnauthorizedError | BadGatewayError
   */
  async getMe(): Promise<TPatientResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "PatientCoreRestService.getMe",
      startTimeMs,
      context: { operationId },
    });
    try {
      const res = await this.client.get<unknown>("/patients/me");
      const data = await PatientResponseSchema.parseAsync(res.data);
      logOperation("success", {
        name: "PatientCoreRestService.getMe",
        startTimeMs,
        data,
        context: { operationId, patientId: data.id },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "PatientCoreRestService.getMe",
        startTimeMs,
        err,
        context: { operationId },
      });
      if (axios.isAxiosError(err)) handlePatientApiError(err);
      throw err;
    }
  }

  /**
   * GET /patients/{id} — fetches a single Patient by primary key.
   *
   * @param id - The Patient primary key.
   * @returns The Patient record.
   * @throws NotFoundError | UnauthorizedError | BadGatewayError
   */
  async getById(id: number): Promise<TPatientResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "PatientCoreRestService.getById",
      startTimeMs,
      context: { operationId, patientId: id },
    });
    try {
      const res = await this.client.get<unknown>(`/patients/${id}`);
      const data = await PatientResponseSchema.parseAsync(res.data);
      logOperation("success", {
        name: "PatientCoreRestService.getById",
        startTimeMs,
        data,
        context: { operationId, patientId: id },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "PatientCoreRestService.getById",
        startTimeMs,
        err,
        context: { operationId, patientId: id },
      });
      if (axios.isAxiosError(err)) handlePatientApiError(err);
      throw err;
    }
  }

  /**
   * PATCH /patients/{id} — partial update of scalar fields.
   *
   * @param id  - The Patient primary key.
   * @param dto - Patchable fields.
   * @returns The updated Patient record.
   * @throws ValidationError | NotFoundError | UnauthorizedError | BadGatewayError
   */
  async update(id: number, dto: TUpdatePatientDto): Promise<TPatientResponse> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "PatientCoreRestService.update",
      startTimeMs,
      context: { operationId, patientId: id },
    });
    try {
      const res = await this.client.patch<unknown>(`/patients/${id}`, dto);
      const data = await PatientResponseSchema.parseAsync(res.data);
      logOperation("success", {
        name: "PatientCoreRestService.update",
        startTimeMs,
        data,
        context: { operationId, patientId: id },
      });
      return data;
    } catch (err) {
      logOperation("error", {
        name: "PatientCoreRestService.update",
        startTimeMs,
        err,
        context: { operationId, patientId: id },
      });
      if (axios.isAxiosError(err)) handlePatientApiError(err);
      throw err;
    }
  }

  /**
   * DELETE /patients/{id} — permanently removes a Patient and all child records.
   *
   * @param id - The Patient primary key.
   * @throws NotFoundError | UnauthorizedError | BadGatewayError
   */
  async delete(id: number): Promise<void> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "PatientCoreRestService.delete",
      startTimeMs,
      context: { operationId, patientId: id },
    });
    try {
      await this.client.delete(`/patients/${id}`);
      logOperation("success", {
        name: "PatientCoreRestService.delete",
        startTimeMs,
        context: { operationId, patientId: id },
      });
    } catch (err) {
      logOperation("error", {
        name: "PatientCoreRestService.delete",
        startTimeMs,
        err,
        context: { operationId, patientId: id },
      });
      if (axios.isAxiosError(err)) handlePatientApiError(err);
      throw err;
    }
  }
}
