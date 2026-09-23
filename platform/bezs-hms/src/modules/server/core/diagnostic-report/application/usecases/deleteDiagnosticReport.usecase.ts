/**
 * Delete DiagnosticReport use case.
 * Layer: server / core / diagnostic-report / application
 */
import { getInjection } from "@/modules/server/di/container";

export async function deleteDiagnosticReportUseCase(id: number): Promise<void> {
  const service = getInjection("IDiagnosticReportService");
  return service.delete(id);
}
