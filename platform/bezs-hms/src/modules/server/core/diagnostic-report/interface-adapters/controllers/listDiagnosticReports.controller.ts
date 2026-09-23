/**
 * List DiagnosticReports controller.
 * Layer: server / core / diagnostic-report / interface-adapters
 */
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { ListDiagnosticReportsValidationSchema, type TPaginatedDiagnosticReportResponse } from "@/modules/entities/schemas/diagnostic-report";
import { listDiagnosticReportsUseCase } from "../../application/usecases/listDiagnosticReports.usecase";

function presenter(data: TPaginatedDiagnosticReportResponse) { return data; }
export type TListDiagnosticReportsControllerOutput = ReturnType<typeof presenter>;

export async function listDiagnosticReportsController(input: unknown): Promise<TListDiagnosticReportsControllerOutput> {
  const parsed = await ListDiagnosticReportsValidationSchema.safeParseAsync(input ?? {});
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await listDiagnosticReportsUseCase(parsed.data);
  return presenter(data);
}
