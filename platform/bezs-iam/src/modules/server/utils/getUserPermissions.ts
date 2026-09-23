import { prisma } from "../../../../prisma/db";

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

  const keys: string[] = [];
  for (const row of orgRoles) {
    try {
      const parsed = JSON.parse(row.permission) as Record<string, string[]>;
      for (const [resource, actions] of Object.entries(parsed)) {
        for (const action of actions) {
          keys.push(`${resource}:${action}`);
        }
      }
    } catch {
      // skip malformed rows
    }
  }
  return new Set(keys);
}
