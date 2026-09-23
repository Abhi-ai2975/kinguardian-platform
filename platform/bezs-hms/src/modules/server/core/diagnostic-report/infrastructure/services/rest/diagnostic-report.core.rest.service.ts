/**
 * DiagnosticReport core REST service.
 * Layer: server / core / diagnostic-report / infrastructure
 * Owns the raw HTTP calls and response validation. No auth or URL config here —
 * those belong in DiagnosticReportRestApiService which creates the Axios instance.
 */
import { randomUUID } from "crypto";
import axios, { AxiosInstance } from "axios";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import {
  DiagnosticReportResponseSchema,
  PaginatedDiagnosticReportResponseSchema,
  type TDiagnosticReportResponse,
  type TPaginatedDiagnosticReportResponse,
  type TCreateDiagnosticReport,
  type TUpdateDiagnosticReportDto,
  type TListDiagnosticReportsQuery,
} from "@/modules/entities/schemas/diagnostic-report";
import { handleDiagnosticReportApiError } from "./diagnostic-report.rest.errors";

export class DiagnosticReportCoreRestService {
  constructor(private readonly client: AxiosInstance) {}

  async create(dto: TCreateDiagnosticReport): Promise<TDiagnosticReportResponse> {
    const startTimeMs = Date.now(); const operationId = randomUUID();
    logOperation("start", { name: "DiagnosticReportCoreRestService.create", startTimeMs, context: { operationId } });
    try {
      const res = await this.client.post<unknown>("/", dto);
      const data = await DiagnosticReportResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "DiagnosticReportCoreRestService.create", startTimeMs, data, context: { operationId, id: data.id } });
      return data;
    } catch (err) {
      logOperation("error", { name: "DiagnosticReportCoreRestService.create", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handleDiagnosticReportApiError(err);
      throw err;
    }
  }

  async list(query?: TListDiagnosticReportsQuery): Promise<TPaginatedDiagnosticReportResponse> {
    const startTimeMs = Date.now(); const operationId = randomUUID();
    logOperation("start", { name: "DiagnosticReportCoreRestService.list", startTimeMs, context: { operationId } });
    try {
      const res = await this.client.get<unknown>("/", { params: query });
      const data = await PaginatedDiagnosticReportResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "DiagnosticReportCoreRestService.list", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "DiagnosticReportCoreRestService.list", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handleDiagnosticReportApiError(err);
      throw err;
    }
  }

  async getById(id: number): Promise<TDiagnosticReportResponse> {
    const startTimeMs = Date.now(); const operationId = randomUUID();
    logOperation("start", { name: "DiagnosticReportCoreRestService.getById", startTimeMs, context: { operationId, id } });
    try {
      const res = await this.client.get<unknown>(`/${id}`);
      const data = await DiagnosticReportResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "DiagnosticReportCoreRestService.getById", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "DiagnosticReportCoreRestService.getById", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handleDiagnosticReportApiError(err);
      throw err;
    }
  }

  async update(id: number, dto: TUpdateDiagnosticReportDto): Promise<TDiagnosticReportResponse> {
    const startTimeMs = Date.now(); const operationId = randomUUID();
    logOperation("start", { name: "DiagnosticReportCoreRestService.update", startTimeMs, context: { operationId, id } });
    try {
      const res = await this.client.patch<unknown>(`/${id}`, dto);
      const data = await DiagnosticReportResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "DiagnosticReportCoreRestService.update", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "DiagnosticReportCoreRestService.update", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handleDiagnosticReportApiError(err);
      throw err;
    }
  }

  async delete(id: number): Promise<void> {
    const startTimeMs = Date.now(); const operationId = randomUUID();
    logOperation("start", { name: "DiagnosticReportCoreRestService.delete", startTimeMs, context: { operationId, id } });
    try {
      await this.client.delete(`/${id}`);
      logOperation("success", { name: "DiagnosticReportCoreRestService.delete", startTimeMs, context: { operationId } });
    } catch (err) {
      logOperation("error", { name: "DiagnosticReportCoreRestService.delete", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handleDiagnosticReportApiError(err);
      throw err;
    }
  }
}
