/**
 * Seed script: Telemedicine Application-Admin role + Menu, Resource, Actions, Org Role Permissions
 *
 * Single command:
 *   pnpm seed:app-admin-menu        (uses DATABASE_URL from process env)
 *   pnpm seed:app-admin-menu:dev    (loads .env first)
 *
 * Idempotent — safe to re-run.
 *
 * isVisible = false nodes are NOT shown in the sidebar nav but their
 * permission key is still assigned to the org role for route protection.
 *
 * Menu structure:
 *   APPLICATION ADMIN (group)
 *     ├─ Dashboard                                     isVisible: true
 *     ├─ Manage Doctors                                isVisible: true
 *     └─ Manage Doctor (dynamic :type route)           isVisible: false
 */

import { PrismaClient } from "../prisma/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { randomUUID } from "crypto";

// ------------------------------------------------------------------ //
// Database
// ------------------------------------------------------------------ //

const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? "" });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ------------------------------------------------------------------ //
// Constants
// ------------------------------------------------------------------ //

const APP_SLUG = "telemedicine";
const APP_NAME = "Telemedicine";

const ORG_SLUG = "drgodly";
const ADMIN_ROLE = "application-admin";

// ------------------------------------------------------------------ //
// Menu definition
// ------------------------------------------------------------------ //

const TOP_GROUP = { label: "APPLICATION ADMIN", slug: "app-admin" };

const MENU_ITEMS: {
  label: string;
  slug: string;
  href: string;
  icon: string;
  isVisible: boolean;
}[] = [
  {
    label: "Dashboard",
    slug: "app-admin-dashboard",
    href: "/bezs/telemedicine/admin",
    icon: "layout-dashboard",
    isVisible: true,
  },
  {
    label: "Manage Doctors",
    slug: "app-admin-manage-doctors",
    href: "/bezs/telemedicine/admin/manage-doctors",
    icon: "hospital",
    isVisible: true,
  },
  {
    label: "Manage Doctor",
    slug: "app-admin-manage-doctor-type",
    href: "/bezs/telemedicine/admin/manage-doctors/:type",
    icon: "hospital",
    isVisible: false, // dynamic route — permission key only, not shown in nav
  },
];

// ------------------------------------------------------------------ //
// Helpers
// ------------------------------------------------------------------ //

function permKey(itemSlug: string): string {
  return `${itemSlug}:read`;
}

// ------------------------------------------------------------------ //
// Main
// ------------------------------------------------------------------ //

async function main() {
  // ── Phase 1: App ──────────────────────────────────────────────────
  console.log("\n━━━ Phase 1: Telemedicine App ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const app = await prisma.app.upsert({
    where: { slug: APP_SLUG },
    create: {
      name: APP_NAME,
      slug: APP_SLUG,
      description: "Telemedicine portal navigation",
      isActive: true,
    },
    update: {
      name: APP_NAME,
      description: "Telemedicine portal navigation",
      isActive: true,
    },
  });
  console.log(`\n  App: "${app.name}" (${app.id})`);

  // ── Phase 2: Menu nodes ───────────────────────────────────────────
  console.log(
    "\n━━━ Phase 2: Application Admin Menu Nodes ━━━━━━━━━━━━━━━━━━━━━",
  );

  const topGroup = await prisma.appMenuNode.upsert({
    where: { appId_slug: { appId: app.id, slug: TOP_GROUP.slug } },
    create: {
      appId: app.id,
      label: TOP_GROUP.label,
      slug: TOP_GROUP.slug,
      type: "GROUP",
      order: 0,
      isVisible: true,
      permissionKeys: [],
    },
    update: { label: TOP_GROUP.label },
  });
  console.log(`\n  GROUP: "${TOP_GROUP.label}" (${topGroup.id})`);

  for (let i = 0; i < MENU_ITEMS.length; i++) {
    const item = MENU_ITEMS[i]!;
    await prisma.appMenuNode.upsert({
      where: { appId_slug: { appId: app.id, slug: item.slug } },
      create: {
        appId: app.id,
        parentId: topGroup.id,
        label: item.label,
        slug: item.slug,
        href: item.href,
        icon: item.icon,
        type: "ITEM",
        order: i,
        isVisible: item.isVisible,
        permissionKeys: [],
      },
      update: {
        parentId: topGroup.id,
        label: item.label,
        href: item.href,
        icon: item.icon,
        order: i,
        isVisible: item.isVisible,
      },
    });
    const visibilityTag = item.isVisible ? "" : " [hidden — permission only]";
    console.log(`    ITEM: "${item.label}" → ${item.href}${visibilityTag}`);
  }

  // ── Phase 3: drgodly org ──────────────────────────────────────────
  console.log("\n━━━ Phase 3: drgodly Org ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const org = await prisma.organization.findUnique({
    where: { slug: ORG_SLUG },
  });
  if (!org) {
    console.error(
      `\n  ERROR: Organization "${ORG_SLUG}" not found. Run seed:admin first.\n`,
    );
    process.exit(1);
  }
  console.log(`\n  Found org: "${org.name}" (${org.id})`);

  // ── Phase 4: Resource + ResourceActions ───────────────────────────
  console.log("\n━━━ Phase 4: Resource & Actions ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const resource = await prisma.resource.upsert({
    where: { name: "telemedicine-app-admin" },
    create: {
      name: "telemedicine-app-admin",
      description: "Telemedicine application admin features",
    },
    update: { description: "Telemedicine application admin features" },
  });
  console.log(`\n  Resource: "${resource.name}" (${resource.id})`);

  for (const item of MENU_ITEMS) {
    const key = permKey(item.slug);
    const ra = await prisma.resourceAction.upsert({
      where: { key },
      create: {
        resourceId: resource.id,
        name: item.label,
        key,
        description: `Read access to ${item.label}`,
      },
      update: {
        name: item.label,
        description: `Read access to ${item.label}`,
      },
    });
    console.log(`  Action: ${ra.key}`);
  }

  // ── Phase 5: AppResource link ─────────────────────────────────────
  console.log("\n━━━ Phase 5: AppResource Link ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  await prisma.appResource.upsert({
    where: { appId_resourceId: { appId: app.id, resourceId: resource.id } },
    create: { appId: app.id, resourceId: resource.id },
    update: {},
  });
  console.log(`\n  "${resource.name}" linked to app "${app.name}"`);

  // ── Phase 6: Set permissionKeys on each ITEM menu node ────────────
  console.log("\n━━━ Phase 6: Menu Node permissionKeys ━━━━━━━━━━━━━━━━━━━━━━━");

  for (const item of MENU_ITEMS) {
    const key = permKey(item.slug);
    const { count } = await prisma.appMenuNode.updateMany({
      where: { appId: app.id, slug: item.slug },
      data: { permissionKeys: [key] },
    });
    if (count > 0) {
      console.log(`\n  "${item.slug}" → [${key}]`);
    } else {
      console.warn(`\n  WARN: No node for slug "${item.slug}"`);
    }
  }

  // ── Phase 7: OrganizationRole — application-admin ─────────────────
  //
  // All items (including hidden ones) contribute to the permission map
  // so the role can access dynamic routes even though they're not in the nav.
  //
  console.log("\n━━━ Phase 7: Org Role Permissions ━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const permissionMap: Record<string, string[]> = {};
  for (const item of MENU_ITEMS) {
    permissionMap[item.slug] = ["read"];
  }
  const permissionJson = JSON.stringify(permissionMap);

  const existingOrgRole = await prisma.organizationRole.findFirst({
    where: { organizationId: org.id, role: ADMIN_ROLE },
  });

  if (existingOrgRole) {
    await prisma.organizationRole.update({
      where: { id: existingOrgRole.id },
      data: { permission: permissionJson },
    });
    console.log(`\n  Role "${ADMIN_ROLE}" updated (existing).`);
  } else {
    await prisma.organizationRole.create({
      data: {
        id: randomUUID(),
        organizationId: org.id,
        role: ADMIN_ROLE,
        permission: permissionJson,
      },
    });
    console.log(`\n  Role "${ADMIN_ROLE}" created.`);
  }

  const grantedKeys = MENU_ITEMS.map((i) => permKey(i.slug));
  console.log(`\n  Granted ${grantedKeys.length} permissions:`);
  console.log(`  ${grantedKeys.join(", ")}`);

  // ── Summary ───────────────────────────────────────────────────────
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✓ Seed complete.\n");
  console.log("  App:        ", APP_NAME, `(slug: ${APP_SLUG})`);
  console.log("  Org:        ", org.name, `(slug: ${ORG_SLUG})`);
  console.log("  Role:       ", ADMIN_ROLE);
  console.log("  Permissions:", grantedKeys.join(", "));
  console.log(
    "  Hidden items (nav):",
    MENU_ITEMS.filter((i) => !i.isVisible)
      .map((i) => i.slug)
      .join(", ") || "none",
  );
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
