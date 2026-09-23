/**
 * handleMedicationRequestApiError — Axios → domain error mapper for MedicationRequest REST services.
 *
 * Layer: infrastructure / services / rest (shared utility)
 *
 * Thin wrapper around the shared handleFhirApiError.
 */

import { AxiosError } from "axios";
import { handleFhirApiError } from "@/modules/server/shared/errors/handleFhirApiError";

/**
 * Maps an AxiosError from the fhir-gql MedicationRequest API to a typed domain error and throws it.
 * Return type `never` tells TypeScript this always throws so callers need no follow-up throw.
 *
 * @param error - The AxiosError thrown on non-2xx responses.
 * @throws ValidationError | UnauthorizedError | ForbiddenError | NotFoundError |
 *         ConflictError | RateLimitError | BadGatewayError
 */
export function handleMedicationRequestApiError(error: AxiosError): never {
  handleFhirApiError(error, "MedicationRequest");
}
