"""
Authentication-specific error type for the application.

Subclasses AppError with a fixed 401 Unauthorized status code so that any code path
that detects an authentication failure can `raise AuthenticationError(...)` without
having to remember the correct HTTP status code. The registered app_error_handler in
app.core.errors converts this to the JSON response automatically.
"""

from app.core.errors import AppError


class AuthenticationError(AppError):
    """
    Raised when a request cannot be authenticated.

    Covers all authentication failure scenarios:
      - Missing Authorization header
      - Malformed or expired JWT
      - Invalid signature, issuer, or audience claim
      - Any unexpected error during token validation

    Always produces a 401 Unauthorized response. The message is included in the
    `detail` field of the JSON body so clients can display a meaningful error without
    exposing internal error details beyond what is safe.

    Args:
        message: Human-readable description of the authentication failure.
                 Defaults to "Authentication required" for generic 401 responses.
    """

    def __init__(self, message: str = "Authentication required"):
        # Pass 401 as the status code — all authentication errors must be 401,
        # never 403 (which would imply the user is known but lacks permission).
        super().__init__(message=message, status_code=401)
