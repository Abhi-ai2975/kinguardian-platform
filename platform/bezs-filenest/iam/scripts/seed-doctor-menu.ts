/**
 * Seed script: Telemedicine Doctor App + Menu, Resource, Actions, Org Role Permissions
 *
 * Single command — does everything in order:
 *   pnpm seed:doctor-menu
 *
 * Idempotent — safe to re-run.
 *
 * Permission key format: <item-slug>:read
 *   e.g. doctor-dashboard:read, doctor-services:read, doctor-availability:read, doctor-profile:read
 *
 * Menu structure (mirrors doctor sidebar):
 *   DOCTOR (group)
 *     ├─ Dashboard          (item)
 *     ├─ Professional Settings (group)
 *     │    ├─ Services      (item)
 *     │    └─ Availability  (item)
 *     └─ Settings           (group)
 *          └─ Profile       (item)
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
const DOCTOR_ROLE = "doctor";

// ------------------------------------------------------------------ //
// Menu definition
// ------------------------------------------------------------------ //

const TOP_GROUP = { label: "DOCTOR", slug: "doctor", isVisible: true };

/** Items hanging directly from the top group */
const DIRECT_ITEMS: {
  label: string;
  slug: string;
  href: string;
  icon: string;
  isVisible: boolean;
}[] = [
  {
    label: "Dashboard",
    slug: "doctor-dashboard",
    href: "/bezs/telemedicine/doctor",
    icon: "layout-dashboard",
    isVisible: true,
  },
  {
    label: "Appointments",
    slug: "doctor-appointments",
    href: "/bezs/telemedicine/doctor/appointments",
    icon: "calendar-plus",
    isVisible: true,
  },
  {
    label: "Online Consultation",
    slug: "doctor-online-consultation",
    href: "/bezs/telemedicine/doctor/appointments/online-consultation",
    icon: "hospital",
    isVisible: false, // dynamic route — permission key only, not shown in nav
  },
];

/** Sub-groups and their leaf items */
const SUB_GROUPS: {
  label: string;
  slug: string;
  icon: string;
  isVisible: boolean;
  items: {
    label: string;
    slug: string;
    href: string;
    icon: string;
    isVisible: boolean;
  }[];
}[] = [
  {
    label: "Professional Settings",
    slug: "doctor-professional-settings",
    icon: "stethoscope",
    isVisible: true,
    items: [
      {
        label: "Services",
        slug: "doctor-services",
        href: "/bezs/telemedicine/doctor/settings/services",
        icon: "briefcase-medical",
        isVisible: true,
      },
      {
        label: "Availability",
        slug: "doctor-availability",
        href: "/bezs/telemedicine/doctor/settings/availability",
        icon: "calendar-clock",
        isVisible: true,
      },
    ],
  },
  {
    label: "Settings",
    slug: "doctor-settings",
    icon: "settings-2",
    isVisible: true,
    items: [
      {
        label: "Profile",
        slug: "doctor-profile",
        href: "/bezs/telemedicine/doctor/settings/profile",
        icon: "user-cog",
        isVisible: true,
      },
    ],
  },
];

// All leaf items (the ones that get permission keys)
const ALL_LEAF_ITEMS = [...DIRECT_ITEMS, ...SUB_GROUPS.flatMap((g) => g.items)];

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
  console.log("\n━━━ Phase 2: Doctor Menu Nodes ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Top-level group: DOCTOR
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
    update: { label: TOP_GROUP.label, isVisible: true },
  });
  console.log(`\n  GROUP: "${TOP_GROUP.label}" (${topGroup.id})`);

  // Direct items under top group
  for (let i = 0; i < DIRECT_ITEMS.length; i++) {
    const item = DIRECT_ITEMS[i]!;
    const isVisible = item.isVisible ?? true;
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
        isVisible,
        permissionKeys: [],
      },
      update: {
        parentId: topGroup.id,
        label: item.label,
        href: item.href,
        icon: item.icon,
        order: i,
        isVisible,
      },
    });
    const tag = isVisible ? "" : " [hidden — permission only]";
    console.log(`    ITEM: "${item.label}" → ${item.href}${tag}`);
  }

  // Sub-groups and their items
  for (let gi = 0; gi < SUB_GROUPS.length; gi++) {
    const subGroup = SUB_GROUPS[gi]!;

    const subGroupVisible = subGroup.isVisible ?? true;
    const subGroupNode = await prisma.appMenuNode.upsert({
      where: { appId_slug: { appId: app.id, slug: subGroup.slug } },
      create: {
        appId: app.id,
        parentId: topGroup.id,
        label: subGroup.label,
        slug: subGroup.slug,
        icon: subGroup.icon,
        type: "GROUP",
        order: DIRECT_ITEMS.length + gi,
        isVisible: subGroupVisible,
        permissionKeys: [],
      },
      update: {
        parentId: topGroup.id,
        label: subGroup.label,
        icon: subGroup.icon,
        order: DIRECT_ITEMS.length + gi,
        isVisible: subGroupVisible,
      },
    });
    console.log(`\n  SUB-GROUP: "${subGroup.label}" (${subGroupNode.id})`);

    for (let ii = 0; ii < subGroup.items.length; ii++) {
      const item = subGroup.items[ii]!;
      const itemVisible = item.isVisible ?? true;
      await prisma.appMenuNode.upsert({
        where: { appId_slug: { appId: app.id, slug: item.slug } },
        create: {
          appId: app.id,
          parentId: subGroupNode.id,
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
          parentId: subGroupNode.id,
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
  console.log(
    "\n━━━ Phase 4: Resource & Actions ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  );

  const resource = await prisma.resource.upsert({
    where: { name: "telemedicine-doctor" },
    create: {
      name: "telemedicine-doctor",
      description: "Telemedicine doctor portal features",
    },
    update: { description: "Telemedicine doctor portal features" },
  });
  console.log(`\n  Resource: "${resource.name}" (${resource.id})`);

  for (const item of ALL_LEAF_ITEMS) {
    const key = permKey(item.slug);
    const ra = await prisma.resourceAction.upsert({
      where: { key },
      create: {
        resourceId: resource.id,
        name: item.label,
        key,
        description: `Read access to the ${item.label} doctor page`,
      },
      update: {
        name: item.label,
        description: `Read access to the ${item.label} doctor page`,
      },
    });
    console.log(`  Action: ${ra.key}`);
  }

  // ── Phase 5: AppResource link ─────────────────────────────────────
  console.log(
    "\n━━━ Phase 5: AppResource Link ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  );

  await prisma.appResource.upsert({
    where: { appId_resourceId: { appId: app.id, resourceId: resource.id } },
    create: { appId: app.id, resourceId: resource.id },
    update: {},
  });
  console.log(`\n  "${resource.name}" linked to app "${app.name}"`);

  // ── Phase 5b: API Resources & Actions ────────────────────────────
  console.log(
    "\n━━━ Phase 5b: API Resources & Actions ━━━━━━━━━━━━━━━━━━━━━━━",
  );

  const API_RESOURCES: { name: string; actions: string[] }[] = [
    { name: "practitioner",           actions: ["create", "read", "update", "delete"] },
    { name: "appointment",            actions: ["create", "read", "update", "delete"] },
    { name: "encounter",              actions: ["create", "read", "update", "delete"] },
    { name: "questionnaire_response", actions: ["create", "read", "update", "delete"] },
  ];

  for (const apiRes of API_RESOURCES) {
    const res = await prisma.resource.upsert({
      where: { name: apiRes.name },
      create: { name: apiRes.name, description: `${apiRes.name} API resource` },
      update: { description: `${apiRes.name} API resource` },
    });
    console.log(`\n  Resource: "${res.name}" (${res.id})`);

    for (const action of apiRes.actions) {
      const key = `${apiRes.name}:${action}`;
      const ra = await prisma.resourceAction.upsert({
        where: { key },
        create: { resourceId: res.id, name: `${apiRes.name} ${action}`, key, description: `${action} on ${apiRes.name}` },
        update: { name: `${apiRes.name} ${action}`, description: `${action} on ${apiRes.name}` },
      });
      console.log(`    Action: ${ra.key}`);
    }

    await prisma.appResource.upsert({
      where: { appId_resourceId: { appId: app.id, resourceId: res.id } },
      create: { appId: app.id, resourceId: res.id },
      update: {},
    });
  }

  // ── Phase 6: Set permissionKeys on each ITEM menu node ────────────
  console.log(
    "\n━━━ Phase 6: Menu Node permissionKeys ━━━━━━━━━━━━━━━━━━━━━━━",
  );

  for (const item of ALL_LEAF_ITEMS) {
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

  // ── Phase 7: OrganizationRole — doctor ───────────────────────────
  //
  // Permission map: { [itemSlug]: ["read"] }
  // getUserPermissions() parses this as "itemSlug:read" keys.
  //
  console.log(
    "\n━━━ Phase 7: Org Role Permissions ━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  );

  // Build permission map: menu-based slugs + API-level resource permissions
  const permissionMap: Record<string, string[]> = {};
  for (const item of ALL_LEAF_ITEMS) {
    permissionMap[item.slug] = ["read"];
  }
  // API permissions — doctor has all except patient:*, consultagent:chat, agent:chat
  permissionMap["practitioner"] = ["create", "read", "update", "delete"];
  permissionMap["appointment"] = ["create", "read", "update", "delete"];
  permissionMap["encounter"] = ["create", "read", "update", "delete"];
  permissionMap["questionnaire_response"] = [
    "create",
    "read",
    "update",
    "delete",
  ];
  const permissionJson = JSON.stringify(permissionMap);

  const existingOrgRole = await prisma.organizationRole.findFirst({
    where: { organizationId: org.id, role: DOCTOR_ROLE },
  });

  if (existingOrgRole) {
    await prisma.organizationRole.update({
      where: { id: existingOrgRole.id },
      data: { permission: permissionJson },
    });
    console.log(`\n  Role "${DOCTOR_ROLE}" updated (existing).`);
  } else {
    await prisma.organizationRole.create({
      data: {
        id: randomUUID(),
        organizationId: org.id,
        role: DOCTOR_ROLE,
        permission: permissionJson,
      },
    });
    console.log(`\n  Role "${DOCTOR_ROLE}" created.`);
  }

  const grantedKeys = Object.entries(permissionMap).flatMap(([res, actions]) =>
    actions.map((a) => `${res}:${a}`),
  );
  console.log(`\n  Granted ${grantedKeys.length} permissions:`);
  console.log(`  ${grantedKeys.join(", ")}`);

  // ── Summary ───────────────────────────────────────────────────────
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✓ Seed complete.\n");
  console.log("  App:        ", APP_NAME, `(slug: ${APP_SLUG})`);
  console.log("  Org:        ", org.name, `(slug: ${ORG_SLUG})`);
  console.log("  Role:       ", DOCTOR_ROLE);
  console.log("  Permissions:", grantedKeys.join(", "));
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
