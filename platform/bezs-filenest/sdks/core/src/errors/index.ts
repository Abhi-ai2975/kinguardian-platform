/**
 * @filenest/core errors — typed error hierarchy for all FileNest SDKs.
 *
 * Every non-2xx response from the API is mapped to one of these classes so
 * callers can write typed catch blocks instead of checking status codes.
 *
 * @module
 */

/** Base class for all FileNest SDK errors. */
export class FileNestError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = "FileNestError";
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 401 — invalid or missing API key. */
export class AuthenticationError extends FileNestError {
  constructor(message = "Invalid or missing API key") {
    super(message, "authentication_required", 401);
    this.name = "AuthenticationError";
  }
}

/** 403 — token lacks the required scope. */
export class AuthorizationError extends FileNestError {
  readonly requiredScope?: string;

  constructor(message = "Insufficient scope", requiredScope?: string) {
    super(message, "insufficient_scope", 403);
    this.name = "AuthorizationError";
    this.requiredScope = requiredScope;
  }
}

/** 404 — generic resource not found. */
export class NotFoundError extends FileNestError {
  constructor(message = "Resource not found") {
    super(message, "not_found", 404);
    this.name = "NotFoundError";
  }
}

/** 404 — file specifically not found. */
export class FileNotFoundError extends NotFoundError {
  readonly fileId?: string;

  constructor(fileId?: string) {
    super(fileId ? `File ${fileId} not found` : "File not found");
    this.name = "FileNotFoundError";
    this.fileId = fileId;
  }
}

/** 409 — generic conflict. */
export class ConflictError extends FileNestError {
  constructor(message = "Resource conflict") {
    super(message, "conflict", 409);
    this.name = "ConflictError";
  }
}

/** 409 — attempt to mutate a WORM-committed file. */
export class WORMViolationError extends FileNestError {
  constructor(message = "File is WORM-committed and cannot be modified") {
    super(message, "worm_violation", 409);
    this.name = "WORMViolationError";
  }
}

/** 409 — attempt to delete/move a file under legal hold. */
export class LegalHoldError extends FileNestError {
  readonly reason?: string;

  constructor(message = "File is under legal hold", reason?: string) {
    super(message, "legal_hold_active", 409);
    this.name = "LegalHoldError";
    this.reason = reason;
  }
}

/** 422 — generic validation error. */
export class ValidationError extends FileNestError {
  readonly validationErrors: { field: string; message: string; value?: unknown }[];

  constructor(
    message = "Validation failed",
    validationErrors: { field: string; message: string; value?: unknown }[] = [],
    code = "validation_error"
  ) {
    super(message, code, 422);
    this.name = "ValidationError";
    this.validationErrors = validationErrors;
  }
}

/** 422 — file metadata failed schema validation. */
export class MetadataValidationError extends ValidationError {
  constructor(
    validationErrors: { field: string; message: string; value?: unknown }[] = []
  ) {
    super("Metadata validation failed", validationErrors, "metadata_validation_error");
    this.name = "MetadataValidationError";
  }
}

/** 429 — rate limit exceeded. Includes retry-after seconds. */
export class RateLimitError extends FileNestError {
  readonly retryAfter?: number;

  constructor(message = "Rate limit exceeded", retryAfter?: number) {
    super(message, "rate_limited", 429);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

/** Network-level failure (fetch/connect error, timeout). */
export class NetworkError extends FileNestError {
  readonly cause?: unknown;

  constructor(message = "Network error", cause?: unknown) {
    super(message, "network_error", 0);
    this.name = "NetworkError";
    this.cause = cause;
  }
}

/** Storage provider returned an error during upload/download. */
export class StorageError extends FileNestError {
  constructor(message = "Storage provider error") {
    super(message, "storage_error", 502);
    this.name = "StorageError";
  }
}
