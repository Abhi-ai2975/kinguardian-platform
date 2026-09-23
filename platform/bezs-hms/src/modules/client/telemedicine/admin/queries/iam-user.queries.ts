/**
 * iam-user.queries — TanStack Query fetcher for IAM org-member data.
 *
 * Layer: client / telemedicine / admin / queries
 *
 * Not a FHIR resource — backs the ReferenceSelect picker used by
 * Practitioner's `user_id` field so an admin can search-and-pick an
 * already-enrolled IAM user (e.g. a "doctor") by name/email instead of
 * typing a raw Better Auth user id blind. Calls `listOrgMembersByRoleAction`,
 * which forwards the request to the sibling IAM app's admin org-members
 * endpoint — see `server/presentation/actions/iam/org-member.actions.ts`.
 */

import { listOrgMembersByRoleAction } from "@/modules/server/presentation/actions/iam";
import type { TOrgMemberResponse } from "@/modules/entities/schemas/iam";
import type { TReferenceOption } from "@/modules/client/shared/components/ReferenceSelect";

/** Composes a display label from an org member's name/email. */
function orgMemberLabel(member: TOrgMemberResponse): string {
  if (member.name && member.email) return `${member.name} (${member.email})`;
  return member.name ?? member.email ?? member.userId;
}

/**
 * Searches the tenant's "doctor" role members by name/email for the
 * ReferenceSelect picker on Practitioner.user_id. The IAM endpoint filters
 * by role server-side but has no text search, so this filters client-side
 * against the composed label.
 *
 * @param query - Search text; case-insensitive substring match on the composed label.
 * @param orgId - Active organization ID — required, the IAM endpoint is org-scoped.
 * @returns Up to 50 matching org members as {id, label} options (id is the Better Auth user id — a string).
 * @throws Error with the server action's error message on failure.
 */
export async function searchDoctorUserOptions(
  query: string,
  orgId: string | null,
): Promise<TReferenceOption[]> {
  if (!orgId) return [];

  const [data, err] = await listOrgMembersByRoleAction({
    payload: { orgId, rolename: "doctor" },
  });
  if (err) throw new Error(err.message ?? "Failed to load doctor users");

  const q = query.trim().toLowerCase();

  return (data?.members ?? [])
    .filter((m: TOrgMemberResponse) => !q || orgMemberLabel(m).toLowerCase().includes(q))
    .slice(0, 50)
    .map((m: TOrgMemberResponse) => ({ id: m.userId, label: orgMemberLabel(m) }));
}
