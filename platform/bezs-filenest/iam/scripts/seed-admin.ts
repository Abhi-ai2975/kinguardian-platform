/**
 * Seed script: Admin app menu + admin user, organization, resources, and permissions.
 *
 * Single command — does everything in order:
 *   pnpm seed:admin
 *
 * Idempotent — safe to re-run.
 */

import { PrismaClient } from "../prisma/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { randomUUID } from "crypto";

// ------------------------------------------------------------------ //
// Database
// ------------------------------------------------------------------ //

const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? "" });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ------------------------------------------------------------------ //
// Minimal BetterAuth instance — no nextCookies / no server-only
// Used only for password-compatible user creation.
// ------------------------------------------------------------------ //

const seedAuth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
});

// ------------------------------------------------------------------ //
// Menu definition (source of truth — mirrors adminSidebarData)
// ------------------------------------------------------------------ //

const ADMIN_MENU: {
  label: string;
  slug: string;
  icon: string;
  isVisible: boolean;
  children: {
    label: string;
    slug: string;
    href: string;
    icon: string;
    isVisible: boolean;
  }[];
}[] = [
  {
    label: "OVERVIEW",
    slug: "overview",
    icon: "home",
    isVisible: true,
    children: [
      {
        label: "Dashboard",
        slug: "dashboard",
        href: "/admin",
        icon: "layout-dashboard",
        isVisible: true,
      },
    ],
  },
  {
    label: "IDENTITY",
    slug: "identity",
    icon: "id-card",
    isVisible: true,
    children: [
      { label: "Users", slug: "users", href: "/admin/users", icon: "users", isVisible: true },
      {
        label: "Organizations",
        slug: "organizations",
        href: "/admin/organizations",
        icon: "building-2",
        isVisible: true,
      },
      {
        label: "User Context",
        slug: "user-context",
        href: "/admin/user-context",
        icon: "layers",
        isVisible: true,
      },
    ],
  },
  {
    label: "AUTHORIZATION",
    slug: "authorization",
    icon: "shield",
    isVisible: true,
    children: [
      {
        label: "Resources",
        slug: "resources",
        href: "/admin/resources",
        icon: "database",
        isVisible: true,
      },
      {
        label: "Actions",
        slug: "resource-actions",
        href: "/admin/resource-actions",
        icon: "zap",
        isVisible: true,
      },
    ],
  },
  {
    label: "APPLICATION BUILDER",
    slug: "application-builder",
    icon: "wrench",
    isVisible: true,
    children: [
      { label: "Apps", slug: "apps", href: "/admin/apps", icon: "grid", isVisible: true },
    ],
  },
  {
    label: "APPLICATION",
    slug: "application",
    icon: "app-window",
    isVisible: true,
    children: [
      {
        label: "OAuth Clients",
        slug: "oauth-clients",
        href: "/admin/oauth-clients",
        icon: "globe",
        isVisible: true,
      },
      {
        label: "Agent Auth",
        slug: "agent-auth",
        href: "/admin/agent-auth",
        icon: "bot",
        isVisible: true,
      },
      {
        label: "Consents",
        slug: "consents",
        href: "/admin/consents",
        icon: "file-check",
        isVisible: true,
      },
      {
        label: "API Keys",
        slug: "api-keys",
        href: "/admin/api-keys",
        icon: "key",
        isVisible: true,
      },
    ],
  },
  {
    label: "SECURITY",
    slug: "security",
    icon: "shield-check",
    isVisible: true,
    children: [
      {
        label: "Sessions",
        slug: "sessions",
        href: "/admin/sessions",
        icon: "activity",
        isVisible: true,
      },
      {
        label: "Audit Logs",
        slug: "audit-logs",
        href: "/admin/audit-logs",
        icon: "scroll-text",
        isVisible: true,
      },
      {
        label: "Security Policies",
        slug: "security-policies",
        href: "/admin/security-policies",
        icon: "shield-check",
        isVisible: true,
      },
    ],
  },
];

// ------------------------------------------------------------------ //
// Constants
// ------------------------------------------------------------------ //

const ADMIN_EMAIL = "testuser.gnr@gmail.com";
const ADMIN_PASSWORD = "12345678";
const ADMIN_NAME = "Admin User";

const ORG_NAME = "Superadmin";
const ORG_SLUG = "superadmin";
const ORG_ROLE = "superadmin";
const RESOURCE_NAME = "superadmin";

// ------------------------------------------------------------------ //
// Main
// ------------------------------------------------------------------ //

async function main() {
  // ── Phase 1: App + Menu nodes ─────────────────────────────────────
  console.log("\n━━━ Phase 1: Admin App & Menu ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const app = await prisma.app.upsert({
    where: { slug: "admin" },
    create: {
      name: "Admin",
      slug: "admin",
      description: "Admin portal navigation",
      isActive: true,
    },
    update: {
      name: "Admin",
      description: "Admin portal navigation",
      isActive: true,
    },
  });
  console.log(`\n  App: "${app.name}" (${app.id})`);

  for (let gi = 0; gi < ADMIN_MENU.length; gi++) {
    const group = ADMIN_MENU[gi]!;

    const groupVisible = group.isVisible ?? true;
    const groupNode = await prisma.appMenuNode.upsert({
      where: { appId_slug: { appId: app.id, slug: group.slug } },
      create: {
        appId: app.id,
        label: group.label,
        slug: group.slug,
        icon: group.icon,
        type: "GROUP",
        order: gi,
        isVisible: groupVisible,
        permissionKeys: [],
      },
      update: { label: group.label, icon: group.icon, order: gi, isVisible: groupVisible },
    });
    console.log(`\n  GROUP: "${group.label}"`);

    for (let ii = 0; ii < group.children.length; ii++) {
      const item = group.children[ii]!;
      const itemVisible = item.isVisible ?? true;
      await prisma.appMenuNode.upsert({
        where: { appId_slug: { appId: app.id, slug: item.slug } },
        create: {
          appId: app.id,
          parentId: groupNode.id,
          label: item.label,
          slug: item.slug,
          href: item.href,
          icon: item.icon,
          type: "ITEM",
          order: ii,
          isVisible: itemVisible,
          permissionKeys: [],
        },
        update: {
          parentId: groupNode.id,
          label: item.label,
          href: item.href,
          icon: item.icon,
          order: ii,
          isVisible: itemVisible,
        },
      });
      const tag = itemVisible ? "" : " [hidden — permission only]";
      console.log(`    ITEM: "${item.label}" → ${item.href}${tag}`);
    }
  }

  // ── Phase 2: Admin user ───────────────────────────────────────────
  console.log("\n━━━ Phase 2: Admin User ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  let userId: string;
  const existing = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  if (existing) {
    userId = existing.id;
    console.log(`\n  Already exists: ${ADMIN_EMAIL} (${userId})`);
  } else {
    const res = await seedAuth.api.signUpEmail({
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, name: ADMIN_NAME },
    });
    userId = res.user.id;
    console.log(`\n  Created: ${ADMIN_EMAIL} (${userId})`);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role: "superadmin" },
  });
  console.log("  Global role set → superadmin");

  // ── Phase 3a: Superadmin organization ────────────────────────────
  console.log(
    "\n━━━ Phase 3a: Superadmin Organization ━━━━━━━━━━━━━━━━━━━━━━━",
  );

  const org = await prisma.organization.upsert({
    where: { slug: ORG_SLUG },
    create: {
      id: randomUUID(),
      name: ORG_NAME,
      slug: ORG_SLUG,
      createdAt: new Date(),
    },
    update: { name: ORG_NAME },
  });
  console.log(`\n  "${org.name}" (${org.id})`);

  const existingMember = await prisma.member.findFirst({
    where: { organizationId: org.id, userId },
  });
  if (existingMember) {
    await prisma.member.update({
      where: { id: existingMember.id },
      data: { role: ORG_ROLE },
    });
    console.log(`  Member role updated → "${ORG_ROLE}"`);
  } else {
    await prisma.member.create({
      data: {
        id: randomUUID(),
        organizationId: org.id,
        userId,
        role: ORG_ROLE,
        createdAt: new Date(),
      },
    });
    console.log(`  Member added with role "${ORG_ROLE}"`);
  }

  // ── Phase 3b: filenest organization ──────────────────────────────
  console.log(
    "\n━━━ Phase 3b: filenest Organization ━━━━━━━━━━━━━━━━━━━━━━━━━━",
  );

  const filenestOrg = await prisma.organization.upsert({
    where: { slug: "filenest" },
    create: {
      id: randomUUID(),
      name: "FileNest",
      slug: "filenest",
      createdAt: new Date(),
    },
    update: { name: "FileNest" },
  });
  console.log(`\n  "${filenestOrg.name}" (${filenestOrg.id})`);

  const existingFilenestMember = await prisma.member.findFirst({
    where: { organizationId: filenestOrg.id, userId },
  });
  if (existingFilenestMember) {
    await prisma.member.update({
      where: { id: existingFilenestMember.id },
      data: { role: "owner" },
    });
    console.log(`  Member role updated → "owner"`);
  } else {
    await prisma.member.create({
      data: {
        id: randomUUID(),
        organizationId: filenestOrg.id,
        userId,
        role: "owner",
        createdAt: new Date(),
      },
    });
    console.log(`  Member added with role "owner"`);
  }

  // ── Phase 4: Resource + ResourceActions ───────────────────────────
  console.log("\n━━━ Phase 4: Resource & Actions ━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const resource = await prisma.resource.upsert({
    where: { name: RESOURCE_NAME },
    create: {
      name: RESOURCE_NAME,
      description: "Full access to all admin portal features",
    },
    update: { description: "Full access to all admin portal features" },
  });
  console.log(`\n  Resource: "${resource.name}" (${resource.id})`);

  // Collect all ITEM nodes from the menu definition
  const allItems = ADMIN_MENU.flatMap((g) => g.children);

  for (const item of allItems) {
    const key = `${RESOURCE_NAME}:${item.slug}`;
    const ra = await prisma.resourceAction.upsert({
      where: { key },
      create: {
        resourceId: resource.id,
        name: item.label,
        key,
        description: `Access to the ${item.label} admin page`,
      },
      update: {
        name: item.label,
        description: `Access to the ${item.label} admin page`,
      },
    });
    console.log(`  Action: ${ra.key}`);
  }

  // ── Phase 5: AppResource link ─────────────────────────────────────
  console.log("\n━━━ Phase 5: AppResource Link ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  await prisma.appResource.upsert({
    where: { appId_resourceId: { appId: app.id, resourceId: resource.id } },
    create: { appId: app.id, resourceId: resource.id },
    update: {},
  });
  console.log(`\n  "${resource.name}" linked to app "${app.name}"`);

  // ── Phase 6: Set permissionKeys on each ITEM menu node ────────────
  console.log("\n━━━ Phase 6: Menu Node permissionKeys ━━━━━━━━━━━━━━━━━━━━━━");

  for (const item of allItems) {
    const key = `${RESOURCE_NAME}:${item.slug}`;
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

  // ── Phase 7: OrganizationRole permissions ─────────────────────────
  //
  // getUserPermissions() parses `permission` as JSON:
  //   { "superadmin": ["dashboard", "users", ...] }
  // → produces keys like "superadmin:dashboard", "superadmin:users", ...
  //
  console.log("\n━━━ Phase 7: Org Role Permissions ━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const allActions = allItems.map((item) => item.slug);
  const permissionJson = JSON.stringify({ [RESOURCE_NAME]: allActions });

  const existingOrgRole = await prisma.organizationRole.findFirst({
    where: { organizationId: org.id, role: ORG_ROLE },
  });

  if (existingOrgRole) {
    await prisma.organizationRole.update({
      where: { id: existingOrgRole.id },
      data: { permission: permissionJson },
    });
  } else {
    await prisma.organizationRole.create({
      data: {
        id: randomUUID(),
        organizationId: org.id,
        role: ORG_ROLE,
        permission: permissionJson,
      },
    });
  }
  console.log(
    `\n  Role "${ORG_ROLE}" granted ${allActions.length} permissions:`,
  );
  console.log(`  ${allActions.map((a) => `${RESOURCE_NAME}:${a}`).join(", ")}`);

  // ── Summary ───────────────────────────────────────────────────────
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✓ Seed complete.\n");
  console.log("  Email:    ", ADMIN_EMAIL);
  console.log("  Password: ", ADMIN_PASSWORD);
  console.log("  Role:     ", "superadmin");
  console.log(
    "  Orgs:     ",
    `${ORG_NAME} (role: ${ORG_ROLE}), FileNest (role: owner)`,
  );
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
