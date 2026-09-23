import { AuthError } from "./authError"

export class InvalidCredentialsError extends AuthError {
  constructor() {
    super("Invalid email or password", {
      statusCode: 401,
      code: "INVALID_CREDENTIALS"
    })
  }
}

export class UserAlreadyExistsError extends AuthError {
  constructor() {
    super("An account with this email already exists", {
      statusCode: 409,
      code: "USER_ALREADY_EXISTS"
    })
  }
}

export class EmailNotVerifiedError extends AuthError {
  constructor() {
    super("Please verify your email address to continue", {
      statusCode: 403,
      code: "EMAIL_NOT_VERIFIED"
    })
  }
}

export class SessionExpiredError extends AuthError {
  constructor() {
    super("Your session has expired. Please sign in again.", {
      statusCode: 401,
      code: "SESSION_EXPIRED"
    })
  }
}

export class AccountNotFoundError extends AuthError {
  constructor() {
    super("Account not found", {
      statusCode: 404,
      code: "ACCOUNT_NOT_FOUND"
    })
  }
}

export class PasswordPolicyError extends AuthError {
  constructor(message = "Password does not meet requirements") {
    super(message, {
      statusCode: 400,
      code: "PASSWORD_POLICY_VIOLATION"
    })
  }
}

export class AuthConfigurationError extends AuthError {
  constructor() {
    super("Authentication service is temporarily unavailable", {
      statusCode: 500,
      code: "AUTH_CONFIGURATION_ERROR"
    })
  }
}

export class AccountNotVerifiedError extends AuthError {
  constructor() {
    super("Please verify your account before signing in", {
      statusCode: 403,
      code: "ACCOUNT_NOT_VERIFIED"
    })
  }
}

export class AccountDisabledError extends AuthError {
  constructor() {
    super("Your account has been disabled. Contact support.", {
      statusCode: 403,
      code: "ACCOUNT_DISABLED"
    })
  }
}
