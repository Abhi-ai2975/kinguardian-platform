/**
 * @module permissions
 * @description Authoritative list of all permission strings in the system.
 *              Used by seed scripts, the `buildUserContext` nav filter,
 *              org role permission management, and `getUserPermissions`.
 *
 * **Format:** `resource:action` (e.g. `patient:read`, `encounter:create`).
 *
 * **Resources defined:**
 * - `patient` — CRUD on patient profiles
 * - `practitioner` — CRUD on healthcare practitioners
 * - `appointment` — CRUD on appointments
 * - `encounter` — CRUD on clinical encounters
 * - `questionnaire_response` — CRUD on questionnaire responses
 * - `consultagent` — chatbot access
 * - `agent` — AI agent chat access
 *
 * @category Domain
 */

const permission = [
  "patient:create",
  "patient:read",
  "patient:update",
  "patient:delete",
  "practitioner:create",
  "practitioner:read",
  "practitioner:upadte",
  "practitioner:delete",
  "appointment:read",
  "appointment:create",
  "appointment:update",
  "appointment:delete",
  "encounter:create",
  "encounter:read",
  "encounter:update",
  "encounter:delete",
  "questionnaire_response:create",
  "questionnaire_response:read",
  "questionnaire_response:update",
  "questionnaire_response:delete",
  "consultagent:chat",
  "agent:chat",
];
