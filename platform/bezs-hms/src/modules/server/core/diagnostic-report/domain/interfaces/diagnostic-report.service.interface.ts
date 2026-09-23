/**
 * DiagnosticReport service interface.
 * Layer: server / core / diagnostic-report / domain
 * Defines the contract that infrastructure implementations must satisfy.
 */
import type {
  TCreateDiagnosticReport,
  TUpdateDiagnosticReportDto,
  TListDiagnosticReportsQuery,
  TDiagnosticReportResponse,
  TPaginatedDiagnosticReportResponse,
} from "@/modules/entities/schemas/diagnostic-report";

export interface IDiagnosticReportService {
  create(dto: TCreateDiagnosticReport): Promise<TDiagnosticReportResponse>;
  list(query?: TListDiagnosticReportsQuery): Promise<TPaginatedDiagnosticReportResponse>;
  getById(id: number): Promise<TDiagnosticReportResponse>;
  update(id: number, dto: TUpdateDiagnosticReportDto): Promise<TDiagnosticReportResponse>;
  delete(id: number): Promise<void>;
}
