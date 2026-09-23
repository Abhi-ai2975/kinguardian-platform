// admin-db.ts — pg queries for admin-level organisation and platform data.
//
// The console and IAM share the same PostgreSQL database. Rather than
// proxying every read through IAM (which only exposes user operations via
// Better Auth's admin REST API), we query org tables directly. This keeps
// the admin overview and org detail pages fast without an extra hop.
import { Pool } from "pg";

const globalForPg = globalThis as unknown as { adminPool?: Pool };

const pool =
  globalForPg.adminPool ??
  new Pool({ connectionString: process.env.DATABASE_URL });

if (process.env.NODE_ENV !== "production") {
  globalForPg.adminPool = pool;
}

// AdminOrg is a row from the organisations list query.
export interface AdminOrg {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  createdAt: string;
  memberCount: number;
  plan: string | null;
  subscriptionStatus: string | null;
}

// AdminOrgDetail extends AdminOrg with the member list.
export interface AdminOrgDetail extends AdminOrg {
  members: AdminOrgMember[];
}

export interface AdminOrgMember {
  memberId: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  joinedAt: string;
}

export interface PlatformCounts {
  userCount: number;
  orgCount: number;
}

// listOrgs returns all organisations with member count and active subscription.
export async function listOrgs(): Promise<AdminOrg[]> {
  const { rows } = await pool.query<AdminOrg>(`
    SELECT
      o.id,
      o.name,
      o.slug,
      o.logo,
      o."createdAt",
      COUNT(DISTINCT m.id)::int AS "memberCount",
      s.plan,
      s.status AS "subscriptionStatus"
    FROM organization o
    LEFT JOIN member m ON m."organizationId" = o.id
    LEFT JOIN subscription s ON s."referenceId" = o.id AND s.status IN ('active','trialing')
    GROUP BY o.id, o.name, o.slug, o.logo, o."createdAt", s.plan, s.status
    ORDER BY o."createdAt" DESC
  `);
  return rows;
}

// getOrg returns a single org with its full member list.
export async function getOrg(orgId: string): Promise<AdminOrgDetail | null> {
  const { rows: orgRows } = await pool.query(
    `
    SELECT
      o.id,
      o.name,
      o.slug,
      o.logo,
      o."createdAt",
      COUNT(DISTINCT m.id)::int AS "memberCount",
      s.plan,
      s.status AS "subscriptionStatus"
    FROM organization o
    LEFT JOIN member m ON m."organizationId" = o.id
    LEFT JOIN subscription s ON s."referenceId" = o.id AND s.status IN ('active','trialing')
    WHERE o.id = $1
    GROUP BY o.id, o.name, o.slug, o.logo, o."createdAt", s.plan, s.status
  `,
    [orgId]
  );

  if (orgRows.length === 0) return null;

  const { rows: memberRows } = await pool.query(
    `
    SELECT
      m.id AS "memberId",
      m."userId",
      u.name AS "userName",
      u.email AS "userEmail",
      m.role,
      m."createdAt" AS "joinedAt"
    FROM member m
    JOIN "user" u ON u.id = m."userId"
    WHERE m."organizationId" = $1
    ORDER BY m."createdAt" ASC
  `,
    [orgId]
  );

  return { ...orgRows[0], members: memberRows };
}

// getPlatformCounts returns total user and org counts for the overview page.
export async function getPlatformCounts(): Promise<PlatformCounts> {
  const { rows } = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM "user") AS "userCount",
      (SELECT COUNT(*)::int FROM organization) AS "orgCount"
  `);
  return rows[0];
}

// getRecentOrgs returns the most recently created organisations.
export async function getRecentOrgs(
  limit = 5
): Promise<Pick<AdminOrg, "id" | "name" | "slug" | "createdAt">[]> {
  const { rows } = await pool.query(
    `SELECT id, name, slug, "createdAt" FROM organization ORDER BY "createdAt" DESC LIMIT $1`,
    [limit]
  );
  return rows;
}
