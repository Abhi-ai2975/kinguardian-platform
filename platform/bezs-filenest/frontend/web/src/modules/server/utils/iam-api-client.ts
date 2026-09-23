/**
 * server/utils/iam-api-client — typed fetch wrapper for the FileNest IAM (BetterAuth).
 *
 * Forwards the browser session cookie and Bearer token to the IAM so BetterAuth
 * recognises the authenticated user. Used by the ApiKeyIamService for all
 * API key management calls that live in the IAM, not in the FileNest backend.
 *
 * @module
 */
"server-only";

import { cookies, headers } from "next/headers";
import { ApiError } from "@/modules/server/shared/errors/mappers/map-error-to-zsa";

const IAM_URL =
  process.env.BETTER_AUTH_URL ??
  process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
  "http://localhost:5000";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

/**
 * Calls the IAM REST API with the current session credentials.
 *
 * @param path    - Path relative to IAM_URL, e.g. "/api/auth/api-key/list".
 * @param options - Fetch options (method, body, additional headers).
 * @returns Parsed JSON response typed as T.
 * @throws ApiError on non-2xx responses.
 */
export async function iamApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const hdrs = await headers();
  const cookieHeader = hdrs.get("cookie") ?? "";
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("console.access_token")?.value;

  const res = await fetch(`${IAM_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Origin: APP_URL,
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body?.message ?? body?.detail?.message ?? message;
    } catch {
      // leave as statusText
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
