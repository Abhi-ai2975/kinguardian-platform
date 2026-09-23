/**
 * Seed script: Admin App + Menu Nodes
 *
 * Run with:
 *   pnpm tsx --env-file=.env scripts/seed-admin-menu.ts
 */

import { PrismaClient } from "../prisma/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? "" });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ------------------------------------------------------------------ //
// Menu definition — mirrors adminSidebarData
// type: "GROUP" = section header with children
// type: "ITEM"  = leaf link
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

async function main() {
  console.log("Seeding admin app and menu nodes...");

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

  console.log(`App: "${app.name}" (${app.id})`);

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
      update: {
        label: group.label,
        icon: group.icon,
        order: gi,
        isVisible: groupVisible,
      },
    });

    console.log(`  GROUP: "${group.label}" (${groupNode.id})`);

    for (let ii = 0; ii < group.children.length; ii++) {
      const item = group.children[ii]!;
      const itemVisible = item.isVisible ?? true;

      const itemNode = await prisma.appMenuNode.upsert({
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
      console.log(`    ITEM: "${item.label}" → ${item.href} (${itemNode.id})${tag}`);
    }
  }

  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
