/**
 * server/utils/api-client — typed fetch wrapper for the FileNest backend.
 *
 * Attaches the caller's JWT (fetched from the IAM using the session cookie) as a
 * Bearer token on every request. The backend validates the JWT via JWKS and builds
 * the TenantContext from the embedded permissions and activeOrganizationId claims.
 *
 * API keys (fn_live_ / fn_test_) are for SDK / server-to-server calls only —
 * the console always uses the JWT path.
 *
 * @module
 */
"server-only";

import { ApiError } from "@/modules/server/shared/errors/mappers/map-error-to-zsa";
import { getAuthToken } from "@/modules/server/auth/jwt-token";

const API_URL = process.env.FILENEST_API_URL ?? "http://localhost:8000";

export async function filenestApi<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getAuthToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      // Prefer body.message (standard envelope); body.detail is an object, not a string
      message = body?.message ?? body?.detail?.message ?? message;
    } catch {
      // leave message as statusText
    }
    throw new ApiError(res.status, message);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}
