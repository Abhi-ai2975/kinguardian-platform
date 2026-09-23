/**
 * DocumentReference core REST service.
 * Layer: server / core / document-reference / infrastructure
 * Owns the raw HTTP calls and response validation. No auth or URL config here —
 * those belong in DocumentReferenceRestApiService which creates the Axios instance.
 */
import { randomUUID } from "crypto";
import axios, { AxiosInstance } from "axios";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import {
  DocumentReferenceResponseSchema,
  PaginatedDocumentReferenceResponseSchema,
  type TDocumentReferenceResponse,
  type TPaginatedDocumentReferenceResponse,
  type TCreateDocumentReference,
  type TUpdateDocumentReferenceDto,
  type TListDocumentReferencesQuery,
} from "@/modules/entities/schemas/document-reference";
import { handleDocumentReferenceApiError } from "./document-reference.rest.errors";

export class DocumentReferenceCoreRestService {
  constructor(private readonly client: AxiosInstance) {}

  async create(dto: TCreateDocumentReference): Promise<TDocumentReferenceResponse> {
    const startTimeMs = Date.now(); const operationId = randomUUID();
    logOperation("start", { name: "DocumentReferenceCoreRestService.create", startTimeMs, context: { operationId } });
    try {
      const res = await this.client.post<unknown>("/", dto);
      const data = await DocumentReferenceResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "DocumentReferenceCoreRestService.create", startTimeMs, data, context: { operationId, id: data.id } });
      return data;
    } catch (err) {
      logOperation("error", { name: "DocumentReferenceCoreRestService.create", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handleDocumentReferenceApiError(err);
      throw err;
    }
  }

  async list(query?: TListDocumentReferencesQuery): Promise<TPaginatedDocumentReferenceResponse> {
    const startTimeMs = Date.now(); const operationId = randomUUID();
    logOperation("start", { name: "DocumentReferenceCoreRestService.list", startTimeMs, context: { operationId } });
    try {
      const res = await this.client.get<unknown>("/", { params: query });
      const data = await PaginatedDocumentReferenceResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "DocumentReferenceCoreRestService.list", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "DocumentReferenceCoreRestService.list", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handleDocumentReferenceApiError(err);
      throw err;
    }
  }

  async getById(id: number): Promise<TDocumentReferenceResponse> {
    const startTimeMs = Date.now(); const operationId = randomUUID();
    logOperation("start", { name: "DocumentReferenceCoreRestService.getById", startTimeMs, context: { operationId, id } });
    try {
      const res = await this.client.get<unknown>(`/${id}`);
      const data = await DocumentReferenceResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "DocumentReferenceCoreRestService.getById", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "DocumentReferenceCoreRestService.getById", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handleDocumentReferenceApiError(err);
      throw err;
    }
  }

  async update(id: number, dto: TUpdateDocumentReferenceDto): Promise<TDocumentReferenceResponse> {
    const startTimeMs = Date.now(); const operationId = randomUUID();
    logOperation("start", { name: "DocumentReferenceCoreRestService.update", startTimeMs, context: { operationId, id } });
    try {
      const res = await this.client.patch<unknown>(`/${id}`, dto);
      const data = await DocumentReferenceResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "DocumentReferenceCoreRestService.update", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "DocumentReferenceCoreRestService.update", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handleDocumentReferenceApiError(err);
      throw err;
    }
  }

  async delete(id: number): Promise<void> {
    const startTimeMs = Date.now(); const operationId = randomUUID();
    logOperation("start", { name: "DocumentReferenceCoreRestService.delete", startTimeMs, context: { operationId, id } });
    try {
      await this.client.delete(`/${id}`);
      logOperation("success", { name: "DocumentReferenceCoreRestService.delete", startTimeMs, context: { operationId } });
    } catch (err) {
      logOperation("error", { name: "DocumentReferenceCoreRestService.delete", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handleDocumentReferenceApiError(err);
      throw err;
    }
  }
}
