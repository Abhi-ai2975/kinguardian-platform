/**
 * Get DiagnosticReport by ID controller.
 * Layer: server / core / diagnostic-report / interface-adapters
 */
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { GetByIdDiagnosticReportValidationSchema, type TDiagnosticReportResponse } from "@/modules/entities/schemas/diagnostic-report";
import { getDiagnosticReportByIdUseCase } from "../../application/usecases/getDiagnosticReportById.usecase";

function presenter(data: TDiagnosticReportResponse) { return data; }
export type TGetDiagnosticReportByIdControllerOutput = ReturnType<typeof presenter>;

export async function getDiagnosticReportByIdController(input: unknown): Promise<TGetDiagnosticReportByIdControllerOutput> {
  const parsed = await GetByIdDiagnosticReportValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await getDiagnosticReportByIdUseCase(parsed.data.id);
  return presenter(data);
}
