/**
 * Update DiagnosticReport controller.
 * Layer: server / core / diagnostic-report / interface-adapters
 */
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { UpdateDiagnosticReportValidationSchema, type TDiagnosticReportResponse } from "@/modules/entities/schemas/diagnostic-report";
import { updateDiagnosticReportUseCase } from "../../application/usecases/updateDiagnosticReport.usecase";

function presenter(data: TDiagnosticReportResponse) { return data; }
export type TUpdateDiagnosticReportControllerOutput = ReturnType<typeof presenter>;

export async function updateDiagnosticReportController(input: unknown): Promise<TUpdateDiagnosticReportControllerOutput> {
  const parsed = await UpdateDiagnosticReportValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { id, ...dto } = parsed.data;
  const data = await updateDiagnosticReportUseCase(id, dto);
  return presenter(data);
}
