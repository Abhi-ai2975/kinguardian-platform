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

    // Capture a clean stack trace starting from the call site where this error
    // was created, not from inside the error class constructor itself.
    // This makes logs show where the error actually originated and how it
    // propagated through the application layers.
    Error.captureStackTrace(this, this.constructor);
  }
}
