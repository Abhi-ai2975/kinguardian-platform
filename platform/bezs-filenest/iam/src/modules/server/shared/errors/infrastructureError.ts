/**
 * @module shared/errors/infrastructureError
 * @description Represents failures in external services, network, SDKs (Better Auth),
 *              databases, and system dependencies. These are not user-actionable.
 *
 * **Characteristics:**
 * - User cannot fix them — always show a generic error message
 * - Expected in production — operational, not a programming bug
 * - Must be logged for debugging
 * - Must be sanitized at the boundary before reaching the client
 *
 * **Examples:** Auth provider outage, network timeout, unexpected SDK response.
 * @category Error Handling
 */

import { ApplicationError } from "./applicationError";

export class InfrastructureError extends ApplicationError {
  constructor(
    message: string,
    cause?: unknown,
    options?: {
      code?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    super(message, {
      statusCode: 500,
      code: options?.code ?? "INFRASTRUCTURE_ERROR",
      metadata: options?.metadata,
      cause,
      isOperational: true,
    });
  }
}
