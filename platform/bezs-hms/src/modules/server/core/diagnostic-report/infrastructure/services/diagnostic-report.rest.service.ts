/**
 * DiagnosticReport REST API service.
 * Layer: server / core / diagnostic-report / infrastructure
 * Creates the Axios instance pointed at FHIR_GQL_URL/diagnostic-reports and
 * attaches the JWT auth interceptor. Delegates all HTTP work to
 * DiagnosticReportCoreRestService.
 */
import axios from "axios";
import { getAuthToken } from "@/modules/server/auth/jwt-token";
import { IDiagnosticReportService } from "../../domain/interfaces/diagnostic-report.service.interface";
import { DiagnosticReportCoreRestService } from "./rest/diagnostic-report.core.rest.service";
import {
  type TDiagnosticReportResponse,
  type TPaginatedDiagnosticReportResponse,
  type TCreateDiagnosticReport,
  type TUpdateDiagnosticReportDto,
  type TListDiagnosticReportsQuery,
} from "@/modules/entities/schemas/diagnostic-report";

export class DiagnosticReportRestApiService implements IDiagnosticReportService {
  private readonly core: DiagnosticReportCoreRestService;

  constructor() {
    const url = process.env.FHIR_GQL_URL;
    if (!url) throw new Error("FHIR_GQL_URL is not configured");

    const client = axios.create({
      baseURL: `${url}/diagnostic-reports`,
      headers: { "Content-Type": "application/json" },
      timeout: 10_000,
      maxRedirects: 5,
    });

    client.interceptors.request.use(async (config) => {
      config.headers.Authorization = `Bearer ${await getAuthToken()}`;
      return config;
    });

    this.core = new DiagnosticReportCoreRestService(client);
  }

  create(dto: TCreateDiagnosticReport): Promise<TDiagnosticReportResponse> { return this.core.create(dto); }
  list(query?: TListDiagnosticReportsQuery): Promise<TPaginatedDiagnosticReportResponse> { return this.core.list(query); }
  getById(id: number): Promise<TDiagnosticReportResponse> { return this.core.getById(id); }
  update(id: number, dto: TUpdateDiagnosticReportDto): Promise<TDiagnosticReportResponse> { return this.core.update(id, dto); }
  delete(id: number): Promise<void> { return this.core.delete(id); }
}
