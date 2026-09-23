/**
 * handleAppointmentApiError — Axios → domain error mapper for Appointment REST services.
 *
 * Layer: infrastructure / services / rest (shared utility)
 *
 * Thin wrapper around the shared handleFhirApiError.
 * Note: 409 from the Appointment API indicates a slot conflict (another booking claimed
 * the slot between slot selection and confirmation — a race condition).
 */

import { AxiosError } from "axios";
import { handleFhirApiError } from "@/modules/server/shared/errors/handleFhirApiError";

/**
 * Maps an AxiosError from the fhir-gql Appointment API to a typed domain error and throws it.
 * Return type `never` tells TypeScript this always throws so callers need no follow-up throw.
 *
 * @param error - The AxiosError thrown on non-2xx responses.
 * @throws ValidationError | UnauthorizedError | ForbiddenError | NotFoundError |
 *         ConflictError | RateLimitError | BadGatewayError
 */
export function handleAppointmentApiError(error: AxiosError): never {
  handleFhirApiError(error, "Appointment");
}
