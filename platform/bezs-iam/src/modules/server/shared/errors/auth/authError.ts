import { ApplicationError } from "../applicationError";

export class AuthError extends ApplicationError {
  constructor(
    message: string,
    options?: {
      statusCode?: number;
      code?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    super(message, {
      statusCode: options?.statusCode ?? 400,
      code: options?.code ?? "AUTH_ERROR",
      metadata: options?.metadata,
      isOperational: true,
    });
  }
}
