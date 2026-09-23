/**
 * IAM org-member server actions — read-only proxy to the sibling IAM app.
 *
 * Layer: presentation / actions
 * Resource: IAM org member (not a FHIR resource)
 *
 * Calls the IAM app's `GET /api/admin/org-members` endpoint directly
 * (cookie-forwarding pattern, same as `getServerSession`/`getAuthToken` in
 * `server/auth/`) rather than going through the fhir-gql DI/controller
 * layering — there's no swappable transport concern here (that layering
 * exists to support REST vs GraphQL fhir-gql clients), just a single
 * cross-app HTTP read.
 *
 * `adminProcedure` — only admins should see the org's user directory by
 * role; the IAM endpoint itself double-gates on superadmin/application-admin.
 */

"use server";

import { headers } from "next/headers";
import { z } from "zod";
import {
  ListOrgMembersByRoleValidationSchema,
  OrgMembersListResponseSchema,
  type TOrgMembersListResponse,
} from "@/modules/entities/schemas/iam";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";
import { adminProcedure } from "../procedures";

const ListOrgMembersByRoleActionSchema = z.object({
  payload: ListOrgMembersByRoleValidationSchema,
});
type TListOrgMembersByRoleAction = z.infer<typeof ListOrgMembersByRoleActionSchema>;

/**
 * Lists an organization's members that hold a given role (e.g. "doctor"),
 * by forwarding the caller's session cookie to the IAM app's admin
 * org-members endpoint. Used to let admins link a FHIR Practitioner record
 * to an already-enrolled IAM user account.
 */
export const listOrgMembersByRoleAction = adminProcedure
  .createServerAction()
  .input(ListOrgMembersByRoleActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TListOrgMembersByRoleAction }) => {
    return await runWithTransport<TOrgMembersListResponse>(async () => {
      const hdrs = await headers();
      const cookie = hdrs.get("cookie") ?? "";

      const url = new URL(`${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}/api/admin/org-members`);
      url.searchParams.set("orgId", input.payload.orgId);
      url.searchParams.set("rolename", input.payload.rolename);

      const res = await fetch(url, {
        headers: { cookie },
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`Failed to load org members: ${res.status}`);
      }

      const data = await res.json();
      const parsed = await OrgMembersListResponseSchema.parseAsync(data);
      return { result: parsed };
    });
  });
