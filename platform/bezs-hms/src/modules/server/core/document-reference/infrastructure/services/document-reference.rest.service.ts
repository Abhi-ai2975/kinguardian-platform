/**
 * DocumentReference REST API service.
 * Layer: server / core / document-reference / infrastructure
 * Creates the Axios instance pointed at FHIR_GQL_URL/document-references and
 * attaches the JWT auth interceptor. Delegates all HTTP work to
 * DocumentReferenceCoreRestService.
 */
import axios from "axios";
import { getAuthToken } from "@/modules/server/auth/jwt-token";
import { IDocumentReferenceService } from "../../domain/interfaces/document-reference.service.interface";
import { DocumentReferenceCoreRestService } from "./rest/document-reference.core.rest.service";
import {
  type TDocumentReferenceResponse,
  type TPaginatedDocumentReferenceResponse,
  type TCreateDocumentReference,
  type TUpdateDocumentReferenceDto,
  type TListDocumentReferencesQuery,
} from "@/modules/entities/schemas/document-reference";

export class DocumentReferenceRestApiService implements IDocumentReferenceService {
  private readonly core: DocumentReferenceCoreRestService;

  constructor() {
    const url = process.env.FHIR_GQL_URL;
    if (!url) throw new Error("FHIR_GQL_URL is not configured");

    const client = axios.create({
      baseURL: `${url}/document-references`,
      headers: { "Content-Type": "application/json" },
      timeout: 10_000,
      maxRedirects: 5,
    });

    client.interceptors.request.use(async (config) => {
      config.headers.Authorization = `Bearer ${await getAuthToken()}`;
      return config;
    });

    this.core = new DocumentReferenceCoreRestService(client);
  }

  create(dto: TCreateDocumentReference): Promise<TDocumentReferenceResponse> { return this.core.create(dto); }
  list(query?: TListDocumentReferencesQuery): Promise<TPaginatedDocumentReferenceResponse> { return this.core.list(query); }
  getById(id: number): Promise<TDocumentReferenceResponse> { return this.core.getById(id); }
  update(id: number, dto: TUpdateDocumentReferenceDto): Promise<TDocumentReferenceResponse> { return this.core.update(id, dto); }
  delete(id: number): Promise<void> { return this.core.delete(id); }
}
