/**
 * org-permissions — Default org role permissions and permission key serialisation.
 *
 * DEFAULT_ORG_ROLE_PERMISSIONS defines the scopes granted to the org owner when
 * an organisation is first created. All other roles (admin, member, viewer, custom)
 * start with no permissions and are configured explicitly when members are invited.
 *
 * orgPermissionKeysToJson / orgPermissionJsonToKeys convert between the flat
 * "resource:action" key format used in the app and the JSON object format stored
 * in the OrganizationRole.permission column.
 *
 * @module
 */

export const DEFAULT_ORG_ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: [
    "files:upload",
    "files:download",
    "files:read",
    "files:delete",
    "files:metadata",
    "folders:read",
    "folders:write",
    "upload_tokens:create",
    "webhooks:read",
    "webhooks:write",
    "projects:read",
    "projects:update",
    "audit:read",
    "compliance:manage",
  ],
};

export function orgPermissionKeysToJson(keys: string[]): string {
  const grouped: Record<string, string[]> = {};
  for (const key of keys) {
    const colonIdx = key.indexOf(":");
    if (colonIdx < 1) continue;
    const resource = key.slice(0, colonIdx);
    const action = key.slice(colonIdx + 1);
    (grouped[resource] ??= []).push(action);
  }
  return JSON.stringify(grouped);
}

export function orgPermissionJsonToKeys(json: string): string[] {
  try {
    const parsed = JSON.parse(json) as Record<string, string[]>;
    return Object.entries(parsed).flatMap(([resource, actions]) =>
      actions.map((action) => `${resource}:${action}`),
    );
  } catch {
    return [];
  }
}
