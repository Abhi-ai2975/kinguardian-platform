import { AuthError } from "./authError"

// Maps for INVALID_PASSWORD, INVALID_EMAIL, INVALID_EMAIL_OR_PASSWORD, INVALID_USER, CREDENTIAL_ACCOUNT_NOT_FOUND, VALIDATION_ERROR
export class InvalidCredentialsError extends AuthError {
  constructor() {
    super("Invalid email or password", {
      statusCode: 401,
      code: "INVALID_CREDENTIALS"
    })
  }
}

// Maps for USER_ALREADY_EXISTS, USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL, LINKED_ACCOUNT_ALREADY_EXISTS, SOCIAL_ACCOUNT_ALREADY_LINKED
export class UserAlreadyExistsError extends AuthError {
  constructor() {
    super("An account with this email already exists", {
      statusCode: 409,
      code: "USER_ALREADY_EXISTS"
    })
  }
}

// Maps for EMAIL_NOT_VERIFIED, EMAIL_ALREADY_VERIFIED, VERIFICATION_EMAIL_NOT_ENABLED
export class EmailNotVerifiedError extends AuthError {
  constructor() {
    super("Please verify your email address to continue", {
      statusCode: 403,
      code: "EMAIL_NOT_VERIFIED"
    })
  }
}

// Maps for SESSION_EXPIRED, SESSION_NOT_FRESH, INVALID_TOKEN, TOKEN_EXPIRED
export class SessionExpiredError extends AuthError {
  constructor() {
    super("Your session has expired. Please sign in again.", {
      statusCode: 401,
      code: "SESSION_EXPIRED"
    })
  }
}

// Maps for USER_NOT_FOUND, ACCOUNT_NOT_FOUND, USER_EMAIL_NOT_FOUND
export class AccountNotFoundError extends AuthError {
  constructor() {
    super("Account not found", {
      statusCode: 404,
      code: "ACCOUNT_NOT_FOUND"
    })
  }
}

// Maps for PASSWORD_TOO_SHORT, PASSWORD_TOO_LONG, USER_ALREADY_HAS_PASSWORD
export class PasswordPolicyError extends AuthError {
  constructor(message = "Password does not meet requirements") {
    super(message, {
      statusCode: 400,
      code: "PASSWORD_POLICY_VIOLATION"
    })
  }
}

// Maps for PROVIDER_NOT_FOUND, ID_TOKEN_NOT_SUPPORTED, INVALID_ORIGIN, INVALID_CALLBACK_URL, INVALID_REDIRECT_URL, INVALID_ERROR_CALLBACK_URL, INVALID_NEW_USER_CALLBACK_URL, CALLBACK_URL_REQUIRED, MISSING_OR_NULL_ORIGIN
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
