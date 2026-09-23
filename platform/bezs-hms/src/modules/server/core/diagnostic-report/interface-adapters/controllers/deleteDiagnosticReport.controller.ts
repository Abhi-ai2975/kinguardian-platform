/**
 * Delete DiagnosticReport controller.
 * Layer: server / core / diagnostic-report / interface-adapters
 */
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { DeleteDiagnosticReportValidationSchema } from "@/modules/entities/schemas/diagnostic-report";
import { deleteDiagnosticReportUseCase } from "../../application/usecases/deleteDiagnosticReport.usecase";

export async function deleteDiagnosticReportController(input: unknown): Promise<void> {
  const parsed = await DeleteDiagnosticReportValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deleteDiagnosticReportUseCase(parsed.data.id);
}
