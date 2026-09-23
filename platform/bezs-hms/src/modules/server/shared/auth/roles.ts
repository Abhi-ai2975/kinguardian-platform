/**
 * Role permission groups — central registry mapping logical group names to the
 * raw Better Auth role strings that qualify for each group.
 *
 * Layer: server / shared / auth
 *
 * Why this exists:
 *  Better Auth assigns raw role strings (e.g. "application-admin") to users.
 *  Application code should never hardcode those strings directly — if a role
 *  name changes, or a second role is granted the same privileges, only this
 *  file needs to change.
 *
 * Usage:
 *  - Procedures: `ROLES["telemedicine-admin"]` in adminProcedure
 *  - Route guards: pass the RoleGroup key to requireRole()
 *
 * To add a new permission group:
 *  1. Add a key here with the raw role strings that satisfy it.
 *  2. Create a corresponding procedure in procedures.ts (or reuse an existing one).
 *  3. Add a layout guard using requireRole() for any new route group.
 */

/**
 * Maps each logical permission group to the Better Auth role strings
 * whose holders are permitted to act under that group.
 */
export const ROLES = {
  /** Full administrative access to the telemedicine application. */
  "telemedicine-admin": ["application-admin"],
} as const;

/** Union of all defined permission group keys. */
export type RoleGroup = keyof typeof ROLES;
