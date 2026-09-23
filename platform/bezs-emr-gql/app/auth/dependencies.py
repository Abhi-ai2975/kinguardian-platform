"""
FastAPI dependency functions for JWT-based authentication.

Flow overview:
  1. Client sends  `Authorization: Bearer <jwt>` in the request header.
  2. `get_current_user` extracts the raw token string.
  3. `decode_token` fetches the matching public key from the IAM JWKS endpoint
     and uses it to verify the JWT signature, expiry, issuer, and audience claims.
  4. The decoded payload is stored on `request.state.user` so downstream
     route handlers and middleware can read it without re-decoding.

The PyJWKClient is instantiated once at module level (module-level singleton) so
the JWKS response is cached between requests; it re-fetches only when the key
rotation requires it (handled internally by python-jose's PyJWKClient).
"""

import jwt
from jwt import PyJWKClient
from fastapi import Request

from app.config import settings
from app.errors.auth import AuthenticationError

# Module-level singleton for the JWKS client.
# Caching this avoids a network round-trip to the IAM server on every request.
# PyJWKClient internally caches the fetched keys and only re-fetches on cache miss
# (e.g. when the server rotates keys and a new `kid` appears in a JWT header).
jwks_client = PyJWKClient(settings.IAM_JWKS_URL)


def decode_token(token: str) -> dict:
    """
    Validate and decode a raw JWT string.

    Steps performed:
      - Retrieves the correct public signing key from the JWKS endpoint using the
        `kid` (key ID) embedded in the JWT header — this avoids storing any secret.
      - Verifies the signature using EdDSA or RS256 (both accepted to allow IAM key
        algorithm rotation without a coordinated deploy).
      - Validates `iss` (issuer) and `aud` (audience) claims against IAM_ISSUER.
        BetterAuth sets aud == iss, so the same value satisfies both checks.
      - Validates `exp` (expiry) automatically via python-jose.

    Args:
        token: The raw JWT string extracted from the Authorization header.

    Returns:
        The decoded JWT payload as a plain dict (e.g. {"sub": "...", "org_id": "..."}).

    Raises:
        jwt.ExpiredSignatureError: If the token's `exp` claim is in the past.
        jwt.InvalidTokenError: If the signature, issuer, or audience is wrong.
    """
    # get_signing_key_from_jwt uses the `kid` header field to pick the right key
    # from the cached JWKS response, avoiding the need to try all available keys.
    signing_key = jwks_client.get_signing_key_from_jwt(token)
    return jwt.decode(
        token,
        signing_key.key,
        # audience must match the `aud` claim inside the token
        audience=settings.IAM_ISSUER,
        issuer=settings.IAM_ISSUER,
        # accept both EdDSA (preferred by BetterAuth) and RS256 for compatibility
        algorithms=["EdDSA", "RS256"],
        options={"verify_aud": True},
    )


async def get_current_user(request: Request) -> dict:
    """
    FastAPI dependency that authenticates the incoming request.

    Extracts the Bearer token from the Authorization header, decodes and validates
    it via `decode_token`, then stores the payload on `request.state` so it is
    accessible to route handlers, RBAC checks, and middleware without re-decoding.

    Injected as a router-level dependency in app.main so it runs automatically for
    every route under /api/v1 — individual routes do NOT need to declare it again.

    Args:
        request: The current FastAPI/Starlette request object.

    Returns:
        The decoded JWT payload dict (same object stored on request.state.user).

    Raises:
        AuthenticationError: For any authentication failure — missing token, expired
            token, bad signature, wrong issuer/audience, or unexpected errors.
            Raises 401 in all cases to avoid leaking information about failure mode.
    """
    auth_header = request.headers.get("Authorization")

    # Reject requests that have no Authorization header or that use a non-Bearer scheme.
    if not auth_header or not auth_header.startswith("Bearer "):
        raise AuthenticationError("Missing authentication token")

    # Split "Bearer <token>" and take only the token part (index 1).
    token = auth_header.split(" ")[1]

    try:
        payload = decode_token(token)

        # Attach the decoded payload and the raw token to request.state so that:
        # - Route handlers can read user identity without repeating decode logic.
        # - The FhirClient can forward actor context (sub, org_id) to the FHIR server.
        request.state.user = payload
        request.state.token = token
        return payload

    except jwt.ExpiredSignatureError:
        # Distinguish expired tokens from other failures so clients can refresh.
        raise AuthenticationError("Token expired")
    except jwt.InvalidTokenError:
        # Covers bad signature, wrong issuer/audience, malformed JWT, etc.
        raise AuthenticationError("Invalid token")
    except Exception:
        # Catch-all for unexpected failures (e.g. JWKS network error) — always 401
        # to avoid leaking internal error details to unauthenticated callers.
        raise AuthenticationError("Invalid or expired token")
