import { prisma } from "../../../../prisma/db";
import { DEFAULT_ORG_ROLE_PERMISSIONS, orgPermissionJsonToKeys } from "./org-permissions";

export async function getUserPermissions(
  userId: string,
  organizationId: string,
): Promise<Set<string>> {
  const member = await prisma.member.findFirst({
    where: { userId, organizationId },
    select: { role: true },
  });

  if (!member) return new Set();

  const roles = member.role.split(",").map((r) => r.trim()).filter(Boolean);

  const orgRoles = await prisma.organizationRole.findMany({
    where: { organizationId, role: { in: roles } },
    select: { permission: true },
  });

  // Fallback for orgs that existed before default roles were seeded:
  // only owners get a fallback — every other role gets no permissions
  // until explicitly granted via the invite flow.
  if (orgRoles.length === 0) {
    if (roles.includes("owner")) {
      return new Set(DEFAULT_ORG_ROLE_PERMISSIONS.owner);
    }
    return new Set();
  }

  const keys: string[] = [];
  for (const row of orgRoles) {
    keys.push(...orgPermissionJsonToKeys(row.permission));
  }
  return new Set(keys);
}
