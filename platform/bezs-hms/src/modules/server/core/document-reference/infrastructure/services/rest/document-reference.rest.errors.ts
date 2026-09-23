/**
 * DocumentReference REST error handler.
 * Layer: server / core / document-reference / infrastructure
 */
import { AxiosError } from "axios";
import { handleFhirApiError } from "@/modules/server/shared/errors/handleFhirApiError";

export function handleDocumentReferenceApiError(error: AxiosError): never {
  handleFhirApiError(error, "DocumentReference");
}
