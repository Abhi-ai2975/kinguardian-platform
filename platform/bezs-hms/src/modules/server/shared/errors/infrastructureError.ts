import { ApplicationError } from "./applicationError";

export class InfrastructureError extends ApplicationError {
  constructor(message: string, cause?: unknown) {
    super(message, {
      code: "INFRASTRUCTURE_ERROR",
      statusCode: 500,
      cause,
      isOperational: true,
    });
  }
}
