import { jwtVerify, createRemoteJWKSet, errors as JoseErrors } from "jose";

let JWKS: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS() {
  if (!JWKS) {
    JWKS = createRemoteJWKSet(
      new URL(`${process.env.BETTER_AUTH_URL}/api/auth/jwks`),
    );
  }
  return JWKS;
}

export async function verifyAccessToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getJWKS(), {
      issuer: process.env.BETTER_AUTH_URL,
      audience: process.env.BETTER_AUTH_URL,
    });

    return {
      valid: true,
      payload,
    };
  } catch (error) {
    // 🔥 Handle specific cases
    if (error instanceof JoseErrors.JWTExpired) {
      return {
        valid: false,
        code: "TOKEN_EXPIRED",
        status: 401,
        message: "Access token expired",
      };
    }

    if (error instanceof JoseErrors.JWTInvalid) {
      return {
        valid: false,
        code: "TOKEN_INVALID",
        status: 401,
        message: "Invalid token",
      };
    }

    if (error instanceof JoseErrors.JWSSignatureVerificationFailed) {
      return {
        valid: false,
        code: "TOKEN_SIGNATURE_INVALID",
        status: 401,
        message: "Invalid token signature",
      };
    }

    if (error instanceof JoseErrors.JWTClaimValidationFailed) {
      return {
        valid: false,
        code: "TOKEN_CLAIM_INVALID",
        status: 401,
        message: "Invalid token claims (issuer/audience)",
      };
    }

    // fallback
    return {
      valid: false,
      code: "TOKEN_UNKNOWN_ERROR",
      status: 401,
      message: "Token verification failed",
    };
  }
}
