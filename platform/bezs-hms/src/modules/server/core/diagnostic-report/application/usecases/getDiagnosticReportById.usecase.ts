/**
 * Get DiagnosticReport by ID use case.
 * Layer: server / core / diagnostic-report / application
 */
import { getInjection } from "@/modules/server/di/container";
import { type TDiagnosticReportResponse } from "@/modules/entities/schemas/diagnostic-report";

export async function getDiagnosticReportByIdUseCase(id: number): Promise<TDiagnosticReportResponse> {
  const service = getInjection("IDiagnosticReportService");
  return service.getById(id);
}
