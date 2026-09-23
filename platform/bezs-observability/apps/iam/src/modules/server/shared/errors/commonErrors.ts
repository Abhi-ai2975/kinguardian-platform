import { ApplicationError } from "./applicationError";

export class ValidationError extends ApplicationError {
  constructor(
    message = "Validation failed",
    metadata?: Record<string, unknown>
  ) {
    super(message, {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      metadata,
    });
  }
}

export class UnauthorizedError extends ApplicationError {
  constructor(message = "Unauthorized") {
    super(message, {
      statusCode: 401,
      code: "UNAUTHORIZED",
    });
  }
}

export class ForbiddenError extends ApplicationError {
  constructor(message = "Forbidden") {
    super(message, {
      statusCode: 403,
      code: "FORBIDDEN",
    });
  }
}

export class NotFoundError extends ApplicationError {
  constructor(message = "Resource not found") {
    super(message, {
      statusCode: 404,
      code: "NOT_FOUND",
    });
  }
}

export class ConflictError extends ApplicationError {
  constructor(message = "Conflict") {
    super(message, {
      statusCode: 409,
      code: "CONFLICT",
    });
  }
}

export class InternalServerError extends ApplicationError {
  constructor(message = "Internal server error", cause?: unknown) {
    super(message, {
      statusCode: 500,
      code: "INTERNAL_SERVER_ERROR",
      cause,
      isOperational: false,
    });
  }
}

export class BadGatewayError extends ApplicationError {
  constructor(message = "Bad gateway") {
    super(message, {
      statusCode: 502,
      code: "BAD_GATEWAY",
    });
  }
}
