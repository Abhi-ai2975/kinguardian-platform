/**
 * IAM org-member schemas.
 *
 * Layer: entities / schemas / iam
 *
 * Not a FHIR resource — this mirrors the response shape of the sibling IAM
 * app's `GET /api/admin/org-members` endpoint (Better Auth `Member`/`User`
 * records), used to let drgodly admins pick an already-enrolled IAM user
 * (e.g. a "doctor") when linking a FHIR Practitioner record to a login
 * account. Read-only — drgodly never creates/updates IAM users directly.
 */

import { z } from "zod";

/** A single organization member record returned by the IAM org-members endpoint. */
export const OrgMemberResponseSchema = z.object({
  memberId: z.string(),
  role: z.string(),
  joinedAt: z.string(),
  /** Better Auth user id — a string, not a numeric FHIR id. */
  userId: z.string(),
  name: z.string().nullish(),
  email: z.string().nullish(),
  image: z.string().nullish(),
});
export type TOrgMemberResponse = z.infer<typeof OrgMemberResponseSchema>;

/** Response envelope from `GET /api/admin/org-members`. */
export const OrgMembersListResponseSchema = z.object({
  members: z.array(OrgMemberResponseSchema),
});
export type TOrgMembersListResponse = z.infer<typeof OrgMembersListResponseSchema>;

/** Query params for listing org members by role. */
export const ListOrgMembersByRoleValidationSchema = z.object({
  orgId: z.string().min(1),
  rolename: z.string().min(1),
});
export type TListOrgMembersByRoleQuery = z.infer<typeof ListOrgMembersByRoleValidationSchema>;
