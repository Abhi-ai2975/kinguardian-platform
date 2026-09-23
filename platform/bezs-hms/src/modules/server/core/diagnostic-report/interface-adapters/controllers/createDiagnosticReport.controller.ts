/**
 * Create DiagnosticReport controller.
 * Layer: server / core / diagnostic-report / interface-adapters
 */
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { CreateDiagnosticReportValidationSchema, type TDiagnosticReportResponse } from "@/modules/entities/schemas/diagnostic-report";
import { createDiagnosticReportUseCase } from "../../application/usecases/createDiagnosticReport.usecase";

function presenter(data: TDiagnosticReportResponse) { return data; }
export type TCreateDiagnosticReportControllerOutput = ReturnType<typeof presenter>;

export async function createDiagnosticReportController(input: unknown): Promise<TCreateDiagnosticReportControllerOutput> {
  const parsed = await CreateDiagnosticReportValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await createDiagnosticReportUseCase(parsed.data);
  return presenter(data);
}
