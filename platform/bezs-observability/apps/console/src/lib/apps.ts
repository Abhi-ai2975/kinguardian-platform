// apps.ts — thin HTTP client for app/key management.
// Calls the IAM service's /api/apps endpoints instead of querying the DB directly.
// The session cookie from the browser is forwarded so IAM handles auth and org resolution.
//
// Server-only — never import this from client components.

const IAM_URL = process.env.IAM_URL ?? "http://localhost:5000";

export interface App {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface AppKey {
  id: string;
  name: string | null;
  start: string | null;
  appId: string | null;
  createdAt: string;
  expiresAt: string | null;
  enabled: boolean | null;
}

async function iamFetch(path: string, cookie: string, init?: RequestInit): Promise<Response> {
  return fetch(`${IAM_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      cookie,
      ...(init?.headers ?? {}),
    },
  });
}

export async function listApps(cookie: string): Promise<App[]> {
  const res = await iamFetch("/api/apps", cookie);
  if (!res.ok) throw new Error(`listApps: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function createApp(name: string, cookie: string): Promise<App> {
  const res = await iamFetch("/api/apps", cookie, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  if (res.status === 409) {
    const err = new Error("slug_conflict");
    (err as Error & { status: number }).status = 409;
    throw err;
  }
  if (!res.ok) throw new Error(`createApp: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function deleteApp(appId: string, cookie: string): Promise<void> {
  const res = await iamFetch(`/api/apps/${appId}`, cookie, { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new Error(`deleteApp: ${res.status} ${await res.text()}`);
}

export async function listAppKeys(appId: string, cookie: string): Promise<AppKey[]> {
  const res = await iamFetch(`/api/apps/${appId}/keys`, cookie);
  if (!res.ok) throw new Error(`listAppKeys: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function linkKey(appId: string, keyId: string, cookie: string): Promise<void> {
  const res = await iamFetch(`/api/apps/${appId}/keys`, cookie, {
    method: "POST",
    body: JSON.stringify({ keyId }),
  });
  if (!res.ok) throw new Error(`linkKey: ${res.status} ${await res.text()}`);
}

export async function unlinkKey(keyId: string, cookie: string): Promise<void> {
  const res = await iamFetch("/api/apps/unlink-key", cookie, {
    method: "POST",
    body: JSON.stringify({ keyId }),
  });
  if (!res.ok) throw new Error(`unlinkKey: ${res.status} ${await res.text()}`);
}
