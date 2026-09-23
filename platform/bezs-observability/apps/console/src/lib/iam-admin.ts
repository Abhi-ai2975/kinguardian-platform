// iam-admin.ts — thin HTTP proxy helpers for calling IAM's Better Auth admin
// endpoints from console API route handlers.
//
// All calls forward the session cookie so IAM can authenticate and authorise
// the request as it would if the browser called it directly.
import { headers } from "next/headers";

const IAM_URL = process.env.IAM_URL ?? "http://localhost:5000";

// callIAM performs a server-to-server fetch to IAM, forwarding the current
// request's session cookie for authentication.
async function callIAM(path: string, init?: RequestInit): Promise<Response> {
  const hdrs = await headers();
  const cookie = hdrs.get("cookie") ?? "";

  return fetch(`${IAM_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...((init?.headers as Record<string, string>) ?? {}),
      cookie,
    },
    cache: "no-store",
  });
}

// listUsers calls IAM's Better Auth admin list-users endpoint.
export async function listUsers(params?: {
  limit?: number;
  offset?: number;
  searchValue?: string;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
}) {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  if (params?.searchValue) qs.set("searchValue", params.searchValue);
  if (params?.sortBy) qs.set("sortBy", params.sortBy);
  if (params?.sortDirection) qs.set("sortDirection", params.sortDirection);

  const res = await callIAM(`/api/auth/admin/list-users?${qs}`);
  if (!res.ok) throw new Error(`IAM listUsers failed: ${res.status}`);
  return res.json() as Promise<{
    users: IamUser[];
    total: number;
  }>;
}

// banUser suspends a user account via IAM.
export async function banUser(userId: string, banReason?: string) {
  const res = await callIAM("/api/auth/admin/ban-user", {
    method: "POST",
    body: JSON.stringify({ userId, banReason }),
  });
  if (!res.ok) throw new Error(`IAM banUser failed: ${res.status}`);
  return res.json();
}

// unbanUser reinstates a previously banned user account via IAM.
export async function unbanUser(userId: string) {
  const res = await callIAM("/api/auth/admin/unban-user", {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) throw new Error(`IAM unbanUser failed: ${res.status}`);
  return res.json();
}

// setUserRole assigns a new platform role to a user via IAM.
export async function setUserRole(userId: string, role: string) {
  const res = await callIAM("/api/auth/admin/set-user-role", {
    method: "POST",
    body: JSON.stringify({ userId, role }),
  });
  if (!res.ok) throw new Error(`IAM setUserRole failed: ${res.status}`);
  return res.json();
}

// removeUser permanently deletes a user account via IAM.
export async function removeUser(userId: string) {
  const res = await callIAM("/api/auth/admin/remove-user", {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) throw new Error(`IAM removeUser failed: ${res.status}`);
  return res.json();
}

// revokeUserSessions invalidates all active sessions for a user via IAM.
export async function revokeUserSessions(userId: string) {
  const res = await callIAM("/api/auth/admin/revoke-user-sessions", {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) throw new Error(`IAM revokeUserSessions failed: ${res.status}`);
  return res.json();
}

// IamUser is the shape returned by IAM's Better Auth admin list-users endpoint.
export interface IamUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: string;
  updatedAt: string;
  role: string | null;
  banned: boolean | null;
  banReason: string | null;
  banExpires: string | null;
}
