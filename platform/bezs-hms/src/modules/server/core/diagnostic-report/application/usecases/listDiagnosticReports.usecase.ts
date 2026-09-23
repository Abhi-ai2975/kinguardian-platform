/**
 * List DiagnosticReports use case.
 * Layer: server / core / diagnostic-report / application
 */
import { getInjection } from "@/modules/server/di/container";
import { type TListDiagnosticReportsQuery, type TPaginatedDiagnosticReportResponse } from "@/modules/entities/schemas/diagnostic-report";

export async function listDiagnosticReportsUseCase(query?: TListDiagnosticReportsQuery): Promise<TPaginatedDiagnosticReportResponse> {
  const service = getInjection("IDiagnosticReportService");
  return service.list(query);
}
