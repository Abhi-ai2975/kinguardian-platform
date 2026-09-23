/**
 * DiagnosticReport REST error handler.
 * Layer: server / core / diagnostic-report / infrastructure
 */
import { AxiosError } from "axios";
import { handleFhirApiError } from "@/modules/server/shared/errors/handleFhirApiError";

export function handleDiagnosticReportApiError(error: AxiosError): never {
  handleFhirApiError(error, "DiagnosticReport");
}
