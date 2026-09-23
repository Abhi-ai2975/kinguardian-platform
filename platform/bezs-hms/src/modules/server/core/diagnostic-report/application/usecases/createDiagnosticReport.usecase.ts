/**
 * Create DiagnosticReport use case.
 * Layer: server / core / diagnostic-report / application
 */
import { getInjection } from "@/modules/server/di/container";
import { type TCreateDiagnosticReport, type TDiagnosticReportResponse } from "@/modules/entities/schemas/diagnostic-report";

export async function createDiagnosticReportUseCase(dto: TCreateDiagnosticReport): Promise<TDiagnosticReportResponse> {
  const service = getInjection("IDiagnosticReportService");
  return service.create(dto);
}
