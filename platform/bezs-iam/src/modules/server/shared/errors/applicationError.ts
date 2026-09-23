/**
 * @module shared/errors/applicationError
 * @description The root error base for all controlled failures in the application.
 *              Every error crossing an architectural boundary uses this or a subclass.
 *
 * **Properties:**
 * - `message` — user-safe description (shown in UI for auth errors)
 * - `code` — internal classification string for programmatic handling
 * - `statusCode` — HTTP semantic intent (mapped to user-visible feedback)
 * - `isOperational` — whether this is expected (true) vs. a programming bug (false)
 * - `cause` — original error, if wrapping another error (never exposed to client)
 *
 * **Subclasses:** See `AuthError`, `InfrastructureError` for domain-specific errors.
 * @category Error Handling
 */

export type ErrorMetadata = Record<string, unknown>;

export class ApplicationError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly metadata?: ErrorMetadata;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    options?: {
      statusCode?: number;
      code?: string;
      metadata?: ErrorMetadata;
      cause?: unknown;
      isOperational?: boolean;
    }
  ) {
    super(message);
    this.name = this.constructor.name;

    this.statusCode = options?.statusCode ?? 500;
    this.code = options?.code ?? "APPLICATION_ERROR";
    this.metadata = options?.metadata;
    this.isOperational = options?.isOperational ?? true;

    if (options?.cause) {
      (this as any).cause = options.cause;
    }

    // Capture a clean stack trace from the throw site, not the constructor.
    Error.captureStackTrace(this, this.constructor);
  }
}
