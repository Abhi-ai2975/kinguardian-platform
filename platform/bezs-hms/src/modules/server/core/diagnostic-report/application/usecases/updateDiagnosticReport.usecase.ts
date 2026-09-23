/**
 * Update DiagnosticReport use case.
 * Layer: server / core / diagnostic-report / application
 */
import { getInjection } from "@/modules/server/di/container";
import { type TUpdateDiagnosticReportDto, type TDiagnosticReportResponse } from "@/modules/entities/schemas/diagnostic-report";

export async function updateDiagnosticReportUseCase(id: number, dto: TUpdateDiagnosticReportDto): Promise<TDiagnosticReportResponse> {
  const service = getInjection("IDiagnosticReportService");
  return service.update(id, dto);
}
